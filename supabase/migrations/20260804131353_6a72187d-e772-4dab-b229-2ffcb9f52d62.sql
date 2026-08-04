create or replace function public.shares_team_with(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members mine
    join public.team_members theirs on theirs.team_id = mine.team_id
    where mine.user_id = auth.uid()
      and theirs.user_id = _user_id
  );
$$;

drop policy "Signed-in users can view profiles" on public.profiles;

create policy "Users can view own and teammates profiles"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.shares_team_with(id));