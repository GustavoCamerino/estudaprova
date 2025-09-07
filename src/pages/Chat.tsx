import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { useAnalytics } from '@/hooks/useAnalytics';
import { usePDFExtractor } from '@/hooks/usePDFExtractor';

// Tipo local para PDFs com json_content
interface PDFWithJSON {
  id: string;
  original_name: string;
  processing_status: string;
  json_content?: any;
  extracted_content?: string;
}
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Send,
  FileText,
  Brain,
  HelpCircle,
  Zap,
  User,
  Bot,
  Save,
  History,
  Edit,
  Trash2,
  Plus,
  Upload,
  File,
  X,
  Loader2,
  BookOpen
} from 'lucide-react';
import ChatMessageDialog, { SavedMessage } from '@/components/ChatMessageDialog';
import FlashcardCarousel from '@/components/FlashcardCarousel';
import ResumeViewer from '@/components/ResumeViewer';
import QuizInterface from '@/components/QuizInterface';
import ExamInterface from '@/components/ExamInterface';
import { SessionManager } from '@/components/SessionManager';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  type?: 'flashcard' | 'resume' | 'quiz' | 'prova' | 'normal';
}

const Chat = () => {
  const { toast } = useToast();
  const { isAdmin, isPremium, userRole } = useUserRole();
  const { trackPageView, trackClick, trackUpload } = useAnalytics();
  const { extractTextFromPDF, isExtracting } = usePDFExtractor();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [extractedPDFTexts, setExtractedPDFTexts] = useState<{[key: string]: string}>({});
  const [currentView, setCurrentView] = useState<'chat' | 'flashcard' | 'resume' | 'quiz' | 'prova'>('chat');
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [pdfCount, setPdfCount] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<string | null>(null); // Track which content is being generated
  const [isStudyingPDF, setIsStudyingPDF] = useState(false); // Track PDF analysis
  const [dragActive, setDragActive] = useState(false);
  const [availablePDFs, setAvailablePDFs] = useState<PDFWithJSON[]>([]);
  const [selectedPDFId, setSelectedPDFId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [savedMessages, setSavedMessages] = useState<SavedMessage[]>([
    {
      id: '1',
      title: 'Flashcards de Matemática',
      content: 'Conjunto de flashcards sobre funções quadráticas...',
      type: 'flashcard',
      category: 'Matemática',
      createdAt: new Date('2024-01-15')
    },
    {
      id: '2',
      title: 'Resumo História do Brasil',
      content: 'Resumo completo sobre o período colonial...',
      type: 'resume',
      category: 'História',
      createdAt: new Date('2024-01-14')
    }
  ]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<SavedMessage | undefined>();
  const [showSaved, setShowSaved] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (userRole !== null) {
      checkUserLimits();
      createNewSession();
    }
  }, [userRole]);

  // Função para carregar PDFs disponíveis
  const loadAvailablePDFs = async () => {
    if (!currentSessionId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: pdfs, error } = await supabase
        .from('pdfs')
        .select('id, original_name, processing_status, json_content, extracted_content')
        .eq('user_id', user.id)
        .eq('session_id', currentSessionId)
        .order('upload_date', { ascending: false }) as { data: PDFWithJSON[] | null, error: any };

      if (error) {
        console.error('Erro ao carregar PDFs:', error);
        return;
      }

      setAvailablePDFs(pdfs || []);

      // Selecionar automaticamente o primeiro PDF processado
      if (pdfs && pdfs.length > 0) {
        const processedPDF = pdfs.find(pdf =>
          pdf.json_content || pdf.extracted_content || pdf.processing_status === 'completed'
        );
        if (processedPDF) {
          setSelectedPDFId(processedPDF.id);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar PDFs:', error);
    }
  };

  // Carregar PDFs quando a sessão mudar
  useEffect(() => {
    if (currentSessionId) {
      loadAvailablePDFs();
    }
  }, [currentSessionId]);

  // Auto-save session when page unloads
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveCurrentSession();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [messages, currentSessionId]);

  useEffect(() => {
    trackPageView('/chat');
  }, [trackPageView]);

  const createNewSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Deactivate all previous sessions
      await supabase
        .from('chat_sessions')
        .update({ is_active: false })
        .eq('user_id', user.id);

      // Create new session
      const { data: newSession, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          name: `Conversa ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentSessionId(newSession.id);
      setMessages([]);
      setGeneratedContent(null);
      setPdfCount(0);
      setUploadedFiles([]);
      setCurrentView('chat');

      toast({
        title: "Nova conversa criada",
        description: "Conversa anterior salva. Iniciando nova sessão.",
      });
    } catch (error) {
      console.error('Error creating new session:', error);
    }
  };

  const saveCurrentSession = async () => {
    if (!currentSessionId || messages.length === 0) return;

    try {
      await supabase
        .from('chat_sessions')
        .update({
          updated_at: new Date().toISOString(),
          is_active: false
        })
        .eq('id', currentSessionId);
    } catch (error) {
      console.error('Error saving session:', error);
    }
  };

  const loadSessionData = async (sessionId: string) => {
    try {
      // Load messages for this session
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (messages) {
        setMessages(messages.map(msg => ({
          id: msg.id,
          content: msg.content,
          isUser: msg.is_user,
          timestamp: new Date(msg.created_at),
          type: msg.message_type as any
        })));
      }

      // Load PDFs for this session
      const { data: pdfs } = await supabase
        .from('pdfs')
        .select('*')
        .eq('session_id', sessionId);

      setPdfCount(pdfs?.length || 0);
    } catch (error) {
      console.error('Error loading session data:', error);
    }
  };

  const checkUserLimits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('Checking limits for user:', user.id);
      console.log('User role:', userRole, 'isAdmin:', isAdmin);

      // Check PDF count for current session only
      if (currentSessionId) {
        const { data: pdfs } = await supabase
          .from('pdfs')
          .select('id')
          .eq('user_id', user.id)
          .eq('session_id', currentSessionId);

        setPdfCount(pdfs?.length || 0);
      }

      setQuestionCount(0); // Reset monthly
    } catch (error) {
      console.error('Error checking limits:', error);
    }
  };

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    console.log('Uploading file:', file.name, file.type, file.size);

    if (file.type !== 'application/pdf') {
      toast({
        title: "Erro",
        description: "Por favor, selecione apenas arquivos PDF.",
        variant: "destructive"
      });
      return;
    }

    // Check file size limit (10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 10MB.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setIsStudyingPDF(true);

    try {
      // 🔥 EXTRAÇÃO AUTOMÁTICA NO FRONTEND
      console.log('🔄 Extraindo texto do PDF automaticamente...');
      const extractedData = await extractTextFromPDF(file);
      
      if (!extractedData) {
        throw new Error('Falha na extração do texto do PDF');
      }

      console.log(`✅ Texto extraído: ${extractedData.text.length} caracteres de ${extractedData.pages} páginas`);

      // Armazenar texto extraído localmente para uso futuro
      const fileKey = `${file.name}_${Date.now()}`;
      setExtractedPDFTexts(prev => ({
        ...prev,
        [fileKey]: extractedData.text
      }));

      // Get authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('Usuário não autenticado');
      }

      console.log('User authenticated:', user.id);

      // Upload file directly to Supabase Storage
      const fileName = `${user.id}/${Date.now()}-${file.name}`;
      console.log('Uploading to storage:', fileName);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('pdfs')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(`Erro no upload: ${uploadError.message}`);
      }

      console.log('File uploaded successfully:', uploadData.path);

      // Save file metadata to database with extracted content
      const { data: dbData, error: dbError } = await supabase
        .from('pdfs')
        .insert({
          user_id: user.id,
          filename: fileName,
          original_name: file.name,
          file_path: uploadData.path,
          file_size: file.size,
          processing_status: 'completed',
          session_id: currentSessionId,
          extracted_content: extractedData.text // 🎯 SALVANDO TEXTO EXTRAÍDO
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        // Cleanup uploaded file if database insert fails
        await supabase.storage.from('pdfs').remove([fileName]);
        throw new Error(`Erro ao salvar no banco: ${dbError.message}`);
      }

      console.log('PDF saved to database:', dbData.id);

      // Ensure we have a session for this upload
      if (!currentSessionId) {
        await createNewSession();
      }

      // Update UI
      setUploadedFiles(prev => [...prev, file]);
      setPdfCount(prev => prev + 1);

      // Recarregar PDFs disponíveis
      await loadAvailablePDFs();

      // Track upload event
      trackUpload('pdf', '/chat');

      toast({
        title: "PDF processado com sucesso! 🎉",
        description: `${file.name} foi analisado e está pronto para perguntas. ${extractedData.pages} páginas, ${extractedData.text.length} caracteres extraídos.`,
      });

    } catch (error) {
      console.error('Upload error:', error);

      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

      toast({
        title: "Erro no processamento",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setIsStudyingPDF(false);
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    handleFileUpload(files[0]);
    // Clear input
    if (event.target) {
      event.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    const removedFile = uploadedFiles[index];
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));

    // Remove from database as well
    // TODO: Implement file deletion from storage and database
    console.log('File removed from UI:', removedFile.name);
  };

  const quickPrompts = [
    {
      title: 'Criar Flashcards',
      description: 'Gere flashcards do conteúdo',
      icon: Brain,
      prompt: 'Crie flashcards baseados no conteúdo dos meus PDFs sobre',
      type: 'flashcard' as const
    },
    {
      title: 'Fazer Resumo',
      description: 'Resuma o material de estudo',
      icon: FileText,
      prompt: 'Faça um resumo detalhado do conteúdo dos meus PDFs sobre',
      type: 'resume' as const
    },
    {
      title: 'Criar Quiz',
      description: 'Gere questões para praticar',
      icon: HelpCircle,
      prompt: 'Crie um quiz com 10 questões baseado nos meus PDFs sobre',
      type: 'quiz' as const
    },
    {
      title: 'Gerar Prova',
      description: 'Crie uma prova completa',
      icon: Zap,
      prompt: 'Gere uma prova completa usando todos os meus PDFs com questões de múltipla escolha e dissertativas sobre',
      type: 'prova' as const
    }
  ];

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    if (!currentSessionId) {
      await createNewSession();
      if (!currentSessionId) {
        toast({
          title: "Erro",
          description: "Não foi possível criar uma sessão.",
          variant: "destructive"
        });
        return;
      }
    }

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message to chat
    const newUserMessage: Message = {
      id: Date.now().toString(),
      content: userMessage,
      isUser: true,
      timestamp: new Date(),
      type: 'normal'
    };

    setMessages(prev => [...prev, newUserMessage]);

    try {
      // Get PDF content if available
      let pdfContext = '';
      if (selectedPDFId) {
        const selectedPDF = availablePDFs.find(pdf => pdf.id === selectedPDFId);
        if (selectedPDF?.extracted_content) {
          pdfContext = `\n\nConteúdo do PDF "${selectedPDF.original_name}":\n${selectedPDF.extracted_content}`;
        }
      }

      // Generate AI response based on PDF content
      const aiResponse = await generateAIResponse(userMessage + pdfContext);
      
      // Add AI response to chat
      const newAIMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponse,
        isUser: false,
        timestamp: new Date(),
        type: 'normal'
      };

      setMessages(prev => [...prev, newAIMessage]);

      // Save messages to database
      await saveMessageToDatabase(newUserMessage);
      await saveMessageToDatabase(newAIMessage);

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar mensagem.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateAIResponse = async (message: string): Promise<string> => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-processor', {
        body: {
          action: 'chat',
          message: message
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Falha na geração da resposta');
      
      return data.response || 'Desculpe, não consegui gerar uma resposta.';
    } catch (error) {
      console.error('Error generating AI response:', error);
      return 'Desculpe, ocorreu um erro ao processar sua mensagem.';
    }
  };

  const saveMessageToDatabase = async (message: Message) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !currentSessionId) return;

      await supabase
        .from('chat_messages')
        .insert({
          session_id: currentSessionId,
          user_id: user.id,
          content: message.content,
          is_user: message.isUser,
          message_type: message.type || 'normal'
        });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const generateFlashcards = async (topic: string) => {
    if (!availablePDFs.length) {
      toast({
        title: "Nenhum PDF encontrado",
        description: "Faça upload de um PDF primeiro.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating('flashcard');
    setCurrentView('flashcard');

    try {
      const selectedPDF = availablePDFs.find(pdf => pdf.id === selectedPDFId);
      const pdfContent = selectedPDF?.extracted_content || '';
      
      const prompt = `Com base no seguinte conteúdo do PDF, crie 10 flashcards com perguntas específicas e suas respectivas respostas sobre "${topic}":

${pdfContent}

Crie 10 flashcards no formato JSON:
{
  "flashcards": [
    {
      "pergunta": "Pergunta específica sobre o conteúdo",
      "resposta": "Resposta clara e objetiva"
    }
  ]
}

Foque em perguntas que testem a compreensão dos conceitos principais do documento.`;

      console.log('Gerando flashcards...');
      
      const response = await generateAIResponse(prompt);
      
      // Parse the response to extract flashcards
      let flashcards;
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          flashcards = JSON.parse(jsonMatch[0]);
        } else {
          // Fallback: create simple flashcards from response
          const lines = response.split('\n').filter(line => line.trim());
          const cards = [];
          for (let i = 0; i < Math.min(lines.length, 20); i += 2) {
            if (i + 1 < lines.length) {
              cards.push({
                pergunta: lines[i].replace(/^\d+\.?\s*/, ''),
                resposta: lines[i + 1]
              });
            }
          }
          flashcards = { flashcards: cards.slice(0, 10) };
        }
      } catch (parseError) {
        flashcards = {
          flashcards: [
            { pergunta: "Conteúdo do PDF", resposta: response }
          ]
        };
      }

      setGeneratedContent(flashcards);
      
      toast({
        title: "Flashcards gerados!",
        description: `${flashcards.flashcards?.length || 1} flashcards criados com sucesso.`
      });

    } catch (error) {
      console.error('Error generating flashcards:', error);
      toast({
        title: "Erro",
        description: "Erro ao gerar flashcards.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(null);
    }
  };

  const generateResume = async (topic: string) => {
    if (!availablePDFs.length) {
      toast({
        title: "Nenhum PDF encontrado",
        description: "Faça upload de um PDF primeiro.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating('resume');
    setCurrentView('resume');

    try {
      const selectedPDF = availablePDFs.find(pdf => pdf.id === selectedPDFId);
      const pdfContent = selectedPDF?.extracted_content || '';
      
      const prompt = `Faça um resumo completo e detalhado do seguinte conteúdo sobre "${topic}":

${pdfContent}

O resumo deve:
- Ser completo e abrangente
- Incluir todos os pontos principais
- Usar formatação com *texto* para negrito quando necessário
- Ser bem estruturado com tópicos e subtópicos
- Incluir exemplos quando relevante
- Manter a ordem lógica do conteúdo original

Formate o texto de forma clara e didática para facilitar o estudo.`;

      console.log('Gerando resumo...');
      
      const response = await generateAIResponse(prompt);
      
      setGeneratedContent({ resume: response });
      
      toast({
        title: "Resumo gerado!",
        description: "Resumo completo criado com sucesso."
      });

    } catch (error) {
      console.error('Error generating resume:', error);
      toast({
        title: "Erro",
        description: "Erro ao gerar resumo.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(null);
    }
  };

  const generateQuiz = async (topic: string) => {
    if (!availablePDFs.length) {
      toast({
        title: "Nenhum PDF encontrado",
        description: "Faça upload de um PDF primeiro.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating('quiz');
    setCurrentView('quiz');

    try {
      const selectedPDF = availablePDFs.find(pdf => pdf.id === selectedPDFId);
      const pdfContent = selectedPDF?.extracted_content || '';
      
      const prompt = `Com base no seguinte conteúdo, crie um quiz com 10 questões sobre "${topic}":

${pdfContent}

Crie questões de múltipla escolha no formato JSON:
{
  "quiz": {
    "questions": [
      {
        "question": "Pergunta clara e específica sobre o conteúdo?",
        "options": ["Opção A", "Opção B", "Opção C", "Opção D"],
        "correct": 0,
        "explanation": "Explicação da resposta correta"
      }
    ]
  }
}

Certifique-se de que:
- As perguntas testam compreensão real do conteúdo
- As opções de resposta são plausíveis
- Há apenas uma resposta correta por questão
- As explicações esclarecem por que a resposta está correta`;

      console.log('Gerando quiz...');
      
      const response = await generateAIResponse(prompt);
      
      // Parse the response to extract quiz
      let quiz;
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          quiz = JSON.parse(jsonMatch[0]);
        } else {
          // Fallback: create simple quiz from response
          const lines = response.split('\n').filter(line => line.trim());
          const questions = [];
          
          for (let i = 0; i < Math.min(lines.length, 40); i += 4) {
            if (i + 3 < lines.length) {
              questions.push({
                question: lines[i].replace(/^\d+\.?\s*/, ''),
                options: [
                  lines[i + 1] || "Opção A",
                  lines[i + 2] || "Opção B", 
                  lines[i + 3] || "Opção C",
                  "Nenhuma das anteriores"
                ],
                correct: 0,
                explanation: "Resposta baseada no conteúdo do PDF"
              });
            }
          }
          
          quiz = { 
            quiz: { 
              questions: questions.slice(0, 10).length > 0 ? questions.slice(0, 10) : [{
                question: "O que você aprendeu com este conteúdo?",
                options: ["Conceitos importantes", "Informações básicas", "Detalhes específicos", "Conhecimento geral"],
                correct: 0,
                explanation: "Baseado no conteúdo estudado"
              }]
            }
          };
        }
      } catch (parseError) {
        quiz = {
          quiz: {
            questions: [{
              question: "Qual é o tema principal do conteúdo estudado?",
              options: ["Tema A", "Tema B", "Tema C", "Tema D"],
              correct: 0,
              explanation: "Baseado no PDF fornecido"
            }]
          }
        };
      }

      setGeneratedContent(quiz);
      
      toast({
        title: "Quiz gerado!",
        description: `Quiz com ${quiz.quiz?.questions?.length || 1} questões criado.`
      });

    } catch (error) {
      console.error('Error generating quiz:', error);
      toast({
        title: "Erro",
        description: "Erro ao gerar quiz.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(null);
    }
  };

  const generateExam = async (topic: string) => {
    if (!availablePDFs.length) {
      toast({
        title: "Nenhum PDF encontrado",
        description: "Faça upload de um PDF primeiro.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating('prova');
    setCurrentView('prova');

    try {
      const selectedPDF = availablePDFs.find(pdf => pdf.id === selectedPDFId);
      const pdfContent = selectedPDF?.extracted_content || '';
      
      const prompt = `Com base no seguinte conteúdo, crie uma prova com 20 questões de múltipla escolha sobre "${topic}":

${pdfContent}

Crie questões diversificadas no formato JSON:
{
  "exam": {
    "title": "Prova sobre ${topic}",
    "questions": [
      {
        "question": "Pergunta clara e específica sobre o conteúdo?",
        "options": ["A) Opção A", "B) Opção B", "C) Opção C", "D) Opção D"],
        "correct": 0,
        "explanation": "Explicação da resposta correta"
      }
    ]
  }
}

Certifique-se de que:
- Crie exatamente 20 questões
- As perguntas cobrem diferentes aspectos do conteúdo
- As opções são rotuladas com A), B), C), D)
- Há variação na dificuldade das questões
- As perguntas testam compreensão profunda do material`;

      console.log('Gerando prova...');
      
      const response = await generateAIResponse(prompt);
      
      // Parse the response to extract exam
      let exam;
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          exam = JSON.parse(jsonMatch[0]);
        } else {
          // Fallback: create questions from response text
          const lines = response.split('\n').filter(line => line.trim());
          const questions = [];
          
          for (let i = 0; i < 20; i++) {
            const questionIndex = i * 6; // Assume 6 lines per question (question + 4 options + explanation)
            if (questionIndex < lines.length) {
              questions.push({
                question: lines[questionIndex] || `Questão ${i + 1} sobre ${topic}?`,
                options: [
                  lines[questionIndex + 1] || `A) Primeira opção`,
                  lines[questionIndex + 2] || `B) Segunda opção`,
                  lines[questionIndex + 3] || `C) Terceira opção`, 
                  lines[questionIndex + 4] || `D) Quarta opção`
                ],
                correct: Math.floor(Math.random() * 4), // Random for fallback
                explanation: lines[questionIndex + 5] || "Baseado no conteúdo do PDF"
              });
            } else {
              questions.push({
                question: `Questão ${i + 1}: Com base no conteúdo estudado, qual conceito é mais importante?`,
                options: [
                  `A) Conceito fundamental do tema`,
                  `B) Aspecto secundário do assunto`,
                  `C) Detalhe específico mencionado`,
                  `D) Conclusão geral do material`
                ],
                correct: 0,
                explanation: "Baseado na análise do conteúdo fornecido"
              });
            }
          }
          
          exam = { 
            exam: { 
              title: `Prova sobre ${topic}`,
              questions: questions
            }
          };
        }
      } catch (parseError) {
        // Create 20 generic questions as absolute fallback
        const questions = Array.from({ length: 20 }, (_, i) => ({
          question: `Questão ${i + 1}: Sobre o tema "${topic}", qual afirmação está correta?`,
          options: [
            `A) Primeira alternativa sobre ${topic}`,
            `B) Segunda alternativa sobre ${topic}`,
            `C) Terceira alternativa sobre ${topic}`,
            `D) Quarta alternativa sobre ${topic}`
          ],
          correct: 0,
          explanation: "Baseado no conteúdo do PDF fornecido"
        }));
        
        exam = {
          exam: {
            title: `Prova sobre ${topic}`,
            questions: questions
          }
        };
      }

      setGeneratedContent(exam);
      
      toast({
        title: "Prova gerada!",
        description: `Prova com ${exam.exam?.questions?.length || 20} questões criada.`
      });

    } catch (error) {
      console.error('Error generating exam:', error);
      toast({
        title: "Erro",
        description: "Erro ao gerar prova.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(null);
    }
  };

  const handleQuickPrompt = async (prompt: string, type: 'flashcard' | 'resume' | 'quiz' | 'prova') => {
    console.log('Quick prompt triggered:', type, prompt);

    if (!currentSessionId) {
      await createNewSession();
      if (!currentSessionId) {
        toast({
          title: "Erro",
          description: "Não foi possível criar uma nova sessão.",
          variant: "destructive"
        });
        return;
      }
    }

    // Check limits for non-admins
    if (!isAdmin && questionCount >= 5) {
      toast({
        title: "Limite atingido",
        description: "Você atingiu o limite de 5 perguntas do plano gratuito.",
        variant: "destructive"
      });
      return;
    }

    if (pdfCount === 0) {
      toast({
        title: "Nenhum PDF encontrado",
        description: "Você precisa fazer upload de PDFs primeiro nesta sessão.",
        variant: "destructive"
      });
      return;
    }

    // Track click event
    trackClick(`quick_prompt_${type}`, '/chat');

    const topic = "o conteúdo do PDF"; // Default topic
    
    switch (type) {
      case 'flashcard':
        await generateFlashcards(topic);
        break;
      case 'resume':
        await generateResume(topic);
        break;
      case 'quiz':
        await generateQuiz(topic);
        break;
      case 'prova':
        await generateExam(topic);
        break;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSaveMessage = (content: string) => {
    setDialogOpen(true);
  };

  const handleEditSavedMessage = (message: SavedMessage) => {
    setEditingMessage(message);
    setDialogOpen(true);
  };

  const handleDeleteSavedMessage = (id: string) => {
    setSavedMessages(prev => prev.filter(m => m.id !== id));
    toast({
      title: "Conversa removida",
      description: "A conversa salva foi removida com sucesso.",
    });
  };

  const handleSaveChatMessage = (messageData: Omit<SavedMessage, 'id' | 'createdAt'>) => {
    if (editingMessage) {
      setSavedMessages(prev => prev.map(m =>
        m.id === editingMessage.id
          ? { ...m, ...messageData }
          : m
      ));
      toast({
        title: "Conversa atualizada",
        description: "A conversa foi atualizada com sucesso.",
      });
    } else {
      const newMessage: SavedMessage = {
        id: Date.now().toString(),
        ...messageData,
        createdAt: new Date()
      };
      setSavedMessages(prev => [newMessage, ...prev]);
      toast({
        title: "Conversa salva",
        description: "A conversa foi salva com sucesso.",
      });
    }
    setEditingMessage(undefined);
  };

  const loadSavedMessage = (message: SavedMessage) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      content: message.content,
      isUser: false,
      timestamp: new Date(),
      type: message.type
    };
    setMessages([newMessage]);
    setShowSaved(false);
  };

  const handleSessionSelect = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setMessages([]); // Clear current messages
    setPdfCount(0); // Reset PDF count
    setUploadedFiles([]); // Clear uploaded files
    loadSessionData(sessionId);
  };

  const handleNewSession = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setPdfCount(0);
    setUploadedFiles([]);
  };

  // Render specific content views
  const renderContentView = () => {
    if (!generatedContent) return null;

    switch (currentView) {
      case 'flashcard':
        return (
          <div className="p-6">
            <Button
              variant="outline"
              onClick={() => setCurrentView('chat')}
              className="mb-6"
            >
              ← Voltar ao Chat
            </Button>
            <FlashcardCarousel
              cards={generatedContent.flashcards || []}
              title="Flashcards Gerados"
            />
          </div>
        );

      case 'resume':
        return (
          <div className="p-6">
            <Button
              variant="outline"
              onClick={() => setCurrentView('chat')}
              className="mb-6"
            >
              ← Voltar ao Chat
            </Button>
            <ResumeViewer
              title="Resumo Gerado"
              content={generatedContent.resume || ''}
            />
          </div>
        );

      case 'quiz':
        return (
          <div className="p-6">
            <Button
              variant="outline"
              onClick={() => setCurrentView('chat')}
              className="mb-6"
            >
              ← Voltar ao Chat
            </Button>
            <QuizInterface
              title="Quiz Gerado"
              questions={generatedContent.quiz?.questions || []}
            />
          </div>
        );

      case 'prova':
        return (
          <div className="p-6">
            <Button
              variant="outline"
              onClick={() => setCurrentView('chat')}
              className="mb-6"
            >
              ← Voltar ao Chat
            </Button>
            <ExamInterface
              title={generatedContent.exam?.title || "Prova Gerada"}
              multipleChoice={generatedContent.exam?.questions || []}
              essays={[]}
            />
          </div>
        );

      default:
        return null;
    }
  };

  if (currentView !== 'chat') {
    return (
      <div data-page="chat" className="chat-fixed-container relative">
        <div
          className="fixed inset-0 opacity-5 pointer-events-none z-0"
          style={{
            backgroundImage: `url(https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=1920&h=1080&fit=crop)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <div className="relative z-10 h-full overflow-y-auto">
          {renderContentView()}
        </div>
      </div>
    );
  }

  return (
    <div 
      data-page="chat"
      className="chat-fixed-container flex gap-6 relative"
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <div
        className="fixed inset-0 opacity-5 pointer-events-none z-0"
        style={{
          backgroundImage: `url(https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=1920&h=1080&fit=crop)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />

      {/* Drag and Drop Overlay */}
      {dragActive && (
        <div className="fixed inset-0 bg-primary/10 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card/90 border-2 border-dashed border-primary rounded-lg p-8 text-center max-w-md">
            <Upload className="h-16 w-16 mx-auto mb-4 text-primary" />
            <h3 className="text-lg font-semibold mb-2">Solte o PDF aqui</h3>
            <p className="text-muted-foreground">Arraste e solte seu arquivo PDF para começar</p>
            <p className="text-sm text-muted-foreground mt-2">Máximo: 10MB</p>
          </div>
        </div>
      )}

      {/* Left Sidebar - Sessions and Quick Actions */}
      <div className="w-80 flex-shrink-0 relative z-10 space-y-4">
        <div>
          <h1 className="text-2xl font-display font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Chat com IA
          </h1>
          <p className="text-muted-foreground text-sm mb-4">
            Crie flashcards, resumos, quiz e provas
          </p>
          <div className="flex gap-2 text-xs text-muted-foreground mb-4">
            <span>PDFs: {isAdmin ? `${pdfCount}/∞` : `${pdfCount}/3`}</span>
            <span>Perguntas: {isAdmin ? `${questionCount}/∞` : `${questionCount}/5`}</span>
            {isAdmin && <Badge variant="outline" className="text-xs">ADMIN</Badge>}
          </div>

          <Button
            onClick={createNewSession}
            className="w-full mb-4"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Conversa
          </Button>
        </div>

        {/* Session Manager - Compact */}
        <div className="mb-4">
          <SessionManager
            currentSessionId={currentSessionId}
            onSessionSelect={(sessionId) => {
              saveCurrentSession();
              setCurrentSessionId(sessionId);
              loadSessionData(sessionId);
            }}
            onNewSession={createNewSession}
          />
        </div>

        {/* Quick Actions - Compact Grid */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Ações Rápidas</h3>
          <div className="grid grid-cols-1 gap-2">
            {quickPrompts.map((prompt, index) => {
              const Icon = prompt.icon;
              const isGeneratingThis = isGenerating === prompt.type;
              return (
                <Card
                  key={index}
                  className={`cursor-pointer hover:shadow-md transition-all duration-200 bg-card/80 backdrop-blur-sm border-primary/20 hover:border-primary/40 ${isGeneratingThis ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  onClick={() => !isGenerating && handleQuickPrompt(prompt.prompt, prompt.type)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-primary/15 rounded-lg flex items-center justify-center flex-shrink-0">
                        {isGeneratingThis ? (
                          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Icon className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-xs">{prompt.title}</h4>
                        <p className="text-xs text-muted-foreground truncate">{prompt.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* PDFs Disponíveis */}
        {availablePDFs.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">PDFs Disponíveis</h3>
            <div className="space-y-2">
              {availablePDFs.map((pdf) => {
                const isSelected = selectedPDFId === pdf.id;
                const hasContent = pdf.json_content || pdf.extracted_content;
                const isProcessed = pdf.processing_status === 'completed' || pdf.processing_status === 'json_completed';

                return (
                  <Card
                    key={pdf.id}
                    className={`cursor-pointer hover:shadow-md transition-all duration-200 bg-card/80 backdrop-blur-sm border-primary/20 hover:border-primary/40 ${isSelected ? 'border-primary bg-primary/10' : ''
                      } ${!hasContent ? 'opacity-50' : ''}`}
                    onClick={() => hasContent && setSelectedPDFId(pdf.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-blue-500/15 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-xs truncate">{pdf.original_name}</h4>
                          <div className="flex items-center space-x-1 mt-1">
                            {isProcessed ? (
                              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600">
                                Pronto
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600">
                                Processando
                              </Badge>
                            )}
                            {pdf.json_content && (
                              <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600">
                                JSON
                              </Badge>
                            )}
                            {isSelected && (
                              <Badge variant="outline" className="text-xs bg-primary/10 text-primary">
                                Ativo
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Saved Messages Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSaved(!showSaved)}
          className="w-full"
        >
          <History className="h-4 w-4 mr-2" />
          {showSaved ? 'Ocultar' : 'Salvos'}
        </Button>

        {showSaved && (
          <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Conversas Salvas</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {savedMessages.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Nenhuma conversa salva
                </p>
              ) : (
                <div className="space-y-2">
                  {savedMessages.slice(0, 3).map((message) => (
                    <div key={message.id} className="p-2 border rounded cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => loadSavedMessage(message)}>
                      <h5 className="font-medium text-xs truncate">{message.title}</h5>
                      <div className="flex items-center gap-1 mt-1">
                        <Badge variant="secondary" className="text-xs px-1 py-0">
                          {message.type === 'flashcard' ? 'Flash' :
                            message.type === 'resume' ? 'Resumo' :
                              message.type === 'quiz' ? 'Quiz' : 'Prova'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {message.createdAt.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                  {savedMessages.length > 3 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{savedMessages.length - 3} mais...
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main Chat Area - Centered and Larger */}
      <div className="flex-1 relative z-10">
        <Card className="h-full bg-card/80 backdrop-blur-sm border-primary/20">
          <CardContent className="p-0 h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-20">
                  <Bot className="h-16 w-16 mx-auto mb-6 opacity-50" />
                  <h3 className="text-xl font-medium mb-2">Bem-vindo ao Chat AI!</h3>
                  <p className="text-lg">Faça upload de um PDF e use as ações rápidas ou digite sua mensagem</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex items-start space-x-4 ${message.isUser ? 'flex-row-reverse space-x-reverse' : ''
                      }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${message.isUser
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                      }`}>
                      {message.isUser ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                    </div>
                    <div className={`flex-1 max-w-[75%] ${message.isUser ? 'text-right' : ''}`}>
                      <div className={`rounded-xl p-4 ${message.isUser
                        ? 'bg-primary text-primary-foreground ml-auto'
                        : 'bg-muted'
                        }`}>
                        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        {!message.isUser && (
                          <div className="flex justify-end mt-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSaveMessage(message.content)}
                              className="text-xs h-7 px-3 hover:bg-background/20"
                            >
                              <Save className="h-3 w-3 mr-1" />
                              Salvar
                            </Button>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 px-1">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div className="bg-muted rounded-xl p-4">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area - ALWAYS VISIBLE when PDFs are uploaded */}
            {(availablePDFs.length > 0 || uploadedFiles.length > 0) && (
              <div className="border-t p-6">
                {/* Show selected PDF info */}
                {selectedPDFId && availablePDFs.length > 0 && (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          Usando PDF: {availablePDFs.find(pdf => pdf.id === selectedPDFId)?.original_name}
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          Suas perguntas serão respondidas com base neste documento
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Show uploaded files */}
                {uploadedFiles.length > 0 && (
                  <div className="mb-4 space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Arquivos selecionados:</h4>
                    <div className="flex flex-wrap gap-2">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-lg text-sm">
                          <File className="h-4 w-4" />
                          <span>{file.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {Math.round(file.size / 1024)} KB
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || (!isAdmin && pdfCount >= 3)}
                    size="icon"
                    className="h-12 w-12 flex-shrink-0"
                    title={(!isAdmin && pdfCount >= 3) ? 'Limite de PDFs atingido' : 'Upload de PDF (máx. 10MB)'}
                  >
                    <Upload className="h-5 w-5" />
                  </Button>
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Digite sua mensagem sobre o PDF (ex: 'crie flashcards', 'faça um resumo', 'gere um quiz')..."
                    className="flex-1 min-h-[48px] max-h-[120px] resize-none text-base"
                    disabled={isLoading}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!input.trim() || isLoading}
                    size="icon"
                    className="h-12 w-12 flex-shrink-0"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                <div className="flex justify-between items-center mt-3 text-xs text-muted-foreground">
                  <span>PDFs: {isAdmin ? `${pdfCount}/∞` : `${pdfCount}/3`} • Perguntas: {isAdmin ? `${questionCount}/∞` : `${questionCount}/5`} • Máx: 10MB</span>
                  {isUploading && <span>Enviando arquivo...</span>}
                </div>
              </div>
            )}

            {/* Upload Area - Only show when no PDFs uploaded */}
            {availablePDFs.length === 0 && uploadedFiles.length === 0 && (
              <div className="border-t p-6">
                <div className="text-center">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Comece fazendo upload de um PDF</h3>
                  <p className="text-muted-foreground mb-4">
                    Arraste e solte um arquivo PDF aqui ou clique no botão abaixo
                  </p>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || (!isAdmin && pdfCount >= 3)}
                    className="mb-2"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Selecionar PDF
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Máximo: 10MB • PDFs: {isAdmin ? `${pdfCount}/∞` : `${pdfCount}/3`}
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ChatMessageDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingMessage(undefined);
        }}
        message={editingMessage}
        onSave={handleSaveChatMessage}
      />
    </div>
  );
};

export default Chat;