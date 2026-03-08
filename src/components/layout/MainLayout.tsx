import { Sidebar } from "./Sidebar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { WhatsAppFloatingButton } from "./WhatsAppFloatingButton";
import { useAuth } from "@/contexts/AuthContext";

interface MainLayoutProps {
  children: React.ReactNode;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
}

export function MainLayout({ children }: MainLayoutProps) {
  const [user, setUser] = useState<any>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const { profile } = useAuth();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);

  const firstName = profile?.full_name?.split(" ")[0] || "você";

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={toggleSidebar}
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />
      <main className={cn(
        "flex-1 transition-all duration-300 w-full",
        !isMobile && (isSidebarCollapsed ? "ml-16" : "ml-64")
      )}>
        {user && (
          <div className="sticky top-0 z-30 glass border-b border-border/60">
            <div className="flex items-center justify-between gap-4 px-4 lg:px-8 py-2.5">
              <div className="flex items-center gap-3">
                {isMobile && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsMobileMenuOpen(true)}>
                    <Menu className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground hidden sm:block">
                  {getGreeting()}, <span className="text-foreground font-medium">{firstName}</span>
                </span>
                <ThemeToggle />
                <UserMenu />
              </div>
            </div>
          </div>
        )}
        <div className="p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto">
          {children}
        </div>
        <WhatsAppFloatingButton />
      </main>
    </div>
  );
}
