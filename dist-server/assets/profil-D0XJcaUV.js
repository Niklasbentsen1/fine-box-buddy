import { t as supabase } from "./client-BFBFtBi6.js";
import { n as useTeam } from "./team-CqHp8PgM.js";
import { t as Button } from "./button-D59AmRzD.js";
import { n as Input, t as Label } from "./label-BzS4-9r3.js";
import { t as Avatar } from "./avatar-CtJ2Q4YU.js";
import { useEffect, useRef, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, Save, Trash2, UserRound } from "lucide-react";
//#region src/routes/_authenticated/profil.tsx?tsr-split=component
function resizeImage(file) {
	return new Promise((resolve, reject) => {
		const objectUrl = URL.createObjectURL(file);
		const img = new Image();
		img.onload = () => {
			const size = 256;
			const scale = Math.max(size / img.width, size / img.height);
			const w = Math.round(img.width * scale);
			const h = Math.round(img.height * scale);
			const canvas = document.createElement("canvas");
			canvas.width = size;
			canvas.height = size;
			const ctx = canvas.getContext("2d");
			if (!ctx) {
				URL.revokeObjectURL(objectUrl);
				reject(/* @__PURE__ */ new Error("Canvas understøttes ikke"));
				return;
			}
			ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
			URL.revokeObjectURL(objectUrl);
			resolve(canvas.toDataURL("image/jpeg", .85));
		};
		img.onerror = () => {
			URL.revokeObjectURL(objectUrl);
			reject(/* @__PURE__ */ new Error("Billedet kunne ikke læses"));
		};
		img.src = objectUrl;
	});
}
function ProfilPage() {
	const { user, profile } = useTeam();
	const queryClient = useQueryClient();
	const fileInputRef = useRef(null);
	const [name, setName] = useState("");
	const [phone, setPhone] = useState("");
	const [busy, setBusy] = useState(false);
	const [avatarBusy, setAvatarBusy] = useState(false);
	useEffect(() => {
		if (profile) {
			setName(profile.displayName);
			setPhone(profile.phone ?? "");
		}
	}, [profile]);
	const refreshProfile = async () => {
		await queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
		await queryClient.invalidateQueries({ queryKey: ["team"] });
	};
	const handleSave = async () => {
		if (!name.trim()) {
			toast.error("Navnet må ikke være tomt");
			return;
		}
		setBusy(true);
		const { error } = await supabase.from("profiles").update({
			display_name: name.trim(),
			phone: phone.trim() || null
		}).eq("id", user.id);
		setBusy(false);
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success("Profil gemt");
		await refreshProfile();
	};
	const handleAvatarFile = async (e) => {
		const file = e.target.files?.[0];
		e.target.value = "";
		if (!file) return;
		if (!file.type.startsWith("image/")) {
			toast.error("Vælg en billedfil");
			return;
		}
		setAvatarBusy(true);
		try {
			const dataUrl = await resizeImage(file);
			const { error } = await supabase.from("profiles").update({ avatar_url: dataUrl }).eq("id", user.id);
			if (error) throw error;
			toast.success("Profilbillede opdateret");
			await refreshProfile();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Kunne ikke uploade billedet");
		} finally {
			setAvatarBusy(false);
		}
	};
	const handleRemoveAvatar = async () => {
		setAvatarBusy(true);
		const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
		setAvatarBusy(false);
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success("Profilbillede fjernet");
		await refreshProfile();
	};
	const displayName = profile?.displayName || user.email || "Spiller";
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", {
				className: "font-display text-4xl font-semibold",
				children: "Min profil"
			}), /* @__PURE__ */ jsx("p", {
				className: "mt-1 text-muted-foreground",
				children: "Dit navn, billede og kontaktoplysninger kan ses af dine holdkammerater."
			})] }),
			/* @__PURE__ */ jsx("section", {
				className: "rounded-2xl border bg-card p-5 shadow-card",
				children: /* @__PURE__ */ jsxs("div", {
					className: "flex flex-col items-center gap-4 sm:flex-row sm:items-center",
					children: [/* @__PURE__ */ jsx(Avatar, {
						name: displayName,
						url: profile?.avatarUrl,
						size: "xl"
					}), /* @__PURE__ */ jsxs("div", {
						className: "flex flex-col items-center gap-2 sm:items-start",
						children: [
							/* @__PURE__ */ jsx("input", {
								ref: fileInputRef,
								type: "file",
								accept: "image/*",
								className: "hidden",
								onChange: handleAvatarFile
							}),
							/* @__PURE__ */ jsxs(Button, {
								variant: "pitch",
								onClick: () => fileInputRef.current?.click(),
								disabled: avatarBusy,
								children: [/* @__PURE__ */ jsx(Camera, { className: "mr-2 h-4 w-4" }), avatarBusy ? "Uploader…" : profile?.avatarUrl ? "Skift billede" : "Upload billede"]
							}),
							profile?.avatarUrl && /* @__PURE__ */ jsxs(Button, {
								variant: "outline",
								size: "sm",
								onClick: handleRemoveAvatar,
								disabled: avatarBusy,
								children: [/* @__PURE__ */ jsx(Trash2, { className: "mr-2 h-4 w-4" }), " Fjern billede"]
							})
						]
					})]
				})
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "space-y-4 rounded-2xl border bg-card p-5 shadow-card",
				children: [
					/* @__PURE__ */ jsxs("h2", {
						className: "flex items-center gap-2 font-display text-xl font-semibold",
						children: [/* @__PURE__ */ jsx(UserRound, { className: "h-5 w-5 text-muted-foreground" }), " Kontaktoplysninger"]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "space-y-2",
						children: [/* @__PURE__ */ jsx(Label, {
							htmlFor: "profile-name",
							children: "Navn"
						}), /* @__PURE__ */ jsx(Input, {
							id: "profile-name",
							value: name,
							onChange: (e) => setName(e.target.value),
							placeholder: "Fx Anders Hansen"
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "space-y-2",
						children: [/* @__PURE__ */ jsx(Label, {
							htmlFor: "profile-phone",
							children: "Telefonnummer"
						}), /* @__PURE__ */ jsx(Input, {
							id: "profile-phone",
							inputMode: "tel",
							value: phone,
							onChange: (e) => setPhone(e.target.value),
							placeholder: "Fx 12345678"
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "space-y-2",
						children: [
							/* @__PURE__ */ jsx(Label, {
								htmlFor: "profile-email",
								children: "E-mail"
							}),
							/* @__PURE__ */ jsx(Input, {
								id: "profile-email",
								value: user.email ?? "",
								disabled: true
							}),
							/* @__PURE__ */ jsx("p", {
								className: "text-xs text-muted-foreground",
								children: "E-mailen er bundet til dit login."
							})
						]
					}),
					/* @__PURE__ */ jsxs(Button, {
						onClick: handleSave,
						disabled: busy || !name.trim(),
						children: [
							/* @__PURE__ */ jsx(Save, { className: "mr-2 h-4 w-4" }),
							" ",
							busy ? "Gemmer…" : "Gem profil"
						]
					})
				]
			})
		]
	});
}
//#endregion
export { ProfilPage as component };
