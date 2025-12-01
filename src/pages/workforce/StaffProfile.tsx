import { useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useEmployees } from "@/hooks/useEmployees";
import { useStaffEvents } from "@/hooks/useStaffEvents";
import { useAttendanceLogs } from "@/hooks/useAttendanceLogs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Mail, Phone, Calendar, DollarSign, MapPin, TrendingUp } from "lucide-react";
import { format } from "date-fns";

const StaffProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { data: staff } = useEmployees();
  const { data: events } = useStaffEvents(id);
  const { data: attendanceLogs } = useAttendanceLogs();
  
  const member = staff?.find((s) => s.id === id);
  const memberAttendance = attendanceLogs?.filter((log) => log.staff_id === id).slice(0, 10);

  if (!member) {
    return (
      <AppLayout>
        <div className="text-center py-12">Staff member not found.</div>
      </AppLayout>
    );
  }

  const initials = member.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <AppLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle className="text-2xl">{member.full_name}</CardTitle>
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

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Base Salary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                {member.base_salary || member.hourly_rate || "N/A"}
                {member.hourly_rate && <span className="text-sm text-muted-foreground">/hr</span>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                This Month Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0h</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Performance Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success" />
                N/A
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Last Shift
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
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

          <TabsContent value="attendance">
            <Card>
              <CardHeader>
                <CardTitle>Recent Attendance</CardTitle>
                <CardDescription>Last 10 attendance logs</CardDescription>
              </CardHeader>
              <CardContent>
                {memberAttendance && memberAttendance.length > 0 ? (
                  <div className="space-y-2">
                    {memberAttendance.map((log) => (
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
    </AppLayout>
  );
};

export default StaffProfile;
