import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Check, Palette, Save, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useConfirm } from "@/components/confirm-dialog";
import { useTeam } from "@/lib/team";
import { COLOR_THEMES, useColorTheme } from "@/lib/theme";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/profil")({
  head: () => ({
    meta: [
      { title: "Min profil — Bødekassen" },
      {
        name: "description",
        content: "Rediger dit navn, profilbillede og kontaktoplysninger.",
      },
    ],
  }),
  component: ProfilPage,
});

function resizeImage(file: File): Promise<string> {
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
        reject(new Error("Canvas understøttes ikke"));
        return;
      }
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Billedet kunne ikke læses"));
    };
    img.src = objectUrl;
  });
}

function ProfilPage() {
  const { user, profile } = useTeam();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [colorTheme, setColorTheme] = useColorTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const { confirm, confirmDialog } = useConfirm();

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
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name.trim(), phone: phone.trim() || null })
      .eq("id", user.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profil gemt");
    await refreshProfile();
    navigate({ to: "/hjem" });
  };

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: dataUrl })
        .eq("id", user.id);
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
    const ok = await confirm({
      title: "Fjern profilbillede?",
      description: "Dit profilbillede slettes, og du vises igen med dine initialer.",
      confirmLabel: "Fjern billede",
    });
    if (!ok) return;
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-semibold">Min profil</h1>
        <p className="mt-1 text-muted-foreground">
          Dit navn, billede og kontaktoplysninger kan ses af dine holdkammerater.
        </p>
      </div>

      <section className="rounded-2xl border bg-card p-5 shadow-card">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          <Avatar name={displayName} url={profile?.avatarUrl} size="xl" />
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarFile}
            />
            <Button
              variant="pitch"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarBusy}
            >
              <Camera className="mr-2 h-4 w-4" />
              {avatarBusy ? "Uploader…" : profile?.avatarUrl ? "Skift billede" : "Upload billede"}
            </Button>
            {profile?.avatarUrl && (
              <Button variant="outline" size="sm" onClick={handleRemoveAvatar} disabled={avatarBusy}>
                <Trash2 className="mr-2 h-4 w-4" /> Fjern billede
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-card">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
          <UserRound className="h-5 w-5 text-muted-foreground" /> Kontaktoplysninger
        </h2>
        <div className="space-y-2">
          <Label htmlFor="profile-name">Navn</Label>
          <Input
            id="profile-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Fx Anders Hansen"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-phone">Telefonnummer</Label>
          <Input
            id="profile-phone"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Fx 12345678"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-email">E-mail</Label>
          <Input id="profile-email" value={user.email ?? ""} disabled />
          <p className="text-xs text-muted-foreground">E-mailen er bundet til dit login.</p>
        </div>
        <Button onClick={handleSave} disabled={busy || !name.trim()}>
          <Save className="mr-2 h-4 w-4" /> {busy ? "Gemmer…" : "Gem profil"}
        </Button>
      </section>

      <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-card">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
          <Palette className="h-5 w-5 text-muted-foreground" /> Farvetema
        </h2>
        <p className="text-sm text-muted-foreground">
          Vælg appens farver — valget gælder kun på denne enhed.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {COLOR_THEMES.map((t) => {
            const active = colorTheme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setColorTheme(t.id)}
                className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                  active
                    ? "border-pitch bg-pitch-soft/60 ring-2 ring-pitch/40"
                    : "bg-card hover:bg-secondary"
                }`}
              >
                <span className="flex shrink-0 -space-x-1.5">
                  {t.swatches.map((color) => (
                    <span
                      key={color}
                      className="h-5 w-5 rounded-full border-2 border-card"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{t.label}</span>
                {active && <Check className="h-4 w-4 shrink-0 text-pitch" />}
              </button>
            );
          })}
        </div>
      </section>

      {confirmDialog}
    </div>
  );
}
