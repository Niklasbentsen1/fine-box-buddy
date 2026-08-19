import { createFileRoute, Navigate, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Hourglass, LogOut } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { TeamProvider, useTeam } from "@/lib/team";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user } = Route.useRouteContext();
  return (
    <TeamProvider user={user}>
      <MembershipGate />
    </TeamProvider>
  );
}

function MembershipGate() {
  const { memberships, pendingCount, isLoading, hasError, refreshMemberships } = useTeam();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-pitch border-t-transparent" />
      </div>
    );
  }

  // Kunne holdene ikke hentes, må vi ikke antage at brugeren står uden klub —
  // vis en fejl med mulighed for at prøve igen i stedet for onboarding.
  if (hasError) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-safe py-safe">
        <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-card">
          <h1 className="font-display text-2xl font-semibold">Kunne ikke hente dine hold</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tjek din internetforbindelse og prøv igen.
          </p>
          <Button className="mt-6 w-full" onClick={() => void refreshMemberships()}>
            Prøv igen
          </Button>
        </div>
      </div>
    );
  }

  const onOnboarding = pathname === "/onboarding";

  if (memberships.length === 0 && !onOnboarding) {
    if (pendingCount > 0) {
      return <PendingApproval />;
    }
    return <Navigate to="/onboarding" replace />;
  }
  if (memberships.length > 0 && onOnboarding) {
    return <Navigate to="/hjem" replace />;
  }


  if (onOnboarding) {
    return <Outlet />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function PendingApproval() {
  const { user, pendingCount, refreshMemberships } = useTeam();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  // Når anmodningen er behandlet (godkendt/afvist), hent medlemskaber igen,
  // så gaten enten lukker brugeren ind eller sender videre til onboarding.
  useEffect(() => {
    if (pendingCount === 0) void refreshMemberships();
  }, [pendingCount, refreshMemberships]);

  const handleCancel = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("user_id", user.id)
      .eq("status", "pending");
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Din anmodning er annulleret");
    await refreshMemberships();
    navigate({ to: "/onboarding" });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background bg-pitch-stripes px-safe py-safe">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-card">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold-soft text-gold-foreground">
          <Hourglass className="h-6 w-6" />
        </span>
        <h1 className="font-display text-2xl font-semibold">
          Din anmodning afventer godkendelse
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          En administrator i klubben skal godkende din anmodning, før du får adgang til bødekassen.
          Siden opdaterer automatisk, når du er godkendt.
        </p>
        <div className="mt-6 space-y-2">
          <Button variant="outline" className="w-full" onClick={handleCancel} disabled={busy}>
            {busy ? "Annullerer…" : "Fortryd anmodning"}
          </Button>
          <Button variant="ghost" className="w-full" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" /> Log ud
          </Button>
        </div>
      </div>
    </div>
  );
}
