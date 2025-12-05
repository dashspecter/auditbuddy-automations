import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Clock, MapPin, Sparkles } from "lucide-react";
import { useAlerts, useResolveAlert } from "@/hooks/useAlerts";
import { useInsightSummaries } from "@/hooks/useInsightSummaries";
import { formatDistanceToNow } from "date-fns";
import { sanitizeHtml } from "@/lib/sanitize";

const AIFeed = () => {
  const { data: alerts, isLoading: alertsLoading } = useAlerts();
  const { data: summaries, isLoading: summariesLoading } = useInsightSummaries();
  const resolveAlert = useResolveAlert();

  const unresolvedAlerts = alerts?.filter(a => !a.resolved) || [];

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
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">AI Feed</h1>
            <p className="text-muted-foreground mt-1">
              Real-time alerts and AI-generated insights
            </p>
          </div>
          <Button variant="outline" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Generate Summary
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
              <div className="prose max-w-none">
                {summaries[0].content_html ? (
                  <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(summaries[0].content_html) }} />
                ) : (
                  <p>{JSON.stringify(summaries[0].content)}</p>
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
    </AppLayout>
  );
};

export default AIFeed;
