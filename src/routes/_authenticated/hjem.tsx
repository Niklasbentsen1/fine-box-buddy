import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleAlert, Clock, HandCoins, PiggyBank, Ticket, Wallet } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useTeam } from "@/lib/team";
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

function HjemPage() {
  const { user, current, isAdmin, profile } = useTeam();
  const queryClient = useQueryClient();
  const teamId = current?.teamId;

  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [fineOpen, setFineOpen] = useState(false);
  const [fineMember, setFineMember] = useState("");
  const [fineTypeId, setFineTypeId] = useState("custom");
  const [fineLabel, setFineLabel] = useState("");
  const [fineAmount, setFineAmount] = useState("");
  const [busy, setBusy] = useState(false);

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

  const handlePay = async () => {
    const amount = parseAmount(payAmount);
    if (!amount || amount <= 0) {
      toast.error("Indtast et beløb større end 0");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("payments").insert({
      team_id: teamId,
      user_id: user.id,
      amount,
      note: payNote.trim() || null,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Indbetaling registreret — den afventer godkendelse");
    setPayOpen(false);
    setPayAmount("");
    setPayNote("");
    await refresh();
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-semibold">
            Hej {firstName(profile?.displayName || "spiller")}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {current.clubName} · {current.teamName}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="pitch" onClick={() => setPayOpen(true)}>
            <HandCoins className="mr-2 h-4 w-4" /> Indbetal
          </Button>
          {isAdmin && (
            <Button variant="gold" onClick={() => setFineOpen(true)}>
              <Ticket className="mr-2 h-4 w-4" /> Uddel bøde
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Du skylder"
          value={formatKr(owed)}
          icon={CircleAlert}
          tone={owed > 0 ? "red" : "pitch"}
          hint={owed > 0 ? "Indbetal for at kvittere" : "Du er helt kvit"}
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

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <div className="space-y-1.5">
            <DialogTitle>Indbetal til bødekassen</DialogTitle>
            <DialogDescription>
              Registrer din indbetaling (fx MobilePay eller kontanter). En administrator godkender
              den bagefter.
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-note">Note (valgfri)</Label>
              <Input
                id="pay-note"
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                placeholder="Fx MobilePay til Træner"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>
              Annuller
            </Button>
            <Button variant="pitch" onClick={handlePay} disabled={busy || !payAmount.trim()}>
              Registrer indbetaling
            </Button>
          </DialogFooter>
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
    </div>
  );
}
