import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-[0.35rem] border px-2 py-0.5 font-mono-custom text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors",
  {
    variants: {
      variant: {
        default: "border-foreground bg-primary text-primary-foreground",
        secondary: "border-foreground bg-accent text-accent-foreground",
        outline: "text-foreground border-foreground",
        destructive: "border-transparent bg-destructive/10 text-destructive",
        success: "border-foreground bg-secondary text-secondary-foreground",
        warning: "border-foreground bg-accent text-accent-foreground",
        muted: "border-foreground bg-muted text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
