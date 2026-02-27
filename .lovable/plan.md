

# Upload de imagem nos Produtos da Mentoria

## Mudancas

### 1. Criar bucket de storage para imagens de produtos
- Migration SQL para criar bucket `product-images` (publico) com limite de 5MB
- Policies de storage: admins podem fazer upload/delete, todos podem visualizar

### 2. Atualizar ProductFormDialog para upload de arquivo
- Substituir o campo "URL da Imagem" (input de texto) por um input de arquivo (`type="file"`)
- Ao selecionar arquivo, fazer upload para `product-images/{timestamp}_{filename}` no storage
- Mostrar preview da imagem atual (se editando) e da nova imagem selecionada
- Manter o `image_url` no banco apontando para a URL publica do storage

### 3. Nenhuma mudanca necessaria nos botoes
- Os botoes "Saiba Mais" e "Falar com Especialista" ja sao renderizados condicionalmente (so aparecem se o respectivo URL existir). Esse comportamento ja esta correto.

## Arquivos afetados
- **Nova migration SQL** — bucket `product-images` + RLS policies
- **`src/components/produtos/ProductFormDialog.tsx`** — trocar input URL por file upload com preview

