import { t as supabase } from "./client-BFBFtBi6.js";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { Coins } from "lucide-react";
//#region src/routes/index.tsx?tsr-split=component
function Index() {
	const navigate = useNavigate();
	useEffect(() => {
		let cancelled = false;
		supabase.auth.getSession().then(({ data }) => {
			if (cancelled) return;
			navigate({
				to: data.session ? "/hjem" : "/auth",
				replace: true
			});
		});
		return () => {
			cancelled = true;
		};
	}, [navigate]);
	return /* @__PURE__ */ jsxs("div", {
		className: "flex min-h-screen flex-col items-center justify-center gap-4 bg-background",
		children: [
			/* @__PURE__ */ jsx("span", {
				className: "flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground",
				children: /* @__PURE__ */ jsx(Coins, { className: "h-8 w-8" })
			}),
			/* @__PURE__ */ jsx("p", {
				className: "font-display text-3xl font-semibold",
				children: "Bødekassen"
			}),
			/* @__PURE__ */ jsx("div", { className: "h-6 w-6 animate-spin rounded-full border-2 border-pitch border-t-transparent" })
		]
	});
}
//#endregion
export { Index as component };
