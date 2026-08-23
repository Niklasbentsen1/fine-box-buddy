ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS mobilepay_box_code text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS method text;