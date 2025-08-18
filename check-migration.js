// Script para verificar se a migração json_content foi aplicada
const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://mooddxbxvgnwpjoqrqmm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vb2RkeGJ4dmdud3Bqb3FycW1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MjI0OTUsImV4cCI6MjA2OTI5ODQ5NX0._jCeW26omfJaObA16egXODgRUv-Qr8UZXROhhzZA8YA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMigration() {
    console.log('🔍 VERIFICANDO MIGRAÇÃO JSON_CONTENT');
    console.log('=====================================');

    try {
        // Verificar se a coluna json_content existe
        console.log('\n1️⃣ Verificando estrutura da tabela pdfs...');

        const { data: columns, error: columnError } = await supabase
            .rpc('get_table_columns', { table_name: 'pdfs' });

        if (columnError) {
            console.log('⚠️ Não foi possível verificar colunas automaticamente');
            console.log('   Tentando método alternativo...');

            // Método alternativo: tentar inserir um registro com json_content
            const { data: testData, error: testError } = await supabase
                .from('pdfs')
                .select('id, json_content')
                .limit(1);

            if (testError && testError.message.includes('json_content')) {
                console.log('❌ COLUNA JSON_CONTENT NÃO EXISTE');
                console.log('   Erro:', testError.message);
                console.log('\n🔧 SOLUÇÃO:');
                console.log('   1. Execute: supabase db push');
                console.log('   2. Ou aplique a migração manualmente');
                return false;
            } else {
                console.log('✅ COLUNA JSON_CONTENT EXISTE');
                return true;
            }
        } else {
            console.log('✅ Estrutura da tabela verificada');
            const hasJsonContent = columns.some(col => col.column_name === 'json_content');

            if (hasJsonContent) {
                console.log('✅ COLUNA JSON_CONTENT EXISTE');
                return true;
            } else {
                console.log('❌ COLUNA JSON_CONTENT NÃO EXISTE');
                console.log('\n🔧 SOLUÇÃO:');
                console.log('   1. Execute: supabase db push');
                console.log('   2. Ou aplique a migração manualmente');
                return false;
            }
        }

    } catch (error) {
        console.error('💥 ERRO AO VERIFICAR MIGRAÇÃO:', error.message);
        return false;
    }
}

async function applyMigration() {
    console.log('\n🔧 APLICANDO MIGRAÇÃO...');
    console.log('==========================');

    try {
        // Aplicar a migração manualmente
        const { error } = await supabase.rpc('exec_sql', {
            sql: `
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
      `
        });

        if (error) {
            console.log('❌ ERRO AO APLICAR MIGRAÇÃO:', error.message);
            console.log('\n💡 SOLUÇÃO ALTERNATIVA:');
            console.log('   Execute no terminal: supabase db push');
            return false;
        } else {
            console.log('✅ MIGRAÇÃO APLICADA COM SUCESSO');
            return true;
        }

    } catch (error) {
        console.error('💥 ERRO AO APLICAR MIGRAÇÃO:', error.message);
        return false;
    }
}

async function testPDFFunctionality() {
    console.log('\n🧪 TESTANDO FUNCIONALIDADE PDF...');
    console.log('==================================');

    try {
        // Testar se conseguimos inserir um PDF com json_content
        const testPDF = {
            filename: 'test.pdf',
            original_name: 'test.pdf',
            file_path: 'test/path',
            file_size: 1000,
            user_id: '00000000-0000-0000-0000-000000000000', // UUID inválido para teste
            json_content: { test: 'data' }
        };

        const { error } = await supabase
            .from('pdfs')
            .insert(testPDF);

        if (error) {
            if (error.message.includes('json_content')) {
                console.log('❌ ERRO: Coluna json_content não existe');
                return false;
            } else {
                console.log('✅ ESTRUTURA CORRETA - Erro esperado (UUID inválido)');
                return true;
            }
        } else {
            console.log('✅ ESTRUTURA CORRETA');
            return true;
        }

    } catch (error) {
        console.error('💥 ERRO NO TESTE:', error.message);
        return false;
    }
}

async function main() {
    console.log('🚀 VERIFICADOR DE MIGRAÇÃO JSON_CONTENT');
    console.log('========================================');

    const hasMigration = await checkMigration();

    if (!hasMigration) {
        console.log('\n🔄 Tentando aplicar migração...');
        const applied = await applyMigration();

        if (applied) {
            console.log('\n✅ Migração aplicada! Testando...');
            await testPDFFunctionality();
        }
    } else {
        console.log('\n✅ Migração já existe! Testando...');
        await testPDFFunctionality();
    }

    console.log('\n🎉 VERIFICAÇÃO CONCLUÍDA');
}

// Executar se chamado diretamente
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { checkMigration, applyMigration, testPDFFunctionality }; 