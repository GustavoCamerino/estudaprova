// Importa a função 'serve' do módulo HTTP do Deno para criar um servidor
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Importa a função 'createClient' do Supabase para interagir com o banco de dados
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Define cabeçalhos CORS para permitir requisições de qualquer origem
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Inicia o servidor HTTP para lidar com requisições
serve(async (req) => {
  // Lida com requisições CORS (método OPTIONS)
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Cria um cliente Supabase para interagir com o banco de dados
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '', // Obtém a URL do Supabase do ambiente
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Obtém a chave de serviço do Supabase
      {
        auth: {
          autoRefreshToken: false, // Desativa renovação automática de token
          persistSession: false // Não persiste sessões
        }
      }
    );

    console.log('Executando função de limpeza...');

    // Chama a função remota 'cleanup_old_data' no Supabase
    const { error } = await supabase.rpc('cleanup_old_data');

    // Verifica se houve erro na execução da função de limpeza
    if (error) {
      console.error('Erro na limpeza:', error);
      throw error; // Lança o erro para ser tratado no bloco catch
    }

    console.log('Limpeza concluída com sucesso');

    // Retorna uma resposta de sucesso com timestamp
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Limpeza concluída',
      timestamp: new Date().toISOString() // Inclui o timestamp atual em formato ISO
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Define cabeçalhos CORS e tipo de conteúdo
    });

  } catch (error) {
    // Lida com erros gerais
    console.error('Erro no agendador de limpeza:', error);
    return new Response(JSON.stringify({ 
      error: 'Falha na limpeza',
      details: error.message // Inclui detalhes do erro na resposta
    }), {
      status: 500, // Define status HTTP 500 para erro interno
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});