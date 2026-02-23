import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";
import type { MonthlyScoreRow } from "@/hooks/useMonthlyScores";
import { format, parseISO } from "date-fns";

interface ScoreHistoryChartProps {
  history: MonthlyScoreRow[];
  currentScore: number | null;
}

export function ScoreHistoryChart({ history, currentScore }: ScoreHistoryChartProps) {
  const chartData = useMemo(() => {
    // history is newest-first; reverse for chart
    const reversed = [...history].reverse();
    const data = reversed.map((h) => ({
      month: format(parseISO(h.month), "MMM"),
      score: h.effective_score !== null ? Number(h.effective_score) : null,
    }));

    // Add current month
    data.push({
      month: format(new Date(), "MMM"),
      score: currentScore !== null ? Number(currentScore) : null,
    });

    return data.filter((d) => d.score !== null);
  }, [history, currentScore]);

  if (chartData.length < 2) {
    return null; // Need at least 2 points for a line
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="h-5 w-5 text-primary" />
        <span className="font-semibold text-sm">Score History</span>
      </div>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip
              formatter={(value: number) => [`${value.toFixed(1)}`, "Score"]}
              contentStyle={{ borderRadius: 8, fontSize: 12 }}
            />
            <ReferenceLine y={80} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" strokeOpacity={0.4} />
            <Line
              type="monotone"
              dataKey="score"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "hsl(var(--primary))" }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
