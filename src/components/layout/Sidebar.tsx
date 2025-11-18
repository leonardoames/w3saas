import { NavLink } from "@/components/NavLink";
import { 
  LayoutDashboard, 
  GraduationCap, 
  ListChecks, 
  Calculator, 
  Sparkles, 
  Store, 
  ShoppingBag 
} from "lucide-react";
import { cn } from "@/lib/utils";

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
    title: "Produtos da Mentoria",
    icon: ShoppingBag,
    path: "/produtos",
  },
];

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-sidebar-border bg-sidebar-background">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-sidebar-border px-6">
          <h1 className="text-xl font-bold text-sidebar-primary">SaaS da W3</h1>
        </div>

        {/* Menu Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="text-base">{item.title}</span>
            </NavLink>
          ))}
        </nav>

        {/* User info placeholder - implementar depois com auth */}
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <span className="text-sm font-semibold">U</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-sidebar-foreground">Usuário</p>
              <p className="text-xs text-muted-foreground">Mentorado</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
