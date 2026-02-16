import { SidebarNavLink } from "./SidebarNavLink";
import {
  LayoutDashboard, GraduationCap, ListChecks, Calculator, GitCompare,
  Sparkles, Brain, Store, ShoppingBag, Users, CalendarDays, ChevronLeft,
  ChevronRight, X, Shield, Plug, ChevronDown,
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
      { title: "Plano de Ação", icon: ListChecks, path: "/app/plano-acao" },
      { title: "CRM de Influenciadores", icon: Users, path: "/app/crm-influenciadores" },
      { title: "Integrações", icon: Plug, path: "/app/integracoes" },
    ],
  },
  {
    title: "Simulações",
    icon: Calculator,
    items: [
      { title: "Calculadora", icon: Calculator, path: "/app/calculadora" },
      { title: "Simulação de Cenários", icon: GitCompare, path: "/app/simulacao" },
    ],
  },
  {
    title: "W3 Educação",
    icon: GraduationCap,
    items: [
      { title: "Aulas da Mentoria", icon: GraduationCap, path: "/app/aulas" },
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

function isGroupActive(group: MenuGroup, pathname: string) {
  return group.items.some(
    (item) => item.path === "/app" ? pathname === "/app" : pathname.startsWith(item.path)
  );
}

// Accordion group for expanded sidebar & mobile
function SidebarGroup({
  group,
  pathname,
  onNavClick,
}: {
  group: MenuGroup;
  pathname: string;
  onNavClick?: () => void;
}) {
  const active = isGroupActive(group, pathname);
  const GroupIcon = group.icon;

  return (
    <Collapsible defaultOpen={active}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 hover:text-sidebar-foreground transition-colors">
        <GroupIcon className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-left">{group.title}</span>
        <ChevronDown className="h-3 w-3 shrink-0 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-6 space-y-0.5 py-1 border-l border-border/40">
          {group.items.map((item) => (
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

  const handleNavClick = () => {
    if (isMobile) onMobileClose();
  };

  const getUserName = () => profile?.full_name || "Usuário";
  const getUserInitials = () => {
    if (profile?.full_name) {
      return profile.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
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

  // Render nav content (shared between mobile & expanded desktop)
  const renderExpandedNav = (onNav?: () => void) => (
    <>
      {allGroups.map((group) => (
        <SidebarGroup key={group.title} group={group} pathname={location.pathname} onNavClick={onNav} />
      ))}

      {/* Standalone: IA W3 */}
      {standaloneItems.map((item) => (
        <SidebarNavLink key={item.path} to={item.path} onClick={onNav} icon={item.icon} label={item.title} />
      ))}

      {/* Admin */}
      {isAdmin && adminMenuItems.map((item) => (
        <SidebarNavLink key={item.path} to={item.path} onClick={onNav} icon={item.icon} label={item.title} />
      ))}
      {isAdmin && <SidebarNavLink to="/admin" onClick={onNav} icon={Shield} label="Admin" />}
    </>
  );

  // Collapsed: show only icons with tooltips (flat list)
  const allItemsFlat: MenuItem[] = [
    ...allGroups.flatMap((g) => g.items),
    ...standaloneItems,
  ];

  const renderCollapsedNav = () => (
    <>
      {allItemsFlat.map((item) => (
        <Tooltip key={item.path}>
          <TooltipTrigger asChild>
            <div>
              <SidebarNavLink to={item.path} end={item.path === "/app"} icon={item.icon} label={item.title} isCollapsed />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">{item.title}</TooltipContent>
        </Tooltip>
      ))}
      {isAdmin && adminMenuItems.map((item) => (
        <Tooltip key={item.path}>
          <TooltipTrigger asChild>
            <div><SidebarNavLink to={item.path} icon={item.icon} label={item.title} isCollapsed /></div>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">{item.title}</TooltipContent>
        </Tooltip>
      ))}
      {isAdmin && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div><SidebarNavLink to="/admin" icon={Shield} label="Admin" isCollapsed /></div>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">Admin</TooltipContent>
        </Tooltip>
      )}
    </>
  );

  // User info card
  const renderUserInfo = (expanded: boolean) =>
    expanded ? (
      <div className="flex items-center gap-3 rounded-lg px-4 py-3 bg-[#242424]/95">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <span className="text-sm font-semibold">{getUserInitials()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{getUserName()}</p>
          <p className="text-xs text-white">{getPlanLabel()}</p>
        </div>
      </div>
    ) : (
      <Tooltip>
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
      </Tooltip>
    );

  // Mobile drawer
  if (isMobile) {
    return (
      <>
        <div
          className={cn(
            "fixed inset-0 z-40 bg-background/80 backdrop-blur-sm transition-opacity",
            isMobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          onClick={onMobileClose}
        />
        <aside
          className={cn(
            "fixed left-0 top-0 z-50 h-screen w-72 border-r border-sidebar-border bg-sidebar-background transition-transform duration-300",
            isMobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex h-full flex-col">
            <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-6">
              <h1 className="text-xl font-bold text-sidebar-primary">SaaS da W3</h1>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onMobileClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <nav className="flex-1 space-y-4 overflow-y-auto p-4">
              {renderExpandedNav(handleNavClick)}
            </nav>
            <div className="border-t border-sidebar-border p-4">
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
          "fixed left-0 top-0 z-40 h-screen border-r border-sidebar-border bg-sidebar-background transition-all duration-300",
          isExpanded ? "w-64" : "w-16"
        )}
      >
        <div className="flex h-full flex-col">
          <div className={cn("flex h-16 items-center border-b border-sidebar-border", isExpanded ? "px-6 justify-between" : "px-2 justify-center")}>
            {isExpanded ? (
              <>
                <h1 className="text-xl font-bold text-sidebar-primary whitespace-nowrap">W3 Saas</h1>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggle}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggle}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
          <nav className="flex-1 space-y-4 overflow-y-auto p-2">
            {isExpanded ? renderExpandedNav() : renderCollapsedNav()}
          </nav>
          <div className={cn("border-t border-sidebar-border", isExpanded ? "p-4" : "p-2")}>
            {renderUserInfo(isExpanded)}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
