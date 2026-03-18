import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, QrCode, Calendar as CalendarIcon, Tablet, Settings, AlertTriangle, CheckCircle2, MapPin, User, Edit } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttendanceQRDialog } from "@/components/workforce/AttendanceQRDialog";
import { KioskManagementDialog } from "@/components/workforce/KioskManagementDialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAttendanceLogs } from "@/hooks/useAttendanceLogs";
import { useLocations } from "@/hooks/useLocations";
import { useEmployees } from "@/hooks/useEmployees";
import { useTerminology } from "@/hooks/useTerminology";
import { useCan } from "@/hooks/useCan";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInMinutes, subDays } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { ManualCheckoutDialog } from "@/components/workforce/ManualCheckoutDialog";

const Attendance = () => {
  const { t } = useTranslation();
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [kioskDialogOpen, setKioskDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("today");
  const [selectedLocationId, setSelectedLocationId] = useState<string>("all");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all");
  const [manualCheckoutLog, setManualCheckoutLog] = useState<any>(null);
  const [customStartDate, setCustomStartDate] = useState<Date>(subDays(new Date(), 7));
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date());

  const { data: locations = [] } = useLocations();
  const { data: employees = [] } = useEmployees();
  const { can } = useCan();
  const canUpdateAttendance = can('update', 'attendance').allowed;

  const {
    employee: employeeTerm,
    employees: employeesTerm,
    location: locationTerm,
    locations: locationsTerm,
  } = useTerminology();
  const employeeLabel = employeeTerm();
  const employeesLabel = employeesTerm();
  const locationLabel = locationTerm();
  const locationsLabel = locationsTerm();
  const employeesLabelLower = employeesLabel.toLowerCase();
  const allLocationsLabel = `All ${locationsLabel}`;
  const allEmployeesLabel = `All ${employeesLabel}`;

  const today = new Date().toISOString().split('T')[0];
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');
  const customStart = format(customStartDate, 'yyyy-MM-dd');
  const customEnd = format(customEndDate, 'yyyy-MM-dd');

  const locationFilter = selectedLocationId === "all" ? undefined : selectedLocationId;

  // Server-side date-bounded queries per tab
  const { data: todayLogs = [], isLoading: todayLoading } = useAttendanceLogs(locationFilter, today);
  const { data: weekLogs = [], isLoading: weekLoading } = useAttendanceLogs(
    locationFilter, weekStart, weekEnd
  );
  const { data: monthLogs = [], isLoading: monthLoading } = useAttendanceLogs(
    locationFilter, monthStart, monthEnd
  );
  const { data: customLogs = [], isLoading: customLoading } = useAttendanceLogs(
    activeTab === "custom" ? locationFilter : "__disabled__",
    activeTab === "custom" ? customStart : undefined,
    activeTab === "custom" ? customEnd : undefined
  );

  // Filter logs by employee
  const filterByEmployee = (logs: typeof todayLogs) => {
    if (selectedEmployeeId === "all") return logs;
    return logs.filter(log => log.staff_id === selectedEmployeeId);
  };

  const filteredTodayLogs = useMemo(() => filterByEmployee(todayLogs), [todayLogs, selectedEmployeeId]);
  const filteredWeekLogs = useMemo(() => filterByEmployee(weekLogs), [weekLogs, selectedEmployeeId]);
  const filteredMonthLogs = useMemo(() => filterByEmployee(monthLogs), [monthLogs, selectedEmployeeId]);
  const filteredCustomLogs = useMemo(() => filterByEmployee(customLogs), [customLogs, selectedEmployeeId]);

  // Stats calculations (always from today)
  const checkedInToday = filteredTodayLogs.length;
  const lateCheckIns = filteredTodayLogs.filter(log => log.is_late).length;
  
  const avgHours = useMemo(() => {
    const completedLogs = filteredTodayLogs.filter(log => log.check_out_at);
    if (completedLogs.length === 0) return 0;
    const totalMinutes = completedLogs.reduce((sum, log) => {
      return sum + differenceInMinutes(new Date(log.check_out_at!), new Date(log.check_in_at));
    }, 0);
    return (totalMinutes / completedLogs.length / 60).toFixed(1);
  }, [filteredTodayLogs]);

  const formatTime = (dateStr: string) => format(new Date(dateStr), 'HH:mm');
  const formatDuration = (checkIn: string, checkOut: string | null) => {
    if (!checkOut) return '-';
    const minutes = differenceInMinutes(new Date(checkOut), new Date(checkIn));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const renderAttendanceTable = (logs: typeof todayLogs) => {
    if (logs.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-12">
          <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{t('workforce.attendance.noLogs')}</p>
          <p className="text-sm mt-2">
            {t('workforce.attendance.logsWillAppear', `${employeesLabel} attendance logs will appear here`) }
          </p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{employeeLabel}</TableHead>
            <TableHead>{t('workforce.attendance.role')}</TableHead>
            <TableHead>{locationLabel}</TableHead>
            <TableHead>{t('workforce.attendance.clockIn')}</TableHead>
            <TableHead>{t('workforce.attendance.clockOut')}</TableHead>
            <TableHead>{t('workforce.attendance.duration')}</TableHead>
            <TableHead>{t('workforce.attendance.status')}</TableHead>
            {canUpdateAttendance && <TableHead className="w-10"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map(log => (
            <TableRow key={log.id}>
              <TableCell className="font-medium">{log.employees?.full_name || t('common.unknown')}</TableCell>
              <TableCell>{log.employees?.role || log.shifts?.role || '-'}</TableCell>
              <TableCell>{log.locations?.name || '-'}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {formatTime(log.check_in_at)}
                  {log.is_late && (
                    <Badge variant="destructive" className="text-xs">
                      +{log.late_minutes}m {t('workforce.attendance.late')}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {log.check_out_at ? formatTime(log.check_out_at) : '-'}
                  {log.auto_clocked_out && (
                    <Badge variant="secondary" className="text-xs">{t('workforce.attendance.auto')}</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>{formatDuration(log.check_in_at, log.check_out_at)}</TableCell>
              <TableCell>
                {log.check_out_at ? (
                  <Badge variant="outline" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {t('workforce.attendance.complete')}
                  </Badge>
                ) : (
                  <Badge variant="default" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {t('workforce.attendance.working')}
                  </Badge>
                )}
              </TableCell>
              {canUpdateAttendance && (
                <TableCell>
                  {(!log.check_out_at || log.auto_clocked_out) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Manual check-out"
                      onClick={() => setManualCheckoutLog(log)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const renderLoadingOrTable = (logs: typeof todayLogs, isLoading: boolean) => {
    if (isLoading) {
      return <div className="text-center py-8">{t('common.loading')}</div>;
    }
    return renderAttendanceTable(logs);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t('workforce.attendance.title')}</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            {`Monitor ${employeesLabelLower} check-ins, check-outs, and work hours`}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <MapPin className="h-4 w-4 mr-2" />
              <SelectValue placeholder={allLocationsLabel} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{allLocationsLabel}</SelectItem>
              {locations.map(location => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <User className="h-4 w-4 mr-2" />
              <SelectValue placeholder={allEmployeesLabel} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{allEmployeesLabel}</SelectItem>
              {employees.map(emp => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="gap-2 w-full sm:w-auto">
              <QrCode className="h-4 w-4" />
              {t('workforce.attendance.generateQR')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setQrDialogOpen(true)}>
              <QrCode className="h-4 w-4 mr-2" />
              {t('workforce.attendance.staticQR')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setKioskDialogOpen(true)}>
              <Tablet className="h-4 w-4 mr-2" />
              {t('workforce.attendance.dynamicKiosk')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setKioskDialogOpen(true)}>
              <Settings className="h-4 w-4 mr-2" />
              {t('workforce.attendance.manageKiosks')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>

      <AttendanceQRDialog open={qrDialogOpen} onOpenChange={setQrDialogOpen} />
      <KioskManagementDialog open={kioskDialogOpen} onOpenChange={setKioskDialogOpen} />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('workforce.attendance.checkedInToday')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{checkedInToday}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              {t('workforce.attendance.lateCheckIns')}
              {lateCheckIns > 0 && <AlertTriangle className="h-4 w-4 text-warning" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${lateCheckIns > 0 ? 'text-warning' : ''}`}>
              {lateCheckIns}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('workforce.attendance.averageHours')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgHours}h</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="today">{t('workforce.attendance.today')}</TabsTrigger>
          <TabsTrigger value="week">{t('workforce.attendance.thisWeek')}</TabsTrigger>
          <TabsTrigger value="month">{t('workforce.attendance.thisMonth')}</TabsTrigger>
          <TabsTrigger value="custom">Custom</TabsTrigger>
        </TabsList>
        <TabsContent value="today">
          <Card>
            <CardHeader>
              <CardTitle>{t('workforce.attendance.todayAttendance')}</CardTitle>
              <CardDescription>{t('workforce.attendance.realTimeStatus')} {format(new Date(), 'MMMM d, yyyy')}</CardDescription>
            </CardHeader>
            <CardContent>
              {renderLoadingOrTable(filteredTodayLogs, todayLoading)}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="week">
          <Card>
            <CardHeader>
              <CardTitle>{t('workforce.attendance.weekAttendance')}</CardTitle>
              <CardDescription>{format(new Date(weekStart), 'MMM d')} - {format(new Date(weekEnd), 'MMM d, yyyy')}</CardDescription>
            </CardHeader>
            <CardContent>
              {renderLoadingOrTable(filteredWeekLogs, weekLoading)}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="month">
          <Card>
            <CardHeader>
              <CardTitle>{t('workforce.attendance.monthAttendance')}</CardTitle>
              <CardDescription>{format(new Date(), 'MMMM yyyy')}</CardDescription>
            </CardHeader>
            <CardContent>
              {renderLoadingOrTable(filteredMonthLogs, monthLoading)}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="custom">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Custom Range</CardTitle>
                  <CardDescription>
                    {format(customStartDate, 'MMM d, yyyy')} — {format(customEndDate, 'MMM d, yyyy')}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !customStartDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(customStartDate, 'MMM d, yyyy')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customStartDate}
                        onSelect={(d) => d && setCustomStartDate(d)}
                        disabled={(d) => d > customEndDate || d > new Date()}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="text-muted-foreground">→</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !customEndDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(customEndDate, 'MMM d, yyyy')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customEndDate}
                        onSelect={(d) => d && setCustomEndDate(d)}
                        disabled={(d) => d < customStartDate || d > new Date()}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {renderLoadingOrTable(filteredCustomLogs, customLoading)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ManualCheckoutDialog
        open={!!manualCheckoutLog}
        onOpenChange={(open) => { if (!open) setManualCheckoutLog(null); }}
        log={manualCheckoutLog}
      />
    </div>
  );
};

export default Attendance;
