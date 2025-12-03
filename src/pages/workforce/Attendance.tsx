import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, QrCode, Calendar, Tablet, Settings, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttendanceQRDialog } from "@/components/workforce/AttendanceQRDialog";
import { KioskManagementDialog } from "@/components/workforce/KioskManagementDialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAttendanceLogs } from "@/hooks/useAttendanceLogs";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInMinutes } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const Attendance = () => {
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [kioskDialogOpen, setKioskDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("today");

  const today = new Date().toISOString().split('T')[0];
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

  const { data: todayLogs = [], isLoading: todayLoading } = useAttendanceLogs(undefined, today);
  const { data: allLogs = [] } = useAttendanceLogs();

  // Filter logs by date range
  const weekLogs = useMemo(() => 
    allLogs.filter(log => {
      const logDate = log.check_in_at.split('T')[0];
      return logDate >= weekStart && logDate <= weekEnd;
    }), [allLogs, weekStart, weekEnd]);

  const monthLogs = useMemo(() => 
    allLogs.filter(log => {
      const logDate = log.check_in_at.split('T')[0];
      return logDate >= monthStart && logDate <= monthEnd;
    }), [allLogs, monthStart, monthEnd]);

  // Stats calculations
  const checkedInToday = todayLogs.length;
  const lateCheckIns = todayLogs.filter(log => log.is_late).length;
  
  const avgHours = useMemo(() => {
    const completedLogs = todayLogs.filter(log => log.check_out_at);
    if (completedLogs.length === 0) return 0;
    const totalMinutes = completedLogs.reduce((sum, log) => {
      return sum + differenceInMinutes(new Date(log.check_out_at!), new Date(log.check_in_at));
    }, 0);
    return (totalMinutes / completedLogs.length / 60).toFixed(1);
  }, [todayLogs]);

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
          <p>No attendance logs found.</p>
          <p className="text-sm mt-2">Attendance will appear as staff check in.</p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Clock In</TableHead>
            <TableHead>Clock Out</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map(log => (
            <TableRow key={log.id}>
              <TableCell className="font-medium">{log.employees?.full_name || 'Unknown'}</TableCell>
              <TableCell>{log.employees?.role || log.shifts?.role || '-'}</TableCell>
              <TableCell>{log.locations?.name || '-'}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {formatTime(log.check_in_at)}
                  {log.is_late && (
                    <Badge variant="destructive" className="text-xs">
                      +{log.late_minutes}m late
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {log.check_out_at ? formatTime(log.check_out_at) : '-'}
                  {log.auto_clocked_out && (
                    <Badge variant="secondary" className="text-xs">Auto</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>{formatDuration(log.check_in_at, log.check_out_at)}</TableCell>
              <TableCell>
                {log.check_out_at ? (
                  <Badge variant="outline" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Complete
                  </Badge>
                ) : (
                  <Badge variant="default" className="gap-1">
                    <Clock className="h-3 w-3" />
                    Working
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Attendance Tracking</h1>
          <p className="text-muted-foreground mt-1">
            Monitor staff check-ins, check-outs, and work hours
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="gap-2">
              <QrCode className="h-4 w-4" />
              Generate QR Code
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setQrDialogOpen(true)}>
              <QrCode className="h-4 w-4 mr-2" />
              Static QR Code (Print)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setKioskDialogOpen(true)}>
              <Tablet className="h-4 w-4 mr-2" />
              Dynamic Kiosk (Recommended)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setKioskDialogOpen(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Manage Kiosks
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AttendanceQRDialog open={qrDialogOpen} onOpenChange={setQrDialogOpen} />
      <KioskManagementDialog open={kioskDialogOpen} onOpenChange={setKioskDialogOpen} />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Checked In Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{checkedInToday}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              Late Check-ins
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
              Average Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgHours}h</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="week">This Week</TabsTrigger>
          <TabsTrigger value="month">This Month</TabsTrigger>
        </TabsList>
        <TabsContent value="today">
          <Card>
            <CardHeader>
              <CardTitle>Today's Attendance</CardTitle>
              <CardDescription>Real-time check-in status for {format(new Date(), 'MMMM d, yyyy')}</CardDescription>
            </CardHeader>
            <CardContent>
              {todayLoading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                renderAttendanceTable(todayLogs)
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="week">
          <Card>
            <CardHeader>
              <CardTitle>This Week's Attendance</CardTitle>
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
              <CardTitle>This Month's Attendance</CardTitle>
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
