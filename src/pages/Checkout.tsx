import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, CheckCircle, CreditCard, Loader2 } from "lucide-react";
import { z } from "zod";

const signupSchema = z.object({
  email: z.string().trim().email({ message: "Email inválido" }).max(255),
  password: z.string().min(6, { message: "Senha deve ter pelo menos 6 caracteres" }).max(100),
  fullName: z.string().trim().min(2, { message: "Nome deve ter pelo menos 2 caracteres" }).max(100),
});

export default function Checkout() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<'payment' | 'account'>('payment');
  const [loading, setLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
  });

  // Simulate payment for now - will be replaced with Stripe
  const handlePayment = async () => {
    setLoading(true);
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setPaymentSuccess(true);
    setStep('account');
    setLoading(false);
    
    toast({
      title: "Pagamento aprovado!",
      description: "Agora crie sua conta para acessar a plataforma.",
    });
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    const validation = signupSchema.safeParse({
      email: formData.email,
      password: formData.password,
      fullName: formData.fullName,
    });

    if (!validation.success) {
      toast({
        title: "Erro de validação",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/app`,
          data: {
            full_name: formData.fullName,
          },
        },
      });

      if (error) throw error;

      // Update profile with paid plan
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            plan_type: 'paid',
            full_name: formData.fullName,
          })
          .eq('user_id', data.user.id);

        if (profileError) {
          console.error('Error updating profile:', profileError);
        }
      }

      toast({
        title: "Conta criada com sucesso!",
        description: "Você será redirecionado para a plataforma.",
      });

      // Small delay to let auth state propagate
      setTimeout(() => {
        navigate("/app");
      }, 1000);

    } catch (error: any) {
      toast({
        title: "Erro ao criar conta",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        {step === 'payment' && (
          <Card>
            <CardHeader>
              <CardTitle>Assinar SaaS da W3</CardTitle>
              <CardDescription>
                Acesso completo a todas as ferramentas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Plano Mensal</span>
                  <span className="text-2xl font-bold">R$ 97/mês</span>
                </div>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Dashboard de métricas
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Calculadoras e simuladores
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    IA W3 para copies
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Calendário comercial
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    CRM de influenciadores
                  </li>
                </ul>
              </div>

              <Button 
                className="w-full gap-2" 
                size="lg"
                onClick={handlePayment}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    Pagar R$ 97,00
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Pagamento seguro. Cancele quando quiser.
              </p>
            </CardContent>
          </Card>
        )}

        {step === 'account' && (
          <Card>
            <CardHeader>
              <div className="mb-2 flex items-center gap-2 text-primary">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-medium">Pagamento confirmado</span>
              </div>
              <CardTitle>Criar sua conta</CardTitle>
              <CardDescription>
                Preencha seus dados para acessar a plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome completo</Label>
                  <Input
                    id="fullName"
                    placeholder="Seu nome"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    "Criar conta e acessar"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
