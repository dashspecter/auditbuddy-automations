import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Copy, CheckCircle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { useLocation } from "react-router-dom";

export default function DebugInfo() {
  const location = useLocation();
  const { user, session } = useAuth();
  const { data: roleData, isLoading: isLoadingRole, refetch: refetchRoles } = useUserRole();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: dbRoles, refetch: refetchDbRoles } = useQuery({
    queryKey: ['debug_roles', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: profileData, refetch: refetchProfile } = useQuery({
    queryKey: ['debug_profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleRefreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['user_role'] });
    refetchRoles();
    refetchDbRoles();
    refetchProfile();
    toast({
      title: "Refreshed",
      description: "All data has been refreshed from the database.",
    });
  };

  const handleResetAppCache = () => {
    const returnTo = encodeURIComponent(
      `${location.pathname}${location.search}${location.hash}`
    );
    window.location.assign(`/?resetApp=1&returnTo=${returnTo}`);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copied",
      description: "Debug information copied to clipboard.",
    });
  };

  const debugInfo = {
    timestamp: new Date().toISOString(),
    user: {
      id: user?.id,
      email: user?.email,
      created_at: user?.created_at,
      last_sign_in_at: user?.last_sign_in_at,
    },
    session: {
      access_token: session?.access_token ? '***' + session.access_token.slice(-8) : null,
      refresh_token: session?.refresh_token ? '***' + session.refresh_token.slice(-8) : null,
      expires_at: session?.expires_at,
    },
    roles: {
      fromHook: roleData,
      fromDatabase: dbRoles,
    },
    profile: profileData,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Debug Information</h1>
          <p className="text-muted-foreground">
            Authentication and permission troubleshooting
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleResetAppCache}>
            Reset app cache
          </Button>
          <Button onClick={handleRefreshAll}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh All
          </Button>
        </div>
      </div>

          {/* User Authentication */}
          <Card>
            <CardHeader>
              <CardTitle>User Authentication</CardTitle>
              <CardDescription>Current user session information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">User ID</p>
                  <p className="text-sm font-mono">{user?.id || 'Not authenticated'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-sm">{user?.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Session Status</p>
                  <Badge variant={session ? "default" : "destructive"}>
                    {session ? 'Active' : 'No Session'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Session Expires</p>
                  <p className="text-sm">
                    {session?.expires_at 
                      ? new Date(session.expires_at * 1000).toLocaleString()
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Role Information */}
          <Card>
            <CardHeader>
              <CardTitle>Role & Permissions</CardTitle>
              <CardDescription>User roles from hook and database</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">From useUserRole Hook:</p>
                {isLoadingRole ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : roleData ? (
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={roleData.isAdmin ? "default" : "outline"}>
                      Admin: {roleData.isAdmin ? <CheckCircle className="h-3 w-3 ml-1 inline" /> : '✗'}
                    </Badge>
                    <Badge variant={roleData.isManager ? "default" : "outline"}>
                      Manager: {roleData.isManager ? <CheckCircle className="h-3 w-3 ml-1 inline" /> : '✗'}
                    </Badge>
                    <Badge variant={roleData.isChecker ? "default" : "outline"}>
                      Checker: {roleData.isChecker ? <CheckCircle className="h-3 w-3 ml-1 inline" /> : '✗'}
                    </Badge>
                  </div>
                ) : (
                  <p className="text-sm text-destructive">No role data</p>
                )}
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium mb-2">From Database (user_roles table):</p>
                {dbRoles && dbRoles.length > 0 ? (
                  <div className="space-y-2">
                    {dbRoles.map((role: any) => (
                      <div key={role.id} className="flex items-center gap-2 text-sm">
                        <Badge>{role.role}</Badge>
                        <span className="text-muted-foreground text-xs font-mono">{role.id}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-destructive">No roles found in database</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>User profile from database</CardDescription>
            </CardHeader>
            <CardContent>
              {profileData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="text-sm">{profileData.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                    <p className="text-sm">{profileData.full_name || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Created At</p>
                    <p className="text-sm">{new Date(profileData.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Updated At</p>
                    <p className="text-sm">{new Date(profileData.updated_at).toLocaleString()}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-destructive">No profile found</p>
              )}
            </CardContent>
          </Card>

          {/* Raw Debug Data */}
          <Card>
            <CardHeader>
              <CardTitle>Raw Debug Data</CardTitle>
              <CardDescription>Complete debug information (JSON)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2 z-10"
                  onClick={() => copyToClipboard(JSON.stringify(debugInfo, null, 2))}
                >
                  {copied ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy JSON
                    </>
                  )}
                </Button>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
  );
}
