

# Fix: Dash Still Can't Answer Attendance Questions — Deployment Issue

## Root Cause

The code for `get_attendance_summary` is correct in the repository — the tool is defined in `tools.ts`, implemented in `workforce.ts`, routed in `index.ts`, and registered in `registry.ts`. However, the **edge function running in production is stale**. The edge function logs show the last invocation at 10:28 with no attendance-related tool calls, confirming the deployed version predates the attendance summary changes.

## Fix

**Redeploy the `dash-command` edge function.** No code changes needed — the implementation is complete and correct. The function just needs to be pushed to the live environment.

This is a single deployment action, not a code fix.

## Validation After Deploy

1. Ask Dash: "who is working today at LBFC Amzei?" → should return checked-in employees
2. Ask Dash: "how many employees checked in today?" → should return attendance summary
3. Ask Dash: "attendance exceptions today" → should still return only late/missing checkout

