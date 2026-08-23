import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CircleAlert,
  Clock,
  HandCoins,
  Check,
  Copy,
  KeyRound,

  PiggyBank,
  Share2,
  Smartphone,
  Ticket,
  UserPlus,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useTeam, useTeamInviteCode } from "@/lib/team";
import { APP_DOWNLOAD_URL } from "@/lib/app-links";
import { fetchTeamMembers } from "@/lib/api";
import { firstName, formatDate, formatKr, sumAmounts } from "@/lib/format";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/hjem")({
  head: () => ({
    meta: [
      { title: "Hjem — Bødekassen" },
      { name: "description", content: "Din saldo, dine bøder og indbetalinger i bødekassen." },
    ],
  }),
  component: HjemPage,
});

type FineRow = { id: string; label: string; amount: number; created_at: string };

type PaymentRow = {
  id: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  note: string | null;
  created_at: string;
  user_id: string;
  profiles: { display_name: string } | null;
};

type FineTypeRow = { id: string; label: string; amount: number };

function parseAmount(value: string): number {
  return Number(value.replace(",", "."));
}

// Invitationer linker direkte til App Store — se src/lib/app-links.ts.

async function shareOrCopy(text: string, successMessage: string) {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ text });
    } catch {
      // Brugeren annullerede delingen
    }
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
  } catch {
    toast.error("Kunne ikke kopiere beskeden");
  }
}

