import { t as supabase } from "./client-BFBFtBi6.js";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { jsx } from "react/jsx-runtime";
import { useQuery, useQueryClient } from "@tanstack/react-query";
//#region src/lib/team.tsx
var TeamContext = createContext(null);
var storageKey = (userId) => `boedekasse:current-team:${userId}`;
function TeamProvider({ user, children }) {
	const queryClient = useQueryClient();
	const [selectedTeamId, setSelectedTeamId] = useState(() => {
		if (typeof window === "undefined") return null;
		return window.localStorage.getItem(storageKey(user.id));
	});
	const { data: memberships = [], isLoading: membershipsLoading } = useQuery({
		queryKey: ["memberships", user.id],
		queryFn: async () => {
			const { data, error } = await supabase.from("team_members").select("team_id, role, teams!inner(id, name, club_id, mobilepay_number, balance_carryover, clubs!inner(id, name, invite_code))").eq("user_id", user.id).eq("status", "active").order("joined_at", { ascending: true });
			if (error) throw error;
			return (data ?? []).map((row) => ({
				teamId: row.team_id,
				teamName: row.teams.name,
				clubId: row.teams.club_id,
				clubName: row.teams.clubs.name,
				inviteCode: row.teams.clubs.invite_code,
				mobilepayNumber: row.teams.mobilepay_number,
				balanceCarryover: Number(row.teams.balance_carryover ?? 0),
				role: row.role
			}));
		}
	});
	const { data: profile = null } = useQuery({
		queryKey: ["profile", user.id],
		queryFn: async () => {
			const { data } = await supabase.from("profiles").select("display_name, avatar_url, phone").eq("id", user.id).maybeSingle();
			if (!data) return null;
			return {
				displayName: data.display_name,
				avatarUrl: data.avatar_url,
				phone: data.phone
			};
		}
	});
	const { data: pendingCount = 0, isLoading: pendingLoading } = useQuery({
		queryKey: ["pending-memberships", user.id],
		refetchInterval: 3e4,
		queryFn: async () => {
			const { count, error } = await supabase.from("team_members").select("id", {
				count: "exact",
				head: true
			}).eq("user_id", user.id).eq("status", "pending");
			if (error) throw error;
			return count ?? 0;
		}
	});
	const current = useMemo(() => {
		if (memberships.length === 0) return null;
		return memberships.find((m) => m.teamId === selectedTeamId) ?? memberships[0] ?? null;
	}, [memberships, selectedTeamId]);
	const refreshMemberships = useCallback(async () => {
		await Promise.all([queryClient.invalidateQueries({ queryKey: ["memberships", user.id] }), queryClient.invalidateQueries({ queryKey: ["pending-memberships", user.id] })]);
	}, [queryClient, user.id]);
	const value = {
		user,
		profile,
		memberships,
		current,
		isAdmin: current?.role === "admin",
		isLoading: membershipsLoading || pendingLoading,
		pendingCount,
		setCurrentTeamId: (teamId) => {
			setSelectedTeamId(teamId);
			window.localStorage.setItem(storageKey(user.id), teamId);
		},
		refreshMemberships
	};
	return /* @__PURE__ */ jsx(TeamContext.Provider, {
		value,
		children
	});
}
function useTeam() {
	const ctx = useContext(TeamContext);
	if (!ctx) throw new Error("useTeam skal bruges inde i TeamProvider");
	return ctx;
}
//#endregion
export { useTeam as n, TeamProvider as t };
