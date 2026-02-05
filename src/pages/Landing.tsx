import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart3, Calculator, Calendar, Brain, Users, GraduationCap, CheckCircle, ArrowRight } from "lucide-react";
const features = [{
  icon: BarChart3,
  title: "Dashboard de Métricas",
  description: "Acompanhe suas métricas diárias de e-commerce"
}, {
  icon: Calculator,
  title: "Calculadora",
  description: "Calcule preços, margens e projeções"
}, {
  icon: Calendar,
  title: "Calendário Comercial",
  description: "Planeje suas campanhas com datas importantes"
}, {
  icon: Brain,
  title: "IA W3",
  description: "Assistente de IA para copies e estratégias"
}, {
  icon: Users,
  title: "CRM Influenciadores",
  description: "Gerencie parcerias com influenciadores"
}, {
  icon: GraduationCap,
  title: "Aulas da Mentoria",
  description: "Acesso exclusivo a conteúdo educacional"
}];
export default function Landing() {
  const navigate = useNavigate();
  const {
    user,
    hasAccess,
    isLoading
  } = useAuth();
  useEffect(() => {
    if (!isLoading && user && hasAccess) {
      navigate("/app");
    }
  }, [user, hasAccess, isLoading, navigate]);
  const handleCheckout = () => {
    navigate("/checkout");
  };
  const handleLogin = () => {
    navigate("/auth");
  };
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <h1 className="text-xl font-bold text-primary"> ​W3 App   </h1>
          <Button variant="outline" onClick={handleLogin}>
            Já tenho conta
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Plataforma completa para
          <span className="text-primary"> e-commerce</span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          Ferramentas exclusivas para donos de e-commerce que faturam acima de R$30.000/mês. 
          Dashboard, calculadoras, IA e muito mais.
        </p>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button size="lg" onClick={handleCheckout} className="gap-2">
            Começar agora <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <h3 className="mb-8 text-center text-2xl font-bold text-secondary">O que você terá acesso</h3>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map(feature => <Card key={feature.title} className="bg-card">
              <CardHeader>
                <feature.icon className="h-8 w-8 text-primary" />
                <CardTitle className="mt-4">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{feature.description}</CardDescription>
              </CardContent>
            </Card>)}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t py-16 bg-[#ebebeb]">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-2xl font-bold text-secondary-foreground">Pronto para escalar seu e-commerce?</h3>
          <p className="mt-2 text-muted-foreground">
            Acesse agora todas as ferramentas exclusivas da W3.
          </p>
          <Button size="lg" onClick={handleCheckout} className="mt-6">
            Assinar agora
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">© 2026 W3 App. Todos os direitos reservados.</div>
      </footer>
    </div>;
}