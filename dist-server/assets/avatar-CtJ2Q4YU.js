import { a as initials } from "./format-CaErknZY.js";
import { jsx } from "react/jsx-runtime";
//#region src/components/avatar.tsx
var SIZES = {
	sm: "h-8 w-8 text-[10px]",
	md: "h-10 w-10 text-xs",
	lg: "h-12 w-12 text-sm",
	xl: "h-24 w-24 text-2xl"
};
function Avatar({ name, url, size = "md" }) {
	const cls = SIZES[size];
	if (url) return /* @__PURE__ */ jsx("img", {
		src: url,
		alt: `Profilbillede af ${name}`,
		className: `${cls} shrink-0 rounded-full border object-cover`
	});
	return /* @__PURE__ */ jsx("span", {
		className: `flex ${cls} shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary`,
		children: initials(name) || "?"
	});
}
//#endregion
export { Avatar as t };
