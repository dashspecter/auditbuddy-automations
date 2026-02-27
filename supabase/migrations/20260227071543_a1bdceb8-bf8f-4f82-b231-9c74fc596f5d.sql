
ALTER TABLE public.scout_jobs
  ADD COLUMN payout_type text NOT NULL DEFAULT 'cash',
  ADD COLUMN reward_description text,
  ADD COLUMN voucher_expires_at timestamptz;

ALTER TABLE public.scout_payouts
  ADD COLUMN voucher_id uuid REFERENCES public.vouchers(id);
