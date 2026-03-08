import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  BarChart3, Calculator, Calendar, Brain, Users, GraduationCap,
  ArrowRight, CheckCircle2, Shield, Headphones, Star, TrendingUp,
  Clock, Target
} from "lucide-react";
import { motion } from "motion/react";

import shopeeImg from "@/assets/platforms/shopee.png";
import shopifyImg from "@/assets/platforms/shopify.png";
import nuvemshopImg from "@/assets/platforms/nuvemshop.png";
import olistImg from "@/assets/platforms/olist-tiny.png";
import trayImg from "@/assets/platforms/tray.png";
import mercadoLivreImg from "@/assets/platforms/mercado-livre.png";

const features = [
  {
    icon: BarChart3, title: "Dashboard de Métricas",
    description: "Acompanhe seus KPIs diários com gráficos interativos e visão consolidada.",
    benefits: ["Dados em tempo real", "Relatórios automáticos"],
  },
  {
    icon: Calculator, title: "Precificadora Inteligente",
    description: "Calcule preços, margens e projeções com precisão profissional.",
    benefits: ["Margem ideal calculada", "Simulação de cenários"],
  },
  {
    icon: Calendar, title: "Calendário Comercial",
    description: "Planeje suas campanhas com datas importantes do e-commerce.",
    benefits: ["Alertas automáticos", "Planejamento anual"],
  },
  {
    icon: Brain, title: "IA W3",
    description: "Assistente inteligente treinado para otimizar seu e-commerce.",
    benefits: ["Respostas contextuais", "Análise de dados"],
  },
  {
    icon: Users, title: "CRM Influenciadores",
    description: "Gerencie parcerias com influenciadores de forma organizada.",
    benefits: ["Pipeline visual", "Métricas de ROI"],
  },
  {
    icon: GraduationCap, title: "Mentoria AMES",
    description: "Acesso exclusivo a conteúdo educacional e hotseats.",
    benefits: ["Aulas gravadas", "Comunidade exclusiva"],
  },
];

const stats = [
  { value: "+500", label: "e-commerces", icon: Users },
  { value: "R$50M+", label: "gerenciados", icon: TrendingUp },
  { value: "4.9★", label: "satisfação", icon: Star },
];

const resultMetrics = [
  { value: "+18%", label: "margem média", description: "Aumento médio na margem de lucro dos mentorados", icon: TrendingUp },
  { value: "2h/dia", label: "economizados", description: "Tempo médio economizado com automações e dashboards", icon: Clock },
  { value: "3.5x", label: "ROAS médio", description: "Retorno sobre investimento em mídia paga dos clientes", icon: Target },
];

const platformLogos = [
  { src: shopeeImg, alt: "Shopee" },
  { src: shopifyImg, alt: "Shopify" },
  { src: nuvemshopImg, alt: "Nuvemshop" },
  { src: olistImg, alt: "Olist Tiny" },
  { src: trayImg, alt: "Tray" },
  { src: mercadoLivreImg, alt: "Mercado Livre" },
];

const trustBadges = [
  { icon: Shield, label: "Sem contrato" },
  { icon: CheckCircle2, label: "Cancele quando quiser" },
  { icon: Headphones, label: "Suporte dedicado" },
];

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } },
};

