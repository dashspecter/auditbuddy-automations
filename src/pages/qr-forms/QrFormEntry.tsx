import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { QrCode, Save, Send, Plus, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

// Local storage draft key
const getDraftKey = (token: string, year?: number, month?: number) =>
  `qr-form-draft-${token}-${year || "new"}-${month || "new"}`;

export default function QrFormEntry() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // For monthly grid - locked to current month
  const today = new Date();
  const selectedYear = today.getFullYear();
  const selectedMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  // Form data
  const [gridData, setGridData] = useState<Record<string, any>>({});
  const [rowsData, setRowsData] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  // Check auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setAuthChecked(true);
    }).catch(() => {
      setAuthChecked(true);
    });
  }, []);

  // Resolve token -> location_form_template
  const { data: assignment, isLoading: assignmentLoading, error: assignmentError } = useQuery({
    queryKey: ["qr-form-resolve", token],
    queryFn: async () => {
      // Step 1: Resolve the token to the assignment
      const { data: lft, error: lftErr } = await supabase
        .from("location_form_templates")
        .select(`
          *,
          form_templates(name, category, type),
          locations!location_form_templates_location_id_fkey(name)
        `)
        .eq("public_token", token!)
        .eq("is_active", true)
        .maybeSingle();
      if (lftErr) throw lftErr;
      if (!lft) return null;

      // Step 2: Fetch the specific version separately to avoid join ambiguity
      const { data: ver, error: verErr } = await supabase
        .from("form_template_versions")
        .select("id, version, schema")
        .eq("id", lft.template_version_id)
        .maybeSingle();
      if (verErr) throw verErr;
      if (!ver) throw new Error("Template version not found. It may have been removed.");

      return { ...lft, form_template_versions: ver };
    },
    enabled: !!token && !!user,
    retry: false,
  });

  // Check for existing submission (monthly grid)
  const { data: existingSubmission } = useQuery({
    queryKey: ["form-submission-existing", assignment?.id, selectedYear, selectedMonth],
    queryFn: async () => {
      if (!assignment || assignment.form_templates?.type !== "monthly_grid") return null;
      const { data, error } = await supabase
        .from("form_submissions")
        .select("*")
        .eq("location_form_template_id", assignment.id)
        .eq("period_year", selectedYear)
        .eq("period_month", selectedMonth)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!assignment && assignment.form_templates?.type === "monthly_grid",
  });

  // Load existing data or draft
  useEffect(() => {
    if (existingSubmission) {
      const data = existingSubmission.data as any;
      if (data?.grid) setGridData(data.grid);
      if (data?.rows) setRowsData(data.rows);
    } else if (token) {
      // Try localStorage draft
      const draftKey = getDraftKey(token, selectedYear, selectedMonth);
      const draft = localStorage.getItem(draftKey);
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          if (parsed.grid) setGridData(parsed.grid);
          if (parsed.rows) setRowsData(parsed.rows);
        } catch {}
      }
    }
  }, [existingSubmission, token, selectedYear, selectedMonth]);

  // Auto-save draft to localStorage
  const saveDraft = useCallback(() => {
    if (!token) return;
    const draftKey = getDraftKey(token, selectedYear, selectedMonth);
    const draftData = assignment?.form_templates?.type === "monthly_grid"
      ? { grid: gridData }
      : { rows: rowsData };
    localStorage.setItem(draftKey, JSON.stringify(draftData));
  }, [token, selectedYear, selectedMonth, gridData, rowsData, assignment]);

  useEffect(() => {
    const timer = setInterval(saveDraft, 5000);
    return () => clearInterval(timer);
  }, [saveDraft]);

  // Save / Submit mutation
  const submitMutation = useMutation({
    mutationFn: async (finalSubmit: boolean) => {
      if (!user || !assignment) throw new Error("Not ready");
      setSaving(true);

      const formData = assignment.form_templates?.type === "monthly_grid"
        ? { grid: gridData }
        : { rows: rowsData };

      const payload = {
        company_id: assignment.company_id,
        location_id: assignment.location_id,
        location_form_template_id: assignment.id,
        template_id: assignment.template_id,
        template_version_id: assignment.template_version_id,
        period_year: assignment.form_templates?.type === "monthly_grid" ? selectedYear : null,
        period_month: assignment.form_templates?.type === "monthly_grid" ? selectedMonth : null,
        status: finalSubmit ? "submitted" : "draft",
        submitted_by: user.id,
        submitted_at: finalSubmit ? new Date().toISOString() : null,
        data: formData,
      };

      if (existingSubmission && (existingSubmission.status === "draft" || existingSubmission.status === "submitted")) {
        // Deep-merge grid data: preserve previously saved checkpoint data from other users/sessions
        let mergedData = formData;
        if (assignment.form_templates?.type === "monthly_grid") {
          const existingGrid = (existingSubmission.data as any)?.grid || {};
          const mergedGrid: Record<string, any> = {};
          // Merge all days from existing data first
          const allDays = new Set([
            ...Object.keys(existingGrid),
            ...Object.keys(gridData),
          ]);
          allDays.forEach((day) => {
            const existingDay = existingGrid[day] || {};
            const newDay = gridData[day] || {};
            const allTimes = new Set([
              ...Object.keys(existingDay),
              ...Object.keys(newDay),
            ]);
            mergedGrid[day] = {};
            allTimes.forEach((time) => {
              mergedGrid[day][time] = {
                ...(existingDay[time] || {}),
                ...(newDay[time] || {}),
              };
            });
          });
          mergedData = { grid: mergedGrid };
        }

        // Update existing submission with merged data
        const { error } = await supabase
          .from("form_submissions")
          .update({
            data: mergedData as any,
            status: finalSubmit ? "submitted" : "draft",
            submitted_at: finalSubmit ? new Date().toISOString() : null,
          })
          .eq("id", existingSubmission.id);
        if (error) throw error;

        // Audit entry
        await supabase.from("form_submission_audit").insert({
          submission_id: existingSubmission.id,
          action: finalSubmit ? "final_submit" : "update_cell",
          new_value: mergedData as any,
          actor_id: user.id,
        });
      } else {
        // Insert new submission
        const { data: newSub, error } = await supabase
          .from("form_submissions")
          .insert(payload as any)
          .select()
          .single();
        if (error) throw error;

        // Audit entry
        await supabase.from("form_submission_audit").insert({
          submission_id: newSub.id,
          action: "create",
          new_value: formData as any,
          actor_id: user.id,
        });
      }

      // Clear draft
      if (finalSubmit && token) {
        localStorage.removeItem(getDraftKey(token, selectedYear, selectedMonth));
      }
    },
    onSuccess: (_, finalSubmit) => {
      setSaving(false);
      queryClient.invalidateQueries({ queryKey: ["form-submission-existing"] });
      toast.success(finalSubmit ? "Form submitted successfully!" : "Draft saved");
    },
    onError: (err: any) => {
      setSaving(false);
      toast.error(err.message);
    },
  });

  // Update a grid cell
  const updateGridCell = (day: number, time: string, fieldKey: string, value: any) => {
    setGridData((prev) => ({
      ...prev,
      [day]: {
        ...(prev[day] || {}),
        [time]: {
          ...(prev[day]?.[time] || {}),
          [fieldKey]: value,
        },
      },
    }));
  };

  // Add event log row
  const addRow = () => {
    setRowsData((prev) => [...prev, {}]);
  };

  const updateRow = (idx: number, key: string, value: any) => {
    setRowsData((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [key]: value };
      return updated;
    });
  };

  const removeRow = (idx: number) => {
    setRowsData((prev) => prev.filter((_, i) => i !== idx));
  };

  // --- AUTH CHECK ---
  if (!authChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-8 space-y-4">
            <QrCode className="h-12 w-12 text-primary" />
            <h2 className="text-xl font-bold">Sign In Required</h2>
            <p className="text-muted-foreground text-center text-sm">
              You need to sign in to submit this form.
            </p>
            <Button
              className="w-full"
              onClick={() => navigate(`/auth?redirect=/qr/forms/${token}`)}
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (assignmentLoading && !assignmentError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <p className="text-sm text-muted-foreground">Loading form...</p>
      </div>
    );
  }

  if (assignmentError || !assignment) {
    const errMsg = assignmentError instanceof Error ? assignmentError.message : "";
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-8 space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <h2 className="text-xl font-bold">Form Not Found</h2>
            <p className="text-muted-foreground text-center text-sm">
              This QR code is invalid or the form has not been assigned to a location yet.
            </p>
            {errMsg && (
              <p className="text-xs text-muted-foreground/70 text-center">
                Details: {errMsg}
              </p>
            )}
            <Button variant="outline" onClick={() => navigate(-1)}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const schema = assignment.form_template_versions?.schema as any;
  const isMonthlyGrid = assignment.form_templates?.type === "monthly_grid";
  const isLocked = existingSubmission?.status === "locked";
  const isSubmitted = existingSubmission?.status === "submitted";
  const overrides = assignment.overrides as any || {};

  // Merge overrides into schema
  const checkpoints = overrides.checkpointTimes
    ? overrides.checkpointTimes.map((t: string) => ({ time: t, label: t }))
    : schema?.gridConfig?.checkpoints || [];
  const cellFields = schema?.gridConfig?.cellFields || [];
  const columns = schema?.columns || [];
  const maxRows = schema?.maxRows || 12;
  const recommendedRange = overrides.recommendedRange || schema?.recommendedRange;

    return (
    <div className="container mx-auto py-4 px-2 sm:px-3 max-w-4xl space-y-3">
      {/* Header */}
      <Card>
        <CardContent className="py-3 px-3">
          <h1 className="text-base sm:text-lg font-bold leading-tight">{assignment.form_templates?.name}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {(assignment as any).locations?.name}
          </p>
          <p className="text-xs text-muted-foreground mt-1 font-medium">
            {today.toLocaleDateString("default", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {recommendedRange && (
              <Badge variant="outline" className="text-[10px]">
                Range: {recommendedRange.min}–{recommendedRange.max}{recommendedRange.unit}
              </Badge>
            )}
            {existingSubmission && (
              <Badge variant={isLocked ? "secondary" : "outline"} className="text-[10px]">
                {existingSubmission.status}
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px]">
              v{assignment.form_template_versions?.version}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Grid */}
      {isMonthlyGrid && (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 sticky left-0 bg-background z-10">Day</TableHead>
                  {checkpoints.map((cp: any) =>
                    cellFields.map((f: any) => (
                      <TableHead key={`${cp.time}-${f.key}`} className="text-center min-w-[80px]">
                        <div className="text-xs">{cp.label}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {f.label}{f.unit ? ` (${f.unit})` : ""}
                        </div>
                      </TableHead>
                    ))
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                  // Check if day is valid for selected month
                  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
                  if (day > daysInMonth) return null;

                  const isToday = day === todayDay;
                  return (
                    <TableRow key={day} className={isToday ? "bg-primary/10 ring-1 ring-primary/30 ring-inset" : ""}>
                      <TableCell className={`font-medium sticky left-0 z-10 ${isToday ? "bg-primary/10 text-primary font-bold text-base" : "bg-background"}`}>
                        {day}{isToday ? " ←" : ""}
                      </TableCell>
                      {checkpoints.map((cp: any) =>
                        cellFields.map((f: any) => {
                          const val = gridData[day]?.[cp.time]?.[f.key] ?? "";
                          const isTemp = f.type === "number" && f.unit === "°C";
                          const outOfRange =
                            isTemp &&
                            val !== "" &&
                            recommendedRange &&
                            (Number(val) < recommendedRange.min || Number(val) > recommendedRange.max);

                          const isDayDisabled = isLocked || day !== todayDay;

                          return (
                            <TableCell key={`${day}-${cp.time}-${f.key}`} className="p-1">
                              <Input
                                type={f.type === "number" ? "number" : "text"}
                                value={val}
                                onChange={(e) =>
                                  updateGridCell(day, cp.time, f.key, e.target.value)
                                }
                                disabled={isDayDisabled}
                                className={`h-8 text-center text-xs sm:text-sm w-[60px] sm:w-[80px] ${
                                  outOfRange ? "border-destructive bg-destructive/5" : ""
                                } ${isDayDisabled && day !== todayDay ? "opacity-40" : ""}`}
                                placeholder={f.type === "number" ? "0" : "-"}
                              />
                            </TableCell>
                          );
                        })
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Event Log */}
      {!isMonthlyGrid && (
        <div className="space-y-3">
          {rowsData.map((row, idx) => (
            <Card key={idx} className="p-3">
              <div className="flex items-start gap-2">
                <span className="text-sm font-medium text-muted-foreground mt-2 w-6">
                  {idx + 1}
                </span>
                <div className="flex-1 grid gap-2 grid-cols-1 sm:grid-cols-2">
                  {columns.map((col: any) => (
                    <div key={col.key}>
                      <Label className="text-xs">{col.label}{col.unit ? ` (${col.unit})` : ""}</Label>
                      {col.type === "select" ? (
                        <Select
                          value={row[col.key] || ""}
                          onValueChange={(v) => updateRow(idx, col.key, v)}
                          disabled={isLocked}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {(col.options || []).map((opt: string) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : col.type === "textarea" ? (
                        <Textarea
                          value={row[col.key] || ""}
                          onChange={(e) => updateRow(idx, col.key, e.target.value)}
                          disabled={isLocked}
                          className="h-16"
                        />
                      ) : (
                        <Input
                          type={
                            col.type === "number"
                              ? "number"
                              : col.type === "date"
                              ? "date"
                              : col.type === "time"
                              ? "time"
                              : col.type === "datetime"
                              ? "datetime-local"
                              : "text"
                          }
                          value={row[col.key] || ""}
                          onChange={(e) => updateRow(idx, col.key, e.target.value)}
                          disabled={isLocked}
                          className="h-8"
                        />
                      )}
                    </div>
                  ))}
                </div>
                {!isLocked && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mt-6"
                    onClick={() => removeRow(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </Card>
          ))}

          {!isLocked && rowsData.length < maxRows && (
            <Button variant="outline" className="w-full" onClick={addRow}>
              <Plus className="h-4 w-4 mr-2" /> Add Entry ({rowsData.length}/{maxRows})
            </Button>
          )}
        </div>
      )}

      {/* Compliance Notes */}
      {schema?.complianceNotes?.length > 0 && (
        <Card>
          <CardContent className="py-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Compliance Notes:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              {schema.complianceNotes.map((note: string, idx: number) => (
                <li key={idx} className="flex items-start gap-1">
                  <span>•</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {!isLocked && (
        <div className="flex gap-2 sm:gap-3 sticky bottom-0 bg-background py-3 px-1 border-t z-20">
          {!isSubmitted && (
            <Button
              variant="outline"
              className="flex-1 h-11 text-sm"
              onClick={() => submitMutation.mutate(false)}
              disabled={saving}
            >
              <Save className="h-4 w-4 mr-1.5" />
              Save Draft
            </Button>
          )}
          <Button
            className="flex-1 h-11 text-sm"
            onClick={() => {
              const msg = isSubmitted
                ? "Update this form with your new entries?"
                : "Submit this form? It cannot be edited after submission.";
              if (confirm(msg)) {
                submitMutation.mutate(true);
              }
            }}
            disabled={saving}
          >
            <Send className="h-4 w-4 mr-1.5" />
            {isSubmitted ? "Update & Submit" : "Submit"}
          </Button>
        </div>
      )}

      {isLocked && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-4">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          This form has been locked and cannot be edited.
        </div>
      )}
    </div>
  );
}
