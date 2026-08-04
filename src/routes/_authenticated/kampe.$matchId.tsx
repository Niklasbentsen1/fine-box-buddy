import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Crown,
  Lock,
  Trash2,
  UserPlus,
  UserMinus,
  Vote,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useTeam } from "@/lib/team";
import { fetchTeamMembers } from "@/lib/api";
import { formatDateTime, initials } from "@/lib/format";
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

export const Route = createFileRoute("/_authenticated/kampe/$matchId")({
  head: () => ({
    meta: [
      { title: "Kamp — Bødekassen" },
      { name: "description", content: "Stem på kampens spiller og se afstemningens resultat." },
    ],
  }),
  component: MatchDetailPage,
});

type MatchRow = {
  id: string;
  team_id: string;
  opponent: string;
  played_at: string;
  voting_closes_at: string;
  status: "open" | "closed";
};

type PlayerRow = {
  id: string;
  user_id: string;
  profiles: { display_name: string } | null;
};

type VoteRow = { voter_id: string; voted_for_id: string };

function MatchDetailPage() {
  const { matchId } = Route.useParams();
  const { user, current, isAdmin } = useTeam();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const teamId = current?.teamId;

  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const { data: match, isLoading: matchLoading } = useQuery({
    queryKey: ["team", teamId, "match", matchId],
    enabled: !!teamId,
    queryFn: async (): Promise<MatchRow | null> => {
      const { data, error } = await supabase
        .from("matches")
        .select("id, team_id, opponent, played_at, voting_closes_at, status")
        .eq("id", matchId)
        .maybeSingle();
      if (error) throw error;
      return (data as MatchRow | null) ?? null;
    },
  });

  const { data: players = [] } = useQuery({
    queryKey: ["team", teamId, "match-players", matchId],
    enabled: !!teamId,
    queryFn: async (): Promise<PlayerRow[]> => {
      const { data, error } = await supabase
        .from("match_players")
        .select("id, user_id, profiles(display_name)")
        .eq("match_id", matchId);
      if (error) throw error;
      return (data ?? []) as unknown as PlayerRow[];
    },
  });

  const { data: votes = [] } = useQuery({
    queryKey: ["team", teamId, "match-votes", matchId],
    enabled: !!teamId,
    queryFn: async (): Promise<VoteRow[]> => {
      const { data, error } = await supabase
        .from("motm_votes")
        .select("voter_id, voted_for_id")
        .eq("match_id", matchId);
      if (error) throw error;
      return (data ?? []) as VoteRow[];
    },
  });

  const { data: members = [] } = useQuery({
    queryKey: ["team", teamId, "members"],
    enabled: !!teamId && isAdmin,
    queryFn: () => fetchTeamMembers(teamId!),
  });

  if (!current || !teamId) return null;

  if (matchLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-pitch border-t-transparent" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="rounded-2xl border bg-card p-10 text-center shadow-card">
        <h1 className="font-display text-2xl font-semibold">Kampen findes ikke</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Den er måske blevet slettet af en administrator.
        </p>
        <Button variant="outline" className="mt-6" onClick={() => navigate({ to: "/kampe" })}>
          Tilbage til kampe
        </Button>
      </div>
    );
  }

  const votingOpen = match.status === "open" && new Date(match.voting_closes_at) > new Date();
  const isParticipant = players.some((p) => p.user_id === user.id);
  const myVote = votes.find((v) => v.voter_id === user.id);
  const canVote = votingOpen && isParticipant && !myVote;

  const voteCounts = new Map<string, number>();
  for (const v of votes) {
    voteCounts.set(v.voted_for_id, (voteCounts.get(v.voted_for_id) ?? 0) + 1);
  }
  const maxCount = Math.max(0, ...voteCounts.values());
  const leaders = new Set(
    Array.from(voteCounts.entries())
      .filter(([, count]) => count === maxCount && count > 0)
      .map(([id]) => id),
  );

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["team", teamId] });

  const handleVote = async (votedForId: string, name: string) => {
    const { error } = await supabase.from("motm_votes").insert({
      match_id: matchId,
      voter_id: user.id,
      voted_for_id: votedForId,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Du har stemt på ${name}`);
    await refresh();
  };

  const handleAddPlayers = async () => {
    if (selected.size === 0) return;
    setBusy(true);
    const rows = Array.from(selected).map((userId) => ({ match_id: matchId, user_id: userId }));
    const { error } = await supabase.from("match_players").insert(rows);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Spillere tilføjet til kampen");
    setAddOpen(false);
    setSelected(new Set());
    await refresh();
  };

  const handleRemovePlayer = async (playerId: string) => {
    const { error } = await supabase.from("match_players").delete().eq("id", playerId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Spiller fjernet fra kampen");
    await refresh();
  };

  const handleCloseVoting = async () => {
    const { error } = await supabase
      .from("matches")
      .update({ status: "closed" })
      .eq("id", matchId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Afstemningen er lukket");
    await refresh();
  };

  const handleDeleteMatch = async () => {
    const { error } = await supabase.from("matches").delete().eq("id", matchId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Kampen er slettet");
    navigate({ to: "/kampe" });
  };

  const toggleSelected = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const playerIds = new Set(players.map((p) => p.user_id));
  const addable = members.filter((m) => !playerIds.has(m.userId));

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/kampe"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Alle kampe
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl font-semibold">vs. {match.opponent}</h1>
            <p className="mt-1 text-muted-foreground">
              Spillet {formatDateTime(match.played_at)}
            </p>
          </div>
          <Badge variant={votingOpen ? "pitch" : "muted"} className="text-sm">
            {votingOpen ? `Afstemning åben til ${formatDateTime(match.voting_closes_at)}` : "Afstemning lukket"}
          </Badge>
        </div>
      </div>

      {isAdmin && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setAddOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" /> Tilføj spillere
          </Button>
          {votingOpen && (
            <Button variant="subtle" onClick={handleCloseVoting}>
              <Lock className="mr-2 h-4 w-4" /> Luk afstemning nu
            </Button>
          )}
          <Button variant="outline" onClick={handleDeleteMatch} className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" /> Slet kamp
          </Button>
        </div>
      )}

      {!votingOpen && leaders.size > 0 && (
        <section className="rounded-2xl border border-gold/60 bg-gold-soft/60 p-5 text-center">
          <Crown className="mx-auto h-8 w-8 text-gold" />
          <h2 className="mt-2 font-display text-2xl font-semibold">
            {leaders.size === 1 ? "Kampens spiller" : "Kampens spillere (uafgjort)"}
          </h2>
          <p className="mt-1 text-lg font-semibold text-gold-foreground">
            {players
              .filter((p) => leaders.has(p.user_id))
              .map((p) => p.profiles?.display_name ?? "Ukendt")
              .join(" & ")}
          </p>
          <p className="text-sm text-muted-foreground">
            {maxCount} {maxCount === 1 ? "stemme" : "stemmer"}
          </p>
        </section>
      )}

      <section className="rounded-2xl border bg-card p-5 shadow-card">
        <div className="flex items-center gap-2">
          <Vote className="h-5 w-5 text-pitch" />
          <h2 className="font-display text-xl font-semibold">
            Spillere og stemmer ({votes.length})
          </h2>
        </div>

        {!isParticipant && !isAdmin && (
          <p className="mt-3 rounded-xl bg-secondary p-3 text-sm text-muted-foreground">
            Kun spillere, der er tilføjet til kampen, kan stemme.
          </p>
        )}
        {myVote && (
          <p className="mt-3 rounded-xl bg-pitch-soft p-3 text-sm text-pitch">
            Du har stemt på{" "}
            {players.find((p) => p.user_id === myVote.voted_for_id)?.profiles?.display_name ??
              "en medspiller"}
            .
          </p>
        )}

        {players.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {isAdmin
              ? "Ingen spillere tilføjet endnu — tilføj spillere for at åbne afstemningen."
              : "Der er ikke tilføjet spillere til kampen endnu."}
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {players.map((player) => {
              const count = voteCounts.get(player.user_id) ?? 0;
              const name = player.profiles?.display_name ?? "Ukendt";
              const isSelf = player.user_id === user.id;
              const isLeader = leaders.has(player.user_id);
              return (
                <li key={player.id} className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {initials(name) || "?"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
                      {name}
                      {isSelf && <span className="text-xs font-normal text-muted-foreground">(dig)</span>}
                      {isLeader && votes.length > 0 && <Crown className="h-4 w-4 text-gold" />}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-pitch transition-all"
                          style={{
                            width: `${maxCount > 0 ? (count / maxCount) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <span className="w-14 text-right text-xs font-medium text-muted-foreground">
                        {count} {count === 1 ? "stemme" : "stemmer"}
                      </span>
                    </div>
                  </div>
                  {canVote && !isSelf && (
                    <Button size="sm" variant="pitch" onClick={() => handleVote(player.user_id, name)}>
                      Stem
                    </Button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => handleRemovePlayer(player.id)}
                      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Fjern ${name} fra kampen`}
                    >
                      <UserMinus className="h-4 w-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <div className="space-y-1.5">
            <DialogTitle>Tilføj spillere til kampen</DialogTitle>
            <DialogDescription>
              Kun tilføjede spillere kan stemme og modtage stemmer.
            </DialogDescription>
          </div>
          {addable.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Alle holdets medlemmer er allerede tilføjet til kampen.
            </p>
          ) : (
            <ul className="max-h-64 space-y-1 overflow-y-auto">
              {addable.map((m) => (
                <li key={m.userId}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 hover:bg-secondary">
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Annuller
            </Button>
            <Button onClick={handleAddPlayers} disabled={busy || selected.size === 0}>
              Tilføj {selected.size > 0 ? `(${selected.size})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
