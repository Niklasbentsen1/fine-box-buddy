import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export type Membership = {
  teamId: string;
  teamName: string;
  clubId: string;
  clubName: string;
  inviteCode: string;
  mobilepayNumber: string | null;
  balanceCarryover: number;
  role: "admin" | "member";
};

export type Profile = {
  displayName: string;
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
    balance_carryover: number;
    clubs: { id: string; name: string; invite_code: string };
  };
};

export function TeamProvider({ user, children }: { user: User; children: ReactNode }) {
  const queryClient = useQueryClient();
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(storageKey(user.id));
  });

  const { data: memberships = [], isLoading } = useQuery({
    queryKey: ["memberships", user.id],
    queryFn: async (): Promise<Membership[]> => {
      const { data, error } = await supabase
        .from("team_members")
        .select(
          "team_id, role, teams!inner(id, name, club_id, mobilepay_number, balance_carryover, clubs!inner(id, name, invite_code))",
        )
        .eq("user_id", user.id)
        .order("joined_at", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as unknown as MembershipRow[]).map((row) => ({
        teamId: row.team_id,
        teamName: row.teams.name,
        clubId: row.teams.club_id,
        clubName: row.teams.clubs.name,
        inviteCode: row.teams.clubs.invite_code,
        mobilepayNumber: row.teams.mobilepay_number,
        balanceCarryover: Number(row.teams.balance_carryover ?? 0),
        role: row.role,
      }));
    },
  });

  const { data: profile = null } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async (): Promise<Profile | null> => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, phone")
        .eq("id", user.id)
        .maybeSingle();
      if (!data) return null;
      return { displayName: data.display_name, avatarUrl: data.avatar_url, phone: data.phone };
    },
  });

  const current = useMemo(() => {
    if (memberships.length === 0) return null;
    return memberships.find((m) => m.teamId === selectedTeamId) ?? memberships[0] ?? null;
  }, [memberships, selectedTeamId]);

  const value: TeamContextValue = {
    user,
    profile,
    memberships,
    current,
    isAdmin: current?.role === "admin",
    isLoading,
    setCurrentTeamId: (teamId) => {
      setSelectedTeamId(teamId);
      window.localStorage.setItem(storageKey(user.id), teamId);
    },
    refreshMemberships: async () => {
      await queryClient.invalidateQueries({ queryKey: ["memberships", user.id] });
    },
  };

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

export function useTeam() {
  const ctx = useContext(TeamContext);
  if (!ctx) throw new Error("useTeam skal bruges inde i TeamProvider");
  return ctx;
}
