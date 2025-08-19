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
  BookOpen,
  MessageSquare,
  Menu
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
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
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [isStudyingPDF, setIsStudyingPDF] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [availablePDFs, setAvailablePDFs] = useState<PDFWithJSON[]>([]);
  const [selectedPDFId, setSelectedPDFId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      isUser: true,
      timestamp: new Date(),
      type: 'normal'
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Save user message to database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('chat_messages')
          .insert({
            session_id: currentSessionId,
            user_id: user.id,
            content: input,
            is_user: true,
            message_type: 'normal'
          });
      }

      // Get PDF content from selected PDF or all PDFs in session
      let pdfContext = '';
      if (selectedPDFId) {
        const selectedPDF = availablePDFs.find(pdf => pdf.id === selectedPDFId);
        if (selectedPDF && (selectedPDF.json_content || selectedPDF.extracted_content)) {
          pdfContext = selectedPDF.extracted_content || JSON.stringify(selectedPDF.json_content);
        }
      } else if (availablePDFs.length > 0) {
        // Use all available PDFs if none specifically selected
        pdfContext = availablePDFs
          .filter(pdf => pdf.json_content || pdf.extracted_content)
          .map(pdf => pdf.extracted_content || JSON.stringify(pdf.json_content))
          .join('\n\n---\n\n');
      }

      // Call AI API
      const { data: aiResponse, error } = await supabase.functions.invoke('ai-processor', {
        body: {
          action: 'chat',
          message: input,
          pdfContext: pdfContext,
          sessionId: currentSessionId
        }
      });

      if (error) throw error;

      if (!aiResponse?.success) {
        throw new Error(aiResponse?.error || 'Erro na resposta da IA');
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponse.response,
        isUser: false,
        timestamp: new Date(),
        type: 'normal'
      };

      setMessages(prev => [...prev, aiMessage]);

      // Save AI response to database
      if (user) {
        await supabase
          .from('chat_messages')
          .insert({
            session_id: currentSessionId,
            user_id: user.id,
            content: aiResponse.response,
            is_user: false,
            message_type: 'normal'
          });
      }

      setQuestionCount(prev => prev + 1);

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao enviar mensagem",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendSpecificMessage = async (message: string, type: string) => {
    if (!currentSessionId) {
      await createNewSession();
    }

    setInput(message);
    await handleSendMessage();
  };

  return (
    <div className="h-[calc(100vh-73px)] flex flex-col bg-gradient-to-br from-background via-background/95 to-background overflow-hidden"
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Drag overlay */}
      {dragActive && (
        <div className="fixed inset-0 bg-primary/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card p-8 rounded-lg border-2 border-dashed border-primary">
            <Upload className="h-12 w-12 text-primary mx-auto mb-4" />
            <p className="text-lg font-medium text-center">Solte o PDF aqui</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex-shrink-0 bg-card/80 backdrop-blur-lg border-b px-3 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="lg:hidden">
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72">
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-lg font-semibold mb-2">Chat AI</h2>
                      <div className="flex items-center space-x-2 mb-4">
                        <Badge variant="secondary" className="text-xs">
                          {isPremium ? 'Premium' : userRole === 'admin' ? 'Admin' : 'Gratuito'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">PDFs: {pdfCount}/3</Badge>
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => {
                        fileInputRef.current?.click();
                        setSidebarOpen(false);
                      }}
                      disabled={isUploading || isStudyingPDF}
                      className="w-full"
                    >
                      {isUploading || isStudyingPDF ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Enviar PDF
                    </Button>

                    <SessionManager 
                      onNewSession={createNewSession}
                      onSaveSession={saveCurrentSession}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
            
            <h1 className="text-lg md:text-2xl font-bold text-primary">Chat AI</h1>
            <div className="hidden md:flex items-center space-x-2">
              <Badge variant="secondary" className="text-xs">
                {isPremium ? 'Premium' : userRole === 'admin' ? 'Admin' : 'Gratuito'}
              </Badge>
              <Badge variant="outline" className="text-xs">PDFs: {pdfCount}/3</Badge>
            </div>
          </div>
          
          <div className="hidden lg:flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentView('chat')}
              className={currentView === 'chat' ? 'bg-primary text-primary-foreground' : ''}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowSaved(!showSaved)}
            >
              <History className="h-4 w-4 mr-2" />
              Histórico
            </Button>
            <SessionManager 
              onNewSession={createNewSession}
              onSaveSession={saveCurrentSession}
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Desktop Sidebar - Hidden on mobile */}
        <div className="hidden lg:block w-80 bg-card/50 backdrop-blur-lg border-r p-4 xl:p-6 overflow-y-auto flex-shrink-0">
          <div className="space-y-4 xl:space-y-6">
            {/* Upload Section */}
            <div className="space-y-3 xl:space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-xs xl:text-sm uppercase tracking-wide text-muted-foreground">PDFs Enviados</h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || isStudyingPDF}
                  className="hover:bg-primary/10"
                >
                  {isUploading || isStudyingPDF ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* PDF List */}
              {availablePDFs.length > 0 ? (
                <div className="space-y-2">
                  {availablePDFs.map((pdf) => (
                    <div 
                      key={pdf.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedPDFId === pdf.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedPDFId(selectedPDFId === pdf.id ? null : pdf.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="text-sm font-medium truncate">{pdf.original_name}</span>
                        </div>
                        <Badge variant="outline" className="text-xs ml-2">
                          {pdf.json_content || pdf.extracted_content ? '✓' : '⏳'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum PDF enviado</p>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="space-y-3">
              <h3 className="font-semibold text-xs xl:text-sm uppercase tracking-wide text-muted-foreground">Ações Rápidas</h3>
              <div className="space-y-2">
                {quickPrompts.map((prompt, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-left h-auto p-3"
                    onClick={() => {
                      setIsGenerating(prompt.type);
                      handleSendSpecificMessage(prompt.prompt + " [adicione o tópico que deseja estudar]", prompt.type);
                    }}
                    disabled={isGenerating === prompt.type}
                  >
                    <prompt.icon className="h-4 w-4 mr-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-xs">{prompt.title}</div>
                      <div className="text-xs text-muted-foreground">{prompt.description}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Chat Messages Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {currentView === 'chat' && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-3 md:space-y-4">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center space-y-4 max-w-md px-4">
                      <div className="w-12 h-12 md:w-16 md:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                        <Bot className="w-6 h-6 md:w-8 md:h-8 text-primary" />
                      </div>
                      <h3 className="text-base md:text-lg font-semibold">Bem-vindo ao Chat AI!</h3>
                      <p className="text-sm md:text-base text-muted-foreground">
                        Envie seus PDFs e comece a fazer perguntas sobre o conteúdo.
                        Posso criar flashcards, resumos, quizzes e muito mais!
                      </p>
                      
                      {/* Mobile Upload Button */}
                      <div className="lg:hidden">
                        <Button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading || isStudyingPDF}
                          className="w-full"
                        >
                          {isUploading || isStudyingPDF ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Upload className="h-4 w-4 mr-2" />
                          )}
                          Enviar PDF
                        </Button>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 justify-center">
                        {quickPrompts.map((prompt, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setIsGenerating(prompt.type);
                              handleSendSpecificMessage(prompt.prompt + " [adicione o tópico que deseja estudar]", prompt.type);
                            }}
                            disabled={isGenerating === prompt.type}
                            className="hover:bg-primary/10 text-xs md:text-sm"
                          >
                            <prompt.icon className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                            <span className="hidden sm:inline">{prompt.title}</span>
                            <span className="sm:hidden">{prompt.title.split(' ')[0]}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[90%] md:max-w-[80%] p-3 md:p-4 rounded-lg ${message.isUser
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                            }`}
                        >
                          <div className="flex items-start space-x-2 md:space-x-3">
                            <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.isUser ? 'bg-primary-foreground/20' : 'bg-primary/10'
                              }`}>
                              {message.isUser ? (
                                <User className="w-3 h-3 md:w-4 md:h-4" />
                              ) : (
                                <Bot className="w-3 h-3 md:w-4 md:h-4" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="whitespace-pre-wrap break-words text-xs md:text-sm">
                                {message.content}
                              </p>
                              <p className="text-xs opacity-70 mt-2">
                                {message.timestamp.toLocaleTimeString('pt-BR')}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Input Area */}
              <div className="border-t bg-card/80 backdrop-blur-lg p-3 md:p-6">
                {/* PDFs em uso */}
                {availablePDFs.length > 0 && (
                  <div className="mb-3 md:mb-4 p-2 md:p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-3 h-3 md:h-4 md:w-4 text-primary" />
                      <span className="text-xs md:text-sm font-medium">PDFs disponíveis:</span>
                    </div>
                    <div className="flex flex-wrap gap-1 md:gap-2">
                      {availablePDFs.map((pdf) => (
                        <Badge 
                          key={pdf.id} 
                          variant={selectedPDFId === pdf.id ? "default" : "outline"}
                          className="cursor-pointer text-xs truncate max-w-[120px] md:max-w-none"
                          onClick={() => setSelectedPDFId(selectedPDFId === pdf.id ? null : pdf.id)}
                          title={pdf.original_name}
                        >
                          {pdf.original_name.length > 15 ? `${pdf.original_name.substring(0, 15)}...` : pdf.original_name}
                          {pdf.json_content || pdf.extracted_content ? ' ✓' : ' ⏳'}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="space-y-3 md:space-y-4">
                  <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4">
                    <div className="flex-1">
                      <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Digite sua pergunta sobre os PDFs..."
                        className="min-h-[60px] md:min-h-[80px] resize-none focus:ring-2 focus:ring-primary text-sm md:text-base"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="flex md:flex-col justify-center md:justify-end space-x-2 md:space-x-0 md:space-y-2">
                      <Button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="flex-1 md:flex-none h-8 md:h-10 px-3 md:px-4 text-sm"
                      >
                        {isLoading ? (
                          <Loader2 className="h-3 h-3 md:h-4 md:w-4 animate-spin" />
                        ) : (
                          <Send className="h-3 h-3 md:h-4 md:w-4" />
                        )}
                        <span className="ml-1 md:ml-0 md:sr-only">Enviar</span>
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            </>
          )}

          {/* Other Views */}
          {currentView === 'flashcard' && generatedContent && (
            <FlashcardCarousel 
              cards={generatedContent} 
            />
          )}

          {currentView === 'resume' && generatedContent && (
            <ResumeViewer 
              content={generatedContent} 
            />
          )}

          {currentView === 'quiz' && generatedContent && (
            <QuizInterface 
              questions={generatedContent} 
            />
          )}

          {currentView === 'prova' && generatedContent && (
            <ExamInterface 
              questions={generatedContent} 
            />
          )}
        </div>
      </div>

      {/* Chat Message Dialog */}
      <ChatMessageDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        message={editingMessage}
        onSave={(message) => {
          if (editingMessage) {
            setSavedMessages(prev => prev.map(m => m.id === message.id ? message : m));
          } else {
            setSavedMessages(prev => [...prev, { ...message, id: Date.now().toString(), createdAt: new Date() }]);
          }
          setDialogOpen(false);
          setEditingMessage(undefined);
        }}
      />
    </div>
  );
};

export default Chat;
