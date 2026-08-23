import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Medal, Trophy } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useTeam } from "@/lib/team";
import { fetchTeamMembers } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
      { title: "Kampe — FineBuddy" },
      { name: "description", content: "Opret kampe og stem på kampens spiller." },
    ],
  }),
  component: KampeWrapper,
});

function KampeWrapper() {
  const hasChildMatch = useRouterState({
    select: (s) => s.matches.some((m) => m.routeId.includes("$matchId")),
  });
  if (hasChildMatch) return <Outlet />;
  return <KampePage />;
}

type MatchRow = {
  id: string;
  opponent: string;
  played_at: string;
  voting_closes_at: string;
  status: "open" | "closed";
};

type LeaderboardRow = {
  user_id: string;
  display_name: string | null;
  votes: number;
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
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

  // Anonym sæsonstilling: kun samlede stemmetal pr. spiller, aldrig hvem der stemte.
  const { data: leaderboardRows = [] } = useQuery({
    queryKey: ["team", teamId, "motm-agg"],
    enabled: !!teamId,
    refetchInterval: 30000,
    queryFn: async (): Promise<LeaderboardRow[]> => {
      const { data, error } = await supabase.rpc("get_team_motm_leaderboard", {
        _team_id: teamId!,
      });
      if (error) throw error;
      return (data ?? []) as unknown as LeaderboardRow[];
    },
  });

  const { data: members = [] } = useQuery({
    queryKey: ["team", teamId, "members"],
    enabled: !!teamId && isAdmin,
    queryFn: () => fetchTeamMembers(teamId!),
  });

  if (!current || !teamId) return null;

  const leaderboard = leaderboardRows.map((row) => ({
    name: row.display_name ?? "Ukendt",
    votes: Number(row.votes),
  }));

  const maxVotes = leaderboard[0]?.votes ?? 0;

  const openCreate = () => {
    setSelected(new Set(members.map((m) => m.userId)));
    setCreateOpen(true);
  };

  const toggleSelected = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!opponent.trim()) {
      toast.error("Skriv modstanderens navn");
      return;
    }
    setBusy(true);
    const { data: created, error } = await supabase
      .from("matches")
      .insert({
        team_id: teamId,
        opponent: opponent.trim(),
        played_at: new Date(playedAt).toISOString(),
        voting_closes_at: new Date(closesAt).toISOString(),
        created_by: user.id,
      })
      .select("id")
      .single();
    if (error || !created) {
      setBusy(false);
      toast.error(error?.message ?? "Kunne ikke oprette kampen");
      return;
    }
    if (selected.size > 0) {
      const rows = Array.from(selected).map((userId) => ({
        match_id: created.id,
        user_id: userId,
      }));
      const { error: playersError } = await supabase.from("match_players").insert(rows);
      if (playersError) {
        setBusy(false);
        toast.error(playersError.message);
        return;
      }
    }
    setBusy(false);
    toast.success(
      selected.size > 0
        ? "Kamp oprettet — spillerne har fået besked om afstemningen"
        : "Kamp oprettet — tilføj nu spillere til kampen",
    );
    setCreateOpen(false);
    setOpponent("");
    setSelected(new Set());
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
          <Button onClick={openCreate}>
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
          <p className="mt-1 text-xs text-muted-foreground">
            Samlede stemmer fra alle holdets kampe — alle stemmer er anonyme.
          </p>
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
              Vælg modstander, tidspunkter og spillere. De tilføjede spillere får besked om
              afstemningen og kan stemme på kampens spiller.
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
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Spillere til kampen</Label>
                {members.length > 0 && (
                  <button
                    type="button"
                    className="text-xs font-medium text-pitch hover:underline"
                    onClick={() =>
                      setSelected((prev) =>
                        prev.size === members.length
                          ? new Set()
                          : new Set(members.map((m) => m.userId)),
                      )
                    }
                  >
                    {selected.size === members.length ? "Fravælg alle" : "Vælg alle"}
                  </button>
                )}
              </div>
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground">Henter spillere…</p>
              ) : (
                <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border p-1">
                  {members.map((m) => (
                    <li key={m.userId}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-secondary">
                        <Checkbox
                          checked={selected.has(m.userId)}
                          onCheckedChange={() => toggleSelected(m.userId)}
                        />
                        <span className="text-sm font-medium">{m.name}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-muted-foreground">
                Tilføjede spillere kan stemme og får besked om afstemningens start og
                sluttidspunkt.
              </p>
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
