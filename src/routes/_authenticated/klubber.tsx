import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, Shield, Users } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { fetchClubTeams } from "@/lib/api";
import { useTeam } from "@/lib/team";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/klubber")({
  head: () => ({
    meta: [
      { title: "Klubber — Bødekassen" },
      { name: "description", content: "Oversigt over alle aktive klubber i Bødekassen." },
    ],
  }),
  component: KlubberPage,
});

type ClubRow = {
  id: string;
  name: string;
  member_count: number;
};

function MyClubTeams() {
  const { memberships } = useTeam();
  const myClubs = Array.from(
    new Map(memberships.map((m) => [m.clubId, { id: m.clubId, name: m.clubName }])).values(),
  );
  const clubIds = myClubs.map((c) => c.id);

  const { data: teamsByClub = {} } = useQuery({
    queryKey: ["my-club-teams", clubIds],
    enabled: clubIds.length > 0,
    queryFn: async (): Promise<Record<string, { id: string; name: string }[]>> => {
      const entries = await Promise.all(
        clubIds.map(async (id) => [id, await fetchClubTeams(id)] as const),
      );
      return Object.fromEntries(entries);
    },
  });

  if (myClubs.length === 0) return null;

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-card">
      <div>
        <h2 className="font-display text-xl font-semibold">Mine klubber</h2>
        <p className="text-sm text-muted-foreground">
          Holdene i dine klubber. Du har kun adgang til data på dine egne hold.
        </p>
      </div>
      {myClubs.map((club) => (
        <div key={club.id} className="rounded-xl border p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Building2 className="h-4 w-4 text-muted-foreground" /> {club.name}
          </p>
          <ul className="mt-2 space-y-1.5">
            {(teamsByClub[club.id] ?? []).map((team) => {
              const isMine = memberships.some((m) => m.teamId === team.id);
              return (
                <li key={team.id} className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{team.name}</span>
                  {isMine && <Badge variant="pitch">Mit hold</Badge>}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}

function KlubberPage() {
  const { data: clubs = [], isLoading } = useQuery({
    queryKey: ["all-clubs"],
    queryFn: async (): Promise<ClubRow[]> => {
      const { data, error } = await supabase.rpc("get_all_clubs");
      if (error) throw error;
      return (data ?? []) as ClubRow[];
    },
  });


  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-semibold">Klubber</h1>
        <p className="mt-1 text-muted-foreground">
          Alle klubber, der bruger Bødekassen
        </p>
      </div>

      <MyClubTeams />


      <section className="rounded-2xl border bg-card p-5 shadow-card">
        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Henter klubber…</p>
        ) : clubs.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Der er ingen klubber endnu.
          </p>
        ) : (
          <ul className="divide-y">
            {clubs.map((club) => (
              <li key={club.id} className="flex items-center gap-3 py-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                  <Building2 className="h-5 w-5" />
                </span>
                <p className="min-w-0 flex-1 truncate text-sm font-semibold">{club.name}</p>
                <Badge variant="muted">
                  <Users className="mr-1 h-3 w-3" />
                  {club.member_count} {club.member_count === 1 ? "medlem" : "medlemmer"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
