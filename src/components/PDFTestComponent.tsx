import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, MessageSquare, Code } from 'lucide-react';

const PDFTestComponent: React.FC = () => {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedPdf, setUploadedPdf] = useState<any>(null);
  const [converting, setConverting] = useState(false);
  const [jsonContent, setJsonContent] = useState<any>(null);
  const [askingQuestion, setAskingQuestion] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    } else {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo PDF válido",
        variant: "destructive"
      });
    }
  };

  const uploadPDF = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Upload do arquivo para o storage
      const fileName = `${user.id}/${Date.now()}_${selectedFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('pdfs')
        .upload(fileName, selectedFile);

      if (uploadError) {
        throw new Error(`Erro no upload: ${uploadError.message}`);
      }

      // Criar sessão
      const { data: session } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          name: `Teste - ${selectedFile.name}`
        })
        .select()
        .single();

      // Salvar metadados no banco
      const { data: pdfData, error: dbError } = await supabase
        .from('pdfs')
        .insert({
          user_id: user.id,
          filename: selectedFile.name,
          original_name: selectedFile.name,
          file_path: uploadData.path,
          file_size: selectedFile.size,
          session_id: session?.id,
          processing_status: 'pending'
        })
        .select()
        .single();

      if (dbError) {
        throw new Error(`Erro ao salvar no banco: ${dbError.message}`);
      }

      setUploadedPdf(pdfData);
      toast({
        title: "✅ Upload concluído!",
        description: "PDF enviado com sucesso",
      });

    } catch (error) {
      console.error('Erro no upload:', error);
      toast({
        title: "❌ Erro no upload",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const convertToJSON = async () => {
    if (!uploadedPdf) return;

    try {
      setConverting(true);

      const { data, error } = await supabase.functions.invoke('ai-processor', {
        body: {
          action: 'convert_pdf_to_json',
          pdfId: uploadedPdf.id
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        setJsonContent(data.json_content);
        toast({
          title: "✅ Conversão concluída!",
          description: "PDF convertido para JSON com sucesso",
        });
      } else {
        throw new Error(data.error || 'Erro na conversão');
      }

    } catch (error) {
      console.error('Erro na conversão:', error);
      toast({
        title: "❌ Erro na conversão",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setConverting(false);
    }
  };

  const askQuestion = async () => {
    if (!uploadedPdf || !question.trim()) return;

    try {
      setAskingQuestion(true);

      const { data, error } = await supabase.functions.invoke('ai-processor', {
        body: {
          action: 'chat',
          message: question,
          sessionId: uploadedPdf.session_id,
          pdfId: uploadedPdf.id
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        setAnswer(data.response);
        toast({
          title: "✅ Pergunta respondida!",
          description: "IA respondeu com base no PDF",
        });
      } else {
        throw new Error(data.error || 'Erro na pergunta');
      }

    } catch (error) {
      console.error('Erro na pergunta:', error);
      toast({
        title: "❌ Erro na pergunta",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setAskingQuestion(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🧪 Teste do Sistema PDF to JSON
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Etapa 1: Upload do PDF */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">1. Upload do PDF</h3>
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
              {selectedFile && (
                <Button
                  onClick={uploadPDF}
                  disabled={uploading}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {uploading ? 'Enviando...' : 'Enviar PDF'}
                </Button>
              )}
            </div>
            {uploadedPdf && (
              <div className="p-4 bg-green-50 rounded-lg">
                ✅ PDF enviado: {uploadedPdf.original_name}
              </div>
            )}
          </div>

          {/* Etapa 2: Conversão para JSON */}
          {uploadedPdf && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">2. Conversão para JSON</h3>
              <Button
                onClick={convertToJSON}
                disabled={converting}
                className="flex items-center gap-2"
              >
                <Code className="h-4 w-4" />
                {converting ? 'Convertendo...' : 'Converter para JSON'}
              </Button>
              {jsonContent && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="font-semibold mb-2">✅ JSON Gerado:</p>
                  <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                    {JSON.stringify(jsonContent, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Etapa 3: Fazer pergunta */}
          {uploadedPdf && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">3. Fazer Pergunta sobre o PDF</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Digite sua pergunta sobre o PDF..."
                  className="flex-1 px-3 py-2 border rounded-lg"
                />
                <Button
                  onClick={askQuestion}
                  disabled={askingQuestion || !question.trim()}
                  className="flex items-center gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  {askingQuestion ? 'Perguntando...' : 'Perguntar'}
                </Button>
              </div>
              {answer && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="font-semibold mb-2">✅ Resposta da IA:</p>
                  <div className="whitespace-pre-wrap">{answer}</div>
                </div>
              )}
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
};

export default PDFTestComponent;