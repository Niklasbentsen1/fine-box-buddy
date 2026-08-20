-- 1) Egen tilknytningskode pr. hold
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS invite_code text;

DO $$
DECLARE r record; c text;
BEGIN
  FOR r IN SELECT id FROM public.teams WHERE invite_code IS NULL LOOP
    LOOP
      c := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.teams WHERE invite_code = c)
            AND NOT EXISTS (SELECT 1 FROM public.clubs WHERE invite_code = c);
    END LOOP;
    UPDATE public.teams SET invite_code = c WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.teams ALTER COLUMN invite_code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS teams_invite_code_key ON public.teams (invite_code);

CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c text;
BEGIN
  LOOP
    c := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.teams WHERE invite_code = c)
          AND NOT EXISTS (SELECT 1 FROM public.clubs WHERE invite_code = c);
  END LOOP;
  RETURN c;
END $$;
REVOKE ALL ON FUNCTION public.generate_invite_code() FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_team_invite_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF new.invite_code IS NULL THEN
    new.invite_code := public.generate_invite_code();
  END IF;
  RETURN new;
END $$;
REVOKE ALL ON FUNCTION public.set_team_invite_code() FROM public, anon, authenticated;
DROP TRIGGER IF EXISTS teams_set_invite_code ON public.teams;
CREATE TRIGGER teams_set_invite_code BEFORE INSERT ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.set_team_invite_code();

-- Holdkoden må kun læses af administratorer
REVOKE SELECT ON public.teams FROM authenticated, anon;
GRANT SELECT (id, club_id, name, mobilepay_number, balance_carryover, created_at) ON public.teams TO authenticated;

CREATE OR REPLACE FUNCTION public.get_team_invite_code(_team_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select t.invite_code
  from public.teams t
  where t.id = _team_id
    and exists (
      select 1 from public.team_members tm
      where tm.team_id = t.id and tm.user_id = auth.uid()
        and tm.role = 'admin' and tm.status = 'active'
    );
$$;
REVOKE ALL ON FUNCTION public.get_team_invite_code(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_team_invite_code(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.join_club_by_code(_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare
  _team public.teams%rowtype;
  _existing public.member_status;
  _name text;
begin
  if auth.uid() is null then raise exception 'Ikke logget ind'; end if;

  select * into _team from public.teams where invite_code = upper(trim(_code));
  if not found then
    select t.* into _team
    from public.teams t
    join public.clubs c on c.id = t.club_id
    where c.invite_code = upper(trim(_code))
    order by t.created_at asc
    limit 1;
  end if;
  if not found then raise exception 'Koden findes ikke'; end if;

  select tm.status into _existing
  from public.team_members tm
  where tm.team_id = _team.id and tm.user_id = auth.uid()
  limit 1;
  if _existing = 'active' then raise exception 'Du er allerede medlem af dette hold'; end if;
  if _existing = 'pending' then raise exception 'Din anmodning afventer allerede godkendelse'; end if;

  insert into public.team_members (team_id, user_id, role, status)
  values (_team.id, auth.uid(), 'member', 'pending');

  select display_name into _name from public.profiles where id = auth.uid();
  insert into public.notifications (team_id, user_id, title, body, link)
  select _team.id, tm.user_id,
         'Ny anmodning til ' || _team.name,
         coalesce(nullif(trim(_name), ''), 'En spiller') ||
           ' har anmodet om at blive medlem af holdet og afventer godkendelse af en administrator.',
         '/hold'
  from public.team_members tm
  where tm.team_id = _team.id and tm.role = 'admin' and tm.status = 'active';

  return _team.club_id;
end $$;
REVOKE ALL ON FUNCTION public.join_club_by_code(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.join_club_by_code(text) TO authenticated;

-- 2) Klubbillede
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS logo_url text;
GRANT SELECT (id, name, created_by, created_at, logo_url) ON public.clubs TO authenticated;

CREATE OR REPLACE FUNCTION public.set_club_logo(_club_id uuid, _logo_url text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  if auth.uid() is null then raise exception 'Ikke logget ind'; end if;
  if not exists (
    select 1 from public.team_members tm
    join public.teams t on t.id = tm.team_id
    where t.club_id = _club_id and tm.user_id = auth.uid()
      and tm.role = 'admin' and tm.status = 'active'
  ) then raise exception 'Kun administratorer kan ændre klubbens billede'; end if;

  update public.clubs set logo_url = _logo_url where id = _club_id;
end $$;
REVOKE ALL ON FUNCTION public.set_club_logo(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_club_logo(uuid, text) TO authenticated;