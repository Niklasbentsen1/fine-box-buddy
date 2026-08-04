import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Coins } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bødekassen — hold styr på klubbens bødekasse" },
      {
        name: "description",
        content:
          "Bødekassen gør det nemt for sportsklubber at holde styr på bøder, indbetalinger og kampens spiller.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      navigate({ to: data.session ? "/hjem" : "/auth", replace: true });
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
        <Coins className="h-8 w-8" />
      </span>
      <p className="font-display text-3xl font-semibold">Bødekassen</p>
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-pitch border-t-transparent" />
    </div>
  );
}
