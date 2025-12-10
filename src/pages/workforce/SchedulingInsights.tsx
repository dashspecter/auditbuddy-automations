import { useState } from "react";
import { format, subDays } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAnalyzeScheduling, SchedulingInsight } from "@/hooks/useWorkforceAgent";
import { useLocations } from "@/hooks/useLocations";
import { AlertTriangle, Users, TrendingDown, TrendingUp, Bot, Calendar, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const INSIGHT_TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  understaffing: { label: "Understaffing", icon: TrendingDown, color: "text-red-500" },
  overstaffing: { label: "Overstaffing", icon: TrendingUp, color: "text-orange-500" },
  mismatch: { label: "Schedule Mismatch", icon: AlertTriangle, color: "text-yellow-500" },
  pattern: { label: "Pattern Detected", icon: Lightbulb, color: "text-blue-500" },
};

export default function SchedulingInsights() {
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd"),
  });
  const [insights, setInsights] = useState<SchedulingInsight[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { data: locations } = useLocations();
  const analyzeScheduling = useAnalyzeScheduling();

  const handleAnalyze = async () => {
    if (!selectedLocation) {
      toast.error("Please select a location");
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzeScheduling.mutateAsync({
        locationId: selectedLocation,
        startDate: dateRange.start,
        endDate: dateRange.end,
      });
      setInsights(result?.data?.insights || []);
      toast.success(result?.data?.message || "Analysis complete");
    } catch (error: any) {
      toast.error(error.message || "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "high":
        return <Badge variant="destructive">High</Badge>;
      case "medium":
        return <Badge className="bg-yellow-500/10 text-yellow-500">Medium</Badge>;
      default:
        return <Badge variant="secondary">Low</Badge>;
    }
  };

  const groupedInsights = insights.reduce((acc, insight) => {
    if (!acc[insight.type]) acc[insight.type] = [];
    acc[insight.type].push(insight);
    return acc;
  }, {} as Record<string, SchedulingInsight[]>);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Scheduling Insights</h1>
          <p className="text-muted-foreground">AI-powered analysis of scheduling patterns and issues</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Run Analysis</CardTitle>
          <CardDescription>Select a location and date range to analyze scheduling patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Location</Label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations?.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAnalyze} disabled={isAnalyzing} className="w-full">
                <Bot className="h-4 w-4 mr-2" />
                {isAnalyzing ? "Analyzing..." : "Analyze"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isAnalyzing ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : insights.length > 0 ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-2xl font-bold">{insights.length}</p>
                <p className="text-sm text-muted-foreground">Total Insights</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-2xl font-bold text-red-500">
                  {insights.filter(i => i.severity === "high").length}
                </p>
                <p className="text-sm text-muted-foreground">High Priority</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-2xl font-bold text-red-500">
                  {insights.filter(i => i.type === "understaffing").length}
                </p>
                <p className="text-sm text-muted-foreground">Understaffing Issues</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-2xl font-bold text-blue-500">
                  {insights.filter(i => i.type === "pattern").length}
                </p>
                <p className="text-sm text-muted-foreground">Patterns Found</p>
              </CardContent>
            </Card>
          </div>

          {/* Grouped Insights */}
          {Object.entries(groupedInsights).map(([type, typeInsights]) => {
            const config = INSIGHT_TYPE_CONFIG[type] || { label: type, icon: AlertTriangle, color: "text-muted-foreground" };
            const Icon = config.icon;

            return (
              <Card key={type}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${config.color}`} />
                    {config.label}
                    <Badge variant="secondary">{typeInsights.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {typeInsights.map((insight, index) => (
                      <div key={index} className="flex items-start gap-4 p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getSeverityBadge(insight.severity)}
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {insight.date}
                            </span>
                          </div>
                          <p className="font-medium">{insight.message}</p>
                          {insight.details && Object.keys(insight.details).length > 0 && (
                            <div className="mt-2 text-sm text-muted-foreground">
                              {Object.entries(insight.details).map(([key, value]) => (
                                <span key={key} className="mr-4">
                                  {key.replace(/_/g, " ")}: <strong>{String(value)}</strong>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No insights yet</p>
              <p className="text-sm text-muted-foreground">Select a location and run the analysis to get scheduling insights</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
