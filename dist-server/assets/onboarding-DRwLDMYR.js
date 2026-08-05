import { t as supabase } from "./client-BFBFtBi6.js";
import { n as useTeam } from "./team-CqHp8PgM.js";
import { t as Button } from "./button-D59AmRzD.js";
import { n as Input, t as Label } from "./label-BzS4-9r3.js";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { toast } from "sonner";
import { Coins, KeyRound, LogOut, Users } from "lucide-react";
//#region src/routes/_authenticated/onboarding.tsx?tsr-split=component
function OnboardingPage() {
	const { profile, user, refreshMemberships } = useTeam();
	const navigate = useNavigate();
	const [clubName, setClubName] = useState("");
	const [teamName, setTeamName] = useState("");
	const [code, setCode] = useState("");
	const [busy, setBusy] = useState(null);
	const handleCreate = async (e) => {
		e.preventDefault();
		setBusy("create");
		const { data, error } = await supabase.rpc("create_club", {
			_name: clubName.trim(),
			_team_name: teamName.trim()
		});
		setBusy(null);
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success("Klubben er oprettet — del klubkoden med holdet");
		await refreshMemberships();
		navigate({ to: "/hjem" });
	};
	const handleJoin = async (e) => {
		e.preventDefault();
		setBusy("join");
		const { error } = await supabase.rpc("join_club_by_code", { _code: code.trim() });
		setBusy(null);
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success("Anmodning sendt — en administrator skal godkende dig, før du får adgang");
		await refreshMemberships();
		navigate({ to: "/hjem" });
	};
	const handleSignOut = async () => {
		await supabase.auth.signOut();
		navigate({ to: "/auth" });
	};
	return /* @__PURE__ */ jsx("div", {
		className: "min-h-screen bg-background bg-pitch-stripes",
		children: /* @__PURE__ */ jsxs("div", {
			className: "mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-10",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "mb-8 flex items-center justify-between",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "flex items-center gap-2.5",
						children: [/* @__PURE__ */ jsx("span", {
							className: "flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground",
							children: /* @__PURE__ */ jsx(Coins, { className: "h-5 w-5" })
						}), /* @__PURE__ */ jsx("span", {
							className: "font-display text-2xl font-semibold",
							children: "Bødekassen"
						})]
					}), /* @__PURE__ */ jsxs(Button, {
						variant: "ghost",
						size: "sm",
						onClick: handleSignOut,
						children: [/* @__PURE__ */ jsx(LogOut, { className: "mr-2 h-4 w-4" }), " Log ud"]
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "mb-8",
					children: [/* @__PURE__ */ jsxs("h1", {
						className: "font-display text-4xl font-semibold",
						children: [
							"Hej",
							profile?.displayName ? ` ${profile.displayName.split(" ")[0]}` : "",
							"!"
						]
					}), /* @__PURE__ */ jsxs("p", {
						className: "mt-2 text-muted-foreground",
						children: [
							"Du er logget ind som ",
							user.email,
							". Opret en ny klub, eller tilmeld dig en eksisterende klub med en klubkode."
						]
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "grid gap-5 md:grid-cols-2",
					children: [/* @__PURE__ */ jsxs("form", {
						onSubmit: handleCreate,
						className: "flex flex-col rounded-2xl border bg-card p-6 shadow-card",
						children: [
							/* @__PURE__ */ jsx("span", {
								className: "mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gold-soft text-gold-foreground",
								children: /* @__PURE__ */ jsx(Users, { className: "h-6 w-6" })
							}),
							/* @__PURE__ */ jsx("h2", {
								className: "font-display text-2xl font-semibold",
								children: "Opret en klub"
							}),
							/* @__PURE__ */ jsx("p", {
								className: "mt-1 text-sm text-muted-foreground",
								children: "Start en ny bødekasse til din klub. Du bliver administrator og får en klubkode, du kan dele med holdet."
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "mt-5 space-y-4",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "space-y-2",
									children: [/* @__PURE__ */ jsx(Label, {
										htmlFor: "club-name",
										children: "Klubnavn"
									}), /* @__PURE__ */ jsx(Input, {
										id: "club-name",
										value: clubName,
										onChange: (e) => setClubName(e.target.value),
										placeholder: "Fx Vestby IF",
										required: true
									})]
								}), /* @__PURE__ */ jsxs("div", {
									className: "space-y-2",
									children: [/* @__PURE__ */ jsx(Label, {
										htmlFor: "team-name",
										children: "Første hold"
									}), /* @__PURE__ */ jsx(Input, {
										id: "team-name",
										value: teamName,
										onChange: (e) => setTeamName(e.target.value),
										placeholder: "Fx Herre 1 eller U15",
										required: true
									})]
								})]
							}),
							/* @__PURE__ */ jsx(Button, {
								type: "submit",
								className: "mt-6 w-full",
								disabled: busy !== null || !clubName.trim() || !teamName.trim(),
								children: busy === "create" ? "Opretter…" : "Opret klub"
							})
						]
					}), /* @__PURE__ */ jsxs("form", {
						onSubmit: handleJoin,
						className: "flex flex-col rounded-2xl border bg-card p-6 shadow-card",
						children: [
							/* @__PURE__ */ jsx("span", {
								className: "mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-pitch-soft text-pitch",
								children: /* @__PURE__ */ jsx(KeyRound, { className: "h-6 w-6" })
							}),
							/* @__PURE__ */ jsx("h2", {
								className: "font-display text-2xl font-semibold",
								children: "Tilmeld med klubkode"
							}),
							/* @__PURE__ */ jsx("p", {
								className: "mt-1 text-sm text-muted-foreground",
								children: "Har du fået en klubkode af din træner eller holdkammerat? Indtast den her — en administrator skal godkende din anmodning, før du får adgang."
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "mt-5 space-y-2",
								children: [/* @__PURE__ */ jsx(Label, {
									htmlFor: "code",
									children: "Klubkode"
								}), /* @__PURE__ */ jsx(Input, {
									id: "code",
									value: code,
									onChange: (e) => setCode(e.target.value.toUpperCase()),
									placeholder: "FX AB12CD",
									maxLength: 6,
									required: true,
									className: "font-mono text-lg uppercase tracking-[0.3em]"
								})]
							}),
							/* @__PURE__ */ jsx(Button, {
								type: "submit",
								variant: "subtle",
								className: "mt-6 w-full",
								disabled: busy !== null || code.trim().length < 6,
								children: busy === "join" ? "Tilmelder…" : "Tilmeld klub"
							})
						]
					})]
				})
			]
		})
	});
}
//#endregion
export { OnboardingPage as component };
