import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Lock, CheckCircle2, Users, TrendingUp, Star, Shield, ArrowRight, Eye, EyeOff } from "lucide-react";
import { motion } from "motion/react";

const stats = [
  { value: "+???", label: "e-commerces", icon: Users },
  { value: "R$??M+", label: "gerenciados", icon: TrendingUp },
  { value: "?.?/5", label: "satisfação", icon: Star },
];

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } },
};

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
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  // Change password screen — full-screen centered
  if (mustChangePassword) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="relative w-full max-w-md">
          {/* Gradient orbs */}
          <div className="absolute top-[-40%] left-[-30%] w-[400px] h-[400px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
          <div className="absolute bottom-[-30%] right-[-20%] w-[300px] h-[300px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative rounded-xl border border-border bg-card/80 backdrop-blur-xl p-8 shadow-xl"
          >
            <div className="flex justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Lock className="h-6 w-6 text-primary" />
              </div>
            </div>
            <h1 className="text-2xl font-semibold text-center tracking-tight mb-1">Criar Nova Senha</h1>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Sua senha temporária foi utilizada. Por segurança, defina uma nova senha para continuar.
            </p>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova senha</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                    className="h-11 pr-10"
                  />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar nova senha</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                    className="h-11 pr-10"
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
                {loading ? "Salvando..." : "Definir Nova Senha"}
              </Button>
            </form>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left panel — Branding & Social proof */}
      <div className="relative hidden lg:flex lg:w-1/2 items-center justify-center overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute top-[-15%] left-[5%] w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />
        <div className="absolute inset-0 dot-pattern opacity-30" />

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="relative z-10 max-w-md px-8 space-y-8"
        >
          {/* Logo */}
          <motion.div variants={fadeUp}>
            <span className="text-2xl font-semibold tracking-tight">
              W3 <span className="text-gradient">SaaS</span>
            </span>
          </motion.div>

          {/* Headline */}
          <motion.div variants={fadeUp} className="space-y-3">
            <h1
              className="text-3xl sm:text-4xl font-semibold tracking-tight leading-[1.15]"
              style={{ letterSpacing: "-0.03em" }}
            >
              Gerencie seu e-commerce{" "}
              <span className="text-gradient">como um profissional</span>
            </h1>
            <p className="text-muted-foreground leading-relaxed">
              Ferramentas exclusivas para donos de e-commerce que faturam acima de R$30.000/mês.
            </p>
          </motion.div>

          {/* Social proof pills */}
          <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
            {stats.map((s) => (
              <div key={s.label} className="flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2">
                <s.icon className="h-3.5 w-3.5 text-primary" />
                <span className="text-sm font-semibold tabular-nums text-foreground">{s.value}</span>
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </motion.div>

          {/* Testimonial card */}
          <motion.div variants={fadeUp}>
            <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-5 space-y-4">
              <p className="text-sm text-foreground/90 leading-relaxed italic">
                "Desde que comecei a usar o W3 SaaS, consegui aumentar a produtividade da minha equipe e reduzir o tempo gasto em planilhas."
              </p>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  GG
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Gabriel G.</p>
                  <p className="text-xs text-muted-foreground">E-commerce de moda — R$180k/mês</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Trust badges */}
          <motion.div variants={fadeUp} className="flex items-center gap-4">
            {[
              { icon: Shield, label: "Dados seguros" },
              { icon: CheckCircle2, label: "Sem contrato" },
            ].map((badge) => (
              <div key={badge.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <badge.icon className="h-3.5 w-3.5 text-primary/70" />
                {badge.label}
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Right panel — Login form */}
      <div className="relative flex flex-1 items-center justify-center p-4 sm:p-8">
        {/* Mobile gradient orb */}
        <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] rounded-full bg-primary/8 blur-[100px] pointer-events-none lg:hidden" />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-sm space-y-6"
        >
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-2">
            <span className="text-xl font-semibold tracking-tight">
              W3 <span className="text-gradient">SaaS</span>
            </span>
          </div>

          {/* Form header */}
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight">Bem-vindo de volta</h2>
            <p className="text-sm text-muted-foreground">
              Entre com suas credenciais para acessar a plataforma.
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
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
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password">Senha</Label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  required
                  disabled={loading}
                  className="h-11 pr-10"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-11 gap-2 text-base" disabled={loading}>
              {loading ? "Entrando..." : (
                <>Entrar <ArrowRight className="h-4 w-4" /></>
              )}
            </Button>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setForgotMode(true);
                setError(null);
                setForgotSent(false);
                setForgotEmail(loginData.email);
              }}
              className="text-sm text-primary hover:underline font-medium"
            >
              Esqueci minha senha
            </button>
          </div>

          {forgotMode && (
            <div className="border-t border-border pt-4 space-y-3">
              {forgotSent ? (
                <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
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
                    className="h-11"
                  />
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1 h-10" disabled={loading}>
                      {loading ? "Enviando..." : "Enviar link"}
                    </Button>
                    <Button type="button" variant="outline" className="h-10" onClick={() => setForgotMode(false)}>
                      Cancelar
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          <div className="text-center text-sm text-muted-foreground pt-2">
            <p>Ainda não tem uma conta?</p>
            <a href="/checkout" className="text-primary hover:underline font-medium">
              Assine agora
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
