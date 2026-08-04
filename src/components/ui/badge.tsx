import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap",
  {
    variants: {
      variant: {
        navy: "bg-primary/10 text-primary",
        pitch: "bg-pitch-soft text-accent-foreground",
        gold: "bg-gold-soft text-gold-foreground",
        muted: "bg-secondary text-muted-foreground",
        destructive: "bg-destructive/10 text-destructive",
        outline: "border-2 border-input text-muted-foreground",
      },
    },
    defaultVariants: { variant: "navy" },
  },
);

export interface BadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
