import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex select-none items-center justify-center whitespace-nowrap rounded-md text-sm font-extrabold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-2 border-foreground bg-primary text-primary-foreground shadow-[3px_3px_0_hsl(var(--foreground))] hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-[1px_1px_0_hsl(var(--foreground))] active:translate-y-0 active:shadow-none",
        destructive: "border-2 border-foreground bg-destructive text-destructive-foreground shadow-[3px_3px_0_hsl(var(--foreground))] hover:-translate-y-0.5 active:shadow-none",
        outline: "border-2 border-foreground bg-card text-foreground shadow-[3px_3px_0_hsl(var(--foreground))] hover:-translate-y-0.5 hover:bg-accent active:shadow-none",
        secondary: "border-2 border-foreground bg-accent text-accent-foreground shadow-[3px_3px_0_hsl(var(--foreground))] hover:-translate-y-0.5 active:shadow-none",
        ghost: "border border-transparent hover:border-foreground hover:bg-muted hover:text-foreground active:scale-[0.98]",
        link: "text-primary underline-offset-4 hover:underline",
        warm: "border-2 border-foreground bg-secondary text-secondary-foreground shadow-[3px_3px_0_hsl(var(--foreground))] hover:-translate-y-0.5 active:shadow-none",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6 text-base",
        xl: "h-12 px-8 text-base",
        icon: "h-9 w-9",
        "icon-sm": "h-7 w-7",
        "icon-lg": "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
