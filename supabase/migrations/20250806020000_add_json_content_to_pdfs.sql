-- Add json_content column to pdfs table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pdfs' 
        AND column_name = 'json_content'
    ) THEN
        ALTER TABLE public.pdfs 
        ADD COLUMN json_content JSONB;
    END IF;
END $$;

-- Add index for better performance when searching json content
CREATE INDEX IF NOT EXISTS idx_pdfs_json_content 
ON public.pdfs USING gin(json_content);

-- Add index for processing_status to track JSON conversion status
CREATE INDEX IF NOT EXISTS idx_pdfs_processing_status 
ON public.pdfs (processing_status); 