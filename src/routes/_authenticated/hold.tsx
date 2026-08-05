import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BellRing,
  CalendarOff,
  Check,
  Copy,
  HandCoins,
  MoreVertical,
  Pencil,
  Phone,
  PiggyBank,
  ShieldMinus,
  ShieldPlus,
  Smartphone,
  Ticket,
  Trash2,
  UserCheck,
  UserMinus,
  UserX,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useTeam } from "@/lib/team";
import { fetchTeamMembers, type MemberRow } from "@/lib/api";
import { firstName, formatDateTime, formatKr, sumAmounts } from "@/lib/format";
import { Avatar } from "@/components/avatar";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/hold")({
  head: () => ({
    meta: [
      { title: "Hold — Bødekassen" },
      { name: "description", content: "Holdets medlemmer, bødekassens saldo og skyldige beløb." },
    ],
  }),
  component: HoldPage,
});

type FineRow = { user_id: string; amount: number };
type PaymentRow = { user_id: string; amount: number; status: string };
type WithdrawalRow = { amount: number };
type PendingRow = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  requested_at: string;
};

function HoldPage() {
  const { user, current, isAdmin, refreshMemberships } = useTeam();
  const queryClient = useQueryClient();
  const teamId = current?.teamId;

  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawNote, setWithdrawNote] = useState("");
  const [mpOpen, setMpOpen] = useState(false);
  const [mpNumber, setMpNumber] = useState("");
  const [seasonOpen, setSeasonOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<
    (MemberRow & { fines: number; paid: number; owed: number }) | null
  >(null);
  const [busy, setBusy] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const { data: members = [] } = useQuery({
    queryKey: ["team", teamId, "members"],
    enabled: !!teamId,
    queryFn: () => fetchTeamMembers(teamId!),
  });

  const { data: pending = [] } = useQuery({
    queryKey: ["team", teamId, "pending-members"],
    enabled: !!teamId && isAdmin,
    queryFn: async (): Promise<PendingRow[]> => {
      const { data, error } = await supabase.rpc("get_pending_members", { _team_id: teamId! });
      if (error) throw error;
      return (data ?? []) as PendingRow[];
    },
  });

  const { data: fines = [] } = useQuery({
    queryKey: ["team", teamId, "all-fines-sums"],
    enabled: !!teamId,
    queryFn: async (): Promise<FineRow[]> => {
      const { data, error } = await supabase
        .from("fines")
        .select("user_id, amount")
        .eq("team_id", teamId!);
      if (error) throw error;
      return (data ?? []) as FineRow[];
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["team", teamId, "all-payments-sums"],
    enabled: !!teamId,
    queryFn: async (): Promise<PaymentRow[]> => {
      const { data, error } = await supabase
        .from("payments")
        .select("user_id, amount, status")
        .eq("team_id", teamId!);
      if (error) throw error;
      return (data ?? []) as PaymentRow[];
    },
  });

  const { data: withdrawals = [] } = useQuery({
    queryKey: ["team", teamId, "withdrawals"],
    enabled: !!teamId,
    queryFn: async (): Promise<WithdrawalRow[]> => {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("amount")
        .eq("team_id", teamId!);
      if (error) throw error;
      return (data ?? []) as WithdrawalRow[];
    },
  });

  if (!current || !teamId) return null;

  const finesTotal = sumAmounts(fines);
  const approvedPayments = payments.filter((p) => p.status === "approved");
  const paidTotal = sumAmounts(approvedPayments);
  const withdrawnTotal = sumAmounts(withdrawals);
  const carryover = current.balanceCarryover ?? 0;
  const cashBalance = carryover + paidTotal - withdrawnTotal;
  const outstandingTotal = Math.max(0, finesTotal - paidTotal);

  const perMember = members.map((m) => {
    const memberFines = sumAmounts(fines.filter((f) => f.user_id === m.userId));
    const memberPaid = sumAmounts(approvedPayments.filter((p) => p.user_id === m.userId));
    return { ...m, fines: memberFines, paid: memberPaid, owed: Math.max(0, memberFines - memberPaid) };
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["team", teamId] });

  const copyInviteCode = async () => {
    try {
      await navigator.clipboard.writeText(`Tilmeld dig min klub med koden ${current.inviteCode}`);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 1500);
    } catch {
      toast.error("Kunne ikke kopiere koden");
    }
  };

  const handleReminder = async (userId: string, name: string) => {
    const { error } = await supabase.from("reminders").insert({
      team_id: teamId,
      user_id: userId,
      sent_by: user.id,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Påmindelse sendt til ${firstName(name)}`);
  };

  const handleRemove = async (userId: string, name: string) => {
    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("team_id", teamId)
      .eq("user_id", userId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${firstName(name)} er fjernet fra holdet`);
    await refresh();
  };

  const handleSetRole = async (userId: string, name: string, role: "admin" | "member") => {
    const { error } = await supabase.rpc("set_team_member_role", {
      _team_id: teamId,
      _user_id: userId,
      _role: role,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      role === "admin"
        ? `${firstName(name)} er nu administrator`
        : `${firstName(name)} er ikke administrator længere`,
    );
    await refresh();
  };

  const handleApprove = async (userId: string, name: string) => {
    const { error } = await supabase.rpc("approve_member", {
      _team_id: teamId,
      _user_id: userId,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${firstName(name)} er godkendt til holdet`);
    await refresh();
  };

  const handleReject = async (userId: string, name: string) => {
    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("team_id", teamId)
      .eq("user_id", userId)
      .eq("status", "pending");
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Anmodningen fra ${firstName(name)} er afvist`);
    await refresh();
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

  const handleWithdraw = async () => {
    const amount = Number(withdrawAmount.replace(",", "."));
    if (!amount || amount <= 0) {
      toast.error("Indtast et beløb større end 0");
      return;
    }
    if (amount > cashBalance) {
      toast.error("Beløbet overstiger kassens saldo");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("withdrawals").insert({
      team_id: teamId,
      amount,
      note: withdrawNote.trim() || null,
      created_by: user.id,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Udbetaling registreret");
    setWithdrawOpen(false);
    setWithdrawAmount("");
    setWithdrawNote("");
    await refresh();
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

  const handleDeleteTeam = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("delete_team", { _team_id: teamId });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Holdet "${current.teamName}" er slettet`);
    setDeleteOpen(false);
    await queryClient.invalidateQueries();
    await refreshMemberships();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-semibold">{current.teamName}</h1>
          <p className="mt-1 text-muted-foreground">{current.clubName}</p>
        </div>
        {isAdmin && (
          <Button variant="outline" onClick={() => setWithdrawOpen(true)}>
            <Wallet className="mr-2 h-4 w-4" /> Træk penge ud
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Kassens saldo"
          value={formatKr(cashBalance)}
          icon={PiggyBank}
          tone="pitch"
          hint={
            [
              carryover !== 0 ? `${formatKr(carryover)} overført fra sidste sæson` : null,
              withdrawnTotal > 0 ? `${formatKr(withdrawnTotal)} udbetalt` : null,
            ]
              .filter(Boolean)
              .join(" · ") || undefined
          }
        />
        <StatCard label="Givne bøder" value={formatKr(finesTotal)} icon={Ticket} tone="gold" />
        <StatCard
          label="Manglende indbetalinger"
          value={formatKr(outstandingTotal)}
          icon={BellRing}
          tone={outstandingTotal > 0 ? "red" : "navy"}
        />
        <StatCard label="Indbetalt" value={formatKr(paidTotal)} icon={HandCoins} tone="navy" />
      </div>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-card">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Klubkode
          </p>
          <p className="font-mono text-xl font-bold tracking-[0.25em]">{current.inviteCode}</p>
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
        {isAdmin && (
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
        )}
      </section>

      <section className="rounded-2xl border bg-card p-5 shadow-card">
        <h2 className="font-display text-xl font-semibold">Spillerliste ({members.length})</h2>
        <ul className="mt-3 divide-y">
          {perMember.map((m) => (
            <li
              key={m.userId}
              className="flex cursor-pointer items-center gap-3 py-3 transition-colors hover:bg-muted/40"
              onClick={() => setSelectedMember(m)}
            >
              <Avatar name={m.name} url={m.avatarUrl} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate text-sm font-semibold">
                  {m.name}
                  {m.role === "admin" && <Badge variant="navy">Admin</Badge>}
                </p>
                <p className="text-xs text-muted-foreground">
                  Bøder: {formatKr(m.fines)} · Indbetalt: {formatKr(m.paid)}
                </p>
              </div>
              <Badge variant={m.owed > 0 ? "destructive" : "pitch"}>
                {m.owed > 0 ? `Skylder ${formatKr(m.owed)}` : "Kvit"}
              </Badge>
              {isAdmin && m.userId !== user.id && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary"
                      aria-label={`Handlinger for ${m.name}`}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {m.role === "admin" ? (
                      <DropdownMenuItem onClick={() => handleSetRole(m.userId, m.name, "member")}>
                        <ShieldMinus className="mr-2 h-4 w-4" /> Fjern administrator
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => handleSetRole(m.userId, m.name, "admin")}>
                        <ShieldPlus className="mr-2 h-4 w-4" /> Gør til administrator
                      </DropdownMenuItem>
                    )}
                    {m.owed > 0 && (
                      <DropdownMenuItem onClick={() => handleReminder(m.userId, m.name)}>
                        <BellRing className="mr-2 h-4 w-4" /> Send påmindelse om betaling
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => handleRemove(m.userId, m.name)}
                      className="text-destructive"
                    >
                      <UserMinus className="mr-2 h-4 w-4" /> Fjern fra holdet
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </li>
          ))}
        </ul>
      </section>

      {isAdmin && pending.length > 0 && (
        <section className="rounded-2xl border border-gold/40 bg-card p-5 shadow-card">
          <h2 className="font-display text-xl font-semibold">
            Afventer godkendelse ({pending.length})
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Disse spillere har brugt klubkoden og venter på godkendelse af en administrator.
          </p>
          <ul className="mt-3 divide-y">
            {pending.map((p) => (
              <li key={p.user_id} className="flex items-center gap-3 py-3">
                <Avatar name={p.display_name} url={p.avatar_url} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p.display_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Anmodede {formatDateTime(p.requested_at)}
                  </p>
                </div>
                <Button
                  variant="pitch"
                  size="sm"
                  onClick={() => handleApprove(p.user_id, p.display_name)}
                >
                  <UserCheck className="mr-2 h-4 w-4" /> Godkend
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReject(p.user_id, p.display_name)}
                >
                  <UserX className="mr-2 h-4 w-4" /> Afvis
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {isAdmin && (
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
      )}

      {isAdmin && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-card p-4 shadow-card">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Slet hold
            </p>
            <p className="text-sm font-semibold">Slet {current.teamName} permanent</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Alle holdets bøder, indbetalinger, kampe og medlemmer fjernes. Handlingen kan ikke
              fortrydes.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" /> Slet hold
          </Button>
        </section>
      )}

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

      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent>
          <div className="space-y-1.5">
            <DialogTitle>Træk penge ud af kassen</DialogTitle>
            <DialogDescription>
              Registrer en udbetaling fra bødekassen — fx til holdets fælles tur. Kassens saldo er{" "}
              {formatKr(cashBalance)}.
            </DialogDescription>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="withdraw-amount">Beløb (kr.)</Label>
              <Input
                id="withdraw-amount"
                inputMode="decimal"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Fx 500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="withdraw-note">Formål (valgfri)</Label>
              <Input
                id="withdraw-note"
                value={withdrawNote}
                onChange={(e) => setWithdrawNote(e.target.value)}
                placeholder="Fx Holdtur til Tyskland"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawOpen(false)}>
              Annuller
            </Button>
            <Button onClick={handleWithdraw} disabled={busy || !withdrawAmount.trim()}>
              <Trash2 className="mr-2 h-4 w-4" /> Registrer udbetaling
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

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <div className="space-y-1.5">
            <DialogTitle>Slet {current.teamName}?</DialogTitle>
            <DialogDescription>
              Dette sletter holdet permanent inkl. alle dets bøder, bødesatser, indbetalinger,
              udbetalinger, kampe, afstemninger og medlemskaber. Handlingen kan ikke fortrydes.
            </DialogDescription>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Annuller
            </Button>
            <Button variant="destructive" onClick={handleDeleteTeam} disabled={busy}>
              <Trash2 className="mr-2 h-4 w-4" /> Slet holdet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedMember} onOpenChange={(open) => !open && setSelectedMember(null)}>
        <DialogContent>
          {selectedMember && (
            <div className="flex flex-col items-center gap-3 text-center">
              <Avatar name={selectedMember.name} url={selectedMember.avatarUrl} size="xl" />
              <div>
                <DialogTitle>{selectedMember.name}</DialogTitle>
                {selectedMember.role === "admin" && (
                  <Badge variant="navy" className="mt-1.5">
                    Admin
                  </Badge>
                )}
              </div>
              <div className="w-full rounded-xl bg-muted/50 px-3 py-2.5 text-sm">
                {selectedMember.phone ? (
                  <a
                    href={`tel:${selectedMember.phone.replace(/\s/g, "")}`}
                    className="flex items-center justify-center gap-2 font-semibold text-pitch"
                  >
                    <Phone className="h-4 w-4" /> {selectedMember.phone}
                  </a>
                ) : (
                  <p className="text-muted-foreground">
                    {firstName(selectedMember.name)} har ikke tilføjet kontaktoplysninger endnu
                  </p>
                )}
              </div>
              <div className="grid w-full grid-cols-3 gap-2">
                <div className="rounded-xl border p-2.5">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Bøder
                  </p>
                  <p className="mt-0.5 text-sm font-bold">{formatKr(selectedMember.fines)}</p>
                </div>
                <div className="rounded-xl border p-2.5">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Indbetalt
                  </p>
                  <p className="mt-0.5 text-sm font-bold">{formatKr(selectedMember.paid)}</p>
                </div>
                <div className="rounded-xl border p-2.5">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Skylder
                  </p>
                  <p className="mt-0.5 text-sm font-bold">{formatKr(selectedMember.owed)}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
