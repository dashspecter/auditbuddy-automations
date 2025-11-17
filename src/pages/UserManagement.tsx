import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Search, Shield, User, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

interface UserRole {
  user_id: string;
  role: 'admin' | 'checker';
}

interface UserActivity {
  location_audits: number;
  staff_audits: number;
  last_audit: string | null;
}

interface UserWithRoles extends UserProfile {
  roles: ('admin' | 'checker')[];
  activity?: UserActivity;
}

export default function UserManagement() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);

  // Fetch all users with their roles
  const { data: users, isLoading } = useQuery({
    queryKey: ['all_users'],
    queryFn: async () => {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Combine profiles with their roles
      const usersWithRoles: UserWithRoles[] = profiles.map(profile => ({
        ...profile,
        roles: roles
          .filter(role => role.user_id === profile.id)
          .map(role => role.role as 'admin' | 'checker'),
      }));

      return usersWithRoles;
    },
  });

  // Fetch user activity
  const { data: activityData } = useQuery({
    queryKey: ['user_activity', selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser) return null;

      // Get location audits count
      const { data: locationAudits, error: locationError } = await supabase
        .from('location_audits')
        .select('id, created_at', { count: 'exact' })
        .eq('user_id', selectedUser.id);

      if (locationError) throw locationError;

      // Get all audits for last activity
      const allAudits = [...(locationAudits || [])].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return {
        location_audits: locationAudits?.length || 0,
        staff_audits: 0, // Staff audits removed
        last_audit: allAudits.length > 0 ? allAudits[0].created_at : null,
      };
    },
    enabled: !!selectedUser,
  });

  // Toggle admin role mutation
  const toggleAdminMutation = useMutation({
    mutationFn: async ({ userId, hasAdmin }: { userId: string; hasAdmin: boolean }) => {
      if (hasAdmin) {
        // Remove admin role
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'admin');

        if (error) throw error;
      } else {
        // Add admin role
        const { error } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: 'admin',
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all_users'] });
      toast.success('User role updated successfully');
    },
    onError: (error) => {
      console.error('Error updating role:', error);
      toast.error('Failed to update user role');
    },
  });

  const handleToggleAdmin = (user: UserWithRoles) => {
    const hasAdmin = user.roles.includes('admin');
    toggleAdminMutation.mutate({ userId: user.id, hasAdmin });
  };

  const getInitials = (email: string, name: string | null) => {
    if (name) {
      const names = name.split(' ');
      return names.length > 1
        ? `${names[0][0]}${names[1][0]}`.toUpperCase()
        : name.substring(0, 2).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  const filteredUsers = users?.filter((user) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      user.email.toLowerCase().includes(searchLower) ||
      user.full_name?.toLowerCase().includes(searchLower)
    );
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
              <p className="text-muted-foreground">Loading users...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/admin/templates")}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Admin
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">User Management</h1>
          <p className="text-muted-foreground">
            Manage user accounts, roles, and permissions
          </p>
        </div>

        <Card className="p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="secondary" className="text-sm">
              {users?.length || 0} Total Users
            </Badge>
          </div>
        </Card>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Admin Access</TableHead>
                <TableHead>Activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {getInitials(user.email, user.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {user.full_name || 'N/A'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.email}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {user.roles.includes('admin') && (
                        <Badge variant="default" className="gap-1">
                          <Shield className="h-3 w-3" />
                          Admin
                        </Badge>
                      )}
                      {user.roles.includes('checker') && (
                        <Badge variant="secondary">Checker</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(user.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={user.roles.includes('admin')}
                      onCheckedChange={() => handleToggleAdmin(user)}
                      disabled={toggleAdminMutation.isPending}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedUser(user)}
                      className="gap-2"
                    >
                      <Activity className="h-4 w-4" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredUsers?.length === 0 && (
            <div className="text-center py-12">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No users found matching your search.</p>
            </div>
          )}
        </Card>

        {/* User Activity Dialog */}
        <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>User Activity</DialogTitle>
              <DialogDescription>
                Audit history and activity for {selectedUser?.email}
              </DialogDescription>
            </DialogHeader>

            {activityData && (
              <div className="space-y-4">
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Location Audits</span>
                    <span className="text-2xl font-bold">{activityData.location_audits}</span>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Total Audits</span>
                    <span className="text-2xl font-bold">
                      {activityData.location_audits}
                    </span>
                  </div>
                </Card>

                {activityData.last_audit && (
                  <Card className="p-4">
                    <div className="space-y-1">
                      <span className="text-sm text-muted-foreground">Last Activity</span>
                      <p className="text-sm font-medium">
                        {format(new Date(activityData.last_audit), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </Card>
                )}

                {!activityData.last_audit && (
                  <Card className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">No audit activity yet</p>
                  </Card>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
