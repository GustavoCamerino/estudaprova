import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    FileText,
    Download,
    Trash2,
    Eye,
    Calendar,
    Edit,
    Plus,
    Code,
    CheckCircle,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import PDFDialog, { PDFData } from './PDFDialog';

interface PDFFile {
    id: string;
    user_id: string;
    filename: string;
    original_name: string;
    file_path: string;
    file_size: number;
    upload_date: string;
    processing_status: string;
    created_at: string;
    updated_at: string;
    extracted_content?: string;
    json_content?: any;
    session_id?: string;
    name: string; // Para compatibilidade
}

const PDFManager: React.FC = () => {
    const { toast } = useToast();
    const [pdfs, setPdfs] = useState<PDFFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [converting, setConverting] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingPDF, setEditingPDF] = useState<PDFFile | undefined>();
    const [selectedPDF, setSelectedPDF] = useState<PDFFile | null>(null);
    const [jsonViewerOpen, setJsonViewerOpen] = useState(false);

    useEffect(() => {
        loadPDFs();
    }, []);

    const loadPDFs = async () => {
        try {
            setLoading(true);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast({
                    title: "Erro",
                    description: "Usuário não autenticado",
                    variant: "destructive"
                });
                return;
            }

            const { data: pdfsData, error } = await supabase
                .from('pdfs')
                .select('*')
                .eq('user_id', user.id)
                .order('upload_date', { ascending: false });

            if (error) {
                console.error('Erro ao carregar PDFs:', error);
                toast({
                    title: "Erro",
                    description: "Falha ao carregar PDFs",
                    variant: "destructive"
                });
                return;
            }

            // Mapeia os dados para incluir a propriedade name
            const mappedPdfs = (pdfsData || []).map(pdf => ({
                ...pdf,
                name: pdf.original_name // Adiciona a propriedade name para compatibilidade
            }));
            setPdfs(mappedPdfs);
        } catch (error) {
            console.error('Erro ao carregar PDFs:', error);
            toast({
                title: "Erro",
                description: "Falha ao carregar PDFs",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const convertToJSON = async (pdfId: string) => {
        try {
            setConverting(pdfId);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('Usuário não autenticado');
            }

            const { data, error } = await supabase.functions.invoke('ai-processor', {
                body: {
                    action: 'convert_pdf_to_json',
                    pdfId: pdfId
                }
            });

            if (error) {
                throw new Error(error.message);
            }

            if (data.success) {
                toast({
                    title: "✅ Conversão concluída!",
                    description: "PDF convertido para JSON com sucesso",
                });

                // Atualiza a lista de PDFs
                await loadPDFs();
            } else {
                throw new Error(data.error || 'Erro na conversão');
            }

        } catch (error) {
            console.error('Erro na conversão para JSON:', error);
            toast({
                title: "❌ Erro na conversão",
                description: error instanceof Error ? error.message : "Erro desconhecido",
                variant: "destructive"
            });
        } finally {
            setConverting(null);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const { error } = await supabase
                .from('pdfs')
                .delete()
                .eq('id', id);

            if (error) {
                throw error;
            }

            setPdfs(prev => prev.filter(f => f.id !== id));
            toast({
                title: "PDF removido",
                description: "O arquivo foi removido com sucesso.",
            });
        } catch (error) {
            console.error('Erro ao deletar PDF:', error);
            toast({
                title: "Erro",
                description: "Falha ao remover PDF",
                variant: "destructive"
            });
        }
    };

    const handleEdit = (file: PDFFile) => {
        setEditingPDF(file);
        setDialogOpen(true);
    };

    const handleSavePDF = async (pdfData: Omit<PDFData, 'id'>) => {
        if (editingPDF) {
            try {
                const { error } = await supabase
                    .from('pdfs')
                    .update({
                        original_name: pdfData.name,
                        // Adicione outros campos conforme necessário
                    })
                    .eq('id', editingPDF.id);

                if (error) {
                    throw error;
                }

                setPdfs(prev => prev.map(f =>
                    f.id === editingPDF.id
                        ? { ...f, original_name: pdfData.name }
                        : f
                ));

                toast({
                    title: "PDF atualizado",
                    description: "As informações do PDF foram atualizadas.",
                });
            } catch (error) {
                console.error('Erro ao atualizar PDF:', error);
                toast({
                    title: "Erro",
                    description: "Falha ao atualizar PDF",
                    variant: "destructive"
                });
            }
        }
        setEditingPDF(undefined);
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
            case 'json_completed':
                return 'bg-green-500/10 text-green-600';
            case 'processing':
                return 'bg-yellow-500/10 text-yellow-600';
            case 'failed':
            case 'json_failed':
                return 'bg-red-500/10 text-red-600';
            default:
                return 'bg-gray-500/10 text-gray-600';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'completed':
                return 'Processado';
            case 'json_completed':
                return 'JSON Pronto';
            case 'processing':
                return 'Processando';
            case 'failed':
                return 'Erro';
            case 'json_failed':
                return 'Erro JSON';
            default:
                return 'Pendente';
        }
    };

    const viewJSON = (pdf: PDFFile) => {
        setSelectedPDF(pdf);
        setJsonViewerOpen(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Carregando PDFs...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-display font-bold mb-3 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    Gerenciador de PDFs
                </h1>
                <p className="text-muted-foreground text-lg">
                    Visualize, edite e converta seus PDFs para JSON estruturado.
                </p>
            </div>

            {/* Files List */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-display font-semibold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                        Arquivos ({pdfs.length})
                    </h2>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDialogOpen(true)}
                            className="border-primary hover:bg-primary/10"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Adicionar
                        </Button>
                    </div>
                </div>

                {pdfs.length === 0 ? (
                    <Card className="text-center py-12">
                        <CardContent>
                            <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                            <h3 className="text-xl font-semibold mb-2">Nenhum PDF encontrado</h3>
                            <p className="text-muted-foreground mb-4">
                                Faça upload de PDFs através do Chat AI para começar.
                            </p>
                            <Button onClick={() => window.location.href = '/chat'}>
                                Ir para Chat AI
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {pdfs.map((file) => (
                            <Card key={file.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-4">
                                            <div className="p-2 bg-primary/10 rounded-lg">
                                                <FileText className="h-6 w-6 text-primary" />
                                            </div>

                                            <div className="flex-1">
                                                <div className="flex items-center space-x-2 mb-2">
                                                    <h3 className="font-semibold text-lg">{file.original_name}</h3>
                                                    <Badge className={getStatusColor(file.processing_status)}>
                                                        {getStatusText(file.processing_status)}
                                                    </Badge>
                                                    {file.json_content && (
                                                        <Badge className="bg-blue-500/10 text-blue-600">
                                                            <CheckCircle className="h-3 w-3 mr-1" />
                                                            JSON
                                                        </Badge>
                                                    )}
                                                </div>

                                                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                                    <span className="flex items-center">
                                                        <Calendar className="h-4 w-4 mr-1" />
                                                        {new Date(file.upload_date).toLocaleDateString('pt-BR')}
                                                    </span>
                                                    <span>{formatFileSize(file.file_size)}</span>
                                                    {file.extracted_content && (
                                                        <span className="flex items-center">
                                                            <CheckCircle className="h-4 w-4 mr-1" />
                                                            Conteúdo extraído
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-2">
                                            {file.json_content ? (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => viewJSON(file)}
                                                    title="Visualizar JSON"
                                                >
                                                    <Code className="h-4 w-4" />
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => convertToJSON(file.id)}
                                                    disabled={converting === file.id}
                                                    title="Converter para JSON"
                                                >
                                                    {converting === file.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Code className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            )}

                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleEdit(file)}
                                                title="Editar"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>

                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(file.id)}
                                                className="text-destructive hover:text-destructive"
                                                title="Excluir"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* JSON Viewer Dialog */}
            {selectedPDF && jsonViewerOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-background rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-semibold">
                                JSON do PDF: {selectedPDF.original_name}
                            </h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setJsonViewerOpen(false)}
                            >
                                ✕
                            </Button>
                        </div>

                        <div className="bg-muted rounded-lg p-4 overflow-auto max-h-[60vh]">
                            <pre className="text-sm whitespace-pre-wrap">
                                {JSON.stringify(selectedPDF.json_content, null, 2)}
                            </pre>
                        </div>

                        <div className="mt-4 flex justify-end space-x-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    navigator.clipboard.writeText(JSON.stringify(selectedPDF.json_content, null, 2));
                                    toast({
                                        title: "Copiado!",
                                        description: "JSON copiado para a área de transferência",
                                    });
                                }}
                            >
                                Copiar JSON
                            </Button>
                            <Button onClick={() => setJsonViewerOpen(false)}>
                                Fechar
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <PDFDialog
                open={dialogOpen}
                onOpenChange={(open) => {
                    setDialogOpen(open);
                    if (!open) setEditingPDF(undefined);
                }}
                pdf={editingPDF}
                onSave={handleSavePDF}
            />
        </div>
    );
};

export default PDFManager; 