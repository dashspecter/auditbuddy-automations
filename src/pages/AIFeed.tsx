import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Clock, Loader2, MapPin, Sparkles } from "lucide-react";
import { useAlerts, useResolveAlert } from "@/hooks/useAlerts";
import { useInsightSummaries } from "@/hooks/useInsightSummaries";
import { useCompany } from "@/hooks/useCompany";
import { formatDistanceToNow } from "date-fns";
import { sanitizeHtml } from "@/lib/sanitize";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const AIFeed = () => {
  const { data: company } = useCompany();
  const { data: alerts, isLoading: alertsLoading } = useAlerts();
  const { data: summaries, isLoading: summariesLoading } = useInsightSummaries();
  const resolveAlert = useResolveAlert();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  const unresolvedAlerts = alerts?.filter(a => !a.resolved) || [];

  const handleGenerateSummary = async () => {
    if (!company?.id) {
      toast.error("Company not found");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-insight-summary", {
        body: { 
          companyId: company.id, 
          alerts: unresolvedAlerts.map(a => ({
            severity: a.severity,
            title: a.title,
            message: a.message,
            category: a.category,
          }))
        },
      });

      if (error) throw error;

      if (data?.error) {
        if (data.error.includes("Rate limit")) {
          toast.error("Rate limit exceeded. Please try again later.");
        } else if (data.error.includes("credits")) {
          toast.error("AI credits exhausted. Please add funds.");
        } else {
          toast.error(data.error);
        }
        return;
      }

      toast.success("AI Summary generated successfully!");
      queryClient.invalidateQueries({ queryKey: ["insight_summaries"] });
    } catch (error) {
      console.error("Error generating summary:", error);
      toast.error("Failed to generate summary");
    } finally {
      setIsGenerating(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "destructive";
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "secondary";
    }
  };

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">AI Feed</h1>
            <p className="text-muted-foreground mt-1">
              Real-time alerts and AI-generated insights
            </p>
          </div>
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={handleGenerateSummary}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {isGenerating ? "Generating..." : "Generate Summary"}
          </Button>
        </div>

        {/* AI-Generated Summaries */}
        {!summariesLoading && summaries && summaries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI Summary
              </CardTitle>
              <CardDescription>Latest AI-generated insights</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-lg max-w-none dark:prose-invert [&>h3]:text-lg [&>h3]:font-semibold [&>h3]:mt-4 [&>h3]:mb-2 [&>p]:text-base [&>p]:leading-relaxed [&>ul]:space-y-1 [&>ul>li]:text-base [&>strong]:font-semibold">
                {summaries[0].content_html ? (
                  <div dangerouslySetInnerHTML={{ 
                    __html: sanitizeHtml(
                      summaries[0].content_html
                        .replace(/```html\n?/gi, '')
                        .replace(/```\n?/g, '')
                        .trim()
                    ) 
                  }} />
                ) : (
                  <p className="text-base">{JSON.stringify(summaries[0].content)}</p>
                )}
              </div>
              <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Generated {formatDistanceToNow(new Date(summaries[0].generated_at))} ago
              </div>
            </CardContent>
          </Card>
        )}

        {/* Alerts Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Active Alerts ({unresolvedAlerts.length})
              </span>
            </CardTitle>
            <CardDescription>Issues requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            {alertsLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading alerts...
              </div>
            ) : unresolvedAlerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No active alerts. Everything looks good!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {unresolvedAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="border rounded-lg p-4 space-y-3 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={getSeverityColor(alert.severity)}>
                            {alert.severity}
                          </Badge>
                          <Badge variant="outline">{alert.category}</Badge>
                          {alert.locations && (
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {alert.locations.name}
                            </span>
                          )}
                        </div>
                        <h3 className="font-medium">{alert.title}</h3>
                        <p className="text-sm text-muted-foreground">{alert.message}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(alert.created_at))} ago
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resolveAlert.mutate(alert.id)}
                        disabled={resolveAlert.isPending}
                      >
                        Resolve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resolved Alerts */}
        {alerts && alerts.filter(a => a.resolved).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-muted-foreground">Resolved Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {alerts.filter(a => a.resolved).slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className="border rounded-lg p-3 opacity-60 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{alert.title}</span>
                      <span className="text-xs text-muted-foreground">
                        Resolved {formatDistanceToNow(new Date(alert.resolved_at!))} ago
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
};

export default AIFeed;
