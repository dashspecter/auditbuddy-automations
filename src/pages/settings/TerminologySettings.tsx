import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLabels } from "@/hooks/useLabels";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Languages } from "lucide-react";
import { useTranslation } from "react-i18next";

const DEFAULT_LABELS: { key: string; defaultValue: string; description: string }[] = [
  { key: "company", defaultValue: "Company", description: "How your organization is referred to" },
  { key: "employees", defaultValue: "Employees", description: "Term for your staff members" },
  { key: "locations", defaultValue: "Locations", description: "Term for your branches/sites" },
  { key: "audits", defaultValue: "Audits", description: "Term for inspections/checks" },
  { key: "manager", defaultValue: "Manager", description: "Term for team leaders" },
  { key: "owner", defaultValue: "Owner", description: "Term for the top-level admin" },
  { key: "shifts", defaultValue: "Shifts", description: "Term for work schedules" },
  { key: "equipment", defaultValue: "Equipment", description: "Term for tools/assets" },
];

export default function TerminologySettings() {
  const { t } = useTranslation();
  const { company } = useCompanyContext();
  const { overrides } = useLabels();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const initial: Record<string, string> = {};
    overrides.forEach((o) => {
      initial[o.label_key] = o.custom_value;
    });
    setValues(initial);
  }, [overrides]);

  const handleSave = async () => {
    if (!company?.id) return;
    setIsSaving(true);
    try {
      // Upsert all values
      const upserts = DEFAULT_LABELS
        .filter((dl) => values[dl.key]?.trim())
        .map((dl) => ({
          company_id: company.id,
          label_key: dl.key,
          custom_value: values[dl.key].trim(),
        }));

      if (upserts.length > 0) {
        const { error } = await supabase
          .from("company_label_overrides" as any)
          .upsert(upserts as any, { onConflict: "company_id,label_key" });
        if (error) throw error;
      }

      // Delete cleared values
      const clearedKeys = DEFAULT_LABELS
        .filter((dl) => !values[dl.key]?.trim())
        .map((dl) => dl.key);

      if (clearedKeys.length > 0) {
        const { error } = await supabase
          .from("company_label_overrides" as any)
          .delete()
          .eq("company_id", company.id)
          .in("label_key", clearedKeys);
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ["company_label_overrides"] });
      toast.success("Terminology saved successfully");
    } catch (error: any) {
      console.error("Error saving terminology:", error);
      toast.error(error?.message || "Failed to save terminology");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Terminology Settings</h1>
        <p className="text-muted-foreground">
          Customize the labels used throughout the platform to match your organization's language.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Languages className="h-5 w-5 text-primary" />
            <CardTitle>Custom Labels</CardTitle>
          </div>
          <CardDescription>
            Override default terms. Leave blank to use the default value.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {DEFAULT_LABELS.map((dl) => (
              <div key={dl.key} className="space-y-1.5">
                <Label htmlFor={`label-${dl.key}`} className="text-sm font-medium">
                  {dl.description}
                </Label>
                <Input
                  id={`label-${dl.key}`}
                  placeholder={dl.defaultValue}
                  value={values[dl.key] || ""}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [dl.key]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="mt-6">
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
