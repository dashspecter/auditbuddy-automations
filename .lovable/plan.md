

# Shrink Greeting + Fix "At-Risk Employees" Badge

## Changes

### 1. Shrink DashboardGreeting (`src/components/dashboard/DashboardGreeting.tsx`)
- Change the Card from `p-6` to `p-3`
- Reduce heading from `text-2xl font-bold` to `text-base font-medium`
- Shrink icon container and icon size
- Remove `mb-2` margin
- Make the whole component feel like a compact inline bar, not a hero section

### 2. Remove "At-Risk Employees" from AttentionAlertBar (`src/components/dashboard/AttentionAlertBar.tsx`)
The "53 At-Risk Employees" badge counts employees with an overall performance score below 50 across the entire company over the last 30 days. The problem: it gives no location context, no breakdown, and no actionable next step — it's just a scary number. The workforce leaderboard already surfaces this data with proper detail.

- Remove the `atRiskEmployees` item from the `items` array (line 52)
- Remove the `usePerformanceLeaderboard` import and call (lines 8, 37-39, 45) since it was only used for this badge
- Remove the `workforce` entry from `alertConfig` and the `WorkforceScorePopup` render block
- Clean up unused imports (`Users` icon, `WorkforceScorePopup`)

## Result
- Greeting becomes a slim, compact bar — more space for operational data
- Attention bar only shows genuinely actionable alerts (Overdue Audits, Overdue Tasks, Open CAs, Overdue Maintenance)

