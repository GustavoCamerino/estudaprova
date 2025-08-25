import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { useAnalytics } from '@/hooks/useAnalytics';
import { usePDFExtractor } from '@/hooks/usePDFExtractor';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Send,
  FileText,
  Brain,
  HelpCircle,
  Zap,
  Upload,
  Crown,
  MessageCircle
} from 'lucide-react';
import FlashcardCarousel from '@/components/FlashcardCarousel';
import ResumeViewer from '@/components/ResumeViewer';
import QuizInterface from '@/components/QuizInterface';
import ExamInterface from '@/components/ExamInterface';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  const [currentView, setCurrentView] = useState<'upload' | 'chat' | 'flashcard' | 'resume' | 'quiz' | 'prova'>('upload');
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [pdfCount, setPdfCount] = useState(0);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [availablePDFs, setAvailablePDFs] = useState<PDFWithJSON[]>([]);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Array<{id: string, content: string, isUser: boolean, timestamp: Date}>>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(false);

  useEffect(() => {
    trackPageView('/chat');
  }, [trackPageView]);

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
      console.log('🔄 Extraindo texto do PDF automaticamente...');
      const extractedData = await extractTextFromPDF(file);
      
      if (!extractedData) {
        throw new Error('Falha na extração do texto do PDF');
      }

      console.log(`✅ Texto extraído: ${extractedData.text.length} caracteres de ${extractedData.pages} páginas`);

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

      setPdfCount(prev => prev + 1);
      setAvailablePDFs(prev => [...prev, dbData]);
      trackUpload('pdf', '/chat');
      
      // Switch to chat view after PDF upload
      setCurrentView('chat');
      setMessages([{
        id: Date.now().toString(),
        content: `PDF "${file.name}" foi processado com sucesso! Agora você pode fazer perguntas sobre o conteúdo.`,
        isUser: false,
        timestamp: new Date()
      }]);

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

  const generateContent = async (type: 'flashcard' | 'resume' | 'quiz' | 'prova') => {
    if (availablePDFs.length === 0) {
      toast({
        title: "Nenhum PDF encontrado",
        description: "Por favor, envie um PDF primeiro.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(type);
    
    try {
      const pdfContent = availablePDFs
        .map(pdf => pdf.extracted_content || '')
        .join('\n\n');

      if (!pdfContent.trim()) {
        throw new Error('Nenhum conteúdo de PDF disponível');
      }

      let prompt = '';
      let content: any = null;

      switch (type) {
        case 'flashcard':
          prompt = `Baseado no seguinte conteúdo do PDF, crie exatamente 10 flashcards com perguntas específicas e suas respectivas respostas. 
          
          Conteúdo: ${pdfContent.substring(0, 3000)}
          
          Formato de resposta:
          1. Pergunta: [pergunta específica sobre o conteúdo]
             Resposta: [resposta detalhada]
          2. Pergunta: [pergunta específica sobre o conteúdo]
             Resposta: [resposta detalhada]
          ... e assim por diante até 10 flashcards`;
          
          // Parse flashcards from response
          content = await generateFlashcards(prompt);
          break;
          
        case 'resume':
          prompt = `Faça um resumo completo e detalhado do seguinte conteúdo de PDF. Use *texto* para destacar partes importantes em negrito:
          
          Conteúdo: ${pdfContent.substring(0, 4000)}
          
          O resumo deve ser organizado, completo e incluir todos os pontos principais do documento.`;
          
          content = await generateSummary(prompt);
          break;
          
        case 'quiz':
          prompt = `Baseado no seguinte conteúdo, crie exatamente 10 questões de múltipla escolha com 4 alternativas cada (A, B, C, D).
          
          Conteúdo: ${pdfContent.substring(0, 3000)}
          
          Formato de resposta:
          1. [Pergunta]
          A) [opção A]
          B) [opção B] 
          C) [opção C]
          D) [opção D]
          Resposta correta: [letra da resposta]
          
          Repita para as 10 questões.`;
          
          content = await generateQuiz(prompt);
          break;
          
        case 'prova':
          prompt = `Baseado no seguinte conteúdo, crie uma prova com exatamente 20 questões de múltipla escolha com 4 alternativas cada (A, B, C, D).
          
          Conteúdo: ${pdfContent.substring(0, 4000)}
          
          Formato de resposta:
          1. [Pergunta]
          A) [opção A]
          B) [opção B]
          C) [opção C] 
          D) [opção D]
          Resposta correta: [letra da resposta]
          
          Repita para as 20 questões.`;
          
          content = await generateExam(prompt);
          break;
      }

      setGeneratedContent({ type, content });
      setCurrentView(type);

      toast({
        title: "Conteúdo gerado com sucesso!",
        description: `${type} criado com base nos seus PDFs.`,
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

  const generateFlashcards = async (prompt: string) => {
    const response = await callAI(prompt);
    const lines = response.split('\n');
    const flashcards = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.match(/^\d+\.\s*Pergunta:/)) {
        const question = line.replace(/^\d+\.\s*Pergunta:\s*/, '');
        const answerLine = lines[i + 1]?.trim();
        if (answerLine?.startsWith('Resposta:')) {
          const answer = answerLine.replace(/^Resposta:\s*/, '');
          flashcards.push({
            id: flashcards.length + 1,
            question,
            answer
          });
        }
      }
    }
    
    return flashcards.slice(0, 10); // Ensure exactly 10 flashcards
  };

  const generateSummary = async (prompt: string) => {
    const response = await callAI(prompt);
    // Convert *text* to <strong>text</strong> for HTML rendering
    return response.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
  };

  const generateQuiz = async (prompt: string) => {
    const response = await callAI(prompt);
    const questions = [];
    const sections = response.split(/\d+\.\s/).filter(s => s.trim());
    
    for (let section of sections.slice(0, 10)) {
      const lines = section.trim().split('\n').filter(l => l.trim());
      if (lines.length >= 6) {
        const questionText = lines[0].trim();
        const options = [];
        let correctAnswer = '';
        
        for (let line of lines) {
          if (line.match(/^[A-D]\)/)) {
            options.push(line.trim());
          } else if (line.includes('Resposta correta:')) {
            correctAnswer = line.split(':')[1].trim().toUpperCase();
          }
        }
        
        if (questionText && options.length === 4 && correctAnswer) {
          questions.push({
            id: questions.length + 1,
            question: questionText,
            options: options.map(opt => opt.substring(3)), // Remove A), B), etc.
            correctAnswer: correctAnswer.charCodeAt(0) - 65, // Convert A,B,C,D to 0,1,2,3
            explanation: `A resposta correta é ${correctAnswer}.`
          });
        }
      }
    }
    
    return questions;
  };

  const generateExam = async (prompt: string) => {
    const response = await callAI(prompt);
    const questions = [];
    const sections = response.split(/\d+\.\s/).filter(s => s.trim());
    
    for (let section of sections.slice(0, 20)) {
      const lines = section.trim().split('\n').filter(l => l.trim());
      if (lines.length >= 6) {
        const questionText = lines[0].trim();
        const options = [];
        let correctAnswer = '';
        
        for (let line of lines) {
          if (line.match(/^[A-D]\)/)) {
            options.push(line.trim());
          } else if (line.includes('Resposta correta:')) {
            correctAnswer = line.split(':')[1].trim().toUpperCase();
          }
        }
        
        if (questionText && options.length === 4 && correctAnswer) {
          questions.push({
            id: `mc-${questions.length + 1}`,
            question: questionText,
            options: options.map(opt => opt.substring(3)),
            correctAnswer: correctAnswer.charCodeAt(0) - 65
          });
        }
      }
    }
    
    return { multipleChoice: questions, essays: [] };
  };

  const callAI = async (prompt: string): Promise<string> => {
    const { data: resp, error } = await supabase.functions.invoke('ai-processor', {
      body: { action: 'chat', message: prompt }
    });

    if (error) throw new Error(error.message);
    if (!resp?.success) throw new Error(resp?.error || 'Falha ao gerar conteúdo');
    
    return resp.response;
  };

  const handleSendMessage = async () => {
    if (!input.trim() || availablePDFs.length === 0) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoadingChat(true);

    // Add user message
    const userMsg = {
      id: Date.now().toString(),
      content: userMessage,
      isUser: true,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const pdfContent = availablePDFs
        .map(pdf => pdf.extracted_content || '')
        .join('\n\n');

      const contextPrompt = `Baseado no seguinte conteúdo de PDF, responda à pergunta do usuário de forma detalhada e precisa:

Conteúdo do PDF: ${pdfContent.substring(0, 4000)}

Pergunta do usuário: ${userMessage}

Responda de forma clara e baseada exclusivamente no conteúdo do PDF fornecido.`;

      const response = await callAI(contextPrompt);

      // Add AI response
      const aiMsg = {
        id: (Date.now() + 1).toString(),
        content: response,
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);

    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg = {
        id: (Date.now() + 1).toString(),
        content: 'Desculpe, ocorreu um erro ao processar sua pergunta. Tente novamente.',
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
      
      toast({
        title: "Erro no chat",
        description: "Não foi possível processar sua pergunta.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingChat(false);
    }
  };

  if (currentView === 'flashcard' && generatedContent?.type === 'flashcard') {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button 
              variant="outline" 
              onClick={() => setCurrentView('chat')}
            >
              ← Voltar ao Chat
            </Button>
          </div>
          <FlashcardCarousel cards={generatedContent.content} title="Flashcards Gerados" />
        </div>
      </div>
    );
  }

  if (currentView === 'resume' && generatedContent?.type === 'resume') {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button 
              variant="outline" 
              onClick={() => setCurrentView('chat')}
            >
              ← Voltar ao Chat
            </Button>
            <h1 className="text-2xl font-bold">Resumo Gerado</h1>
          </div>
          <Card>
            <CardContent className="p-6">
              <div 
                className="prose max-w-none text-foreground"
                dangerouslySetInnerHTML={{ __html: generatedContent.content }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (currentView === 'quiz' && generatedContent?.type === 'quiz') {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button 
              variant="outline" 
              onClick={() => setCurrentView('chat')}
            >
              ← Voltar ao Chat
            </Button>
          </div>
          <QuizInterface title="Quiz Gerado" questions={generatedContent.content} />
        </div>
      </div>
    );
  }

  if (currentView === 'prova' && generatedContent?.type === 'prova') {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button 
              variant="outline" 
              onClick={() => setCurrentView('chat')}
            >
              ← Voltar ao Chat
            </Button>
          </div>
          <ExamInterface title="Prova Gerada" multipleChoice={generatedContent.content.multipleChoice || []} essays={generatedContent.content.essays || []} />
        </div>
      </div>
    );
  }

  // Upload view
  if (currentView === 'upload') {
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
            PDFs: {pdfCount}/3
          </div>
        </div>

        {/* Main Content */}
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
        </div>
      </div>
    );
  }

  // Chat view
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
          PDFs: {pdfCount}/3
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-4 border-b border-border bg-card">
        <div className="grid grid-cols-2 gap-3 max-w-2xl mx-auto">
          <Button
            variant="outline"
            className="flex items-center gap-2 h-10"
            onClick={() => generateContent('flashcard')}
            disabled={!!isGenerating}
          >
            <Brain className="w-4 h-4" />
            {isGenerating === 'flashcard' ? 'Criando...' : 'Criar Flashcards'}
          </Button>
          
          <Button
            variant="outline"
            className="flex items-center gap-2 h-10"
            onClick={() => generateContent('resume')}
            disabled={!!isGenerating}
          >
            <FileText className="w-4 h-4" />
            {isGenerating === 'resume' ? 'Fazendo...' : 'Fazer Resumo'}
          </Button>
          
          <Button
            variant="outline"
            className="flex items-center gap-2 h-10"
            onClick={() => generateContent('quiz')}
            disabled={!!isGenerating}
          >
            <HelpCircle className="w-4 h-4" />
            {isGenerating === 'quiz' ? 'Criando...' : 'Criar Quiz'}
          </Button>
          
          <Button
            variant="outline"
            className="flex items-center gap-2 h-10"
            onClick={() => generateContent('prova')}
            disabled={!!isGenerating}
          >
            <Zap className="w-4 h-4" />
            {isGenerating === 'prova' ? 'Gerando...' : 'Gerar Prova'}
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-4 rounded-lg ${
                  message.isUser
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border border-border'
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <span className="text-xs opacity-70 mt-2 block">
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
          {isLoadingChat && (
            <div className="flex justify-start">
              <div className="max-w-[80%] p-4 rounded-lg bg-card border border-border">
                <p className="text-sm">Pensando...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua pergunta sobre os PDFs..."
            className="flex-1"
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoadingChat}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
