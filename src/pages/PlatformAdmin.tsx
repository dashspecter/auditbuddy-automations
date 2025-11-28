import { useState } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Clock, Building2, Users, Shield, UserPlus, Trash2 } from "lucide-react";
import { format, addDays } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Company {
  id: string;
  name: string;
  slug: string;
  status: string;
  subscription_tier: string;
  trial_ends_at: string | null;
  created_at: string;
}

interface UserWithRoles {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  roles: { role: string }[];
}

export default function PlatformAdmin() {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [daysToAdd, setDaysToAdd] = useState(7);
  const [addAdminEmail, setAddAdminEmail] = useState("");
  const [showAddAdminDialog, setShowAddAdminDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all companies
  const { data: companies, isLoading } = useQuery({
    queryKey: ['all-companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Company[];
    },
  });

  // Fetch all users with their roles
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['all-users-with-roles'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch roles for each user
      const usersWithRoles = await Promise.all(
        profiles.map(async (profile) => {
          const { data: roles, error: rolesError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.id);

          if (rolesError) throw rolesError;

          return {
            ...profile,
            roles: roles || [],
          };
        })
      );

      return usersWithRoles as UserWithRoles[];
    },
  });

  // Add admin role mutation
  const addAdminMutation = useMutation({
    mutationFn: async (email: string) => {
      // Find user by email
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (profileError) throw new Error('User not found');

      // Check if user already has admin role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', profiles.id)
        .eq('role', 'admin')
        .single();

      if (existingRole) {
        throw new Error('User is already an admin');
      }

      // Add admin role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: profiles.id, role: 'admin' });

      if (roleError) throw roleError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users-with-roles'] });
      toast({
        title: "Success",
        description: "Admin role added successfully",
      });
      setAddAdminEmail("");
      setShowAddAdminDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove admin role mutation
  const removeAdminMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'admin');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users-with-roles'] });
      toast({
        title: "Success",
        description: "Admin role removed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Extend trial mutation
  const extendTrialMutation = useMutation({
    mutationFn: async ({ companyId, days }: { companyId: string; days: number }) => {
      const company = companies?.find(c => c.id === companyId);
      if (!company) throw new Error('Company not found');

      const currentTrialEnd = company.trial_ends_at 
        ? new Date(company.trial_ends_at)
        : new Date();
      
      const newTrialEnd = addDays(currentTrialEnd, days);

      const { error } = await supabase
        .from('companies')
        .update({ 
          trial_ends_at: newTrialEnd.toISOString(),
          status: 'active' // Reactivate if paused
        })
        .eq('id', companyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-companies'] });
      toast({
        title: "Success",
        description: `Trial extended by ${daysToAdd} days`,
      });
      setSelectedCompany(null);
      setDaysToAdd(7);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleExtendTrial = () => {
    if (!selectedCompany) return;
    extendTrialMutation.mutate({ companyId: selectedCompany.id, days: daysToAdd });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: "default",
      paused: "destructive",
      suspended: "secondary",
    } as const;
    return <Badge variant={variants[status as keyof typeof variants] || "secondary"}>{status}</Badge>;
  };

  const getTrialStatus = (company: Company) => {
    if (!company.trial_ends_at) return 'No trial';
    
    const trialEnd = new Date(company.trial_ends_at);
    const now = new Date();
    const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft < 0) {
      return <span className="text-destructive">Expired {Math.abs(daysLeft)} days ago</span>;
    } else if (daysLeft === 0) {
      return <span className="text-warning">Expires today</span>;
    } else if (daysLeft <= 3) {
      return <span className="text-warning">{daysLeft} days left</span>;
    } else {
      return <span className="text-muted-foreground">{daysLeft} days left</span>;
    }
  };

  if (isLoading || usersLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Platform Administration</h1>
          <p className="text-muted-foreground">Manage company trials, subscriptions, and platform administrators</p>
        </div>

        <Tabs defaultValue="companies" className="space-y-6">
          <TabsList>
            <TabsTrigger value="companies" className="gap-2">
              <Building2 className="h-4 w-4" />
              Companies
            </TabsTrigger>
            <TabsTrigger value="admins" className="gap-2">
              <Shield className="h-4 w-4" />
              Platform Admins
            </TabsTrigger>
          </TabsList>

          <TabsContent value="companies">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  All Companies
                </CardTitle>
                <CardDescription>
                  {companies?.length || 0} companies registered
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {companies?.map((company) => (
                    <Card key={company.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-lg">{company.name}</h3>
                              {getStatusBadge(company.status)}
                              <Badge variant="outline">{company.subscription_tier}</Badge>
                            </div>
                            
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                <span>/{company.slug}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>Created {format(new Date(company.created_at), 'MMM d, yyyy')}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                {company.trial_ends_at ? (
                                  <>
                                    Trial ends {format(new Date(company.trial_ends_at), 'MMM d, yyyy')}
                                    <span className="ml-2">({getTrialStatus(company)})</span>
                                  </>
                                ) : (
                                  <span>No trial set</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedCompany(company)}
                          >
                            Extend Trial
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admins">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Platform Administrators
                    </CardTitle>
                    <CardDescription>
                      {users?.filter(u => u.roles.some(r => r.role === 'admin')).length || 0} platform administrators
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowAddAdminDialog(true)} size="sm" className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Add Admin
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users?.filter(u => u.roles.some(r => r.role === 'admin')).map((user) => (
                    <Card key={user.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold">{user.full_name || 'No name'}</h3>
                              <Badge variant="default" className="gap-1">
                                <Shield className="h-3 w-3" />
                                Admin
                              </Badge>
                            </div>
                            
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                <span>{user.email}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>Added {format(new Date(user.created_at), 'MMM d, yyyy')}</span>
                              </div>
                            </div>
                          </div>

                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Remove admin access for ${user.email}?`)) {
                                removeAdminMutation.mutate(user.id);
                              }
                            }}
                            className="gap-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove Admin
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {users?.filter(u => u.roles.some(r => r.role === 'admin')).length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No platform administrators yet</p>
                      <p className="text-sm mt-2">Add your first admin to manage the platform</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Extend Trial Dialog */}
      <Dialog open={!!selectedCompany} onOpenChange={(open) => !open && setSelectedCompany(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Trial Period</DialogTitle>
            <DialogDescription>
              Add additional trial time for {selectedCompany?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedCompany?.trial_ends_at && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Current trial end date</p>
                <p className="font-medium">
                  {format(new Date(selectedCompany.trial_ends_at), 'MMMM d, yyyy')}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {getTrialStatus(selectedCompany)}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="days">Days to add</Label>
              <Input
                id="days"
                type="number"
                min="1"
                max="365"
                value={daysToAdd}
                onChange={(e) => setDaysToAdd(parseInt(e.target.value) || 7)}
              />
              <p className="text-xs text-muted-foreground">
                Common values: 7 days (1 week), 14 days (2 weeks), 30 days (1 month)
              </p>
            </div>

            {selectedCompany?.trial_ends_at && (
              <div className="p-3 bg-primary/10 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">New trial end date</p>
                <p className="font-medium">
                  {format(
                    addDays(new Date(selectedCompany.trial_ends_at), daysToAdd),
                    'MMMM d, yyyy'
                  )}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedCompany(null)}>
              Cancel
            </Button>
            <Button onClick={handleExtendTrial} disabled={extendTrialMutation.isPending}>
              {extendTrialMutation.isPending ? 'Extending...' : 'Extend Trial'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Admin Dialog */}
      <Dialog open={showAddAdminDialog} onOpenChange={setShowAddAdminDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Platform Administrator</DialogTitle>
            <DialogDescription>
              Enter the email address of the user you want to make a platform administrator
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">User Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={addAdminEmail}
                onChange={(e) => setAddAdminEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The user must already have an account in the system
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddAdminDialog(false);
              setAddAdminEmail("");
            }}>
              Cancel
            </Button>
            <Button 
              onClick={() => addAdminMutation.mutate(addAdminEmail)} 
              disabled={!addAdminEmail || addAdminMutation.isPending}
            >
              {addAdminMutation.isPending ? 'Adding...' : 'Add Admin'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}