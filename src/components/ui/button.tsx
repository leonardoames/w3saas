"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, AnimatePresence } from "motion/react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground border border-primary",
        destructive: "bg-destructive text-destructive-foreground border border-destructive",
        outline: "border border-input bg-background text-primary hover:border-primary",
        secondary: "bg-secondary text-secondary-foreground border border-secondary",
        ghost: "bg-transparent border border-transparent text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const variantCurtainStyles = {
  default: {
    curtain: "bg-primary-foreground",
    textInitial: "text-primary-foreground",
    textHover: "text-primary",
  },
  destructive: {
    curtain: "bg-destructive-foreground",
    textInitial: "text-destructive-foreground",
    textHover: "text-destructive",
  },
  outline: {
    curtain: "bg-primary",
    textInitial: "text-primary",
    textHover: "text-primary-foreground",
  },
  secondary: {
    curtain: "bg-secondary-foreground",
    textInitial: "text-secondary-foreground",
    textHover: "text-secondary",
  },
  ghost: {
    curtain: "bg-accent",
    textInitial: "text-foreground",
    textHover: "text-accent-foreground",
  },
  link: {
    curtain: "bg-transparent",
    textInitial: "text-primary",
    textHover: "text-primary",
  },
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size, asChild = false, isLoading = false, children, disabled, onClick, onFocus, onBlur, onMouseEnter, onMouseLeave, ...props }, ref) => {
    const [isHovered, setIsHovered] = React.useState(false);

    const transition = {
      duration: 0.4,
      ease: [0.19, 1, 0.22, 1] as const,
    };

    // For link variant or asChild, use simple button without curtain effect
    if (asChild || variant === "link") {
      const Comp = asChild ? Slot : "button";
      return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} disabled={disabled} {...props}>{children}</Comp>;
    }

    const currentStyle = variantCurtainStyles[variant || "default"];
    const isDisabled = disabled || isLoading;

    return (
      <motion.button
        ref={ref}
        className={cn(
          "relative overflow-hidden",
          buttonVariants({ variant, size, className }),
          isDisabled && "pointer-events-none opacity-50"
        )}
        onMouseEnter={(e) => {
          setIsHovered(true);
          onMouseEnter?.(e as unknown as React.MouseEvent<HTMLButtonElement>);
        }}
        onMouseLeave={(e) => {
          setIsHovered(false);
          onMouseLeave?.(e as unknown as React.MouseEvent<HTMLButtonElement>);
        }}
        onFocus={(e) => {
          setIsHovered(true);
          onFocus?.(e as unknown as React.FocusEvent<HTMLButtonElement>);
        }}
        onBlur={(e) => {
          setIsHovered(false);
          onBlur?.(e as unknown as React.FocusEvent<HTMLButtonElement>);
        }}
        onClick={onClick as any}
        whileTap={!isDisabled ? { scale: 0.98 } : undefined}
        disabled={isDisabled}
      >
        <motion.div
          className={cn("absolute inset-0 z-0", currentStyle.curtain)}
          initial={{ y: "100%" }}
          animate={isHovered ? { y: 0 } : { y: "100%" }}
          transition={transition}
        />

        <AnimatePresence mode="popLayout">
          {isLoading && (
            <motion.div
              key="loader"
              className="absolute inset-0 z-20 flex items-center justify-center"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "-100%" }}
              transition={transition}
            >
              <Loader2
                className={cn(
                  "h-4 w-4 animate-spin",
                  isHovered ? currentStyle.textHover : currentStyle.textInitial
                )}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.span
          className={cn(
            "relative z-10 flex items-center justify-center gap-2 whitespace-nowrap",
            currentStyle.textInitial,
            isHovered && currentStyle.textHover
          )}
          animate={isLoading ? { opacity: 0 } : { opacity: 1 }}
          transition={transition}
        >
          {children}
        </motion.span>
      </motion.button>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
