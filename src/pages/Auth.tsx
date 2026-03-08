import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Lock, CheckCircle2, ArrowRight } from "lucide-react";
import { motion } from "motion/react";

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (ignore) return;
      if (event === "SIGNED_OUT") setMustChangePassword(false);
    });
    return () => { ignore = true; subscription.unsubscribe(); };
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
      toast({ title: "Login realizado!", description: "Bem-vindo de volta." });
    } catch (error: any) {
      setError(error.message);
      toast({ title: "Erro no login", description: error.message, variant: "destructive" });
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
      toast({ title: "Email enviado!", description: "Verifique sua caixa de entrada para redefinir a senha." });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) { setError("As senhas não coincidem"); return; }
    if (newPassword.length < 6) { setError("A senha deve ter pelo menos 6 caracteres"); return; }
    setLoading(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updateErr) throw updateErr;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update({ must_change_password: false }).eq("user_id", user.id);
      }
      toast({ title: "Senha atualizada!", description: "Sua nova senha foi definida com sucesso." });
      setMustChangePassword(false);
      navigate("/app");
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formCard = (content: React.ReactNode) => (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[45%] relative bg-gradient-to-br from-[hsl(220,16%,6%)] via-[hsl(220,16%,8%)] to-[hsl(27,40%,12%)] items-center justify-center p-12">
        <div className="absolute inset-0 dot-pattern opacity-30" />
        <div className="relative z-10 max-w-md space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1 className="text-4xl font-semibold text-white tracking-tight" style={{ letterSpacing: '-0.03em' }}>
              W3 <span className="text-gradient">SaaS</span>
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-white/50">
              Ferramentas exclusivas para donos de e-commerce que faturam acima de R$30.000/mês.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-4"
          >
            {[
              "Dashboard completo com métricas em tempo real",
              "Precificadora inteligente e simulação de cenários",
              "IA treinada para seu e-commerce",
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-white/40">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                  <CheckCircle2 className="h-3 w-3 text-primary" />
                </div>
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[380px] space-y-8"
        >
          {/* Mobile logo */}
          <div className="lg:hidden text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              W3 <span className="text-gradient">SaaS</span>
            </h1>
          </div>
          {content}
        </motion.div>
      </div>
    </div>
  );

  if (mustChangePassword) {
    return formCard(
      <>
        <div className="space-y-2 text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight">Criar Nova Senha</h2>
          <p className="text-sm text-muted-foreground">
            Defina uma nova senha para continuar.
          </p>
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-password" className="text-xs font-medium text-muted-foreground">Nova senha</Label>
            <Input id="new-password" type="password" placeholder="••••••••" value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)} required disabled={loading} minLength={6} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password" className="text-xs font-medium text-muted-foreground">Confirmar nova senha</Label>
            <Input id="confirm-password" type="password" placeholder="••••••••" value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)} required disabled={loading} minLength={6} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Salvando..." : "Definir Nova Senha"}
          </Button>
        </form>
      </>
    );
  }

  return formCard(
    <>
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">Entrar na plataforma</h2>
        <p className="text-sm text-muted-foreground">
          Acesse suas ferramentas e métricas
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="login-email" className="text-xs font-medium text-muted-foreground">Email</Label>
          <Input id="login-email" type="email" placeholder="seu@email.com" value={loginData.email}
            onChange={(e) => setLoginData({ ...loginData, email: e.target.value })} required disabled={loading} />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="login-password" className="text-xs font-medium text-muted-foreground">Senha</Label>
            <button type="button"
              onClick={() => { setForgotMode(true); setError(null); setForgotSent(false); setForgotEmail(loginData.email); }}
              className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Esqueceu?
            </button>
          </div>
          <Input id="login-password" type="password" placeholder="••••••••" value={loginData.password}
            onChange={(e) => setLoginData({ ...loginData, password: e.target.value })} required disabled={loading} />
        </div>
        <Button type="submit" className="w-full gap-2" disabled={loading}>
          {loading ? "Entrando..." : <>Entrar <ArrowRight className="h-4 w-4" /></>}
        </Button>
      </form>

      {forgotMode && (
        <div className="border-t border-border pt-5 space-y-3">
          {forgotSent ? (
            <Alert className="border-success/30 bg-success/5">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <AlertDescription className="text-success">
                Email enviado! Verifique sua caixa de entrada.
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-3">
              <Label htmlFor="forgot-email" className="text-xs font-medium text-muted-foreground">Email para recuperação</Label>
              <Input id="forgot-email" type="email" placeholder="seu@email.com" value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)} required disabled={loading} />
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? "Enviando..." : "Enviar link"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setForgotMode(false)}>Cancelar</Button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="text-center text-sm text-muted-foreground">
        <p>Ainda não tem uma conta?{" "}
          <a href="/checkout" className="text-primary hover:text-primary/80 font-medium transition-colors">
            Assine agora
          </a>
        </p>
      </div>
    </>
  );
}
