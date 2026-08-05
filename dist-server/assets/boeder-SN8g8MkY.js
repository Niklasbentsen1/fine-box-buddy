import { t as supabase } from "./client-BFBFtBi6.js";
import { n as useTeam } from "./team-CqHp8PgM.js";
import { i as formatKr, n as formatDate } from "./format-CaErknZY.js";
import { t as Button } from "./button-D59AmRzD.js";
import { t as Badge } from "./badge-C-vqPte3.js";
import { a as DialogTitle, i as DialogFooter, n as DialogContent, r as DialogDescription, t as Dialog } from "./dialog-ByDaNPTM.js";
import { n as Input, t as Label } from "./label-BzS4-9r3.js";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-UUbktZ4_.js";
import { useMemo, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowUpDown, Plus, Ticket, Trash2 } from "lucide-react";
//#region src/routes/_authenticated/boeder.tsx?tsr-split=component
function BoederPage() {
	const { current, isAdmin } = useTeam();
	const queryClient = useQueryClient();
	const teamId = current?.teamId;
	const [addOpen, setAddOpen] = useState(false);
	const [label, setLabel] = useState("");
	const [amount, setAmount] = useState("");
	const [busy, setBusy] = useState(false);
	const [sortBy, setSortBy] = useState("newest");
	const { data: fineTypes = [] } = useQuery({
		queryKey: [
			"team",
			teamId,
			"fine-types"
		],
		enabled: !!teamId,
		queryFn: async () => {
			const { data, error } = await supabase.from("fine_types").select("id, label, amount").eq("team_id", teamId).order("amount", { ascending: true });
			if (error) throw error;
			return data ?? [];
		}
	});
	const { data: fines = [] } = useQuery({
		queryKey: [
			"team",
			teamId,
			"all-fines"
		],
		enabled: !!teamId,
		queryFn: async () => {
			const { data, error } = await supabase.from("fines").select("id, label, amount, created_at, profiles(display_name)").eq("team_id", teamId).order("created_at", { ascending: false }).limit(100);
			if (error) throw error;
			return data ?? [];
		}
	});
	const sortedFines = useMemo(() => {
		const list = [...fines];
		switch (sortBy) {
			case "price-asc": return list.sort((a, b) => a.amount - b.amount);
			case "price-desc": return list.sort((a, b) => b.amount - a.amount);
			case "label-asc": return list.sort((a, b) => a.label.localeCompare(b.label, "da"));
			case "label-desc": return list.sort((a, b) => b.label.localeCompare(a.label, "da"));
			default: return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
		}
	}, [fines, sortBy]);
	if (!current || !teamId) return null;
	const refresh = () => queryClient.invalidateQueries({ queryKey: ["team", teamId] });
	const handleAddType = async () => {
		const value = Number(amount.replace(",", "."));
		if (!label.trim() || !value || value <= 0) {
			toast.error("Udfyld både bøde og beløb");
			return;
		}
		setBusy(true);
		const { error } = await supabase.from("fine_types").insert({
			team_id: teamId,
			label: label.trim(),
			amount: value
		});
		setBusy(false);
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success("Bødesats tilføjet");
		setAddOpen(false);
		setLabel("");
		setAmount("");
		await refresh();
	};
	const handleDeleteType = async (id) => {
		const { error } = await supabase.from("fine_types").delete().eq("id", id);
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success("Bødesats fjernet");
		await refresh();
	};
	const handleDeleteFine = async (id) => {
		const { error } = await supabase.from("fines").delete().eq("id", id);
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success("Bøde slettet");
		await refresh();
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "flex flex-wrap items-end justify-between gap-3",
				children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", {
					className: "font-display text-4xl font-semibold",
					children: "Bøder"
				}), /* @__PURE__ */ jsxs("p", {
					className: "mt-1 text-muted-foreground",
					children: ["Bødesatser og uddelte bøder for ", current.teamName]
				})] }), isAdmin && /* @__PURE__ */ jsxs(Button, {
					onClick: () => setAddOpen(true),
					children: [/* @__PURE__ */ jsx(Plus, { className: "mr-2 h-4 w-4" }), " Ny bødesats"]
				})]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "rounded-2xl border bg-card p-5 shadow-card",
				children: [/* @__PURE__ */ jsx("h2", {
					className: "font-display text-xl font-semibold",
					children: "Bødesatser"
				}), fineTypes.length === 0 ? /* @__PURE__ */ jsx("p", {
					className: "mt-3 text-sm text-muted-foreground",
					children: isAdmin ? "Ingen bødesatser endnu. Tilføj den første — fx “For sent fremmødt, 20 kr.”" : "Holdet har ikke oprettet bødesatser endnu."
				}) : /* @__PURE__ */ jsx("ul", {
					className: "mt-3 grid gap-2 sm:grid-cols-2",
					children: fineTypes.map((type) => /* @__PURE__ */ jsxs("li", {
						className: "flex items-center justify-between gap-3 rounded-xl border bg-background px-4 py-3",
						children: [/* @__PURE__ */ jsx("div", {
							className: "min-w-0",
							children: /* @__PURE__ */ jsx("p", {
								className: "truncate text-sm font-medium",
								children: type.label
							})
						}), /* @__PURE__ */ jsxs("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ jsx(Badge, {
								variant: "gold",
								children: formatKr(Number(type.amount))
							}), isAdmin && /* @__PURE__ */ jsx("button", {
								onClick: () => handleDeleteType(type.id),
								className: "rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive",
								"aria-label": `Slet ${type.label}`,
								children: /* @__PURE__ */ jsx(Trash2, { className: "h-4 w-4" })
							})]
						})]
					}, type.id))
				})]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "rounded-2xl border bg-card p-5 shadow-card",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "flex flex-wrap items-center justify-between gap-3",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ jsx("h2", {
							className: "font-display text-xl font-semibold",
							children: "Uddelte bøder"
						}), /* @__PURE__ */ jsx(Ticket, { className: "h-5 w-5 text-muted-foreground" })]
					}), /* @__PURE__ */ jsxs(Select, {
						value: sortBy,
						onValueChange: (v) => setSortBy(v),
						children: [/* @__PURE__ */ jsxs(SelectTrigger, {
							className: "w-auto min-w-[10rem] gap-2",
							"aria-label": "Sortér bøder",
							children: [/* @__PURE__ */ jsx(ArrowUpDown, { className: "h-4 w-4 shrink-0 text-muted-foreground" }), /* @__PURE__ */ jsx(SelectValue, { placeholder: "Sortér" })]
						}), /* @__PURE__ */ jsxs(SelectContent, { children: [
							/* @__PURE__ */ jsx(SelectItem, {
								value: "newest",
								children: "Nyeste først"
							}),
							/* @__PURE__ */ jsx(SelectItem, {
								value: "price-asc",
								children: "Pris: lav til høj"
							}),
							/* @__PURE__ */ jsx(SelectItem, {
								value: "price-desc",
								children: "Pris: høj til lav"
							}),
							/* @__PURE__ */ jsx(SelectItem, {
								value: "label-asc",
								children: "Alfabetisk A-Å"
							}),
							/* @__PURE__ */ jsx(SelectItem, {
								value: "label-desc",
								children: "Alfabetisk Å-A"
							})
						] })]
					})]
				}), sortedFines.length === 0 ? /* @__PURE__ */ jsx("p", {
					className: "mt-3 text-sm text-muted-foreground",
					children: "Ingen bøder uddelt endnu."
				}) : /* @__PURE__ */ jsx("ul", {
					className: "mt-3 divide-y",
					children: sortedFines.map((fine) => /* @__PURE__ */ jsxs("li", {
						className: "flex items-center gap-3 py-2.5",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "min-w-0 flex-1",
								children: [/* @__PURE__ */ jsxs("p", {
									className: "truncate text-sm font-medium",
									children: [
										fine.profiles?.display_name ?? "Ukendt",
										" · ",
										fine.label
									]
								}), /* @__PURE__ */ jsx("p", {
									className: "text-xs text-muted-foreground",
									children: formatDate(fine.created_at)
								})]
							}),
							/* @__PURE__ */ jsx(Badge, {
								variant: "navy",
								children: formatKr(Number(fine.amount))
							}),
							isAdmin && /* @__PURE__ */ jsx("button", {
								onClick: () => handleDeleteFine(fine.id),
								className: "rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive",
								"aria-label": "Slet bøde",
								children: /* @__PURE__ */ jsx(Trash2, { className: "h-4 w-4" })
							})
						]
					}, fine.id))
				})]
			}),
			/* @__PURE__ */ jsx(Dialog, {
				open: addOpen,
				onOpenChange: setAddOpen,
				children: /* @__PURE__ */ jsxs(DialogContent, { children: [
					/* @__PURE__ */ jsxs("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ jsx(DialogTitle, { children: "Ny bødesats" }), /* @__PURE__ */ jsx(DialogDescription, { children: "Bødesatsen kan bruges, når du uddeler bøder til holdet." })]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "space-y-4",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "space-y-2",
							children: [/* @__PURE__ */ jsx(Label, {
								htmlFor: "type-label",
								children: "Bøde"
							}), /* @__PURE__ */ jsx(Input, {
								id: "type-label",
								value: label,
								onChange: (e) => setLabel(e.target.value),
								placeholder: "Fx For sent fremmødt"
							})]
						}), /* @__PURE__ */ jsxs("div", {
							className: "space-y-2",
							children: [/* @__PURE__ */ jsx(Label, {
								htmlFor: "type-amount",
								children: "Beløb (kr.)"
							}), /* @__PURE__ */ jsx(Input, {
								id: "type-amount",
								inputMode: "decimal",
								value: amount,
								onChange: (e) => setAmount(e.target.value),
								placeholder: "Fx 20"
							})]
						})]
					}),
					/* @__PURE__ */ jsxs(DialogFooter, { children: [/* @__PURE__ */ jsx(Button, {
						variant: "outline",
						onClick: () => setAddOpen(false),
						children: "Annuller"
					}), /* @__PURE__ */ jsx(Button, {
						onClick: handleAddType,
						disabled: busy || !label.trim() || !amount.trim(),
						children: "Tilføj bødesats"
					})] })
				] })
			})
		]
	});
}
//#endregion
export { BoederPage as component };
