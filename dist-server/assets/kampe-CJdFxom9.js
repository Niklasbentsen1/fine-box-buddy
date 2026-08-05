import { t as supabase } from "./client-BFBFtBi6.js";
import { n as useTeam } from "./team-CqHp8PgM.js";
import { r as formatDateTime } from "./format-CaErknZY.js";
import { t as Button } from "./button-D59AmRzD.js";
import { t as Badge } from "./badge-C-vqPte3.js";
import { a as DialogTitle, i as DialogFooter, n as DialogContent, r as DialogDescription, t as Dialog } from "./dialog-ByDaNPTM.js";
import { n as Input, t as Label } from "./label-BzS4-9r3.js";
import { t as fetchTeamMembers } from "./api-C87KH-wk.js";
import { t as Checkbox } from "./checkbox-zaQcwLKK.js";
import { useState } from "react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarPlus, Medal, Trophy } from "lucide-react";
//#region src/routes/_authenticated/kampe.tsx?tsr-split=component
function KampeWrapper() {
	if (useRouterState({ select: (s) => s.matches.some((m) => m.routeId.includes("$matchId")) })) return /* @__PURE__ */ jsx(Outlet, {});
	return /* @__PURE__ */ jsx(KampePage, {});
}
function toLocalInput(date) {
	const pad = (n) => String(n).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function KampePage() {
	const { user, current, isAdmin } = useTeam();
	const queryClient = useQueryClient();
	const teamId = current?.teamId;
	const [createOpen, setCreateOpen] = useState(false);
	const [opponent, setOpponent] = useState("");
	const [playedAt, setPlayedAt] = useState(() => toLocalInput(/* @__PURE__ */ new Date()));
	const [closesAt, setClosesAt] = useState(() => toLocalInput(new Date(Date.now() + 2880 * 60 * 1e3)));
	const [selected, setSelected] = useState(/* @__PURE__ */ new Set());
	const [busy, setBusy] = useState(false);
	const { data: matches = [] } = useQuery({
		queryKey: [
			"team",
			teamId,
			"matches"
		],
		enabled: !!teamId,
		queryFn: async () => {
			const { data, error } = await supabase.from("matches").select("id, opponent, played_at, voting_closes_at, status").eq("team_id", teamId).order("played_at", { ascending: false });
			if (error) throw error;
			return data ?? [];
		}
	});
	const { data: leaderboardRows = [] } = useQuery({
		queryKey: [
			"team",
			teamId,
			"motm-agg"
		],
		enabled: !!teamId,
		refetchInterval: 3e4,
		queryFn: async () => {
			const { data, error } = await supabase.rpc("get_team_motm_leaderboard", { _team_id: teamId });
			if (error) throw error;
			return data ?? [];
		}
	});
	const { data: members = [] } = useQuery({
		queryKey: [
			"team",
			teamId,
			"members"
		],
		enabled: !!teamId && isAdmin,
		queryFn: () => fetchTeamMembers(teamId)
	});
	if (!current || !teamId) return null;
	const leaderboard = leaderboardRows.map((row) => ({
		name: row.display_name ?? "Ukendt",
		votes: Number(row.votes)
	}));
	const maxVotes = leaderboard[0]?.votes ?? 0;
	const openCreate = () => {
		setSelected(new Set(members.map((m) => m.userId)));
		setCreateOpen(true);
	};
	const toggleSelected = (userId) => {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(userId)) next.delete(userId);
			else next.add(userId);
			return next;
		});
	};
	const handleCreate = async () => {
		if (!opponent.trim()) {
			toast.error("Skriv modstanderens navn");
			return;
		}
		setBusy(true);
		const { data: created, error } = await supabase.from("matches").insert({
			team_id: teamId,
			opponent: opponent.trim(),
			played_at: new Date(playedAt).toISOString(),
			voting_closes_at: new Date(closesAt).toISOString(),
			created_by: user.id
		}).select("id").single();
		if (error || !created) {
			setBusy(false);
			toast.error(error?.message ?? "Kunne ikke oprette kampen");
			return;
		}
		if (selected.size > 0) {
			const rows = Array.from(selected).map((userId) => ({
				match_id: created.id,
				user_id: userId
			}));
			const { error: playersError } = await supabase.from("match_players").insert(rows);
			if (playersError) {
				setBusy(false);
				toast.error(playersError.message);
				return;
			}
		}
		setBusy(false);
		toast.success(selected.size > 0 ? "Kamp oprettet — spillerne har fået besked om afstemningen" : "Kamp oprettet — tilføj nu spillere til kampen");
		setCreateOpen(false);
		setOpponent("");
		setSelected(/* @__PURE__ */ new Set());
		await queryClient.invalidateQueries({ queryKey: ["team", teamId] });
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "flex flex-wrap items-end justify-between gap-3",
				children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", {
					className: "font-display text-4xl font-semibold",
					children: "Kampe"
				}), /* @__PURE__ */ jsx("p", {
					className: "mt-1 text-muted-foreground",
					children: "Stem på kampens spiller efter hver kamp"
				})] }), isAdmin && /* @__PURE__ */ jsxs(Button, {
					onClick: openCreate,
					children: [/* @__PURE__ */ jsx(CalendarPlus, { className: "mr-2 h-4 w-4" }), " Opret kamp"]
				})]
			}),
			leaderboard.length > 0 && /* @__PURE__ */ jsxs("section", {
				className: "rounded-2xl border bg-card p-5 shadow-card",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ jsx(Trophy, { className: "h-5 w-5 text-gold" }), /* @__PURE__ */ jsx("h2", {
							className: "font-display text-xl font-semibold",
							children: "Kampens spiller — samlet stilling"
						})]
					}),
					/* @__PURE__ */ jsx("p", {
						className: "mt-1 text-xs text-muted-foreground",
						children: "Samlede stemmer fra alle holdets kampe — alle stemmer er anonyme."
					}),
					/* @__PURE__ */ jsx("ul", {
						className: "mt-4 space-y-3",
						children: leaderboard.slice(0, 10).map((entry, index) => /* @__PURE__ */ jsxs("li", {
							className: "flex items-center gap-3",
							children: [/* @__PURE__ */ jsx("span", {
								className: `flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${index === 0 ? "bg-gold text-gold-foreground" : index === 1 ? "bg-secondary text-secondary-foreground" : index === 2 ? "bg-gold-soft text-gold-foreground" : "bg-secondary text-muted-foreground"}`,
								children: index < 3 ? /* @__PURE__ */ jsx(Medal, { className: "h-4 w-4" }) : index + 1
							}), /* @__PURE__ */ jsxs("div", {
								className: "min-w-0 flex-1",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "flex items-baseline justify-between gap-2",
									children: [/* @__PURE__ */ jsx("p", {
										className: "truncate text-sm font-semibold",
										children: entry.name
									}), /* @__PURE__ */ jsxs("p", {
										className: "text-xs font-medium text-muted-foreground",
										children: [
											entry.votes,
											" ",
											entry.votes === 1 ? "stemme" : "stemmer"
										]
									})]
								}), /* @__PURE__ */ jsx("div", {
									className: "mt-1 h-2 overflow-hidden rounded-full bg-secondary",
									children: /* @__PURE__ */ jsx("div", {
										className: "h-full rounded-full bg-pitch transition-all",
										style: { width: `${maxVotes > 0 ? entry.votes / maxVotes * 100 : 0}%` }
									})
								})]
							})]
						}, entry.name))
					})
				]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "space-y-3",
				children: [/* @__PURE__ */ jsx("h2", {
					className: "font-display text-xl font-semibold",
					children: "Alle kampe"
				}), matches.length === 0 ? /* @__PURE__ */ jsx("div", {
					className: "rounded-2xl border bg-card p-10 text-center shadow-card",
					children: /* @__PURE__ */ jsx("p", {
						className: "text-sm text-muted-foreground",
						children: isAdmin ? "Ingen kampe endnu. Opret den første kamp, og tilføj spillere til den." : "Der er ikke oprettet kampe endnu."
					})
				}) : /* @__PURE__ */ jsx("ul", {
					className: "grid gap-3 sm:grid-cols-2",
					children: matches.map((match) => {
						const votingOpen = match.status === "open" && new Date(match.voting_closes_at) > /* @__PURE__ */ new Date();
						return /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(Link, {
							to: "/kampe/$matchId",
							params: { matchId: match.id },
							className: "block rounded-2xl border bg-card p-5 shadow-card transition-all hover:shadow-pop",
							children: [
								/* @__PURE__ */ jsxs("div", {
									className: "flex items-center justify-between gap-2",
									children: [/* @__PURE__ */ jsxs("p", {
										className: "font-display text-2xl font-semibold",
										children: ["vs. ", match.opponent]
									}), /* @__PURE__ */ jsx(Badge, {
										variant: votingOpen ? "pitch" : "muted",
										children: votingOpen ? "Afstemning åben" : "Afstemning lukket"
									})]
								}),
								/* @__PURE__ */ jsxs("p", {
									className: "mt-1 text-sm text-muted-foreground",
									children: ["Spillet ", formatDateTime(match.played_at)]
								}),
								votingOpen && /* @__PURE__ */ jsxs("p", {
									className: "mt-1 text-xs text-muted-foreground",
									children: ["Stem senest ", formatDateTime(match.voting_closes_at)]
								})
							]
						}) }, match.id);
					})
				})]
			}),
			/* @__PURE__ */ jsx(Dialog, {
				open: createOpen,
				onOpenChange: setCreateOpen,
				children: /* @__PURE__ */ jsxs(DialogContent, { children: [
					/* @__PURE__ */ jsxs("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ jsx(DialogTitle, { children: "Opret kamp" }), /* @__PURE__ */ jsx(DialogDescription, { children: "Vælg modstander, tidspunkter og spillere. De tilføjede spillere får besked om afstemningen og kan stemme på kampens spiller." })]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "space-y-4",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "space-y-2",
								children: [/* @__PURE__ */ jsx(Label, {
									htmlFor: "opponent",
									children: "Modstander"
								}), /* @__PURE__ */ jsx(Input, {
									id: "opponent",
									value: opponent,
									onChange: (e) => setOpponent(e.target.value),
									placeholder: "Fx Østby BK"
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "space-y-2",
								children: [/* @__PURE__ */ jsx(Label, {
									htmlFor: "played-at",
									children: "Spillet"
								}), /* @__PURE__ */ jsx(Input, {
									id: "played-at",
									type: "datetime-local",
									value: playedAt,
									onChange: (e) => setPlayedAt(e.target.value)
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "space-y-2",
								children: [/* @__PURE__ */ jsx(Label, {
									htmlFor: "closes-at",
									children: "Afstemning lukker"
								}), /* @__PURE__ */ jsx(Input, {
									id: "closes-at",
									type: "datetime-local",
									value: closesAt,
									onChange: (e) => setClosesAt(e.target.value)
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "space-y-2",
								children: [
									/* @__PURE__ */ jsxs("div", {
										className: "flex items-center justify-between",
										children: [/* @__PURE__ */ jsx(Label, { children: "Spillere til kampen" }), members.length > 0 && /* @__PURE__ */ jsx("button", {
											type: "button",
											className: "text-xs font-medium text-pitch hover:underline",
											onClick: () => setSelected((prev) => prev.size === members.length ? /* @__PURE__ */ new Set() : new Set(members.map((m) => m.userId))),
											children: selected.size === members.length ? "Fravælg alle" : "Vælg alle"
										})]
									}),
									members.length === 0 ? /* @__PURE__ */ jsx("p", {
										className: "text-sm text-muted-foreground",
										children: "Henter spillere…"
									}) : /* @__PURE__ */ jsx("ul", {
										className: "max-h-48 space-y-1 overflow-y-auto rounded-xl border p-1",
										children: members.map((m) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs("label", {
											className: "flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-secondary",
											children: [/* @__PURE__ */ jsx(Checkbox, {
												checked: selected.has(m.userId),
												onCheckedChange: () => toggleSelected(m.userId)
											}), /* @__PURE__ */ jsx("span", {
												className: "text-sm font-medium",
												children: m.name
											})]
										}) }, m.userId))
									}),
									/* @__PURE__ */ jsx("p", {
										className: "text-xs text-muted-foreground",
										children: "Tilføjede spillere kan stemme og får besked om afstemningens start og sluttidspunkt."
									})
								]
							})
						]
					}),
					/* @__PURE__ */ jsxs(DialogFooter, { children: [/* @__PURE__ */ jsx(Button, {
						variant: "outline",
						onClick: () => setCreateOpen(false),
						children: "Annuller"
					}), /* @__PURE__ */ jsx(Button, {
						onClick: handleCreate,
						disabled: busy || !opponent.trim(),
						children: "Opret kamp"
					})] })
				] })
			})
		]
	});
}
//#endregion
export { KampeWrapper as component };
