import { Sidebar } from "./Sidebar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Verificar usuário atual
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };

    checkUser();

    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
    navigate("/auth");
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64 flex-1">
        {user && (
          <div className="border-b bg-card px-6 py-3 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{user.email}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        )}
        <div className="container mx-auto p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
