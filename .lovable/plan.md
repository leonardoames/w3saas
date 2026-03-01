

## Plano: Upload de imagens no chat da IA W3

### O que muda

O usuário poderá anexar imagens (fotos de produtos, screenshots de anúncios, prints de métricas) diretamente no chat. A IA analisará visualmente as imagens para fazer diagnósticos.

### Implementação

**1. Frontend (`src/pages/IAW3.tsx`)**

- Adicionar estado `attachedImages: { file: File, preview: string }[]` para armazenar imagens selecionadas antes do envio
- Adicionar botão de upload (ícone `ImagePlus`) ao lado do botão de áudio na barra de input
- Input file hidden (`accept="image/*"`, `multiple`) acionado pelo botão
- Exibir thumbnails das imagens anexadas acima do textarea (com botão X para remover)
- Ao enviar, converter cada imagem para base64 (`FileReader.readAsDataURL`) e incluir no payload como `images: string[]`
- Nas mensagens do usuário que contêm imagens, renderizar os thumbnails junto ao texto
- Atualizar `ChatMessage` para incluir `images?: string[]`

**2. Edge Function (`supabase/functions/ia-w3/index.ts`)**

- Receber o novo campo `images: string[]` (array de data URLs base64) do body
- Quando houver imagens, montar a mensagem do usuário no formato multimodal da OpenAI:
  ```ts
  {
    role: "user",
    content: [
      { type: "text", text: userMessage },
      { type: "image_url", image_url: { url: base64DataUrl } },
      // ... mais imagens
    ]
  }
  ```
- O modelo `gpt-4.1-mini` já suporta visão, então não precisa trocar o modelo
- Limitar a 3 imagens por mensagem para controlar tokens

**3. Exibição no chat**

- Mensagens do usuário com imagens: grid de thumbnails clicáveis acima do texto
- Thumbnails com `object-cover`, `rounded-lg`, tamanho `80x80px`

### Visual do input com imagens anexadas

```text
┌──────────────────────────────────────────────────┐
│  [thumb1 ✕] [thumb2 ✕]                          │  ← previews
├──────────────────────────────────────────────────┤
│  [+]  Pergunte alguma coisa...  [📷] [🎤] [➤]   │  ← input bar
└──────────────────────────────────────────────────┘
```

### Edições

| Arquivo | Mudança |
|---|---|
| `src/pages/IAW3.tsx` | Adicionar estado de imagens, botão upload, previews, converter para base64, enviar no payload, exibir imagens nas mensagens |
| `supabase/functions/ia-w3/index.ts` | Receber campo `images`, montar mensagem multimodal com `image_url`, limitar a 3 imagens |

