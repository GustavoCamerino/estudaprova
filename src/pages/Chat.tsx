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
import {
  Send,
  FileText,
  Brain,
  HelpCircle,
  Zap,
  Upload,
  Crown,
  MessageCircle,
  User,
  Bot
} from 'lucide-react';
import FlashcardCarousel from '@/components/FlashcardCarousel';
import ResumeViewer from '@/components/ResumeViewer';
import QuizInterface from '@/components/QuizInterface';
import ExamInterface from '@/components/ExamInterface';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PDFContent {
  name: string;
  text: string;
  pages: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const Chat = () => {
  const { toast } = useToast();
  const { isAdmin, isPremium, userRole } = useUserRole();
  const { trackPageView, trackClick, trackUpload } = useAnalytics();
  const { extractTextFromPDF, isExtracting } = usePDFExtractor();
  const [currentView, setCurrentView] = useState<'chat' | 'flashcard' | 'resume' | 'quiz' | 'prova'>('chat');
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [pdfContent, setPdfContent] = useState<PDFContent | null>(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    trackPageView('/chat');
  }, [trackPageView]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      console.log('🔄 Extraindo texto do PDF...');
      const extractedData = await extractTextFromPDF(file);
      
      if (!extractedData) {
        throw new Error('Falha na extração do texto do PDF');
      }

      console.log(`✅ Texto extraído: ${extractedData.text.length} caracteres de ${extractedData.pages} páginas`);

      // Store PDF content in memory only
      setPdfContent({
        name: file.name,
        text: extractedData.text,
        pages: extractedData.pages
      });

      trackUpload('pdf', '/chat');

      toast({
        title: "PDF processado com sucesso! 🎉",
        description: `${file.name} foi analisado e está pronto para perguntas.`,
      });

    } catch (error) {
      console.error('PDF processing error:', error);
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

  const generateContent = async (type: 'flashcard' | 'resume' | 'quiz' | 'prova') => {
    if (!pdfContent) {
      toast({
        title: "Nenhum PDF encontrado",
        description: "Por favor, envie um PDF primeiro.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(type);
    
    try {
      let prompt = '';
      switch (type) {
        case 'flashcard':
          prompt = `Crie flashcards baseados no conteúdo do PDF "${pdfContent.name}": ${pdfContent.text.substring(0, 3000)}...`;
          break;
        case 'resume':
          prompt = `Faça um resumo detalhado do PDF "${pdfContent.name}": ${pdfContent.text.substring(0, 3000)}...`;
          break;
        case 'quiz':
          prompt = `Crie um quiz com 10 questões baseado no PDF "${pdfContent.name}": ${pdfContent.text.substring(0, 3000)}...`;
          break;
        case 'prova':
          prompt = `Gere uma prova completa com questões múltipla escolha e dissertativas baseada no PDF "${pdfContent.name}": ${pdfContent.text.substring(0, 3000)}...`;
          break;
      }

      const { data: resp, error } = await supabase.functions.invoke('ai-processor', {
        body: { action: 'chat', message: prompt }
      });

      if (error) throw new Error(error.message);
      if (!resp?.success) throw new Error(resp?.error || 'Falha ao gerar conteúdo');

      setGeneratedContent({ type, content: resp.response });
      setCurrentView(type);

      toast({
        title: "Conteúdo gerado com sucesso!",
        description: `${type} criado com base no seu PDF.`,
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
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Create prompt with PDF context if available
      const contextPrompt = pdfContent 
        ? `Contexto do PDF "${pdfContent.name}" (${pdfContent.pages} páginas):\n${pdfContent.text}\n\nPergunta do usuário: ${input}`
        : input;

      const { data: resp, error } = await supabase.functions.invoke('ai-processor', {
        body: { 
          action: 'chat', 
          message: contextPrompt,
          context: pdfContent ? 'pdf' : 'general'
        }
      });

      if (error) throw new Error(error.message);
      if (!resp?.success) throw new Error(resp?.error || 'Falha ao processar mensagem');

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: resp.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Erro no chat",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (currentView === 'flashcard' && generatedContent?.type === 'flashcard') {
    return <FlashcardCarousel cards={generatedContent.content} title="Flashcards Gerados" />;
  }

  if (currentView === 'resume' && generatedContent?.type === 'resume') {
    return <ResumeViewer title="Resumo Gerado" content={generatedContent.content} />;
  }

  if (currentView === 'quiz' && generatedContent?.type === 'quiz') {
    return <QuizInterface title="Quiz Gerado" questions={generatedContent.content} />;
  }

  if (currentView === 'prova' && generatedContent?.type === 'prova') {
    return <ExamInterface title="Prova Gerada" multipleChoice={generatedContent.content.multipleChoice || []} essays={generatedContent.content.essays || []} />;
  }

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
          {pdfContent ? `PDF: ${pdfContent.name} (${pdfContent.pages} páginas)` : 'Nenhum PDF carregado'}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8">
            {/* Welcome Icon */}
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageCircle className="w-8 h-8 text-primary" />
            </div>

            {/* Welcome Text */}
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
                  <Button className="w-full">
                    {isExtracting ? 'Processando...' : 'Enviar PDF'}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Ou arraste e solte seu arquivo aqui
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4 w-full max-w-md">
              <Button
                variant="outline"
                className="flex items-center gap-2 h-12"
                onClick={() => generateContent('flashcard')}
                disabled={!!isGenerating || !pdfContent}
              >
                <Brain className="w-4 h-4" />
                {isGenerating === 'flashcard' ? 'Criando...' : 'Criar Flashcards'}
              </Button>
              
              <Button
                variant="outline"
                className="flex items-center gap-2 h-12"
                onClick={() => generateContent('resume')}
                disabled={!!isGenerating || !pdfContent}
              >
                <FileText className="w-4 h-4" />
                {isGenerating === 'resume' ? 'Fazendo...' : 'Fazer Resumo'}
              </Button>
              
              <Button
                variant="outline"
                className="flex items-center gap-2 h-12"
                onClick={() => generateContent('quiz')}
                disabled={!!isGenerating || !pdfContent}
              >
                <HelpCircle className="w-4 h-4" />
                {isGenerating === 'quiz' ? 'Criando...' : 'Criar Quiz'}
              </Button>
              
              <Button
                variant="outline"
                className="flex items-center gap-2 h-12"
                onClick={() => generateContent('prova')}
                disabled={!!isGenerating || !pdfContent}
              >
                <Zap className="w-4 h-4" />
                {isGenerating === 'prova' ? 'Gerando...' : 'Gerar Prova'}
              </Button>
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1 px-4">
            <div className="max-w-4xl mx-auto space-y-4 py-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start space-x-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card border border-border'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <div className={`text-xs mt-1 opacity-70 ${
                      message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    }`}>
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                  
                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-secondary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-card border border-border p-3 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        )}

        {/* Upload Area for Chat Mode */}
        {messages.length > 0 && !pdfContent && (
          <div className="px-4 pb-4">
            <div 
              {...getRootProps()} 
              className={`w-full p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                isDragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              <div className="flex items-center justify-center space-x-2">
                <Upload className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">
                  {isExtracting ? 'Processando PDF...' : 'Clique ou arraste um PDF aqui'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              pdfContent 
                ? "Digite sua pergunta sobre o PDF..." 
                : "Faça uma pergunta ou envie um PDF primeiro..."
            }
            className="flex-1"
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            disabled={isLoading}
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        {pdfContent && (
          <div className="mt-2 max-w-4xl mx-auto">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="w-3 h-3" />
              <span>PDF carregado: {pdfContent.name} ({pdfContent.pages} páginas, {pdfContent.text.length} caracteres)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
