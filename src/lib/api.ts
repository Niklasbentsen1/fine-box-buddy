import { supabase } from "@/integrations/supabase/client";

export type MemberRow = {
  userId: string;
  role: "admin" | "member";
  /** Primært visningsnavn (kaldenavn hvis angivet) — bruges i beskeder og lister uden for Hold. */
  name: string;
  /** Spillerens rigtige navn. */
  fullName: string;
  /** Valgfrit kaldenavn. */
  nickname: string | null;
  avatarUrl: string | null;
  phone: string | null;
};

export async function fetchTeamMembers(teamId: string): Promise<MemberRow[]> {
  const { data, error } = await supabase
    .from("team_members")
    .select("user_id, role, profiles(display_name, nickname, avatar_url, phone)")
    .eq("team_id", teamId)
    .eq("status", "active")
    .order("joined_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const fullName = row.profiles?.display_name?.trim() || "Ukendt";
    const nickname = row.profiles?.nickname?.trim() || null;
    return {
      userId: row.user_id,
      role: row.role,
      name: nickname || fullName,
      fullName,
      nickname,
      avatarUrl: row.profiles?.avatar_url ?? null,
      phone: row.profiles?.phone ?? null,
    };
  });
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
