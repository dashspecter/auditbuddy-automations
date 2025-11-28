import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCompany, useCompanyUsers, useUpdateCompany, useUpdateCompanyRole, useUpdatePlatformRole } from "@/hooks/useCompany";
import { Building2, Users, Puzzle, CreditCard, Settings } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import ModuleManagement from "@/components/settings/ModuleManagement";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

export default function CompanySettings() {
  const [searchParams] = useSearchParams();
  const { data: company, isLoading: companyLoading } = useCompany();
  const { data: users = [], isLoading: usersLoading } = useCompanyUsers();
  const updateCompany = useUpdateCompany();
  const updateCompanyRole = useUpdateCompanyRole();
  const updatePlatformRole = useUpdatePlatformRole();

  const [companyName, setCompanyName] = useState("");
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "general");

  const handleCompanyRoleChange = (companyUserId: string, newRole: 'company_owner' | 'company_admin' | 'company_member') => {
    updateCompanyRole.mutate({ companyUserId, role: newRole });
  };

  const handlePlatformRoleToggle = (userId: string, role: 'admin' | 'manager' | 'checker', currentlyHas: boolean) => {
    updatePlatformRole.mutate({ 
      userId, 
      role, 
      action: currentlyHas ? 'remove' : 'add' 
    });
  };

  if (companyLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 px-safe">
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
            <TabsTrigger value="billing" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Billing
            </TabsTrigger>
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
            <ModuleManagement />
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Company Users</CardTitle>
                <CardDescription>Manage users in your company</CardDescription>
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
                          <div>
                            <p className="font-medium">
                              {user.profiles?.full_name || user.profiles?.email}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {user.profiles?.email}
                            </p>
                          </div>
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
                        <div className="flex gap-4 pt-2 border-t">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={user.platform_roles?.includes('manager') || false}
                              onCheckedChange={() => handlePlatformRoleToggle(
                                user.user_id, 
                                'manager', 
                                user.platform_roles?.includes('manager') || false
                              )}
                            />
                            <span className="text-sm">Manager</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={user.platform_roles?.includes('checker') || false}
                              onCheckedChange={() => handlePlatformRoleToggle(
                                user.user_id, 
                                'checker', 
                                user.platform_roles?.includes('checker') || false
                              )}
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
                    <Button onClick={() => window.location.href = '/pricing'}>
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
        </Tabs>
      </main>
    </div>
  );
}