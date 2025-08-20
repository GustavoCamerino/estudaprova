import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { useAnalytics } from '@/hooks/useAnalytics';
import { usePDFExtractor } from '@/hooks/usePDFExtractor';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Send,
  FileText,
  Brain,
  HelpCircle,
  Zap,
  Upload,
  Crown,
  MessageCircle,
  Utensils,
  CheckCircle,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import FlashcardCarousel from '@/components/FlashcardCarousel';
import ResumeViewer from '@/components/ResumeViewer';
import QuizInterface from '@/components/QuizInterface';
import ExamInterface from '@/components/ExamInterface';
import DietPlanViewer from '@/components/DietPlanViewer';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

interface PDFWithJSON {
  id: string;
  original_name: string;
  processing_status: string;
  json_content?: any;
  extracted_content?: string;
}

const Chat = () => {
  const { toast } = useToast();
  const { isAdmin, isPremium, userRole } = useUserRole();
  const { trackPageView, trackClick, trackUpload } = useAnalytics();
  const { extractTextFromPDF, isExtracting } = usePDFExtractor();
  
  // State management
  const [currentView, setCurrentView] = useState<'chat' | 'flashcard' | 'resume' | 'quiz' | 'prova' | 'dieta'>('chat');
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [pdfProcessed, setPdfProcessed] = useState(false);
  const [availablePDFs, setAvailablePDFs] = useState<PDFWithJSON[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    trackPageView('/chat');
    loadExistingPDFs();
  }, [trackPageView]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadExistingPDFs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: pdfs, error } = await supabase
        .from('pdfs')
        .select('*')
        .eq('user_id', user.id)
        .order('upload_date', { ascending: false });

      if (error) {
        console.error('Error loading PDFs:', error);
        return;
      }

      setAvailablePDFs(pdfs || []);
      if (pdfs && pdfs.length > 0) {
        setPdfProcessed(true);
      }
    } catch (error) {
      console.error('Error in loadExistingPDFs:', error);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: "Erro",
        description: "Por favor, selecione apenas arquivos PDF.",
        variant: "destructive"
      });
      return;
    }

    // Check file size limit (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 10MB.",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('🔄 Processando PDF automaticamente...');
      const extractedData = await extractTextFromPDF(file);
      
      if (!extractedData) {
        throw new Error('Falha na extração do texto do PDF');
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Usuário não autenticado');
      }

      // Upload file to Supabase Storage
      const fileName = `${user.id}/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('pdfs')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Erro no upload: ${uploadError.message}`);
      }

      // Save to database
      const { data: dbData, error: dbError } = await supabase
        .from('pdfs')
        .insert({
          user_id: user.id,
          filename: fileName,
          original_name: file.name,
          file_path: uploadData.path,
          file_size: file.size,
          processing_status: 'completed',
          extracted_content: extractedData.text
        })
        .select()
        .single();

      if (dbError) {
        await supabase.storage.from('pdfs').remove([fileName]);
        throw new Error(`Erro ao salvar no banco: ${dbError.message}`);
      }

      setAvailablePDFs(prev => [...prev, dbData]);
      setPdfProcessed(true);
      trackUpload('pdf', '/chat');

      // Add success message to chat
      const successMessage: ChatMessage = {
        id: Date.now().toString(),
        content: "📖 PDF carregado e lido com sucesso!",
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, successMessage]);

      toast({
        title: "PDF processado com sucesso! 🎉",
        description: `${file.name} foi analisado e está pronto para perguntas.`,
      });

    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      toast({
        title: "Erro no processamento",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }, [extractTextFromPDF, toast, trackUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: false,
    noClick: false
  });

  const generateContent = async (type: 'flashcard' | 'resume' | 'quiz' | 'prova' | 'dieta') => {
    if (!pdfProcessed || availablePDFs.length === 0) {
      toast({
        title: "Nenhum PDF encontrado",
        description: "Por favor, envie um PDF primeiro.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(type);
    trackClick(`generate-${type}`, '/chat');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      let prompt = '';
      switch (type) {
        case 'flashcard':
          prompt = `Gerar 10 flashcards educacionais de alta qualidade com base nos PDFs do usuário. Formato JSON: {"cards": [{"id": "1", "question": "Pergunta?", "answer": "Resposta detalhada"}]}`;
          break;
        case 'resume':
          prompt = `Gerar um resumo completo e didático em Markdown dos PDFs do usuário (títulos, subtítulos, listas, destaques).`;
          break;
        case 'quiz':
          prompt = `Gerar um quiz com 10 questões de múltipla escolha com base nos PDFs do usuário. Formato JSON: {"questions": [{"id": "1", "question": "Pergunta?", "options": ["A", "B", "C", "D"], "correctAnswer": 0, "explanation": "Explicação"}]}`;
          break;
        case 'prova':
          prompt = `Gerar uma prova com 20 questões de múltipla escolha com base nos PDFs do usuário. Formato JSON: {"multipleChoice": [{"id": "1", "question": "Pergunta?", "options": ["A", "B", "C", "D"], "correctAnswer": 0, "points": 1}]}`;
          break;
        case 'dieta':
          prompt = `Gerar um plano alimentar de 7 dias (café, lanche manhã, almoço, lanche tarde, jantar) no formato JSON: {"days": [{"date": "AAAA-MM-DD", "meals": [{"name": "Refeição", "time": "07:00", "calories": 300, "description": "Descrição"}]}]}`;
          break;
      }

      const { data: resp, error } = await supabase.functions.invoke('ai-processor', {
        body: { 
          action: 'generate_content',
          type: type,
          prompt
        }
      });

      if (error) throw new Error(error.message);
      if (!resp?.success) throw new Error(resp?.error || 'Falha ao gerar conteúdo');

      setGeneratedContent(resp.content);
      setCurrentView(type);

      const typeNames = {
        flashcard: 'Flashcards',
        resume: 'Resumo',
        quiz: 'Quiz',
        prova: 'Prova',
        dieta: 'Plano Alimentar'
      };

      toast({
        title: `${typeNames[type]} gerado com sucesso!`,
        description: `${typeNames[type]} criado com base nos seus PDFs.`,
      });

    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: "Erro na geração",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive"
      });
    } finally {
      setIsGenerating(null);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    if (!pdfProcessed) {
      toast({
        title: "PDF necessário",
        description: "Envie um PDF primeiro para fazer perguntas sobre o conteúdo.",
        variant: "destructive"
      });
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: input,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsSendingMessage(true);

    try {
      const { data: resp, error } = await supabase.functions.invoke('ai-processor', {
        body: { 
          action: 'chat', 
          message: input,
          pdfId: availablePDFs[0]?.id
        }
      });

      if (error) throw new Error(error.message);
      if (!resp?.success) throw new Error(resp?.error || 'Falha ao processar mensagem');

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: resp.response,
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: "❌ Esse conteúdo não está disponível no PDF enviado.",
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const goBackToChat = () => {
    setCurrentView('chat');
    setGeneratedContent(null);
  };

  // Render different views based on current state
  if (currentView === 'flashcard' && generatedContent?.cards) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={goBackToChat}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Chat
          </Button>
          <FlashcardCarousel cards={generatedContent.cards} title="Flashcards do PDF" />
        </div>
      </div>
    );
  }

  if (currentView === 'resume' && generatedContent?.content) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={goBackToChat}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Chat
          </Button>
          <ResumeViewer title="Resumo do PDF" content={generatedContent.content} />
        </div>
      </div>
    );
  }

  if (currentView === 'quiz' && generatedContent?.questions) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={goBackToChat}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Chat
          </Button>
          <QuizInterface title="Quiz do PDF" questions={generatedContent.questions} />
        </div>
      </div>
    );
  }

  if (currentView === 'prova' && generatedContent?.multipleChoice) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={goBackToChat}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Chat
          </Button>
          <ExamInterface 
            title="Prova do PDF" 
            multipleChoice={generatedContent.multipleChoice} 
            essays={generatedContent.essays || []} 
          />
        </div>
      </div>
    );
  }

  if (currentView === 'dieta' && generatedContent?.days) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={goBackToChat}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Chat
          </Button>
          <DietPlanViewer dietPlan={generatedContent} />
        </div>
      </div>
    );
  }

  // Main chat interface
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <MessageCircle className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-semibold">Chat AI</h1>
          {isPremium && (
            <Badge className="bg-gradient-to-r from-primary to-secondary text-white">
              <Crown className="w-3 h-3 mr-1" />
              Premium
            </Badge>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          PDFs: {availablePDFs.length}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {!pdfProcessed ? (
          // Initial state - no PDF uploaded
          <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageCircle className="w-8 h-8 text-primary" />
            </div>

            <div className="text-center space-y-2 max-w-md">
              <h2 className="text-2xl font-semibold">Bem-vindo ao Chat AI!</h2>
              <p className="text-muted-foreground">
                Envie seus PDFs e comece a fazer perguntas sobre o conteúdo. 
                Posso criar flashcards, resumos, quizzes e muito mais!
              </p>
            </div>

            {/* Upload Area */}
            <div 
              {...getRootProps()} 
              className={`w-full max-w-md p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                isDragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              <div className="text-center space-y-4">
                <Upload className="w-12 h-12 text-primary mx-auto" />
                <div>
                  <Button className="w-full" disabled={isExtracting}>
                    {isExtracting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      'Enviar PDF'
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Ou arraste e solte seu arquivo aqui
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // PDF processed state - show chat and action buttons
          <div className="flex-1 flex flex-col">
            {/* Action Buttons */}
            <div className="p-4 border-b border-border bg-muted/30">
              <div className="flex flex-wrap gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => generateContent('flashcard')}
                  disabled={!!isGenerating}
                >
                  <Brain className="w-4 h-4" />
                  {isGenerating === 'flashcard' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    'Criar Flashcards'
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => generateContent('resume')}
                  disabled={!!isGenerating}
                >
                  <FileText className="w-4 h-4" />
                  {isGenerating === 'resume' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Fazendo...
                    </>
                  ) : (
                    'Fazer Resumo'
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => generateContent('quiz')}
                  disabled={!!isGenerating}
                >
                  <HelpCircle className="w-4 h-4" />
                  {isGenerating === 'quiz' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    'Criar Quiz'
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => generateContent('prova')}
                  disabled={!!isGenerating}
                >
                  <Zap className="w-4 h-4" />
                  {isGenerating === 'prova' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    'Gerar Prova'
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => generateContent('dieta')}
                  disabled={!!isGenerating}
                >
                  <Utensils className="w-4 h-4" />
                  {isGenerating === 'dieta' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    'Gerar Dieta'
                  )}
                </Button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">PDF Processado!</h3>
                      <p className="text-muted-foreground">
                        Agora você pode fazer perguntas sobre o conteúdo ou usar os botões acima para gerar material de estudo.
                      </p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-lg ${
                            message.isUser
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{message.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  {isSendingMessage && (
                    <div className="flex justify-start">
                      <div className="bg-muted text-muted-foreground p-3 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Processando...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </div>

            {/* Upload new PDF option */}
            <div className="p-2 border-t border-border bg-muted/30">
              <div 
                {...getRootProps()} 
                className={`p-3 border border-dashed rounded-lg cursor-pointer transition-colors text-center ${
                  isDragActive 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <input {...getInputProps()} />
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Upload className="w-4 h-4" />
                  {isExtracting ? 'Processando...' : 'Enviar outro PDF'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area - only show when PDF is processed */}
      {pdfProcessed && (
        <div className="p-4 border-t border-border bg-card">
          <div className="flex gap-2 max-w-4xl mx-auto">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua pergunta sobre o PDF..."
              className="flex-1"
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              disabled={isSendingMessage}
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!input.trim() || isSendingMessage}
            >
              {isSendingMessage ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;