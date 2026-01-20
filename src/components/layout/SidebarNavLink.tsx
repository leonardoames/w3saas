"use client";

import * as React from "react";
import { NavLink as RouterNavLink, NavLinkProps as RouterNavLinkProps } from "react-router-dom";
import { motion } from "motion/react";
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
  const [isHovered, setIsHovered] = React.useState(false);

  const transition = {
    duration: 0.4,
    ease: [0.19, 1, 0.22, 1] as const,
  };

  return (
    <RouterNavLink
      {...props}
      className={({ isActive }) =>
        cn(
          "relative flex items-center overflow-hidden rounded-lg text-sidebar-foreground transition-colors",
          isCollapsed ? "justify-center p-3" : "gap-3 px-4 py-3",
          isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
        )
      }
    >
      {({ isActive }) => (
        <motion.div
          className="relative flex w-full items-center"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Curtain effect background */}
          <motion.div
            className={cn(
              "absolute inset-0 -mx-4 -my-3 z-0 rounded-lg",
              isActive ? "bg-sidebar-primary/20" : "bg-sidebar-accent"
            )}
            initial={{ y: "100%" }}
            animate={isHovered && !isActive ? { y: 0 } : { y: "100%" }}
            transition={transition}
          />

          {/* Content */}
          <div className={cn(
            "relative z-10 flex items-center",
            isCollapsed ? "justify-center" : "gap-3"
          )}>
            <Icon className="h-5 w-5 shrink-0" />
            {!isCollapsed && (
              <span className="text-base whitespace-nowrap">{label}</span>
            )}
          </div>
        </motion.div>
      )}
    </RouterNavLink>
  );
}
