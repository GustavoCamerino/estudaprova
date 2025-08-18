-- Adiciona coluna json_content à tabela pdfs para armazenar o JSON processado
ALTER TABLE public.pdfs 
ADD COLUMN json_content JSONB;

-- Adiciona índice para melhor performance na busca do JSON
CREATE INDEX idx_pdfs_json_content ON public.pdfs USING GIN(json_content);

-- Atualiza o status de processamento para incluir estados do JSON
COMMENT ON COLUMN public.pdfs.processing_status IS 'Status: pending, processing, completed, failed, json_processing, json_completed, json_failed';