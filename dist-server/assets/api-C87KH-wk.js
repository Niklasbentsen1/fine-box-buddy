import { t as supabase } from "./client-BFBFtBi6.js";
//#region src/lib/api.ts
async function fetchTeamMembers(teamId) {
	const { data, error } = await supabase.from("team_members").select("user_id, role, profiles(display_name, avatar_url, phone)").eq("team_id", teamId).eq("status", "active").order("joined_at", { ascending: true });
	if (error) throw error;
	return (data ?? []).map((row) => ({
		userId: row.user_id,
		role: row.role,
		name: row.profiles?.display_name ?? "Ukendt",
		avatarUrl: row.profiles?.avatar_url ?? null,
		phone: row.profiles?.phone ?? null
	}));
}
//#endregion
export { fetchTeamMembers as t };
