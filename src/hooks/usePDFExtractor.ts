import { useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Configurar o worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface ExtractedPDFData {
  text: string;
  pages: number;
  filename: string;
}

export const usePDFExtractor = () => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extractTextFromPDF = useCallback(async (file: File): Promise<ExtractedPDFData | null> => {
    setIsExtracting(true);
    setError(null);
    
    try {
      console.log('🔄 Iniciando extração de texto do PDF:', file.name);
      
      // Converter arquivo em ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Carregar PDF
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      console.log(`📄 PDF carregado: ${pdf.numPages} páginas`);
      
      let fullText = '';
      
      // Extrair texto de cada página
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Combinar todo o texto da página
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        
        fullText += `\n=== PÁGINA ${pageNum} ===\n${pageText}\n`;
        
        console.log(`✅ Página ${pageNum} processada: ${pageText.length} caracteres`);
      }
      
      const result = {
        text: fullText.trim(),
        pages: pdf.numPages,
        filename: file.name
      };
      
      console.log(`🎉 Extração concluída: ${result.text.length} caracteres totais`);
      
      return result;
      
    } catch (err) {
      console.error('❌ Erro na extração do PDF:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido na extração');
      return null;
    } finally {
      setIsExtracting(false);
    }
  }, []);

  const extractMultiplePDFs = useCallback(async (files: File[]): Promise<ExtractedPDFData[]> => {
    const results: ExtractedPDFData[] = [];
    
    for (const file of files) {
      const extracted = await extractTextFromPDF(file);
      if (extracted) {
        results.push(extracted);
      }
    }
    
    return results;
  }, [extractTextFromPDF]);

  return {
    extractTextFromPDF,
    extractMultiplePDFs,
    isExtracting,
    error
  };
};