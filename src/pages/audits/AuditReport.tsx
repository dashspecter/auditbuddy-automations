import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuditNew } from "@/hooks/useAuditsNew";
import { useAuditSections } from "@/hooks/useAuditSections";
import { useAuditFieldResponses } from "@/hooks/useAuditFieldResponses";
import { useAuditFields } from "@/hooks/useAuditFields";
import AuditResponsesSummary from "@/components/audit/AuditResponsesSummary";
import SiteVisitReport from "@/components/audit/SiteVisitReport";
import { ArrowLeft, Download, FileText, CheckCircle2, AlertCircle, Users } from "lucide-react";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const AuditReport = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: audit } = useAuditNew(id);
  const { data: sections } = useAuditSections(audit?.template_id);
  const { data: responses } = useAuditFieldResponses(id);

  // Fetch all fields for all sections to compute per-section completion
  const { data: allFields } = useQuery({
    queryKey: ["audit-all-fields", audit?.template_id],
    queryFn: async () => {
      if (!audit?.template_id) return [];
      const { data: secs } = await supabase
        .from("audit_sections")
        .select("id")
        .eq("template_id", audit.template_id);
      if (!secs || secs.length === 0) return [];

      const { data: fields } = await supabase
        .from("audit_fields")
        .select("id, section_id, name")
        .in("section_id", secs.map((s) => s.id))
        .order("display_order");
      return fields || [];
    },
    enabled: !!audit?.template_id,
  });

  // Fetch contributor profiles
  const contributorIds = [...new Set((responses || []).map((r) => r.created_by))];
  const { data: contributors } = useQuery({
    queryKey: ["audit-contributors", contributorIds.join(",")],
    queryFn: async () => {
      if (contributorIds.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", contributorIds);
      return data || [];
    },
    enabled: contributorIds.length > 0,
  });

  if (!audit) {
    return <div className="text-center py-12">Loading audit...</div>;
  }

  const scorePercentage = audit.total_score || 0;
  const totalFields = allFields?.length || 0;
  const answeredFields = (responses || []).filter((r) => r.response_value !== null).length;
  const completionPct = totalFields > 0 ? Math.round((answeredFields / totalFields) * 100) : 0;

  // Per-section completion
  const sectionStats = (sections || []).map((section) => {
    const sectionFields = (allFields || []).filter((f: any) => f.section_id === section.id);
    const sectionResponses = (responses || []).filter(
      (r) => r.section_id === section.id && r.response_value !== null
    );
    return {
      ...section,
      totalFields: sectionFields.length,
      answeredFields: sectionResponses.length,
      pct: sectionFields.length > 0
        ? Math.round((sectionResponses.length / sectionFields.length) * 100)
        : 0,
    };
  });

  // Per-contributor breakdown
  const contributorStats = contributorIds.map((uid) => {
    const profile = (contributors || []).find((c: any) => c.id === uid);
    const count = (responses || []).filter((r) => r.created_by === uid && r.response_value !== null).length;
    const name = profile
      ? profile.full_name || profile.email || uid.substring(0, 8)
      : uid.substring(0, 8);
    return { userId: uid, name, count };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/audits")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Audits
        </Button>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export PDF
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{audit.audit_templates?.name}</CardTitle>
              <div className="flex gap-2 mt-2">
                <Badge>{audit.locations?.name}</Badge>
                <Badge variant="outline">
                  {audit.completed_at
                    ? format(new Date(audit.completed_at), "PPP")
                    : "In Progress"}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-primary">{completionPct}%</div>
              <div className="text-sm text-muted-foreground">Completion</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{sections?.length || 0}</div>
              <div className="text-sm text-muted-foreground">Sections</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{answeredFields}/{totalFields}</div>
              <div className="text-sm text-muted-foreground">Fields Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{contributorIds.length}</div>
              <div className="text-sm text-muted-foreground">Contributors</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="progress">
        <TabsList>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="responses">Responses</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="insights">AI Report</TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="space-y-4">
          {/* Section completion cards */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Section Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {sectionStats.map((section) => (
                <div key={section.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate mr-2">{section.name}</span>
                    <span className="text-muted-foreground whitespace-nowrap">
                      {section.answeredFields}/{section.totalFields}
                    </span>
                  </div>
                  <Progress
                    value={section.pct}
                    className={`h-2 ${section.pct === 100 ? "[&>div]:bg-green-500" : section.pct > 0 ? "[&>div]:bg-amber-500" : ""}`}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Contributors */}
          {contributorStats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Contributors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {contributorStats.map((c) => (
                    <div key={c.userId} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{c.name}</span>
                      <Badge variant="secondary">{c.count} responses</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sections needing attention */}
          {sectionStats.filter((s) => s.pct < 100).length > 0 && (
            <Card className="border-amber-200 dark:border-amber-800">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-amber-700 dark:text-amber-300">
                  <AlertCircle className="h-5 w-5" />
                  Needs Attention
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {sectionStats
                    .filter((s) => s.pct < 100)
                    .map((s) => (
                      <li key={s.id} className="text-sm flex items-center justify-between">
                        <span>{s.name}</span>
                        <Badge variant="outline" className="text-amber-600">
                          {s.totalFields - s.answeredFields} remaining
                        </Badge>
                      </li>
                    ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="responses">
          <AuditResponsesSummary auditId={id!} />
        </TabsContent>

        <TabsContent value="photos">
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Photo gallery coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights">
          <SiteVisitReport auditId={id!} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AuditReport;
