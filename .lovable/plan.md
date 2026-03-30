

# Why Vacation Days Don't Show in Shift Scheduling

## Investigation Findings

**The database data is correct:**
- Razvan Parvan has an approved time-off request (ID: `8d94a27e`) with specific dates: Mar 23, 24, 27, 28, 31, Apr 1
- Two dates fall within the displayed week (Mar 30 – Apr 5): **Mar 31 (Tue)** and **Apr 1 (Wed)**

**The code logic is correct:**
- `useTimeOffRequests` uses proper overlap logic to fetch requests touching the displayed week
- `isDateInTimeOffRequest` checks the `time_off_request_dates` child table first, with range fallback
- `getTimeOffForLocationAndDay` correctly includes employees by profile location AND shift assignments
- The Time Off row renders correctly when data is present (line 1481)

**The problem:** The network logs show **zero** `time_off_requests` queries were made. This means the latest code changes (overlap logic fix, `time_off_request_dates` join) haven't been deployed to the preview yet. The user is still running the old code.

## Fix

No code changes needed — the logic is already correct. The fix is to ensure the latest build deploys. However, to be safe and provide immediate feedback, I'll add a small defensive improvement:

1. **Add `console.log` temporarily** in `getTimeOffForLocationAndDay` to confirm data flow when debugging (remove after verification)
2. **Verify the build deploys** by checking the preview after this message

If the build IS deployed and the issue persists, there could be a PostgREST caching issue with the new `time_off_request_dates` join. In that case, the fix would be to add an explicit separate query for `time_off_request_dates` instead of relying on the embedded select.

## Recommended Action

Refresh the preview page (Cmd+Shift+R) after this message to pick up the latest build. If the Time Off row still doesn't appear, I'll switch to a separate query approach for the date data.

