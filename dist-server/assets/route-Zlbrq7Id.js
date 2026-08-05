import { t as supabase } from "./client-BFBFtBi6.js";
import { t as Route } from "./route-C-gP8uqC.js";
import { n as useTeam, t as TeamProvider } from "./team-CqHp8PgM.js";
import { a as initials, r as formatDateTime } from "./format-CaErknZY.js";
import { t as Button } from "./button-D59AmRzD.js";
import { a as DialogTitle, i as DialogFooter, n as DialogContent, r as DialogDescription, t as Dialog } from "./dialog-ByDaNPTM.js";
import { n as Input, t as Label } from "./label-BzS4-9r3.js";
import { t as Avatar } from "./avatar-CtJ2Q4YU.js";
import { a as DropdownMenuSeparator, i as DropdownMenuLabel, n as DropdownMenuContent, o as DropdownMenuTrigger, r as DropdownMenuItem, t as DropdownMenu } from "./dropdown-menu-CL9bt5NL.js";
import { useEffect, useState } from "react";
import { Link, Navigate, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell, Check, ChevronDown, Coins, Copy, History, Home, Hourglass, LogOut, Plus, Ticket, Trophy, UserRound, Users } from "lucide-react";
//#region src/components/app-shell.tsx
var NAV_ITEMS = [
	{
		to: "/hjem",
		label: "Hjem",
		icon: Home
	},
	{
		to: "/boeder",
		label: "Bøder",
		icon: Ticket
	},
	{
		to: "/hold",
		label: "Hold",
		icon: Users
	},
	{
		to: "/historik",
		label: "Historik",
		icon: History
	},
	{
		to: "/kampe",
		label: "Kampe",
		icon: Trophy
	}
];
function NotificationBell() {
	const { user, current } = useTeam();
	const queryClient = useQueryClient();
	const teamId = current?.teamId;
	const { data: notifications = [] } = useQuery({
		queryKey: [
			"team",
			teamId,
			"notifications",
			user.id
		],
		enabled: !!teamId,
		refetchInterval: 3e4,
		queryFn: async () => {
			const { data, error } = await supabase.from("notifications").select("id, title, body, read_at, created_at").eq("team_id", teamId).eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
			if (error) throw error;
			return data ?? [];
		}
	});
	const unreadCount = notifications.filter((n) => !n.read_at).length;
	const markRead = async (notification) => {
		if (notification.read_at) return;
		await supabase.from("notifications").update({ read_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", notification.id);
		await queryClient.invalidateQueries({ queryKey: [
			"team",
			teamId,
			"notifications",
			user.id
		] });
	};
	if (!teamId) return null;
	return /* @__PURE__ */ jsxs(DropdownMenu, { children: [/* @__PURE__ */ jsx(DropdownMenuTrigger, {
		asChild: true,
		children: /* @__PURE__ */ jsxs("button", {
			className: "relative flex h-10 w-10 items-center justify-center rounded-xl border bg-card transition-colors hover:bg-secondary",
			"aria-label": "Notifikationer",
			children: [/* @__PURE__ */ jsx(Bell, { className: "h-5 w-5" }), unreadCount > 0 && /* @__PURE__ */ jsx("span", {
				className: "absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground",
				children: unreadCount > 9 ? "9+" : unreadCount
			})]
		})
	}), /* @__PURE__ */ jsxs(DropdownMenuContent, {
		align: "end",
		className: "w-80",
		children: [
			/* @__PURE__ */ jsx(DropdownMenuLabel, { children: "Notifikationer" }),
			/* @__PURE__ */ jsx(DropdownMenuSeparator, {}),
			notifications.length === 0 ? /* @__PURE__ */ jsx("p", {
				className: "px-2 py-6 text-center text-sm text-muted-foreground",
				children: "Ingen notifikationer endnu."
			}) : notifications.map((n) => /* @__PURE__ */ jsxs(DropdownMenuItem, {
				onClick: () => markRead(n),
				className: "flex cursor-pointer items-start gap-2.5 py-2.5",
				children: [/* @__PURE__ */ jsx("span", { className: `mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read_at ? "bg-transparent" : "bg-pitch"}` }), /* @__PURE__ */ jsxs("span", {
					className: "min-w-0 flex-1",
					children: [
						/* @__PURE__ */ jsx("span", {
							className: `block truncate text-sm ${n.read_at ? "font-medium" : "font-semibold"}`,
							children: n.title
						}),
						/* @__PURE__ */ jsx("span", {
							className: "block whitespace-pre-line text-xs text-muted-foreground",
							children: n.body
						}),
						/* @__PURE__ */ jsx("span", {
							className: "mt-0.5 block text-[10px] text-muted-foreground/70",
							children: formatDateTime(n.created_at)
						})
					]
				})]
			}, n.id))
		]
	})] });
}
function AppShell({ children }) {
	const { memberships, current, profile, user, setCurrentTeamId, refreshMemberships } = useTeam();
	const navigate = useNavigate();
	const [createOpen, setCreateOpen] = useState(false);
	const [joinOpen, setJoinOpen] = useState(false);
	const [teamName, setTeamName] = useState("");
	const [clubCode, setClubCode] = useState("");
	const [busy, setBusy] = useState(false);
	const [codeCopied, setCodeCopied] = useState(false);
	const handleSignOut = async () => {
		await supabase.auth.signOut();
		navigate({ to: "/auth" });
	};
	const handleCreateTeam = async () => {
		if (!current || !teamName.trim()) return;
		setBusy(true);
		const { error } = await supabase.rpc("create_team", {
			_club_id: current.clubId,
			_name: teamName.trim()
		});
		setBusy(false);
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success(`Holdet "${teamName.trim()}" er oprettet`);
		setTeamName("");
		setCreateOpen(false);
		await refreshMemberships();
	};
	const handleJoinClub = async () => {
		if (!clubCode.trim()) return;
		setBusy(true);
		const { error } = await supabase.rpc("join_club_by_code", { _code: clubCode.trim() });
		setBusy(false);
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success("Anmodning sendt — afventer godkendelse af en administrator i klubben");
		setClubCode("");
		setJoinOpen(false);
		await refreshMemberships();
	};
	const copyInviteCode = async () => {
		if (!current) return;
		try {
			await navigator.clipboard.writeText(`Tilmeld dig min klub med koden ${current.inviteCode}`);
			setCodeCopied(true);
			setTimeout(() => setCodeCopied(false), 1500);
		} catch {
			toast.error("Kunne ikke kopiere koden");
		}
	};
	const displayName = profile?.displayName || user.email || "Spiller";
	return /* @__PURE__ */ jsxs("div", {
		className: "min-h-screen bg-background",
		children: [
			/* @__PURE__ */ jsx("header", {
				className: "sticky top-0 z-40 border-b bg-card/95 backdrop-blur",
				children: /* @__PURE__ */ jsxs("div", {
					className: "mx-auto flex h-16 max-w-5xl items-center gap-3 px-4",
					children: [
						/* @__PURE__ */ jsxs(Link, {
							to: "/hjem",
							className: "flex items-center gap-2.5",
							children: [/* @__PURE__ */ jsx("span", {
								className: "flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground",
								children: /* @__PURE__ */ jsx(Coins, { className: "h-5 w-5" })
							}), /* @__PURE__ */ jsx("span", {
								className: "font-display text-2xl font-semibold tracking-wide",
								children: "Bødekassen"
							})]
						}),
						/* @__PURE__ */ jsx("nav", {
							className: "ml-6 hidden items-center gap-1 md:flex",
							children: NAV_ITEMS.map((item) => /* @__PURE__ */ jsx(Link, {
								to: item.to,
								activeOptions: item.to === "/hjem" ? { exact: true } : void 0,
								className: "rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
								activeProps: { className: "bg-secondary text-foreground" },
								children: item.label
							}, item.to))
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "ml-auto flex items-center gap-2",
							children: [
								current && /* @__PURE__ */ jsxs(DropdownMenu, { children: [/* @__PURE__ */ jsx(DropdownMenuTrigger, {
									asChild: true,
									children: /* @__PURE__ */ jsxs("button", {
										className: "flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-left transition-colors hover:bg-secondary",
										children: [
											/* @__PURE__ */ jsx("span", {
												className: "flex h-6 w-6 items-center justify-center rounded-md bg-pitch text-[11px] font-bold text-pitch-foreground",
												children: initials(current.teamName)
											}),
											/* @__PURE__ */ jsx("span", {
												className: "max-w-28 truncate text-sm font-semibold sm:max-w-40",
												children: current.teamName
											}),
											/* @__PURE__ */ jsx(ChevronDown, { className: "h-4 w-4 text-muted-foreground" })
										]
									})
								}), /* @__PURE__ */ jsxs(DropdownMenuContent, {
									align: "end",
									className: "w-64",
									children: [
										/* @__PURE__ */ jsxs(DropdownMenuLabel, {
											className: "text-xs font-normal text-muted-foreground",
											children: [current.clubName, " · dine hold"]
										}),
										memberships.map((m) => /* @__PURE__ */ jsxs(DropdownMenuItem, {
											onClick: () => setCurrentTeamId(m.teamId),
											className: "flex items-center justify-between gap-2",
											children: [/* @__PURE__ */ jsxs("span", {
												className: "truncate",
												children: [m.teamName, /* @__PURE__ */ jsx("span", {
													className: "ml-1.5 text-xs text-muted-foreground",
													children: m.role === "admin" ? "Admin" : "Medlem"
												})]
											}), m.teamId === current.teamId && /* @__PURE__ */ jsx(Check, { className: "h-4 w-4 text-pitch" })]
										}, m.teamId)),
										/* @__PURE__ */ jsx(DropdownMenuSeparator, {}),
										/* @__PURE__ */ jsxs(DropdownMenuItem, {
											onClick: () => setCreateOpen(true),
											children: [/* @__PURE__ */ jsx(Plus, { className: "mr-2 h-4 w-4" }), " Opret nyt hold"]
										}),
										/* @__PURE__ */ jsxs(DropdownMenuItem, {
											onClick: () => setJoinOpen(true),
											children: [/* @__PURE__ */ jsx(Users, { className: "mr-2 h-4 w-4" }), " Tilmeld klub med kode"]
										}),
										/* @__PURE__ */ jsxs(DropdownMenuItem, {
											onClick: copyInviteCode,
											children: [
												codeCopied ? /* @__PURE__ */ jsx(Check, { className: "mr-2 h-4 w-4 text-pitch" }) : /* @__PURE__ */ jsx(Copy, { className: "mr-2 h-4 w-4" }),
												"Klubkode: ",
												current.inviteCode
											]
										})
									]
								})] }),
								/* @__PURE__ */ jsx(NotificationBell, {}),
								/* @__PURE__ */ jsxs(DropdownMenu, { children: [/* @__PURE__ */ jsx(DropdownMenuTrigger, {
									asChild: true,
									children: /* @__PURE__ */ jsx("button", {
										className: "rounded-full transition-opacity hover:opacity-80",
										"aria-label": "Brugermenu",
										children: /* @__PURE__ */ jsx(Avatar, {
											name: displayName,
											url: profile?.avatarUrl,
											size: "sm"
										})
									})
								}), /* @__PURE__ */ jsxs(DropdownMenuContent, {
									align: "end",
									className: "w-56",
									children: [
										/* @__PURE__ */ jsxs(DropdownMenuLabel, { children: [/* @__PURE__ */ jsx("div", {
											className: "truncate text-sm font-semibold",
											children: displayName
										}), /* @__PURE__ */ jsx("div", {
											className: "truncate text-xs font-normal text-muted-foreground",
											children: user.email
										})] }),
										/* @__PURE__ */ jsx(DropdownMenuSeparator, {}),
										/* @__PURE__ */ jsxs(DropdownMenuItem, {
											onClick: () => navigate({ to: "/profil" }),
											children: [/* @__PURE__ */ jsx(UserRound, { className: "mr-2 h-4 w-4" }), " Min profil"]
										}),
										/* @__PURE__ */ jsxs(DropdownMenuItem, {
											onClick: handleSignOut,
											children: [/* @__PURE__ */ jsx(LogOut, { className: "mr-2 h-4 w-4" }), " Log ud"]
										})
									]
								})] })
							]
						})
					]
				})
			}),
			/* @__PURE__ */ jsx("main", {
				className: "mx-auto max-w-5xl px-4 pb-28 pt-6 md:pb-12",
				children
			}),
			/* @__PURE__ */ jsx("nav", {
				className: "fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur md:hidden",
				children: /* @__PURE__ */ jsx("div", {
					className: "mx-auto grid max-w-lg grid-cols-5",
					children: NAV_ITEMS.map((item) => /* @__PURE__ */ jsxs(Link, {
						to: item.to,
						activeOptions: item.to === "/hjem" ? { exact: true } : void 0,
						className: "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground",
						activeProps: { className: "text-pitch" },
						children: [/* @__PURE__ */ jsx(item.icon, { className: "h-5 w-5" }), item.label]
					}, item.to))
				})
			}),
			/* @__PURE__ */ jsx(Dialog, {
				open: createOpen,
				onOpenChange: setCreateOpen,
				children: /* @__PURE__ */ jsxs(DialogContent, { children: [
					/* @__PURE__ */ jsxs("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ jsx(DialogTitle, { children: "Opret nyt hold" }), /* @__PURE__ */ jsxs(DialogDescription, { children: [
							"Opret et nyt hold i ",
							current?.clubName,
							" — fx hvis klubben har hold i flere rækker. Du bliver administrator på det nye hold."
						] })]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "space-y-2",
						children: [/* @__PURE__ */ jsx(Label, {
							htmlFor: "team-name",
							children: "Holdnavn"
						}), /* @__PURE__ */ jsx(Input, {
							id: "team-name",
							value: teamName,
							onChange: (e) => setTeamName(e.target.value),
							placeholder: "Fx 2. hold eller Oldboys"
						})]
					}),
					/* @__PURE__ */ jsxs(DialogFooter, { children: [/* @__PURE__ */ jsx(Button, {
						variant: "outline",
						onClick: () => setCreateOpen(false),
						children: "Annuller"
					}), /* @__PURE__ */ jsx(Button, {
						onClick: handleCreateTeam,
						disabled: busy || !teamName.trim(),
						children: "Opret hold"
					})] })
				] })
			}),
			/* @__PURE__ */ jsx(Dialog, {
				open: joinOpen,
				onOpenChange: setJoinOpen,
				children: /* @__PURE__ */ jsxs(DialogContent, { children: [
					/* @__PURE__ */ jsxs("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ jsx(DialogTitle, { children: "Tilmeld klub med kode" }), /* @__PURE__ */ jsx(DialogDescription, { children: "Indtast den 6-tegns klubkode, du har fået af din klub." })]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "space-y-2",
						children: [/* @__PURE__ */ jsx(Label, {
							htmlFor: "club-code",
							children: "Klubkode"
						}), /* @__PURE__ */ jsx(Input, {
							id: "club-code",
							value: clubCode,
							onChange: (e) => setClubCode(e.target.value.toUpperCase()),
							placeholder: "FX AB12CD",
							maxLength: 6,
							className: "font-mono uppercase tracking-widest"
						})]
					}),
					/* @__PURE__ */ jsxs(DialogFooter, { children: [/* @__PURE__ */ jsx(Button, {
						variant: "outline",
						onClick: () => setJoinOpen(false),
						children: "Annuller"
					}), /* @__PURE__ */ jsx(Button, {
						onClick: handleJoinClub,
						disabled: busy || clubCode.trim().length < 6,
						children: "Tilmeld"
					})] })
				] })
			})
		]
	});
}
//#endregion
//#region src/routes/_authenticated/route.tsx?tsr-split=component
function AuthenticatedLayout() {
	const { user } = Route.useRouteContext();
	return /* @__PURE__ */ jsx(TeamProvider, {
		user,
		children: /* @__PURE__ */ jsx(MembershipGate, {})
	});
}
function MembershipGate() {
	const { memberships, pendingCount, isLoading } = useTeam();
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	if (isLoading) return /* @__PURE__ */ jsx("div", {
		className: "flex min-h-screen items-center justify-center bg-background",
		children: /* @__PURE__ */ jsx("div", { className: "h-8 w-8 animate-spin rounded-full border-2 border-pitch border-t-transparent" })
	});
	const onOnboarding = pathname === "/onboarding";
	if (memberships.length === 0 && !onOnboarding) {
		if (pendingCount > 0) return /* @__PURE__ */ jsx(PendingApproval, {});
		return /* @__PURE__ */ jsx(Navigate, {
			to: "/onboarding",
			replace: true
		});
	}
	if (memberships.length > 0 && onOnboarding) return /* @__PURE__ */ jsx(Navigate, {
		to: "/hjem",
		replace: true
	});
	if (onOnboarding) return /* @__PURE__ */ jsx(Outlet, {});
	return /* @__PURE__ */ jsx(AppShell, { children: /* @__PURE__ */ jsx(Outlet, {}) });
}
function PendingApproval() {
	const { user, pendingCount, refreshMemberships } = useTeam();
	const navigate = useNavigate();
	const [busy, setBusy] = useState(false);
	useEffect(() => {
		if (pendingCount === 0) refreshMemberships();
	}, [pendingCount, refreshMemberships]);
	const handleCancel = async () => {
		setBusy(true);
		const { error } = await supabase.from("team_members").delete().eq("user_id", user.id).eq("status", "pending");
		setBusy(false);
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success("Din anmodning er annulleret");
		await refreshMemberships();
		navigate({ to: "/onboarding" });
	};
	const handleSignOut = async () => {
		await supabase.auth.signOut();
		navigate({ to: "/auth" });
	};
	return /* @__PURE__ */ jsx("div", {
		className: "flex min-h-screen items-center justify-center bg-background bg-pitch-stripes px-4",
		children: /* @__PURE__ */ jsxs("div", {
			className: "w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-card",
			children: [
				/* @__PURE__ */ jsx("span", {
					className: "mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold-soft text-gold-foreground",
					children: /* @__PURE__ */ jsx(Hourglass, { className: "h-6 w-6" })
				}),
				/* @__PURE__ */ jsx("h1", {
					className: "font-display text-2xl font-semibold",
					children: "Din anmodning afventer godkendelse"
				}),
				/* @__PURE__ */ jsx("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "En administrator i klubben skal godkende din anmodning, før du får adgang til bødekassen. Siden opdaterer automatisk, når du er godkendt."
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "mt-6 space-y-2",
					children: [/* @__PURE__ */ jsx(Button, {
						variant: "outline",
						className: "w-full",
						onClick: handleCancel,
						disabled: busy,
						children: busy ? "Annullerer…" : "Fortryd anmodning"
					}), /* @__PURE__ */ jsxs(Button, {
						variant: "ghost",
						className: "w-full",
						onClick: handleSignOut,
						children: [/* @__PURE__ */ jsx(LogOut, { className: "mr-2 h-4 w-4" }), " Log ud"]
					})]
				})
			]
		})
	});
}
//#endregion
export { AuthenticatedLayout as component };
