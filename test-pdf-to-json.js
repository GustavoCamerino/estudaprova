// Script de teste para a funcionalidade PDF para JSON
// Execute com: node test-pdf-to-json.js

const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase (substitua pelas suas credenciais)
const supabaseUrl = 'https://mooddxbxvgnwpjoqrqmm.supabase.co';
const supabaseKey = 'sua_service_role_key_aqui';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPDFToJSON() {
    console.log('🧪 TESTANDO FUNCIONALIDADE PDF PARA JSON');
    console.log('==========================================');

    try {
        // 1. Teste de conexão
        console.log('\n1️⃣ Testando conexão com Supabase...');
        const { data: testData, error: testError } = await supabase
            .from('pdfs')
            .select('count')
            .limit(1);

        if (testError) {
            throw new Error(`Erro de conexão: ${testError.message}`);
        }
        console.log('✅ Conexão estabelecida com sucesso');

        // 2. Listar PDFs existentes
        console.log('\n2️⃣ Listando PDFs existentes...');
        const { data: pdfs, error: pdfError } = await supabase
            .from('pdfs')
            .select('*')
            .limit(5);

        if (pdfError) {
            throw new Error(`Erro ao buscar PDFs: ${pdfError.message}`);
        }

        console.log(`📚 Encontrados ${pdfs.length} PDFs:`);
        pdfs.forEach((pdf, index) => {
            console.log(`   ${index + 1}. ${pdf.original_name} (${pdf.processing_status})`);
            if (pdf.json_content) {
                console.log(`      ✅ JSON processado disponível`);
            } else {
                console.log(`      ⏳ JSON não processado`);
            }
        });

        // 3. Testar conversão de um PDF (se existir)
        if (pdfs.length > 0) {
            const testPDF = pdfs[0];
            console.log(`\n3️⃣ Testando conversão do PDF: ${testPDF.original_name}`);

            if (!testPDF.json_content) {
                console.log('🔄 Iniciando conversão para JSON...');

                // Simular chamada da Edge Function
                const { data: conversionResult, error: conversionError } = await supabase.functions.invoke('pdf-to-json', {
                    body: {
                        action: 'convert_to_json',
                        pdfId: testPDF.id
                    }
                });

                if (conversionError) {
                    console.log(`❌ Erro na conversão: ${conversionError.message}`);
                } else if (conversionResult.success) {
                    console.log('✅ Conversão realizada com sucesso!');
                    console.log(`📊 Tamanho do JSON: ${JSON.stringify(conversionResult.json_content).length} caracteres`);

                    // Verificar estrutura do JSON
                    const jsonContent = conversionResult.json_content;
                    console.log('📋 Estrutura do JSON:');
                    console.log(`   - Metadados: ${jsonContent.metadata ? '✅' : '❌'}`);
                    console.log(`   - Páginas: ${jsonContent.pages ? jsonContent.pages.length : 0} páginas`);
                    console.log(`   - Seções: ${jsonContent.sections ? jsonContent.sections.length : 0} seções`);
                    console.log(`   - Palavras-chave: ${jsonContent.keywords ? jsonContent.keywords.length : 0} palavras`);
                    console.log(`   - Resumo: ${jsonContent.summary ? '✅' : '❌'}`);
                } else {
                    console.log(`❌ Falha na conversão: ${conversionResult.error}`);
                }
            } else {
                console.log('✅ PDF já possui JSON processado');

                // Analisar JSON existente
                const jsonContent = testPDF.json_content;
                console.log('📋 Análise do JSON existente:');
                console.log(`   - Arquivo: ${jsonContent.metadata.filename}`);
                console.log(`   - Páginas: ${jsonContent.metadata.total_pages}`);
                console.log(`   - Palavras-chave: ${jsonContent.keywords.slice(0, 5).join(', ')}...`);
                console.log(`   - Resumo: ${jsonContent.summary.substring(0, 100)}...`);
            }
        }

        // 4. Testar IA com JSON
        console.log('\n4️⃣ Testando IA com JSON processado...');
        if (pdfs.length > 0 && pdfs[0].json_content) {
            const testPDF = pdfs[0];
            console.log(`🤖 Testando pergunta sobre: ${testPDF.original_name}`);

            const { data: aiResponse, error: aiError } = await supabase.functions.invoke('ai-processor', {
                body: {
                    action: 'chat',
                    message: 'Qual é o tema principal deste documento?',
                    pdfId: testPDF.id
                }
            });

            if (aiError) {
                console.log(`❌ Erro na IA: ${aiError.message}`);
            } else if (aiResponse.success) {
                console.log('✅ Resposta da IA:');
                console.log(`   Fonte: ${aiResponse.source || 'desconhecida'}`);
                console.log(`   Resposta: ${aiResponse.response.substring(0, 200)}...`);
            } else {
                console.log(`❌ Falha na IA: ${aiResponse.error}`);
            }
        }

        // 5. Estatísticas
        console.log('\n5️⃣ Estatísticas do sistema...');
        const { data: stats, error: statsError } = await supabase
            .from('pdfs')
            .select('processing_status, json_content');

        if (!statsError && stats.length > 0) {
            const totalPDFs = stats.length;
            const withJSON = stats.filter(pdf => pdf.json_content).length;
            const completed = stats.filter(pdf => pdf.processing_status === 'completed').length;
            const jsonCompleted = stats.filter(pdf => pdf.processing_status === 'json_completed').length;

            console.log(`📊 Estatísticas:`);
            console.log(`   - Total de PDFs: ${totalPDFs}`);
            console.log(`   - Processados: ${completed}`);
            console.log(`   - JSON processado: ${withJSON}`);
            console.log(`   - JSON completado: ${jsonCompleted}`);
            console.log(`   - Taxa de sucesso JSON: ${((withJSON / totalPDFs) * 100).toFixed(1)}%`);
        }

        console.log('\n🎉 TESTE CONCLUÍDO COM SUCESSO!');
        console.log('=====================================');

    } catch (error) {
        console.error('\n💥 ERRO NO TESTE:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Função para verificar estrutura da tabela
async function checkTableStructure() {
    console.log('\n🔍 VERIFICANDO ESTRUTURA DA TABELA PDFS');
    console.log('==========================================');

    try {
        // Verificar se a coluna json_content existe
        const { data: columns, error: columnError } = await supabase
            .rpc('get_table_columns', { table_name: 'pdfs' });

        if (columnError) {
            console.log('⚠️ Não foi possível verificar colunas automaticamente');
            console.log('   Verifique se a migração foi aplicada:');
            console.log('   supabase db push');
        } else {
            console.log('✅ Estrutura da tabela verificada');
        }

        // Verificar índices
        console.log('\n📊 Verificando índices...');
        const { data: indexes, error: indexError } = await supabase
            .rpc('get_table_indexes', { table_name: 'pdfs' });

        if (!indexError && indexes) {
            console.log('✅ Índices encontrados:');
            indexes.forEach(index => {
                console.log(`   - ${index.indexname}`);
            });
        }

    } catch (error) {
        console.error('❌ Erro ao verificar estrutura:', error.message);
    }
}

// Executar testes
async function runTests() {
    console.log('🚀 INICIANDO TESTES DA FUNCIONALIDADE PDF PARA JSON');
    console.log('====================================================');

    await checkTableStructure();
    await testPDFToJSON();
}

// Executar se chamado diretamente
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { testPDFToJSON, checkTableStructure }; 