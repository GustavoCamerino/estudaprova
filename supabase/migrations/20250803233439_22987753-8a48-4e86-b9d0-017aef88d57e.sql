-- Create storage policies for PDFs bucket
CREATE POLICY "Users can upload their own PDFs" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'pdfs' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own PDFs" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'pdfs' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own PDFs" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'pdfs' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own PDFs" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'pdfs' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow admins to access all PDFs
CREATE POLICY "Admins can access all PDFs" 
ON storage.objects 
FOR ALL 
USING (
  bucket_id = 'pdfs' AND 
  public.has_role(auth.uid(), 'admin'::app_role)
);