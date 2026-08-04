revoke execute on function public.is_team_member(uuid, uuid) from public, anon;
revoke execute on function public.is_team_admin(uuid, uuid) from public, anon;
revoke execute on function public.is_club_member(uuid, uuid) from public, anon;
revoke execute on function public.create_club(text, text) from public, anon;
revoke execute on function public.join_club_by_code(text) from public, anon;
revoke execute on function public.create_team(uuid, text) from public, anon;
revoke execute on function public.join_team(uuid) from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

grant execute on function public.is_team_member(uuid, uuid) to authenticated;
grant execute on function public.is_team_admin(uuid, uuid) to authenticated;
grant execute on function public.is_club_member(uuid, uuid) to authenticated;
grant execute on function public.create_club(text, text) to authenticated;
grant execute on function public.join_club_by_code(text) to authenticated;
grant execute on function public.create_team(uuid, text) to authenticated;
grant execute on function public.join_team(uuid) to authenticated;

alter table public.team_members add constraint team_members_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade;
alter table public.fines add constraint fines_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade;
alter table public.payments add constraint payments_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade;
alter table public.reminders add constraint reminders_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade;
alter table public.match_players add constraint match_players_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade;
alter table public.motm_votes add constraint motm_votes_voter_id_fkey foreign key (voter_id) references public.profiles(id) on delete cascade;
alter table public.motm_votes add constraint motm_votes_voted_for_id_fkey foreign key (voted_for_id) references public.profiles(id) on delete cascade;