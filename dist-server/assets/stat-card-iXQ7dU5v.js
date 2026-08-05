import { n as cn } from "./button-D59AmRzD.js";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/components/stat-card.tsx
var TONES = {
	navy: "bg-primary/10 text-primary",
	pitch: "bg-pitch-soft text-pitch",
	gold: "bg-gold-soft text-gold-foreground",
	red: "bg-destructive/10 text-destructive"
};
function StatCard({ label, value, icon: Icon, tone = "navy", hint }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "rounded-2xl border bg-card p-4 shadow-card",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "flex items-center gap-3",
			children: [/* @__PURE__ */ jsx("span", {
				className: cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", TONES[tone]),
				children: /* @__PURE__ */ jsx(Icon, { className: "h-5 w-5" })
			}), /* @__PURE__ */ jsxs("div", {
				className: "min-w-0",
				children: [/* @__PURE__ */ jsx("p", {
					className: "truncate text-xs font-medium uppercase tracking-wide text-muted-foreground",
					children: label
				}), /* @__PURE__ */ jsx("p", {
					className: "font-display text-2xl font-semibold leading-tight",
					children: value
				})]
			})]
		}), hint && /* @__PURE__ */ jsx("p", {
			className: "mt-2 text-xs text-muted-foreground",
			children: hint
		})]
	});
}
//#endregion
export { StatCard as t };
