import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, Users } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
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
