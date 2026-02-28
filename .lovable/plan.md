

## Problemas Identificados

1. **Criar usuário não funciona**: O `sendInvite` usa `resetPasswordForEmail` que apenas envia email de reset -- não cria conta. Deveria usar a edge function `create-bulk-users` (que já existe e funciona) para criar 1 usuário.
2. **Sem campo de senha temporária**: O dialog não tem input para definir senha temporária.
3. **Sem opção de role admin**: Não existe checkbox/toggle para definir o novo usuário como admin.
4. **Sem opções de Mentorado/Cliente W3**: Faltam no dialog de criação individual.

## Plano de Implementação

### 1. Atualizar o dialog "Adicionar Novo Usuário"

Adicionar ao dialog (em `AdminUsers.tsx`):
- Campo **senha temporária** (obrigatório, min 6 chars, default `appw3acesso`)
- Checkbox **Tornar Admin**
- Checkbox **Mentorado**
- Checkbox **Cliente W3**

### 2. Reescrever a função `sendInvite`

Substituir `resetPasswordForEmail` por chamada à edge function `create-bulk-users` com array de 1 usuário, passando email, nome, plano, flags mentorado/w3_client e a senha temporária definida.

Após criação com sucesso, se o checkbox admin estiver marcado, chamar `admin_update_role` via RPC para atribuir a role.

### 3. Adicionar estados para os novos campos

Novos states: `newUserPassword` (default `"appw3acesso"`), `newUserIsAdmin`, `newUserMentorado`, `newUserW3Client`.

---

Nenhuma migration necessária -- toda a infraestrutura backend (edge function, RPCs) já existe.

