import { SidebarNavLink } from "./SidebarNavLink";
import {
  LayoutDashboard, GraduationCap, ListChecks, Calculator, GitCompare,
  Sparkles, Brain, Store, ShoppingBag, CalendarDays, ChevronLeft,
  ChevronRight, X, Shield, ChevronDown, BarChart3, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation } from "react-router-dom";
import { LucideIcon } from "lucide-react";

interface MenuItem {
  title: string;
  icon: LucideIcon;
  path: string;
  adminOnly?: boolean;
}

interface MenuGroup {
  title: string;
  icon: LucideIcon;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    title: "Meu E-commerce",
    icon: LayoutDashboard,
    items: [
      { title: "Dashboard", icon: LayoutDashboard, path: "/app" },
      { title: "Acompanhamento Diário", icon: BarChart3, path: "/app/acompanhamento" },
      { title: "Plano de Ação", icon: ListChecks, path: "/app/plano-acao" },
      { title: "Integrações", icon: Activity, path: "/app/integracoes" },
      { title: "Dash Admin", icon: Activity, path: "/app/dash-admin", adminOnly: true },
    ],
  },
  {
    title: "Simulações",
    icon: Calculator,
    items: [
      { title: "Precificadora", icon: Calculator, path: "/app/calculadora" },
      { title: "Simulação de Cenários", icon: GitCompare, path: "/app/simulacao" },
    ],
  },
  {
    title: "W3 Educação",
    icon: GraduationCap,
    items: [
      { title: "Mentoria AMES", icon: GraduationCap, path: "/app/aulas/mentoria-ames" },
      { title: "Tutorias", icon: GraduationCap, path: "/app/aulas/tutorias" },
      { title: "Hotseats com Léo", icon: GraduationCap, path: "/app/aulas/hotseats" },
      { title: "Calendário Comercial", icon: CalendarDays, path: "/app/calendario" },
    ],
  },
];

const standaloneItems: MenuItem[] = [
  { title: "IA W3", icon: Sparkles, path: "/app/ia-w3" },
];

const moreAboutW3: MenuGroup = {
  title: "Mais sobre W3",
  icon: ShoppingBag,
  items: [
    { title: "Soluções da W3", icon: ShoppingBag, path: "/app/produtos" },
    { title: "Catálogo de Marcas", icon: Store, path: "/app/catalogo" },
  ],
};

const adminMenuItems: MenuItem[] = [
  { title: "Cérebro IA", icon: Brain, path: "/app/ia-w3/cerebro" },
];

const allGroups = [...menuGroups, moreAboutW3];

