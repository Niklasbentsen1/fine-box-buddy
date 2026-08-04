-- Kontaktoplysninger på profiler
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;

-- Overført saldo fra tidligere sæsoner
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS balance_carryover numeric NOT NULL DEFAULT 0;

-- Sæsonafslutning: nulstil alt undtagen kassens totale saldo
CREATE OR REPLACE FUNCTION public.end_season(_team_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  _balance numeric;
begin
  if auth.uid() is null then raise exception 'Ikke logget ind'; end if;
  if not public.is_team_admin(_team_id, auth.uid()) then raise exception 'Kun administratorer kan afslutte sæsonen'; end if;

  select coalesce((select sum(amount) from public.payments where team_id = _team_id and status = 'approved'), 0)
       - coalesce((select sum(amount) from public.withdrawals where team_id = _team_id), 0)
    into _balance;

  delete from public.motm_votes where match_id in (select id from public.matches where team_id = _team_id);
  delete from public.match_players where match_id in (select id from public.matches where team_id = _team_id);
  delete from public.matches where team_id = _team_id;
  delete from public.reminders where team_id = _team_id;
  delete from public.fines where team_id = _team_id;
  delete from public.payments where team_id = _team_id;
  delete from public.withdrawals where team_id = _team_id;

  update public.teams set balance_carryover = balance_carryover + _balance where id = _team_id;
end;
$$;

REVOKE ALL ON FUNCTION public.end_season(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.end_season(uuid) TO authenticated;