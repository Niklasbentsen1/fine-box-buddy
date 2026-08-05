import { n as cn } from "./button-D59AmRzD.js";
import { jsx } from "react/jsx-runtime";
import { cva } from "class-variance-authority";
//#region src/components/ui/badge.tsx
var badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap", {
	variants: { variant: {
		navy: "bg-primary/10 text-primary",
		pitch: "bg-pitch-soft text-accent-foreground",
		gold: "bg-gold-soft text-gold-foreground",
		muted: "bg-secondary text-muted-foreground",
		destructive: "bg-destructive/10 text-destructive",
		outline: "border-2 border-input text-muted-foreground"
	} },
	defaultVariants: { variant: "navy" }
});
function Badge({ className, variant, ...props }) {
	return /* @__PURE__ */ jsx("span", {
		className: cn(badgeVariants({ variant }), className),
		...props
	});
}
//#endregion
export { Badge as t };