function SidebarGroup({
  group,
  pathname,
  onNavClick,
  isAdmin,
}: {
  group: MenuGroup;
  pathname: string;
  onNavClick?: () => void;
  isAdmin?: boolean;
}) {
  const visibleItems = group.items.filter((item) => !item.adminOnly || isAdmin);
  if (visibleItems.length === 0) return null;
  const active = visibleItems.some(
    (item) => item.path === "/app" ? pathname === "/app" : pathname.startsWith(item.path)
  );
  const GroupIcon = group.icon;

  return (
    <Collapsible defaultOpen={active}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg px-3 py-2 section-label-text text-muted-foreground/50 hover:text-muted-foreground transition-colors">
        <GroupIcon className="h-3.5 w-3.5 shrink-0 opacity-50" />
        <span className="flex-1 text-left">{group.title}</span>
        <ChevronDown className="h-3 w-3 shrink-0 opacity-40 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-5 space-y-0.5 py-1 border-l border-border/50">
          {visibleItems.map((item) => (
            <SidebarNavLink
              key={item.path}
              to={item.path}
              end={item.path === "/app"}
              onClick={onNavClick}
              icon={item.icon}
              label={item.title}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ isCollapsed, onToggle, isMobileOpen, onMobileClose }: SidebarProps) {
  const isMobile = useIsMobile();
  const { isAdmin, profile } = useAuth();
  const location = useLocation();
  const isExpanded = isMobile ? true : !isCollapsed;

  const handleNavClick = () => { if (isMobile) onMobileClose(); };

  const getUserName = () => profile?.full_name || "Usuário";
  const getUserEmail = () => profile?.email || "";
  const getPlanLabel = () => {
    if (profile?.is_mentorado) return "Mentorado";
    if (profile?.is_w3_client) return "Cliente W3";
    if (profile?.plan_type === "paid") return "Plano Pago";
    if (profile?.plan_type === "manual") return "Acesso Manual";
    return "Plano Free";
  };

  const renderExpandedNav = (onNav?: () => void) => (
    <>
      {allGroups.map((group) => (
        <SidebarGroup key={group.title} group={group} pathname={location.pathname} onNavClick={onNav} isAdmin={isAdmin} />
      ))}
      {standaloneItems.map((item) => (
        <SidebarNavLink key={item.path} to={item.path} onClick={onNav} icon={item.icon} label={item.title} />
      ))}
      {isAdmin && adminMenuItems.map((item) => (
        <SidebarNavLink key={item.path} to={item.path} onClick={onNav} icon={item.icon} label={item.title} />
      ))}
      {isAdmin && <SidebarNavLink to="/admin" onClick={onNav} icon={Shield} label="Admin" />}
    </>
  );

  const collapsedItems: MenuItem[] = [
    ...allGroups.map((g) => ({ title: g.title, icon: g.icon, path: g.items[0]?.path || "/app" })),
    ...standaloneItems,
  ];

  const renderCollapsedNav = () => (
    <>
      {collapsedItems.map((item) => (
        <Tooltip key={item.title}>
          <TooltipTrigger asChild>
            <div>
              <SidebarNavLink to={item.path} end={item.path === "/app"} icon={item.icon} label={item.title} isCollapsed />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs font-medium">{item.title}</TooltipContent>
        </Tooltip>
      ))}
      {isAdmin && adminMenuItems.map((item) => (
        <Tooltip key={item.path}>
          <TooltipTrigger asChild>
            <div><SidebarNavLink to={item.path} icon={item.icon} label={item.title} isCollapsed /></div>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs font-medium">{item.title}</TooltipContent>
        </Tooltip>
      ))}
      {isAdmin && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div><SidebarNavLink to="/admin" icon={Shield} label="Admin" isCollapsed /></div>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs font-medium">Admin</TooltipContent>
        </Tooltip>
      )}
    </>
  );

  // User info: text only (no avatar) — avatar lives in header
  const renderUserInfo = (expanded: boolean) =>
    expanded ? (
      <div className="rounded-lg px-3 py-2.5 bg-accent/50">
        <p className="text-[13px] font-medium text-foreground truncate">{getUserName()}</p>
        <p className="text-[11px] text-muted-foreground truncate">{getUserEmail()}</p>
        <p className="text-[10px] text-muted-foreground/70 mt-0.5">{getPlanLabel()}</p>
      </div>
    ) : (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-center px-2 py-2">
            <span className="text-[10px] font-semibold text-muted-foreground">{getUserName().charAt(0).toUpperCase()}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p className="font-medium text-xs">{getUserName()}</p>
          <p className="text-[11px] text-muted-foreground">{getPlanLabel()}</p>
        </TooltipContent>
      </Tooltip>
    );

  // Mobile drawer
  if (isMobile) {
    return (
      <>
        <div
          className={cn(
            "fixed inset-0 z-40 bg-background/60 backdrop-blur-sm transition-opacity duration-300",
            isMobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          onClick={onMobileClose}
        />
        <aside
          className={cn(
            "fixed left-0 top-0 z-50 h-screen w-72 border-r border-sidebar-border bg-sidebar-background transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            isMobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex h-full flex-col">
            <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-5">
              <span className="text-base font-semibold tracking-tight">
                W3 <span className="text-primary">SaaS</span>
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMobileClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <nav className="flex-1 space-y-6 overflow-y-auto scrollbar-thin p-3">
              {renderExpandedNav(handleNavClick)}
            </nav>
            <div className="border-t border-sidebar-border p-3">
              {renderUserInfo(true)}
            </div>
          </div>
        </aside>
      </>
    );
  }

  // Desktop sidebar
  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen border-r border-sidebar-border bg-sidebar-background transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          isExpanded ? "w-64" : "w-16"
        )}
      >
        <div className="flex h-full flex-col">
          <div className={cn(
            "flex h-14 items-center border-b border-sidebar-border",
            isExpanded ? "px-5 justify-between" : "px-2 justify-center"
          )}>
            {isExpanded ? (
              <>
                <span className="text-base font-semibold tracking-tight whitespace-nowrap">
                  W3 <span className="text-primary">SaaS</span>
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={onToggle}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={onToggle}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <nav className="flex-1 space-y-6 overflow-y-auto scrollbar-thin p-2">
            {isExpanded ? renderExpandedNav() : renderCollapsedNav()}
          </nav>
          <div className={cn("border-t border-sidebar-border", isExpanded ? "p-3" : "p-2")}>
            {renderUserInfo(isExpanded)}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
