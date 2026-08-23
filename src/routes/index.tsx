import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import fineBuddyLogo from "@/assets/finebuddy-logo.png.asset.json";
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
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-safe py-safe">
      <img src={fineBuddyLogo.url} alt="FineBuddy logo" className="h-28 w-auto object-contain" />
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-pitch border-t-transparent" />
    </div>
  );
}
