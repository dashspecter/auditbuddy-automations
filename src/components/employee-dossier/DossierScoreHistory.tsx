import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";
import type { MonthlyScoreRow } from "@/hooks/useMonthlyScores";
import { format, parseISO } from "date-fns";

interface Props {
  history: MonthlyScoreRow[];
  currentScore: number | null;
}

export function DossierScoreHistory({ history, currentScore }: Props) {
  const chartData = useMemo(() => {
    const reversed = [...history].reverse();
    const data = reversed.map((h) => ({
      month: format(parseISO(h.month), "MMM yy"),
      score: h.effective_score !== null ? Number(h.effective_score) : null,
    }));

    data.push({
      month: format(new Date(), "MMM yy"),
      score: currentScore !== null ? Number(currentScore) : null,
    });

    return data.filter((d) => d.score !== null);
  }, [history, currentScore]);

  if (chartData.length < 2) {
    return null;
  }

  // Calculate trend
  const first = chartData[0]?.score ?? 0;
  const last = chartData[chartData.length - 1]?.score ?? 0;
  const diff = last - first;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-5 w-5 text-primary" />
          Score History
          {diff !== 0 && (
            <span className={`text-xs font-medium ml-auto ${diff > 0 ? "text-green-600" : "text-red-600"}`}>
              {diff > 0 ? "+" : ""}{diff.toFixed(1)} overall
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48">
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
      </CardContent>
    </Card>
  );
}
