import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "accent";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center whitespace-nowrap rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:pointer-events-none disabled:opacity-50"
    
    const variants = {
      default: "bg-brand-text text-brand-bg hover:bg-white shadow-sm",
      accent: "bg-brand-accent text-[#0A0A0E] hover:bg-brand-accent-hover shadow-sm font-semibold",
      outline: "border border-brand-border bg-transparent hover:bg-brand-surface-hover text-brand-text",
      ghost: "hover:bg-brand-surface-hover hover:text-brand-text text-brand-text",
    }
    
    const sizes = {
      default: "h-10 px-6 py-2 text-sm",
      sm: "h-8 rounded-full px-4 text-xs",
      lg: "h-12 rounded-full px-8 text-base",
      icon: "h-9 w-9",
    }

    const Comp = asChild ? "span" : "button"
    return (
      // @ts-ignore
      <Comp
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
