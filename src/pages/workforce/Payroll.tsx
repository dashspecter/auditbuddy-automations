import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, Calendar, CheckCircle, Clock, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePayrollPeriods, usePayrollSummary, useCreatePayrollPeriod } from "@/hooks/usePayroll";
import { useEmployees } from "@/hooks/useEmployees";
import { PayPeriodDialog } from "@/components/workforce/PayPeriodDialog";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

const Payroll = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: periods = [], isLoading: periodsLoading } = usePayrollPeriods();
  const { data: employees = [] } = useEmployees();
  const createPeriod = useCreatePayrollPeriod();

  const activePeriod = periods.find(p => p.status === "active");
  
  // Use shifts-based payroll calculation
  const { data: payrollSummary = [], entries: dailyEntries = [], isLoading: payrollLoading } = usePayrollSummary(
    activePeriod?.start_date,
    activePeriod?.end_date
  );
  
  const currentPeriodTotal = payrollSummary.reduce((sum, item) => sum + item.total_amount, 0);
  const totalHours = payrollSummary.reduce((sum, item) => sum + item.total_hours, 0);
  
  // Calculate YTD from completed periods
  const ytdTotal = periods
    .filter(p => p.status === "completed")
    .reduce((sum) => sum + 0, 0); // Would need to store totals on periods

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
            Calculate pay from daily shifts × hourly rates
          </p>
        </div>
        <Button className="gap-2" onClick={() => setDialogOpen(true)}>
          <Calendar className="h-4 w-4" />
          Create Pay Period
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
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
              Total Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours.toFixed(1)} hrs</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Staff Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payrollSummary.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Next Payment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activePeriod ? format(new Date(activePeriod.end_date), "MMM d") : "-"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="current">
        <TabsList>
          <TabsTrigger value="current">Current Period</TabsTrigger>
          <TabsTrigger value="daily">Daily Breakdown</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="current">
          <Card>
            <CardHeader>
              <CardTitle>Current Pay Period - Staff Summary</CardTitle>
              <CardDescription>
                {activePeriod 
                  ? `${format(new Date(activePeriod.start_date), "MMMM d")} - ${format(new Date(activePeriod.end_date), "MMMM d, yyyy")}`
                  : "No active period"}
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
                        <TableHead>Days Worked</TableHead>
                        <TableHead>Total Hours</TableHead>
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
                          <TableCell>{item.total_hours.toFixed(1)} hrs</TableCell>
                          <TableCell>{item.hourly_rate} Lei/hr</TableCell>
                          <TableCell className="text-right font-bold">
                            {item.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} Lei
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={3} className="font-bold">Total</TableCell>
                        <TableCell className="font-bold">{totalHours.toFixed(1)} hrs</TableCell>
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

        <TabsContent value="daily">
          <Card>
            <CardHeader>
              <CardTitle>Daily Payroll Breakdown</CardTitle>
              <CardDescription>Individual shift payments (hours × hourly rate)</CardDescription>
            </CardHeader>
            <CardContent>
              {dailyEntries.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Rate</TableHead>
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
                          <TableCell>
                            <Badge variant="outline">{entry.role}</Badge>
                          </TableCell>
                          <TableCell>{entry.hours.toFixed(1)} hrs</TableCell>
                          <TableCell>{entry.hourly_rate} Lei/hr</TableCell>
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
