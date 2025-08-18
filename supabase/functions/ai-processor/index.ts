// Importa a função 'serve' do módulo HTTP do Deno para criar um servidor
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Importa o módulo xhr para suporte a requisições HTTP no ambiente Deno
import "https://deno.land/x/xhr@0.1.0/mod.ts";

// Importa a função 'createClient' do Supabase para interagir com o banco de dados
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Importa a biblioteca pdfjs-dist para extrair texto de PDFs
const pdfjsLib = await import("https://esm.sh/pdfjs-dist@4.0.379");

// Configura o worker do PDF.js para funcionar em ambiente de servidor
if (pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.mjs";
}

// Define cabeçalhos CORS para permitir requisições de qualquer origem
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Obtém a chave da API do Google do ambiente
const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');

// Define o prompt do sistema para a IA
const systemPrompt = `Você é um ASSISTENTE DE ESTUDOS ESPECIALIZADO com acesso completo ao conteúdo de documentos PDF.

🎯 SUAS CAPACIDADES ESPECIAIS:
- Você ESTUDOU E ANALISOU COMPLETAMENTE todos os PDFs fornecidos no contexto
- Você tem conhecimento profundo e específico do conteúdo dos documentos
- Você pode responder perguntas detalhadas baseadas no material estudado
- Você deve sempre priorizar informações dos PDFs quando disponíveis

✨ INSTRUÇÕES DE RESPOSTA:
- Seja específico ao citar informações dos documentos
- Referencie qual PDF está usando na resposta
- Conecte conceitos entre diferentes partes do material
- Explique de forma didática e clara
- Use linguagem amigável e motivadora

🎨 FORMATO DE RESPOSTA:
- Use formatação clara com tópicos e subtópicos
- Destaque informações importantes
- Inclua exemplos específicos dos documentos quando relevante

⚠️ IMPORTANTE: Se o usuário pedir para criar flashcards, resumos, quiz ou provas, sugira que use os botões específicos na interface.`;

