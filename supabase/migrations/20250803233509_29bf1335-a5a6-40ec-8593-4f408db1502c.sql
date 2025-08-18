-- Drop the admin policy that might not be working
DROP POLICY IF EXISTS "Admins can access all PDFs" ON storage.objects;

-- Create a simpler policy for authenticated users to upload PDFs
DROP POLICY IF EXISTS "Users can upload their own PDFs" ON storage.objects;

CREATE POLICY "Authenticated users can upload PDFs" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'pdfs' AND 
  auth.uid() IS NOT NULL
);

-- Update other policies to be less restrictive for now
DROP POLICY IF EXISTS "Users can view their own PDFs" ON storage.objects;

CREATE POLICY "Authenticated users can view PDFs" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'pdfs' AND 
  auth.uid() IS NOT NULL
);