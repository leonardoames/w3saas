

## Configurar Envio de Emails Reais (Auth Emails)

O projeto já tem um domínio customizado (`app.leonardoames.com.br`), mas ainda não tem um domínio de email configurado. Para que emails de autenticação (recuperação de senha, verificação de email, etc.) sejam enviados com a identidade da sua marca, precisamos configurar um domínio de email.

### O que será feito

1. **Configurar domínio de email** — Você precisará adicionar registros DNS (DKIM, SPF) para que os emails saiam de um endereço como `noreply@leonardoames.com.br` (ou subdomínio como `notify.leonardoames.com.br`)

2. **Criar templates de email customizados** — Templates para:
   - Recuperação de senha (já tem o fluxo `/reset-password` funcionando)
   - Verificação de email (confirmação de cadastro)
   - Magic link (se aplicável)
   - Convite de usuário

3. **Estilizar com a identidade visual do app** — Cores, fontes e tom de voz alinhados com o SaaS

4. **Deploy da edge function `auth-email-hook`** — Função que processa e envia os emails automaticamente

### Primeiro passo

O primeiro passo é configurar o domínio de email. Clique no botão abaixo para iniciar:

### Observações
- Enquanto o DNS não for verificado, os emails padrão do sistema continuam sendo enviados normalmente
- Após verificação, os emails customizados são ativados automaticamente
- Não é necessária nenhuma API key externa — o sistema gerencia as credenciais automaticamente