export default function Landing() {
  const navigate = useNavigate();
  const { user, hasAccess, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user && hasAccess) navigate("/app");
  }, [user, hasAccess, isLoading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass">
        <div className="container mx-auto flex h-14 items-center justify-between px-4 sm:px-6">
          <span className="text-lg font-semibold tracking-tight">
            W3 <span className="text-gradient">SaaS</span>
          </span>
          <Button variant="outline" size="sm" onClick={() => navigate("/auth")} className="text-xs">
            Já tenho conta
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute top-[-20%] left-[10%] w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[5%] w-[400px] h-[400px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />
        <div className="absolute inset-0 dot-pattern opacity-30" />

        <div className="relative container mx-auto px-4 sm:px-6 pt-20 sm:pt-28 pb-16 text-center">
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="max-w-3xl mx-auto space-y-6"
          >
            {/* Badge */}
            <motion.div variants={fadeUp}>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
                🚀 Plataforma #1 para e-commerces
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeUp}
              className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.1]"
              style={{ letterSpacing: "-0.035em" }}
            >
              Gerencie seu e-commerce{" "}
              <span className="text-gradient">como um profissional</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p variants={fadeUp} className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Ferramentas exclusivas para donos de e-commerce que faturam acima de R$30.000/mês. Dashboards, IA, precificação e muito mais.
            </motion.p>

            {/* Social proof pills */}
            <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              {stats.map((s) => (
                <div key={s.label} className="flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2">
                  <s.icon className="h-3.5 w-3.5 text-primary" />
                  <span className="text-sm font-semibold tabular-nums text-foreground">{s.value}</span>
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
              ))}
            </motion.div>

            {/* CTAs */}
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Button
                size="lg"
                onClick={() => navigate("/checkout")}
                className="gap-2 px-10 text-base shadow-[0_0_24px_hsl(var(--primary)/0.25)]"
              >
                Começar agora <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="lg" onClick={() => navigate("/auth")} className="px-10 text-base">
                Fazer login
              </Button>
            </motion.div>
          </motion.div>

          {/* Mock dashboard card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative mt-16 mx-auto max-w-3xl"
          >
            <div className="rounded-xl border border-border bg-card/80 backdrop-blur-xl p-6 sm:p-8 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="metric-label text-primary mb-1">Dashboard</p>
                  <p className="text-lg font-semibold text-foreground">Visão Geral</p>
                </div>
                <div className="flex gap-2">
                  {["Hoje", "7d", "30d"].map((p) => (
                    <span key={p} className={`text-xs px-3 py-1.5 rounded-md font-medium ${p === "30d" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {p}
                    </span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Faturamento", value: "R$127.450", change: "+12%" },
                  { label: "Pedidos", value: "1.847", change: "+8%" },
                  { label: "Ticket Médio", value: "R$68,90", change: "+3%" },
                  { label: "ROAS", value: "3.5x", change: "+15%" },
                ].map((m) => (
                  <div key={m.label} className="rounded-lg border border-border bg-background/50 p-3 sm:p-4">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">{m.label}</p>
                    <p className="text-lg sm:text-xl font-semibold tabular-nums text-foreground">{m.value}</p>
                    <p className="text-xs font-medium text-[hsl(var(--success))] mt-0.5">{m.change}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Glow underneath */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-2/3 h-8 bg-primary/10 blur-2xl rounded-full" />
          </motion.div>
        </div>
      </section>

      {/* Platform logos */}
      <section className="border-t border-border bg-card/30">
        <div className="container mx-auto px-4 sm:px-6 py-10">
          <p className="text-center text-xs text-muted-foreground uppercase tracking-widest mb-6">
            Integrado com as maiores plataformas
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
            {platformLogos.map((logo) => (
              <img
                key={logo.alt}
                src={logo.src}
                alt={logo.alt}
                className="h-7 sm:h-8 object-contain opacity-40 grayscale hover:opacity-80 hover:grayscale-0 transition-all duration-300"
              />
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 sm:px-6 py-20 sm:py-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <p className="metric-label text-primary mb-2">Ferramentas</p>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight" style={{ letterSpacing: "-0.02em" }}>
            Tudo que você precisa em um só lugar
          </h2>
          <p className="text-muted-foreground mt-3 max-w-lg mx-auto text-sm">
            Seis módulos projetados para donos de e-commerce que querem crescer com dados e estratégia.
          </p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="group relative rounded-xl border border-border bg-card p-6 card-hover hover:border-primary/20"
            >
              {/* Number badge */}
              <span className="absolute top-4 right-4 text-[11px] font-mono font-semibold text-muted-foreground/40">
                {String(i + 1).padStart(2, "0")}
              </span>

              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-[15px] font-semibold text-foreground mb-1.5">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">{feature.description}</p>

              <div className="space-y-1.5">
                {feature.benefits.map((b) => (
                  <div key={b} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Results metrics */}
      <section className="border-t border-border bg-card/30">
        <div className="container mx-auto px-4 sm:px-6 py-20 sm:py-24">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <p className="metric-label text-primary mb-2">Resultados reais</p>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight" style={{ letterSpacing: "-0.02em" }}>
              Números que comprovam
            </h2>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-3 max-w-3xl mx-auto">
            {resultMetrics.map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="relative rounded-xl border border-border bg-card p-6 text-center overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] to-transparent pointer-events-none" />
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <m.icon className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-3xl sm:text-4xl font-bold text-gradient tabular-nums">{m.value}</p>
                  <p className="text-sm font-semibold text-foreground mt-1">{m.label}</p>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{m.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-primary/8 blur-[100px] rounded-full pointer-events-none" />
        <div className="relative container mx-auto px-4 sm:px-6 py-20 sm:py-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-md mx-auto space-y-6"
          >
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Pronto para escalar?</h2>
            <p className="text-muted-foreground">
              Acesse agora todas as ferramentas exclusivas da W3 e leve seu e-commerce ao próximo nível.
            </p>
            <Button
              size="lg"
              onClick={() => navigate("/checkout")}
              className="px-10 text-base shadow-[0_0_24px_hsl(var(--primary)/0.25)]"
            >
              Assinar agora
            </Button>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              {trustBadges.map((b) => (
                <div key={b.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <b.icon className="h-3.5 w-3.5 text-primary/60" />
                  <span>{b.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
            <div>
              <span className="text-lg font-semibold tracking-tight">
                W3 <span className="text-gradient">SaaS</span>
              </span>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Plataforma completa para e-commerces que querem crescer com dados.
              </p>
            </div>
            {[
              { title: "Produto", links: ["Dashboard", "Precificadora", "IA W3", "Calendário"] },
              { title: "Recursos", links: ["Mentoria", "CRM", "Integrações", "Simulador"] },
              { title: "Suporte", links: ["Contato", "FAQ", "Termos", "Privacidade"] },
            ].map((col) => (
              <div key={col.title}>
                <p className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">{col.title}</p>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link} className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                      {link}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-6 text-center text-xs text-muted-foreground">
            © 2026 W3 SaaS. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
