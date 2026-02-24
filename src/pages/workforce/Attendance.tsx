import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, QrCode, Calendar, Tablet, Settings, AlertTriangle, CheckCircle2, XCircle, MapPin, User } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttendanceQRDialog } from "@/components/workforce/AttendanceQRDialog";
import { KioskManagementDialog } from "@/components/workforce/KioskManagementDialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAttendanceLogs } from "@/hooks/useAttendanceLogs";
import { useLocations } from "@/hooks/useLocations";
import { useEmployees } from "@/hooks/useEmployees";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInMinutes } from "date-fns";
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

const Attendance = () => {
  const { t } = useTranslation();
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [kioskDialogOpen, setKioskDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("today");
  const [selectedLocationId, setSelectedLocationId] = useState<string>("all");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all");

  const { data: locations = [] } = useLocations();
  const { data: employees = [] } = useEmployees();

  const today = new Date().toISOString().split('T')[0];
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

  const locationFilter = selectedLocationId === "all" ? undefined : selectedLocationId;
  const { data: todayLogs = [], isLoading: todayLoading } = useAttendanceLogs(locationFilter, today);
  const { data: allLogs = [] } = useAttendanceLogs(locationFilter);

  // Filter logs by employee
  const filterByEmployee = (logs: typeof todayLogs) => {
    if (selectedEmployeeId === "all") return logs;
    return logs.filter(log => log.staff_id === selectedEmployeeId);
  };

  // Filter logs by date range
  const weekLogs = useMemo(() => 
    filterByEmployee(allLogs.filter(log => {
      const logDate = log.check_in_at.split('T')[0];
      return logDate >= weekStart && logDate <= weekEnd;
    })), [allLogs, weekStart, weekEnd, selectedEmployeeId]);

  const monthLogs = useMemo(() => 
    filterByEmployee(allLogs.filter(log => {
      const logDate = log.check_in_at.split('T')[0];
      return logDate >= monthStart && logDate <= monthEnd;
    })), [allLogs, monthStart, monthEnd, selectedEmployeeId]);

  const filteredTodayLogs = useMemo(() => filterByEmployee(todayLogs), [todayLogs, selectedEmployeeId]);

  // Stats calculations
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
          <p className="text-sm mt-2">{t('workforce.attendance.logsWillAppear')}</p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('workforce.attendance.employee')}</TableHead>
            <TableHead>{t('workforce.attendance.role')}</TableHead>
            <TableHead>{t('workforce.attendance.location')}</TableHead>
            <TableHead>{t('workforce.attendance.clockIn')}</TableHead>
            <TableHead>{t('workforce.attendance.clockOut')}</TableHead>
            <TableHead>{t('workforce.attendance.duration')}</TableHead>
            <TableHead>{t('workforce.attendance.status')}</TableHead>
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
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t('workforce.attendance.title')}</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            {t('workforce.attendance.subtitle')}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <MapPin className="h-4 w-4 mr-2" />
              <SelectValue placeholder={t('workforce.attendance.allLocations')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('workforce.attendance.allLocations')}</SelectItem>
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
              <SelectValue placeholder={t('workforce.attendance.allEmployees', 'All Employees')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('workforce.attendance.allEmployees', 'All Employees')}</SelectItem>
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
        </TabsList>
        <TabsContent value="today">
          <Card>
            <CardHeader>
              <CardTitle>{t('workforce.attendance.todayAttendance')}</CardTitle>
              <CardDescription>{t('workforce.attendance.realTimeStatus')} {format(new Date(), 'MMMM d, yyyy')}</CardDescription>
            </CardHeader>
            <CardContent>
              {todayLoading ? (
                <div className="text-center py-8">{t('common.loading')}</div>
              ) : (
                renderAttendanceTable(filteredTodayLogs)
              )}
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
              {renderAttendanceTable(weekLogs)}
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
              {renderAttendanceTable(monthLogs)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Attendance;
