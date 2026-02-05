import { Sidebar } from "./Sidebar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
interface MainLayoutProps {
  children: React.ReactNode;
}
export function MainLayout({
  children
}: MainLayoutProps) {
  const [user, setUser] = useState<any>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  useEffect(() => {
    // Verificar usuário atual
    const checkUser = async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      setUser(user);
    };
    checkUser();

    // Listener para mudanças de autenticação
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);
  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };
  return <div className="flex min-h-screen bg-background">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} isMobileOpen={isMobileMenuOpen} onMobileClose={() => setIsMobileMenuOpen(false)} />
      <main className={cn("flex-1 transition-all duration-300 w-full", !isMobile && (isSidebarCollapsed ? "ml-16" : "ml-64"))}>
        {user && <div className="sticky top-0 z-30 border-b lg:px-8 bg-neutral-900 text-neutral-900 border-neutral-900 px-[20px] py-[8px]">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {isMobile && <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setIsMobileMenuOpen(true)}>
                    <Menu className="h-5 w-5" />
                  </Button>}
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <UserMenu />
              </div>
            </div>
          </div>}
        <div className="p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>;
}