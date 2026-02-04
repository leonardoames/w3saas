
# Plano: Corrigir Extração de Texto de Arquivos DOCX

## Problema Identificado
Arquivos DOCX são na verdade arquivos **ZIP compactados** contendo XMLs. O código atual tenta decodificar os bytes do ZIP diretamente como texto UTF-8, o que resulta em caracteres ilegíveis/corrompidos.

## Solução
Usar uma biblioteca de descompactação ZIP para extrair o arquivo `word/document.xml` de dentro do DOCX e então parsear o XML para obter o texto.

---

## Alterações Técnicas

### 1. Atualizar Edge Function `process-ia-document`

**Arquivo:** `supabase/functions/process-ia-document/index.ts`

**Mudanças:**
- Importar biblioteca `JSZip` para descompactar o arquivo DOCX
- Reescrever a função `extractDocxText` para:
  1. Descompactar o arquivo ZIP
  2. Ler o arquivo `word/document.xml`
  3. Extrair texto dos elementos `<w:t>` (onde o Word armazena o texto)

```text
Antes:
  const content = new TextDecoder("utf-8").decode(bytes);
  // Tenta regex direto nos bytes compactados - ERRADO

Depois:
  const zip = await JSZip.loadAsync(arrayBuffer);
  const documentXml = await zip.file("word/document.xml")?.async("string");
  // Regex no XML descompactado - CORRETO
```

### 2. Também Melhorar Extração de PDF (Opcional)

A extração de PDF usa um método muito simplista que pode falhar em PDFs complexos. Podemos usar a API de IA integrada do Lovable para extrair texto de forma mais robusta, ou usar uma biblioteca especializada como `pdf-parse`.

---

## Resultado Esperado
- Arquivos DOCX terão seu texto extraído corretamente
- O conteúdo exibido no modal será legível
- A IA W3 poderá usar o conhecimento dos documentos nas respostas

---

## Passos de Implementação
1. Adicionar import do JSZip na edge function
2. Reescrever `extractDocxText` usando descompactação real
3. Reprocessar os documentos existentes (você pode usar o botão "Reprocessar pendentes" ou deletar e reenviar)
