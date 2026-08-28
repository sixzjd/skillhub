import * as React from "react";
import { cn } from "../../lib/utils";

type ButtonVariant = "default" | "secondary" | "ghost" | "outline" | "destructive" | "link" | "accent";
type ButtonSize = "default" | "sm" | "lg" | "icon";

const variants: Record<ButtonVariant, string> = {
  default:
    "bg-[#c0543e] text-white hover:bg-[#a84535] dark:bg-[#c0543e] dark:text-white dark:hover:bg-[#a84535] shadow-sm",
  secondary:
    "bg-[#ebe3da] text-[#3a2e28] hover:bg-[#ddd3c7] dark:bg-[#2e2520] dark:text-[#e8ddd4] dark:hover:bg-[#3a3028]",
  ghost: "hover:bg-[#ebe3da] dark:hover:bg-[#2e2520]",
  outline:
    "border border-[#d9cfc4] bg-transparent text-[#3a2e28] hover:border-[#c0543e]/40 hover:bg-[#faf6f1] hover:text-[#c0543e] dark:border-[#3e342c] dark:text-[#e8ddd4] dark:hover:border-[#c0543e]/50 dark:hover:bg-[#231c18] dark:hover:text-[#e07a64]",
  destructive: "bg-red-600 text-white hover:bg-red-500",
  link: "text-[#c0543e] underline-offset-4 hover:underline dark:text-[#e07a64]",
  accent:
    "bg-gradient-to-b from-[#c0543e] to-[#a04030] text-white shadow-sm hover:from-[#d06448] hover:to-[#b04a38] dark:from-[#c0543e] dark:to-[#a04030] dark:text-white",
};

const sizes: Record<ButtonSize, string> = {
  default: "h-9 px-4 py-2 text-sm",
  sm: "h-8 px-3 text-xs",
  lg: "h-11 px-8 text-base",
  icon: "h-9 w-9",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";