import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Check, Palette, Save, ShieldAlert, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useConfirm } from "@/components/confirm-dialog";
import { useTeam } from "@/lib/team";
import { COLOR_THEMES, useColorTheme } from "@/lib/theme";
import { ImageCropper } from "@/components/image-cropper";

import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";

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




function ProfilPage() {
  const { user, profile } = useTeam();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [colorTheme, setColorTheme] = useColorTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const { confirm, confirmDialog } = useConfirm();

  useEffect(() => {
    if (profile) {
      setName(profile.displayName);
      setNickname(profile.nickname ?? "");
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
      .update({
        display_name: name.trim(),
        nickname: nickname.trim() || null,
        phone: phone.trim() || null,
      })
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

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Vælg en billedfil");
      return;
    }
    setCropFile(file);
  };

  const handleCropped = async (dataUrl: string) => {
    setAvatarBusy(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: dataUrl })
        .eq("id", user.id);
      if (error) throw error;
      setCropFile(null);
      toast.success("Profilbillede opdateret");
      await refreshProfile();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kunne ikke gemme billedet");
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

  const handleDeleteAccount = async () => {
    if (!user.email) {
      toast.error("Din profil har ingen e-mail — kontakt en administrator");
      return;
    }
    if (!deletePassword) {
      toast.error("Indtast din adgangskode");
      return;
    }
    setDeleteBusy(true);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: deletePassword,
    });
    if (authError) {
      setDeleteBusy(false);
      toast.error("Forkert adgangskode");
      return;
    }
    const ok = await confirm({
      title: "Slet din profil permanent?",
      description:
        "Din profil, dine medlemskaber, bøder, indbetalinger og stemmer slettes for altid. Handlingen kan ikke fortrydes.",
      confirmLabel: "Slet profil permanent",
    });
    if (!ok) {
      setDeleteBusy(false);
      return;
    }
    const { error } = await supabase.rpc("delete_own_account");
    if (error) {
      setDeleteBusy(false);
      toast.error(error.message);
      return;
    }
    await supabase.auth.signOut();
    queryClient.clear();
    setDeleteBusy(false);
    setDeleteOpen(false);
    setDeletePassword("");
    toast.success("Din profil er slettet");
    navigate({ to: "/auth" });
  };

  const displayName = profile?.label || user.email || "Spiller";

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
          <Label htmlFor="profile-nickname">Kaldenavn (valgfrit)</Label>
          <Input
            id="profile-nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Fx Niko"
            maxLength={30}
          />
          <p className="text-xs text-muted-foreground">
            Har du et kaldenavn, vises det i stedet for dit navn. Ryd feltet for at fjerne det igen.
          </p>
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

      <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-card">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
          <KeyRound className="h-5 w-5 text-muted-foreground" /> Ændr adgangskode
        </h2>
        <p className="text-sm text-muted-foreground">
          Adgangskoden skal være mindst 8 tegn og indeholde både bogstaver og tal.
        </p>
        <div className="space-y-2">
          <Label htmlFor="new-password">Ny adgangskode</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Ny adgangskode"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="repeat-password">Gentag ny adgangskode</Label>
          <Input
            id="repeat-password"
            type="password"
            autoComplete="new-password"
            value={repeatPassword}
            onChange={(e) => setRepeatPassword(e.target.value)}
            placeholder="Gentag adgangskoden"
          />
        </div>
        <Button
          onClick={handleChangePassword}
          disabled={passwordBusy || !newPassword || !repeatPassword}
        >
          <KeyRound className="mr-2 h-4 w-4" />
          {passwordBusy ? "Gemmer…" : "Ændr adgangskode"}
        </Button>
      </section>

      <section className="space-y-3 rounded-2xl border border-destructive/30 bg-card p-5 shadow-card">

        <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
          <ShieldAlert className="h-5 w-5 text-destructive" /> Slet profil
        </h2>
        <p className="text-sm text-muted-foreground">
          Sletter din profil og alle dine data permanent. Du skal bekræfte med din adgangskode.
        </p>
        <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="mr-2 h-4 w-4" /> Slet min profil
        </Button>
      </section>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setDeletePassword("");
        }}
      >
        <DialogContent>
          <div className="space-y-1.5">
            <DialogTitle>Slet profil permanent</DialogTitle>
            <DialogDescription>
              Bekræft med din adgangskode. Din profil og alle dine data slettes for altid.
            </DialogDescription>
          </div>
          <div className="space-y-2">
            <Label htmlFor="delete-password">Adgangskode</Label>
            <Input
              id="delete-password"
              type="password"
              autoComplete="current-password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Din adgangskode"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Annuller
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteBusy || !deletePassword}
            >
              <Trash2 className="mr-2 h-4 w-4" /> {deleteBusy ? "Sletter…" : "Slet profil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImageCropper
        file={cropFile}
        onCancel={() => setCropFile(null)}
        onCropped={handleCropped}
        title="Beskær profilbillede"
      />

      {confirmDialog}
    </div>
  );
}
