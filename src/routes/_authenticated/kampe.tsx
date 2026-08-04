import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Medal, Trophy } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useTeam } from "@/lib/team";
import { formatDateTime } from "@/lib/format";
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

export const Route = createFileRoute("/_authenticated/kampe")({
  head: () => ({
    meta: [
      { title: "Kampe — Bødekassen" },
      { name: "description", content: "Opret kampe og stem på kampens spiller." },
    ],
  }),
  component: KampePage,
});

type MatchRow = {
  id: string;
  opponent: string;
  played_at: string;
  voting_closes_at: string;
  status: "open" | "closed";
};

type VoteAggRow = {
  voted_for_id: string;
  profiles: { display_name: string } | null;
};

function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function KampePage() {
  const { user, current, isAdmin } = useTeam();
  const queryClient = useQueryClient();
  const teamId = current?.teamId;

  const [createOpen, setCreateOpen] = useState(false);
  const [opponent, setOpponent] = useState("");
  const [playedAt, setPlayedAt] = useState(() => toLocalInput(new Date()));
  const [closesAt, setClosesAt] = useState(() =>
    toLocalInput(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)),
  );
  const [busy, setBusy] = useState(false);

  const { data: matches = [] } = useQuery({
    queryKey: ["team", teamId, "matches"],
    enabled: !!teamId,
    queryFn: async (): Promise<MatchRow[]> => {
      const { data, error } = await supabase
        .from("matches")
        .select("id, opponent, played_at, voting_closes_at, status")
        .eq("team_id", teamId!)
        .order("played_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MatchRow[];
    },
  });

  const { data: voteAgg = [] } = useQuery({
    queryKey: ["team", teamId, "motm-agg"],
    enabled: !!teamId,
    queryFn: async (): Promise<VoteAggRow[]> => {
      const { data, error } = await supabase
        .from("motm_votes")
        .select("voted_for_id, matches!inner(team_id), profiles!motm_votes_voted_for_id_fkey(display_name)")
        .eq("matches.team_id", teamId!);
      if (error) throw error;
      return (data ?? []) as unknown as VoteAggRow[];
    },
  });

  if (!current || !teamId) return null;

  const leaderboardMap = new Map<string, { name: string; votes: number }>();
  for (const row of voteAgg) {
    const entry = leaderboardMap.get(row.voted_for_id) ?? {
      name: row.profiles?.display_name ?? "Ukendt",
      votes: 0,
    };
    entry.votes += 1;
    leaderboardMap.set(row.voted_for_id, entry);
  }
  const leaderboard = Array.from(leaderboardMap.values()).sort((a, b) => b.votes - a.votes);

  const maxVotes = leaderboard[0]?.votes ?? 0;

  const handleCreate = async () => {
    if (!opponent.trim()) {
      toast.error("Skriv modstanderens navn");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("matches").insert({
      team_id: teamId,
      opponent: opponent.trim(),
      played_at: new Date(playedAt).toISOString(),
      voting_closes_at: new Date(closesAt).toISOString(),
      created_by: user.id,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Kamp oprettet — tilføj nu spillere til kampen");
    setCreateOpen(false);
    setOpponent("");
    await queryClient.invalidateQueries({ queryKey: ["team", teamId] });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-semibold">Kampe</h1>
          <p className="mt-1 text-muted-foreground">
            Stem på kampens spiller efter hver kamp
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreateOpen(true)}>
            <CalendarPlus className="mr-2 h-4 w-4" /> Opret kamp
          </Button>
        )}
      </div>

      {leaderboard.length > 0 && (
        <section className="rounded-2xl border bg-card p-5 shadow-card">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-gold" />
            <h2 className="font-display text-xl font-semibold">Kampens spiller — samlet stilling</h2>
          </div>
          <ul className="mt-4 space-y-3">
            {leaderboard.slice(0, 10).map((entry, index) => (
              <li key={entry.name} className="flex items-center gap-3">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    index === 0
                      ? "bg-gold text-gold-foreground"
                      : index === 1
                        ? "bg-secondary text-secondary-foreground"
                        : index === 2
                          ? "bg-gold-soft text-gold-foreground"
                          : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {index < 3 ? <Medal className="h-4 w-4" /> : index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{entry.name}</p>
                    <p className="text-xs font-medium text-muted-foreground">
                      {entry.votes} {entry.votes === 1 ? "stemme" : "stemmer"}
                    </p>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-pitch transition-all"
                      style={{ width: `${maxVotes > 0 ? (entry.votes / maxVotes) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Alle kampe</h2>
        {matches.length === 0 ? (
          <div className="rounded-2xl border bg-card p-10 text-center shadow-card">
            <p className="text-sm text-muted-foreground">
              {isAdmin
                ? "Ingen kampe endnu. Opret den første kamp, og tilføj spillere til den."
                : "Der er ikke oprettet kampe endnu."}
            </p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {matches.map((match) => {
              const votingOpen =
                match.status === "open" && new Date(match.voting_closes_at) > new Date();
              return (
                <li key={match.id}>
                  <Link
                    to="/kampe/$matchId"
                    params={{ matchId: match.id }}
                    className="block rounded-2xl border bg-card p-5 shadow-card transition-all hover:shadow-pop"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-display text-2xl font-semibold">vs. {match.opponent}</p>
                      <Badge variant={votingOpen ? "pitch" : "muted"}>
                        {votingOpen ? "Afstemning åben" : "Afstemning lukket"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Spillet {formatDateTime(match.played_at)}
                    </p>
                    {votingOpen && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Stem senest {formatDateTime(match.voting_closes_at)}
                      </p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <div className="space-y-1.5">
            <DialogTitle>Opret kamp</DialogTitle>
            <DialogDescription>
              Når kampen er oprettet, tilføjer du spillere, og de kan stemme på kampens spiller.
            </DialogDescription>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="opponent">Modstander</Label>
              <Input
                id="opponent"
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                placeholder="Fx Østby BK"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="played-at">Spillet</Label>
              <Input
                id="played-at"
                type="datetime-local"
                value={playedAt}
                onChange={(e) => setPlayedAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="closes-at">Afstemning lukker</Label>
              <Input
                id="closes-at"
                type="datetime-local"
                value={closesAt}
                onChange={(e) => setClosesAt(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Annuller
            </Button>
            <Button onClick={handleCreate} disabled={busy || !opponent.trim()}>
              Opret kamp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
