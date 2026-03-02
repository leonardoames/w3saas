import { NavLink as RouterNavLink, NavLinkProps as RouterNavLinkProps } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface SidebarNavLinkProps extends Omit<RouterNavLinkProps, "className" | "children"> {
  icon: LucideIcon;
  label: string;
  isCollapsed?: boolean;
}

export function SidebarNavLink({ 
  icon: Icon, 
  label, 
  isCollapsed = false,
  ...props 
}: SidebarNavLinkProps) {
  return (
    <RouterNavLink
      {...props}
      className={({ isActive }) =>
        cn(
          "relative flex items-center rounded-md text-sm transition-all duration-150",
          isCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2",
          isActive 
            ? "sidebar-item-active" 
            : "text-muted-foreground hover:text-foreground hover:bg-accent"
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!isCollapsed && (
        <span className="whitespace-nowrap">{label}</span>
      )}
    </RouterNavLink>
  );
}