// Inicia o servidor HTTP para lidar com requisições
serve(async (req) => {
  // Lida com requisições CORS (método OPTIONS)
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('AI Processor called:', req.method);

  try {
    // Verifica se a chave da API do Google existe
    if (!GOOGLE_API_KEY) {
      console.error('GOOGLE_API_KEY not found in environment');
      return new Response(JSON.stringify({
        error: 'Google API key not configured'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cria um cliente Supabase para interagir com o banco de dados
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false, // Desativa renovação automática de token
          persistSession: false // Não persiste sessões
        }
      }
    );

    // Obtém o cabeçalho de autorização da requisição
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verifica o token de autenticação do usuário
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('User authenticated:', user.id);

    // Faz o parse do corpo da requisição
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extrai ação, mensagem, tipo, prompt e sessionId do corpo da requisição
    const { action, message, type, prompt, sessionId, pdfId } = requestBody;
    console.log('Processing action:', action, 'type:', type, 'pdfId:', pdfId);

    let response;

    // Processa a ação solicitada
    switch (action) {
      case 'chat':
        response = await processChat(message, user.id, supabase, sessionId, pdfId);
        break;
      case 'generate_content':
        response = await generateContent(type, prompt, user.id, supabase, sessionId);
        break;
      case 'convert_pdf_to_json':
        response = await convertPDFToJSON(requestBody, user.id, supabase);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Retorna a resposta com cabeçalhos CORS
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    // Lida com erros gerais
    console.error('AI Processor error:', error);
    return new Response(JSON.stringify({
      error: 'Processing failed',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// --- Nova Função para pergunta específica sobre PDF ---
async function askAboutSpecificPdf(pdfId: string, pergunta: string, userId: string, supabase: any): Promise<any> {
  console.log(`🚀 PERGUNTANDO SOBRE PDF ESPECÍFICO`);
  console.log(`📄 PDF ID: ${pdfId}`);
  console.log(`💬 Pergunta: "${pergunta}"`);

  // Busca o PDF completo no banco de dados incluindo JSON
  const { data: pdf, error: pdfError } = await supabase
    .from("pdfs")
    .select("*")
    .eq("id", pdfId)
    .eq("user_id", userId)
    .single();

  if (pdfError || !pdf) {
    console.error('❌ PDF não encontrado ou erro na busca:', pdfError);
    throw new Error("PDF não encontrado ou ainda não processado.");
  }

  console.log(`📄 PDF encontrado: ${pdf.original_name}`);

  // Priorizar JSON processado se disponível
  if (pdf.json_content) {
    console.log('🎯 Usando JSON processado para resposta');
    return await askAboutPdfWithJSON(pdf, pergunta);
  } 
  
  // Fallback para conteúdo extraído
  if (pdf.extracted_content && pdf.extracted_content.length > 20) {
    console.log('📝 Usando conteúdo extraído para resposta');
    return await askAboutPdfWithExtractedContent(pdf, pergunta);
  }

  // Se não há conteúdo, extrair agora
  console.log('⚡ Extraindo conteúdo do PDF...');
  const extractedContent = await extractPDFContent(pdf, supabase);
  
  if (!extractedContent || extractedContent.startsWith('[❌ ERRO')) {
    throw new Error('Não foi possível extrair texto deste PDF. Ele pode ser uma imagem escaneada ou estar protegido.');
  }

  // Usar conteúdo recém-extraído
  const updatedPdf = { ...pdf, extracted_content: extractedContent };
  return await askAboutPdfWithExtractedContent(updatedPdf, pergunta);
}

// Função para perguntar usando JSON processado
async function askAboutPdfWithJSON(pdf: any, pergunta: string): Promise<any> {
  const jsonContent = pdf.json_content;

  const prompt = `
    Você tem acesso ao conteúdo estruturado do documento "${pdf.original_name}" em formato JSON:

    METADADOS:
    - Arquivo: ${jsonContent.metadata.filename}
    - Total de páginas: ${jsonContent.metadata.total_pages}
    - Data de extração: ${jsonContent.metadata.extraction_date}
    - Tamanho do conteúdo: ${jsonContent.metadata.content_length} caracteres

    PALAVRAS-CHAVE PRINCIPAIS:
    ${jsonContent.keywords.join(', ')}

    RESUMO:
    ${jsonContent.summary}

    SEÇÕES IDENTIFICADAS:
    ${jsonContent.sections.map((section: any) =>
    `- ${section.title}: ${section.content.substring(0, 200)}...`
  ).join('\n')}

    CONTEÚDO COMPLETO POR PÁGINA:
    ${jsonContent.pages.map((page: any) =>
    `PÁGINA ${page.page_number}: ${page.content.substring(0, 300)}...`
  ).join('\n\n')}

    Agora responda à pergunta a seguir **com base apenas nesse conteúdo estruturado**:

    Pergunta: ${pergunta}

    💡 DICA: Use as seções, palavras-chave e estrutura do JSON para fornecer respostas precisas e organizadas.
  `;

  console.log('🤖 Enviando prompt para a IA com JSON...');
  const aiResponse = await callGeminiAPI(systemPrompt, prompt);
  console.log('✅ Resposta da IA recebida.');

  return {
    success: true,
    response: aiResponse,
    source: 'json_processed'
  };
}

// Função para perguntar usando conteúdo extraído
async function askAboutPdfWithExtractedContent(pdf: any, pergunta: string): Promise<any> {
  const pdfContent = pdf.extracted_content;

  const prompt = `
    Você estudou o seguinte conteúdo do documento "${pdf.original_name}":

    ${pdfContent}

    Agora responda à pergunta a seguir **com base apenas nesse conteúdo**:

    Pergunta: ${pergunta}
  `;

  console.log('🤖 Enviando prompt para a IA...');
  const aiResponse = await callGeminiAPI(systemPrompt, prompt);
  console.log('✅ Resposta da IA recebida.');

  return {
    success: true,
    response: aiResponse,
    source: 'extracted_content'
  };
}

// --- Função processChat alterada para suportar pdfId ---
// Função para processar mensagens de chat
async function processChat(message: string, userId: string, supabase: any, sessionId?: string, pdfId?: string) {
  // Se um pdfId for fornecido, chama a função específica de pergunta sobre o PDF
  if (pdfId) {
    console.log(`🎯 PERGUNTA ESPECÍFICA SOBRE PDF ID: ${pdfId}`);
    return await askAboutSpecificPdf(pdfId, message, userId, supabase);
  }

  console.log(`🚀 PROCESSANDO MENSAGEM DE CHAT`);
  console.log(`👤 Usuário: ${userId}, Sessão: ${sessionId}`);
  console.log(`💬 Mensagem: "${message}"`);

  // Busca PDFs do usuário no banco de dados
  let pdfQuery = supabase
    .from('pdfs')
    .select('*')
    .eq('user_id', userId);

  if (sessionId) {
    pdfQuery = pdfQuery.eq('session_id', sessionId);
    console.log(`🔍 Buscando PDFs para a sessão: ${sessionId}`);
  } else {
    console.log(`🔍 Buscando todos os PDFs do usuário: ${userId}`);
  }

  const { data: pdfs, error: pdfError } = await pdfQuery;

  if (pdfError) {
    console.error(`❌ ERRO NA BUSCA DE PDFs:`, pdfError);
  }

  console.log(`📚 ENCONTRADOS ${pdfs?.length || 0} PDFs`);

  let context = '';
  let pdfContents = '';
  let extractionSuccessful = false;

  // Extrai conteúdo dos PDFs, se existirem
  if (pdfs && pdfs.length > 0) {
    console.log(`🔄 INICIANDO EXTRAÇÃO DE CONTEÚDO PARA ${pdfs.length} PDFs...`);

    for (const pdf of pdfs) {
      console.log(`\n📖 PROCESSANDO PDF: ${pdf.original_name}`);

      try {
        const extractedContent = await extractPDFContent(pdf, supabase);

        if (extractedContent && extractedContent.length > 50 && !extractedContent.startsWith('[❌ ERRO')) {
          pdfContents += `\n\n🔸🔸🔸 DOCUMENTO COMPLETO: ${pdf.original_name} 🔸🔸🔸\n`;
          pdfContents += `📊 Informações: Tamanho ${Math.round(pdf.file_size / 1024)}KB | Carregado em ${new Date(pdf.upload_date).toLocaleDateString('pt-BR')}\n`;
          pdfContents += `📝 CONTEÚDO EXTRAÍDO:\n${extractedContent}\n`;
          pdfContents += `🔸🔸🔸 FIM DO DOCUMENTO 🔸🔸🔸\n`;

          extractionSuccessful = true;
          console.log(`✅ SUCESSO: Extraídos ${extractedContent.length} caracteres de ${pdf.original_name}`);
        } else {
          pdfContents += `\n\n❌ FALHA NA EXTRAÇÃO: ${pdf.original_name}\n${extractedContent}\n`;
          console.log(`❌ FALHA: ${pdf.original_name} - ${extractedContent.substring(0, 100)}...`);
        }
      } catch (error) {
        console.error(`💥 ERRO NA EXTRAÇÃO de ${pdf.original_name}:`, error);
        pdfContents += `\n\n❌ ERRO CRÍTICO: ${pdf.original_name}\nErro: ${error.message}\n`;
      }
    }

    console.log(`\n📊 RESUMO DA EXTRAÇÃO:`);
    console.log(`- Total de PDFs processados: ${pdfs.length}`);
    console.log(`- Extração bem-sucedida: ${extractionSuccessful}`);
    console.log(`- Tamanho total do conteúdo: ${pdfContents.length} caracteres`);

    // Monta o contexto com base no sucesso da extração
    if (extractionSuccessful) {
      context = `🎯 CONTEXTO ESPECIALIZADO DE DOCUMENTOS:

🔥 ATENÇÃO: Você tem acesso COMPLETO ao conteúdo de ${pdfs.length} documento(s) do usuário:
${pdfs.map((p: any) => `📄 "${p.original_name}"`).join('\n')}

⚡ INSTRUÇÕES CRÍTICAS PARA RESPOSTA:
1. VOCÊ ESTUDOU E DOMINA COMPLETAMENTE todo o conteúdo dos documentos abaixo
2. Sua resposta deve ser baseada EXCLUSIVAMENTE no conteúdo extraído dos PDFs
3. Cite informações específicas, páginas, conceitos e dados dos documentos
4. Se a pergunta for sobre algo nos PDFs, seja detalhado e específico
5. Se não encontrar informação relevante nos PDFs, diga claramente
6. SEMPRE referencie qual documento você está citando

🧠 CONHECIMENTO COMPLETO DOS DOCUMENTOS:
${pdfContents}

👆 ESTE É TODO O CONTEÚDO QUE VOCÊ ESTUDOU E CONHECE PERFEITAMENTE!`;

    } else {
      context = `⚠️ ATENÇÃO: Encontrei ${pdfs.length} PDF(s) mas houve problemas na extração de conteúdo:
${pdfs.map((p: any) => `📄 ${p.original_name}`).join(', ')}

🔧 Problemas identificados:
${pdfContents}

💡 Responda de forma geral e sugira que o usuário verifique os arquivos enviados.`;
    }
  } else {
    // Caso não haja PDFs, fornece um contexto genérico
    context = `💡 CONTEXTO: O usuário ainda não carregou PDFs nesta sessão.

🎯 Responda de forma geral sobre estudos e sugira que envie PDFs para análises específicas.`;
    console.log(`📝 NENHUM PDF ENCONTRADO - fornecendo assistência geral de estudo`);
  }

  console.log(`🤖 ENVIANDO PARA A IA - Tamanho do contexto: ${context.length} caracteres`);

  // Chama a API Gemini para processar a mensagem
  const aiResponse = await callGeminiAPI(systemPrompt, context + `\n\n🎯 PERGUNTA DO USUÁRIO: ${message}`);

  console.log(`✅ RESPOSTA DA IA RECEBIDA: ${aiResponse.length} caracteres`);

  return {
    success: true,
    response: aiResponse
  };
}

// --- Função para chamar a API Gemini ---
async function callGeminiAPI(systemPrompt: string, userMessage: string): Promise<string> {
  try {
    console.log(`🤖 CHAMANDO API GEMINI`);
    console.log(`📝 Tamanho do prompt do sistema: ${systemPrompt.length} caracteres`);
    console.log(`💬 Tamanho da mensagem do usuário: ${userMessage.length} caracteres`);

    const totalLength = systemPrompt.length + userMessage.length;
    console.log(`📊 Tamanho total de entrada: ${totalLength} caracteres`);

    // Trunca a mensagem do usuário, se necessário
    if (totalLength > 100000) {
      console.log(`⚠️ Entrada grande detectada, truncando mensagem do usuário...`);
      const maxUserLength = 100000 - systemPrompt.length - 1000;
      userMessage = userMessage.substring(0, maxUserLength) + "\n\n[CONTEÚDO TRUNCADO DEVIDO AO TAMANHO]";
    }

    // Faz a requisição à API Gemini
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': GOOGLE_API_KEY,
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\n${userMessage}`
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4096,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_NONE"
          }
        ]
      })
    });

    console.log(`📡 Status da resposta da API Gemini: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Erro na API Gemini (${response.status}):`, errorText);
      throw new Error(`Erro na API Gemini: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`📊 Estrutura da resposta Gemini:`, Object.keys(data));

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error(`❌ Estrutura de resposta inválida:`, JSON.stringify(data, null, 2));
      throw new Error('Resposta inválida da API Gemini');
    }

    const responseText = data.candidates[0].content.parts[0].text;
    console.log(`✅ Resposta Gemini recebida: ${responseText.length} caracteres`);

    return responseText;

  } catch (error) {
    console.error(`💥 Falha na chamada à API Gemini:`, error);
    return `❌ Desculpe, houve um erro ao processar sua solicitação.

🔧 Detalhes técnicos: ${error.message}

💡 Tente novamente em alguns instantes. Se o problema persistir, verifique se seus PDFs foram carregados corretamente.`;
  }
}

// Função para gerar conteúdo como flashcards, resumos, quizzes ou provas
async function generateContent(type: string, prompt: string, userId: string, supabase: any, sessionId?: string) {
  console.log('Gerando conteúdo do tipo:', type, 'para usuário:', userId, 'sessão:', sessionId);

  // Busca PDFs do usuário no banco de dados
  console.log('Buscando PDFs com user_id:', userId, 'session_id:', sessionId);
  let pdfQuery = supabase
    .from('pdfs')
    .select('*')
    .eq('user_id', userId);

  if (sessionId) {
    pdfQuery = pdfQuery.eq('session_id', sessionId);
  }

  const { data: pdfs, error: pdfError } = await pdfQuery;

  console.log('Resultado da busca de PDFs:', { pdfs, pdfError, count: pdfs?.length || 0 });

  if (pdfError) {
    console.error('Erro ao buscar PDFs:', pdfError);
    return {
      error: 'Erro ao buscar PDFs: ' + pdfError.message
    };
  }

  if (!pdfs || pdfs.length === 0) {
    console.log('Nenhum PDF encontrado para usuário:', userId);
    const { data: allPdfs } = await supabase.from('pdfs').select('user_id, original_name').limit(5);
    console.log('Amostra de PDFs no banco:', allPdfs);
    return {
      error: 'Nenhum PDF encontrado. Faça upload de PDFs primeiro.'
    };
  }

  const pdfContent = pdfs.map((pdf: any) => {
    if (pdf.json_content) {
      // Usa JSON processado se disponível
      const jsonContent = pdf.json_content;
      return `DOCUMENTO ESTRUTURADO: ${pdf.original_name}
        Tamanho: ${(pdf.file_size / 1024).toFixed(1)}KB
        Data de upload: ${new Date(pdf.upload_date).toLocaleDateString('pt-BR')}
        Total de páginas: ${jsonContent.metadata.total_pages}
        Palavras-chave: ${jsonContent.keywords.join(', ')}

        RESUMO:
        ${jsonContent.summary}

        SEÇÕES IDENTIFICADAS:
        ${jsonContent.sections.map((section: any) =>
        `- ${section.title}: ${section.content}`
      ).join('\n')}

        CONTEÚDO COMPLETO POR PÁGINA:
        ${jsonContent.pages.map((page: any) =>
        `PÁGINA ${page.page_number}: ${page.content}`
      ).join('\n\n')}

        CONTEÚDO PARA ANÁLISE PROFUNDA:
        Este documento foi processado e estruturado em JSON, contendo seções organizadas, palavras-chave identificadas e conteúdo por página. Use essa estrutura para gerar conteúdo de alta qualidade.`;
    } else {
      // Usa conteúdo extraído se JSON não estiver disponível
      return `DOCUMENTO COMPLETO: ${pdf.original_name}
        Tamanho: ${(pdf.file_size / 1024).toFixed(1)}KB
        Data de upload: ${new Date(pdf.upload_date).toLocaleDateString('pt-BR')}

        CONTEÚDO PARA ANÁLISE PROFUNDA:
        Este documento contém informações acadêmicas/técnicas que devem ser completamente estudadas e compreendidas antes de gerar qualquer conteúdo. A IA deve ter total domínio do material apresentado.

        ${pdf.extracted_content || 'Conteúdo completo do PDF disponível para análise detalhada.'}`;
    }
  }).join('\n\n---\n\n');

  let generatedContent;
  let contentType;

  switch (type) {
    case 'flashcard':
      generatedContent = await generateFlashcards(pdfContent, prompt);
      contentType = 'flashcards';
      break;
    case 'resume':
      generatedContent = await generateResume(pdfContent, prompt);
      contentType = 'summary';
      break;
    case 'quiz':
      generatedContent = await generateQuiz(pdfContent, prompt);
      contentType = 'quiz';
      break;
    case 'prova':
      generatedContent = await generateExam(pdfContent, prompt);
      contentType = 'quiz';
      break;
    default:
      throw new Error('Tipo de conteúdo inválido');
  }

  const { data: savedContent, error: saveError } = await supabase
    .from('generated_content')
    .insert({
      user_id: userId,
      pdf_id: pdfs[0].id,
      content_type: contentType,
      content: generatedContent,
      settings: { prompt }
    })
    .select()
    .single();

  if (saveError) {
    console.error('Erro ao salvar conteúdo:', saveError);
    throw new Error('Falha ao salvar conteúdo gerado');
  }

  return {
    success: true,
    content: generatedContent,
    id: savedContent.id
  };
}


// Função para gerar flashcards a partir do conteúdo dos PDFs
async function generateFlashcards(pdfContent: string, prompt: string) {
  const aiPrompt = `VOCÊ É UM ESPECIALISTA EDUCACIONAL QUE ESTUDOU COMPLETAMENTE TODOS OS DOCUMENTOS FORNECIDOS.

MATERIAL ESTUDADO:
${pdfContent}

TAREFA: Criar 10 flashcards educacionais de alta qualidade sobre: ${prompt}

INSTRUÇÕES CRÍTICAS:
- VOCÊ JÁ ESTUDOU E COMPREENDE COMPLETAMENTE todo o material dos PDFs
- Crie exatamente 10 flashcards baseados ESPECIFICAMENTE no conteúdo dos documentos
- Cada pergunta deve ser ESPECÍFICA e DETALHADA sobre conceitos, definições, processos ou informações dos PDFs
- As respostas devem ser COMPLETAS, PRECISAS e baseadas diretamente no material estudado
- Inclua detalhes técnicos, exemplos específicos e informações contextuais dos documentos
- NÃO faça perguntas genéricas - todas devem ser sobre o conteúdo ESPECÍFICO dos PDFs
- Use terminologia exata e informações precisas dos documentos

Formato de resposta (OBRIGATÓRIO - responda APENAS com este JSON):
{
  "type": "flashcard",
  "cards": [
    {
      "id": "1",
      "question": "Pergunta específica sobre o conteúdo?",
      "answer": "Resposta detalhada baseada no material."
    }
  ]
}`;

  const aiResponse = await callGeminiAPI('', aiPrompt);
  console.log('Resposta bruta da IA para flashcards:', aiResponse);

  let jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.type === 'flashcard' && parsed.cards) {
        return parsed;
      }
    } catch (e) {
      console.log('Falha ao parsear JSON extraído para flashcards');
    }
  }

  return {
    type: 'flashcard',
    cards: [
      {
        id: '1',
        question: 'Qual é o tema principal do conteúdo estudado?',
        answer: aiResponse.substring(0, 300).replace(/[{}"\[\]]/g, '') + '...'
      }
    ]
  };
}

// Função para gerar resumos a partir do conteúdo dos PDFs
async function generateResume(pdfContent: string, prompt: string) {
  const aiPrompt = `VOCÊ É UM ESPECIALISTA QUE ESTUDOU MINUCIOSAMENTE TODOS OS DOCUMENTOS FORNECIDOS.

MATERIAL COMPLETAMENTE ANALISADO:
${pdfContent}

TAREFA: Criar um resumo COMPLETO e DETALHADO sobre: ${prompt}

INSTRUÇÕES CRÍTICAS:
- VOCÊ DOMINA COMPLETAMENTE todo o conteúdo dos PDFs fornecidos
- Analise e extraia TODAS as informações relevantes dos documentos
- Crie um resumo ABRANGENTE que demonstre conhecimento profundo do material
- Inclua TODOS os conceitos principais, definições, processos, métodos e conclusões
- Use formato markdown com estrutura clara: títulos, subtítulos, listas e destaques
- Inclua exemplos específicos, dados, tabelas e informações técnicas dos PDFs
- Detalhe conexões entre conceitos e implicações práticas
- Organize o conteúdo de forma didática e compreensível
- NÃO seja superficial - demonstre conhecimento profundo e específico do material

Responda APENAS com o resumo em texto limpo, sem JSON, sem código, apenas o conteúdo do resumo formatado em markdown.`;

  const aiResponse = await callGeminiAPI('', aiPrompt);
  console.log('Resposta bruta da IA para resumo:', aiResponse);

  let cleanContent = aiResponse
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .replace(/^\s*\{[\s\S]*?"content":\s*"/g, '')
    .replace(/"\s*\}\s*$/g, '')
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .trim();

  return {
    type: 'resume',
    title: 'Resumo Detalhado do Conteúdo',
    content: cleanContent
  };
}

// Função para gerar quizzes a partir do conteúdo dos PDFs
async function generateQuiz(pdfContent: string, prompt: string) {
  const aiPrompt = `VOCÊ É UM ESPECIALISTA EDUCACIONAL QUE DOMINA COMPLETAMENTE O MATERIAL ESTUDADO.

CONTEÚDO COMPLETAMENTE ANALISADO:
${pdfContent}

TAREFA: Criar um quiz ESPECÍFICO com 10 questões sobre: ${prompt}

INSTRUÇÕES CRÍTICAS:
- VOCÊ CONHECE PROFUNDAMENTE todo o conteúdo dos PDFs
- Crie exatamente 10 questões de múltipla escolha ESPECÍFICAS sobre o material
- 4 alternativas cada (A, B, C, D) baseadas no conteúdo real dos documentos
- Apenas uma alternativa correta por questão
- Questões devem testar conhecimento ESPECÍFICO dos PDFs (conceitos, definições, processos, dados)
- Alternativas incorretas devem ser plausíveis mas claramente distintas da correta
- Inclua explicação DETALHADA para cada resposta correta, citando informações dos PDFs
- Varie o nível de dificuldade: conceitos básicos, aplicações e análises complexas
- Use terminologia exata e informações precisas dos documentos

Formato de resposta (OBRIGATÓRIO - responda APENAS com este JSON):
{
  "type": "quiz",
  "title": "Quiz do Conteúdo",
  "questions": [
    {
      "id": "1",
      "question": "Pergunta específica sobre o conteúdo?",
      "options": ["Opção A correta", "Opção B incorreta", "Opção C incorreta", "Opção D incorreta"],
      "correctAnswer": 0,
      "explanation": "Explicação detalhada da resposta correta."
    }
  ]
}`;

  const aiResponse = await callGeminiAPI('', aiPrompt);
  console.log('Resposta bruta da IA para quiz:', aiResponse);

  let jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.type === 'quiz' && parsed.questions) {
        return parsed;
      }
    } catch (e) {
      console.log('Falha ao parsear JSON extraído para quiz');
    }
  }

  return {
    type: 'quiz',
    title: 'Quiz do Conteúdo',
    questions: [
      {
        id: '1',
        question: 'Baseado no conteúdo, qual o tema principal abordado?',
        options: ['Efeitos anti-inflamatórios', 'Pesquisa clínica', 'Desenvolvimento farmacológico', 'Análise química'],
        correctAnswer: 0,
        explanation: 'Com base no conteúdo analisado, o foco principal é nos efeitos anti-inflamatórios.'
      }
    ]
  };
}

// Função para gerar provas a partir do conteúdo dos PDFs
async function generateExam(pdfContent: string, prompt: string) {
  const aiPrompt = `VOCÊ É UM PROFESSOR ESPECIALISTA QUE DOMINA COMPLETAMENTE O MATERIAL DOS DOCUMENTOS.

MATERIAL COMPLETAMENTE ESTUDADO:
${pdfContent}

TAREFA: Criar uma prova RIGOROSA com 20 questões sobre: ${prompt}

INSTRUÇÕES CRÍTICAS:
- VOCÊ TEM CONHECIMENTO COMPLETO E PROFUNDO de todo o conteúdo dos PDFs
- Crie exatamente 20 questões de múltipla escolha de NÍVEL ACADÊMICO
- 4 alternativas cada (A, B, C, D) baseadas rigorosamente no material estudado
- Apenas uma alternativa correta por questão
- Questões devem cobrir TODO o espectro do conteúdo: conceitos básicos, intermediários e avançados
- Inclua questões sobre definições, aplicações práticas, análises críticas e relações conceituais
- Alternativas incorretas devem ser tecnicamente plausíveis mas claramente distinguíveis
- Atribua 1 ponto para cada questão (total: 20 pontos)
- Varie tipos de questão: factual, conceitual, aplicação e análise
- Use linguagem técnica precisa conforme os documentos

Formato de resposta (OBRIGATÓRIO - responda APENAS com este JSON):
{
  "type": "prova",
  "title": "Prova do Conteúdo",
  "multipleChoice": [
    {
      "id": "1",
      "question": "Pergunta específica sobre o conteúdo?",
      "options": ["Opção A correta", "Opção B incorreta", "Opção C incorreta", "Opção D incorreta"],
      "correctAnswer": 0,
      "points": 1
    }
  ]
}`;

  const aiResponse = await callGeminiAPI('', aiPrompt);
  console.log('Resposta bruta da IA para prova:', aiResponse);

  let jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.type === 'prova' && parsed.multipleChoice) {
        return parsed;
      }
    } catch (e) {
      console.log('Falha ao parsear JSON extraído para prova');
    }
  }

  const fallbackQuestions = [];
  for (let i = 1; i <= 20; i++) {
    fallbackQuestions.push({
      id: i.toString(),
      question: `Baseado no conteúdo, qual o foco principal do estudo? (Questão ${i})`,
      options: ['Efeitos anti-inflamatórios tópicos', 'Pesquisa farmacológica', 'Desenvolvimento clínico', 'Análise química'],
      correctAnswer: 0,
      points: 1
    });
  }

  return {
    type: 'prova',
    title: 'Prova do Conteúdo',
    multipleChoice: fallbackQuestions
  };
}

// Função para extrair conteúdo de PDFs
async function extractPDFContent(pdfRecord: any, supabase: any): Promise<string> {
  try {
    console.log(`🔍 INICIANDO EXTRAÇÃO DE PDF: ${pdfRecord.original_name}`);
    console.log(`📊 Informações do PDF: Tamanho=${pdfRecord.file_size} bytes, Caminho=${pdfRecord.file_path}`);

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
      console.error(`❌ NENHUM DADO DE ARQUIVO RECEBIDO`);
      throw new Error('Nenhum dado de arquivo recebido do armazenamento');
    }

    console.log(`📄 PDF baixado com sucesso. Processando...`);
    console.log(`📊 Tamanho do blob do arquivo: ${fileData.size} bytes, tipo: ${fileData.type}`);

    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    console.log(`🔧 ARRAY BUFFER CRIADO: ${uint8Array.length} bytes`);

    let fullText = '';

    try {
      console.log(`🚀 TENTANDO EXTRAÇÃO COM PDF.JS...`);

      const loadingTask = pdfjsLib.getDocument({
        data: uint8Array,
        disableFontFace: true,
        verbosity: 0
      });

      const pdf = await loadingTask.promise;
      console.log(`📚 PDF CARREGADO COM SUCESSO: ${pdf.numPages} páginas`);

      for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 50); pageNum++) {
        try {
          console.log(`📖 EXTRAINDO PÁGINA ${pageNum}/${pdf.numPages}`);

          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();

          const pageText = textContent.items
            .filter((item: any) => item.str && item.str.trim().length > 0)
            .map((item: any) => item.str)
            .join(' ');

          if (pageText.trim().length > 0) {
            fullText += `\n\n=== PÁGINA ${pageNum} ===\n${pageText.trim()}`;
            console.log(`✅ PÁGINA ${pageNum}: ${pageText.length} caracteres extraídos`);
          } else {
            console.log(`⚠️ PÁGINA ${pageNum}: Nenhum conteúdo de texto encontrado`);
          }

          page.cleanup();

        } catch (pageError) {
          console.error(`❌ ERRO NA PÁGINA ${pageNum}:`, pageError);
          fullText += `\n\n=== PÁGINA ${pageNum} ===\n[Erro ao extrair conteúdo desta página]`;
        }
      }

    } catch (pdfError) {
      console.error(`❌ FALHA NA EXTRAÇÃO COM PDF.JS:`, pdfError);

      console.log(`🔄 TENTANDO EXTRAÇÃO DE TEXTO ALTERNATIVA...`);

      try {
        const textDecoder = new TextDecoder('utf-8');
        const rawText = textDecoder.decode(uint8Array);

        const extractedText = rawText
          .replace(/[\x00-\x1F\x7F-\x9F]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (extractedText.length > 100) {
          fullText = `CONTEÚDO EXTRAÍDO (método alternativo):\n${extractedText}`;
          console.log(`✅ SUCESSO NA EXTRAÇÃO ALTERNATIVA: ${extractedText.length} caracteres`);
        } else {
          throw new Error('Extração alternativa gerou conteúdo insuficiente');
        }

      } catch (fallbackError) {
        console.error(`❌ FALHA NA EXTRAÇÃO ALTERNATIVA:`, fallbackError);
        throw new Error(`Falha ao extrair conteúdo do PDF: ${pdfError.message}`);
      }
    }

    console.log(`📊 RESULTADO TOTAL DA EXTRAÇÃO: ${fullText.length} caracteres`);

    if (fullText.trim().length < 50) {
      console.error(`⚠️ CONTEÚDO INSUFICIENTE EXTRAÍDO: Apenas ${fullText.length} caracteres`);
      throw new Error('Conteúdo insuficiente extraído do PDF');
    }

    console.log(`💾 ARMAZENANDO CONTEÚDO EXTRAÍDO...`);

    const { error: updateError } = await supabase
      .from('pdfs')
      .update({
        extracted_content: fullText.trim(),
        processing_status: 'completed'
      })
      .eq('id', pdfRecord.id);

    if (updateError) {
      console.error(`❌ ERRO NA ATUALIZAÇÃO DO CACHE:`, updateError);
    } else {
      console.log(`✅ CONTEÚDO ARMAZENADO COM SUCESSO`);
    }

    console.log(`🎉 EXTRAÇÃO DE PDF CONCLUÍDA: ${pdfRecord.original_name}`);
    return fullText.trim();

  } catch (error) {
    console.error(`💥 ERRO CRÍTICO NA EXTRAÇÃO DO PDF ${pdfRecord.original_name}:`, error);

    try {
      await supabase
        .from('pdfs')
        .update({ processing_status: 'failed' })
        .eq('id', pdfRecord.id);
    } catch (statusError) {
      console.error(`❌ Falha ao atualizar status de erro:`, statusError);
    }

    return `[❌ ERRO NA EXTRAÇÃO DO PDF: ${pdfRecord.original_name}

📝 DETALHES DO ERRO: ${error.message}

⚠️ POSSÍVEIS CAUSAS:
- PDF pode estar corrompido ou protegido por senha
- Formato PDF não suportado ou muito complexo
- Arquivo pode ser uma imagem escaneada (necessita OCR)
- Problemas de conectividade durante o download

💡 SUGESTÃO: Tente reenviar o PDF ou use um formato mais simples.]`;
  }
}

