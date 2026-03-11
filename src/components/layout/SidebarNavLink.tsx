import { NavLink as RouterNavLink, NavLinkProps as RouterNavLinkProps, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LucideIcon, Lock } from "lucide-react";

interface SidebarNavLinkProps extends Omit<RouterNavLinkProps, "className" | "children"> {
  icon: LucideIcon;
  label: string;
  isCollapsed?: boolean;
  variant?: "default" | "system";
  locked?: boolean;
  lockedFeature?: string;
}

export function SidebarNavLink({
  icon: Icon,
  label,
  isCollapsed = false,
  variant = "default",
  locked = false,
  lockedFeature,
  ...props
}: SidebarNavLinkProps) {
  const navigate = useNavigate();

  if (locked) {
    const feature = lockedFeature ?? label.toLowerCase().replace(/\s+/g, "-");
    return (
      <button
        type="button"
        onClick={() => navigate(`/app/upgrade/${feature}`)}
        className={cn(
          "relative flex items-center rounded-lg text-[13px] transition-all duration-150 w-full",
          isCollapsed ? "justify-center p-2.5" : "gap-2.5 px-3 py-[7px]",
          "text-muted-foreground/40 hover:text-muted-foreground/60 hover:bg-accent/30 cursor-pointer"
        )}
      >
        <Icon className="h-[15px] w-[15px] shrink-0" />
        {!isCollapsed && (
          <>
            <span className="whitespace-nowrap flex-1 text-left">{label}</span>
            <Lock className="h-3 w-3 shrink-0 opacity-50" />
          </>
        )}
      </button>
    );
  }

  return (
    <RouterNavLink
      {...props}
      className={({ isActive }) =>
        cn(
          "relative flex items-center rounded-lg text-[13px] transition-all duration-150",
          isCollapsed ? "justify-center p-2.5" : "gap-2.5 px-3 py-[7px]",
          variant === "system"
            ? isActive
              ? "sidebar-item-system-active"
              : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent/40"
            : isActive
              ? "sidebar-item-active"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
        )
      }
    >
      <Icon className="h-[15px] w-[15px] shrink-0" />
      {!isCollapsed && (
        <span className="whitespace-nowrap">{label}</span>
      )}
    </RouterNavLink>
  );
}
