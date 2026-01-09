import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ArrowLeft, User, MapPin, Calendar, FileText, Star, RefreshCw } from "lucide-react";

export default function StaffAuditDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: audit, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["staff-audit", id],
    queryFn: async () => {
      if (!id) throw new Error("No audit ID provided");
      
      const { data, error } = await supabase
        .from("staff_audits")
        .select(`
          *,
          employees(full_name, role, avatar_url, email, phone),
          locations(name, address)
        `)
        .eq("id", id)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) return null;
      
      // Get auditor profile separately
      let auditorProfile = null;
      if (data?.auditor_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", data.auditor_id)
          .maybeSingle();
        auditorProfile = profile;
      }
      
      // Fetch field names for custom_data UUIDs
      let fieldNames: Record<string, string> = {};
      if (data.custom_data && typeof data.custom_data === 'object') {
        const customDataObj = data.custom_data as Record<string, any>;
        const fieldIds = Object.keys(customDataObj).filter(key => 
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)
        );
        
        if (fieldIds.length > 0) {
          // Normalize to lowercase for the query
          const normalizedIds = fieldIds.map(id => id.toLowerCase());
          const { data: fields } = await supabase
            .from("audit_fields")
            .select("id, name")
            .in("id", normalizedIds);
          
          if (fields && fields.length > 0) {
            // Map both original case and lowercase for lookup
            fields.forEach(f => {
              fieldNames[f.id] = f.name;
              fieldNames[f.id.toLowerCase()] = f.name;
              fieldNames[f.id.toUpperCase()] = f.name;
            });
          }
        }
      }
      
      return { ...data, auditor_profile: auditorProfile, fieldNames };
    },
    enabled: !!id,
    refetchOnMount: "always",
    staleTime: 0,
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return "Excellent";
    if (score >= 80) return "Good";
    if (score >= 70) return "Satisfactory";
    if (score >= 60) return "Needs Improvement";
    return "Poor";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !audit) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/staff-audits')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Audit not found or you don't have permission to view it.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate('/staff-audits')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-2"
              aria-label="Refresh audit"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          <div>
            <h1 className="text-2xl font-bold">Employee Audit Details</h1>
            <p className="text-muted-foreground">
              Audit for {audit.employees?.full_name}
            </p>
          </div>
        </div>
        <Badge className={`${getScoreColor(audit.score)} text-white text-lg px-4 py-2`}>
          {audit.score}% - {getScoreLabel(audit.score)}
        </Badge>
      </div>

      {/* Main Info */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Employee Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Employee Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium text-lg">{audit.employees?.full_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Role</p>
              <Badge variant="outline">{audit.employees?.role}</Badge>
            </div>
            {audit.employees?.email && (
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{audit.employees.email}</p>
              </div>
            )}
            {audit.employees?.phone && (
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{audit.employees.phone}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Audit Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Audit Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Audit Date</p>
                <p className="font-medium">{format(new Date(audit.audit_date), "MMMM dd, yyyy")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-medium">{audit.locations?.name}</p>
                {audit.locations?.address && (
                  <p className="text-sm text-muted-foreground">{audit.locations.address}</p>
                )}
              </div>
            </div>
            {(audit as any).auditor_profile && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Audited By</p>
                  <p className="font-medium">{(audit as any).auditor_profile.full_name || (audit as any).auditor_profile.email}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Score Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Performance Score
          </CardTitle>
          <CardDescription>Overall audit score and assessment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full ${getScoreColor(audit.score)} text-white`}>
                <span className="text-4xl font-bold">{typeof audit.score === 'number' ? audit.score.toFixed(1) : audit.score}%</span>
              </div>
              <p className="mt-4 text-xl font-semibold">{getScoreLabel(audit.score)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {audit.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes & Observations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{audit.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Custom Data (if any) */}
      {audit.custom_data && Object.keys(audit.custom_data).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Assessment</CardTitle>
            <CardDescription>Individual criteria scores and feedback</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(audit.custom_data).map(([key, value]: [string, any]) => {
                // Use field name from lookup, or format the key if it's not a UUID
                const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);
                const fieldNamesMap = (audit as any).fieldNames || {};
                const displayName = isUUID 
                  ? (fieldNamesMap[key] || fieldNamesMap[key.toLowerCase()] || fieldNamesMap[key.toUpperCase()] || 'Unknown Field')
                  : key.replace(/_/g, ' ');
                
                return (
                  <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium capitalize">{displayName}</span>
                    {typeof value === 'number' ? (
                      <Badge variant={value >= 4 ? "default" : value >= 3 ? "secondary" : "destructive"}>
                        {value}/5
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">{String(value)}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
