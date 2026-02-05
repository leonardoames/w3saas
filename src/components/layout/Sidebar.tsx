import { SidebarNavLink } from "./SidebarNavLink";
import { LayoutDashboard, GraduationCap, ListChecks, Calculator, GitCompare, Sparkles, Brain, Store, ShoppingBag, Users, CalendarDays, ChevronLeft, ChevronRight, X, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
const menuItems = [{
  title: "Dashboard",
  icon: LayoutDashboard,
  path: "/app"
}, {
  title: "Aulas da Mentoria",
  icon: GraduationCap,
  path: "/app/aulas"
}, {
  title: "Plano de Ação",
  icon: ListChecks,
  path: "/app/plano-acao"
}, {
  title: "Calculadora",
  icon: Calculator,
  path: "/app/calculadora"
}, {
  title: "Simulação de Cenários",
  icon: GitCompare,
  path: "/app/simulacao"
}, {
  title: "CRM de Influenciadores",
  icon: Users,
  path: "/app/crm-influenciadores"
}, {
  title: "IA W3",
  icon: Sparkles,
  path: "/app/ia-w3"
}, {
  title: "Calendário Comercial",
  icon: CalendarDays,
  path: "/app/calendario"
}, {
  title: "Catálogo de Marcas",
  icon: Store,
  path: "/app/catalogo"
}, {
  title: "Soluções da W3",
  icon: ShoppingBag,
  path: "/app/produtos"
}];

// Admin-only menu items
const adminMenuItems = [{
  title: "Cérebro IA",
  icon: Brain,
  path: "/app/ia-w3/cerebro"
}];
interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}
export function Sidebar({
  isCollapsed,
  onToggle,
  isMobileOpen,
  onMobileClose
}: SidebarProps) {
  const isMobile = useIsMobile();
  const {
    isAdmin,
    profile
  } = useAuth();
  const isExpanded = isMobile ? true : !isCollapsed;

  // Close mobile menu on navigation
  const handleNavClick = () => {
    if (isMobile) {
      onMobileClose();
    }
  };
  const getUserName = () => {
    return profile?.full_name || "Usuário";
  };
  const getUserInitials = () => {
    if (profile?.full_name) {
      return profile.full_name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
    }
    return "U";
  };
  const getPlanLabel = () => {
    if (profile?.is_mentorado) return "Mentorado";
    if (profile?.is_w3_client) return "Cliente W3";
    if (profile?.plan_type === "paid") return "Plano Pago";
    if (profile?.plan_type === "manual") return "Acesso Manual";
    return "Plano Free";
  };

  // Mobile drawer
  if (isMobile) {
    return <>
        {/* Overlay */}
        <div className={cn("fixed inset-0 z-40 bg-background/80 backdrop-blur-sm transition-opacity", isMobileOpen ? "opacity-100" : "opacity-0 pointer-events-none")} onClick={onMobileClose} />

        {/* Drawer */}
        <aside className={cn("fixed left-0 top-0 z-50 h-screen w-72 border-r border-sidebar-border bg-sidebar-background transition-transform duration-300", isMobileOpen ? "translate-x-0" : "-translate-x-full")}>
          <div className="flex h-full flex-col">
            {/* Logo */}
            <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-6">
              <h1 className="text-xl font-bold text-sidebar-primary">SaaS da W3</h1>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onMobileClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Menu Navigation */}
            <nav className="flex-1 space-y-1 overflow-y-auto p-4">
            {menuItems.map(item => <SidebarNavLink key={item.path} to={item.path} end={item.path === "/app"} onClick={handleNavClick} icon={item.icon} label={item.title} />)}
            
            {isAdmin && adminMenuItems.map(item => <SidebarNavLink key={item.path} to={item.path} onClick={handleNavClick} icon={item.icon} label={item.title} />)}
            
            {isAdmin && <SidebarNavLink to="/admin" onClick={handleNavClick} icon={Shield} label="Admin" />}
            </nav>

            {/* User info */}
            <div className="border-t border-sidebar-border p-4">
              <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <span className="text-sm font-semibold">{getUserInitials()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">{getUserName()}</p>
                  <p className="text-xs text-muted-foreground">{getPlanLabel()}</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </>;
  }

  // Desktop sidebar
  return <TooltipProvider delayDuration={0}>
      <aside className={cn("fixed left-0 top-0 z-40 h-screen border-r border-sidebar-border bg-sidebar-background transition-all duration-300", isExpanded ? "w-64" : "w-16")}>
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className={cn("flex h-16 items-center border-b border-sidebar-border", isExpanded ? "px-6 justify-between" : "px-2 justify-center")}>
            {isExpanded ? <>
                <h1 className="text-xl font-bold text-sidebar-primary whitespace-nowrap"> W3 Saas</h1>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggle}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </> : <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggle}>
                <ChevronRight className="h-4 w-4" />
              </Button>}
          </div>

          {/* Menu Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto p-2">
            {menuItems.map(item => isExpanded ? <SidebarNavLink key={item.path} to={item.path} end={item.path === "/app"} icon={item.icon} label={item.title} /> : <Tooltip key={item.path}>
                  <TooltipTrigger asChild>
                    <div>
                      <SidebarNavLink to={item.path} end={item.path === "/app"} icon={item.icon} label={item.title} isCollapsed />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.title}
                  </TooltipContent>
                </Tooltip>)}
            
            {isAdmin && adminMenuItems.map(item => isExpanded ? <SidebarNavLink key={item.path} to={item.path} icon={item.icon} label={item.title} /> : <Tooltip key={item.path}>
                  <TooltipTrigger asChild>
                    <div>
                      <SidebarNavLink to={item.path} icon={item.icon} label={item.title} isCollapsed />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.title}
                  </TooltipContent>
                </Tooltip>)}
            
            {isAdmin && (isExpanded ? <SidebarNavLink to="/admin" icon={Shield} label="Admin" /> : <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <SidebarNavLink to="/admin" icon={Shield} label="Admin" isCollapsed />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    Admin
                  </TooltipContent>
                </Tooltip>)}
          </nav>

          {/* User info */}
          <div className={cn("border-t border-sidebar-border", isExpanded ? "p-4" : "p-2")}>
            {isExpanded ? <div className="flex items-center gap-3 rounded-lg px-4 py-3 bg-[#242424]">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <span className="text-sm font-semibold">{getUserInitials()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{getUserName()}</p>
                  <p className="text-xs text-white">{getPlanLabel()}</p>
                </div>
              </div> : <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center rounded-lg bg-sidebar-accent p-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <span className="text-xs font-semibold">{getUserInitials()}</span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="font-medium">{getUserName()}</p>
                  <p className="text-xs text-muted-foreground">{getPlanLabel()}</p>
                </TooltipContent>
              </Tooltip>}
          </div>
        </div>
      </aside>
    </TooltipProvider>;
}