function HjemPage() {
  const { user, current, isAdmin, profile } = useTeam();
  const inviteCode = useTeamInviteCode(current?.teamId, isAdmin);
  const queryClient = useQueryClient();
  const teamId = current?.teamId;

  const [payOpen, setPayOpen] = useState(false);
  const [payStep, setPayStep] = useState<"form" | "done">("form");
  const [payMethod, setPayMethod] = useState<"mobilepay" | "cash">("mobilepay");
  const [registeredAmount, setRegisteredAmount] = useState(0);
  const [numberCopied, setNumberCopied] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");

  const [fineOpen, setFineOpen] = useState(false);
  const [fineMember, setFineMember] = useState("");
  const [fineTypeId, setFineTypeId] = useState("custom");
  const [fineLabel, setFineLabel] = useState("");
  const [fineAmount, setFineAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const { data: myFines = [] } = useQuery({
    queryKey: ["team", teamId, "my-fines", user.id],
    enabled: !!teamId,
    queryFn: async (): Promise<FineRow[]> => {
      const { data, error } = await supabase
        .from("fines")
        .select("id, label, amount, created_at")
        .eq("team_id", teamId!)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as FineRow[];
    },
  });

  const { data: myPayments = [] } = useQuery({
    queryKey: ["team", teamId, "my-payments", user.id],
    enabled: !!teamId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id, amount, status, note, created_at")
        .eq("team_id", teamId!)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Omit<PaymentRow, "user_id" | "profiles">[];
    },
  });

  const { data: pendingPayments = [] } = useQuery({
    queryKey: ["team", teamId, "pending-payments"],
    enabled: !!teamId && isAdmin,
    queryFn: async (): Promise<PaymentRow[]> => {
      const { data, error } = await supabase
        .from("payments")
        .select("id, amount, status, note, created_at, user_id, profiles(display_name)")
        .eq("team_id", teamId!)
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as PaymentRow[];
    },
  });

  const { data: fineTypes = [] } = useQuery({
    queryKey: ["team", teamId, "fine-types"],
    enabled: !!teamId && isAdmin,
    queryFn: async (): Promise<FineTypeRow[]> => {
      const { data, error } = await supabase
        .from("fine_types")
        .select("id, label, amount")
        .eq("team_id", teamId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as FineTypeRow[];
    },
  });

  const { data: members = [] } = useQuery({
    queryKey: ["team", teamId, "members"],
    enabled: !!teamId && isAdmin,
    queryFn: () => fetchTeamMembers(teamId!),
  });

  if (!current || !teamId) return null;

  const finesTotal = sumAmounts(myFines);
  const approvedTotal = sumAmounts(myPayments.filter((p) => p.status === "approved"));
  const pendingTotal = sumAmounts(myPayments.filter((p) => p.status === "pending"));
  const owed = Math.max(0, finesTotal - approvedTotal);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["team", teamId] });

  const handleRegisterPayment = async () => {
    const amount = parseAmount(payAmount);
    if (!amount || amount <= 0) {
      toast.error("Indtast et beløb større end 0");
      return;
    }
    if (payMethod === "mobilepay" && !current.mobilepayNumber) {
      toast.error("Holdet har ikke registreret et MobilePay-nummer");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("payments").insert({
      team_id: teamId,
      user_id: user.id,
      amount,
      note: payNote.trim() || (payMethod === "mobilepay" ? "MobilePay" : "Kontant"),
      method: payMethod,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRegisteredAmount(amount);
    setPayStep("done");
    await refresh();
  };

  const closePayDialog = () => {
    setPayOpen(false);
    setPayStep("form");
    setPayAmount("");
    setPayNote("");
    setNumberCopied(false);
  };

  const copyMobilepayNumber = async () => {
    if (!current.mobilepayNumber) return;
    try {
      await navigator.clipboard.writeText(current.mobilepayNumber);
      setNumberCopied(true);
      setTimeout(() => setNumberCopied(false), 1500);
    } catch {
      toast.error("Kunne ikke kopiere nummeret");
    }
  };


  const handleGiveFine = async () => {
    if (!fineMember) {
      toast.error("Vælg et medlem");
      return;
    }
    let label = fineLabel.trim();
    let amount = parseAmount(fineAmount);
    if (fineTypeId !== "custom") {
      const preset = fineTypes.find((t) => t.id === fineTypeId);
      if (preset) {
        label = preset.label;
        amount = Number(preset.amount);
      }
    }
    if (!label || !amount || amount <= 0) {
      toast.error("Udfyld bøde og beløb");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("fines").insert({
      team_id: teamId,
      user_id: fineMember,
      fine_type_id: fineTypeId !== "custom" ? fineTypeId : null,
      label,
      amount,
      created_by: user.id,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const member = members.find((m) => m.userId === fineMember);
    toast.success(`Bøde givet til ${member ? firstName(member.name) : "medlemmet"}`);
    setFineOpen(false);
    setFineMember("");
    setFineTypeId("custom");
    setFineLabel("");
    setFineAmount("");
    await refresh();
  };

  const handleReview = async (paymentId: string, status: "approved" | "rejected") => {
    const { error } = await supabase
      .from("payments")
      .update({ status, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
      .eq("id", paymentId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(status === "approved" ? "Indbetaling godkendt" : "Indbetaling afvist");
    await refresh();
  };


  const inviteCodeMessage = `Tilmeld dig holdet "${current.teamName}" i ${current.clubName} i appen Bødekassen med koden ${inviteCode ?? ""}.\n\nSådan gør du:\n1. Hent appen i App Store: ${APP_DOWNLOAD_URL}\n2. Opret dig som bruger\n3. Vælg "Tilmeld med kode" og indtast koden ${inviteCode ?? ""}\n4. Afvent godkendelse fra en administrator\n\nGlæder mig til at se dig på holdet!`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-semibold">
            Hej {firstName(profile?.label || "spiller")}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {current.clubName} · {current.teamName}
          </p>
        </div>
        {isAdmin && (
          <Button variant="outline" onClick={() => setInviteOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" /> Inviter til klub
          </Button>
        )}
      </div>

      <div className={`grid gap-2 ${isAdmin ? "grid-cols-2" : "grid-cols-1"}`}>
        <Button variant="pitch" className="w-full" onClick={() => setPayOpen(true)}>
          <HandCoins className="mr-2 h-4 w-4" /> Indbetal
        </Button>
        {isAdmin && (
          <Button variant="gold" className="w-full" onClick={() => setFineOpen(true)}>
            <Ticket className="mr-2 h-4 w-4" /> Uddel bøde
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Du skylder"
          value={formatKr(owed)}
          icon={CircleAlert}
          tone={owed > 0 ? "red" : "pitch"}
        />
        <StatCard label="Modtagne bøder" value={formatKr(finesTotal)} icon={Ticket} tone="gold" />
        <StatCard label="Indbetalt" value={formatKr(approvedTotal)} icon={PiggyBank} tone="pitch" />
        <StatCard
          label="Afventer"
          value={formatKr(pendingTotal)}
          icon={Clock}
          tone="navy"
          hint="Afventer admin-godkendelse"
        />
      </div>

      {isAdmin && pendingPayments.length > 0 && (
        <section className="rounded-2xl border border-gold/50 bg-gold-soft/50 p-5">
          <h2 className="font-display text-xl font-semibold">
            Indbetalinger til godkendelse ({pendingPayments.length})
          </h2>
          <ul className="mt-3 space-y-2">
            {pendingPayments.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {p.profiles?.display_name ?? "Ukendt"} · {formatKr(Number(p.amount))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(p.created_at)}
                    {p.note ? ` · ${p.note}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="pitch" onClick={() => handleReview(p.id, "approved")}>
                    Godkend
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleReview(p.id, "rejected")}>
                    Afvis
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl border bg-card p-5 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Dine seneste bøder</h2>
          <Wallet className="h-5 w-5 text-muted-foreground" />
        </div>
        {myFines.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Ingen bøder endnu — fortsæt det gode arbejde!
          </p>
        ) : (
          <ul className="mt-3 divide-y">
            {myFines.slice(0, 6).map((fine) => (
              <li key={fine.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{fine.label}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(fine.created_at)}</p>
                </div>
                <Badge variant="gold">{formatKr(Number(fine.amount))}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={payOpen} onOpenChange={(open) => (open ? setPayOpen(true) : closePayDialog())}>
        <DialogContent>
          {payStep === "form" ? (
            <>
              <div className="space-y-1.5">
                <DialogTitle>Indbetal til bødekassen</DialogTitle>
                <DialogDescription>
                  Vælg beløb og betalingsmåde, og registrer din betaling. En administrator
                  godkender den bagefter.
                </DialogDescription>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pay-amount">Beløb (kr.)</Label>
                  <Input
                    id="pay-amount"
                    inputMode="decimal"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="Fx 100"
                  />
                  {owed > 0 && (
                    <button
                      type="button"
                      className="text-xs font-medium text-pitch underline-offset-2 hover:underline"
                      onClick={() => setPayAmount(String(owed))}
                    >
                      Indsæt hele mit skyldige beløb ({formatKr(owed)})
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Betal via</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { key: "mobilepay" as const, label: "MobilePay", icon: Smartphone },
                        { key: "cash" as const, label: "Kontant", icon: HandCoins },
                      ]
                    ).map(({ key, label, icon: Icon }) => {
                      const active = payMethod === key;
                      const disabled = key === "mobilepay" && !current.mobilepayNumber;
                      return (
                        <button
                          key={key}
                          type="button"
                          disabled={disabled}
                          onClick={() => setPayMethod(key)}
                          className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition-colors disabled:opacity-50 ${
                            active
                              ? "border-pitch bg-pitch-soft/60"
                              : "bg-background hover:bg-muted/40"
                          }`}
                        >
                          <Icon className="h-4 w-4 text-pitch" />
                          <span className="flex-1 text-left uppercase tracking-wide">{label}</span>
                          {active && <Check className="h-4 w-4 text-pitch" />}
                        </button>
                      );
                    })}
                  </div>
                  {!current.mobilepayNumber && (
                    <p className="rounded-xl bg-secondary px-3 py-2.5 text-xs text-muted-foreground">
                      Holdet har ikke sat et MobilePay-nummer op endnu —{" "}
                      {isAdmin
                        ? "du kan tilføje det under Indstillinger"
                        : "spørg din administrator"}
                      .
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pay-note">Note (valgfri)</Label>
                  <Input
                    id="pay-note"
                    value={payNote}
                    onChange={(e) => setPayNote(e.target.value)}
                    placeholder="Fx Kontanter til træner"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closePayDialog}>
                  Annuller
                </Button>
                <Button
                  variant="pitch"
                  onClick={handleRegisterPayment}
                  disabled={busy || !payAmount.trim()}
                >
                  Registrer betaling
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <DialogTitle>Betaling registreret</DialogTitle>
                <DialogDescription>
                  {formatKr(registeredAmount)} er sendt til godkendelse hos en administrator.
                </DialogDescription>
              </div>
              <div className="space-y-4">
                {payMethod === "mobilepay" && current.mobilepayNumber ? (
                  <div className="rounded-2xl border border-pitch/30 bg-pitch-soft/50 p-4 text-center">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Overfør via MobilePay til
                    </p>
                    <button
                      type="button"
                      onClick={copyMobilepayNumber}
                      className="mt-1 inline-flex items-center gap-2 font-mono text-2xl font-bold tracking-[0.15em]"
                    >
                      {current.mobilepayNumber}
                      {numberCopied ? (
                        <Check className="h-5 w-5 text-pitch" />
                      ) : (
                        <Copy className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {numberCopied ? "Nummeret er kopieret" : "Tryk for at kopiere nummeret"}
                    </p>
                    {current.mobilepayBoxCode && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Box-kode:{" "}
                        <span className="font-mono text-sm font-bold tracking-widest text-foreground">
                          {current.mobilepayBoxCode}
                        </span>
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border bg-secondary p-4 text-center">
                    <p className="text-sm font-semibold">Aflever {formatKr(registeredAmount)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Giv beløbet kontant til en administrator i {current.teamName}.
                    </p>
                  </div>
                )}
                <p className="rounded-xl bg-secondary px-3 py-2.5 text-xs text-muted-foreground">
                  Du skal selv gennemføre overførslen. Administratoren får besked om din
                  registrering og godkender den, når beløbet er modtaget.
                </p>
              </div>
              <DialogFooter>
                <Button variant="pitch" onClick={closePayDialog}>
                  OK
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>


      <Dialog open={fineOpen} onOpenChange={setFineOpen}>
        <DialogContent>
          <div className="space-y-1.5">
            <DialogTitle>Uddel bøde</DialogTitle>
            <DialogDescription>
              Giv en bøde til et medlem af {current.teamName}.
            </DialogDescription>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Medlem</Label>
              <Select value={fineMember} onValueChange={setFineMember}>
                <SelectTrigger>
                  <SelectValue placeholder="Vælg medlem" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.userId} value={m.userId}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Bøde</Label>
              <Select value={fineTypeId} onValueChange={setFineTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Vælg bøde" />
                </SelectTrigger>
                <SelectContent>
                  {fineTypes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label} · {formatKr(Number(t.amount))}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Anden bøde…</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {fineTypeId === "custom" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fine-label">Beskrivelse</Label>
                  <Input
                    id="fine-label"
                    value={fineLabel}
                    onChange={(e) => setFineLabel(e.target.value)}
                    placeholder="Fx Glemt støvler"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fine-amount">Beløb (kr.)</Label>
                  <Input
                    id="fine-amount"
                    inputMode="decimal"
                    value={fineAmount}
                    onChange={(e) => setFineAmount(e.target.value)}
                    placeholder="Fx 20"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFineOpen(false)}>
              Annuller
            </Button>
            <Button variant="gold" onClick={handleGiveFine} disabled={busy}>
              Giv bøde
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <div className="space-y-1.5">
            <DialogTitle>Inviter til {current.teamName}</DialogTitle>
            <DialogDescription>
              Send en færdig besked med holdets kode og vejledning til nye spillere.
            </DialogDescription>
          </div>
          <div className="space-y-4">
            <div className="space-y-2.5 rounded-2xl border p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <KeyRound className="h-4 w-4 text-gold-foreground" /> Inviter via kode
              </p>
              <p className="whitespace-pre-line rounded-xl bg-secondary px-3 py-2.5 text-xs text-muted-foreground">
                {inviteCodeMessage}
              </p>
              <Button
                variant="gold"
                className="w-full"
                onClick={() => void shareOrCopy(inviteCodeMessage, "Invitationsbesked kopieret")}
              >
                <Share2 className="mr-2 h-4 w-4" /> Del besked
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
