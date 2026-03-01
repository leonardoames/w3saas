

## Diagnóstico

Atualmente, o sistema tem dois fluxos que **não enviam email real**:

1. **Criar usuário (admin)**: Cria a conta com senha temporária via `create-bulk-users`, mas apenas mostra um toast na tela do admin. O usuário nunca recebe email.
2. **Resetar senha (admin)**: Define senha temporária via `admin-reset-password`, mas também só mostra toast. Nenhum email é enviado.

O projeto **não tem nenhum mecanismo de envio de email transacional** configurado. Os emails de autenticação padrão do sistema (confirmação, recovery) funcionam automaticamente, mas emails customizados (como "sua senha temporária é X") precisam de configuração adicional.

## O que é necessário

### Opção A — Emails de autenticação padrão (recovery/reset)
Configurar **templates de email customizados** via Lovable Cloud para que os emails padrão de autenticação (reset de senha, confirmação) sejam enviados com a marca do projeto e de um domínio próprio. Isso requer um domínio de email verificado.

### Opção B — Emails transacionais customizados (notificar senha temporária)
Criar uma edge function que envia email ao usuário quando o admin cria a conta ou reseta a senha, informando as credenciais temporárias. Isso requer integração com um serviço de email (ex: Resend) e uma API key.

### Plano recomendado (ambas opções combinadas)

1. **Configurar domínio de email** via Lovable Cloud para emails de autenticação com marca própria
2. **Adicionar fluxo "Esqueci minha senha"** na tela de login — usando `resetPasswordForEmail` do sistema de autenticação, que já envia email automaticamente
3. **Criar edge function de notificação** para enviar email ao usuário quando admin cria conta ou reseta senha, com as credenciais temporárias
4. **Criar página `/reset-password`** para que o link do email de recovery funcione corretamente

### Detalhes técnicos

- O fluxo "Esqueci minha senha" usa `supabase.auth.resetPasswordForEmail()` que já envia email automaticamente sem precisar de serviço externo
- Para emails customizados (notificar senha temp), seria necessário um conector de email (Resend) com API key
- A página `/reset-password` precisa capturar o token da URL e permitir definir nova senha via `supabase.auth.updateUser()`

