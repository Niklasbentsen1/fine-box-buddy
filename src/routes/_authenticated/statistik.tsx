import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BarChart3, BellRing, Crown, Ticket } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { supabase } from "@/integrations/supabase/client";
import { useTeam } from "@/lib/team";
import { fetchTeamMembers } from "@/lib/api";
import { firstName, formatKr, sumAmounts } from "@/lib/format";
import { StatCard } from "@/components/stat-card";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/statistik")({
  head: () => ({
    meta: [
      { title: "Statistik — FineBuddy" },
      { name: "description", content: "Statistik over holdets bøder og indbetalinger." },
    ],
  }),
  component: StatistikPage,
});

type FineRow = { user_id: string; amount: number; created_at: string };
type PaymentRow = { user_id: string; amount: number; status: string };

function StatistikPage() {
  const { current } = useTeam();
  const teamId = current?.teamId;

  const { data: members = [] } = useQuery({
    queryKey: ["team", teamId, "members"],
    enabled: !!teamId,
    queryFn: () => fetchTeamMembers(teamId!),
  });

  const { data: fines = [] } = useQuery({
    queryKey: ["team", teamId, "stats-fines"],
    enabled: !!teamId,
    queryFn: async (): Promise<FineRow[]> => {
      const { data, error } = await supabase
        .from("fines")
        .select("user_id, amount, created_at")
        .eq("team_id", teamId!);
      if (error) throw error;
      return (data ?? []) as FineRow[];
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["team", teamId, "stats-payments"],
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

  if (!current || !teamId) return null;

  const approvedPayments = payments.filter((p) => p.status === "approved");
  const finesTotal = sumAmounts(fines);
  const paidTotal = sumAmounts(approvedPayments);
  const outstandingTotal = Math.max(0, finesTotal - paidTotal);
  const hasFines = fines.length > 0;

  const perMember = members
    .map((m) => {
      const memberFines = fines.filter((f) => f.user_id === m.userId);
      const fineSum = sumAmounts(memberFines);
      const paid = sumAmounts(approvedPayments.filter((p) => p.user_id === m.userId));
      return {
        ...m,
        count: memberFines.length,
        fined: fineSum,
        paid,
        owed: Math.max(0, fineSum - paid),
      };
    })
    .sort((a, b) => b.fined - a.fined || a.name.localeCompare(b.name, "da"));

  const chartData = perMember.map((m) => ({
    name: firstName(m.name),
    beloeb: m.fined,
  }));

  const topSinner = perMember.find((m) => m.count > 0) ?? null;

  // Bødebeløb pr. måned, seneste 6 måneder
  const months: { key: string; label: string; beloeb: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: new Intl.DateTimeFormat("da-DK", { month: "short" }).format(d),
      beloeb: 0,
    });
  }
  for (const fine of fines) {
    const d = new Date(fine.created_at);
    const bucket = months.find((m) => m.key === `${d.getFullYear()}-${d.getMonth()}`);
    if (bucket) bucket.beloeb += Number(fine.amount);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-semibold">Statistik</h1>
          <p className="mt-1 text-muted-foreground">
            {current.teamName} · {current.clubName}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate({ to: "/hold" })}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Tilbage til holdet
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Bøder tildelt i alt"
          value={formatKr(finesTotal)}
          icon={Ticket}
          tone="gold"
        />
        <StatCard
          label="Udestående lige nu"
          value={formatKr(outstandingTotal)}
          icon={BellRing}
          tone={outstandingTotal > 0 ? "red" : "navy"}
        />
        <StatCard
          label="Synderen"
          value={topSinner ? firstName(topSinner.name) : "—"}
          icon={Crown}
          tone="pitch"
          hint={topSinner ? `${topSinner.count} bøder i alt` : "Ingen bøder endnu"}
        />
      </div>

      {!hasFines ? (
        <section className="rounded-2xl border bg-card p-10 text-center shadow-card">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold-soft text-gold-foreground">
            <BarChart3 className="h-6 w-6" />
          </span>
          <h2 className="font-display text-xl font-semibold">Ingen bøder endnu</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Når der gives den første bøde på holdet, dukker statistikken op her.
          </p>
        </section>
      ) : (
        <>
          <section className="rounded-2xl border bg-card p-5 shadow-card">
            <h2 className="font-display text-xl font-semibold">Samlede bøder pr. spiller</h2>
            <div className="mt-4 overflow-x-auto pb-2">
              <div style={{ minWidth: Math.max(320, chartData.length * 64) }}>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                      width={48}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                      formatter={(value) => [formatKr(Number(value)), "Bøder"]}
                    />
                    <Bar dataKey="beloeb" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-5 shadow-card">
            <h2 className="font-display text-xl font-semibold">Udvikling de seneste 6 måneder</h2>
            <div className="mt-4 overflow-x-auto pb-2">
              <div style={{ minWidth: 320 }}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={months} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                      width={48}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                      formatter={(value) => [formatKr(Number(value)), "Tildelt"]}
                    />
                    <Bar dataKey="beloeb" fill="var(--pitch)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-5 shadow-card">
            <h2 className="font-display text-xl font-semibold">Pr. spiller</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Spiller</th>
                    <th className="py-2 px-3 text-right font-medium">Bøder</th>
                    <th className="py-2 px-3 text-right font-medium">Tildelt</th>
                    <th className="py-2 px-3 text-right font-medium">Betalt</th>
                    <th className="py-2 pl-3 text-right font-medium">Udestående</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {perMember.map((m) => (
                    <tr key={m.userId}>
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={m.name} url={m.avatarUrl} size="sm" />
                          <span className="font-medium">{m.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{m.count}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{formatKr(m.fined)}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{formatKr(m.paid)}</td>
                      <td className="py-2.5 pl-3 text-right tabular-nums">
                        {formatKr(m.owed)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
