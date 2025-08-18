import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Importa a biblioteca pdfjs-dist para extrair texto de PDFs
const pdfjsLib = await import("https://esm.sh/pdfjs-dist@4.0.379");

// Configura o worker do PDF.js para funcionar em ambiente de servidor
if (pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.mjs";
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('PDF to JSON converter called:', req.method);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('User authenticated:', user.id);

    let requestBody;
    try {
      requestBody = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { pdfId, action } = requestBody;
    console.log('Processing action:', action, 'pdfId:', pdfId);

    if (action === 'convert_to_json') {
      const result = await convertPDFToJSON(pdfId, user.id, supabase);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('PDF to JSON converter error:', error);
    return new Response(JSON.stringify({
      error: 'Processing failed',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function convertPDFToJSON(pdfId: string, userId: string, supabase: any) {
  console.log(`🔄 INICIANDO CONVERSÃO PDF PARA JSON`);
  console.log(`📄 PDF ID: ${pdfId}`);
  console.log(`👤 Usuário: ${userId}`);

  try {
    // Busca o PDF no banco de dados
    const { data: pdf, error: pdfError } = await supabase
      .from("pdfs")
      .select("*")
      .eq("id", pdfId)
      .eq("user_id", userId)
      .single();

    if (pdfError || !pdf) {
      console.error('❌ PDF não encontrado:', pdfError);
      throw new Error("PDF não encontrado ou não autorizado.");
    }

    console.log(`📖 PDF encontrado: ${pdf.original_name}`);

    // Verifica se já existe conteúdo JSON processado
    if (pdf.json_content) {
      console.log(`✅ USANDO JSON EM CACHE`);
      return {
        success: true,
        json_content: pdf.json_content,
        message: "JSON já processado anteriormente"
      };
    }

    // Extrai o conteúdo do PDF
    const extractedContent = await extractPDFContent(pdf, supabase);

    if (!extractedContent || extractedContent.startsWith('[❌ ERRO')) {
      throw new Error("Falha na extração do conteúdo do PDF");
    }

    // Converte o conteúdo em JSON estruturado
    const jsonContent = await structureContentAsJSON(extractedContent, pdf.original_name);

    // Salva o JSON no banco de dados
    const { error: updateError } = await supabase
      .from('pdfs')
      .update({
        json_content: jsonContent,
        processing_status: 'json_completed'
      })
      .eq('id', pdfId);

    if (updateError) {
      console.error('❌ Erro ao salvar JSON:', updateError);
      throw new Error('Falha ao salvar JSON processado');
    }

    console.log(`✅ JSON PROCESSADO E SALVO COM SUCESSO`);

    return {
      success: true,
      json_content: jsonContent,
      message: "PDF convertido para JSON com sucesso"
    };

  } catch (error) {
    console.error(`💥 ERRO NA CONVERSÃO PARA JSON:`, error);

    // Atualiza status de erro
    try {
      await supabase
        .from('pdfs')
        .update({ processing_status: 'json_failed' })
        .eq('id', pdfId);
    } catch (statusError) {
      console.error(`❌ Falha ao atualizar status de erro:`, statusError);
    }

    return {
      success: false,
      error: error.message
    };
  }
}

async function extractPDFContent(pdfRecord: any, supabase: any): Promise<string> {
  try {
    console.log(`🔍 EXTRAINDO CONTEÚDO DO PDF: ${pdfRecord.original_name}`);

    // Verifica se já existe conteúdo extraído
    if (pdfRecord.extracted_content && pdfRecord.extracted_content.trim().length > 100) {
      console.log(`✅ USANDO CONTEÚDO EM CACHE: ${pdfRecord.extracted_content.length} caracteres`);
      return pdfRecord.extracted_content;
    }

    console.log(`⬇️ BAIXANDO PDF do armazenamento...`);

    const { data: fileData, error: downloadError } = await supabase.storage
      .from('pdfs')
      .download(pdfRecord.file_path);

    if (downloadError) {
      console.error(`❌ ERRO NO DOWNLOAD:`, downloadError);
      throw new Error(`Falha ao baixar PDF: ${downloadError.message}`);
    }

    if (!fileData) {
      throw new Error('Nenhum dado de arquivo recebido do armazenamento');
    }

    console.log(`📄 PDF baixado com sucesso. Processando...`);

    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    console.log(`🔧 ARRAY BUFFER CRIADO: ${uint8Array.length} bytes`);

    let texto_total = '';
    try {
      const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
      const pdf = await loadingTask.promise;
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        // Extrai apenas o texto, ignora imagens
        const texto = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        texto_total += texto + '\n';
      }
    } catch (pdfError) {
      console.error(`❌ FALHA NA EXTRAÇÃO COM PDF.JS:`, pdfError);
      throw new Error(`Falha ao extrair conteúdo do PDF: ${pdfError.message}`);
    }

    // Converter para Markdown
    const markdownContent = convertTextToMarkdown(texto_total);

    // Salvar no banco
    const { error: updateError } = await supabase
      .from('pdfs')
      .update({
        extracted_content: texto_total.trim(),
        markdown_content: markdownContent,
        processing_status: 'completed'
      })
      .eq('id', pdfRecord.id);

    if (updateError) {
      console.error(`❌ ERRO NA ATUALIZAÇÃO DO CACHE:`, updateError);
    }

    return texto_total.trim();

  } catch (error) {
    console.error(`💥 ERRO CRÍTICO NA EXTRAÇÃO DO PDF ${pdfRecord.original_name}:`, error);
    throw error;
  }
}

// Função para converter texto extraído em Markdown simples
function convertTextToMarkdown(text: string): string {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      if (/^([A-Z][A-Z\s]{3,})$/.test(line)) return `# ${line}`; // Títulos em caixa alta
      if (/^\d+\./.test(line)) return `- ${line}`; // Listas numeradas
      return line;
    })
    .join('\n\n');
}

async function structureContentAsJSON(content: string, filename: string) {
  console.log(`🔄 ESTRUTURANDO CONTEÚDO COMO JSON`);
  console.log(`📄 Arquivo: ${filename}`);
  console.log(`📊 Tamanho do conteúdo: ${content.length} caracteres`);

  // Divide o conteúdo em páginas
  const pages = content.split('=== PÁGINA').filter(page => page.trim().length > 0);

  const structuredContent = {
    metadata: {
      filename: filename,
      total_pages: pages.length,
      extraction_date: new Date().toISOString(),
      content_length: content.length
    },
    pages: [] as any[],
    sections: [] as any[],
    keywords: [] as string[],
    summary: ""
  };

  // Processa cada página
  pages.forEach((pageContent, index) => {
    const pageMatch = pageContent.match(/^(\d+)\s*===\s*\n(.*)/s);
    if (pageMatch) {
      const pageNumber = parseInt(pageMatch[1]);
      const pageText = pageMatch[2].trim();

      structuredContent.pages.push({
        page_number: pageNumber,
        content: pageText,
        word_count: pageText.split(/\s+/).length,
        character_count: pageText.length
      });
    }
  });

  // Identifica seções baseadas em padrões comuns
  const sectionPatterns = [
    /^(CAPÍTULO|CHAPTER|SEÇÃO|SECTION)\s*[0-9]*\s*[:\.]?\s*(.+)$/im,
    /^(\d+\.\s*)(.+)$/m,
    /^([A-Z][A-Z\s]{3,}):/m
  ];

  const allText = content.replace(/=== PÁGINA \d+ ===\n/g, '\n');
  const lines = allText.split('\n');

  let currentSection = null;
  let sectionContent = [];

  lines.forEach((line, index) => {
    let isSectionHeader = false;

    for (const pattern of sectionPatterns) {
      const match = line.match(pattern);
      if (match) {
        // Salva seção anterior se existir
        if (currentSection && sectionContent.length > 0) {
          structuredContent.sections.push({
            title: currentSection,
            content: sectionContent.join('\n').trim(),
            start_line: index - sectionContent.length,
            end_line: index - 1
          });
        }

        currentSection = match[2] || match[1];
        sectionContent = [];
        isSectionHeader = true;
        break;
      }
    }

    if (!isSectionHeader) {
      sectionContent.push(line);
    }
  });

  // Adiciona última seção
  if (currentSection && sectionContent.length > 0) {
    structuredContent.sections.push({
      title: currentSection,
      content: sectionContent.join('\n').trim(),
      start_line: lines.length - sectionContent.length,
      end_line: lines.length - 1
    });
  }

  // Extrai palavras-chave (palavras que aparecem frequentemente)
  const words = allText.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3);

  const wordCount = {};
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });

  // Pega as 20 palavras mais frequentes
  const sortedWords = Object.entries(wordCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([word]) => word);

  structuredContent.keywords = sortedWords;

  // Gera um resumo simples (primeiras 500 caracteres)
  const cleanText = allText.replace(/\s+/g, ' ').trim();
  structuredContent.summary = cleanText.substring(0, 500) + (cleanText.length > 500 ? '...' : '');

  console.log(`✅ JSON ESTRUTURADO CRIADO:`);
  console.log(`- Páginas: ${structuredContent.pages.length}`);
  console.log(`- Seções: ${structuredContent.sections.length}`);
  console.log(`- Palavras-chave: ${structuredContent.keywords.length}`);
  console.log(`- Tamanho do JSON: ${JSON.stringify(structuredContent).length} caracteres`);

  return structuredContent;
} 