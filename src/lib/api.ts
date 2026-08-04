import { supabase } from "@/integrations/supabase/client";

export type MemberRow = {
  userId: string;
  role: "admin" | "member";
  name: string;
  avatarUrl: string | null;
  phone: string | null;
};

export async function fetchTeamMembers(teamId: string): Promise<MemberRow[]> {
  const { data, error } = await supabase
    .from("team_members")
    .select("user_id, role, profiles(display_name, avatar_url, phone)")
    .eq("team_id", teamId)
    .order("joined_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    userId: row.user_id,
    role: row.role,
    name: row.profiles?.display_name ?? "Ukendt",
    avatarUrl: row.profiles?.avatar_url ?? null,
    phone: row.profiles?.phone ?? null,
  }));
}

export type ClubTeamRow = {
  id: string;
  name: string;
};

export async function fetchClubTeams(clubId: string): Promise<ClubTeamRow[]> {
  const { data, error } = await supabase
    .from("teams")
    .select("id, name")
    .eq("club_id", clubId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, name: row.name }));
}
