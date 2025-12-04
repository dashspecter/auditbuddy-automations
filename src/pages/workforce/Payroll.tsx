import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, Calendar, CheckCircle, Clock, Users, MapPin, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePayrollPeriods, usePayrollSummary, useCreatePayrollPeriod } from "@/hooks/usePayroll";
import { useLocations } from "@/hooks/useLocations";
import { PayPeriodDialog } from "@/components/workforce/PayPeriodDialog";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
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
  const { data: periods = [], isLoading: periodsLoading } = usePayrollPeriods();
  const { data: locations = [] } = useLocations();
  const createPeriod = useCreatePayrollPeriod();

  const activePeriod = periods.find(p => p.status === "active");
  const locationFilter = selectedLocationId === "all" ? undefined : selectedLocationId;
  
  // Use shifts-based payroll calculation with location filter
  const { data: payrollSummary = [], entries: dailyEntries = [], locationSummary = [], isLoading: payrollLoading } = usePayrollSummary(
    activePeriod?.start_date,
    activePeriod?.end_date,
    locationFilter
  );
  
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
                        <TableHead>Employee</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Days</TableHead>
                        <TableHead>Expected</TableHead>
                        <TableHead>Shifts +/-</TableHead>
                        <TableHead>Scheduled</TableHead>
                        <TableHead>Actual</TableHead>
                        <TableHead>Hours +/-</TableHead>
                        <TableHead>Late</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead className="text-right">Total Pay</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payrollSummary.map((item) => (
                        <TableRow key={item.employee_id}>
                          <TableCell className="font-medium">{item.employee_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.role}</Badge>
                          </TableCell>
                          <TableCell>{item.days_worked}</TableCell>
                          <TableCell>
                            {item.expected_shifts_per_week ? (
                              <span className="text-muted-foreground">{item.expected_shifts_per_week}/wk</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {item.extra_shifts > 0 && (
                              <Badge variant="default" className="bg-green-500">
                                +{item.extra_shifts}
                              </Badge>
                            )}
                            {item.missing_shifts > 0 && (
                              <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                                -{item.missing_shifts}
                              </Badge>
                            )}
                            {item.extra_shifts === 0 && item.missing_shifts === 0 && (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{item.scheduled_hours.toFixed(1)}h</TableCell>
                          <TableCell>{item.actual_hours.toFixed(1)}h</TableCell>
                          <TableCell>
                            {item.overtime_hours > 0 && (
                              <Badge variant="default" className="bg-green-500">
                                +{item.overtime_hours.toFixed(1)}h
                              </Badge>
                            )}
                            {item.undertime_hours > 0 && (
                              <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                                -{item.undertime_hours.toFixed(1)}h
                              </Badge>
                            )}
                            {item.overtime_hours === 0 && item.undertime_hours === 0 && (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {item.late_count > 0 ? (
                              <Badge variant="destructive">{item.late_count}x ({item.total_late_minutes}m)</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{item.hourly_rate} Lei/hr</TableCell>
                          <TableCell className="text-right font-bold">
                            {item.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} Lei
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={5} className="font-bold">Total</TableCell>
                        <TableCell className="font-bold">{totalScheduledHours.toFixed(1)}h</TableCell>
                        <TableCell className="font-bold">{totalActualHours.toFixed(1)}h</TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
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
                            <div className="flex gap-1">
                              {entry.is_late && (
                                <Badge variant="destructive" className="text-xs">
                                  +{entry.late_minutes}m late
                                </Badge>
                              )}
                              {entry.auto_clocked_out && (
                                <Badge variant="secondary" className="text-xs">Auto</Badge>
                              )}
                              {!entry.is_late && !entry.auto_clocked_out && entry.actual_hours > 0 && (
                                <Badge variant="outline" className="text-xs">OK</Badge>
                              )}
                              {entry.actual_hours === 0 && (
                                <Badge variant="secondary" className="text-xs">No attendance</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {entry.daily_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} Lei
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