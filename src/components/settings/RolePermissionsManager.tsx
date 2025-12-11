import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  useCompanyPermissions, 
  useTogglePermission, 
  ALL_PERMISSIONS, 
  PERMISSION_LABELS,
  CompanyPermission 
} from '@/hooks/useCompanyPermissions';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, Users, Crown } from 'lucide-react';

export const RolePermissionsManager = () => {
  const { data: permissions = [], isLoading } = useCompanyPermissions();
  const togglePermission = useTogglePermission();

  const getRolePermissions = (role: 'company_admin' | 'company_member') => {
    return permissions.filter(p => p.company_role === role).map(p => p.permission);
  };

  const handleToggle = (role: 'company_admin' | 'company_member', permission: CompanyPermission, currentlyGranted: boolean) => {
    togglePermission.mutate({
      companyRole: role,
      permission,
      granted: !currentlyGranted,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const adminPermissions = getRolePermissions('company_admin');
  const memberPermissions = getRolePermissions('company_member');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Role Permissions
        </CardTitle>
        <CardDescription>
          Configure what each role can do. Owners always have full access.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Owner explanation */}
        <div className="mb-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="h-4 w-4 text-primary" />
            <span className="font-medium">Owner</span>
            <Badge variant="default" className="text-xs">Full Access</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Owners have all permissions and can manage role permissions for Admins and Members.
          </p>
        </div>

        <Tabs defaultValue="admin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="admin" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Admin Permissions
            </TabsTrigger>
            <TabsTrigger value="member" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Member Permissions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="admin" className="mt-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Select which permissions Admins should have:
              </p>
              {ALL_PERMISSIONS.map((permission) => {
                const isGranted = adminPermissions.includes(permission);
                const { label, description } = PERMISSION_LABELS[permission];
                
                return (
                  <div 
                    key={permission} 
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <Label htmlFor={`admin-${permission}`} className="font-medium cursor-pointer">
                        {label}
                      </Label>
                      <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                    <Switch
                      id={`admin-${permission}`}
                      checked={isGranted}
                      onCheckedChange={() => handleToggle('company_admin', permission, isGranted)}
                      disabled={togglePermission.isPending}
                    />
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="member" className="mt-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Select which permissions Members should have:
              </p>
              {ALL_PERMISSIONS.map((permission) => {
                const isGranted = memberPermissions.includes(permission);
                const { label, description } = PERMISSION_LABELS[permission];
                
                return (
                  <div 
                    key={permission} 
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <Label htmlFor={`member-${permission}`} className="font-medium cursor-pointer">
                        {label}
                      </Label>
                      <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                    <Switch
                      id={`member-${permission}`}
                      checked={isGranted}
                      onCheckedChange={() => handleToggle('company_member', permission, isGranted)}
                      disabled={togglePermission.isPending}
                    />
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
