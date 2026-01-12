import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateStaffEvent, useUpdateStaffEvent, WarningMetadata } from "@/hooks/useStaffEvents";

interface WarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventType: "warning" | "coaching_note";
  editingEvent?: any;
  employees: Array<{ id: string; full_name: string; location_id: string | null }>;
  locations: Array<{ id: string; name: string }>;
  prefillEmployeeId?: string;
  prefillLocationId?: string;
  prefillAuditId?: string;
  prefillTitle?: string;
}

const SEVERITY_OPTIONS = [
  { value: "minor", label: "Minor" },
  { value: "major", label: "Major" },
  { value: "critical", label: "Critical" },
];

const CATEGORY_OPTIONS = [
  { value: "attendance", label: "Attendance" },
  { value: "punctuality", label: "Punctuality" },
  { value: "tasks", label: "Tasks" },
  { value: "hygiene_safety", label: "Hygiene & Safety" },
  { value: "customer", label: "Customer Service" },
  { value: "cash_inventory", label: "Cash & Inventory" },
  { value: "policy", label: "Policy" },
  { value: "other", label: "Other" },
];

export function WarningDialog({
  open,
  onOpenChange,
  eventType,
  editingEvent,
  employees,
  locations,
  prefillEmployeeId,
  prefillLocationId,
  prefillAuditId,
  prefillTitle,
}: WarningDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { company } = useCompany();
  const createEvent = useCreateStaffEvent();
  const updateEvent = useUpdateStaffEvent();

  const [employeeId, setEmployeeId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [severity, setSeverity] = useState<string>("minor");
  const [category, setCategory] = useState<string>("other");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [eventDate, setEventDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [relatedAuditId, setRelatedAuditId] = useState("");

  // Reset form when dialog opens/closes or editing changes
  useEffect(() => {
    if (open) {
      if (editingEvent) {
        setEmployeeId(editingEvent.staff_id);
        setLocationId(editingEvent.location_id || "");
        setSeverity(editingEvent.metadata?.severity || "minor");
        setCategory(editingEvent.metadata?.category || "other");
        setTitle(editingEvent.metadata?.title || "");
        setNotes(editingEvent.metadata?.notes || editingEvent.description || "");
        setEventDate(editingEvent.event_date);
        setEvidenceUrl(editingEvent.metadata?.evidence_url || "");
        setRelatedAuditId(editingEvent.metadata?.related_audit_id || "");
      } else {
        setEmployeeId(prefillEmployeeId || "");
        setLocationId(prefillLocationId || "");
        setSeverity("minor");
        setCategory("other");
        setTitle(prefillTitle || "");
        setNotes("");
        setEventDate(format(new Date(), 'yyyy-MM-dd'));
        setEvidenceUrl("");
        setRelatedAuditId(prefillAuditId || "");
      }
    }
  }, [open, editingEvent, prefillEmployeeId, prefillLocationId, prefillAuditId, prefillTitle]);

  // Auto-set location when employee is selected
  useEffect(() => {
    if (employeeId && !locationId) {
      const employee = employees.find(e => e.id === employeeId);
      if (employee?.location_id) {
        setLocationId(employee.location_id);
      }
    }
  }, [employeeId, employees, locationId]);

  const handleSubmit = async () => {
    if (!employeeId || !company?.id || !user?.id) return;

    const metadata: WarningMetadata = {
      title: title || undefined,
      notes: notes || undefined,
      evidence_url: evidenceUrl || null,
      related_audit_id: relatedAuditId || null,
    };

    if (eventType === "warning") {
      metadata.severity = severity as any;
      metadata.category = category as any;
    }

    const eventData = {
      staff_id: employeeId,
      company_id: company.id,
      location_id: locationId || null,
      event_type: eventType,
      event_date: eventDate,
      description: title || `${eventType === "warning" ? "Warning" : "Coaching Note"} issued`,
      amount: null,
      metadata,
      created_by: user.id,
    };

    if (editingEvent) {
      await updateEvent.mutateAsync({
        id: editingEvent.id,
        ...eventData,
      });
    } else {
      await createEvent.mutateAsync(eventData);
    }

    onOpenChange(false);
  };

  const isLoading = createEvent.isPending || updateEvent.isPending;
  const isWarning = eventType === "warning";
  const dialogTitle = editingEvent
    ? isWarning ? t("warnings.editWarning", "Edit Warning") : t("warnings.editNote", "Edit Note")
    : isWarning ? t("warnings.addWarning", "Add Warning") : t("warnings.addNote", "Add Note");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            {isWarning
              ? t("warnings.warningDescription", "Issue a formal warning to an employee")
              : t("warnings.noteDescription", "Record a coaching note for an employee")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Employee */}
          <div className="space-y-2">
            <Label htmlFor="employee">{t("warnings.employee", "Employee")} *</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder={t("warnings.selectEmployee", "Select employee")} />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Severity & Category (warnings only) */}
          {isWarning && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="severity">{t("warnings.severity", "Severity")} *</Label>
                <Select value={severity} onValueChange={setSeverity}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {t(`warnings.${opt.value}`, opt.label)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">{t("warnings.category", "Category")} *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">{t("warnings.titleLabel", "Title")} *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("warnings.titlePlaceholder", "Brief summary...")}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">{t("warnings.notes", "Notes")}</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("warnings.notesPlaceholder", "Additional details...")}
              rows={3}
            />
          </div>

          {/* Date & Location */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="eventDate">{t("warnings.dateIssued", "Date Issued")}</Label>
              <Input
                id="eventDate"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">{t("common.location", "Location")}</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("warnings.globalLocation", "Global")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Global</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Evidence URL */}
          <div className="space-y-2">
            <Label htmlFor="evidence">{t("warnings.evidence", "Evidence Link")}</Label>
            <Input
              id="evidence"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !employeeId || !title}>
            {isLoading ? t("common.saving", "Saving...") : t("common.save", "Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
