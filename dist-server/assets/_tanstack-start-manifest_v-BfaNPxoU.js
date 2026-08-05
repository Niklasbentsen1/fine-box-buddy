//#region \0tanstack-start-manifest:v
var tsrStartManifest = () => ({ routes: {
	__root__: {
		filePath: "/dev-server/src/routes/__root.tsx",
		children: [
			"/",
			"/_authenticated",
			"/auth"
		],
		preloads: [
			"/assets/index-D0jEeT5W.js",
			"/assets/client-BIazadYh.js",
			"/assets/dist-BLAQXqyK.js",
			"/assets/link-ZlV_f2v3.js",
			"/assets/Match-vivdB-6E.js",
			"/assets/useRouter-B7IzPSgI.js"
		],
		scripts: [{ attrs: {
			type: "module",
			async: !0,
			src: "/assets/index-D0jEeT5W.js"
		} }]
	},
	"/": {
		filePath: "/dev-server/src/routes/index.tsx",
		children: void 0,
		preloads: ["/assets/routes-Dmn72j7a.js", "/assets/coins-D73h6G1I.js"]
	},
	"/_authenticated": {
		filePath: "/dev-server/src/routes/_authenticated/route.tsx",
		children: [
			"/_authenticated/boeder",
			"/_authenticated/historik",
			"/_authenticated/hjem",
			"/_authenticated/hold",
			"/_authenticated/kampe",
			"/_authenticated/onboarding",
			"/_authenticated/profil"
		],
		preloads: [
			"/assets/route-Cn1JKWT1.js",
			"/assets/trophy-CdvjX3tm.js",
			"/assets/team-BwcEIs0_.js",
			"/assets/createLucideIcon-By4b05H6.js",
			"/assets/x-YNl9dDUp.js",
			"/assets/chevron-down-ByIDrL_X.js",
			"/assets/dropdown-menu-CgAHv_6u.js",
			"/assets/coins-D73h6G1I.js",
			"/assets/users-0bQO7csy.js",
			"/assets/plus-DhzZB3bm.js",
			"/assets/ticket-B-7FitEt.js",
			"/assets/user-round-xKnXJV7Y.js",
			"/assets/format-DA9aQRlg.js",
			"/assets/button-eD10PEPT.js",
			"/assets/dist-6k_U3NTX.js",
			"/assets/label-BJdqrPks.js",
			"/assets/avatar-CzpTffpv.js"
		]
	},
	"/auth": {
		filePath: "/dev-server/src/routes/auth.tsx",
		children: void 0,
		preloads: [
			"/assets/auth-BV-bUel-.js",
			"/assets/createLucideIcon-By4b05H6.js",
			"/assets/x-YNl9dDUp.js",
			"/assets/coins-D73h6G1I.js",
			"/assets/button-eD10PEPT.js",
			"/assets/label-BJdqrPks.js"
		]
	},
	"/_authenticated/boeder": {
		filePath: "/dev-server/src/routes/_authenticated/boeder.tsx",
		children: void 0,
		preloads: [
			"/assets/boeder-Cnw64jbA.js",
			"/assets/select-o6Ar-e9H.js",
			"/assets/trash-2-qf4xAi77.js",
			"/assets/badge-xcZY_Byb.js"
		]
	},
	"/_authenticated/historik": {
		filePath: "/dev-server/src/routes/_authenticated/historik.tsx",
		children: void 0,
		preloads: [
			"/assets/historik-DB_rRZ7P.js",
			"/assets/wallet-BEcHEYpD.js",
			"/assets/trash-2-qf4xAi77.js",
			"/assets/badge-xcZY_Byb.js"
		]
	},
	"/_authenticated/hjem": {
		filePath: "/dev-server/src/routes/_authenticated/hjem.tsx",
		children: void 0,
		preloads: [
			"/assets/hjem-C22oJNeR.js",
			"/assets/select-o6Ar-e9H.js",
			"/assets/wallet-BEcHEYpD.js",
			"/assets/stat-card-B9ToTIec.js",
			"/assets/badge-xcZY_Byb.js",
			"/assets/api-BA7cIP8Y.js"
		]
	},
	"/_authenticated/hold": {
		filePath: "/dev-server/src/routes/_authenticated/hold.tsx",
		children: void 0,
		preloads: [
			"/assets/hold-CcnnyntM.js",
			"/assets/wallet-BEcHEYpD.js",
			"/assets/stat-card-B9ToTIec.js",
			"/assets/trash-2-qf4xAi77.js",
			"/assets/user-minus-CcdN2hbF.js",
			"/assets/badge-xcZY_Byb.js",
			"/assets/api-BA7cIP8Y.js"
		]
	},
	"/_authenticated/kampe": {
		filePath: "/dev-server/src/routes/_authenticated/kampe.tsx",
		children: ["/_authenticated/kampe/$matchId"],
		preloads: [
			"/assets/kampe-C5u2_PVb.js",
			"/assets/badge-xcZY_Byb.js",
			"/assets/api-BA7cIP8Y.js",
			"/assets/checkbox-rseYQ734.js"
		]
	},
	"/_authenticated/onboarding": {
		filePath: "/dev-server/src/routes/_authenticated/onboarding.tsx",
		children: void 0,
		preloads: ["/assets/onboarding-D8FoQWGo.js"]
	},
	"/_authenticated/profil": {
		filePath: "/dev-server/src/routes/_authenticated/profil.tsx",
		children: void 0,
		preloads: ["/assets/profil-VXUiWJ8C.js", "/assets/trash-2-qf4xAi77.js"]
	},
	"/_authenticated/kampe/$matchId": {
		filePath: "/dev-server/src/routes/_authenticated/kampe.$matchId.tsx",
		children: void 0,
		preloads: [
			"/assets/kampe._matchId-BXVtDse2.js",
			"/assets/trash-2-qf4xAi77.js",
			"/assets/user-minus-CcdN2hbF.js"
		]
	}
} });
//#endregion
export { tsrStartManifest };
