import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { 
  ArrowLeft, 
  ClipboardList,
  LogOut, 
  Settings, 
  Store,
  Users 
} from "lucide-react";

interface AdminLayoutProps {
  children: ReactNode;
}

const adminLinks = [
  { href: "/admin", label: "Usuários", icon: Users },
  { href: "/admin/modulos", label: "Módulos", icon: Settings },
  { href: "/admin/plano-acao", label: "Plano de Ação", icon: ClipboardList },
  { href: "/admin/marcas", label: "Marcas", icon: Store },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card shrink-0">
        <div className="flex h-14 items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <Link to="/app">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Voltar ao App</span>
              </Button>
            </Link>
            <div className="h-6 w-px bg-border hidden sm:block" />
            <h1 className="text-lg font-semibold">Admin</h1>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground md:inline">
              {user?.email}
            </span>
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex gap-1 border-t px-4 py-2 lg:px-6 overflow-x-auto">
          {adminLinks.map((link) => (
            <Link key={link.href} to={link.href}>
              <Button
                variant={location.pathname === link.href ? "secondary" : "ghost"}
                size="sm"
                className="gap-2 whitespace-nowrap"
              >
                <link.icon className="h-4 w-4" />
                <span className="hidden xs:inline">{link.label}</span>
              </Button>
            </Link>
          ))}
        </nav>
      </header>

      {/* Content */}
      <main className="flex-1 p-4 lg:p-6 overflow-auto">
        <div className="max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
