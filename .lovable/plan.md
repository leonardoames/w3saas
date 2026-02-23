

# Fluxo OAuth da Shopify - Plano de Implementacao

Como seu app ja esta criado (custom/unlisted), ele suporta OAuth normalmente. O fluxo vai permitir que seus usuarios cliquem em "Conectar", sejam redirecionados para a Shopify para autorizar, e o sistema obtenha o Access Token automaticamente.

---

## Como vai funcionar

1. O usuario clica em **"Conectar Shopify"** na pagina de Integracoes
2. E redirecionado para a tela de autorizacao da Shopify (precisa digitar o dominio da loja)
3. Apos autorizar, a Shopify redireciona de volta para o app com um **code** temporario
4. Uma Edge Function troca esse code pelo **Access Token** permanente e salva no banco
5. A integracao fica ativa e pronta para sincronizar

---

## Requisitos

Voce vai precisar fornecer 2 secrets do seu app Shopify (encontrados em **Shopify Partners > Apps > seu app > Client credentials**):

- **SHOPIFY_CLIENT_ID** (API Key)
- **SHOPIFY_CLIENT_SECRET** (API Secret Key)

---

## Mudancas tecnicas

### 1. Nova Edge Function: `shopify-oauth`
Vai lidar com duas operacoes:
- **`authorize`** (GET): Gera a URL de autorizacao da Shopify com os escopos necessarios (`read_orders`) e redireciona o usuario
- **`callback`** (GET): Recebe o `code` da Shopify, troca pelo Access Token via POST para `https://{shop}/admin/oauth/access_token`, e salva as credenciais na tabela `user_integrations`

### 2. Nova rota: `/app/integracoes/shopify/callback`
Pagina simples que captura os query params (`code`, `shop`, `state`) retornados pela Shopify e chama a Edge Function para completar a troca de tokens. Apos sucesso, redireciona para `/app/integracoes`.

### 3. Atualizacao: `Integracoes.tsx`
- O botao "Conectar" da Shopify vai iniciar o fluxo OAuth em vez de abrir o dialog de credenciais manuais
- O usuario digita o dominio da loja (ex: `minha-loja.myshopify.com`) em um pequeno dialog, e e redirecionado
- Botoes "Editar" e "Sincronizar" continuam funcionando normalmente apos conectado

### 4. Atualizacao: `App.tsx`
- Adicionar a rota `/app/integracoes/shopify/callback` para a pagina de callback

### 5. Secrets necessarios
- `SHOPIFY_CLIENT_ID`
- `SHOPIFY_CLIENT_SECRET`

### 6. Seguranca
- O parametro `state` sera usado com um nonce armazenado temporariamente para prevenir ataques CSRF
- O `state` contera o `user_id` codificado para associar o token ao usuario correto
- A Edge Function de callback usara o service role para salvar as credenciais com seguranca

