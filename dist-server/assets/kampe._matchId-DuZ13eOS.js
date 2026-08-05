import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
//#region src/routes/_authenticated/kampe.$matchId.tsx
var $$splitComponentImporter = () => import("./kampe._matchId-Bg0U4U39.js");
var Route = createFileRoute("/_authenticated/kampe/$matchId")({
	head: () => ({ meta: [{ title: "Kamp — Bødekassen" }, {
		name: "description",
		content: "Stem på kampens spiller og se afstemningens resultat."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };
