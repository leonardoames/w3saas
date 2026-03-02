import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Lock, CheckCircle2 } from "lucide-react";

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  useEffect(() => {
    let ignore = false;

    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (ignore) return;
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("must_change_password")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (ignore) return;
        if (profile?.must_change_password) {
          setMustChangePassword(true);
        } else {
          navigate("/app");
        }
      }
    };
    checkUser();

    // No async inside callback — just redirect if already handled by handleLogin
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (ignore) return;
      // Only handle token refresh or signout; login is handled by handleLogin
      if (event === "SIGNED_OUT") {
        setMustChangePassword(false);
      }
    });

    return () => {
      ignore = true;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });

      if (error) throw error;

      // Check must_change_password
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("must_change_password")
          .eq("user_id", data.user.id)
          .maybeSingle();
        
        if (profile?.must_change_password) {
          setMustChangePassword(true);
          setLoading(false);
          return;
        }
      }

      navigate("/app");

      toast({
        title: "Login realizado!",
        description: "Bem-vindo de volta.",
      });
    } catch (error: any) {
      setError(error.message);
      toast({
        title: "Erro no login",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setForgotSent(true);
      toast({
        title: "Email enviado!",
        description: "Verifique sua caixa de entrada para redefinir a senha.",
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }
    if (newPassword.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updateErr) throw updateErr;

      // Clear the flag
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ must_change_password: false })
          .eq("user_id", user.id);
      }

      toast({
        title: "Senha atualizada!",
        description: "Sua nova senha foi definida com sucesso.",
      });

      setMustChangePassword(false);
      navigate("/app");
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (mustChangePassword) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-2">
              <Lock className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold text-center">Criar Nova Senha</CardTitle>
            <CardDescription className="text-center">
              Sua senha temporária foi utilizada. Por segurança, defina uma nova senha para continuar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar nova senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Salvando..." : "Definir Nova Senha"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">SaaS da W3</CardTitle>
          <CardDescription className="text-center">
            Plataforma exclusiva para mentorados e donos de e-commerce
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="seu@email.com"
                value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password">Senha</Label>
              <Input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => { setForgotMode(true); setError(null); setForgotSent(false); setForgotEmail(loginData.email); }}
              className="text-sm text-primary hover:underline font-medium"
            >
              Esqueci minha senha
            </button>
          </div>

          {forgotMode && (
            <div className="mt-4 border-t pt-4">
              {forgotSent ? (
                <Alert className="border-green-200 bg-green-50 dark:bg-green-950/30">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700 dark:text-green-400">
                    Email enviado! Verifique sua caixa de entrada (e spam) para o link de redefinição.
                  </AlertDescription>
                </Alert>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-3">
                  <Label htmlFor="forgot-email">Email para recuperação</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1" disabled={loading}>
                      {loading ? "Enviando..." : "Enviar link"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setForgotMode(false)}>
                      Cancelar
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Ainda não tem uma conta?</p>
            <a href="/checkout" className="text-primary hover:underline font-medium">
              Assine agora
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
