
Goal: restore kiosk availability for Fresh Brunch immediately, with zero-risk behavior matching pre-change production.

What I found
- The failing token in your screenshot (`lbfc-amzei`) exists, is active, and resolves correctly at database level.
- The failure message is `No active kiosk found`, which means the client got an empty result (not a hard RPC error).
- You confirmed:
  - issue is on Published URL (live),
  - regular browser mode,
  - all Fresh Brunch kiosks failing.
- This strongly indicates a compatibility mismatch in live between kiosk client behavior and the tightened kiosk RLS path (anonymous reads/writes no longer matching the path currently used by live clients).

Root cause hypothesis (high confidence)
- Live kiosk clients are effectively running the pre-RPC access path (or equivalent behavior), while public kiosk policies were tightened.
- Result: anonymous kiosk loads return empty rows, so all kiosk links show “Invalid Kiosk”.

Implementation plan (safe rollback-first)
1) Immediate recovery migration (no UI risk)
- Reintroduce the anonymous kiosk compatibility policies on `attendance_kiosks` so kiosk links behave exactly like before:
  - anon SELECT for active kiosks
  - anon UPDATE for `last_active_at` heartbeat
- Keep existing company-scoped authenticated policies intact.
- Do not touch management query filtering (keep Part 1 company filter in `useAttendanceKiosks`).

2) Preserve compatibility for both old and new kiosk clients
- Keep `get_kiosk_by_token_or_slug` and `update_kiosk_last_active` functions in place (no removal).
- This allows:
  - older live clients to work via table policies,
  - newer clients to work via RPC.
- This avoids any forced cache/version dependency during outage recovery.

3) Verify in live (published) before any further hardening
- Test 3 Fresh Brunch kiosk URLs (including `lbfc-amzei`) in clean browser sessions.
- Confirm kiosk page loads header/location, dashboard tiles, and keep-alive updates.
- Confirm no “Invalid Kiosk” state appears.

4) Regression checks (must-pass)
- Proper Pizza “Manage Attendance Kiosks” still shows only their kiosks (expected empty if none).
- Fresh Brunch “Manage Attendance Kiosks” still shows only Fresh Brunch kiosks.
- Department-scoped kiosks still show department-filtered dashboard content.

5) Stabilization follow-up (after service restored)
- Once live is stable, we can re-harden safely with a staged rollout:
  - publish guaranteed-RPC kiosk client first,
  - then restrict/remove anon table policies in a second release.
- This avoids breaking active kiosk devices during deploy/version drift.

Technical details (exact DB intent)
- Recreate policies equivalent to pre-change kiosk behavior for `TO anon`:
  - SELECT using `is_active = true`
  - UPDATE with constrained check for active rows used by heartbeat
- Leave these unchanged:
  - authenticated company-scoped SELECT policy
  - manager/admin company-scoped management policy
- No schema/table shape changes.
- No auth flow changes.
- No route changes.

Risk profile
- Availability risk: very low (this is a compatibility rollback).
- Security risk: returns to prior kiosk-public behavior only for active kiosk rows; authenticated company isolation for management remains protected by the explicit company filter in app logic plus scoped policies.
- Operational risk: minimal, migration-only hotfix.

Execution order I will follow once you confirm
1. Apply rollback compatibility migration.
2. Validate published kiosk URLs end-to-end.
3. Validate management pages for Fresh Brunch + Proper Pizza.
4. Report pass/fail matrix before proposing any further hardening.
