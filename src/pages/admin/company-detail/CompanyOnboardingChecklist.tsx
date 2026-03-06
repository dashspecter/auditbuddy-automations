import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle } from "lucide-react";
import { CompanyOverview } from "./useCompanyOverview";

interface Props {
  overview: CompanyOverview;
}

export function CompanyOnboardingChecklist({ overview }: Props) {
  const steps = [
    { label: "Created account", done: true },
    { label: "Added at least one location", done: overview.locations_count > 0 },
    { label: "Added employees", done: overview.employees_count > 0 },
    { label: "Set up departments", done: overview.departments_count > 0 },
    { label: "Created an audit template", done: overview.audit_templates_count > 0 },
    { label: "Completed first audit", done: overview.audits_count > 0 },
    { label: "Created tasks", done: overview.tasks_total > 0 },
    { label: "Set up shifts", done: overview.shifts_count > 0 },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const pct = Math.round((completedCount / steps.length) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>Onboarding Progress</span>
          <span className="text-sm font-normal text-muted-foreground">
            {completedCount}/{steps.length} ({pct}%)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full bg-muted rounded-full h-2 mb-4">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {steps.map((step) => (
            <div key={step.label} className="flex items-center gap-2 text-sm">
              {step.done ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span className={step.done ? "" : "text-muted-foreground"}>{step.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
