import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart3, Calculator, Calendar, Brain, Users, GraduationCap, ArrowRight, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";

const features = [
  { icon: BarChart3, title: "Dashboard de Métricas", description: "Acompanhe seus KPIs diários com gráficos interativos e visão consolidada" },
  { icon: Calculator, title: "Precificadora", description: "Calcule preços, margens e projeções com precisão profissional" },
  { icon: Calendar, title: "Calendário Comercial", description: "Planeje suas campanhas com datas importantes do e-commerce" },
  { icon: Brain, title: "IA W3", description: "Assistente inteligente treinado para otimizar seu e-commerce" },
  { icon: Users, title: "CRM Influenciadores", description: "Gerencie parcerias com influenciadores de forma organizada" },
  { icon: GraduationCap, title: "Mentoria AMES", description: "Acesso exclusivo a conteúdo educacional e hotseats" },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
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
        <div className="absolute inset-0 dot-pattern opacity-40" />
        <div className="relative container mx-auto px-4 sm:px-6 py-24 sm:py-32 text-center">
          <motion.div {...fadeUp} className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight" style={{ letterSpacing: '-0.035em' }}>
              Plataforma completa para{" "}
              <span className="text-gradient">e-commerce</span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Ferramentas exclusivas para donos de e-commerce que faturam acima de R$30.000/mês.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button size="lg" onClick={() => navigate("/checkout")} className="gap-2 px-8">
                Começar agora <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="lg" onClick={() => navigate("/auth")} className="px-8">
                Fazer login
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 sm:px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <p className="metric-label text-primary mb-2">Ferramentas</p>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight" style={{ letterSpacing: '-0.02em' }}>
            O que você terá acesso
          </h2>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="group relative rounded-xl border border-border bg-card p-6 card-hover"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/8 flex items-center justify-center mb-4 group-hover:bg-primary/12 transition-colors">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-[15px] font-semibold text-foreground mb-1.5">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border">
        <div className="container mx-auto px-4 sm:px-6 py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-md mx-auto space-y-6"
          >
            <h2 className="text-2xl font-semibold tracking-tight">Pronto para escalar?</h2>
            <p className="text-muted-foreground">
              Acesse agora todas as ferramentas exclusivas da W3.
            </p>
            <Button size="lg" onClick={() => navigate("/checkout")} className="px-8">
              Assinar agora
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">
          © 2026 W3 SaaS. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
