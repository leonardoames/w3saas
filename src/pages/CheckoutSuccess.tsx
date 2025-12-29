import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Loader2, PartyPopper } from "lucide-react";
import { z } from "zod";

const passwordSchema = z.object({
  password: z.string().min(6, { message: "Senha deve ter pelo menos 6 caracteres" }).max(100),
  fullName: z.string().trim().min(2, { message: "Nome deve ter pelo menos 2 caracteres" }).max(100),
});

export default function CheckoutSuccess() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [loading, setLoading] = useState(false);
  const [sessionData, setSessionData] = useState<{
    email: string;
    customerId: string;
    subscriptionId: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (!sessionId) {
      toast({
        title: "Sessão inválida",
        description: "Não foi possível verificar o pagamento.",
        variant: "destructive",
      });
      navigate("/checkout");
      return;
    }

    // For now, extract email from URL or use a verification endpoint
    // The Stripe webhook already processed the payment
    // We'll get the customer email from the session
    const getSessionDetails = async () => {
      try {
        // Call a function to verify the session and get customer details
        const { data, error } = await supabase.functions.invoke("verify-checkout-session", {
          body: { sessionId },
        });

        if (error || !data) {
          // If no verification endpoint, we trust the flow
          // User will need to enter their email manually or we parse from webhook
          console.log("Session verification not available, proceeding with form");
          return;
        }

        setSessionData({
          email: data.customerEmail,
          customerId: data.customerId,
          subscriptionId: data.subscriptionId,
        });
      } catch (err) {
        console.log("Could not verify session, proceeding anyway");
      }
    };

    getSessionDetails();
  }, [sessionId, navigate, toast]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const validation = passwordSchema.safeParse({
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

    if (!sessionData?.email) {
      toast({
        title: "Erro",
        description: "Email não encontrado. Por favor, volte ao checkout.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Create user account
      const { data, error } = await supabase.auth.signUp({
        email: sessionData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/app`,
          data: {
            full_name: formData.fullName,
          },
        },
      });

      if (error) throw error;

      // Update profile with Stripe info and paid plan
      if (data.user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            plan_type: "paid",
            access_status: "active",
            full_name: formData.fullName,
            stripe_customer_id: sessionData.customerId,
            stripe_subscription_id: sessionData.subscriptionId,
          })
          .eq("user_id", data.user.id);

        if (profileError) {
          console.error("Error updating profile:", profileError);
        }
      }

      toast({
        title: "Conta criada com sucesso!",
        description: "Bem-vindo à plataforma W3.",
      });

      // Redirect to app
      setTimeout(() => {
        navigate("/app");
      }, 1000);
    } catch (error: any) {
      console.error("Error creating account:", error);
      
      // Check if user already exists
      if (error.message?.includes("already registered")) {
        toast({
          title: "Conta já existe",
          description: "Este email já está cadastrado. Faça login para acessar.",
        });
        setTimeout(() => navigate("/auth"), 2000);
        return;
      }

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
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <PartyPopper className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Pagamento Confirmado!</CardTitle>
            <CardDescription>
              Agora crie sua conta para acessar a plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sessionData?.email && (
              <div className="mb-4 rounded-lg border bg-muted/50 p-3">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span>Email: <strong>{sessionData.email}</strong></span>
                </div>
              </div>
            )}

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
                <Label htmlFor="password">Criar senha</Label>
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

              <Button type="submit" className="w-full" disabled={loading || !sessionData?.email}>
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

            {!sessionData?.email && (
              <p className="mt-4 text-center text-sm text-muted-foreground">
                Carregando dados do pagamento...
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
