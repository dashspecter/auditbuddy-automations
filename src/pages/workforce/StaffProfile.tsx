import { useParams } from "react-router-dom";
import { useMemo } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useEmployees } from "@/hooks/useEmployees";
import { useStaffEvents } from "@/hooks/useStaffEvents";
import { useAttendanceLogs } from "@/hooks/useAttendanceLogs";
import { useEmployeePerformance } from "@/hooks/useEmployeePerformance";
import { useMonthlyScores } from "@/hooks/useMonthlyScores";
import { useBadgeConfigurations } from "@/hooks/useBadgeConfigurations";
import { computeEffectiveScore, formatEffectiveScore } from "@/lib/effectiveScore";
import { computeEarnedBadges } from "@/lib/performanceBadges";
import { TierBadge } from "@/components/staff/TierBadge";
import { BadgesSection } from "@/components/staff/BadgesSection";
import { ScoreHistoryChart } from "@/components/staff/ScoreHistoryChart";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Mail, Phone, Calendar, DollarSign, MapPin, TrendingUp, Clock, AlertTriangle } from "lucide-react";
import { format, startOfMonth, endOfMonth, differenceInHours, differenceInMinutes } from "date-fns";

const StaffProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { data: staff } = useEmployees();
  const { data: events } = useStaffEvents(id);
  const { data: attendanceLogs } = useAttendanceLogs();

  // Date range for current month
  const now = new Date();
  const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");

  // Performance data
  const { data: allScores = [] } = useEmployeePerformance(monthStart, monthEnd);
  const { data: monthlyHistory = [] } = useMonthlyScores(id ?? null, 6);
  const { configs: badgeConfigs } = useBadgeConfigurations();

  const member = staff?.find((s) => s.id === id);
  const memberAttendance = attendanceLogs?.filter((log) => log.staff_id === id);
  const recentAttendance = memberAttendance?.slice(0, 10);

  // Compute effective score for this employee
  const effectiveData = useMemo(() => {
    const raw = allScores.find((s) => s.employee_id === id);
    if (!raw) return null;
    return computeEffectiveScore(raw);
  }, [allScores, id]);

  // Earned badges
  const earnedBadges = useMemo(() => {
    if (!effectiveData) return [];
    return computeEarnedBadges(effectiveData, monthlyHistory, effectiveData.effective_score !== null ? null : null, badgeConfigs);
  }, [effectiveData, monthlyHistory, badgeConfigs]);

  // Hours worked this month
  const hoursThisMonth = useMemo(() => {
    if (!memberAttendance) return 0;
    const monthLogs = memberAttendance.filter((log) => {
      const checkIn = new Date(log.check_in_at);
      return checkIn >= startOfMonth(now) && checkIn <= endOfMonth(now);
    });
    let totalMinutes = 0;
    for (const log of monthLogs) {
      if (log.check_out_at) {
        totalMinutes += differenceInMinutes(new Date(log.check_out_at), new Date(log.check_in_at));
      }
    }
    return Math.round(totalMinutes / 60 * 10) / 10;
  }, [memberAttendance]);

  // Last shift
  const lastShift = useMemo(() => {
    if (!memberAttendance || memberAttendance.length === 0) return null;
    const sorted = [...memberAttendance].sort(
      (a, b) => new Date(b.check_in_at).getTime() - new Date(a.check_in_at).getTime()
    );
    return sorted[0];
  }, [memberAttendance]);

  if (!member) {
    return <div className="text-center py-12">Staff member not found.</div>;
  }

  const initials = member.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-6">
      {/* Header card */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <CardTitle className="text-2xl">{member.full_name}</CardTitle>
                {effectiveData && <TierBadge score={effectiveData.effective_score} size="md" />}
              </div>
              <CardDescription className="text-lg">{member.role}</CardDescription>
              <div className="flex gap-2 mt-2">
                <Badge variant={member.status === "active" ? "default" : "secondary"}>
                  {member.status}
                </Badge>
                <Badge variant="outline">{member.contract_type}</Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {member.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{member.email}</span>
              </div>
            )}
            {member.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{member.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{member.locations?.name}</span>
            </div>
            {member.hire_date && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Since {format(new Date(member.hire_date), "MMM yyyy")}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Base Salary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              {member.base_salary ? Number(member.base_salary).toLocaleString() : member.hourly_rate ? Number(member.hourly_rate).toLocaleString() : "N/A"}
              {member.hourly_rate && !member.base_salary && <span className="text-sm text-muted-foreground">/hr</span>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Month Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {hoursThisMonth}h
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Performance Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              {effectiveData ? formatEffectiveScore(effectiveData.effective_score) : "—"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last Shift</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {lastShift ? format(new Date(lastShift.check_in_at), "MMM d") : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Staff Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Contract Type</div>
                  <div className="font-medium">{member.contract_type}</div>
                </div>
                {member.hire_date && (
                  <div>
                    <div className="text-sm text-muted-foreground">Hire Date</div>
                    <div className="font-medium">{format(new Date(member.hire_date), "PPP")}</div>
                  </div>
                )}
                {member.emergency_contact_name && (
                  <div>
                    <div className="text-sm text-muted-foreground">Emergency Contact</div>
                    <div className="font-medium">{member.emergency_contact_name}</div>
                    {member.emergency_contact_phone && (
                      <div className="text-sm text-muted-foreground">{member.emergency_contact_phone}</div>
                    )}
                  </div>
                )}
              </div>
              {member.notes && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Notes</div>
                  <div className="text-sm">{member.notes}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <div className="space-y-4">
            {/* Score Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Score Breakdown
                  {effectiveData && <TierBadge score={effectiveData.effective_score} size="sm" />}
                </CardTitle>
                <CardDescription>
                  {effectiveData
                    ? `${effectiveData.used_components_count} active component${effectiveData.used_components_count !== 1 ? "s" : ""} this month`
                    : "No performance data yet"}
                </CardDescription>
              </CardHeader>
              {effectiveData && (
                <CardContent className="space-y-4">
                  <ScoreRow label="Attendance" score={effectiveData.attendance_score} used={effectiveData.attendance_used} detail={`${effectiveData.shifts_worked}/${effectiveData.shifts_scheduled} shifts`} />
                  <ScoreRow label="Punctuality" score={effectiveData.punctuality_score} used={effectiveData.punctuality_used} detail={`${effectiveData.late_count} late`} />
                  <ScoreRow label="Tasks" score={effectiveData.task_score} used={effectiveData.task_used} detail={`${effectiveData.tasks_completed}/${effectiveData.tasks_assigned} done`} />
                  <ScoreRow label="Tests" score={effectiveData.test_score} used={effectiveData.test_used} detail={`${effectiveData.tests_taken} taken`} />
                  <ScoreRow label="Reviews" score={effectiveData.performance_review_score} used={effectiveData.review_used} detail={`${effectiveData.reviews_count} reviews`} />

                  {effectiveData.warning_penalty > 0 && (
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span className="text-sm font-medium text-destructive">
                        Warning Penalty: −{effectiveData.warning_penalty.toFixed(1)} pts
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="font-semibold">Effective Score</span>
                    <span className="text-xl font-bold">{formatEffectiveScore(effectiveData.effective_score)}</span>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Badges */}
            <BadgesSection badges={earnedBadges} />

            {/* Score History */}
            <ScoreHistoryChart
              history={monthlyHistory}
              currentScore={effectiveData?.effective_score ?? null}
            />
          </div>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle>Recent Attendance</CardTitle>
              <CardDescription>Last 10 attendance logs</CardDescription>
            </CardHeader>
            <CardContent>
              {recentAttendance && recentAttendance.length > 0 ? (
                <div className="space-y-2">
                  {recentAttendance.map((log) => (
                    <div key={log.id} className="flex items-center justify-between border-b pb-2">
                      <div>
                        <div className="font-medium">
                          {format(new Date(log.check_in_at), "PPP p")}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {log.locations?.name} • {log.method}
                        </div>
                      </div>
                      <div className="text-sm">
                        {log.check_out_at ? (
                          <span>Out: {format(new Date(log.check_out_at), "p")}</span>
                        ) : (
                          <Badge variant="outline">In Progress</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No attendance logs yet.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Events Timeline</CardTitle>
              <CardDescription>Raises, bonuses, warnings, and other events</CardDescription>
            </CardHeader>
            <CardContent>
              {events && events.length > 0 ? (
                <div className="space-y-4">
                  {events.map((event) => (
                    <div key={event.id} className="flex items-start gap-4 border-b pb-4">
                      <div className="flex-1">
                        <div className="font-medium capitalize">{event.event_type}</div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(event.event_date), "PPP")}
                        </div>
                        {event.description && (
                          <div className="text-sm mt-1">{event.description}</div>
                        )}
                      </div>
                      {event.amount && (
                        <div className="text-lg font-bold flex items-center">
                          <DollarSign className="h-4 w-4" />
                          {event.amount}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No events recorded yet.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Documents & Training</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                No documents yet.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

/** Small helper for score breakdown rows */
function ScoreRow({ label, score, used, detail }: { label: string; score: number; used: boolean; detail: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {used ? `${score.toFixed(1)}%` : "—"} <span className="text-xs">({detail})</span>
        </span>
      </div>
      <Progress value={used ? score : 0} className="h-2" />
    </div>
  );
}

export default StaffProfile;
