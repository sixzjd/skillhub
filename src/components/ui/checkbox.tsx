import * as React from "react";
import { cn } from "../../lib/utils";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => (
    <input
      type="checkbox"
      ref={ref}
      className={cn(
        "h-4 w-4 shrink-0 cursor-pointer rounded-[4px] border border-[#b0a498] bg-transparent accent-[#c0543e] dark:border-[#6a5a4e] dark:accent-[#e07a64]",
        className
      )}
      {...props}
    />
  )
);
Checkbox.displayName = "Checkbox";