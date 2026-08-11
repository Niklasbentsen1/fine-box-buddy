import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, HandCoins, Ticket, Trash2, UserRound, Wallet } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useConfirm } from "@/components/confirm-dialog";
import { useTeam } from "@/lib/team";
import { formatDateTime, formatKr } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/historik")({
  head: () => ({
    meta: [
      { title: "Historik — Bødekassen" },
      { name: "description", content: "Historik over alle bøder, indbetalinger og udbetalinger." },
    ],
  }),
  component: HistorikPage,
});

type FineRow = {
  id: string;
  label: string;
  amount: number;
  created_at: string;
  created_by: string;
  profiles: { display_name: string } | null;
};

type PaymentRow = {
  id: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  note: string | null;
  created_at: string;
  user_id: string;
  profiles: { display_name: string } | null;
};

type WithdrawalRow = {
  id: string;
  amount: number;
  note: string | null;
  created_at: string;
};

type FeedItem = {
  id: string;
  kind: "fine" | "payment" | "withdrawal";
  date: string;
  title: string;
  detail: string | null;
  amount: number;
  status?: PaymentRow["status"];
  paymentId?: string;
  fineId?: string;
  createdBy?: string;
};

const STATUS_LABEL: Record<PaymentRow["status"], string> = {
  pending: "Afventer",
  approved: "Godkendt",
  rejected: "Afvist",
};

function HistorikPage() {
  const { user, current, isAdmin } = useTeam();
  const queryClient = useQueryClient();
  const teamId = current?.teamId;
  const [expandedFineId, setExpandedFineId] = useState<string | null>(null);

  const { data: fines = [] } = useQuery({
    queryKey: ["team", teamId, "hist-fines"],
    enabled: !!teamId,
    queryFn: async (): Promise<FineRow[]> => {
      const { data, error } = await supabase
        .from("fines")
        .select("id, label, amount, created_at, created_by, profiles(display_name)")
        .eq("team_id", teamId!)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as FineRow[];
    },
  });

  const creatorIds = useMemo(
    () => [...new Set(fines.map((f) => f.created_by))].sort(),
    [fines],
  );

  const { data: creatorNames = {} } = useQuery({
    queryKey: ["profiles", "names", creatorIds],
    enabled: creatorIds.length > 0,
    queryFn: async (): Promise<Record<string, string>> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", creatorIds);
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((p) => [p.id, p.display_name]));
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["team", teamId, "hist-payments"],
    enabled: !!teamId,
    queryFn: async (): Promise<PaymentRow[]> => {
      const { data, error } = await supabase
        .from("payments")
        .select("id, amount, status, note, created_at, user_id, profiles(display_name)")
        .eq("team_id", teamId!)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as PaymentRow[];
    },
  });

  const { data: withdrawals = [] } = useQuery({
    queryKey: ["team", teamId, "hist-withdrawals"],
    enabled: !!teamId,
    queryFn: async (): Promise<WithdrawalRow[]> => {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("id, amount, note, created_at")
        .eq("team_id", teamId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as WithdrawalRow[];
    },
  });

  if (!current || !teamId) return null;

  const feed: FeedItem[] = [
    ...fines.map((f) => ({
      id: `fine-${f.id}`,
      kind: "fine" as const,
      date: f.created_at,
      title: `${f.profiles?.display_name ?? "Ukendt"} · ${f.label}`,
      detail: null,
      amount: Number(f.amount),
      fineId: f.id,
      createdBy: creatorNames[f.created_by] ?? "Ukendt",
    })),
    ...payments.map((p) => ({
      id: `pay-${p.id}`,
      kind: "payment" as const,
      date: p.created_at,
      title: `${p.profiles?.display_name ?? "Ukendt"} indbetalte`,
      detail: p.note,
      amount: Number(p.amount),
      status: p.status,
      paymentId: p.id,
    })),
    ...withdrawals.map((w) => ({
      id: `wd-${w.id}`,
      kind: "withdrawal" as const,
      date: w.created_at,
      title: "Udbetaling fra kassen",
      detail: w.note,
      amount: Number(w.amount),
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
    await queryClient.invalidateQueries({ queryKey: ["team", teamId] });
  };

  const handleDeleteFine = async (fineId: string, title: string) => {
    const ok = await confirm({
      title: "Slet bøden?",
      description: `"${title}" fjernes permanent fra holdets regnskab.`,
      confirmLabel: "Slet bøde",
    });
    if (!ok) return;
    const { error } = await supabase.from("fines").delete().eq("id", fineId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Bøde slettet");
    setExpandedFineId(null);
    await queryClient.invalidateQueries({ queryKey: ["team", teamId] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-semibold">Historik</h1>
        <p className="mt-1 text-muted-foreground">
          Alle bøder, indbetalinger og udbetalinger for {current.teamName}
        </p>
      </div>

      {feed.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center shadow-card">
          <p className="text-sm text-muted-foreground">
            Der er endnu ingen aktivitet i bødekassen.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {feed.map((item) => (
            <li
              key={item.id}
              className={`flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-card ${
                item.kind === "fine" ? "cursor-pointer transition-colors hover:bg-muted/40" : ""
              }`}
              onClick={
                item.kind === "fine"
                  ? () =>
                      setExpandedFineId((prev) =>
                        prev === item.fineId ? null : item.fineId!,
                      )
                  : undefined
              }
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  item.kind === "fine"
                    ? "bg-gold-soft text-gold-foreground"
                    : item.kind === "payment"
                      ? "bg-pitch-soft text-pitch"
                      : "bg-primary/10 text-primary"
                }`}
              >
                {item.kind === "fine" ? (
                  <Ticket className="h-5 w-5" />
                ) : item.kind === "payment" ? (
                  <HandCoins className="h-5 w-5" />
                ) : (
                  <Wallet className="h-5 w-5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{item.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatDateTime(item.date)}
                  {item.detail ? ` · ${item.detail}` : ""}
                </p>
                {isAdmin && item.kind === "payment" && item.status === "pending" && (
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="pitch"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReview(item.paymentId!, "approved");
                      }}
                    >
                      Godkend
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReview(item.paymentId!, "rejected");
                      }}
                    >
                      Afvis
                    </Button>
                  </div>
                )}
                {item.kind === "fine" && expandedFineId === item.fineId && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground">
                      <UserRound className="h-3.5 w-3.5" />
                      Uddelt af{" "}
                      <span className="font-semibold text-foreground">{item.createdBy}</span>
                    </span>
                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFine(item.fineId!, item.title);
                        }}
                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Slet bøde
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="flex items-center gap-1.5">
                  <span
                    className={`text-sm font-bold ${
                      item.kind === "fine"
                        ? "text-gold-foreground"
                        : item.kind === "payment"
                          ? "text-pitch"
                          : "text-primary"
                    }`}
                  >
                    {item.kind === "fine" ? "+" : item.kind === "payment" ? "+" : "−"}
                    {formatKr(item.amount)}
                  </span>
                  {item.kind === "fine" && (
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition-transform ${
                        expandedFineId === item.fineId ? "rotate-180" : ""
                      }`}
                    />
                  )}
                </span>
                {item.kind === "payment" && item.status && (
                  <Badge
                    variant={
                      item.status === "approved"
                        ? "pitch"
                        : item.status === "rejected"
                          ? "destructive"
                          : "muted"
                    }
                  >
                    {STATUS_LABEL[item.status]}
                  </Badge>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
