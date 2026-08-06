import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CalendarOff,
  Check,
  Copy,
  KeyRound,
  Pencil,
  Plus,
  Smartphone,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useTeam, type Membership } from "@/lib/team";
import { formatKr, sumAmounts } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/indstillinger")({
  head: () => ({
    meta: [
      { title: "Indstillinger — Bødekassen" },
      {
        name: "description",
        content:
          "Dine klubber, oprettelse af ny klub samt administration af hold, MobilePay-nummer, klubkode og sæson.",
      },
    ],
  }),
  component: IndstillingerPage,
});

type PaymentSum = { amount: number; status: string };
type WithdrawalSum = { amount: number };

function IndstillingerPage() {
  const { current, memberships, isAdmin, refreshMemberships, setCurrentTeamId } = useTeam();
  const queryClient = useQueryClient();
  const teamId = current?.teamId;

  const [busy, setBusy] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ teamId: string; teamName: string } | null>(
    null,
  );
  const [mpOpen, setMpOpen] = useState(false);
  const [mpNumber, setMpNumber] = useState("");
  const [seasonOpen, setSeasonOpen] = useState(false);
  const [clubOpen, setClubOpen] = useState(false);
  const [newClubName, setNewClubName] = useState("");
  const [newClubTeam, setNewClubTeam] = useState("");
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  const { data: payments = [] } = useQuery({
    queryKey: ["team", teamId, "all-payments-sums"],
    enabled: !!teamId && isAdmin,
    queryFn: async (): Promise<PaymentSum[]> => {
      const { data, error } = await supabase
        .from("payments")
        .select("amount, status")
        .eq("team_id", teamId!);
      if (error) throw error;
      return (data ?? []) as PaymentSum[];
    },
  });

  const { data: withdrawals = [] } = useQuery({
    queryKey: ["team", teamId, "withdrawals"],
    enabled: !!teamId && isAdmin,
    queryFn: async (): Promise<WithdrawalSum[]> => {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("amount")
        .eq("team_id", teamId!);
      if (error) throw error;
      return (data ?? []) as WithdrawalSum[];
    },
  });

  const clubs = useMemo(() => {
    const map = new Map<string, { clubId: string; clubName: string; teams: Membership[] }>();
    for (const m of memberships) {
      const entry =
        map.get(m.clubId) ?? { clubId: m.clubId, clubName: m.clubName, teams: [] as Membership[] };
      entry.teams.push(m);
      map.set(m.clubId, entry);
    }
    return [...map.values()];
  }, [memberships]);

  if (!current || !teamId) return null;

  const carryover = current.balanceCarryover ?? 0;
  const paidTotal = sumAmounts(payments.filter((p) => p.status === "approved"));
  const cashBalance = carryover + paidTotal - sumAmounts(withdrawals);

  const copyInviteCode = async () => {
    try {
      await navigator.clipboard.writeText(`Tilmeld dig min klub med koden ${current.inviteCode}`);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 1500);
    } catch {
      toast.error("Kunne ikke kopiere koden");
    }
  };

  const handleCreateClub = async () => {
    if (!newClubName.trim() || !newClubTeam.trim()) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("create_club", {
      _name: newClubName.trim(),
      _team_name: newClubTeam.trim(),
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const result = data as { team_id?: string; invite_code?: string } | null;
    toast.success(
      result?.invite_code
        ? `Klubben er oprettet — klubkode: ${result.invite_code}`
        : "Klubben er oprettet",
    );
    setClubOpen(false);
    setNewClubName("");
    setNewClubTeam("");
    await refreshMemberships();
    if (result?.team_id) setCurrentTeamId(result.team_id);
  };

  const handleJoinClub = async () => {
    if (joinCode.trim().length < 6) return;
    setBusy(true);
    const { error } = await supabase.rpc("join_club_by_code", { _code: joinCode.trim() });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Anmodning sendt — afventer godkendelse af en administrator i klubben");
    setJoinCode("");
    setJoinOpen(false);
    await refreshMemberships();
  };

  const handleCreateTeam = async () => {
    if (!teamName.trim()) return;
    setBusy(true);
    const { error } = await supabase.rpc("create_team", {
      _club_id: current.clubId,
      _name: teamName.trim(),
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

  const handleDeleteTeam = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    const { error } = await supabase.rpc("delete_team", { _team_id: deleteTarget.teamId });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Holdet "${deleteTarget.teamName}" er slettet`);
    const wasCurrent = deleteTarget.teamId === teamId;
    setDeleteTarget(null);
    await queryClient.invalidateQueries();
    await refreshMemberships();
    if (!wasCurrent) setCurrentTeamId(teamId);
  };

  const handleSaveMobilepay = async () => {
    const trimmed = mpNumber.trim();
    if (trimmed && !/^\d{8}$/.test(trimmed)) {
      toast.error("Nummeret skal være præcis 8 cifre");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("teams")
      .update({ mobilepay_number: trimmed || null })
      .eq("id", teamId);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(trimmed ? "MobilePay-nummer gemt" : "MobilePay-nummer fjernet");
    setMpOpen(false);
    await refreshMemberships();
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-semibold">Indstillinger</h1>
        <p className="mt-1 text-muted-foreground">
          {isAdmin
            ? `Dine klubber samt administration af ${current.clubName}.`
            : "Dine klubber — start en ny klub eller tilmeld dig med en klubkode."}
        </p>
      </div>

      <section className="rounded-2xl border bg-card p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
            <Building2 className="h-5 w-5 text-muted-foreground" /> Dine klubber
          </h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setJoinOpen(true)}>
              <KeyRound className="mr-2 h-4 w-4" /> Tilmeld med kode
            </Button>
            <Button variant="pitch" size="sm" onClick={() => setClubOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Start en ny klub
            </Button>
          </div>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Du kan være medlem af flere klubber. Skift mellem dine hold i menuen øverst.
        </p>
        <ul className="mt-3 divide-y">
          {clubs.map((club) => (
            <li key={club.clubId} className="py-3">
              <p className="flex items-center gap-2 text-sm font-semibold">
                {club.clubName}
                {club.clubId === current.clubId && <Badge variant="pitch">Aktiv</Badge>}
              </p>
              <ul className="mt-1 space-y-0.5">
                {club.teams.map((t) => (
                  <li key={t.teamId} className="text-xs text-muted-foreground">
                    {t.teamName} · {t.role === "admin" ? "Du er administrator" : "Du er medlem"}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      {isAdmin && (
        <>
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-card">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Klubkode
              </p>
              <p className="font-mono text-xl font-bold tracking-[0.25em]">{current.inviteCode}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Del koden med nye spillere — de skal godkendes af en administrator.
              </p>
            </div>
            <Button variant="subtle" size="sm" onClick={copyInviteCode}>
              {codeCopied ? (
                <Check className="mr-2 h-4 w-4 text-pitch" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              {codeCopied ? "Kopieret" : "Kopiér kode"}
            </Button>
          </section>

          <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-card">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                MobilePay-nummer
              </p>
              <p className="flex items-center gap-2 font-mono text-xl font-bold tracking-[0.15em]">
                <Smartphone className="h-5 w-5 text-pitch" />
                {current.mobilepayNumber ?? "Ikke sat op"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {current.mobilepayNumber
                  ? "Medlemmer kan betale bøder direkte til dette nummer"
                  : "Medlemmer kan ikke betale via MobilePay, før nummeret er sat op"}
              </p>
            </div>
            <Button
              variant="subtle"
              size="sm"
              onClick={() => {
                setMpNumber(current.mobilepayNumber ?? "");
                setMpOpen(true);
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              {current.mobilepayNumber ? "Rediger nummer" : "Tilføj nummer"}
            </Button>
          </section>

          <section className="rounded-2xl border bg-card p-5 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
                <Users className="h-5 w-5 text-muted-foreground" /> Hold i {current.clubName}
              </h2>
              <Button variant="pitch" size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Opret nyt hold
              </Button>
            </div>
            <ul className="mt-3 divide-y">
              {memberships.map((m) => (
                <li key={m.teamId} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate text-sm font-semibold">
                      {m.teamName}
                      {m.teamId === teamId && <Badge variant="pitch">Aktivt</Badge>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {m.role === "admin" ? "Du er administrator" : "Du er medlem"}
                    </p>
                  </div>
                  {m.role === "admin" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setDeleteTarget({ teamId: m.teamId, teamName: m.teamName })}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Slet
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-card p-4 shadow-card">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Sæson
              </p>
              <p className="text-sm font-semibold">Afslut sæsonen og start en ny</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Alle bøder, indbetalinger, kampe og historik nulstilles — kassens saldo overføres.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setSeasonOpen(true)}>
              <CalendarOff className="mr-2 h-4 w-4" /> Afslut sæson
            </Button>
          </section>
        </>
      )}

      <Dialog open={clubOpen} onOpenChange={setClubOpen}>
        <DialogContent>
          <div className="space-y-1.5">
            <DialogTitle>Start en ny klub</DialogTitle>
            <DialogDescription>
              Opret en ny klub med sit eget første hold. Du bliver automatisk administrator for
              klubben og får en klubkode, du kan dele. Du kan sagtens være medlem af flere klubber
              samtidig.
            </DialogDescription>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-club-name">Klubnavn</Label>
              <Input
                id="new-club-name"
                value={newClubName}
                onChange={(e) => setNewClubName(e.target.value)}
                placeholder="Fx Vestby IF"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-club-team">Første hold</Label>
              <Input
                id="new-club-team"
                value={newClubTeam}
                onChange={(e) => setNewClubTeam(e.target.value)}
                placeholder="Fx Herre 1 eller U15"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClubOpen(false)}>
              Annuller
            </Button>
            <Button
              onClick={handleCreateClub}
              disabled={busy || !newClubName.trim() || !newClubTeam.trim()}
            >
              Start klubben
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent>
          <div className="space-y-1.5">
            <DialogTitle>Tilmeld klub med kode</DialogTitle>
            <DialogDescription>
              Indtast den 6-tegns klubkode, du har fået af din klub. En administrator skal godkende
              din anmodning, før du får adgang.
            </DialogDescription>
          </div>
          <div className="space-y-2">
            <Label htmlFor="join-code">Klubkode</Label>
            <Input
              id="join-code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="FX AB12CD"
              maxLength={6}
              className="font-mono uppercase tracking-widest"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinOpen(false)}>
              Annuller
            </Button>
            <Button onClick={handleJoinClub} disabled={busy || joinCode.trim().length < 6}>
              Tilmeld
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <div className="space-y-1.5">
            <DialogTitle>Opret nyt hold</DialogTitle>
            <DialogDescription>
              Opret et nyt hold i {current.clubName} — fx hvis klubben har hold i flere rækker. Du
              bliver administrator på det nye hold.
            </DialogDescription>
          </div>
          <div className="space-y-2">
            <Label htmlFor="team-name">Holdnavn</Label>
            <Input
              id="team-name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Fx 2. hold eller Oldboys"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Annuller
            </Button>
            <Button onClick={handleCreateTeam} disabled={busy || !teamName.trim()}>
              Opret hold
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <div className="space-y-1.5">
            <DialogTitle>Slet {deleteTarget?.teamName}?</DialogTitle>
            <DialogDescription>
              Dette sletter holdet permanent inkl. alle dets bøder, bødesatser, indbetalinger,
              udbetalinger, kampe, afstemninger og medlemskaber. Handlingen kan ikke fortrydes.
            </DialogDescription>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Annuller
            </Button>
            <Button variant="destructive" onClick={handleDeleteTeam} disabled={busy}>
              <Trash2 className="mr-2 h-4 w-4" /> Slet holdet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mpOpen} onOpenChange={setMpOpen}>
        <DialogContent>
          <div className="space-y-1.5">
            <DialogTitle>MobilePay-nummer</DialogTitle>
            <DialogDescription>
              Det mobilnummer, som medlemmerne betaler deres bøder til via MobilePay. Lad feltet
              stå tomt for at fjerne nummeret.
            </DialogDescription>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mp-number">Mobilnummer (8 cifre)</Label>
            <Input
              id="mp-number"
              inputMode="numeric"
              maxLength={8}
              value={mpNumber}
              onChange={(e) => setMpNumber(e.target.value.replace(/\D/g, ""))}
              placeholder="Fx 12345678"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMpOpen(false)}>
              Annuller
            </Button>
            <Button variant="pitch" onClick={handleSaveMobilepay} disabled={busy}>
              Gem nummer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={seasonOpen} onOpenChange={setSeasonOpen}>
        <DialogContent>
          <div className="space-y-1.5">
            <DialogTitle>Afslut sæsonen?</DialogTitle>
            <DialogDescription>
              Dette sletter alle sæsonens bøder, indbetalinger, udbetalinger, påmindelser, kampe og
              afstemninger for {current.teamName}. Kassens saldo ({formatKr(cashBalance)}) overføres
              som startsaldo til den nye sæson. Bødesatserne bevares. Handlingen kan ikke fortrydes.
            </DialogDescription>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSeasonOpen(false)}>
              Annuller
            </Button>
            <Button variant="destructive" onClick={handleEndSeason} disabled={busy}>
              <CalendarOff className="mr-2 h-4 w-4" /> Afslut sæsonen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
