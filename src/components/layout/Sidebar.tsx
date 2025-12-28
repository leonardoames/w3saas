import { useState } from "react";
import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard,
  GraduationCap,
  ListChecks,
  Calculator,
  GitCompare,
  Sparkles,
  Store,
  ShoppingBag,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    path: "/",
  },
  {
    title: "Aulas da Mentoria",
    icon: GraduationCap,
    path: "/aulas",
  },
  {
    title: "Plano de Ação",
    icon: ListChecks,
    path: "/plano-acao",
  },
  {
    title: "Calculadora",
    icon: Calculator,
    path: "/calculadora",
  },
  {
    title: "Simulação de Cenários",
    icon: GitCompare,
    path: "/simulacao",
  },
  {
    title: "CRM de Influenciadores",
    icon: Users,
    path: "/crm-influenciadores",
  },
  {
    title: "IA W3",
    icon: Sparkles,
    path: "/ia-w3",
  },
  {
    title: "Catálogo de Marcas",
    icon: Store,
    path: "/catalogo",
  },
  {
    title: "Soluções da W3",
    icon: ShoppingBag,
    path: "/produtos",
  },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const [isHovering, setIsHovering] = useState(false);

  const isExpanded = !isCollapsed || isHovering;

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen border-r border-sidebar-border bg-sidebar-background transition-all duration-300",
          isExpanded ? "w-64" : "w-16"
        )}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className={cn(
            "flex h-16 items-center border-b border-sidebar-border",
            isExpanded ? "px-6 justify-between" : "px-2 justify-center"
          )}>
            {isExpanded ? (
              <>
                <h1 className="text-xl font-bold text-sidebar-primary whitespace-nowrap">SaaS da W3</h1>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onToggle}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onToggle}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Menu Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto p-2">
            {menuItems.map((item) => (
              isExpanded ? (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className="text-base whitespace-nowrap">{item.title}</span>
                </NavLink>
              ) : (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>
                    <NavLink
                      to={item.path}
                      className="flex items-center justify-center rounded-lg p-3 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.title}
                  </TooltipContent>
                </Tooltip>
              )
            ))}
          </nav>

          {/* User info placeholder */}
          <div className={cn(
            "border-t border-sidebar-border",
            isExpanded ? "p-4" : "p-2"
          )}>
            {isExpanded ? (
              <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <span className="text-sm font-semibold">U</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-sidebar-foreground">Usuário</p>
                  <p className="text-xs text-muted-foreground">Mentorado</p>
                </div>
              </div>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center rounded-lg bg-sidebar-accent p-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <span className="text-xs font-semibold">U</span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="font-medium">Usuário</p>
                  <p className="text-xs text-muted-foreground">Mentorado</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}