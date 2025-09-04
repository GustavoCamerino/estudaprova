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
    }
  }, [userRole]);

  // Função para carregar PDFs disponíveis
  const loadAvailablePDFs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: pdfs, error } = await supabase
        .from('pdfs')
        .select('id, original_name, processing_status, json_content, extracted_content')
        .eq('user_id', user.id)
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

  // Carregar PDFs quando o componente montar
  useEffect(() => {
    loadAvailablePDFs();
  }, []);

  useEffect(() => {
    trackPageView('/chat');
  }, [trackPageView]);

  const checkUserLimits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('Checking limits for user:', user.id);
      console.log('User role:', userRole, 'isAdmin:', isAdmin);

      // Check PDF count for user
      const { data: pdfs } = await supabase
        .from('pdfs')
        .select('id')
        .eq('user_id', user.id);

      setPdfCount(pdfs?.length || 0);
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

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      console.log('Sending message to AI processor:', currentInput);

      // Buscar PDFs do usuário
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Buscar PDFs do usuário
      const { data: sessionPDFs, error: pdfError } = await supabase
        .from('pdfs')
        .select('id, original_name, processing_status, json_content, extracted_content')
        .eq('user_id', user.id)
        .order('upload_date', { ascending: false }) as { data: PDFWithJSON[] | null, error: any };

      if (pdfError) {
        console.error('Erro ao buscar PDFs:', pdfError);
      }

      console.log('PDFs encontrados:', sessionPDFs?.length || 0);

      // Usar o PDF selecionado ou o primeiro disponível
      let pdfId = selectedPDFId;
      if (!pdfId && sessionPDFs && sessionPDFs.length > 0) {
        const processedPDF = sessionPDFs.find(pdf =>
          pdf.json_content || pdf.extracted_content || pdf.processing_status === 'completed'
        );

        if (processedPDF) {
          pdfId = processedPDF.id;
          console.log('Usando PDF para pergunta específica:', processedPDF.original_name);
        }
      }

      // Incluir conteúdo extraído dos PDFs na mensagem
      let enhancedMessage = currentInput;
      
      if (sessionPDFs && sessionPDFs.length > 0) {
        const pdfContents = sessionPDFs
          .filter(pdf => pdf.extracted_content)
          .map(pdf => `📄 **${pdf.original_name}**:\n${pdf.extracted_content}`)
          .join('\n\n');
          
        if (pdfContents) {
          enhancedMessage = `CONTEXTO DOS DOCUMENTOS:\n${pdfContents}\n\n---\n\nPERGUNTA DO USUÁRIO: ${currentInput}`;
          console.log(`✅ Conteúdo de ${sessionPDFs.length} PDFs incluído na mensagem`);
        }
      }

      // Simple AI response simulation
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `Recebi sua mensagem: "${currentInput}". Esta é uma resposta simulada baseada nos PDFs carregados.`,
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('Error in chat:', error);

      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Desculpe, ocorreu um erro. Tente novamente.',
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);

      toast({
        title: "Erro no chat",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = async (prompt: string, type: 'flashcard' | 'resume' | 'quiz' | 'prova') => {
    console.log('Quick prompt triggered:', type, prompt);

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
        description: "Você precisa fazer upload de PDFs primeiro.",
        variant: "destructive"
      });
      return;
    }

    // Track click event
    trackClick(`quick_prompt_${type}`, '/chat');

    setIsGenerating(type);

    try {
      console.log('Generating content:', type);

      // Show loading toast
      toast({
        title: `Gerando ${type === 'flashcard' ? 'Flashcards' :
          type === 'resume' ? 'Resumo' :
            type === 'quiz' ? 'Quiz' : 'Prova'}...`,
        description: "Aguarde enquanto processamos seu conteúdo.",
      });

      // Simulate content generation
      const mockContent = {
        success: true,
        content: {
          title: `${type === 'flashcard' ? 'Flashcards' : 
                   type === 'resume' ? 'Resumo' :
                   type === 'quiz' ? 'Quiz' : 'Prova'} Gerado`,
          cards: type === 'flashcard' ? [
            { front: 'Pergunta exemplo', back: 'Resposta exemplo' }
          ] : undefined,
          content: type === 'resume' ? 'Conteúdo do resumo simulado...' : undefined,
          questions: type === 'quiz' ? [
            { question: 'Pergunta exemplo?', options: ['A', 'B', 'C', 'D'], correct: 0 }
          ] : undefined,
          multipleChoice: type === 'prova' ? [
            { question: 'Pergunta exemplo?', options: ['A', 'B', 'C', 'D'], correct: 0 }
          ] : undefined,
          essays: type === 'prova' ? [
            { question: 'Pergunta dissertativa exemplo?' }
          ] : undefined
        }
      };

      setGeneratedContent(mockContent);
      setCurrentView(type);
      setQuestionCount(prev => prev + 1);

      // Save to conversation history
      const newMessage: SavedMessage = {
        id: Date.now().toString(),
        title: `${type === 'flashcard' ? 'Flashcards' :
          type === 'resume' ? 'Resumo' :
            type === 'quiz' ? 'Quiz' : 'Prova'} - ${new Date().toLocaleDateString()}`,
        content: JSON.stringify(mockContent.content),
        type,
        category: 'IA Gerada',
        createdAt: new Date()
      };

      setSavedMessages(prev => [newMessage, ...prev]);

      toast({
        title: "Conteúdo gerado!",
        description: `${type === 'flashcard' ? 'Flashcards criados' :
          type === 'resume' ? 'Resumo criado' :
            type === 'quiz' ? 'Quiz criado' : 'Prova criada'} com sucesso.`,
      });

    } catch (error) {
      console.error('Error generating content:', error);

      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

      toast({
        title: "Erro na geração",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(null);
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
              cards={generatedContent.content.cards}
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
              title={generatedContent.content.title}
              content={generatedContent.content.content}
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
              title={generatedContent.content.title}
              questions={generatedContent.content.questions}
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
              title={generatedContent.content.title}
              multipleChoice={generatedContent.content.multipleChoice}
              essays={generatedContent.content.essays}
            />
          </div>
        );

      default:
        return null;
    }
  };

  if (currentView !== 'chat') {
    return (
      <div className="min-h-screen relative flex flex-col">
        <div
          className="fixed inset-0 opacity-5 pointer-events-none z-0"
          style={{
            backgroundImage: `url(https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=1920&h=1080&fit=crop)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <div className="relative z-10 flex-1 container mx-auto py-6">
          {renderContentView()}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex flex-col relative p-4"
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
          <div className="bg-card/90 border-2 border-dashed border-primary rounded-lg p-8 text-center max-w-md mx-4">
            <Upload className="h-16 w-16 mx-auto mb-4 text-primary" />
            <h3 className="text-lg font-semibold mb-2">Solte o PDF aqui</h3>
            <p className="text-muted-foreground">Arraste e solte seu arquivo PDF para começar</p>
            <p className="text-sm text-muted-foreground mt-2">Máximo: 10MB</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="relative z-10 mb-4 text-center">
        <h1 className="text-2xl font-display font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Chat com IA
        </h1>
        <p className="text-muted-foreground text-sm mb-2">
          Crie flashcards, resumos, quiz e provas
        </p>
        <div className="flex justify-center gap-4 text-xs text-muted-foreground">
          <span>PDFs: {isAdmin ? `${pdfCount}/∞` : `${pdfCount}/3`}</span>
          <span>Perguntas: {isAdmin ? `${questionCount}/∞` : `${questionCount}/5`}</span>
          {isAdmin && <Badge variant="outline" className="text-xs">ADMIN</Badge>}
        </div>
      </div>

      {/* Main Chat Area - Fixed Top */}
      <div className="flex-1 relative z-10 min-h-0 mb-4">
        <Card className="h-[50vh] bg-card/80 backdrop-blur-sm border-primary/20">
          <CardContent className="p-0 h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-20">
                  <Bot className="h-16 w-16 mx-auto mb-6 opacity-50" />
                  <h3 className="text-xl font-medium mb-2">Bem-vindo ao Chat AI!</h3>
                  <p className="text-lg">Use as ações rápidas na barra lateral ou digite sua mensagem</p>
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

            {/* Input Area */}
            <div className="border-t p-4 lg:p-6 flex-shrink-0">
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
                  placeholder="Digite sua mensagem (ex: 'crie flashcards', 'faça um resumo', 'gere um quiz')..."
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
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Below Chat */}
      <div className="relative z-10 mb-4">
        <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-center">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {quickPrompts.map((prompt, index) => {
                const Icon = prompt.icon;
                const isGeneratingThis = isGenerating === prompt.type;
                return (
                  <Button
                    key={index}
                    variant="outline"
                    className={`h-auto p-4 flex flex-col items-center space-y-2 hover:shadow-md transition-all duration-200 ${isGeneratingThis ? 'opacity-50 pointer-events-none' : ''}`}
                    onClick={() => !isGenerating && handleQuickPrompt(prompt.prompt, prompt.type)}
                    disabled={isGeneratingThis}
                  >
                    <div className="w-8 h-8 bg-primary/15 rounded-lg flex items-center justify-center">
                      {isGeneratingThis ? (
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Icon className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="text-center">
                      <h4 className="font-medium text-sm">{prompt.title}</h4>
                      <p className="text-xs text-muted-foreground">{prompt.description}</p>
                    </div>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PDFs and Additional Options */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* PDFs Disponíveis */}
        {availablePDFs.length > 0 && (
          <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">PDFs Disponíveis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {availablePDFs.map((pdf) => {
                  const isSelected = selectedPDFId === pdf.id;
                  const hasContent = pdf.json_content || pdf.extracted_content;
                  const isProcessed = pdf.processing_status === 'completed' || pdf.processing_status === 'json_completed';

                  return (
                    <div
                      key={pdf.id}
                      className={`p-3 border rounded-lg cursor-pointer hover:shadow-md transition-all duration-200 ${isSelected ? 'border-primary bg-primary/10' : 'border-border'} ${!hasContent ? 'opacity-50' : ''}`}
                      onClick={() => hasContent && setSelectedPDFId(pdf.id)}
                    >
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-blue-500/15 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{pdf.original_name}</h4>
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
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Saved Messages */}
        <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5" />
              Conversas Salvas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {savedMessages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma conversa salva
              </p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {savedMessages.slice(0, 5).map((message) => (
                  <div key={message.id} className="p-3 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => loadSavedMessage(message)}>
                    <h5 className="font-medium text-sm truncate">{message.title}</h5>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {message.type === 'flashcard' ? 'Flashcards' :
                          message.type === 'resume' ? 'Resumo' :
                            message.type === 'quiz' ? 'Quiz' : 'Prova'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {message.createdAt.toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
                {savedMessages.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    +{savedMessages.length - 5} mais...
                  </p>
                )}
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