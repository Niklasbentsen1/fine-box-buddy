import { t as supabase } from "./client-BFBFtBi6.js";
import { t as Button } from "./button-D59AmRzD.js";
import { n as Input, t as Label } from "./label-BzS4-9r3.js";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { toast } from "sonner";
import { Check, Coins, Mail, X } from "lucide-react";
import { createLovableAuth } from "@lovable.dev/cloud-auth-js";
//#region src/integrations/lovable/index.ts
var lovableAuth = createLovableAuth();
var lovable = { auth: { signInWithOAuth: async (provider, opts) => {
	const result = await lovableAuth.signInWithOAuth(provider, {
		redirect_uri: opts?.redirect_uri,
		extraParams: { ...opts?.extraParams }
	});
	if (result.redirected) return result;
	if (result.error) return result;
	try {
		await supabase.auth.setSession(result.tokens);
	} catch (e) {
		return { error: e instanceof Error ? e : new Error(String(e)) };
	}
	return result;
} } };
//#endregion
//#region src/assets/auth-illustration.jpg
var auth_illustration_default = "/assets/auth-illustration-Dp5XnLtn.jpg";
//#endregion
//#region src/routes/auth.tsx?tsr-split=component
function AppleIcon({ className }) {
	return /* @__PURE__ */ jsx("svg", {
		viewBox: "0 0 24 24",
		fill: "currentColor",
		className,
		"aria-hidden": true,
		children: /* @__PURE__ */ jsx("path", { d: "M17.05 20.28c-.98.95-2.05.86-3.08.41-1.09-.47-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.41C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08ZM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25Z" })
	});
}
function GoogleIcon({ className }) {
	return /* @__PURE__ */ jsxs("svg", {
		viewBox: "0 0 24 24",
		className,
		"aria-hidden": true,
		children: [
			/* @__PURE__ */ jsx("path", {
				fill: "#4285F4",
				d: "M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82Z"
			}),
			/* @__PURE__ */ jsx("path", {
				fill: "#34A853",
				d: "M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24Z"
			}),
			/* @__PURE__ */ jsx("path", {
				fill: "#FBBC05",
				d: "M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09Z"
			}),
			/* @__PURE__ */ jsx("path", {
				fill: "#EA4335",
				d: "M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
			})
		]
	});
}
function AuthPage() {
	const navigate = useNavigate();
	const [mode, setMode] = useState("login");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [displayName, setDisplayName] = useState("");
	const [busy, setBusy] = useState(false);
	const [signedUp, setSignedUp] = useState(false);
	const passwordRules = useMemo(() => {
		return [
			{
				label: "Mindst 6 tegn",
				met: password.length >= 6
			},
			{
				label: "Mindst ét tal",
				met: /\d/.test(password)
			},
			{
				label: "Mindst ét stort bogstav",
				met: /[A-ZÆØÅ]/.test(password)
			},
			{
				label: "Mindst ét lille bogstav",
				met: /[a-zæøå]/.test(password)
			}
		];
	}, [password]);
	const passwordIsValid = passwordRules.every((r) => r.met);
	useEffect(() => {
		supabase.auth.getSession().then(({ data }) => {
			if (data.session) navigate({
				to: "/hjem",
				replace: true
			});
		});
	}, [navigate]);
	const handleOAuth = async (provider) => {
		const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
		if (result.error) {
			toast.error(result.error.message);
			return;
		}
		if (result.redirected) return;
		navigate({ to: "/hjem" });
	};
	const handleEmail = async (e) => {
		e.preventDefault();
		setBusy(true);
		if (mode === "signup") {
			const { data, error } = await supabase.auth.signUp({
				email: email.trim(),
				password,
				options: {
					emailRedirectTo: window.location.origin,
					data: { display_name: displayName.trim() }
				}
			});
			setBusy(false);
			if (error) {
				toast.error(error.message);
				return;
			}
			if (data.session) {
				navigate({ to: "/hjem" });
				return;
			}
			setSignedUp(true);
		} else {
			const { error } = await supabase.auth.signInWithPassword({
				email: email.trim(),
				password
			});
			setBusy(false);
			if (error) {
				toast.error(error.message === "Invalid login credentials" ? "Forkert e-mail eller adgangskode" : error.message);
				return;
			}
			navigate({ to: "/hjem" });
		}
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "grid min-h-screen bg-background lg:grid-cols-2",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "relative hidden overflow-hidden bg-primary lg:block",
			children: [
				/* @__PURE__ */ jsx("img", {
					src: auth_illustration_default,
					alt: "Illustration af en sportsklubs bødekasse",
					className: "absolute inset-0 h-full w-full object-cover"
				}),
				/* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/20 to-transparent" }),
				/* @__PURE__ */ jsxs("div", {
					className: "absolute bottom-0 p-10 text-primary-foreground",
					children: [/* @__PURE__ */ jsxs("p", {
						className: "font-display text-4xl font-semibold leading-tight",
						children: [
							"Glemt studiekortet?",
							/* @__PURE__ */ jsx("br", {}),
							"For sent på banen?"
						]
					}), /* @__PURE__ */ jsx("p", {
						className: "mt-3 max-w-md text-primary-foreground/80",
						children: "Bødekassen holder styr på bøder, indbetalinger og kampens spiller — så kassen altid er klar til holdets næste tur."
					})]
				})
			]
		}), /* @__PURE__ */ jsx("div", {
			className: "flex items-center justify-center px-4 py-10",
			children: /* @__PURE__ */ jsxs("div", {
				className: "w-full max-w-md",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "mb-8 flex items-center gap-3",
					children: [/* @__PURE__ */ jsx("span", {
						className: "flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground",
						children: /* @__PURE__ */ jsx(Coins, { className: "h-6 w-6" })
					}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("p", {
						className: "font-display text-3xl font-semibold leading-none",
						children: "Bødekassen"
					}), /* @__PURE__ */ jsx("p", {
						className: "text-sm text-muted-foreground",
						children: "Din klubs bødekasse, samlet ét sted"
					})] })]
				}), signedUp ? /* @__PURE__ */ jsxs("div", {
					className: "rounded-2xl border bg-card p-6 text-center shadow-card",
					children: [
						/* @__PURE__ */ jsx("span", {
							className: "mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-pitch-soft text-pitch",
							children: /* @__PURE__ */ jsx(Mail, { className: "h-6 w-6" })
						}),
						/* @__PURE__ */ jsx("h1", {
							className: "font-display text-2xl font-semibold",
							children: "Tjek din indbakke"
						}),
						/* @__PURE__ */ jsxs("p", {
							className: "mt-2 text-sm text-muted-foreground",
							children: [
								"Vi har sendt en bekræftelsesmail til ",
								/* @__PURE__ */ jsx("strong", { children: email }),
								". Klik på linket i mailen for at aktivere din konto, og log derefter ind."
							]
						}),
						/* @__PURE__ */ jsx(Button, {
							variant: "outline",
							className: "mt-6 w-full",
							onClick: () => {
								setSignedUp(false);
								setMode("login");
							},
							children: "Tilbage til log ind"
						})
					]
				}) : /* @__PURE__ */ jsxs("div", {
					className: "rounded-2xl border bg-card p-6 shadow-card",
					children: [
						/* @__PURE__ */ jsx("h1", {
							className: "font-display text-2xl font-semibold",
							children: mode === "login" ? "Log ind" : "Opret bruger"
						}),
						/* @__PURE__ */ jsx("p", {
							className: "mt-1 text-sm text-muted-foreground",
							children: mode === "login" ? "Velkommen tilbage — log ind for at se din saldo." : "Opret dig som bruger, og tilmeld dig din klub med en klubkode."
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "mt-5 grid grid-cols-2 gap-3",
							children: [/* @__PURE__ */ jsxs(Button, {
								variant: "outline",
								onClick: () => handleOAuth("google"),
								className: "w-full",
								children: [/* @__PURE__ */ jsx(GoogleIcon, { className: "mr-2 h-4 w-4" }), " Google"]
							}), /* @__PURE__ */ jsxs(Button, {
								variant: "outline",
								onClick: () => handleOAuth("apple"),
								className: "w-full",
								children: [/* @__PURE__ */ jsx(AppleIcon, { className: "mr-2 h-4 w-4" }), " Apple"]
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "my-5 flex items-center gap-3",
							children: [
								/* @__PURE__ */ jsx("div", { className: "h-px flex-1 bg-border" }),
								/* @__PURE__ */ jsx("span", {
									className: "text-xs font-medium uppercase tracking-wide text-muted-foreground",
									children: "eller med e-mail"
								}),
								/* @__PURE__ */ jsx("div", { className: "h-px flex-1 bg-border" })
							]
						}),
						/* @__PURE__ */ jsxs("form", {
							onSubmit: handleEmail,
							className: "space-y-4",
							children: [
								mode === "signup" && /* @__PURE__ */ jsxs("div", {
									className: "space-y-2",
									children: [/* @__PURE__ */ jsx(Label, {
										htmlFor: "name",
										children: "Navn"
									}), /* @__PURE__ */ jsx(Input, {
										id: "name",
										value: displayName,
										onChange: (e) => setDisplayName(e.target.value),
										placeholder: "Fx Anders Hansen",
										required: true
									})]
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "space-y-2",
									children: [/* @__PURE__ */ jsx(Label, {
										htmlFor: "email",
										children: "E-mail"
									}), /* @__PURE__ */ jsx(Input, {
										id: "email",
										type: "email",
										value: email,
										onChange: (e) => setEmail(e.target.value),
										placeholder: "dig@eksempel.dk",
										required: true
									})]
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "space-y-2",
									children: [
										/* @__PURE__ */ jsx(Label, {
											htmlFor: "password",
											children: "Adgangskode"
										}),
										/* @__PURE__ */ jsx(Input, {
											id: "password",
											type: "password",
											value: password,
											onChange: (e) => setPassword(e.target.value),
											placeholder: "Mindst 6 tegn",
											minLength: 6,
											required: true
										}),
										mode === "signup" && /* @__PURE__ */ jsx("ul", {
											className: "space-y-1.5 pt-1",
											children: passwordRules.map((rule) => /* @__PURE__ */ jsxs("li", {
												className: "flex items-center gap-2 text-xs",
												children: [rule.met ? /* @__PURE__ */ jsx(Check, {
													className: "h-3.5 w-3.5 text-pitch",
													"aria-hidden": true
												}) : /* @__PURE__ */ jsx(X, {
													className: "h-3.5 w-3.5 text-destructive",
													"aria-hidden": true
												}), /* @__PURE__ */ jsx("span", {
													className: rule.met ? "text-pitch" : "text-muted-foreground",
													children: rule.label
												})]
											}, rule.label))
										})
									]
								}),
								/* @__PURE__ */ jsx(Button, {
									type: "submit",
									className: "w-full",
									disabled: busy || mode === "signup" && !passwordIsValid,
									children: busy ? "Vent et øjeblik…" : mode === "login" ? "Log ind" : "Opret bruger"
								})
							]
						}),
						/* @__PURE__ */ jsxs("p", {
							className: "mt-5 text-center text-sm text-muted-foreground",
							children: [
								mode === "login" ? "Ny i klubben?" : "Har du allerede en bruger?",
								" ",
								/* @__PURE__ */ jsx("button", {
									type: "button",
									className: "font-semibold text-pitch hover:underline",
									onClick: () => setMode(mode === "login" ? "signup" : "login"),
									children: mode === "login" ? "Opret dig her" : "Log ind her"
								})
							]
						})
					]
				})]
			})
		})]
	});
}
//#endregion
export { AuthPage as component };
