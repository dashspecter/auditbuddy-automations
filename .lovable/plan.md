

# Add Reward-Based Payout System for Scout Jobs

You already have a working voucher system (vouchers table, redemption flow, staff scan). The plan reuses it so scouts get auto-generated vouchers upon job approval.

## Database Changes

### 1. Add reward columns to `scout_jobs`
```sql
ALTER TABLE public.scout_jobs
  ADD COLUMN payout_type text NOT NULL DEFAULT 'cash',
  ADD COLUMN reward_description text,
  ADD COLUMN voucher_expires_at timestamptz;
```
- `payout_type`: `'cash'`, `'discount'`, `'free_product'`, or `'mixed'` (cash + reward)
- `reward_description`: free-text describing the discount % or product(s)
- `voucher_expires_at`: manager-set expiry for the auto-generated voucher

### 2. Add voucher link to `scout_payouts`
```sql
ALTER TABLE public.scout_payouts
  ADD COLUMN voucher_id uuid REFERENCES public.vouchers(id);
```

## Code Changes

### `src/pages/scouts/ScoutsJobNew.tsx`
- Add `payout_type` selector (Cash / Discount / Free Product / Mixed)
- Conditionally show:
  - Cash fields (amount + currency) when cash or mixed
  - Reward description textarea when discount, free_product, or mixed
  - Voucher expiry date picker when any reward type is selected
- Pass new fields through to the create mutation

### `src/hooks/useScoutJobs.ts`
- Update `ScoutJob` interface with new columns
- Update `useCreateScoutJob` to include `payout_type`, `reward_description`, `voucher_expires_at`

### `src/hooks/useScoutSubmissions.ts` (approval flow)
- When a job is approved and `payout_type` includes a reward (`discount`, `free_product`, `mixed`):
  1. Generate a unique voucher code (e.g. `SCOUT-XXXXXX`)
  2. Insert into `vouchers` table with the job's location, scout name, reward value/description, and expiry
  3. Link the voucher ID to the `scout_payouts` record
  4. The scout can then view/redeem this voucher via the existing voucher page

### Scout Portal (earnings page)
- Show voucher details alongside cash payouts
- Link to the voucher page (`/voucher/{code}`) for non-cash rewards

## Technical Notes
- Reuses existing `vouchers` table and redemption infrastructure (staff QR scan, voucher page)
- The voucher `value` field stores 0 for free products; `terms_text` stores the reward description
- For mixed payouts, both a cash payout record AND a voucher are created on approval

