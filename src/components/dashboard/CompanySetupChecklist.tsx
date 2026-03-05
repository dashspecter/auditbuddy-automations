import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLocations } from "@/hooks/useLocations";
import { useEmployees } from "@/hooks/useEmployees";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Check, Circle, Rocket, X, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

const DISMISS_KEY = "dashspect_setup_checklist_dismissed";

export const CompanySetupChecklist = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { company } = useCompanyContext();
  const { data: roleData } = useUserRoles();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "true";
    } catch {
      return false;
    }
  });

  // Only show for company_owner or company_admin
  const companyRole = roleData?.companyRole;
  const isOwnerOrAdmin = companyRole === "company_owner" || companyRole === "company_admin";

  // Step 1: Locations
  const { data: locations, isLoading: locationsLoading } = useLocations();

  // Step 2: Company users count
  const { data: companyUsersCount, isLoading: usersLoading } = useQuery({
    queryKey: ["company_users_count", company?.id],
    queryFn: async () => {
      if (!company?.id) return 0;
      const { count, error } = await supabase
        .from("company_users")
        .select("*", { count: "exact", head: true })
        .eq("company_id", company.id);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!company?.id && isOwnerOrAdmin && !dismissed,
  });

  // Step 3: Employees
  const { data: employees, isLoading: employeesLoading } = useEmployees();

  // Step 4: Audit templates count
  const { data: templatesCount, isLoading: templatesLoading } = useQuery({
    queryKey: ["audit_templates_count", company?.id],
    queryFn: async () => {
      if (!company?.id) return 0;
      const { count, error } = await supabase
        .from("audit_templates")
        .select("*", { count: "exact", head: true })
        .eq("company_id", company.id);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!company?.id && isOwnerOrAdmin && !dismissed,
  });

  // Step 5: Completed audits
  const { data: completedAuditsCount, isLoading: auditsLoading } = useQuery({
    queryKey: ["completed_audits_count", company?.id],
    queryFn: async () => {
      if (!company?.id) return 0;
      const { count, error } = await supabase
        .from("location_audits")
        .select("*", { count: "exact", head: true })
        .eq("company_id", company.id)
        .eq("status", "completed");
      if (error) throw error;
      return count || 0;
    },
    enabled: !!company?.id && isOwnerOrAdmin && !dismissed,
  });

  if (!isOwnerOrAdmin || dismissed) return null;

  const isLoading = locationsLoading || usersLoading || employeesLoading || templatesLoading || auditsLoading;

  if (isLoading) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-2 w-full mb-4" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full mb-2" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const steps = [
    {
      title: "Create your first location",
      description: "Add a location to start auditing",
      completed: (locations?.length || 0) > 0,
      path: "/admin/locations",
      actionLabel: "Add",
    },
    {
      title: "Invite team members",
      description: "Add users in Company Settings",
      completed: (companyUsersCount || 0) > 1,
      path: "/settings/company",
      actionLabel: "Invite",
    },
    {
      title: "Add your staff / employees",
      description: "Register employees at your locations",
      completed: (employees?.length || 0) > 0,
      path: "/workforce/staff",
      actionLabel: "Add",
    },
    {
      title: "Create an audit template",
      description: "Set up your first inspection checklist",
      completed: (templatesCount || 0) > 0,
      path: "/admin/templates",
      actionLabel: "Create",
    },
    {
      title: "Run your first audit",
      description: "Start an audit at one of your locations",
      completed: (completedAuditsCount || 0) > 0,
      path: "/audits",
      actionLabel: "Go",
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progress = Math.round((completedCount / steps.length) * 100);

  // All done — auto-hide
  if (completedCount === steps.length) return null;

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "true");
    } catch {}
    setDismissed(true);
  };

  return (
    <Card className="border-primary/20 bg-primary/5 relative">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            <div>
              <h3 className="text-base font-semibold text-foreground">Set Up Your Company</h3>
              <p className="text-xs text-muted-foreground">
                Complete these steps to get started
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {completedCount}/{steps.length}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleDismiss}
              aria-label="Dismiss setup checklist"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Progress value={progress} className="h-2 mt-2" />
      </CardHeader>
      <CardContent className="pt-0 space-y-1">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`flex items-center gap-3 rounded-md p-2.5 transition-colors ${
              step.completed
                ? "opacity-60"
                : "hover:bg-primary/5"
            }`}
          >
            <div className="flex-shrink-0">
              {step.completed ? (
                <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <Check className="h-3.5 w-3.5 text-primary" />
                </div>
              ) : (
                <div className="h-6 w-6 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center">
                  <span className="text-xs font-medium text-muted-foreground">{index + 1}</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${step.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                {step.title}
              </p>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
            {!step.completed && (
              <Button
                variant="outline"
                size="sm"
                className="flex-shrink-0 h-7 text-xs gap-1"
                onClick={() => navigate(step.path)}
              >
                {step.actionLabel}
                <ArrowRight className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
