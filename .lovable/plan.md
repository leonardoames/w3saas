

## Diagnóstico

O login fica travado em "Entrando..." porque o código faz `await` de queries ao banco de dados dentro do callback `onAuthStateChange` — isso causa deadlock com o Supabase Auth. Além disso, ambos `handleLogin` e `onAuthStateChange` competem para verificar `must_change_password`, criando uma race condition.

Outro problema: `navigate("/")` redireciona para a Landing page, não para `/app`.

## Solução

Simplificar o Auth.tsx:

1. **Remover queries async do `onAuthStateChange`** — apenas verificar se há sessão e redirecionar
2. **`handleLogin` faz a verificação de `must_change_password`** e navega para `/app` (não `/`)
3. **`onAuthStateChange`** apenas redireciona para `/app` se já logado (sem await de queries)
4. **`checkUser` no mount** — verificar sessão existente e redirecionar ou mostrar tela de troca de senha

### Mudanças em `src/pages/Auth.tsx`:
- No `useEffect`, `onAuthStateChange`: se `SIGNED_IN`, buscar perfil fora do callback (via flag de estado)
- Em `handleLogin`: após login bem-sucedido, verificar `must_change_password`. Se `false`, `navigate("/app")`
- Corrigir todos os `navigate("/")` para `navigate("/app")`

