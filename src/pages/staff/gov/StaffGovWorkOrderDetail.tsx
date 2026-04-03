import { useParams, useNavigate } from "react-router-dom";
import {
  useCmmsWorkOrderById,
  useUpdateCmmsWorkOrderStatus,
  useCmmsChecklistResponses,
  useUpdateCmmsChecklistResponse,
} from "@/hooks/useCmmsWorkOrders";
import { StaffBottomNav } from "@/components/staff/StaffBottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft, MapPin, Calendar, Clock, HardHat,
  Wrench, FileText, AlertTriangle,
} from "lucide-react";
import { format, isPast } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  Open: "bg-slate-100 text-slate-700",
  OnHold: "bg-amber-100 text-amber-700",
  InProgress: "bg-blue-100 text-blue-700",
  Done: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
};

const PRIORITY_COLORS: Record<string, string> = {
  Low: "bg-slate-100 text-slate-500",
  Medium: "bg-blue-100 text-blue-600",
  High: "bg-orange-100 text-orange-700",
  Urgent: "bg-red-100 text-red-700",
};

export default function StaffGovWorkOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: wo, isLoading } = useCmmsWorkOrderById(id);
  const updateStatus = useUpdateCmmsWorkOrderStatus();
  const { data: checklistResponses = [] } = useCmmsChecklistResponses(id);
  const updateChecklist = useUpdateCmmsChecklistResponse();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    );
  }

  if (!wo) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-4 pb-24">
        <Wrench className="h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground">Work order not found.</p>
        <Button variant="outline" onClick={() => navigate("/staff/gov")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
        </Button>
        <StaffBottomNav />
      </div>
    );
  }

  const isOverdue = wo.due_at && isPast(new Date(wo.due_at)) && wo.status !== "Done";

  const checklist: Array<{ key: string; label: string; type?: string }> =
    wo.checklist_snapshot_json?.steps ?? [];

  const getStepResponse = (key: string) =>
    checklistResponses.find(r => r.step_key === key);

  const handleStatusAction = () => {
    if (wo.status === "Open") {
      updateStatus.mutate({ id: wo.id, status: "InProgress", fromStatus: wo.status });
    } else if (wo.status === "InProgress") {
      updateStatus.mutate({ id: wo.id, status: "Done", fromStatus: wo.status });
    }
  };

  const actionLabel =
    wo.status === "Open" ? "Start Work" :
    wo.status === "InProgress" ? "Mark Complete" :
    null;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-700 to-blue-900 text-white px-4 pt-10 pb-6">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 shrink-0 mt-0.5"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-blue-200 text-xs font-mono">WO-{wo.wo_number}</p>
            <h1 className="text-lg font-bold leading-tight mt-0.5">{wo.title}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge className={`text-xs ${STATUS_COLORS[wo.status]}`} variant="secondary">{wo.status}</Badge>
              <Badge className={`text-xs ${PRIORITY_COLORS[wo.priority]}`} variant="secondary">{wo.priority}</Badge>
              <span className="text-xs text-blue-200">{wo.type}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Meta info */}
        <Card>
          <CardContent className="p-4 space-y-2.5">
            {wo.location && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{wo.location.name}</span>
              </div>
            )}
            {wo.due_at && (
              <div className={`flex items-center gap-2 text-sm ${isOverdue ? "text-red-600" : ""}`}>
                <Calendar className="h-4 w-4 shrink-0" />
                <span>{isOverdue ? "Overdue · " : "Due: "}{format(new Date(wo.due_at), "EEEE, MMM d, yyyy")}</span>
                {isOverdue && <AlertTriangle className="h-3.5 w-3.5" />}
              </div>
            )}
            {wo.project_id && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <HardHat className="h-4 w-4 shrink-0" />
                <span>Government project</span>
              </div>
            )}
            {wo.estimated_minutes && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4 shrink-0" />
                <span>Estimated: {Math.round(wo.estimated_minutes / 60 * 10) / 10}h</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Description */}
        {wo.description && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{wo.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Procedure / Checklist */}
        {checklist.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Checklist ({checklistResponses.filter(r => r.response_json?.completed).length}/{checklist.length})
                </span>
              </div>
              {checklist.map((step) => {
                const resp = getStepResponse(step.key);
                const isCompleted = resp?.response_json?.completed ?? false;
                return (
                  <div key={step.key} className="flex items-start gap-3">
                    <Checkbox
                      id={step.key}
                      checked={isCompleted}
                      className="mt-0.5"
                      disabled={wo.status === "Done" || updateChecklist.isPending}
                      onCheckedChange={(checked) => {
                        if (!id) return;
                        updateChecklist.mutate({
                          workOrderId: id,
                          stepKey: step.key,
                          response: { completed: !!checked, completed_at: checked ? new Date().toISOString() : null },
                        });
                      }}
                    />
                    <label
                      htmlFor={step.key}
                      className={`text-sm cursor-pointer ${isCompleted ? "line-through text-muted-foreground" : ""}`}
                    >
                      {step.label}
                    </label>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Action button */}
        {actionLabel && (
          <Button
            className="w-full h-12 text-base"
            disabled={updateStatus.isPending}
            onClick={handleStatusAction}
          >
            {updateStatus.isPending ? "Updating…" : actionLabel}
          </Button>
        )}

        {wo.status === "Done" && (
          <div className="flex items-center justify-center gap-2 py-4 text-green-600">
            <Wrench className="h-4 w-4" />
            <span className="text-sm font-medium">Work order completed</span>
          </div>
        )}
      </div>

      <StaffBottomNav />
    </div>
  );
}
