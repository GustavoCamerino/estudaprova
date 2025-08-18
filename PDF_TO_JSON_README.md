# Conversão de PDF para JSON - EstudaProva

## 🎯 Funcionalidade Implementada

O sistema agora permite converter PDFs em JSON estruturado, que é então lido pela IA para fornecer respostas mais precisas e organizadas.

## 📋 Fluxo Completo

### 1. Upload do PDF
- O usuário faz upload de um PDF através do Chat AI
- O arquivo é salvo no Supabase Storage
- Os metadados são salvos na tabela `pdfs`

### 2. Conversão para JSON
- O usuário acessa a página "Meus PDFs"
- Clica no botão "Converter para JSON" (ícone de código)
- A Edge Function `pdf-to-json` processa o PDF:
  - Extrai o conteúdo usando pdf.js
  - Estrutura o conteúdo em JSON com:
    - Metadados (nome, páginas, data, etc.)
    - Páginas individuais com contadores
    - Seções identificadas automaticamente
    - Palavras-chave extraídas
    - Resumo do conteúdo

### 3. Leitura pela IA
- A IA prioriza o JSON processado quando disponível
- Usa a estrutura organizada para respostas mais precisas
- Mantém compatibilidade com conteúdo extraído tradicional

## 🛠️ Componentes Criados

### Edge Function: `pdf-to-json`
- **Localização**: `supabase/functions/pdf-to-json/index.ts`
- **Função**: Converte PDFs em JSON estruturado
- **Recursos**:
  - Extração de texto com pdf.js
  - Identificação automática de seções
  - Extração de palavras-chave
  - Geração de resumo
  - Cache de conteúdo processado

### Componente: `PDFManager`
- **Localização**: `src/components/PDFManager.tsx`
- **Função**: Interface para gerenciar PDFs
- **Recursos**:
  - Lista de PDFs do usuário
  - Botão de conversão para JSON
  - Visualizador de JSON
  - Edição e exclusão de PDFs
  - Status de processamento

### Migração: `add_json_content_to_pdfs.sql`
- **Localização**: `supabase/migrations/20250806020000_add_json_content_to_pdfs.sql`
- **Função**: Adiciona coluna `json_content` à tabela `pdfs`
- **Recursos**:
  - Coluna JSONB para armazenar JSON processado
  - Índices para performance
  - Status de processamento JSON

## 🔧 Como Usar

### Para Desenvolvedores

1. **Deploy das Edge Functions**:
```bash
supabase functions deploy pdf-to-json
supabase functions deploy ai-processor
```

2. **Aplicar Migração**:
```bash
supabase db push
```

3. **Configurar Variáveis de Ambiente**:
```bash
supabase secrets set GOOGLE_API_KEY=sua_chave_aqui
```

### Para Usuários

1. **Upload de PDF**:
   - Vá para o Chat AI
   - Faça upload de um PDF
   - Aguarde o processamento

2. **Conversão para JSON**:
   - Vá para "Meus PDFs"
   - Clique no ícone de código (⚡) ao lado do PDF
   - Aguarde a conversão

3. **Visualizar JSON**:
   - Após conversão, clique no ícone de código novamente
   - Visualize o JSON estruturado
   - Copie se necessário

## 📊 Estrutura do JSON Gerado

```json
{
  "metadata": {
    "filename": "documento.pdf",
    "total_pages": 10,
    "extraction_date": "2024-01-15T10:30:00Z",
    "content_length": 15000
  },
  "pages": [
    {
      "page_number": 1,
      "content": "Conteúdo da página...",
      "word_count": 150,
      "character_count": 800
    }
  ],
  "sections": [
    {
      "title": "Introdução",
      "content": "Conteúdo da seção...",
      "start_line": 0,
      "end_line": 50
    }
  ],
  "keywords": ["palavra1", "palavra2", "palavra3"],
  "summary": "Resumo dos primeiros 500 caracteres..."
}
```

## 🚀 Vantagens da Implementação

### Para a IA
- **Estrutura Organizada**: JSON fornece estrutura clara
- **Seções Identificadas**: Facilita navegação no conteúdo
- **Palavras-chave**: Ajuda na compreensão do tema
- **Metadados**: Informações contextuais úteis

### Para o Usuário
- **Respostas Mais Precisas**: IA usa estrutura organizada
- **Visualização Clara**: JSON formatado e legível
- **Cache Inteligente**: Não reprocessa PDFs já convertidos
- **Status Transparente**: Acompanha progresso da conversão

## 🔍 Melhorias na IA

A IA agora pode:
- Usar seções identificadas para respostas organizadas
- Referenciar páginas específicas
- Utilizar palavras-chave para contexto
- Fornecer respostas baseadas em estrutura JSON
- Manter compatibilidade com conteúdo extraído tradicional

## 🛡️ Tratamento de Erros

- **PDF Corrompido**: Detecta e reporta erro
- **Falha na Extração**: Fallback para método alternativo
- **Timeout**: Limite de páginas processadas (50)
- **Cache**: Evita reprocessamento desnecessário
- **Status**: Atualiza status de processamento

## 📈 Performance

- **Cache Inteligente**: JSON processado é salvo
- **Índices Otimizados**: Busca rápida por JSON
- **Processamento Assíncrono**: Não bloqueia interface
- **Limite de Páginas**: Evita processamento infinito
- **Compressão**: JSON compacto para armazenamento

## 🔮 Próximos Passos

1. **OCR para Imagens**: Processar PDFs escaneados
2. **Análise Semântica**: Melhorar identificação de seções
3. **Exportação**: Permitir download do JSON
4. **Batch Processing**: Converter múltiplos PDFs
5. **Análise Avançada**: Extrair tabelas, gráficos, etc.

---

**Desenvolvido para o EstudaProva** 🎓
*Transformando PDFs em conhecimento estruturado* 