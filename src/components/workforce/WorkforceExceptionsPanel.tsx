import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  User,
  AlertTriangle,
  ArrowRightLeft
} from "lucide-react";
import { format } from "date-fns";
import {
  WorkforceException,
  useWorkforceExceptions,
  useResolveWorkforceException
} from "@/hooks/useScheduleGovernance";

interface WorkforceExceptionsPanelProps {
  locationId?: string;
  showAll?: boolean;
}

const EXCEPTION_TYPE_LABELS: Record<string, string> = {
  late_start: 'Late Start',
  early_leave: 'Early Leave',
  unscheduled_shift: 'Unscheduled Clock-in',
  no_show: 'No Show',
  shift_extended: 'Extended Shift',
  overtime: 'Overtime',
};

const EXCEPTION_TYPE_ICONS: Record<string, typeof Clock> = {
  late_start: Clock,
  early_leave: ArrowRightLeft,
  unscheduled_shift: AlertTriangle,
  no_show: XCircle,
  shift_extended: Clock,
  overtime: Clock,
};

export const WorkforceExceptionsPanel = ({ locationId, showAll }: WorkforceExceptionsPanelProps) => {
  const { data: exceptions = [], isLoading } = useWorkforceExceptions({
    locationId: showAll ? undefined : locationId,
    status: 'pending',
  });
  const resolveMutation = useResolveWorkforceException();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Attendance Exceptions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (exceptions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Attendance Exceptions
          </CardTitle>
          <CardDescription>Attendance issues requiring review</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p>No pending exceptions</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Attendance Exceptions
          <Badge variant="secondary">{exceptions.length}</Badge>
        </CardTitle>
        <CardDescription>Attendance issues requiring review</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {exceptions.map((exception) => {
              const ExceptionIcon = EXCEPTION_TYPE_ICONS[exception.exception_type] || AlertTriangle;
              const isPending = resolveMutation.isPending;
              
              return (
                <div
                  key={exception.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
                        <ExceptionIcon className="h-4 w-4 text-amber-600" />
                      </div>
                      <div>
                        <div className="font-medium">
                          {EXCEPTION_TYPE_LABELS[exception.exception_type] || exception.exception_type}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {exception.employees?.full_name || 'Unknown employee'}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                  </div>

                  {/* Details */}
                  <div className="text-sm space-y-1">
                    <div>
                      <span className="text-muted-foreground">Date: </span>
                      <span className="font-medium">
                        {format(new Date(exception.shift_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                    {exception.locations?.name && (
                      <div>
                        <span className="text-muted-foreground">Location: </span>
                        <span>{exception.locations.name}</span>
                      </div>
                    )}
                    {exception.reason_code && (
                      <div>
                        <span className="text-muted-foreground">Reason: </span>
                        <span>{exception.reason_code}</span>
                      </div>
                    )}
                  </div>

                  {/* Note if present */}
                  {exception.note && (
                    <div className="text-sm bg-muted rounded p-2">
                      <span className="text-muted-foreground">Note: </span>
                      {exception.note}
                    </div>
                  )}

                  {/* Detection time */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>Detected {format(new Date(exception.detected_at), 'MMM d, h:mm a')}</span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      variant="default"
                      className="flex-1"
                      onClick={() => resolveMutation.mutate({ 
                        exceptionId: exception.id, 
                        status: 'approved' 
                      })}
                      disabled={isPending}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => resolveMutation.mutate({ 
                        exceptionId: exception.id, 
                        status: 'denied' 
                      })}
                      disabled={isPending}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Deny
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};