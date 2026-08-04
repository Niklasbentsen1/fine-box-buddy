import { createFileRoute, Navigate, Outlet, redirect, useRouterState } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { TeamProvider, useTeam } from "@/lib/team";
import { AppShell } from "@/components/app-shell";

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
  const { memberships, isLoading } = useTeam();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-pitch border-t-transparent" />
      </div>
    );
  }

  const onOnboarding = pathname === "/onboarding";

  if (memberships.length === 0 && !onOnboarding) {
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
