import { t as supabase } from "./client-BFBFtBi6.js";
import { n as useTeam } from "./team-CqHp8PgM.js";
import { i as formatKr, n as formatDate, o as sumAmounts, t as firstName } from "./format-CaErknZY.js";
import { t as Button } from "./button-D59AmRzD.js";
import { t as Badge } from "./badge-C-vqPte3.js";
import { a as DialogTitle, i as DialogFooter, n as DialogContent, r as DialogDescription, t as Dialog } from "./dialog-ByDaNPTM.js";
import { n as Input, t as Label } from "./label-BzS4-9r3.js";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-UUbktZ4_.js";
import { t as fetchTeamMembers } from "./api-C87KH-wk.js";
import { t as StatCard } from "./stat-card-iXQ7dU5v.js";
import { useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CircleAlert, Clock, HandCoins, PiggyBank, Smartphone, Ticket, Wallet } from "lucide-react";
//#region src/routes/_authenticated/hjem.tsx?tsr-split=component
function parseAmount(value) {
	return Number(value.replace(",", "."));
}
function HjemPage() {
	const { user, current, isAdmin, profile } = useTeam();
	const queryClient = useQueryClient();
	const teamId = current?.teamId;
	const [payOpen, setPayOpen] = useState(false);
	const [payAmount, setPayAmount] = useState("");
	const [payNote, setPayNote] = useState("");
	const [fineOpen, setFineOpen] = useState(false);
	const [fineMember, setFineMember] = useState("");
	const [fineTypeId, setFineTypeId] = useState("custom");
	const [fineLabel, setFineLabel] = useState("");
	const [fineAmount, setFineAmount] = useState("");
	const [busy, setBusy] = useState(false);
	const { data: myFines = [] } = useQuery({
		queryKey: [
			"team",
			teamId,
			"my-fines",
			user.id
		],
		enabled: !!teamId,
		queryFn: async () => {
			const { data, error } = await supabase.from("fines").select("id, label, amount, created_at").eq("team_id", teamId).eq("user_id", user.id).order("created_at", { ascending: false });
			if (error) throw error;
			return data ?? [];
		}
	});
	const { data: myPayments = [] } = useQuery({
		queryKey: [
			"team",
			teamId,
			"my-payments",
			user.id
		],
		enabled: !!teamId,
		queryFn: async () => {
			const { data, error } = await supabase.from("payments").select("id, amount, status, note, created_at").eq("team_id", teamId).eq("user_id", user.id).order("created_at", { ascending: false });
			if (error) throw error;
			return data ?? [];
		}
	});
	const { data: pendingPayments = [] } = useQuery({
		queryKey: [
			"team",
			teamId,
			"pending-payments"
		],
		enabled: !!teamId && isAdmin,
		queryFn: async () => {
			const { data, error } = await supabase.from("payments").select("id, amount, status, note, created_at, user_id, profiles(display_name)").eq("team_id", teamId).eq("status", "pending").order("created_at", { ascending: true });
			if (error) throw error;
			return data ?? [];
		}
	});
	const { data: fineTypes = [] } = useQuery({
		queryKey: [
			"team",
			teamId,
			"fine-types"
		],
		enabled: !!teamId && isAdmin,
		queryFn: async () => {
			const { data, error } = await supabase.from("fine_types").select("id, label, amount").eq("team_id", teamId).order("created_at", { ascending: true });
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
	const finesTotal = sumAmounts(myFines);
	const approvedTotal = sumAmounts(myPayments.filter((p) => p.status === "approved"));
	const pendingTotal = sumAmounts(myPayments.filter((p) => p.status === "pending"));
	const owed = Math.max(0, finesTotal - approvedTotal);
	const refresh = () => queryClient.invalidateQueries({ queryKey: ["team", teamId] });
	const handlePay = async () => {
		const amount = parseAmount(payAmount);
		if (!amount || amount <= 0) {
			toast.error("Indtast et beløb større end 0");
			return;
		}
		setBusy(true);
		const { error } = await supabase.from("payments").insert({
			team_id: teamId,
			user_id: user.id,
			amount,
			note: payNote.trim() || null
		});
		setBusy(false);
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success("Indbetaling registreret — den afventer godkendelse");
		setPayOpen(false);
		setPayAmount("");
		setPayNote("");
		await refresh();
	};
	const handlePayMobilepay = async () => {
		const amount = parseAmount(payAmount);
		if (!amount || amount <= 0) {
			toast.error("Indtast et beløb større end 0");
			return;
		}
		if (!current.mobilepayNumber) {
			toast.error("Holdet har ikke registreret et MobilePay-nummer");
			return;
		}
		setBusy(true);
		const { error } = await supabase.from("payments").insert({
			team_id: teamId,
			user_id: user.id,
			amount,
			note: payNote.trim() || "MobilePay"
		});
		setBusy(false);
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success("Indbetaling registreret — du sendes videre til MobilePay");
		setPayOpen(false);
		setPayAmount("");
		setPayNote("");
		await refresh();
		const deeplink = `mobilepay://send?phone=${current.mobilepayNumber}&amount=${amount.toFixed(2).replace(".", ",")}`;
		window.location.href = deeplink;
	};
	const handleGiveFine = async () => {
		if (!fineMember) {
			toast.error("Vælg et medlem");
			return;
		}
		let label = fineLabel.trim();
		let amount = parseAmount(fineAmount);
		if (fineTypeId !== "custom") {
			const preset = fineTypes.find((t) => t.id === fineTypeId);
			if (preset) {
				label = preset.label;
				amount = Number(preset.amount);
			}
		}
		if (!label || !amount || amount <= 0) {
			toast.error("Udfyld bøde og beløb");
			return;
		}
		setBusy(true);
		const { error } = await supabase.from("fines").insert({
			team_id: teamId,
			user_id: fineMember,
			fine_type_id: fineTypeId !== "custom" ? fineTypeId : null,
			label,
			amount,
			created_by: user.id
		});
		setBusy(false);
		if (error) {
			toast.error(error.message);
			return;
		}
		const member = members.find((m) => m.userId === fineMember);
		toast.success(`Bøde givet til ${member ? firstName(member.name) : "medlemmet"}`);
		setFineOpen(false);
		setFineMember("");
		setFineTypeId("custom");
		setFineLabel("");
		setFineAmount("");
		await refresh();
	};
	const handleReview = async (paymentId, status) => {
		const { error } = await supabase.from("payments").update({
			status,
			reviewed_by: user.id,
			reviewed_at: (/* @__PURE__ */ new Date()).toISOString()
		}).eq("id", paymentId);
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success(status === "approved" ? "Indbetaling godkendt" : "Indbetaling afvist");
		await refresh();
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "flex flex-wrap items-end justify-between gap-3",
				children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("h1", {
					className: "font-display text-4xl font-semibold",
					children: ["Hej ", firstName(profile?.displayName || "spiller")]
				}), /* @__PURE__ */ jsxs("p", {
					className: "mt-1 text-muted-foreground",
					children: [
						current.clubName,
						" · ",
						current.teamName
					]
				})] }), /* @__PURE__ */ jsxs("div", {
					className: "flex gap-2",
					children: [/* @__PURE__ */ jsxs(Button, {
						variant: "pitch",
						onClick: () => setPayOpen(true),
						children: [/* @__PURE__ */ jsx(HandCoins, { className: "mr-2 h-4 w-4" }), " Indbetal"]
					}), isAdmin && /* @__PURE__ */ jsxs(Button, {
						variant: "gold",
						onClick: () => setFineOpen(true),
						children: [/* @__PURE__ */ jsx(Ticket, { className: "mr-2 h-4 w-4" }), " Uddel bøde"]
					})]
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "grid grid-cols-2 gap-3 lg:grid-cols-4",
				children: [
					/* @__PURE__ */ jsx(StatCard, {
						label: "Du skylder",
						value: formatKr(owed),
						icon: CircleAlert,
						tone: owed > 0 ? "red" : "pitch",
						hint: owed > 0 ? "Indbetal for at kvittere" : "Du er helt kvit"
					}),
					/* @__PURE__ */ jsx(StatCard, {
						label: "Modtagne bøder",
						value: formatKr(finesTotal),
						icon: Ticket,
						tone: "gold"
					}),
					/* @__PURE__ */ jsx(StatCard, {
						label: "Indbetalt",
						value: formatKr(approvedTotal),
						icon: PiggyBank,
						tone: "pitch"
					}),
					/* @__PURE__ */ jsx(StatCard, {
						label: "Afventer",
						value: formatKr(pendingTotal),
						icon: Clock,
						tone: "navy",
						hint: "Afventer admin-godkendelse"
					})
				]
			}),
			isAdmin && pendingPayments.length > 0 && /* @__PURE__ */ jsxs("section", {
				className: "rounded-2xl border border-gold/50 bg-gold-soft/50 p-5",
				children: [/* @__PURE__ */ jsxs("h2", {
					className: "font-display text-xl font-semibold",
					children: [
						"Indbetalinger til godkendelse (",
						pendingPayments.length,
						")"
					]
				}), /* @__PURE__ */ jsx("ul", {
					className: "mt-3 space-y-2",
					children: pendingPayments.map((p) => /* @__PURE__ */ jsxs("li", {
						className: "flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "min-w-0 flex-1",
							children: [/* @__PURE__ */ jsxs("p", {
								className: "truncate text-sm font-semibold",
								children: [
									p.profiles?.display_name ?? "Ukendt",
									" · ",
									formatKr(Number(p.amount))
								]
							}), /* @__PURE__ */ jsxs("p", {
								className: "text-xs text-muted-foreground",
								children: [formatDate(p.created_at), p.note ? ` · ${p.note}` : ""]
							})]
						}), /* @__PURE__ */ jsxs("div", {
							className: "flex gap-2",
							children: [/* @__PURE__ */ jsx(Button, {
								size: "sm",
								variant: "pitch",
								onClick: () => handleReview(p.id, "approved"),
								children: "Godkend"
							}), /* @__PURE__ */ jsx(Button, {
								size: "sm",
								variant: "outline",
								onClick: () => handleReview(p.id, "rejected"),
								children: "Afvis"
							})]
						})]
					}, p.id))
				})]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "rounded-2xl border bg-card p-5 shadow-card",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "flex items-center justify-between",
					children: [/* @__PURE__ */ jsx("h2", {
						className: "font-display text-xl font-semibold",
						children: "Dine seneste bøder"
					}), /* @__PURE__ */ jsx(Wallet, { className: "h-5 w-5 text-muted-foreground" })]
				}), myFines.length === 0 ? /* @__PURE__ */ jsx("p", {
					className: "mt-3 text-sm text-muted-foreground",
					children: "Ingen bøder endnu — fortsæt det gode arbejde!"
				}) : /* @__PURE__ */ jsx("ul", {
					className: "mt-3 divide-y",
					children: myFines.slice(0, 6).map((fine) => /* @__PURE__ */ jsxs("li", {
						className: "flex items-center justify-between gap-3 py-2.5",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "min-w-0",
							children: [/* @__PURE__ */ jsx("p", {
								className: "truncate text-sm font-medium",
								children: fine.label
							}), /* @__PURE__ */ jsx("p", {
								className: "text-xs text-muted-foreground",
								children: formatDate(fine.created_at)
							})]
						}), /* @__PURE__ */ jsx(Badge, {
							variant: "gold",
							children: formatKr(Number(fine.amount))
						})]
					}, fine.id))
				})]
			}),
			/* @__PURE__ */ jsx(Dialog, {
				open: payOpen,
				onOpenChange: setPayOpen,
				children: /* @__PURE__ */ jsxs(DialogContent, { children: [
					/* @__PURE__ */ jsxs("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ jsx(DialogTitle, { children: "Indbetal til bødekassen" }), /* @__PURE__ */ jsx(DialogDescription, { children: "Betal direkte med MobilePay til holdets nummer, eller registrer en indbetaling (fx kontanter). En administrator godkender den bagefter." })]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "space-y-4",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "space-y-2",
								children: [/* @__PURE__ */ jsx(Label, {
									htmlFor: "pay-amount",
									children: "Beløb (kr.)"
								}), /* @__PURE__ */ jsx(Input, {
									id: "pay-amount",
									inputMode: "decimal",
									value: payAmount,
									onChange: (e) => setPayAmount(e.target.value),
									placeholder: "Fx 100"
								})]
							}),
							current.mobilepayNumber ? /* @__PURE__ */ jsxs("div", {
								className: "rounded-2xl border border-pitch/30 bg-pitch-soft/50 p-4",
								children: [/* @__PURE__ */ jsxs(Button, {
									variant: "pitch",
									className: "w-full",
									onClick: handlePayMobilepay,
									disabled: busy || !payAmount.trim(),
									children: [
										/* @__PURE__ */ jsx(Smartphone, { className: "mr-2 h-4 w-4" }),
										"Betal",
										" ",
										parseAmount(payAmount) > 0 ? `${formatKr(parseAmount(payAmount))} ` : "",
										"med MobilePay"
									]
								}), /* @__PURE__ */ jsxs("p", {
									className: "mt-2 text-center text-xs text-muted-foreground",
									children: ["Du sendes direkte til MobilePay til nummer ", current.mobilepayNumber]
								})]
							}) : /* @__PURE__ */ jsxs("p", {
								className: "rounded-xl bg-secondary px-3 py-2.5 text-xs text-muted-foreground",
								children: [
									"Holdet har ikke sat et MobilePay-nummer op endnu —",
									" ",
									isAdmin ? "du kan tilføje det under Hold" : "spørg din administrator",
									"."
								]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "flex items-center gap-3",
								children: [
									/* @__PURE__ */ jsx("div", { className: "h-px flex-1 bg-border" }),
									/* @__PURE__ */ jsx("span", {
										className: "text-xs font-medium uppercase tracking-wide text-muted-foreground",
										children: "eller registrer manuelt"
									}),
									/* @__PURE__ */ jsx("div", { className: "h-px flex-1 bg-border" })
								]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "space-y-2",
								children: [/* @__PURE__ */ jsx(Label, {
									htmlFor: "pay-note",
									children: "Note (valgfri)"
								}), /* @__PURE__ */ jsx(Input, {
									id: "pay-note",
									value: payNote,
									onChange: (e) => setPayNote(e.target.value),
									placeholder: "Fx Kontanter til Træner"
								})]
							})
						]
					}),
					/* @__PURE__ */ jsxs(DialogFooter, { children: [/* @__PURE__ */ jsx(Button, {
						variant: "outline",
						onClick: () => setPayOpen(false),
						children: "Annuller"
					}), /* @__PURE__ */ jsx(Button, {
						variant: "primary",
						onClick: handlePay,
						disabled: busy || !payAmount.trim(),
						children: "Registrer indbetaling"
					})] })
				] })
			}),
			/* @__PURE__ */ jsx(Dialog, {
				open: fineOpen,
				onOpenChange: setFineOpen,
				children: /* @__PURE__ */ jsxs(DialogContent, { children: [
					/* @__PURE__ */ jsxs("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ jsx(DialogTitle, { children: "Uddel bøde" }), /* @__PURE__ */ jsxs(DialogDescription, { children: [
							"Giv en bøde til et medlem af ",
							current.teamName,
							"."
						] })]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "space-y-4",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "space-y-2",
								children: [/* @__PURE__ */ jsx(Label, { children: "Medlem" }), /* @__PURE__ */ jsxs(Select, {
									value: fineMember,
									onValueChange: setFineMember,
									children: [/* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Vælg medlem" }) }), /* @__PURE__ */ jsx(SelectContent, { children: members.map((m) => /* @__PURE__ */ jsx(SelectItem, {
										value: m.userId,
										children: m.name
									}, m.userId)) })]
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "space-y-2",
								children: [/* @__PURE__ */ jsx(Label, { children: "Bøde" }), /* @__PURE__ */ jsxs(Select, {
									value: fineTypeId,
									onValueChange: setFineTypeId,
									children: [/* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Vælg bøde" }) }), /* @__PURE__ */ jsxs(SelectContent, { children: [fineTypes.map((t) => /* @__PURE__ */ jsxs(SelectItem, {
										value: t.id,
										children: [
											t.label,
											" · ",
											formatKr(Number(t.amount))
										]
									}, t.id)), /* @__PURE__ */ jsx(SelectItem, {
										value: "custom",
										children: "Anden bøde…"
									})] })]
								})]
							}),
							fineTypeId === "custom" && /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsxs("div", {
								className: "space-y-2",
								children: [/* @__PURE__ */ jsx(Label, {
									htmlFor: "fine-label",
									children: "Beskrivelse"
								}), /* @__PURE__ */ jsx(Input, {
									id: "fine-label",
									value: fineLabel,
									onChange: (e) => setFineLabel(e.target.value),
									placeholder: "Fx Glemt støvler"
								})]
							}), /* @__PURE__ */ jsxs("div", {
								className: "space-y-2",
								children: [/* @__PURE__ */ jsx(Label, {
									htmlFor: "fine-amount",
									children: "Beløb (kr.)"
								}), /* @__PURE__ */ jsx(Input, {
									id: "fine-amount",
									inputMode: "decimal",
									value: fineAmount,
									onChange: (e) => setFineAmount(e.target.value),
									placeholder: "Fx 20"
								})]
							})] })
						]
					}),
					/* @__PURE__ */ jsxs(DialogFooter, { children: [/* @__PURE__ */ jsx(Button, {
						variant: "outline",
						onClick: () => setFineOpen(false),
						children: "Annuller"
					}), /* @__PURE__ */ jsx(Button, {
						variant: "gold",
						onClick: handleGiveFine,
						disabled: busy,
						children: "Giv bøde"
					})] })
				] })
			})
		]
	});
}
//#endregion
export { HjemPage as component };
