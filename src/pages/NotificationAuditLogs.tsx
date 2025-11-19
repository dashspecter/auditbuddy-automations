import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { FileText, Clock, User, Target, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AuditLog {
  id: string;
  notification_id: string;
  action: string;
  performed_by: string;
  performed_at: string;
  metadata: any;
  target_roles: string[];
  user_email?: string;
}

export default function NotificationAuditLogs() {
  const { data: roleData } = useUserRole();

  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ['notification_audit_logs'],
    queryFn: async () => {
      const { data: logs, error } = await supabase
        .from('notification_audit_logs')
        .select(`
          *,
          profiles!notification_audit_logs_performed_by_fkey(email)
        `)
        .order('performed_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      return logs.map((log: any) => ({
        ...log,
        user_email: log.profiles?.email || 'Unknown User',
      })) as AuditLog[];
    },
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'created':
        return <Badge variant="default">Created</Badge>;
      case 'scheduled':
        return <Badge variant="secondary">Scheduled</Badge>;
      case 'deleted':
        return <Badge variant="destructive">Deleted</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  if (!roleData?.isAdmin && !roleData?.isManager) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>
                You don&apos;t have permission to view notification audit logs.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Link to="/notifications">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <FileText className="h-8 w-8" />
                Notification Audit Logs
              </h1>
              <p className="text-muted-foreground">
                Track notification history and who sent what
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                View all notification actions performed in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No audit logs found</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>Notification</TableHead>
                        <TableHead>Target Roles</TableHead>
                        <TableHead>Performed By</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>{getActionBadge(log.action)}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium">{log.metadata?.title || 'Untitled'}</p>
                              {log.metadata?.type && (
                                <Badge variant="outline" className="text-xs">
                                  {log.metadata.type}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {log.target_roles?.map((role) => (
                                <Badge key={role} variant="secondary" className="text-xs">
                                  {role.charAt(0).toUpperCase() + role.slice(1)}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{log.user_email}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              {format(new Date(log.performed_at), "PPp")}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
