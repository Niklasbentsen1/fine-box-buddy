import { t as supabase } from "./client-BFBFtBi6.js";
import { n as useTeam } from "./team-CqHp8PgM.js";
import { i as formatKr, o as sumAmounts, r as formatDateTime, t as firstName } from "./format-CaErknZY.js";
import { t as Button } from "./button-D59AmRzD.js";
import { t as Badge } from "./badge-C-vqPte3.js";
import { a as DialogTitle, i as DialogFooter, n as DialogContent, r as DialogDescription, t as Dialog } from "./dialog-ByDaNPTM.js";
import { n as Input, t as Label } from "./label-BzS4-9r3.js";
import { t as fetchTeamMembers } from "./api-C87KH-wk.js";
import { t as StatCard } from "./stat-card-iXQ7dU5v.js";
import { t as Avatar } from "./avatar-CtJ2Q4YU.js";
import { n as DropdownMenuContent, o as DropdownMenuTrigger, r as DropdownMenuItem, t as DropdownMenu } from "./dropdown-menu-CL9bt5NL.js";
import { useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BellRing, CalendarOff, Check, Copy, HandCoins, MoreVertical, Pencil, Phone, PiggyBank, ShieldMinus, ShieldPlus, Smartphone, Ticket, Trash2, UserCheck, UserMinus, UserX, Wallet } from "lucide-react";
//#region src/routes/_authenticated/hold.tsx?tsr-split=component
function HoldPage() {
	const { user, current, isAdmin, refreshMemberships } = useTeam();
	const queryClient = useQueryClient();
	const teamId = current?.teamId;
	const [withdrawOpen, setWithdrawOpen] = useState(false);
	const [withdrawAmount, setWithdrawAmount] = useState("");
	const [withdrawNote, setWithdrawNote] = useState("");
	const [mpOpen, setMpOpen] = useState(false);
	const [mpNumber, setMpNumber] = useState("");
	const [seasonOpen, setSeasonOpen] = useState(false);
	const [selectedMember, setSelectedMember] = useState(null);
	const [busy, setBusy] = useState(false);
	const [codeCopied, setCodeCopied] = useState(false);
	const { data: members = [] } = useQuery({
		queryKey: [
			"team",
			teamId,
			"members"
		],
		enabled: !!teamId,
		queryFn: () => fetchTeamMembers(teamId)
	});
	const { data: pending = [] } = useQuery({
		queryKey: [
			"team",
			teamId,
			"pending-members"
		],
		enabled: !!teamId && isAdmin,
		queryFn: async () => {
			const { data, error } = await supabase.rpc("get_pending_members", { _team_id: teamId });
			if (error) throw error;
			return data ?? [];
		}
	});
	const { data: fines = [] } = useQuery({
		queryKey: [
			"team",
			teamId,
			"all-fines-sums"
		],
		enabled: !!teamId,
		queryFn: async () => {
			const { data, error } = await supabase.from("fines").select("user_id, amount").eq("team_id", teamId);
			if (error) throw error;
			return data ?? [];
		}
	});
	const { data: payments = [] } = useQuery({
		queryKey: [
			"team",
			teamId,
			"all-payments-sums"
		],
		enabled: !!teamId,
		queryFn: async () => {
			const { data, error } = await supabase.from("payments").select("user_id, amount, status").eq("team_id", teamId);
			if (error) throw error;
			return data ?? [];
		}
	});
	const { data: withdrawals = [] } = useQuery({
		queryKey: [
			"team",
			teamId,
			"withdrawals"
		],
		enabled: !!teamId,
		queryFn: async () => {
			const { data, error } = await supabase.from("withdrawals").select("amount").eq("team_id", teamId);
			if (error) throw error;
			return data ?? [];
		}
	});
	if (!current || !teamId) return null;
	const finesTotal = sumAmounts(fines);
	const approvedPayments = payments.filter((p) => p.status === "approved");
	const paidTotal = sumAmounts(approvedPayments);
	const withdrawnTotal = sumAmounts(withdrawals);
	const carryover = current.balanceCarryover ?? 0;
	const cashBalance = carryover + paidTotal - withdrawnTotal;
	const outstandingTotal = Math.max(0, finesTotal - paidTotal);
	const perMember = members.map((m) => {
		const memberFines = sumAmounts(fines.filter((f) => f.user_id === m.userId));
		const memberPaid = sumAmounts(approvedPayments.filter((p) => p.user_id === m.userId));
		return {
			...m,
			fines: memberFines,
			paid: memberPaid,
			owed: Math.max(0, memberFines - memberPaid)
		};
	});
	const refresh = () => queryClient.invalidateQueries({ queryKey: ["team", teamId] });
	const copyInviteCode = async () => {
		try {
			await navigator.clipboard.writeText(`Tilmeld dig min klub med koden ${current.inviteCode}`);
			setCodeCopied(true);
			setTimeout(() => setCodeCopied(false), 1500);
		} catch {
			toast.error("Kunne ikke kopiere koden");
		}
	};
	const handleReminder = async (userId, name) => {
		const { error } = await supabase.from("reminders").insert({
			team_id: teamId,
			user_id: userId,
			sent_by: user.id
		});
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success(`Påmindelse sendt til ${firstName(name)}`);
	};
	const handleRemove = async (userId, name) => {
		const { error } = await supabase.from("team_members").delete().eq("team_id", teamId).eq("user_id", userId);
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success(`${firstName(name)} er fjernet fra holdet`);
		await refresh();
	};
	const handleSetRole = async (userId, name, role) => {
		const { error } = await supabase.rpc("set_team_member_role", {
			_team_id: teamId,
			_user_id: userId,
			_role: role
		});
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success(role === "admin" ? `${firstName(name)} er nu administrator` : `${firstName(name)} er ikke administrator længere`);
		await refresh();
	};
	const handleApprove = async (userId, name) => {
		const { error } = await supabase.rpc("approve_member", {
			_team_id: teamId,
			_user_id: userId
		});
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success(`${firstName(name)} er godkendt til holdet`);
		await refresh();
	};
	const handleReject = async (userId, name) => {
		const { error } = await supabase.from("team_members").delete().eq("team_id", teamId).eq("user_id", userId).eq("status", "pending");
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success(`Anmodningen fra ${firstName(name)} er afvist`);
		await refresh();
	};
	const handleSaveMobilepay = async () => {
		const trimmed = mpNumber.trim();
		if (trimmed && !/^\d{8}$/.test(trimmed)) {
			toast.error("Nummeret skal være præcis 8 cifre");
			return;
		}
		setBusy(true);
		const { error } = await supabase.from("teams").update({ mobilepay_number: trimmed || null }).eq("id", teamId);
		setBusy(false);
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success(trimmed ? "MobilePay-nummer gemt" : "MobilePay-nummer fjernet");
		setMpOpen(false);
		await refreshMemberships();
	};
	const handleWithdraw = async () => {
		const amount = Number(withdrawAmount.replace(",", "."));
		if (!amount || amount <= 0) {
			toast.error("Indtast et beløb større end 0");
			return;
		}
		if (amount > cashBalance) {
			toast.error("Beløbet overstiger kassens saldo");
			return;
		}
		setBusy(true);
		const { error } = await supabase.from("withdrawals").insert({
			team_id: teamId,
			amount,
			note: withdrawNote.trim() || null,
			created_by: user.id
		});
		setBusy(false);
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success("Udbetaling registreret");
		setWithdrawOpen(false);
		setWithdrawAmount("");
		setWithdrawNote("");
		await refresh();
	};
	const handleEndSeason = async () => {
		setBusy(true);
		const { error } = await supabase.rpc("end_season", { _team_id: teamId });
		setBusy(false);
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success("Sæsonen er afsluttet — kassens saldo er overført til den nye sæson");
		setSeasonOpen(false);
		await queryClient.invalidateQueries();
		await refreshMemberships();
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "flex flex-wrap items-end justify-between gap-3",
				children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", {
					className: "font-display text-4xl font-semibold",
					children: current.teamName
				}), /* @__PURE__ */ jsx("p", {
					className: "mt-1 text-muted-foreground",
					children: current.clubName
				})] }), isAdmin && /* @__PURE__ */ jsxs(Button, {
					variant: "outline",
					onClick: () => setWithdrawOpen(true),
					children: [/* @__PURE__ */ jsx(Wallet, { className: "mr-2 h-4 w-4" }), " Træk penge ud"]
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "grid grid-cols-2 gap-3 lg:grid-cols-4",
				children: [
					/* @__PURE__ */ jsx(StatCard, {
						label: "Kassens saldo",
						value: formatKr(cashBalance),
						icon: PiggyBank,
						tone: "pitch",
						hint: [carryover !== 0 ? `${formatKr(carryover)} overført fra sidste sæson` : null, withdrawnTotal > 0 ? `${formatKr(withdrawnTotal)} udbetalt` : null].filter(Boolean).join(" · ") || void 0
					}),
					/* @__PURE__ */ jsx(StatCard, {
						label: "Givne bøder",
						value: formatKr(finesTotal),
						icon: Ticket,
						tone: "gold"
					}),
					/* @__PURE__ */ jsx(StatCard, {
						label: "Manglende indbetalinger",
						value: formatKr(outstandingTotal),
						icon: BellRing,
						tone: outstandingTotal > 0 ? "red" : "navy"
					}),
					/* @__PURE__ */ jsx(StatCard, {
						label: "Indbetalt",
						value: formatKr(paidTotal),
						icon: HandCoins,
						tone: "navy"
					})
				]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-card",
				children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("p", {
					className: "text-xs font-medium uppercase tracking-wide text-muted-foreground",
					children: "Klubkode"
				}), /* @__PURE__ */ jsx("p", {
					className: "font-mono text-xl font-bold tracking-[0.25em]",
					children: current.inviteCode
				})] }), /* @__PURE__ */ jsxs(Button, {
					variant: "subtle",
					size: "sm",
					onClick: copyInviteCode,
					children: [codeCopied ? /* @__PURE__ */ jsx(Check, { className: "mr-2 h-4 w-4 text-pitch" }) : /* @__PURE__ */ jsx(Copy, { className: "mr-2 h-4 w-4" }), codeCopied ? "Kopieret" : "Kopiér kode"]
				})]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-card",
				children: [/* @__PURE__ */ jsxs("div", { children: [
					/* @__PURE__ */ jsx("p", {
						className: "text-xs font-medium uppercase tracking-wide text-muted-foreground",
						children: "MobilePay-nummer"
					}),
					/* @__PURE__ */ jsxs("p", {
						className: "flex items-center gap-2 font-mono text-xl font-bold tracking-[0.15em]",
						children: [/* @__PURE__ */ jsx(Smartphone, { className: "h-5 w-5 text-pitch" }), current.mobilepayNumber ?? "Ikke sat op"]
					}),
					/* @__PURE__ */ jsx("p", {
						className: "mt-0.5 text-xs text-muted-foreground",
						children: current.mobilepayNumber ? "Medlemmer kan betale bøder direkte til dette nummer" : "Medlemmer kan ikke betale via MobilePay, før nummeret er sat op"
					})
				] }), isAdmin && /* @__PURE__ */ jsxs(Button, {
					variant: "subtle",
					size: "sm",
					onClick: () => {
						setMpNumber(current.mobilepayNumber ?? "");
						setMpOpen(true);
					},
					children: [/* @__PURE__ */ jsx(Pencil, { className: "mr-2 h-4 w-4" }), current.mobilepayNumber ? "Rediger nummer" : "Tilføj nummer"]
				})]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "rounded-2xl border bg-card p-5 shadow-card",
				children: [/* @__PURE__ */ jsxs("h2", {
					className: "font-display text-xl font-semibold",
					children: [
						"Spillerliste (",
						members.length,
						")"
					]
				}), /* @__PURE__ */ jsx("ul", {
					className: "mt-3 divide-y",
					children: perMember.map((m) => /* @__PURE__ */ jsxs("li", {
						className: "flex cursor-pointer items-center gap-3 py-3 transition-colors hover:bg-muted/40",
						onClick: () => setSelectedMember(m),
						children: [
							/* @__PURE__ */ jsx(Avatar, {
								name: m.name,
								url: m.avatarUrl
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "min-w-0 flex-1",
								children: [/* @__PURE__ */ jsxs("p", {
									className: "flex items-center gap-2 truncate text-sm font-semibold",
									children: [m.name, m.role === "admin" && /* @__PURE__ */ jsx(Badge, {
										variant: "navy",
										children: "Admin"
									})]
								}), /* @__PURE__ */ jsxs("p", {
									className: "text-xs text-muted-foreground",
									children: [
										"Bøder: ",
										formatKr(m.fines),
										" · Indbetalt: ",
										formatKr(m.paid)
									]
								})]
							}),
							/* @__PURE__ */ jsx(Badge, {
								variant: m.owed > 0 ? "destructive" : "pitch",
								children: m.owed > 0 ? `Skylder ${formatKr(m.owed)}` : "Kvit"
							}),
							isAdmin && m.userId !== user.id && /* @__PURE__ */ jsxs(DropdownMenu, { children: [/* @__PURE__ */ jsx(DropdownMenuTrigger, {
								asChild: true,
								children: /* @__PURE__ */ jsx("button", {
									onClick: (e) => e.stopPropagation(),
									className: "rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary",
									"aria-label": `Handlinger for ${m.name}`,
									children: /* @__PURE__ */ jsx(MoreVertical, { className: "h-4 w-4" })
								})
							}), /* @__PURE__ */ jsxs(DropdownMenuContent, {
								align: "end",
								children: [
									m.role === "admin" ? /* @__PURE__ */ jsxs(DropdownMenuItem, {
										onClick: () => handleSetRole(m.userId, m.name, "member"),
										children: [/* @__PURE__ */ jsx(ShieldMinus, { className: "mr-2 h-4 w-4" }), " Fjern administrator"]
									}) : /* @__PURE__ */ jsxs(DropdownMenuItem, {
										onClick: () => handleSetRole(m.userId, m.name, "admin"),
										children: [/* @__PURE__ */ jsx(ShieldPlus, { className: "mr-2 h-4 w-4" }), " Gør til administrator"]
									}),
									m.owed > 0 && /* @__PURE__ */ jsxs(DropdownMenuItem, {
										onClick: () => handleReminder(m.userId, m.name),
										children: [/* @__PURE__ */ jsx(BellRing, { className: "mr-2 h-4 w-4" }), " Send påmindelse om betaling"]
									}),
									/* @__PURE__ */ jsxs(DropdownMenuItem, {
										onClick: () => handleRemove(m.userId, m.name),
										className: "text-destructive",
										children: [/* @__PURE__ */ jsx(UserMinus, { className: "mr-2 h-4 w-4" }), " Fjern fra holdet"]
									})
								]
							})] })
						]
					}, m.userId))
				})]
			}),
			isAdmin && pending.length > 0 && /* @__PURE__ */ jsxs("section", {
				className: "rounded-2xl border border-gold/40 bg-card p-5 shadow-card",
				children: [
					/* @__PURE__ */ jsxs("h2", {
						className: "font-display text-xl font-semibold",
						children: [
							"Afventer godkendelse (",
							pending.length,
							")"
						]
					}),
					/* @__PURE__ */ jsx("p", {
						className: "mt-1 text-sm text-muted-foreground",
						children: "Disse spillere har brugt klubkoden og venter på godkendelse af en administrator."
					}),
					/* @__PURE__ */ jsx("ul", {
						className: "mt-3 divide-y",
						children: pending.map((p) => /* @__PURE__ */ jsxs("li", {
							className: "flex items-center gap-3 py-3",
							children: [
								/* @__PURE__ */ jsx(Avatar, {
									name: p.display_name,
									url: p.avatar_url
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "min-w-0 flex-1",
									children: [/* @__PURE__ */ jsx("p", {
										className: "truncate text-sm font-semibold",
										children: p.display_name
									}), /* @__PURE__ */ jsxs("p", {
										className: "text-xs text-muted-foreground",
										children: ["Anmodede ", formatDateTime(p.requested_at)]
									})]
								}),
								/* @__PURE__ */ jsxs(Button, {
									variant: "pitch",
									size: "sm",
									onClick: () => handleApprove(p.user_id, p.display_name),
									children: [/* @__PURE__ */ jsx(UserCheck, { className: "mr-2 h-4 w-4" }), " Godkend"]
								}),
								/* @__PURE__ */ jsxs(Button, {
									variant: "outline",
									size: "sm",
									onClick: () => handleReject(p.user_id, p.display_name),
									children: [/* @__PURE__ */ jsx(UserX, { className: "mr-2 h-4 w-4" }), " Afvis"]
								})
							]
						}, p.user_id))
					})
				]
			}),
			isAdmin && /* @__PURE__ */ jsxs("section", {
				className: "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-card p-4 shadow-card",
				children: [/* @__PURE__ */ jsxs("div", { children: [
					/* @__PURE__ */ jsx("p", {
						className: "text-xs font-medium uppercase tracking-wide text-muted-foreground",
						children: "Sæson"
					}),
					/* @__PURE__ */ jsx("p", {
						className: "text-sm font-semibold",
						children: "Afslut sæsonen og start en ny"
					}),
					/* @__PURE__ */ jsx("p", {
						className: "mt-0.5 text-xs text-muted-foreground",
						children: "Alle bøder, indbetalinger, kampe og historik nulstilles — kassens saldo overføres."
					})
				] }), /* @__PURE__ */ jsxs(Button, {
					variant: "outline",
					size: "sm",
					onClick: () => setSeasonOpen(true),
					children: [/* @__PURE__ */ jsx(CalendarOff, { className: "mr-2 h-4 w-4" }), " Afslut sæson"]
				})]
			}),
			/* @__PURE__ */ jsx(Dialog, {
				open: mpOpen,
				onOpenChange: setMpOpen,
				children: /* @__PURE__ */ jsxs(DialogContent, { children: [
					/* @__PURE__ */ jsxs("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ jsx(DialogTitle, { children: "MobilePay-nummer" }), /* @__PURE__ */ jsx(DialogDescription, { children: "Det mobilnummer, som medlemmerne betaler deres bøder til via MobilePay. Lad feltet stå tomt for at fjerne nummeret." })]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "space-y-2",
						children: [/* @__PURE__ */ jsx(Label, {
							htmlFor: "mp-number",
							children: "Mobilnummer (8 cifre)"
						}), /* @__PURE__ */ jsx(Input, {
							id: "mp-number",
							inputMode: "numeric",
							maxLength: 8,
							value: mpNumber,
							onChange: (e) => setMpNumber(e.target.value.replace(/\D/g, "")),
							placeholder: "Fx 12345678"
						})]
					}),
					/* @__PURE__ */ jsxs(DialogFooter, { children: [/* @__PURE__ */ jsx(Button, {
						variant: "outline",
						onClick: () => setMpOpen(false),
						children: "Annuller"
					}), /* @__PURE__ */ jsx(Button, {
						variant: "pitch",
						onClick: handleSaveMobilepay,
						disabled: busy,
						children: "Gem nummer"
					})] })
				] })
			}),
			/* @__PURE__ */ jsx(Dialog, {
				open: withdrawOpen,
				onOpenChange: setWithdrawOpen,
				children: /* @__PURE__ */ jsxs(DialogContent, { children: [
					/* @__PURE__ */ jsxs("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ jsx(DialogTitle, { children: "Træk penge ud af kassen" }), /* @__PURE__ */ jsxs(DialogDescription, { children: [
							"Registrer en udbetaling fra bødekassen — fx til holdets fælles tur. Kassens saldo er",
							" ",
							formatKr(cashBalance),
							"."
						] })]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "space-y-4",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "space-y-2",
							children: [/* @__PURE__ */ jsx(Label, {
								htmlFor: "withdraw-amount",
								children: "Beløb (kr.)"
							}), /* @__PURE__ */ jsx(Input, {
								id: "withdraw-amount",
								inputMode: "decimal",
								value: withdrawAmount,
								onChange: (e) => setWithdrawAmount(e.target.value),
								placeholder: "Fx 500"
							})]
						}), /* @__PURE__ */ jsxs("div", {
							className: "space-y-2",
							children: [/* @__PURE__ */ jsx(Label, {
								htmlFor: "withdraw-note",
								children: "Formål (valgfri)"
							}), /* @__PURE__ */ jsx(Input, {
								id: "withdraw-note",
								value: withdrawNote,
								onChange: (e) => setWithdrawNote(e.target.value),
								placeholder: "Fx Holdtur til Tyskland"
							})]
						})]
					}),
					/* @__PURE__ */ jsxs(DialogFooter, { children: [/* @__PURE__ */ jsx(Button, {
						variant: "outline",
						onClick: () => setWithdrawOpen(false),
						children: "Annuller"
					}), /* @__PURE__ */ jsxs(Button, {
						onClick: handleWithdraw,
						disabled: busy || !withdrawAmount.trim(),
						children: [/* @__PURE__ */ jsx(Trash2, { className: "mr-2 h-4 w-4" }), " Registrer udbetaling"]
					})] })
				] })
			}),
			/* @__PURE__ */ jsx(Dialog, {
				open: seasonOpen,
				onOpenChange: setSeasonOpen,
				children: /* @__PURE__ */ jsxs(DialogContent, { children: [/* @__PURE__ */ jsxs("div", {
					className: "space-y-1.5",
					children: [/* @__PURE__ */ jsx(DialogTitle, { children: "Afslut sæsonen?" }), /* @__PURE__ */ jsxs(DialogDescription, { children: [
						"Dette sletter alle sæsonens bøder, indbetalinger, udbetalinger, påmindelser, kampe og afstemninger for ",
						current.teamName,
						". Kassens saldo (",
						formatKr(cashBalance),
						") overføres som startsaldo til den nye sæson. Bødesatserne bevares. Handlingen kan ikke fortrydes."
					] })]
				}), /* @__PURE__ */ jsxs(DialogFooter, { children: [/* @__PURE__ */ jsx(Button, {
					variant: "outline",
					onClick: () => setSeasonOpen(false),
					children: "Annuller"
				}), /* @__PURE__ */ jsxs(Button, {
					variant: "destructive",
					onClick: handleEndSeason,
					disabled: busy,
					children: [/* @__PURE__ */ jsx(CalendarOff, { className: "mr-2 h-4 w-4" }), " Afslut sæsonen"]
				})] })] })
			}),
			/* @__PURE__ */ jsx(Dialog, {
				open: !!selectedMember,
				onOpenChange: (open) => !open && setSelectedMember(null),
				children: /* @__PURE__ */ jsx(DialogContent, { children: selectedMember && /* @__PURE__ */ jsxs("div", {
					className: "flex flex-col items-center gap-3 text-center",
					children: [
						/* @__PURE__ */ jsx(Avatar, {
							name: selectedMember.name,
							url: selectedMember.avatarUrl,
							size: "xl"
						}),
						/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(DialogTitle, { children: selectedMember.name }), selectedMember.role === "admin" && /* @__PURE__ */ jsx(Badge, {
							variant: "navy",
							className: "mt-1.5",
							children: "Admin"
						})] }),
						/* @__PURE__ */ jsx("div", {
							className: "w-full rounded-xl bg-muted/50 px-3 py-2.5 text-sm",
							children: selectedMember.phone ? /* @__PURE__ */ jsxs("a", {
								href: `tel:${selectedMember.phone.replace(/\s/g, "")}`,
								className: "flex items-center justify-center gap-2 font-semibold text-pitch",
								children: [
									/* @__PURE__ */ jsx(Phone, { className: "h-4 w-4" }),
									" ",
									selectedMember.phone
								]
							}) : /* @__PURE__ */ jsxs("p", {
								className: "text-muted-foreground",
								children: [firstName(selectedMember.name), " har ikke tilføjet kontaktoplysninger endnu"]
							})
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "grid w-full grid-cols-3 gap-2",
							children: [
								/* @__PURE__ */ jsxs("div", {
									className: "rounded-xl border p-2.5",
									children: [/* @__PURE__ */ jsx("p", {
										className: "text-[11px] font-medium uppercase tracking-wide text-muted-foreground",
										children: "Bøder"
									}), /* @__PURE__ */ jsx("p", {
										className: "mt-0.5 text-sm font-bold",
										children: formatKr(selectedMember.fines)
									})]
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "rounded-xl border p-2.5",
									children: [/* @__PURE__ */ jsx("p", {
										className: "text-[11px] font-medium uppercase tracking-wide text-muted-foreground",
										children: "Indbetalt"
									}), /* @__PURE__ */ jsx("p", {
										className: "mt-0.5 text-sm font-bold",
										children: formatKr(selectedMember.paid)
									})]
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "rounded-xl border p-2.5",
									children: [/* @__PURE__ */ jsx("p", {
										className: "text-[11px] font-medium uppercase tracking-wide text-muted-foreground",
										children: "Skylder"
									}), /* @__PURE__ */ jsx("p", {
										className: "mt-0.5 text-sm font-bold",
										children: formatKr(selectedMember.owed)
									})]
								})
							]
						})
					]
				}) })
			})
		]
	});
}
//#endregion
export { HoldPage as component };
