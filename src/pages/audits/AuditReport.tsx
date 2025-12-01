import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuditNew } from "@/hooks/useAuditsNew";
import { useAuditSections } from "@/hooks/useAuditSections";
import { useAuditFieldResponses } from "@/hooks/useAuditFieldResponses";
import AuditResponsesSummary from "@/components/audit/AuditResponsesSummary";
import FieldResponseInput from "@/components/audit/FieldResponseInput";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AuditReport = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: audit } = useAuditNew(id);
  const { data: sections } = useAuditSections(audit?.template_id);
  const { data: responses } = useAuditFieldResponses(id);

  if (!audit) {
    return (
      <AppLayout>
        <div className="text-center py-12">Loading audit...</div>
      </AppLayout>
    );
  }

  const scorePercentage = audit.total_score || 0;

  return (
    <AppLayout>
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
                    {audit.completed_at ? format(new Date(audit.completed_at), "PPP") : "In Progress"}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-primary">{scorePercentage}%</div>
                <div className="text-sm text-muted-foreground">Overall Score</div>
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
                <div className="text-2xl font-bold">{responses?.length || 0}</div>
                <div className="text-sm text-muted-foreground">Responses</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {responses?.filter(r => r.response_value !== null).length || 0}
                </div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="responses">
          <TabsList>
            <TabsTrigger value="responses">Responses</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="followup">Follow-up Tasks</TabsTrigger>
            <TabsTrigger value="insights">AI Insights</TabsTrigger>
          </TabsList>

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

          <TabsContent value="followup">
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <p>No follow-up tasks created yet.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights">
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <p>AI-powered insights coming soon</p>
                <p className="text-sm mt-2">Automatic analysis and recommendations will appear here.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default AuditReport;
