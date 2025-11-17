import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Clock } from "lucide-react";

const audits = [
  {
    id: 1,
    location: "LBFC Amzei",
    checker: "Vlad",
    date: "2025-10-27",
    status: "compliant",
    score: 87,
  },
  {
    id: 2,
    location: "LBFC Mosilor",
    checker: "Bogdan",
    date: "2025-10-26",
    status: "non-compliant",
    score: 65,
  },
  {
    id: 3,
    location: "LBFC Timpuri Noi",
    checker: "Serdar",
    date: "2025-10-26",
    status: "pending",
    score: null,
  },
  {
    id: 4,
    location: "LBFC Apaca",
    checker: "Iulian",
    date: "2025-10-25",
    status: "compliant",
    score: 92,
  },
];

export const RecentAudits = () => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Recent Audits</h3>
      <div className="space-y-4">
        {audits.map((audit) => (
          <div
            key={audit.id}
            className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
          >
            <div className="space-y-1">
              <p className="font-medium text-foreground">{audit.location}</p>
              <p className="text-sm text-muted-foreground">
                Checked by {audit.checker} • {audit.date}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {audit.score !== null && (
                <span className="text-lg font-bold text-foreground">
                  {audit.score}%
                </span>
              )}
              {audit.status === "compliant" && (
                <Badge className="bg-success text-success-foreground gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Compliant
                </Badge>
              )}
              {audit.status === "non-compliant" && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Issues Found
                </Badge>
              )}
              {audit.status === "pending" && (
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" />
                  Pending
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
