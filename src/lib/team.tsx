import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export type Membership = {
  teamId: string;
  teamName: string;
  clubId: string;
  clubName: string;
  clubLogoUrl: string | null;
  mobilepayNumber: string | null;
  mobilepayBoxCode: string | null;
  balanceCarryover: number;
  role: "admin" | "member";
};

export type Profile = {
  /** Brugerens fulde navn. */
  displayName: string;
  /** Valgfrit kaldenavn. */
  nickname: string | null;
  /** Kaldenavn hvis angivet, ellers det fulde navn — brug denne i UI. */
  label: string;
  avatarUrl: string | null;
  phone: string | null;
};

type TeamContextValue = {
  user: User;
  profile: Profile | null;
  memberships: Membership[];
  current: Membership | null;
  isAdmin: boolean;
  isLoading: boolean;
  hasError: boolean;
  pendingCount: number;
  setCurrentTeamId: (teamId: string) => void;
  refreshMemberships: () => Promise<void>;
};

const TeamContext = createContext<TeamContextValue | null>(null);

const storageKey = (userId: string) => `boedekasse:current-team:${userId}`;

type MembershipRow = {
  team_id: string;
  role: "admin" | "member";
  teams: {
    id: string;
    name: string;
    club_id: string;
    mobilepay_number: string | null;
    mobilepay_box_code: string | null;
    balance_carryover: number;
  } | null;
};


export function TeamProvider({ user, children }: { user: User; children: ReactNode }) {
  const queryClient = useQueryClient();
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(storageKey(user.id));
  });

  const {
    data: memberships = [],
    isLoading: membershipsLoading,
    isError: membershipsError,
  } = useQuery({
    queryKey: ["memberships", user.id],
    queryFn: async (): Promise<Membership[]> => {
      const { data, error } = await supabase
        .from("team_members")
        .select("team_id, role, teams(id, name, club_id, mobilepay_number, mobilepay_box_code, balance_carryover)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("joined_at", { ascending: true });
      if (error) throw error;
      const rows = ((data ?? []) as unknown as MembershipRow[]).filter((row) => row.teams);

      // Klubnavne hentes separat, så et manglende klubopslag aldrig kan fjerne
      // et gyldigt medlemskab (og dermed sende brugeren tilbage til onboarding).
      const clubIds = Array.from(new Set(rows.map((row) => row.teams!.club_id)));
      const clubNames = new Map<string, string>();
      const clubLogos = new Map<string, string | null>();
      if (clubIds.length > 0) {
        const { data: clubs } = await supabase
          .from("clubs")
          .select("id, name, logo_url")
          .in("id", clubIds);
        for (const club of clubs ?? []) {
          clubNames.set(club.id, club.name);
          clubLogos.set(club.id, club.logo_url ?? null);
        }
      }

      return rows.map((row) => ({
        teamId: row.team_id,
        teamName: row.teams!.name,
        clubId: row.teams!.club_id,
        clubName: clubNames.get(row.teams!.club_id) ?? "Klub",
        clubLogoUrl: clubLogos.get(row.teams!.club_id) ?? null,
        mobilepayNumber: row.teams!.mobilepay_number,
        mobilepayBoxCode: row.teams!.mobilepay_box_code ?? null,
        balanceCarryover: Number(row.teams!.balance_carryover ?? 0),
        role: row.role,
      }));
    },
  });


  const { data: profile = null } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async (): Promise<Profile | null> => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, nickname, avatar_url, phone")
        .eq("id", user.id)
        .maybeSingle();
      if (!data) return null;
      return {
        displayName: data.display_name,
        nickname: data.nickname ?? null,
        label: data.nickname?.trim() || data.display_name,
        avatarUrl: data.avatar_url,
        phone: data.phone,
      };
    },
  });

  const { data: pendingCount = 0, isLoading: pendingLoading } = useQuery({
    queryKey: ["pending-memberships", user.id],
    refetchInterval: 30000,
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from("team_members")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "pending");
      if (error) throw error;
      return count ?? 0;
    },
  });

  const current = useMemo(() => {
    if (memberships.length === 0) return null;
    return memberships.find((m) => m.teamId === selectedTeamId) ?? memberships[0] ?? null;
  }, [memberships, selectedTeamId]);

  const refreshMemberships = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["memberships", user.id] }),
      queryClient.invalidateQueries({ queryKey: ["pending-memberships", user.id] }),
    ]);
  }, [queryClient, user.id]);

  const value: TeamContextValue = {
    user,
    profile,
    memberships,
    current,
    isAdmin: current?.role === "admin",
    isLoading: membershipsLoading || pendingLoading,
    hasError: membershipsError,
    pendingCount,

    setCurrentTeamId: (teamId) => {
      setSelectedTeamId(teamId);
      window.localStorage.setItem(storageKey(user.id), teamId);
    },
    refreshMemberships,
  };

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

export function useTeam() {
  const ctx = useContext(TeamContext);
  if (!ctx) throw new Error("useTeam skal bruges inde i TeamProvider");
  return ctx;
}

/**
 * Klubkoden må kun læses af klubbens administratorer og hentes derfor
 * gennem en sikret databasefunktion i stedet for direkte fra klubtabellen.
 */
export function useClubInviteCode(clubId: string | null | undefined, enabled = true) {
  const { data } = useQuery({
    queryKey: ["club-invite-code", clubId],
    enabled: !!clubId && enabled,
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase.rpc("get_club_invite_code", { _club_id: clubId! });
      if (error) throw error;
      return (data as string | null) ?? null;
    },
  });
  return data ?? null;
}

/**
 * Holdets egen tilknytningskode må kun læses af holdets administratorer.
 */
export function useTeamInviteCode(teamId: string | null | undefined, enabled = true) {
  const { data } = useQuery({
    queryKey: ["team-invite-code", teamId],
    enabled: !!teamId && enabled,
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase.rpc("get_team_invite_code", { _team_id: teamId! });
      if (error) throw error;
      return (data as string | null) ?? null;
    },
  });
  return data ?? null;
}
