import { useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Plus, Megaphone, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Notifications() {
  const { user } = useAuth();
  const { data: roleData } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"info" | "success" | "warning" | "announcement">("info");
  const [targetRoles, setTargetRoles] = useState<string[]>(["checker", "manager", "admin"]);
  const [expiresAt, setExpiresAt] = useState("");

  const { data: notifications = [] } = useQuery({
    queryKey: ['all_notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const createNotificationMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');

      // Managers can only create notifications for checkers
      if (roleData?.isManager && !roleData?.isAdmin) {
        if (!targetRoles.every(role => role === 'checker')) {
          throw new Error('Managers can only create notifications for Checkers');
        }
      }

      const { error } = await supabase.from('notifications').insert({
        title,
        message,
        type,
        target_roles: targetRoles,
        created_by: user.id,
        expires_at: expiresAt || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Notification created",
        description: "Your notification has been sent successfully.",
      });
      setTitle("");
      setMessage("");
      setType("info");
      setTargetRoles(["checker", "manager", "admin"]);
      setExpiresAt("");
      queryClient.invalidateQueries({ queryKey: ['all_notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Notification deleted",
        description: "The notification has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ['all_notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleRoleToggle = (role: string) => {
    setTargetRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    if (targetRoles.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one target role.",
        variant: "destructive",
      });
      return;
    }
    createNotificationMutation.mutate();
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
                You don't have permission to manage notifications.
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
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Megaphone className="h-8 w-8" />
              Manage Notifications
            </h1>
            <p className="text-muted-foreground">
              Create and manage in-app notifications for users
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Create New Notification</CardTitle>
              <CardDescription>
                Send announcements, updates, or important messages to users based on their roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="New Feature Available"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="We've added a new reporting feature to help you track compliance..."
                    rows={4}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select value={type} onValueChange={(value: any) => setType(value)}>
                      <SelectTrigger id="type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="success">Success</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="announcement">Announcement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expiresAt">Expires At (Optional)</Label>
                    <Input
                      id="expiresAt"
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Target Roles *</Label>
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="checker"
                        checked={targetRoles.includes("checker")}
                        onCheckedChange={() => handleRoleToggle("checker")}
                      />
                      <Label htmlFor="checker" className="cursor-pointer">
                        Checkers
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="manager"
                        checked={targetRoles.includes("manager")}
                        onCheckedChange={() => handleRoleToggle("manager")}
                        disabled={roleData?.isManager && !roleData?.isAdmin}
                      />
                      <Label htmlFor="manager" className="cursor-pointer">
                        Managers
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="admin"
                        checked={targetRoles.includes("admin")}
                        onCheckedChange={() => handleRoleToggle("admin")}
                        disabled={roleData?.isManager && !roleData?.isAdmin}
                      />
                      <Label htmlFor="admin" className="cursor-pointer">
                        Admins
                      </Label>
                    </div>
                  </div>
                  {roleData?.isManager && !roleData?.isAdmin && (
                    <p className="text-xs text-muted-foreground">
                      As a Manager, you can only send notifications to Checkers
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={createNotificationMutation.isPending}
                  className="w-full md:w-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {createNotificationMutation.isPending ? "Creating..." : "Create Notification"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Existing Notifications</CardTitle>
              <CardDescription>Manage previously created notifications</CardDescription>
            </CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No notifications created yet
                </p>
              ) : (
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="border rounded-lg p-4 flex items-start justify-between gap-4"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{notification.title}</h3>
                          <Badge variant="outline">{notification.type}</Badge>
                          {!notification.is_active && (
                            <Badge variant="destructive">Inactive</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {notification.message}
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span>
                            Created: {format(new Date(notification.created_at), "PPp")}
                          </span>
                          {notification.expires_at && (
                            <span>
                              • Expires: {format(new Date(notification.expires_at), "PPp")}
                            </span>
                          )}
                          <span>
                            • Roles:{" "}
                            {notification.target_roles
                              .map((r: string) => r.charAt(0).toUpperCase() + r.slice(1))
                              .join(", ")}
                          </span>
                        </div>
                      </div>
                      {roleData?.isAdmin && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Notification</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this notification? This action
                                cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteNotificationMutation.mutate(notification.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
