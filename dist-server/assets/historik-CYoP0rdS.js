import { t as supabase } from "./client-BFBFtBi6.js";
import { n as useTeam } from "./team-CqHp8PgM.js";
import { i as formatKr, r as formatDateTime } from "./format-CaErknZY.js";
import { t as Button } from "./button-D59AmRzD.js";
import { t as Badge } from "./badge-C-vqPte3.js";
import { useMemo, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, HandCoins, Ticket, Trash2, UserRound, Wallet } from "lucide-react";
//#region src/routes/_authenticated/historik.tsx?tsr-split=component
var STATUS_LABEL = {
	pending: "Afventer",
	approved: "Godkendt",
	rejected: "Afvist"
};
function HistorikPage() {
	const { user, current, isAdmin } = useTeam();
	const queryClient = useQueryClient();
	const teamId = current?.teamId;
	const [expandedFineId, setExpandedFineId] = useState(null);
	const { data: fines = [] } = useQuery({
		queryKey: [
			"team",
			teamId,
			"hist-fines"
		],
		enabled: !!teamId,
		queryFn: async () => {
			const { data, error } = await supabase.from("fines").select("id, label, amount, created_at, created_by, profiles(display_name)").eq("team_id", teamId).order("created_at", { ascending: false }).limit(200);
			if (error) throw error;
			return data ?? [];
		}
	});
	const creatorIds = useMemo(() => [...new Set(fines.map((f) => f.created_by))].sort(), [fines]);
	const { data: creatorNames = {} } = useQuery({
		queryKey: [
			"profiles",
			"names",
			creatorIds
		],
		enabled: creatorIds.length > 0,
		queryFn: async () => {
			const { data, error } = await supabase.from("profiles").select("id, display_name").in("id", creatorIds);
			if (error) throw error;
			return Object.fromEntries((data ?? []).map((p) => [p.id, p.display_name]));
		}
	});
	const { data: payments = [] } = useQuery({
		queryKey: [
			"team",
			teamId,
			"hist-payments"
		],
		enabled: !!teamId,
		queryFn: async () => {
			const { data, error } = await supabase.from("payments").select("id, amount, status, note, created_at, user_id, profiles(display_name)").eq("team_id", teamId).order("created_at", { ascending: false }).limit(200);
			if (error) throw error;
			return data ?? [];
		}
	});
	const { data: withdrawals = [] } = useQuery({
		queryKey: [
			"team",
			teamId,
			"hist-withdrawals"
		],
		enabled: !!teamId,
		queryFn: async () => {
			const { data, error } = await supabase.from("withdrawals").select("id, amount, note, created_at").eq("team_id", teamId).order("created_at", { ascending: false }).limit(100);
			if (error) throw error;
			return data ?? [];
		}
	});
	if (!current || !teamId) return null;
	const feed = [
		...fines.map((f) => ({
			id: `fine-${f.id}`,
			kind: "fine",
			date: f.created_at,
			title: `${f.profiles?.display_name ?? "Ukendt"} · ${f.label}`,
			detail: null,
			amount: Number(f.amount),
			fineId: f.id,
			createdBy: creatorNames[f.created_by] ?? "Ukendt"
		})),
		...payments.map((p) => ({
			id: `pay-${p.id}`,
			kind: "payment",
			date: p.created_at,
			title: `${p.profiles?.display_name ?? "Ukendt"} indbetalte`,
			detail: p.note,
			amount: Number(p.amount),
			status: p.status,
			paymentId: p.id
		})),
		...withdrawals.map((w) => ({
			id: `wd-${w.id}`,
			kind: "withdrawal",
			date: w.created_at,
			title: "Udbetaling fra kassen",
			detail: w.note,
			amount: Number(w.amount)
		}))
	].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
		await queryClient.invalidateQueries({ queryKey: ["team", teamId] });
	};
	const handleDeleteFine = async (fineId) => {
		const { error } = await supabase.from("fines").delete().eq("id", fineId);
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success("Bøde slettet");
		setExpandedFineId(null);
		await queryClient.invalidateQueries({ queryKey: ["team", teamId] });
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-6",
		children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", {
			className: "font-display text-4xl font-semibold",
			children: "Historik"
		}), /* @__PURE__ */ jsxs("p", {
			className: "mt-1 text-muted-foreground",
			children: ["Alle bøder, indbetalinger og udbetalinger for ", current.teamName]
		})] }), feed.length === 0 ? /* @__PURE__ */ jsx("div", {
			className: "rounded-2xl border bg-card p-10 text-center shadow-card",
			children: /* @__PURE__ */ jsx("p", {
				className: "text-sm text-muted-foreground",
				children: "Der er endnu ingen aktivitet i bødekassen."
			})
		}) : /* @__PURE__ */ jsx("ul", {
			className: "space-y-2",
			children: feed.map((item) => /* @__PURE__ */ jsxs("li", {
				className: `flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-card ${item.kind === "fine" ? "cursor-pointer transition-colors hover:bg-muted/40" : ""}`,
				onClick: item.kind === "fine" ? () => setExpandedFineId((prev) => prev === item.fineId ? null : item.fineId) : void 0,
				children: [
					/* @__PURE__ */ jsx("span", {
						className: `flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.kind === "fine" ? "bg-gold-soft text-gold-foreground" : item.kind === "payment" ? "bg-pitch-soft text-pitch" : "bg-primary/10 text-primary"}`,
						children: item.kind === "fine" ? /* @__PURE__ */ jsx(Ticket, { className: "h-5 w-5" }) : item.kind === "payment" ? /* @__PURE__ */ jsx(HandCoins, { className: "h-5 w-5" }) : /* @__PURE__ */ jsx(Wallet, { className: "h-5 w-5" })
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "min-w-0 flex-1",
						children: [
							/* @__PURE__ */ jsx("p", {
								className: "truncate text-sm font-semibold",
								children: item.title
							}),
							/* @__PURE__ */ jsxs("p", {
								className: "truncate text-xs text-muted-foreground",
								children: [formatDateTime(item.date), item.detail ? ` · ${item.detail}` : ""]
							}),
							isAdmin && item.kind === "payment" && item.status === "pending" && /* @__PURE__ */ jsxs("div", {
								className: "mt-2 flex gap-2",
								children: [/* @__PURE__ */ jsx(Button, {
									size: "sm",
									variant: "pitch",
									onClick: (e) => {
										e.stopPropagation();
										handleReview(item.paymentId, "approved");
									},
									children: "Godkend"
								}), /* @__PURE__ */ jsx(Button, {
									size: "sm",
									variant: "outline",
									onClick: (e) => {
										e.stopPropagation();
										handleReview(item.paymentId, "rejected");
									},
									children: "Afvis"
								})]
							}),
							item.kind === "fine" && expandedFineId === item.fineId && /* @__PURE__ */ jsxs("div", {
								className: "mt-2 flex flex-wrap items-center gap-2",
								children: [/* @__PURE__ */ jsxs("span", {
									className: "flex items-center gap-1.5 rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground",
									children: [
										/* @__PURE__ */ jsx(UserRound, { className: "h-3.5 w-3.5" }),
										"Uddelt af",
										" ",
										/* @__PURE__ */ jsx("span", {
											className: "font-semibold text-foreground",
											children: item.createdBy
										})
									]
								}), isAdmin && /* @__PURE__ */ jsxs("button", {
									onClick: (e) => {
										e.stopPropagation();
										handleDeleteFine(item.fineId);
									},
									className: "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10",
									children: [/* @__PURE__ */ jsx(Trash2, { className: "h-3.5 w-3.5" }), " Slet bøde"]
								})]
							})
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "flex shrink-0 flex-col items-end gap-1",
						children: [/* @__PURE__ */ jsxs("span", {
							className: "flex items-center gap-1.5",
							children: [/* @__PURE__ */ jsxs("span", {
								className: `text-sm font-bold ${item.kind === "fine" ? "text-gold-foreground" : item.kind === "payment" ? "text-pitch" : "text-primary"}`,
								children: [item.kind === "fine" ? "+" : item.kind === "payment" ? "+" : "−", formatKr(item.amount)]
							}), item.kind === "fine" && /* @__PURE__ */ jsx(ChevronDown, { className: `h-4 w-4 text-muted-foreground transition-transform ${expandedFineId === item.fineId ? "rotate-180" : ""}` })]
						}), item.kind === "payment" && item.status && /* @__PURE__ */ jsx(Badge, {
							variant: item.status === "approved" ? "pitch" : item.status === "rejected" ? "destructive" : "muted",
							children: STATUS_LABEL[item.status]
						})]
					})
				]
			}, item.id))
		})]
	});
}
//#endregion
export { HistorikPage as component };
