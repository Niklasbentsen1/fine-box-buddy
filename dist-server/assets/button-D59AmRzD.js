import { jsx } from "react/jsx-runtime";
import { cva } from "class-variance-authority";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
//#region src/lib/utils.ts
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
//#endregion
//#region src/components/ui/button.tsx
var buttonVariants = cva("inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all focus-visible:outline-2 focus-visible:outline-ring active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50", {
	variants: {
		variant: {
			primary: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
			pitch: "bg-pitch text-pitch-foreground shadow-sm hover:bg-pitch/90",
			gold: "bg-gold text-gold-foreground shadow-sm hover:bg-gold/90",
			outline: "border-2 border-input bg-card text-foreground hover:bg-secondary",
			ghost: "text-foreground hover:bg-secondary",
			subtle: "bg-secondary text-secondary-foreground hover:bg-secondary/70",
			destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90"
		},
		size: {
			sm: "h-8 px-3 text-xs",
			md: "h-10 px-4",
			default: "h-10 px-4",
			lg: "h-12 px-6 text-base",
			icon: "h-9 w-9"
		}
	},
	defaultVariants: {
		variant: "primary",
		size: "md"
	}
});
function Button({ className, variant, size, type = "button", ...props }) {
	return /* @__PURE__ */ jsx("button", {
		type,
		className: cn(buttonVariants({
			variant,
			size
		}), className),
		...props
	});
}
//#endregion
export { cn as n, Button as t };
