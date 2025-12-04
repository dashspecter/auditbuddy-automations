import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, Calendar, CheckCircle, Clock, Users, MapPin, TrendingUp, TrendingDown, AlertTriangle, ChevronDown, ChevronRight, Briefcase, X, Palmtree, Stethoscope } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePayrollPeriods, usePayrollSummary, useCreatePayrollPeriod, PayrollSummaryItem } from "@/hooks/usePayroll";
import { useLocations } from "@/hooks/useLocations";
import { useTimeOffRequests } from "@/hooks/useTimeOffRequests";
import { PayPeriodDialog } from "@/components/workforce/PayPeriodDialog";
import { format, parseISO, eachDayOfInterval, isWithinInterval } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Payroll = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("all");
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());
  const { data: periods = [], isLoading: periodsLoading } = usePayrollPeriods();
  const { data: locations = [] } = useLocations();
  const createPeriod = useCreatePayrollPeriod();

  const activePeriod = periods.find(p => p.status === "draft" || p.status === "calculated");
  const locationFilter = selectedLocationId === "all" ? undefined : selectedLocationId;
  
  // Use shifts-based payroll calculation with location filter
  const { data: payrollSummary = [], entries: dailyEntries = [], locationSummary = [], isLoading: payrollLoading } = usePayrollSummary(
    activePeriod?.start_date,
    activePeriod?.end_date,
    locationFilter
  );

  // Fetch time off requests for the period
  const { data: timeOffRequests = [] } = useTimeOffRequests(
    activePeriod?.start_date,
    activePeriod?.end_date
  );

  // Calculate time off dates for each employee
  const getEmployeeTimeOff = (employeeId: string) => {
    const employeeTimeOff = timeOffRequests.filter(
      req => req.employee_id === employeeId && req.status === 'approved'
    );
    
    const vacationDates: string[] = [];
    const medicalDates: string[] = [];
    const otherLeaveDates: string[] = [];
    
    employeeTimeOff.forEach(req => {
      const days = eachDayOfInterval({
        start: parseISO(req.start_date),
        end: parseISO(req.end_date)
      }).map(d => format(d, 'yyyy-MM-dd'));
      
      if (req.request_type === 'vacation' || !req.request_type) {
        vacationDates.push(...days);
      } else if (req.request_type === 'medical' || req.request_type === 'sick') {
        medicalDates.push(...days);
      } else {
        otherLeaveDates.push(...days);
      }
    });
    
    return { vacationDates, medicalDates, otherLeaveDates };
  };

  const toggleExpanded = (employeeId: string) => {
    setExpandedEmployees(prev => {
      const next = new Set(prev);
      if (next.has(employeeId)) {
        next.delete(employeeId);
      } else {
        next.add(employeeId);
      }
      return next;
    });
  };
  
  const currentPeriodTotal = payrollSummary.reduce((sum, item) => sum + item.total_amount, 0);
  const totalScheduledHours = payrollSummary.reduce((sum, item) => sum + item.scheduled_hours, 0);
  const totalActualHours = payrollSummary.reduce((sum, item) => sum + item.actual_hours, 0);
  const totalOvertimeHours = payrollSummary.reduce((sum, item) => sum + item.overtime_hours, 0);
  const totalUndertimeHours = payrollSummary.reduce((sum, item) => sum + item.undertime_hours, 0);
  const totalLateCount = payrollSummary.reduce((sum, item) => sum + item.late_count, 0);

  const handleCreatePeriod = (data: { start_date: string; end_date: string; status: string }) => {
    createPeriod.mutate(data, {
      onSuccess: () => setDialogOpen(false),
    });
  };

  if (periodsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payroll Management</h1>
          <p className="text-muted-foreground mt-1">
            Calculate pay from shifts with attendance tracking
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
            <SelectTrigger className="w-[200px]">
              <MapPin className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map(location => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="gap-2" onClick={() => setDialogOpen(true)}>
            <Calendar className="h-4 w-4" />
            Create Pay Period
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentPeriodTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} Lei</div>
            {activePeriod && (
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(activePeriod.start_date), "MMM d")} - {format(new Date(activePeriod.end_date), "MMM d")}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Scheduled / Actual Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalScheduledHours.toFixed(1)} / {totalActualHours.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground mt-1">hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              Overtime
              {totalOvertimeHours > 0 && <TrendingUp className="h-4 w-4 text-green-500" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalOvertimeHours > 0 ? 'text-green-600' : ''}`}>
              +{totalOvertimeHours.toFixed(1)} hrs
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              Undertime
              {totalUndertimeHours > 0 && <TrendingDown className="h-4 w-4 text-orange-500" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalUndertimeHours > 0 ? 'text-orange-600' : ''}`}>
              -{totalUndertimeHours.toFixed(1)} hrs
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              Late Check-ins
              {totalLateCount > 0 && <AlertTriangle className="h-4 w-4 text-warning" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalLateCount > 0 ? 'text-warning' : ''}`}>
              {totalLateCount}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="current">
        <TabsList>
          <TabsTrigger value="current">Staff Summary</TabsTrigger>
          <TabsTrigger value="locations">By Location</TabsTrigger>
          <TabsTrigger value="daily">Daily Breakdown</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="current">
          <Card>
            <CardHeader>
              <CardTitle>Staff Payroll Summary</CardTitle>
              <CardDescription>
                {activePeriod 
                  ? `${format(new Date(activePeriod.start_date), "MMMM d")} - ${format(new Date(activePeriod.end_date), "MMMM d, yyyy")}`
                  : "No active period"}
                {selectedLocationId !== "all" && ` • Filtered by location`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activePeriod ? (
                payrollLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}
                  </div>
                ) : payrollSummary.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Worked</TableHead>
                        <TableHead>Missed</TableHead>
                        <TableHead>Leave</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>Late</TableHead>
                        <TableHead className="text-right">Total Pay</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payrollSummary.map((item) => {
                        const timeOff = getEmployeeTimeOff(item.employee_id);
                        const isExpanded = expandedEmployees.has(item.employee_id);
                        
                        return (
                          <>
                            <TableRow 
                              key={item.employee_id} 
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => toggleExpanded(item.employee_id)}
                            >
                              <TableCell className="w-8">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                              </TableCell>
                              <TableCell className="font-medium">{item.employee_name}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{item.role}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="default" className="bg-green-500">
                                  {item.worked_dates.length}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {item.missed_dates.length > 0 ? (
                                  <Badge variant="destructive">{item.missed_dates.length}</Badge>
                                ) : (
                                  <span className="text-muted-foreground">0</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {(timeOff.vacationDates.length + timeOff.medicalDates.length + timeOff.otherLeaveDates.length) > 0 ? (
                                  <div className="flex gap-1">
                                    {timeOff.vacationDates.length > 0 && (
                                      <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                                        <Palmtree className="h-3 w-3 mr-1" />
                                        {timeOff.vacationDates.length}
                                      </Badge>
                                    )}
                                    {timeOff.medicalDates.length > 0 && (
                                      <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                                        <Stethoscope className="h-3 w-3 mr-1" />
                                        {timeOff.medicalDates.length}
                                      </Badge>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">0</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <span>{item.actual_hours.toFixed(1)}h</span>
                                  {item.overtime_hours > 0 && (
                                    <Badge variant="default" className="bg-green-500 text-xs">
                                      +{item.overtime_hours.toFixed(1)}
                                    </Badge>
                                  )}
                                  {item.undertime_hours > 0 && (
                                    <Badge variant="secondary" className="bg-orange-100 text-orange-700 text-xs">
                                      -{item.undertime_hours.toFixed(1)}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {item.late_count > 0 ? (
                                  <Badge variant="destructive">{item.late_count}x</Badge>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right font-bold">
                                {item.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} Lei
                              </TableCell>
                            </TableRow>
                            
                            {/* Expanded details row */}
                            {isExpanded && (
                              <TableRow key={`${item.employee_id}-details`} className="bg-muted/30">
                                <TableCell colSpan={9} className="p-4">
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    {/* Worked Shifts */}
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2 font-medium text-green-700">
                                        <Briefcase className="h-4 w-4" />
                                        Worked Shifts ({item.worked_dates.length})
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        {item.worked_dates.length > 0 ? (
                                          item.worked_dates.map(date => (
                                            <Badge key={date} variant="outline" className="text-xs bg-green-50 border-green-200">
                                              {format(parseISO(date), "MMM d")}
                                            </Badge>
                                          ))
                                        ) : (
                                          <span className="text-muted-foreground text-xs">No shifts worked</span>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {/* Missed Shifts */}
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2 font-medium text-red-700">
                                        <X className="h-4 w-4" />
                                        Missed Shifts ({item.missed_dates.length})
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        {item.missed_dates.length > 0 ? (
                                          item.missed_dates.map(date => (
                                            <Badge key={date} variant="outline" className="text-xs bg-red-50 border-red-200 text-red-700">
                                              {format(parseISO(date), "MMM d")}
                                            </Badge>
                                          ))
                                        ) : (
                                          <span className="text-muted-foreground text-xs">No missed shifts</span>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {/* Vacation Days */}
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2 font-medium text-blue-700">
                                        <Palmtree className="h-4 w-4" />
                                        Vacation ({timeOff.vacationDates.length})
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        {timeOff.vacationDates.length > 0 ? (
                                          timeOff.vacationDates.map(date => (
                                            <Badge key={date} variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-700">
                                              {format(parseISO(date), "MMM d")}
                                            </Badge>
                                          ))
                                        ) : (
                                          <span className="text-muted-foreground text-xs">No vacation days</span>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {/* Medical Leave */}
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2 font-medium text-purple-700">
                                        <Stethoscope className="h-4 w-4" />
                                        Medical Leave ({timeOff.medicalDates.length})
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        {timeOff.medicalDates.length > 0 ? (
                                          timeOff.medicalDates.map(date => (
                                            <Badge key={date} variant="outline" className="text-xs bg-purple-50 border-purple-200 text-purple-700">
                                              {format(parseISO(date), "MMM d")}
                                            </Badge>
                                          ))
                                        ) : (
                                          <span className="text-muted-foreground text-xs">No medical leave</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Extra/Missing Shifts Info */}
                                  <div className="mt-4 pt-4 border-t">
                                    <div className="flex flex-wrap gap-4">
                                      {item.extra_shifts > 0 && (
                                        <div className="space-y-2">
                                          <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                                            <TrendingUp className="h-4 w-4" />
                                            <span className="font-medium">{item.extra_shifts} Extra Shifts</span>
                                            <span className="text-xs text-green-600">(above expected {item.expected_shifts_per_week}/week)</span>
                                          </div>
                                          <div className="flex flex-wrap gap-1 ml-2">
                                            {item.extra_shift_dates.map(date => (
                                              <Badge key={date} variant="outline" className="text-xs bg-green-50 border-green-300 text-green-700">
                                                {format(parseISO(date), "MMM d")}
                                              </Badge>
                                            ))}
                                          </div>
                                          {item.overtime_pay > 0 && (
                                            <div className="text-sm font-medium text-green-700 ml-2">
                                              Overtime Premium: +{item.overtime_pay.toFixed(2)} Lei
                                              <span className="text-xs text-green-600 ml-1">
                                                (at {item.overtime_rate} Lei/hr instead of {item.hourly_rate} Lei/hr)
                                              </span>
                                            </div>
                                          )}
                                          {item.extra_shifts > 0 && !item.overtime_rate && (
                                            <div className="text-xs text-muted-foreground ml-2">
                                              Set overtime rate in employee profile to calculate premium pay
                                            </div>
                                          )}
                                        </div>
                                      )}
                                      {item.missing_shifts > 0 && (
                                        <div className="flex items-center gap-2 text-orange-700 bg-orange-50 px-3 py-2 rounded-lg">
                                          <TrendingDown className="h-4 w-4" />
                                          <span className="font-medium">{item.missing_shifts} Missing Shifts</span>
                                          <span className="text-xs text-orange-600">(below expected {item.expected_shifts_per_week}/week)</span>
                                        </div>
                                      )}
                                      {!item.expected_shifts_per_week && item.extra_shifts === 0 && item.missing_shifts === 0 && (
                                        <div className="flex items-center gap-2 text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg text-sm">
                                          <AlertTriangle className="h-4 w-4" />
                                          <span>Set "Expected Shifts/Week" in employee profile to track extra/missing shifts</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Additional stats */}
                                  <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 text-xs text-muted-foreground">
                                    <span>Scheduled: {item.scheduled_hours.toFixed(1)}h</span>
                                    <span>Actual: {item.actual_hours.toFixed(1)}h</span>
                                    <span>Rate: {item.hourly_rate} Lei/hr</span>
                                    {item.overtime_rate && (
                                      <span className="text-green-600">Overtime Rate: {item.overtime_rate} Lei/hr</span>
                                    )}
                                    {item.expected_shifts_per_week && (
                                      <span>Expected: {item.expected_shifts_per_week} shifts/week</span>
                                    )}
                                    {item.late_count > 0 && (
                                      <span className="text-orange-600">Late: {item.late_count}x ({item.total_late_minutes}m total)</span>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </>
                        );
                      })}
                      <TableRow className="bg-muted/50">
                        <TableCell></TableCell>
                        <TableCell className="font-bold">Total</TableCell>
                        <TableCell></TableCell>
                        <TableCell className="font-bold">
                          {payrollSummary.reduce((s, i) => s + i.worked_dates.length, 0)}
                        </TableCell>
                        <TableCell className="font-bold">
                          {payrollSummary.reduce((s, i) => s + i.missed_dates.length, 0)}
                        </TableCell>
                        <TableCell></TableCell>
                        <TableCell className="font-bold">{totalActualHours.toFixed(1)}h</TableCell>
                        <TableCell className="font-bold">{totalLateCount}x</TableCell>
                        <TableCell className="text-right font-bold text-lg">
                          {currentPeriodTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} Lei
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center text-muted-foreground py-12">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No shifts found for this period.</p>
                    <p className="text-sm mt-2">Payroll is calculated from approved shift assignments.</p>
                  </div>
                )
              ) : (
                <div className="text-center text-muted-foreground py-12">
                  <Coins className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active pay period.</p>
                  <p className="text-sm mt-2">Create a pay period to calculate payroll from shifts.</p>
                  <Button className="mt-4" variant="outline" onClick={() => setDialogOpen(true)}>
                    <Calendar className="mr-2 h-4 w-4" />
                    Create Pay Period
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations">
          <Card>
            <CardHeader>
              <CardTitle>Payroll by Location</CardTitle>
              <CardDescription>Labor costs breakdown per location</CardDescription>
            </CardHeader>
            <CardContent>
              {locationSummary.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Location</TableHead>
                      <TableHead>Shifts</TableHead>
                      <TableHead>Total Hours</TableHead>
                      <TableHead className="text-right">Total Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locationSummary.map((loc) => (
                      <TableRow key={loc.location_id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            {loc.location_name}
                          </div>
                        </TableCell>
                        <TableCell>{loc.shift_count}</TableCell>
                        <TableCell>{loc.total_hours.toFixed(1)} hrs</TableCell>
                        <TableCell className="text-right font-bold">
                          {loc.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} Lei
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50">
                      <TableCell className="font-bold">Total</TableCell>
                      <TableCell className="font-bold">{locationSummary.reduce((s, l) => s + l.shift_count, 0)}</TableCell>
                      <TableCell className="font-bold">{locationSummary.reduce((s, l) => s + l.total_hours, 0).toFixed(1)} hrs</TableCell>
                      <TableCell className="text-right font-bold text-lg">
                        {locationSummary.reduce((s, l) => s + l.total_amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} Lei
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center text-muted-foreground py-12">
                  <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No location data available.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="daily">
          <Card>
            <CardHeader>
              <CardTitle>Daily Payroll Breakdown</CardTitle>
              <CardDescription>Individual shift payments with attendance status</CardDescription>
            </CardHeader>
            <CardContent>
              {dailyEntries.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Scheduled</TableHead>
                      <TableHead>Actual</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Daily Pay</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailyEntries
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((entry, idx) => (
                        <TableRow key={`${entry.shift_id}-${idx}`}>
                          <TableCell>{format(new Date(entry.date), "MMM d, yyyy")}</TableCell>
                          <TableCell className="font-medium">{entry.employee_name}</TableCell>
                          <TableCell>{entry.location_name}</TableCell>
                          <TableCell>{entry.scheduled_hours.toFixed(1)}h</TableCell>
                          <TableCell>
                            {entry.actual_hours > 0 ? `${entry.actual_hours.toFixed(1)}h` : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {entry.is_missed && (
                                <Badge variant="destructive" className="text-xs">
                                  Missed (No pay)
                                </Badge>
                              )}
                              {entry.is_late && !entry.is_missed && (
                                <Badge variant="destructive" className="text-xs">
                                  +{entry.late_minutes}m late
                                </Badge>
                              )}
                              {entry.auto_clocked_out && !entry.is_missed && (
                                <Badge variant="secondary" className="text-xs">Auto</Badge>
                              )}
                              {!entry.is_late && !entry.auto_clocked_out && entry.actual_hours > 0 && !entry.is_missed && (
                                <Badge variant="outline" className="text-xs text-green-600 border-green-300">Checked in</Badge>
                              )}
                              {entry.actual_hours === 0 && !entry.is_missed && !entry.requires_checkin && (
                                <Badge variant="outline" className="text-xs text-muted-foreground">No tracking</Badge>
                              )}
                              {entry.actual_hours === 0 && !entry.is_missed && entry.requires_checkin && (
                                <Badge variant="destructive" className="text-xs">
                                  Missed (No pay)
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {entry.is_missed ? (
                              <span className="text-red-600">0.00 Lei</span>
                            ) : (
                              <span>{entry.daily_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} Lei</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center text-muted-foreground py-12">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No daily entries found.</p>
                  <p className="text-sm mt-2">Create a pay period and assign shifts to see daily payroll.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Payroll History</CardTitle>
              <CardDescription>View past pay periods</CardDescription>
            </CardHeader>
            <CardContent>
              {periods.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {periods.map((period) => (
                      <TableRow key={period.id}>
                        <TableCell>
                          {format(new Date(period.start_date), "MMM d")} - {format(new Date(period.end_date), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge variant={period.status === "active" ? "default" : "secondary"}>
                            {period.status === "active" && <Clock className="h-3 w-3 mr-1" />}
                            {period.status === "completed" && <CheckCircle className="h-3 w-3 mr-1" />}
                            {period.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{format(new Date(period.created_at), "MMM d, yyyy")}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">View</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center text-muted-foreground py-12">
                  <p>No payroll history available.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <PayPeriodDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleCreatePeriod}
        isLoading={createPeriod.isPending}
      />
    </div>
  );
};

export default Payroll;