import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCompany, useCompanyUsers, useUpdateCompany, useUpdateCompanyRole, useUpdatePlatformRole } from "@/hooks/useCompany";
import { Building2, Users, Puzzle, CreditCard, Settings, Pencil, Trash2, Clock, Shield, Key } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import IndustryModuleManagement from "@/components/settings/IndustryModuleManagement";
import { ShiftPresetsManagement } from "@/components/settings/ShiftPresetsManagement";
import { AutoClockoutSettings } from "@/components/settings/AutoClockoutSettings";
import { StaffVisibilitySettings } from "@/components/settings/StaffVisibilitySettings";
import { ClockInRemindersSettings } from "@/components/settings/ClockInRemindersSettings";
import { ClockInToggleSettings } from "@/components/settings/ClockInToggleSettings";
import { RolePermissionsManager } from "@/components/settings/RolePermissionsManager";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function CompanySettings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: company, isLoading: companyLoading } = useCompany();
  const { data: users = [], isLoading: usersLoading } = useCompanyUsers();
  const updateCompany = useUpdateCompany();
  const updateCompanyRole = useUpdateCompanyRole();
  const updatePlatformRole = useUpdatePlatformRole();

  const [companyName, setCompanyName] = useState("");
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "general");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editFullName, setEditFullName] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<any>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFullName, setInviteFullName] = useState("");
  const [inviteRole, setInviteRole] = useState<'company_member' | 'company_admin'>('company_member');
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordUser, setPasswordUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleCompanyRoleChange = (companyUserId: string, newRole: 'company_owner' | 'company_admin' | 'company_member') => {
    updateCompanyRole.mutate({ companyUserId, role: newRole });
  };

  const handlePlatformRoleToggle = (userId: string, role: 'admin' | 'manager' | 'checker' | 'hr', currentlyHas: boolean) => {
    updatePlatformRole.mutate({ 
      userId, 
      role, 
      action: currentlyHas ? 'remove' : 'add' 
    });
  };

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
      queryClient.invalidateQueries({ queryKey: ['company_users'] });
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

  // Mutation to remove user from company
  const removeUserMutation = useMutation({
    mutationFn: async (companyUserId: string) => {
      const { error } = await supabase
        .from('company_users')
        .delete()
        .eq('id', companyUserId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company_users'] });
      toast({
        title: "User removed",
        description: "User has been removed from the company.",
      });
      setDeleteDialogOpen(false);
      setDeletingUser(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to remove user: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Mutation to invite user to company
  const inviteUserMutation = useMutation({
    mutationFn: async ({ email, fullName, role }: { email: string; fullName: string; role: 'company_member' | 'company_admin' }) => {
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
            email, 
            full_name: fullName,
            companyRole: role,
            companyId: company?.id 
          }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to invite user');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company_users'] });
      toast({
        title: "User invited",
        description: "User has been added to your company.",
      });
      setInviteDialogOpen(false);
      setInviteEmail("");
      setInviteFullName("");
      setInviteRole('company_member');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to invite user: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Mutation to reset user password
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId, password }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Password updated",
        description: "User password has been changed successfully.",
      });
      setPasswordDialogOpen(false);
      setPasswordUser(null);
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update password: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  if (companyLoading) {
    return (
      <div className="space-y-4">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
    );
  }

  return (
    <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Company Settings</h1>
            <p className="text-muted-foreground">Manage your company profile and settings</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="general" className="gap-2">
              <Settings className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="modules" className="gap-2">
              <Puzzle className="h-4 w-4" />
              Modules
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="workforce" className="gap-2">
              <Clock className="h-4 w-4" />
              Workforce
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Billing
            </TabsTrigger>
            {company?.userRole === 'company_owner' && (
              <TabsTrigger value="permissions" className="gap-2">
                <Shield className="h-4 w-4" />
                Permissions
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>Update your company details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input
                    value={companyName || company?.name || ''}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder={company?.name}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company Slug</Label>
                  <Input value={company?.slug || ''} disabled />
                  <p className="text-sm text-muted-foreground">
                    Your company URL: dashspect.com/{company?.slug}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Badge variant="outline">{company?.status}</Badge>
                </div>
                <div className="space-y-2">
                  <Label>Subscription Tier</Label>
                  <Badge>{company?.subscription_tier}</Badge>
                </div>
                <Button
                  onClick={() => {
                    if (companyName && companyName !== company?.name) {
                      updateCompany.mutate({ name: companyName });
                    }
                  }}
                  disabled={!companyName || companyName === company?.name}
                >
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="modules">
            <IndustryModuleManagement />
          </TabsContent>

          <TabsContent value="workforce" className="space-y-6">
            <ClockInToggleSettings company={company} />
            <StaffVisibilitySettings company={company} />
            <ClockInRemindersSettings />
            <AutoClockoutSettings company={company} />
            <ShiftPresetsManagement />
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle>Company Users</CardTitle>
                  <CardDescription>Manage users in your company</CardDescription>
                </div>
                {company?.userRole === 'company_owner' && (
                  <Button onClick={() => setInviteDialogOpen(true)}>
                    Invite User
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {users.map((user) => (
                      <div
                        key={user.id}
                        className="p-4 border rounded-lg space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium">
                              {user.profiles?.full_name || user.profiles?.email}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {user.profiles?.email}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {company?.userRole === 'company_owner' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingUser(user);
                                    setEditEmail(user.profiles?.email || '');
                                    setEditFullName(user.profiles?.full_name || '');
                                    setEditDialogOpen(true);
                                  }}
                                  title="Edit user"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setPasswordUser(user);
                                    setNewPassword("");
                                    setConfirmPassword("");
                                    setPasswordDialogOpen(true);
                                  }}
                                  title="Set password"
                                >
                                  <Key className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => {
                                    setDeletingUser(user);
                                    setDeleteDialogOpen(true);
                                  }}
                                  title="Remove user"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {company?.userRole === 'company_owner' ? (
                              <Select
                                value={user.company_role}
                                onValueChange={(value) => handleCompanyRoleChange(user.id, value as 'company_owner' | 'company_admin' | 'company_member')}
                              >
                                <SelectTrigger className="w-[140px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="z-50 bg-background">
                                  <SelectItem value="company_owner">Owner</SelectItem>
                                  <SelectItem value="company_admin">Admin</SelectItem>
                                  <SelectItem value="company_member">Member</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge variant="outline" className="text-sm">
                                {user.company_role === 'company_owner' 
                                  ? 'Owner' 
                                  : user.company_role === 'company_admin'
                                  ? 'Admin'
                                  : 'Member'}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-4 pt-2 border-t flex-wrap">
                          <label className={`flex items-center gap-2 ${company?.userRole === 'company_owner' ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                            <Checkbox
                              checked={user.platform_roles?.includes('manager') || false}
                              onCheckedChange={() => handlePlatformRoleToggle(
                                user.user_id, 
                                'manager', 
                                user.platform_roles?.includes('manager') || false
                              )}
                              disabled={company?.userRole !== 'company_owner'}
                            />
                            <span className="text-sm">Manager</span>
                          </label>
                          <label className={`flex items-center gap-2 ${company?.userRole === 'company_owner' ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                            <Checkbox
                              checked={user.platform_roles?.includes('hr') || false}
                              onCheckedChange={() => handlePlatformRoleToggle(
                                user.user_id, 
                                'hr', 
                                user.platform_roles?.includes('hr') || false
                              )}
                              disabled={company?.userRole !== 'company_owner'}
                            />
                            <span className="text-sm">HR</span>
                          </label>
                          <label className={`flex items-center gap-2 ${company?.userRole === 'company_owner' ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                            <Checkbox
                              checked={user.platform_roles?.includes('checker') || false}
                              onCheckedChange={() => handlePlatformRoleToggle(
                                user.user_id, 
                                'checker', 
                                user.platform_roles?.includes('checker') || false
                              )}
                              disabled={company?.userRole !== 'company_owner'}
                            />
                            <span className="text-sm">Checker</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing">
            <Card>
              <CardHeader>
                <CardTitle>Billing & Subscription</CardTitle>
                <CardDescription>Manage your subscription and billing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Current Plan</p>
                      <p className="text-sm text-muted-foreground">
                        {company?.subscription_tier} tier
                      </p>
                    </div>
                    <Button onClick={() => navigate('/pricing')}>
                      View Plans
                    </Button>
                  </div>
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">
                      Visit our pricing page to change your subscription plan.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {company?.userRole === 'company_owner' && (
            <TabsContent value="permissions">
              <RolePermissionsManager />
            </TabsContent>
          )}
        </Tabs>

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
                      userId: editingUser.user_id,
                      email: editEmail !== editingUser.profiles?.email ? editEmail : undefined,
                      fullName: editFullName !== editingUser.profiles?.full_name ? editFullName : undefined,
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

        {/* Invite User Dialog */}
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite User to Company</DialogTitle>
              <DialogDescription>
                Add a new user to your company by email
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="invite-fullname">Full Name</Label>
                <Input
                  id="invite-fullname"
                  type="text"
                  value={inviteFullName}
                  onChange={(e) => setInviteFullName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email Address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">Company Role</Label>
                <Select
                  value={inviteRole}
                  onValueChange={(value) => setInviteRole(value as 'company_member' | 'company_admin')}
                >
                  <SelectTrigger id="invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company_member">Member</SelectItem>
                    <SelectItem value="company_admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (inviteEmail && inviteFullName) {
                    inviteUserMutation.mutate({ email: inviteEmail, fullName: inviteFullName, role: inviteRole });
                  }
                }}
                disabled={!inviteEmail || !inviteFullName || inviteUserMutation.isPending}
              >
                {inviteUserMutation.isPending ? 'Inviting...' : 'Invite User'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete User Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove User from Company</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove {deletingUser?.profiles?.full_name || deletingUser?.profiles?.email} from your company? They will no longer have access to company resources.
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
                    removeUserMutation.mutate(deletingUser.id);
                  }
                }}
                disabled={removeUserMutation.isPending}
              >
                {removeUserMutation.isPending ? 'Removing...' : 'Remove User'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Set Password Dialog */}
        <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set User Password</DialogTitle>
              <DialogDescription>
                Set a new password for {passwordUser?.profiles?.full_name || passwordUser?.profiles?.email}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                />
              </div>
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-sm text-destructive">Passwords do not match</p>
              )}
              {newPassword && newPassword.length < 6 && (
                <p className="text-sm text-destructive">Password must be at least 6 characters</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (passwordUser && newPassword && newPassword === confirmPassword && newPassword.length >= 6) {
                    resetPasswordMutation.mutate({
                      userId: passwordUser.user_id,
                      password: newPassword,
                    });
                  }
                }}
                disabled={!newPassword || newPassword !== confirmPassword || newPassword.length < 6 || resetPasswordMutation.isPending}
              >
                {resetPasswordMutation.isPending ? 'Updating...' : 'Set Password'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}