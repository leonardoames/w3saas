import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, CheckCircle, CreditCard, Loader2, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  priceId: string;
  popular: boolean;
  savings?: string;
}

// Stripe price IDs
const PLANS: Record<string, Plan> = {
  monthly: {
    id: "monthly",
    name: "Mensal",
    price: "R$ 97",
    period: "/mês",
    priceId: "price_1SjVkh2NvVXBdGxmE088mmWW",
    popular: false,
  },
  quarterly: {
    id: "quarterly",
    name: "Trimestral",
    price: "R$ 247",
    period: "/3 meses",
    priceId: "price_1SjVkh2NvVXBdGxmEQizPOjc",
    popular: true,
    savings: "Economize 15%",
  },
  semiannual: {
    id: "semiannual",
    name: "Semestral",
    price: "R$ 397",
    period: "/6 meses",
    priceId: "price_1SjVkh2NvVXBdGxmif7YRcNt",
    popular: false,
    savings: "Economize 32%",
  },
};

const FEATURES = [
  "Dashboard de métricas",
  "Calculadoras e simuladores",
  "IA W3 para copies",
  "Calendário comercial",
  "CRM de influenciadores",
];

export default function Checkout() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<keyof typeof PLANS>("quarterly");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    if (!email) {
      toast({
        title: "Email obrigatório",
        description: "Por favor, insira seu email para continuar.",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({
        title: "Email inválido",
        description: "Por favor, insira um email válido.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const plan = PLANS[selectedPlan];
      
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          email,
          priceId: plan.priceId,
          planType: plan.id,
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error("URL de checkout não retornada");
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast({
        title: "Erro ao iniciar pagamento",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Assinar SaaS da W3</h1>
          <p className="text-muted-foreground">
            Acesso completo a todas as ferramentas para escalar seu e-commerce
          </p>
        </div>

        {/* Plan Selection */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {Object.values(PLANS).map((plan) => (
            <Card
              key={plan.id}
              className={cn(
                "cursor-pointer transition-all relative",
                selectedPlan === plan.id
                  ? "border-primary ring-2 ring-primary"
                  : "hover:border-primary/50"
              )}
              onClick={() => setSelectedPlan(plan.id as keyof typeof PLANS)}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    Mais Popular
                  </span>
                </div>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                {plan.savings && (
                  <span className="text-xs text-primary font-medium">
                    {plan.savings}
                  </span>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Features and Checkout */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">O que está incluso</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {FEATURES.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Checkout Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Finalizar assinatura</CardTitle>
              <CardDescription>
                Você será redirecionado para um pagamento seguro
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Seu email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="rounded-lg border bg-muted/50 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span>Plano {PLANS[selectedPlan].name}</span>
                  <span className="font-medium">
                    {PLANS[selectedPlan].price}{PLANS[selectedPlan].period}
                  </span>
                </div>
              </div>

              <Button
                className="w-full gap-2"
                size="lg"
                onClick={handleCheckout}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Redirecionando...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    Pagar {PLANS[selectedPlan].price}
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Pagamento seguro via Stripe. Cancele quando quiser.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Login link */}
        <p className="text-center mt-6 text-sm text-muted-foreground">
          Já tem uma conta?{" "}
          <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/auth")}>
            Fazer login
          </Button>
        </p>
      </div>
    </div>
  );
}
