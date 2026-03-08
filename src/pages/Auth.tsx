import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle, Lock, CheckCircle2, ArrowRight, Mail,
  BarChart3, Calculator, Brain, Star, Quote, Users, TrendingUp
} from "lucide-react";
import { motion } from "motion/react";

/* ──────────────────────────── helpers ──────────────────────────── */

const ease = [0.22, 1, 0.36, 1] as const;
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.12 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease } },
};

const stats = [
  { value: "+500", label: "e-commerces", icon: Users },
  { value: "R$50M+", label: "gerenciados", icon: TrendingUp },
  { value: "4.9/5", label: "satisfação", icon: Star },
];

const features = [
  {
    icon: BarChart3,
    title: "Dashboard Inteligente",
    desc: "Métricas em tempo real com visão consolidada de todos os canais.",
  },
  {
    icon: Calculator,
    title: "Precificadora & Simulador",
    desc: "Calcule margens e simule cenários antes de tomar decisões.",
  },
  {
    icon: Brain,
    title: "IA Treinada",
    desc: "Assistente com contexto do seu negócio para respostas precisas.",
  },
];

/* ──────────────────────────── component ──────────────────────────── */

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

  /* ── session check ── */
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

  /* ── handlers (unchanged logic) ── */
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

  /* ──────────────── Left Branding Panel ──────────────── */
  const BrandingPanel = () => (
    <div className="hidden lg:flex lg:w-[48%] relative overflow-hidden items-center justify-center p-10 xl:p-14">
      {/* Deep dark gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(220,16%,4%)] via-[hsl(220,16%,6%)] to-[hsl(27,30%,8%)]" />

      {/* Animated gradient orb */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,hsl(27,92%,52%/0.12)_0%,transparent_70%)] blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[300px] h-[300px] rounded-full bg-[radial-gradient(circle,hsl(27,99%,65%/0.08)_0%,transparent_70%)] blur-3xl pointer-events-none" />

      {/* Dot pattern */}
      <div className="absolute inset-0 dot-pattern opacity-20" />

      {/* Content */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="relative z-10 max-w-md w-full space-y-8"
      >
        {/* Logo */}
        <motion.div variants={fadeUp}>
          <h1 className="text-3xl font-semibold text-white tracking-tight" style={{ letterSpacing: '-0.03em' }}>
            W3 <span className="text-gradient">SaaS</span>
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-white/40">
            A plataforma completa para e-commerces que faturam acima de R$30k/mês.
          </p>
        </motion.div>

        {/* Stats pills */}
        <motion.div variants={fadeUp} className="flex gap-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] backdrop-blur-sm"
            >
              <s.icon className="h-3.5 w-3.5 text-primary/70" />
              <div className="leading-none">
                <span className="text-[13px] font-semibold text-white tabular-nums">{s.value}</span>
                <span className="text-[11px] text-white/35 ml-1">{s.label}</span>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Feature cards */}
        <motion.div variants={fadeUp} className="space-y-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group flex items-start gap-3.5 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-300"
            >
              <div className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                <f.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-white/90">{f.title}</p>
                <p className="text-[12px] text-white/35 leading-relaxed mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Testimonial */}
        <motion.div
          variants={fadeUp}
          className="relative p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]"
        >
          <Quote className="absolute top-3 right-3 h-5 w-5 text-primary/15" />
          <p className="text-[13px] text-white/50 leading-relaxed italic">
            "Desde que comecei a usar o W3 SaaS, consegui aumentar minha margem em 18% e reduzir o tempo gasto em planilhas pela metade."
          </p>
          <div className="flex items-center gap-2.5 mt-3">
            <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center">
              <span className="text-[11px] font-semibold text-primary">MR</span>
            </div>
            <div>
              <p className="text-[12px] font-medium text-white/70">Marcos R.</p>
              <p className="text-[11px] text-white/30">E-commerce de moda — R$120k/mês</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );

  /* ──────────────── Form wrapper ──────────────── */
  const formCard = (content: React.ReactNode) => (
    <div className="min-h-screen flex">
      <BrandingPanel />

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="w-full max-w-[380px] space-y-8"
        >
          {/* Mobile logo */}
          <div className="lg:hidden text-center space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              W3 <span className="text-gradient">SaaS</span>
            </h1>
            <p className="text-xs text-muted-foreground">Plataforma para e-commerces</p>
          </div>
          {content}
        </motion.div>
      </div>
    </div>
  );

  /* ──────────────── Change password view ──────────────── */
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
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
              <Input id="new-password" type="password" placeholder="••••••••" value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)} required disabled={loading} minLength={6}
                className="pl-9" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password" className="text-xs font-medium text-muted-foreground">Confirmar nova senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
              <Input id="confirm-password" type="password" placeholder="••••••••" value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)} required disabled={loading} minLength={6}
                className="pl-9" />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Salvando..." : "Definir Nova Senha"}
          </Button>
        </form>
      </>
    );
  }

  /* ──────────────── Login view ──────────────── */
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
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
            <Input id="login-email" type="email" placeholder="seu@email.com" value={loginData.email}
              onChange={(e) => setLoginData({ ...loginData, email: e.target.value })} required disabled={loading}
              className="pl-9" />
          </div>
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
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
            <Input id="login-password" type="password" placeholder="••••••••" value={loginData.password}
              onChange={(e) => setLoginData({ ...loginData, password: e.target.value })} required disabled={loading}
              className="pl-9" />
          </div>
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
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                <Input id="forgot-email" type="email" placeholder="seu@email.com" value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)} required disabled={loading}
                  className="pl-9" />
              </div>
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

      {/* Divider + CTA */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
        <div className="relative flex justify-center text-xs"><span className="bg-background px-3 text-muted-foreground/60">ou</span></div>
      </div>

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
