import { useState } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCompany, useCompanyModules, useCompanyUsers, useUpdateCompany, useToggleModule } from "@/hooks/useCompany";
import { Building2, Users, Puzzle, CreditCard, Settings } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function CompanySettings() {
  const { data: company, isLoading: companyLoading } = useCompany();
  const { data: modules = [], isLoading: modulesLoading } = useCompanyModules();
  const { data: users = [], isLoading: usersLoading } = useCompanyUsers();
  const updateCompany = useUpdateCompany();
  const toggleModule = useToggleModule();

  const [companyName, setCompanyName] = useState("");

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

  const moduleLabels: Record<string, string> = {
    location_audits: 'Location Audits',
    staff_performance: 'Staff Performance',
    equipment_management: 'Equipment Management',
    notifications: 'Notifications',
    reports: 'Reports & Analytics',
  };

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

        <Tabs defaultValue="general" className="space-y-6">
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
            <Card>
              <CardHeader>
                <CardTitle>Active Modules</CardTitle>
                <CardDescription>
                  Enable or disable modules for your company
                </CardDescription>
              </CardHeader>
              <CardContent>
                {modulesLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : modules.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No modules found for your company
                  </div>
                ) : (
                  <div className="space-y-4">
                    {modules.map((module) => (
                      <div
                        key={module.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1">
                          <p className="font-medium">
                            {moduleLabels[module.module_name] || module.module_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {module.is_active 
                              ? `Activated ${new Date(module.activated_at).toLocaleDateString()}` 
                              : 'Inactive'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={module.is_active ? 'default' : 'outline'}>
                            {module.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Switch
                            checked={module.is_active}
                            onCheckedChange={(checked) => {
                              toggleModule.mutate({
                                moduleId: module.id,
                                isActive: checked,
                              });
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
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
                  <div className="space-y-3">
                    {users.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">
                            {user.profiles?.full_name || user.profiles?.email}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {user.profiles?.email}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {user.company_role === 'company_owner' ? 'Owner' : 'Admin'}
                        </Badge>
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
                    <Button variant="outline">Upgrade Plan</Button>
                  </div>
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">
                      Billing management coming soon. Contact support for subscription changes.
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