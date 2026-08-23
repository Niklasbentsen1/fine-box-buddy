GRANT SELECT (id, club_id, name, created_at, mobilepay_number, balance_carryover, mobilepay_box_code) ON public.teams TO authenticated;
GRANT SELECT (id, name, created_by, created_at, logo_url) ON public.clubs TO authenticated;
GRANT ALL ON public.teams TO service_role;
GRANT ALL ON public.clubs TO service_role;