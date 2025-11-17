import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const data = [
  { name: "Week 1", compliant: 85, nonCompliant: 15 },
  { name: "Week 2", compliant: 78, nonCompliant: 22 },
  { name: "Week 3", compliant: 92, nonCompliant: 8 },
  { name: "Week 4", compliant: 87, nonCompliant: 13 },
];

export const ComplianceChart = () => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Compliance Trends</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="name" 
            className="text-xs"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis 
            className="text-xs"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.5rem",
            }}
          />
          <Legend />
          <Bar 
            dataKey="compliant" 
            fill="hsl(var(--success))" 
            name="Compliant" 
            radius={[8, 8, 0, 0]}
          />
          <Bar 
            dataKey="nonCompliant" 
            fill="hsl(var(--destructive))" 
            name="Non-Compliant" 
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};
