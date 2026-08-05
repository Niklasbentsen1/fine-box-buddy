import { t as supabase } from "./client-BFBFtBi6.js";
import { t as Route$10 } from "./route-C-gP8uqC.js";
import { t as Route$11 } from "./kampe._matchId-DuZ13eOS.js";
import { useEffect } from "react";
import { HeadContent, Link, Outlet, Scripts, createFileRoute, createRootRouteWithContext, createRouter, lazyRouteComponent, useRouter } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
//#region src/styles.css?url
var styles_default = "/assets/styles-BuX3ni7r.css";
//#endregion
//#region src/lib/lovable-error-reporting.ts
function reportLovableError(error, context = {}) {
	if (typeof window === "undefined") return;
	window.__lovableEvents?.captureException?.(error, {
		source: "react_error_boundary",
		route: window.location.pathname,
		...context
	}, {
		mechanism: "react_error_boundary",
		handled: false,
		severity: "error"
	});
	const message = error instanceof Response ? `Response ${error.status}${error.url ? ` at ${error.url}` : ""}` : error instanceof Error ? error.message : String(error);
	const stack = error instanceof Error ? error.stack : void 0;
	window.__lovableReportRuntimeError?.({
		message,
		...stack !== void 0 && { stack },
		filename: window.location.pathname
	});
}
//#endregion
//#region src/routes/__root.tsx
function NotFoundComponent() {
	return /* @__PURE__ */ jsx("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ jsxs("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ jsx("h1", {
					className: "font-display text-7xl font-bold text-foreground",
					children: "404"
				}),
				/* @__PURE__ */ jsx("h2", {
					className: "mt-4 text-xl font-semibold text-foreground",
					children: "Siden findes ikke"
				}),
				/* @__PURE__ */ jsx("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "Siden du leder efter findes ikke eller er blevet flyttet."
				}),
				/* @__PURE__ */ jsx("div", {
					className: "mt-6",
					children: /* @__PURE__ */ jsx(Link, {
						to: "/",
						className: "inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Gå til forsiden"
					})
				})
			]
		})
	});
}
function ErrorComponent({ error, reset }) {
	console.error(error);
	const router = useRouter();
	useEffect(() => {
		reportLovableError(error, { boundary: "tanstack_root_error_component" });
	}, [error]);
	return /* @__PURE__ */ jsx("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ jsxs("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ jsx("h1", {
					className: "text-xl font-semibold tracking-tight text-foreground",
					children: "Siden kunne ikke indlæses"
				}),
				/* @__PURE__ */ jsx("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "Noget gik galt. Prøv at genindlæse, eller gå tilbage til forsiden."
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "mt-6 flex flex-wrap justify-center gap-2",
					children: [/* @__PURE__ */ jsx("button", {
						onClick: () => {
							router.invalidate();
							reset();
						},
						className: "inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Prøv igen"
					}), /* @__PURE__ */ jsx("a", {
						href: "/",
						className: "inline-flex items-center justify-center rounded-xl border-2 border-input bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary",
						children: "Gå til forsiden"
					})]
				})
			]
		})
	});
}
var Route$9 = createRootRouteWithContext()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1, viewport-fit=cover"
			},
			{ title: "Bødekassen — hold styr på klubbens bødekasse" },
			{
				name: "description",
				content: "Bødekassen gør det nemt for sportsklubber at holde styr på bøder, indbetalinger, holdets medlemmer og afstemningen om kampens spiller."
			},
			{
				property: "og:title",
				content: "Bødekassen"
			},
			{
				property: "og:description",
				content: "Hold styr på klubbens bødekasse: bøder, indbetalinger, påmindelser og kampens spiller — samlet ét sted."
			},
			{
				property: "og:type",
				content: "website"
			},
			{
				name: "twitter:card",
				content: "summary_large_image"
			}
		],
		links: [
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "icon",
				href: "/favicon.ico",
				type: "image/x-icon"
			},
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com"
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous"
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;500;600;700&display=swap"
			}
		]
	}),
	shellComponent: RootShell,
	component: RootComponent,
	notFoundComponent: NotFoundComponent,
	errorComponent: ErrorComponent
});
function RootShell({ children }) {
	return /* @__PURE__ */ jsxs("html", {
		lang: "da",
		children: [/* @__PURE__ */ jsx("head", { children: /* @__PURE__ */ jsx(HeadContent, {}) }), /* @__PURE__ */ jsxs("body", { children: [children, /* @__PURE__ */ jsx(Scripts, {})] })]
	});
}
function RootComponent() {
	const { queryClient } = Route$9.useRouteContext();
	const router = useRouter();
	useEffect(() => {
		const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
			if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
			router.invalidate();
			if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
		});
		return () => subscription.unsubscribe();
	}, [router, queryClient]);
	return /* @__PURE__ */ jsxs(QueryClientProvider, {
		client: queryClient,
		children: [/* @__PURE__ */ jsx(Outlet, {}), /* @__PURE__ */ jsx(Toaster, {
			position: "top-center",
			richColors: true,
			closeButton: true
		})]
	});
}
//#endregion
//#region src/routes/index.tsx
var $$splitComponentImporter$8 = () => import("./routes-CNu1VzYU.js");
var Route$8 = createFileRoute("/")({
	head: () => ({ meta: [{ title: "Bødekassen — hold styr på klubbens bødekasse" }, {
		name: "description",
		content: "Bødekassen gør det nemt for sportsklubber at holde styr på bøder, indbetalinger og kampens spiller."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$8, "component")
});
//#endregion
//#region src/routes/auth.tsx
var $$splitComponentImporter$7 = () => import("./auth-BhSJEkY0.js");
var Route$7 = createFileRoute("/auth")({
	head: () => ({ meta: [{ title: "Log ind — Bødekassen" }, {
		name: "description",
		content: "Log ind eller opret dig i Bødekassen og få styr på klubbens bødekasse."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$7, "component")
});
//#endregion
//#region src/routes/_authenticated/boeder.tsx
var $$splitComponentImporter$6 = () => import("./boeder-SN8g8MkY.js");
var Route$6 = createFileRoute("/_authenticated/boeder")({
	head: () => ({ meta: [{ title: "Bøder — Bødekassen" }, {
		name: "description",
		content: "Bødesatser og uddelte bøder på holdet."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$6, "component")
});
//#endregion
//#region src/routes/_authenticated/historik.tsx
var $$splitComponentImporter$5 = () => import("./historik-CYoP0rdS.js");
var Route$5 = createFileRoute("/_authenticated/historik")({
	head: () => ({ meta: [{ title: "Historik — Bødekassen" }, {
		name: "description",
		content: "Historik over alle bøder, indbetalinger og udbetalinger."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$5, "component")
});
//#endregion
//#region src/routes/_authenticated/hjem.tsx
var $$splitComponentImporter$4 = () => import("./hjem-Bn5K8wYw.js");
var Route$4 = createFileRoute("/_authenticated/hjem")({
	head: () => ({ meta: [{ title: "Hjem — Bødekassen" }, {
		name: "description",
		content: "Din saldo, dine bøder og indbetalinger i bødekassen."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$4, "component")
});
//#endregion
//#region src/routes/_authenticated/hold.tsx
var $$splitComponentImporter$3 = () => import("./hold-CMYUJAkn.js");
var Route$3 = createFileRoute("/_authenticated/hold")({
	head: () => ({ meta: [{ title: "Hold — Bødekassen" }, {
		name: "description",
		content: "Holdets medlemmer, bødekassens saldo og skyldige beløb."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
//#endregion
//#region src/routes/_authenticated/kampe.tsx
var $$splitComponentImporter$2 = () => import("./kampe-CJdFxom9.js");
var Route$2 = createFileRoute("/_authenticated/kampe")({
	head: () => ({ meta: [{ title: "Kampe — Bødekassen" }, {
		name: "description",
		content: "Opret kampe og stem på kampens spiller."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
//#endregion
//#region src/routes/_authenticated/onboarding.tsx
var $$splitComponentImporter$1 = () => import("./onboarding-DRwLDMYR.js");
var Route$1 = createFileRoute("/_authenticated/onboarding")({
	head: () => ({ meta: [{ title: "Kom i gang — Bødekassen" }, {
		name: "description",
		content: "Opret en klub eller tilmeld dig med en klubkode."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
//#endregion
//#region src/routes/_authenticated/profil.tsx
var $$splitComponentImporter = () => import("./profil-D0XJcaUV.js");
var Route = createFileRoute("/_authenticated/profil")({
	head: () => ({ meta: [{ title: "Min profil — Bødekassen" }, {
		name: "description",
		content: "Rediger dit navn, profilbillede og kontaktoplysninger."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
//#region src/routeTree.gen.ts
var IndexRoute = Route$8.update({
	id: "/",
	path: "/",
	getParentRoute: () => Route$9
});
var AuthenticatedRouteRoute = Route$10.update({
	id: "/_authenticated",
	getParentRoute: () => Route$9
});
var AuthRoute = Route$7.update({
	id: "/auth",
	path: "/auth",
	getParentRoute: () => Route$9
});
var AuthenticatedBoederRoute = Route$6.update({
	id: "/boeder",
	path: "/boeder",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedHistorikRoute = Route$5.update({
	id: "/historik",
	path: "/historik",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedHjemRoute = Route$4.update({
	id: "/hjem",
	path: "/hjem",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedHoldRoute = Route$3.update({
	id: "/hold",
	path: "/hold",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedKampeRoute = Route$2.update({
	id: "/kampe",
	path: "/kampe",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedOnboardingRoute = Route$1.update({
	id: "/onboarding",
	path: "/onboarding",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedProfilRoute = Route.update({
	id: "/profil",
	path: "/profil",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedKampeRouteChildren = { AuthenticatedKampeMatchIdRoute: Route$11.update({
	id: "/$matchId",
	path: "/$matchId",
	getParentRoute: () => AuthenticatedKampeRoute
}) };
var AuthenticatedRouteRouteChildren = {
	AuthenticatedBoederRoute,
	AuthenticatedHistorikRoute,
	AuthenticatedHjemRoute,
	AuthenticatedHoldRoute,
	AuthenticatedKampeRoute: AuthenticatedKampeRoute._addFileChildren(AuthenticatedKampeRouteChildren),
	AuthenticatedOnboardingRoute,
	AuthenticatedProfilRoute
};
var rootRouteChildren = {
	IndexRoute,
	AuthenticatedRouteRoute: AuthenticatedRouteRoute._addFileChildren(AuthenticatedRouteRouteChildren),
	AuthRoute
};
var routeTree = Route$9._addFileChildren(rootRouteChildren)._addFileTypes();
//#endregion
//#region src/router.tsx
var getRouter = () => {
	return createRouter({
		routeTree,
		context: { queryClient: new QueryClient() },
		scrollRestoration: true,
		defaultPreloadStaleTime: 0
	});
};
//#endregion
export { getRouter };
