import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarPlus, Clock, MapPin, Users, Calendar as CalendarIcon, Columns3, UserCheck, AlertCircle, Copy } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { useState, useMemo } from "react";
import { EnhancedShiftDialog, LockedChangeRequestPayload } from "@/components/workforce/EnhancedShiftDialog";
import { ChangeRequestDialog } from "@/components/workforce/ChangeRequestDialog";
import { useShifts } from "@/hooks/useShifts";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EnhancedShiftWeekView } from "@/components/workforce/EnhancedShiftWeekView";
import { MobileShiftDayView } from "@/components/workforce/MobileShiftDayView";
import { PendingApprovalsDialog } from "@/components/workforce/PendingApprovalsDialog";
import { CopyScheduleDialog } from "@/components/workforce/CopyScheduleDialog";
import { usePendingApprovals } from "@/hooks/useShiftAssignments";
import { useEmployees } from "@/hooks/useEmployees";
import { useLocations } from "@/hooks/useLocations";
import { useIsMobile } from "@/hooks/use-mobile";
import { useScheduleGovernanceEnabled, useSchedulePeriod } from "@/hooks/useScheduleGovernance";
import { useCompany } from "@/hooks/useCompany";
import { startOfWeek, format } from "date-fns";

const Shifts = () => {
  const { t } = useTranslation();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [pendingDialogOpen, setPendingDialogOpen] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [view, setView] = useState<"day" | "week">("week");
  const [editingShift, setEditingShift] = useState<any>(null);
  const [changeRequestDialogOpen, setChangeRequestDialogOpen] = useState(false);
  const [pendingChangeRequest, setPendingChangeRequest] = useState<LockedChangeRequestPayload | null>(null);
  const isMobile = useIsMobile();
  
  // Data hooks - must come before governance location lookup
  const dateStr = date ? date.toISOString().split('T')[0] : "";
  const { data: shifts = [], isLoading } = useShifts(undefined, dateStr, dateStr);
  const { data: pendingApprovals } = usePendingApprovals();
  const { data: employees = [] } = useEmployees();
  const { data: locations = [] } = useLocations();
  const pendingCount = pendingApprovals?.length || 0;
  
  // Governance hooks
  const { data: company } = useCompany();
  const isGovernanceEnabled = useScheduleGovernanceEnabled();
  
  // Get period for the selected date's week - we need to know which location for governance
  // In day view, we don't have a single location selected, so governance is limited
  // For safety, we'll check if the editing shift's location's period is locked
  const currentWeekStart = date ? startOfWeek(date, { weekStartsOn: 1 }) : startOfWeek(new Date(), { weekStartsOn: 1 });
  
  // For governance, use the editing shift's location or first location as fallback
  const governanceLocationId = editingShift?.location_id || (locations.length > 0 ? locations[0].id : null);
  const { data: schedulePeriod } = useSchedulePeriod(governanceLocationId, currentWeekStart);
  const isPeriodLocked = schedulePeriod?.state === 'locked';

  // Group shifts by location
  const shiftsByLocation = useMemo(() => {
    const grouped: Record<string, typeof shifts> = {};
    shifts.forEach(shift => {
      const locationId = shift.location_id || 'unknown';
      if (!grouped[locationId]) {
        grouped[locationId] = [];
      }
      grouped[locationId].push(shift);
    });
    return grouped;
  }, [shifts]);

  const getEmployeeName = (staffId: string) => {
    const employee = employees.find(e => e.id === staffId);
    return employee?.full_name || t('common.unknown');
  };

  const getLocationName = (locationId: string) => {
    const location = locations.find(l => l.id === locationId);
    return location?.name || t('workforce.shifts.unknownLocation');
  };

  const getAssignedEmployees = (shift: any) => {
    const assignments = shift.shift_assignments || [];
    const approved = assignments.filter((a: any) => a.approval_status === 'approved');
    const pending = assignments.filter((a: any) => a.approval_status === 'pending');
    return { approved, pending, total: assignments.length };
  };

  // On mobile, show the mobile-optimized day view
  if (isMobile) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{t('workforce.shifts.title')}</h1>
              <p className="text-muted-foreground text-sm">
                {t('workforce.shifts.subtitle')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1 flex-1"
              onClick={() => setCopyDialogOpen(true)}
            >
              <Copy className="h-4 w-4" />
              {t('workforce.shifts.copy')}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="gap-1 flex-1" 
              onClick={() => setPendingDialogOpen(true)}
            >
              <Badge variant="destructive" className="mr-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {pendingCount || 0}
              </Badge>
              {t('workforce.shifts.pending')}
            </Button>
          </div>
        </div>

        <MobileShiftDayView />

        <PendingApprovalsDialog 
          open={pendingDialogOpen}
          onOpenChange={setPendingDialogOpen}
        />

        <CopyScheduleDialog
          open={copyDialogOpen}
          onOpenChange={setCopyDialogOpen}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('workforce.shifts.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('workforce.shifts.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as "day" | "week")}>
            <TabsList>
              <TabsTrigger value="day" className="gap-1">
                <CalendarIcon className="h-4 w-4" />
                {t('workforce.shifts.day')}
              </TabsTrigger>
              <TabsTrigger value="week" className="gap-1">
                <Columns3 className="h-4 w-4" />
                {t('workforce.shifts.week')}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setCopyDialogOpen(true)}
          >
            <Copy className="h-4 w-4" />
            <span className="hidden sm:inline">{t('workforce.shifts.copySchedule')}</span>
          </Button>
          <Button 
            variant="outline" 
            className="gap-2" 
            onClick={() => setPendingDialogOpen(true)}
          >
            <Badge variant="destructive" className="mr-1">
              {pendingCount || 0}
            </Badge>
            {t('workforce.shifts.pendingApprovals')}
          </Button>
        </div>
      </div>

      {view === "week" ? (
        <EnhancedShiftWeekView />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('workforce.shifts.calendarView')}</CardTitle>
            <CardDescription>{t('workforce.shifts.selectDate')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('workforce.shifts.shiftsFor')} {date?.toLocaleDateString()}</CardTitle>
            <CardDescription>{t('workforce.shifts.viewManage')}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
                <p className="text-muted-foreground">{t('workforce.shifts.loadingShifts')}</p>
              </div>
            ) : shifts.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <p>{t('workforce.shifts.noShifts')}</p>
                <Button className="mt-4" variant="outline" onClick={() => setShiftDialogOpen(true)}>
                  <CalendarPlus className="mr-2 h-4 w-4" />
                  {t('workforce.shifts.createShift')}
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(shiftsByLocation).map(([locationId, locationShifts]) => (
                  <div key={locationId} className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <MapPin className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold text-lg">{getLocationName(locationId)}</h3>
                      <Badge variant="outline" className="ml-auto">
                        {locationShifts.length} shift{locationShifts.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    {locationShifts.map((shift) => {
                      const { approved, pending } = getAssignedEmployees(shift);
                      const filledCount = approved.length;
                      const isFullyStaffed = filledCount >= shift.required_count;
                      const needsMore = shift.required_count - filledCount;
                      
                      return (
                        <div key={shift.id} className="border rounded-lg p-4 bg-card hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="font-semibold text-base">{shift.role}</div>
                              {shift.is_open_shift && (
                                <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                                  {t('workforce.shifts.openShift')}
                                </Badge>
                              )}
                              <Badge 
                                variant={isFullyStaffed ? "default" : "destructive"} 
                                className={`gap-1 ${isFullyStaffed ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : ''}`}
                              >
                                <Users className="h-3 w-3" />
                                {filledCount}/{shift.required_count} {t('workforce.shifts.filled')}
                              </Badge>
                              {pending.length > 0 && (
                                <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
                                  <AlertCircle className="h-3 w-3" />
                                  {pending.length} {t('workforce.shifts.pending')}
                                </Badge>
                              )}
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setEditingShift(shift);
                                setShiftDialogOpen(true);
                              }}
                            >
                              {t('workforce.shifts.edit')}
                            </Button>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-4 w-4" />
                              <span>{shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}</span>
                            </div>
                            {shift.break_duration_minutes && shift.break_duration_minutes > 0 && (
                              <div className="text-xs">
                                ({shift.break_duration_minutes}min break)
                              </div>
                            )}
                          </div>
                          
                          {/* Assigned Employees */}
                          {approved.length > 0 && (
                            <div className="mt-3 pt-3 border-t">
                              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                                <UserCheck className="h-4 w-4 text-green-600" />
                                {t('workforce.shifts.assignedStaff')}:
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {approved.map((assignment: any) => (
                                  <Badge key={assignment.id} variant="secondary" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
                                    {getEmployeeName(assignment.staff_id)}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Pending assignments */}
                          {pending.length > 0 && (
                            <div className="mt-2">
                              <div className="flex items-center gap-2 text-sm font-medium mb-2 text-amber-600">
                                <AlertCircle className="h-4 w-4" />
                                {t('workforce.shifts.pendingApproval')}:
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {pending.map((assignment: any) => (
                                  <Badge key={assignment.id} variant="outline" className="border-amber-300 text-amber-700">
                                    {getEmployeeName(assignment.staff_id)}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Needs more staff warning */}
                          {needsMore > 0 && (
                            <div className="mt-2 text-sm text-red-600 flex items-center gap-1">
                              <AlertCircle className="h-4 w-4" />
                              {t('workforce.shifts.needsMore', { count: needsMore, person: needsMore === 1 ? 'person' : 'people' })}
                            </div>
                          )}
                          
                          {shift.notes && (
                            <div className="mt-2 text-sm text-muted-foreground border-t pt-2">
                              <span className="font-medium">{t('workforce.shifts.notes')}:</span> {shift.notes}
                            </div>
                          )}
                          {shift.creator_name && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              {t('workforce.shifts.createdBy')}: {shift.creator_name}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      )}
      
      <EnhancedShiftDialog
        open={shiftDialogOpen} 
        onOpenChange={(open) => {
          setShiftDialogOpen(open);
          if (!open) setEditingShift(null);
        }}
        defaultDate={date}
        shift={editingShift}
        isPeriodLocked={isPeriodLocked}
        isGovernanceEnabled={isGovernanceEnabled}
        onLockedChangeRequest={(payload) => {
          setPendingChangeRequest(payload);
          setChangeRequestDialogOpen(true);
        }}
      />

      {/* Change Request Dialog for governance */}
      {pendingChangeRequest && company?.id && governanceLocationId && schedulePeriod && (
        <ChangeRequestDialog
          open={changeRequestDialogOpen}
          onOpenChange={(open) => {
            setChangeRequestDialogOpen(open);
            if (!open) setPendingChangeRequest(null);
          }}
          changeType={pendingChangeRequest.changeType}
          companyId={company.id}
          locationId={governanceLocationId}
          periodId={schedulePeriod.id}
          targetShiftId={pendingChangeRequest.targetShiftId}
          payloadBefore={pendingChangeRequest.payloadBefore}
          payloadAfter={pendingChangeRequest.payloadAfter}
          shiftSummary={pendingChangeRequest.shiftSummary}
        />
      )}

      <PendingApprovalsDialog 
        open={pendingDialogOpen}
        onOpenChange={setPendingDialogOpen}
      />

      <CopyScheduleDialog
        open={copyDialogOpen}
        onOpenChange={setCopyDialogOpen}
      />
    </div>
  );
};

export default Shifts;