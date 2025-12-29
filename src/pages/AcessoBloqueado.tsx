import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { AlertCircle, CreditCard, LogOut, Mail } from "lucide-react";

export default function AcessoBloqueado() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  
  const reason = location.state?.reason || "Acesso não autorizado";

  const getIcon = () => {
    switch (reason) {
      case "Acesso suspenso":
        return <AlertCircle className="h-12 w-12 text-destructive" />;
      case "Assinatura expirada":
      case "Pagamento necessário":
        return <CreditCard className="h-12 w-12 text-warning" />;
      default:
        return <AlertCircle className="h-12 w-12 text-muted-foreground" />;
    }
  };

  const getMessage = () => {
    switch (reason) {
      case "Acesso suspenso":
        return "Seu acesso foi suspenso. Entre em contato com o suporte para mais informações.";
      case "Assinatura expirada":
        return "Sua assinatura expirou. Renove para continuar acessando a plataforma.";
      case "Pagamento necessário":
        return "É necessário uma assinatura ativa para acessar a plataforma.";
      default:
        return "Você não tem permissão para acessar esta área.";
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const handleRenew = () => {
    navigate("/checkout");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            {getIcon()}
          </div>
          <CardTitle className="text-xl">{reason}</CardTitle>
          <CardDescription>
            {getMessage()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {user && (
            <p className="text-sm text-muted-foreground">
              Logado como: {user.email}
            </p>
          )}

          {(reason === "Assinatura expirada" || reason === "Pagamento necessário") && (
            <Button className="w-full" onClick={handleRenew}>
              <CreditCard className="mr-2 h-4 w-4" />
              Renovar assinatura
            </Button>
          )}

          {reason === "Acesso suspenso" && (
            <Button variant="outline" className="w-full" asChild>
              <a href="mailto:suporte@w3.com">
                <Mail className="mr-2 h-4 w-4" />
                Contatar suporte
              </a>
            </Button>
          )}

          <Button variant="ghost" className="w-full" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair da conta
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