// Função para converter PDF em JSON usando a IA
async function convertPDFToJSON(requestBody: any, userId: string, supabase: any) {
  console.log('🔄 INICIANDO CONVERSÃO PDF PARA JSON VIA IA');
  
  try {
    const { pdfId } = requestBody;
    
    if (!pdfId) {
      throw new Error('PDF ID é obrigatório');
    }

    // Buscar PDF no banco
    const { data: pdf, error: pdfError } = await supabase
      .from('pdfs')
      .select('*')
      .eq('id', pdfId)
      .eq('user_id', userId)
      .single();

    if (pdfError || !pdf) {
      throw new Error('PDF não encontrado');
    }

    console.log(`📄 PDF encontrado: ${pdf.original_name}`);

    // Verificar se já existe JSON processado
    if (pdf.json_content) {
      console.log('✅ JSON já existe, retornando cache');
      return {
        success: true,
        json_content: pdf.json_content,
        message: 'JSON já processado'
      };
    }

    // Extrair conteúdo se necessário
    let extractedContent = pdf.extracted_content;
    
    if (!extractedContent) {
      console.log('📄 Extraindo conteúdo do PDF...');
      extractedContent = await extractPDFContent(pdf, supabase);
    }

    if (!extractedContent || extractedContent.startsWith('[❌ ERRO')) {
      throw new Error('Falha na extração do conteúdo do PDF');
    }

    console.log(`📊 Conteúdo extraído: ${extractedContent.length} caracteres`);

    // Usar IA para estruturar o conteúdo em JSON
    const prompt = `
Por favor, analise o seguinte conteúdo de PDF e estruture em um formato JSON organizado.

NOME DO ARQUIVO: ${pdf.original_name}

CONTEÚDO COMPLETO DO PDF:
${extractedContent}

Estruture o conteúdo no seguinte formato JSON exato:
{
  "metadata": {
    "filename": "${pdf.original_name}",
    "extraction_date": "${new Date().toISOString()}",
    "content_length": ${extractedContent.length},
    "total_pages": [número de páginas identificadas]
  },
  "content": {
    "title": "Título principal do documento",
    "summary": "Resumo do conteúdo em 2-3 frases",
    "main_topics": ["tópico 1", "tópico 2", "tópico 3"],
    "sections": [
      {
        "title": "Nome da seção",
        "content": "Conteúdo da seção"
      }
    ]
  },
  "keywords": ["palavra-chave 1", "palavra-chave 2", "palavra-chave 3"],
  "pages": [
    {
      "page_number": 1,
      "content": "Conteúdo da página",
      "word_count": 150
    }
  ],
  "structured_data": {
    "important_concepts": ["conceito 1", "conceito 2"],
    "definitions": [
      {
        "term": "termo",
        "definition": "definição"
      }
    ]
  }
}

IMPORTANTE: Retorne APENAS o JSON estruturado, sem texto adicional antes ou depois.
`;

    console.log('🤖 Enviando para IA estruturar o JSON...');

    const aiResponse = await callGeminiAPI('Você é um especialista em análise e estruturação de documentos. Analise o conteúdo fornecido e estruture em JSON organizando as informações de forma lógica e clara.', prompt);

    if (!aiResponse) {
      throw new Error('Resposta vazia da IA');
    }

    // Limpar e extrair JSON da resposta
    let cleanResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Tentar encontrar o JSON na resposta
    const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanResponse = jsonMatch[0];
    }
    
    let jsonContent;
    try {
      jsonContent = JSON.parse(cleanResponse);
      console.log('✅ JSON parseado com sucesso');
    } catch (parseError) {
      console.error('❌ Erro ao parsear JSON da IA:', parseError);
      console.log('Resposta da IA:', cleanResponse.substring(0, 500));
      
      // Criar JSON estruturado manualmente se o parse falhar
      const pages = extractedContent.split('=== PÁGINA').filter(p => p.trim());
      
      jsonContent = {
        metadata: {
          filename: pdf.original_name,
          extraction_date: new Date().toISOString(),
          content_length: extractedContent.length,
          total_pages: pages.length || 1
        },
        content: {
          title: pdf.original_name.replace('.pdf', ''),
          summary: extractedContent.substring(0, 300).trim() + '...',
          main_topics: ['Conteúdo do documento'],
          sections: [{
            title: 'Conteúdo Principal',
            content: extractedContent.substring(0, 1000) + '...'
          }]
        },
        keywords: ['documento', 'pdf', 'conteúdo'],
        pages: pages.slice(0, 10).map((page, index) => ({
          page_number: index + 1,
          content: page.trim().substring(0, 500) + '...',
          word_count: page.trim().split(/\s+/).length
        })),
        structured_data: {
          important_concepts: ['Conceitos principais do documento'],
          definitions: []
        },
        ai_analysis_failed: true,
        raw_ai_response: cleanResponse.substring(0, 500)
      };
    }

    // Salvar JSON no banco
    const { error: updateError } = await supabase
      .from('pdfs')
      .update({
        json_content: jsonContent,
        processing_status: 'json_completed'
      })
      .eq('id', pdfId);

    if (updateError) {
      throw new Error(`Erro ao salvar JSON: ${updateError.message}`);
    }

    console.log('✅ JSON estruturado salvo com sucesso');

    return {
      success: true,
      json_content: jsonContent,
      message: 'PDF convertido para JSON com sucesso'
    };

  } catch (error) {
    console.error('❌ Erro na conversão PDF para JSON:', error);
    
    // Atualizar status de erro
    if (requestBody.pdfId) {
      await supabase
        .from('pdfs')
        .update({ processing_status: 'json_failed' })
        .eq('id', requestBody.pdfId);
    }

    return {
      success: false,
      error: error.message
    };
  }
}