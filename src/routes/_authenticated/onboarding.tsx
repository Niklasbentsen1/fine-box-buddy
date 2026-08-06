import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Coins, KeyRound, LogOut, Users } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useTeam } from "@/lib/team";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Kom i gang — Bødekassen" },
      { name: "description", content: "Opret en klub eller tilmeld dig med en klubkode." },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const { profile, user, refreshMemberships } = useTeam();
  const navigate = useNavigate();
  const [clubName, setClubName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("create");
    const { data, error } = await supabase.rpc("create_club", {
      _name: clubName.trim(),
      _team_name: teamName.trim(),
    });
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Klubben er oprettet — del klubkoden med holdet");
    await refreshMemberships();
    void data;
    navigate({ to: "/hjem" });
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("join");
    const { error } = await supabase.rpc("join_club_by_code", { _code: code.trim() });
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Anmodning sendt — en administrator skal godkende dig, før du får adgang");
    await refreshMemberships();
    navigate({ to: "/hjem" });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-dvh bg-background bg-pitch-stripes">
      <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-safe pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))]">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Coins className="h-5 w-5" />
            </span>
            <span className="font-display text-2xl font-semibold">Bødekassen</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" /> Log ud
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="font-display text-4xl font-semibold">
            Hej{profile?.displayName ? ` ${profile.displayName.split(" ")[0]}` : ""}!
          </h1>
          <p className="mt-2 text-muted-foreground">
            Du er logget ind som {user.email}. Opret en ny klub, eller tilmeld dig en eksisterende
            klub med en klubkode.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <form
            onSubmit={handleCreate}
            className="flex flex-col rounded-2xl border bg-card p-6 shadow-card"
          >
            <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gold-soft text-gold-foreground">
              <Users className="h-6 w-6" />
            </span>
            <h2 className="font-display text-2xl font-semibold">Start en ny klub</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Start en ny bødekasse til din klub. Du bliver automatisk administrator og får en
              klubkode, du kan dele med holdet.
            </p>
            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="club-name">Klubnavn</Label>
                <Input
                  id="club-name"
                  value={clubName}
                  onChange={(e) => setClubName(e.target.value)}
                  placeholder="Fx Vestby IF"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="team-name">Første hold</Label>
                <Input
                  id="team-name"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Fx Herre 1 eller U15"
                  required
                />
              </div>
            </div>
            <Button
              type="submit"
              className="mt-6 w-full"
              disabled={busy !== null || !clubName.trim() || !teamName.trim()}
            >
              {busy === "create" ? "Opretter…" : "Start klubben"}
            </Button>
          </form>

          <form
            onSubmit={handleJoin}
            className="flex flex-col rounded-2xl border bg-card p-6 shadow-card"
          >
            <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-pitch-soft text-pitch">
              <KeyRound className="h-6 w-6" />
            </span>
            <h2 className="font-display text-2xl font-semibold">Tilmeld med klubkode</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Har du fået en klubkode af din træner eller holdkammerat? Indtast den her — en
              administrator skal godkende din anmodning, før du får adgang.
            </p>
            <div className="mt-5 space-y-2">
              <Label htmlFor="code">Klubkode</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="FX AB12CD"
                maxLength={6}
                required
                className="font-mono text-lg uppercase tracking-[0.3em]"
              />
            </div>
            <Button
              type="submit"
              variant="subtle"
              className="mt-6 w-full"
              disabled={busy !== null || code.trim().length < 6}
            >
              {busy === "join" ? "Tilmelder…" : "Tilmeld klub"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
