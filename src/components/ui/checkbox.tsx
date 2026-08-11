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
        "h-4 w-4 shrink-0 cursor-pointer rounded-[4px] border border-zinc-300 bg-transparent accent-indigo-600 dark:border-zinc-600 dark:accent-indigo-400",
        className
      )}
      {...props}
    />
  )
);
Checkbox.displayName = "Checkbox";