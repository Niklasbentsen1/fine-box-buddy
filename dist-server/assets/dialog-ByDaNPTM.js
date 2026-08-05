import { n as cn } from "./button-D59AmRzD.js";
import { jsx, jsxs } from "react/jsx-runtime";
import { X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
//#region src/components/ui/dialog.tsx
var Dialog = DialogPrimitive.Root;
function DialogContent({ className, children, ...props }) {
	return /* @__PURE__ */ jsxs(DialogPrimitive.Portal, { children: [/* @__PURE__ */ jsx(DialogPrimitive.Overlay, { className: "fixed inset-0 z-50 bg-primary/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" }), /* @__PURE__ */ jsxs(DialogPrimitive.Content, {
		className: cn("fixed top-1/2 left-1/2 z-50 max-h-[85vh] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border bg-popover p-6 shadow-pop", "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95", className),
		...props,
		children: [children, /* @__PURE__ */ jsxs(DialogPrimitive.Close, {
			className: "absolute top-4 right-4 cursor-pointer rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
			children: [/* @__PURE__ */ jsx(X, { className: "h-4 w-4" }), /* @__PURE__ */ jsx("span", {
				className: "sr-only",
				children: "Luk"
			})]
		})]
	})] });
}
function DialogTitle({ className, ...props }) {
	return /* @__PURE__ */ jsx(DialogPrimitive.Title, {
		className: cn("font-display text-2xl font-semibold tracking-wide", className),
		...props
	});
}
function DialogDescription({ className, ...props }) {
	return /* @__PURE__ */ jsx(DialogPrimitive.Description, {
		className: cn("mt-1 text-sm text-muted-foreground", className),
		...props
	});
}
function DialogFooter({ className, ...props }) {
	return /* @__PURE__ */ jsx("div", {
		className: cn("mt-6 flex justify-end gap-2", className),
		...props
	});
}
//#endregion
export { DialogTitle as a, DialogFooter as i, DialogContent as n, DialogDescription as r, Dialog as t };
