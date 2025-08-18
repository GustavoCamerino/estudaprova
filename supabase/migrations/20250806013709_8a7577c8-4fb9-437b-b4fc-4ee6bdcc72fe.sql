-- Add extracted_content column to pdfs table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pdfs' 
        AND column_name = 'extracted_content'
    ) THEN
        ALTER TABLE public.pdfs 
        ADD COLUMN extracted_content TEXT;
    END IF;
END $$;

-- Add index for better performance when searching extracted content
CREATE INDEX IF NOT EXISTS idx_pdfs_extracted_content_search 
ON public.pdfs USING gin(to_tsvector('portuguese', extracted_content));

-- Add index for user_id and session_id combination for faster queries
CREATE INDEX IF NOT EXISTS idx_pdfs_user_session 
ON public.pdfs (user_id, session_id);