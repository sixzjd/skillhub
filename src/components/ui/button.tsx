import * as React from "react";
import { cn } from "../../lib/utils";

type ButtonVariant = "default" | "secondary" | "ghost" | "outline" | "destructive" | "link" | "accent";
type ButtonSize = "default" | "sm" | "lg" | "icon";

const variants: Record<ButtonVariant, string> = {
  default:
    "bg-indigo-600 text-white hover:bg-indigo-500 dark:bg-indigo-400 dark:text-indigo-950 dark:hover:bg-indigo-300 shadow-sm",
  secondary:
    "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700",
  ghost: "hover:bg-zinc-100 dark:hover:bg-zinc-800",
  outline:
    "border border-zinc-200 bg-transparent text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
  destructive: "bg-red-600 text-white hover:bg-red-500",
  link: "text-indigo-600 underline-offset-4 hover:underline dark:text-indigo-400",
  accent:
    "bg-gradient-to-b from-indigo-500 to-indigo-700 text-white shadow-sm hover:from-indigo-400 hover:to-indigo-600 dark:from-indigo-400 dark:to-indigo-600 dark:text-white",
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
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";