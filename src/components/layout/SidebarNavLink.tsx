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
          "relative flex items-center rounded-lg text-sidebar-foreground transition-all duration-200",
          isCollapsed ? "justify-center p-3" : "gap-3 px-4 py-2",
          isActive 
            ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold" 
            : "hover:bg-sidebar-accent"
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!isCollapsed && (
        <span className="text-sm whitespace-nowrap">{label}</span>
      )}
    </RouterNavLink>
  );
}
