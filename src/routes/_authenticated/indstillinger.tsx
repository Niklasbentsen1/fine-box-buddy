import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarOff,
  Check,
  Copy,
  Pencil,
  Plus,
  Smartphone,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useTeam } from "@/lib/team";
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
        content: "Administration af hold, MobilePay-nummer, klubkode og sæson.",
      },
    ],
  }),
  component: IndstillingerPage,
});

type PaymentSum = { amount: number; status: string };
type WithdrawalSum = { amount: number };

function IndstillingerPage() {
  const { user, current, memberships, isAdmin, refreshMemberships, setCurrentTeamId } = useTeam();
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

  const { data: payments = [] } = useQuery({
    queryKey: ["team", teamId, "all-payments-sums"],
    enabled: !!teamId,
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
    enabled: !!teamId,
    queryFn: async (): Promise<WithdrawalSum[]> => {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("amount")
        .eq("team_id", teamId!);
      if (error) throw error;
      return (data ?? []) as WithdrawalSum[];
    },
  });

  if (!current || !teamId) return null;
  if (!isAdmin) return <Navigate to="/hjem" replace />;

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
          Administration af {current.clubName} — kun synlig for administratorer.
        </p>
      </div>

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
