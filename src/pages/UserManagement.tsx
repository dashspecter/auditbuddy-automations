import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Search, Shield, User, UserPlus, Info, Activity, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/useUserRole";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { UserActivityDialog } from "@/components/UserActivityDialog";
import { UserAvatar } from "@/components/UserAvatar";

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface UserWithRoles extends UserProfile {
  roles: ('admin' | 'manager' | 'checker')[];
}

export default function UserManagement() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteRole, setInviteRole] = useState<'admin' | 'manager' | 'checker'>('checker');
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; email: string } | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRoles | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editFullName, setEditFullName] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserWithRoles | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: currentUserRole } = useUserRole();

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
          .map(role => role.role as 'admin' | 'manager' | 'checker'),
      }));

      return usersWithRoles;
    },
  });

  // Filter users based on search query
  const filteredUsers = users?.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    return (
      user.email.toLowerCase().includes(searchLower) ||
      user.full_name?.toLowerCase().includes(searchLower)
    );
  });

  // Mutation to change user role
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole, currentRoles }: { userId: string; newRole: 'admin' | 'manager' | 'checker'; currentRoles: ('admin' | 'manager' | 'checker')[] }) => {
      // Get current user to prevent self-demotion
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user?.id === userId && currentRoles.includes('admin') && newRole !== 'admin') {
        throw new Error('You cannot remove your own admin access');
      }

      // Remove all existing roles for this user
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // Add the new role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: newRole });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all_users'] });
      toast({
        title: "Role updated",
        description: "User role has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update role: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Mutation to update user
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, email, fullName }: { userId: string; email?: string; fullName?: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId, email, fullName }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all_users'] });
      toast({
        title: "User updated",
        description: "User information has been updated successfully.",
      });
      setEditDialogOpen(false);
      setEditingUser(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update user: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Mutation to delete user
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all_users'] });
      toast({
        title: "User deleted",
        description: "User has been deleted successfully.",
      });
      setDeleteDialogOpen(false);
      setDeletingUser(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete user: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 px-safe py-8 pb-safe">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">User Management</h1>
              <p className="text-muted-foreground">
                Manage users and assign roles
              </p>
            </div>
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite New User</DialogTitle>
                  <DialogDescription>
                    Create a new user account and assign their role.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="user@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Temporary Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Min. 6 characters"
                      value={invitePassword}
                      onChange={(e) => setInvitePassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={inviteRole} onValueChange={(value: 'admin' | 'manager' | 'checker') => setInviteRole(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="checker">Checker - Can conduct audits only</SelectItem>
                        {currentUserRole?.isAdmin && (
                          <>
                            <SelectItem value="manager">Manager - Can manage audits, templates, reports & checkers</SelectItem>
                            <SelectItem value="admin">Admin - Full access to everything</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={async () => {
                    if (!inviteEmail || !invitePassword) {
                      toast({
                        title: "Error",
                        description: "Please fill in all fields",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    try {
                      // Call Edge Function to create user (doesn't affect current session)
                      const { data: { session } } = await supabase.auth.getSession();
                      
                      const response = await fetch(
                        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
                        {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${session?.access_token}`,
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            email: inviteEmail,
                            password: invitePassword,
                            role: inviteRole,
                          }),
                        }
                      );

                      const result = await response.json();

                      if (!response.ok) {
                        // Handle duplicate email error specifically
                        if (result.error?.includes('already been registered')) {
                          throw new Error(`A user with email ${inviteEmail} already exists. Please use a different email address.`);
                        }
                        throw new Error(result.error || 'Failed to create user');
                      }

                      toast({
                        title: "User created",
                        description: `${inviteEmail} has been added. They can now log in with the password you provided.`,
                      });
                      
                      setInviteDialogOpen(false);
                      setInviteEmail("");
                      setInvitePassword("");
                      setInviteRole('checker');
                      queryClient.invalidateQueries({ queryKey: ['all_users'] });
                    } catch (error: any) {
                      // Close dialog and refresh list so user can see existing users
                      setInviteDialogOpen(false);
                      setInviteEmail("");
                      setInvitePassword("");
                      setInviteRole('checker');
                      queryClient.invalidateQueries({ queryKey: ['all_users'] });
                      
                      toast({
                        title: "Error",
                        description: error.message,
                        variant: "destructive",
                      });
                    }
                  }}>
                    Create User
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Role Permissions</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-1 text-sm">
                <div><strong>Admin:</strong> Full access - manage users, templates, and all audits</div>
                <div><strong>Manager:</strong> Can add audits, create templates, generate reports, add locations, and invite checkers</div>
                <div><strong>Checker:</strong> Can only complete/fill out audits (view and submit)</div>
              </div>
            </AlertDescription>
          </Alert>

          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {filteredUsers?.length || 0} users
            </div>
          </div>

          {isLoading ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Loading users...</p>
            </Card>
          ) : filteredUsers && filteredUsers.length > 0 ? (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">User</TableHead>
                      <TableHead className="min-w-[200px]">Email</TableHead>
                      <TableHead className="min-w-[150px]">Role</TableHead>
                      <TableHead className="min-w-[120px]">Joined</TableHead>
                      <TableHead className="min-w-[150px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <UserAvatar 
                            avatarUrl={user.avatar_url}
                            userName={user.full_name}
                            userEmail={user.email}
                            size="md"
                          />
                          <div>
                            <div className="font-medium">
                              {user.full_name || "No name"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {user.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Select 
                          value={user.roles[0] || 'checker'}
                          onValueChange={(value: 'admin' | 'manager' | 'checker') => {
                            updateRoleMutation.mutate({
                              userId: user.id,
                              newRole: value,
                              currentRoles: user.roles
                            });
                          }}
                          disabled={!currentUserRole?.isAdmin && (user.roles.includes('admin') || user.roles.includes('manager'))}
                        >
                          <SelectTrigger className="w-40 min-h-[44px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-50 bg-popover">
                            <SelectItem value="checker" className="min-h-[44px] cursor-pointer">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">Checker</Badge>
                              </div>
                            </SelectItem>
                            {currentUserRole?.isAdmin && (
                              <>
                                <SelectItem value="manager" className="min-h-[44px] cursor-pointer">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">Manager</Badge>
                                  </div>
                                </SelectItem>
                                <SelectItem value="admin" className="min-h-[44px] cursor-pointer">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="default" className="text-xs">Admin</Badge>
                                  </div>
                                </SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {format(new Date(user.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="min-h-[44px]"
                            onClick={() => {
                              setEditingUser(user);
                              setEditEmail(user.email);
                              setEditFullName(user.full_name || '');
                              setEditDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="min-h-[44px] text-destructive hover:text-destructive"
                            onClick={() => {
                              setDeletingUser(user);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="min-h-[44px]"
                            onClick={() => {
                              setSelectedUser({ id: user.id, email: user.email });
                              setActivityDialogOpen(true);
                            }}
                          >
                            <Activity className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </Card>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">
                {searchQuery ? "No users found matching your search" : "No users found"}
              </p>
            </Card>
          )}
          
          {selectedUser && (
            <UserActivityDialog
              userId={selectedUser.id}
              userEmail={selectedUser.email}
              open={activityDialogOpen}
              onOpenChange={setActivityDialogOpen}
            />
          )}

          {/* Edit User Dialog */}
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
                <DialogDescription>
                  Update user information
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-full-name">Full Name</Label>
                  <Input
                    id="edit-full-name"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="user@example.com"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    if (editingUser) {
                      updateUserMutation.mutate({
                        userId: editingUser.id,
                        email: editEmail !== editingUser.email ? editEmail : undefined,
                        fullName: editFullName !== editingUser.full_name ? editFullName : undefined,
                      });
                    }
                  }}
                  disabled={updateUserMutation.isPending}
                >
                  {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete User Dialog */}
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete User</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete {deletingUser?.full_name || deletingUser?.email}? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => {
                    if (deletingUser) {
                      deleteUserMutation.mutate(deletingUser.id);
                    }
                  }}
                  disabled={deleteUserMutation.isPending}
                >
                  {deleteUserMutation.isPending ? 'Deleting...' : 'Delete User'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
