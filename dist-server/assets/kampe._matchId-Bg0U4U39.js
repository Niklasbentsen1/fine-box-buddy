import { t as supabase } from "./client-BFBFtBi6.js";
import { t as Route } from "./kampe._matchId-DuZ13eOS.js";
import { n as useTeam } from "./team-CqHp8PgM.js";
import { a as initials, r as formatDateTime } from "./format-CaErknZY.js";
import { t as Button } from "./button-D59AmRzD.js";
import { t as Badge } from "./badge-C-vqPte3.js";
import { a as DialogTitle, i as DialogFooter, n as DialogContent, r as DialogDescription, t as Dialog } from "./dialog-ByDaNPTM.js";
import { t as fetchTeamMembers } from "./api-C87KH-wk.js";
import { t as Checkbox } from "./checkbox-zaQcwLKK.js";
import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Crown, Lock, Trash2, UserMinus, UserPlus, Vote } from "lucide-react";
//#region src/routes/_authenticated/kampe.$matchId.tsx?tsr-split=component
function MatchDetailPage() {
	const { matchId } = Route.useParams();
	const { user, current, isAdmin } = useTeam();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const teamId = current?.teamId;
	const [addOpen, setAddOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [selected, setSelected] = useState(/* @__PURE__ */ new Set());
	const [busy, setBusy] = useState(false);
	const { data: match, isLoading: matchLoading } = useQuery({
		queryKey: [
			"team",
			teamId,
			"match",
			matchId
		],
		enabled: !!teamId,
		queryFn: async () => {
			const { data, error } = await supabase.from("matches").select("id, team_id, opponent, played_at, voting_closes_at, status").eq("id", matchId).maybeSingle();
			if (error) throw error;
			return data ?? null;
		}
	});
	const { data: players = [] } = useQuery({
		queryKey: [
			"team",
			teamId,
			"match-players",
			matchId
		],
		enabled: !!teamId,
		queryFn: async () => {
			const { data, error } = await supabase.from("match_players").select("id, user_id, profiles(display_name)").eq("match_id", matchId);
			if (error) throw error;
			return data ?? [];
		}
	});
	const { data: myVotes = [] } = useQuery({
		queryKey: [
			"team",
			teamId,
			"match-my-vote",
			matchId,
			user.id
		],
		enabled: !!teamId,
		queryFn: async () => {
			const { data, error } = await supabase.from("motm_votes").select("voted_for_id").eq("match_id", matchId);
			if (error) throw error;
			return data ?? [];
		}
	});
	const { data: counts = [] } = useQuery({
		queryKey: [
			"team",
			teamId,
			"match-vote-counts",
			matchId
		],
		enabled: !!teamId,
		queryFn: async () => {
			const { data, error } = await supabase.rpc("get_match_vote_counts", { _match_id: matchId });
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
	if (matchLoading) return /* @__PURE__ */ jsx("div", {
		className: "flex justify-center py-20",
		children: /* @__PURE__ */ jsx("div", { className: "h-8 w-8 animate-spin rounded-full border-2 border-pitch border-t-transparent" })
	});
	if (!match) return /* @__PURE__ */ jsxs("div", {
		className: "rounded-2xl border bg-card p-10 text-center shadow-card",
		children: [
			/* @__PURE__ */ jsx("h1", {
				className: "font-display text-2xl font-semibold",
				children: "Kampen findes ikke"
			}),
			/* @__PURE__ */ jsx("p", {
				className: "mt-2 text-sm text-muted-foreground",
				children: "Den er måske blevet slettet af en administrator."
			}),
			/* @__PURE__ */ jsx(Button, {
				variant: "outline",
				className: "mt-6",
				onClick: () => navigate({ to: "/kampe" }),
				children: "Tilbage til kampe"
			})
		]
	});
	const votingOpen = match.status === "open" && new Date(match.voting_closes_at) > /* @__PURE__ */ new Date();
	const isParticipant = players.some((p) => p.user_id === user.id);
	const myVote = myVotes[0];
	const canVote = votingOpen && isParticipant && !myVote;
	const voteCounts = /* @__PURE__ */ new Map();
	let totalVotes = 0;
	for (const c of counts) {
		const n = Number(c.votes);
		voteCounts.set(c.user_id, n);
		totalVotes += n;
	}
	const maxCount = Math.max(0, ...voteCounts.values());
	const leaders = new Set(Array.from(voteCounts.entries()).filter(([, count]) => count === maxCount && count > 0).map(([id]) => id));
	const refresh = () => queryClient.invalidateQueries({ queryKey: ["team", teamId] });
	const handleVote = async (votedForId, name) => {
		const { error } = await supabase.from("motm_votes").insert({
			match_id: matchId,
			voter_id: user.id,
			voted_for_id: votedForId
		});
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success(`Du har stemt på ${name}`);
		await refresh();
	};
	const handleAddPlayers = async () => {
		if (selected.size === 0) return;
		setBusy(true);
		const rows = Array.from(selected).map((userId) => ({
			match_id: matchId,
			user_id: userId
		}));
		const { error } = await supabase.from("match_players").insert(rows);
		setBusy(false);
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success("Spillere tilføjet til kampen");
		setAddOpen(false);
		setSelected(/* @__PURE__ */ new Set());
		await refresh();
	};
	const handleRemovePlayer = async (playerId) => {
		const { error } = await supabase.from("match_players").delete().eq("id", playerId);
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success("Spiller fjernet fra kampen");
		await refresh();
	};
	const handleCloseVoting = async () => {
		const { error } = await supabase.from("matches").update({ status: "closed" }).eq("id", matchId);
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success("Afstemningen er lukket");
		await refresh();
	};
	const handleDeleteMatch = async () => {
		const { error } = await supabase.from("matches").delete().eq("id", matchId);
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success("Kampen er slettet");
		navigate({ to: "/kampe" });
	};
	const toggleSelected = (userId) => {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(userId)) next.delete(userId);
			else next.add(userId);
			return next;
		});
	};
	const playerIds = new Set(players.map((p) => p.user_id));
	const addable = members.filter((m) => !playerIds.has(m.userId));
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs(Link, {
				to: "/kampe",
				className: "inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground",
				children: [/* @__PURE__ */ jsx(ArrowLeft, { className: "h-4 w-4" }), " Alle kampe"]
			}), /* @__PURE__ */ jsxs("div", {
				className: "mt-2 flex flex-wrap items-center justify-between gap-3",
				children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("h1", {
					className: "font-display text-4xl font-semibold",
					children: ["vs. ", match.opponent]
				}), /* @__PURE__ */ jsxs("p", {
					className: "mt-1 text-muted-foreground",
					children: ["Spillet ", formatDateTime(match.played_at)]
				})] }), /* @__PURE__ */ jsx(Badge, {
					variant: votingOpen ? "pitch" : "muted",
					className: "text-sm",
					children: votingOpen ? `Afstemning åben til ${formatDateTime(match.voting_closes_at)}` : "Afstemning lukket"
				})]
			})] }),
			isAdmin && /* @__PURE__ */ jsxs("div", {
				className: "flex flex-wrap gap-2",
				children: [
					/* @__PURE__ */ jsxs(Button, {
						variant: "outline",
						onClick: () => setAddOpen(true),
						children: [/* @__PURE__ */ jsx(UserPlus, { className: "mr-2 h-4 w-4" }), " Tilføj spillere"]
					}),
					votingOpen && /* @__PURE__ */ jsxs(Button, {
						variant: "subtle",
						onClick: handleCloseVoting,
						children: [/* @__PURE__ */ jsx(Lock, { className: "mr-2 h-4 w-4" }), " Luk afstemning nu"]
					}),
					/* @__PURE__ */ jsxs(Button, {
						variant: "outline",
						onClick: () => setDeleteOpen(true),
						className: "text-destructive",
						children: [/* @__PURE__ */ jsx(Trash2, { className: "mr-2 h-4 w-4" }), " Slet kamp"]
					})
				]
			}),
			!votingOpen && leaders.size > 0 && /* @__PURE__ */ jsxs("section", {
				className: "rounded-2xl border border-gold/60 bg-gold-soft/60 p-5 text-center",
				children: [
					/* @__PURE__ */ jsx(Crown, { className: "mx-auto h-8 w-8 text-gold" }),
					/* @__PURE__ */ jsx("h2", {
						className: "mt-2 font-display text-2xl font-semibold",
						children: leaders.size === 1 ? "Kampens spiller" : "Kampens spillere (uafgjort)"
					}),
					/* @__PURE__ */ jsx("p", {
						className: "mt-1 text-lg font-semibold text-gold-foreground",
						children: players.filter((p) => leaders.has(p.user_id)).map((p) => p.profiles?.display_name ?? "Ukendt").join(" & ")
					}),
					/* @__PURE__ */ jsxs("p", {
						className: "text-sm text-muted-foreground",
						children: [
							maxCount,
							" ",
							maxCount === 1 ? "stemme" : "stemmer"
						]
					})
				]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "rounded-2xl border bg-card p-5 shadow-card",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ jsx(Vote, { className: "h-5 w-5 text-pitch" }), /* @__PURE__ */ jsxs("h2", {
							className: "font-display text-xl font-semibold",
							children: [
								"Spillere og stemmer (",
								totalVotes,
								")"
							]
						})]
					}),
					/* @__PURE__ */ jsx("p", {
						className: "mt-1 text-xs text-muted-foreground",
						children: "Alle stemmer er anonyme — kun det samlede stemmetal vises."
					}),
					!isParticipant && !isAdmin && /* @__PURE__ */ jsx("p", {
						className: "mt-3 rounded-xl bg-secondary p-3 text-sm text-muted-foreground",
						children: "Kun spillere, der er tilføjet til kampen, kan stemme."
					}),
					myVote && /* @__PURE__ */ jsxs("p", {
						className: "mt-3 rounded-xl bg-pitch-soft p-3 text-sm text-pitch",
						children: [
							"Du har stemt på",
							" ",
							players.find((p) => p.user_id === myVote.voted_for_id)?.profiles?.display_name ?? "en medspiller",
							"."
						]
					}),
					players.length === 0 ? /* @__PURE__ */ jsx("p", {
						className: "mt-3 text-sm text-muted-foreground",
						children: isAdmin ? "Ingen spillere tilføjet endnu — tilføj spillere for at åbne afstemningen." : "Der er ikke tilføjet spillere til kampen endnu."
					}) : /* @__PURE__ */ jsx("ul", {
						className: "mt-4 space-y-3",
						children: players.map((player) => {
							const count = voteCounts.get(player.user_id) ?? 0;
							const name = player.profiles?.display_name ?? "Ukendt";
							const isSelf = player.user_id === user.id;
							const isLeader = leaders.has(player.user_id);
							return /* @__PURE__ */ jsxs("li", {
								className: "flex items-center gap-3",
								children: [
									/* @__PURE__ */ jsx("span", {
										className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary",
										children: initials(name) || "?"
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "min-w-0 flex-1",
										children: [/* @__PURE__ */ jsxs("p", {
											className: "flex items-center gap-1.5 truncate text-sm font-semibold",
											children: [
												name,
												isSelf && /* @__PURE__ */ jsx("span", {
													className: "text-xs font-normal text-muted-foreground",
													children: "(dig)"
												}),
												isLeader && totalVotes > 0 && /* @__PURE__ */ jsx(Crown, { className: "h-4 w-4 text-gold" })
											]
										}), /* @__PURE__ */ jsxs("div", {
											className: "mt-1 flex items-center gap-2",
											children: [/* @__PURE__ */ jsx("div", {
												className: "h-2 flex-1 overflow-hidden rounded-full bg-secondary",
												children: /* @__PURE__ */ jsx("div", {
													className: "h-full rounded-full bg-pitch transition-all",
													style: { width: `${maxCount > 0 ? count / maxCount * 100 : 0}%` }
												})
											}), /* @__PURE__ */ jsxs("span", {
												className: "w-14 text-right text-xs font-medium text-muted-foreground",
												children: [
													count,
													" ",
													count === 1 ? "stemme" : "stemmer"
												]
											})]
										})]
									}),
									canVote && !isSelf && /* @__PURE__ */ jsx(Button, {
										size: "sm",
										variant: "pitch",
										onClick: () => handleVote(player.user_id, name),
										children: "Stem"
									}),
									isAdmin && /* @__PURE__ */ jsx("button", {
										onClick: () => handleRemovePlayer(player.id),
										className: "rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive",
										"aria-label": `Fjern ${name} fra kampen`,
										children: /* @__PURE__ */ jsx(UserMinus, { className: "h-4 w-4" })
									})
								]
							}, player.id);
						})
					})
				]
			}),
			/* @__PURE__ */ jsx(Dialog, {
				open: addOpen,
				onOpenChange: setAddOpen,
				children: /* @__PURE__ */ jsxs(DialogContent, { children: [
					/* @__PURE__ */ jsxs("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ jsx(DialogTitle, { children: "Tilføj spillere til kampen" }), /* @__PURE__ */ jsx(DialogDescription, { children: "Kun tilføjede spillere kan stemme og modtage stemmer." })]
					}),
					addable.length === 0 ? /* @__PURE__ */ jsx("p", {
						className: "text-sm text-muted-foreground",
						children: "Alle holdets medlemmer er allerede tilføjet til kampen."
					}) : /* @__PURE__ */ jsx("ul", {
						className: "max-h-64 space-y-1 overflow-y-auto",
						children: addable.map((m) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs("label", {
							className: "flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 hover:bg-secondary",
							children: [/* @__PURE__ */ jsx(Checkbox, {
								checked: selected.has(m.userId),
								onCheckedChange: () => toggleSelected(m.userId)
							}), /* @__PURE__ */ jsx("span", {
								className: "text-sm font-medium",
								children: m.name
							})]
						}) }, m.userId))
					}),
					/* @__PURE__ */ jsxs(DialogFooter, { children: [/* @__PURE__ */ jsx(Button, {
						variant: "outline",
						onClick: () => setAddOpen(false),
						children: "Annuller"
					}), /* @__PURE__ */ jsxs(Button, {
						onClick: handleAddPlayers,
						disabled: busy || selected.size === 0,
						children: ["Tilføj ", selected.size > 0 ? `(${selected.size})` : ""]
					})] })
				] })
			}),
			/* @__PURE__ */ jsx(Dialog, {
				open: deleteOpen,
				onOpenChange: setDeleteOpen,
				children: /* @__PURE__ */ jsxs(DialogContent, { children: [/* @__PURE__ */ jsxs("div", {
					className: "space-y-1.5",
					children: [/* @__PURE__ */ jsx(DialogTitle, { children: "Slet kamp?" }), /* @__PURE__ */ jsxs(DialogDescription, { children: [
						"Kampen mod ",
						match.opponent,
						" slettes permanent sammen med tilføjede spillere og alle afgivne stemmer. Handlingen kan ikke fortrydes."
					] })]
				}), /* @__PURE__ */ jsxs(DialogFooter, { children: [/* @__PURE__ */ jsx(Button, {
					variant: "outline",
					onClick: () => setDeleteOpen(false),
					children: "Annuller"
				}), /* @__PURE__ */ jsx(Button, {
					variant: "destructive",
					onClick: handleDeleteMatch,
					disabled: busy,
					children: "Slet kamp"
				})] })] })
			})
		]
	});
}
//#endregion
export { MatchDetailPage as component };
