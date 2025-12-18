import { useState } from "react";
import { useTranslation } from "react-i18next";
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

const getInsightTypeConfig = (t: any): Record<string, { label: string; icon: any; color: string }> => ({
  understaffing: { label: t('workforce.schedulingInsights.understaffing'), icon: TrendingDown, color: "text-red-500" },
  overstaffing: { label: t('workforce.schedulingInsights.overstaffing'), icon: TrendingUp, color: "text-orange-500" },
  mismatch: { label: t('workforce.schedulingInsights.mismatch'), icon: AlertTriangle, color: "text-yellow-500" },
  pattern: { label: t('workforce.schedulingInsights.pattern'), icon: Lightbulb, color: "text-blue-500" },
});

export default function SchedulingInsights() {
  const { t } = useTranslation();
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
      toast.error(t('workforce.schedulingInsights.selectLocationError'));
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
      toast.success(result?.data?.message || t('workforce.schedulingInsights.analysisComplete'));
    } catch (error: any) {
      toast.error(error.message || t('workforce.schedulingInsights.analysisFailed'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "high":
        return <Badge variant="destructive">{t('workforce.schedulingInsights.high')}</Badge>;
      case "medium":
        return <Badge className="bg-yellow-500/10 text-yellow-500">{t('workforce.schedulingInsights.medium')}</Badge>;
      default:
        return <Badge variant="secondary">{t('workforce.schedulingInsights.low')}</Badge>;
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
          <h1 className="text-3xl font-bold">{t('workforce.schedulingInsights.title')}</h1>
          <p className="text-muted-foreground">{t('workforce.schedulingInsights.subtitle')}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('workforce.schedulingInsights.runAnalysis')}</CardTitle>
          <CardDescription>{t('workforce.schedulingInsights.runAnalysisDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>{t('workforce.schedulingInsights.location')}</Label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder={t('workforce.schedulingInsights.selectLocation')} />
                </SelectTrigger>
                <SelectContent>
                  {locations?.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('workforce.schedulingInsights.startDate')}</Label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('workforce.schedulingInsights.endDate')}</Label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAnalyze} disabled={isAnalyzing} className="w-full">
                <Bot className="h-4 w-4 mr-2" />
                {isAnalyzing ? t('workforce.schedulingInsights.analyzing') : t('workforce.schedulingInsights.analyze')}
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
                <p className="text-sm text-muted-foreground">{t('workforce.schedulingInsights.totalInsights')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-2xl font-bold text-red-500">
                  {insights.filter(i => i.severity === "high").length}
                </p>
                <p className="text-sm text-muted-foreground">{t('workforce.schedulingInsights.highPriority')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-2xl font-bold text-red-500">
                  {insights.filter(i => i.type === "understaffing").length}
                </p>
                <p className="text-sm text-muted-foreground">{t('workforce.schedulingInsights.understaffingIssues')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-2xl font-bold text-blue-500">
                  {insights.filter(i => i.type === "pattern").length}
                </p>
                <p className="text-sm text-muted-foreground">{t('workforce.schedulingInsights.patternsFound')}</p>
              </CardContent>
            </Card>
          </div>

          {/* Grouped Insights */}
          {Object.entries(groupedInsights).map(([type, typeInsights]) => {
            const insightTypeConfig = getInsightTypeConfig(t);
            const config = insightTypeConfig[type] || { label: type, icon: AlertTriangle, color: "text-muted-foreground" };
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
              <p className="text-muted-foreground">{t('workforce.schedulingInsights.noInsights')}</p>
              <p className="text-sm text-muted-foreground">{t('workforce.schedulingInsights.noInsightsDesc')}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
