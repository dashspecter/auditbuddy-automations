import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Minus, Sparkles, Calendar, Download, MapPin, Users, Building2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocations } from "@/hooks/useLocations";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useLocationTrends } from "@/hooks/useLocationTrends";
import { usePerformanceTrends } from "@/hooks/usePerformanceTrends";
import { useInsightSummaries, useSaveInsightSummary } from "@/hooks/useInsightSummaries";
import { useState } from "react";
import { Link } from "react-router-dom";
import { format, subDays, subWeeks, subMonths } from "date-fns";
import { ComplianceChart } from "@/components/dashboard/ComplianceChart";
import { LocationPerformanceChart } from "@/components/dashboard/LocationPerformanceChart";
import { SectionPerformanceTrends } from "@/components/dashboard/SectionPerformanceTrends";
import { WorkforceAnalytics } from "@/components/dashboard/WorkforceAnalytics";
import { CompanyPerformanceOverview } from "@/components/dashboard/CompanyPerformanceOverview";
import { ModuleGate } from "@/components/ModuleGate";
import { EmptyState } from "@/components/EmptyState";

const Insights = () => {
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("weekly");
  
  const { data: locations } = useLocations();
  const { totalAudits, avgScore, isLoading: statsLoading } = useDashboardStats();
  const { locationTrends, isLoading: trendsLoading } = useLocationTrends();
  const { sectionPerformance, locationPerformance } = usePerformanceTrends(
    locationFilter === "all" ? undefined : locationFilter
  );
  const { data: summaries } = useInsightSummaries();
  const saveSummary = useSaveInsightSummary();

  const getPeriodDates = () => {
    const now = new Date();
    switch (period) {
      case "daily":
        return { start: format(subDays(now, 1), "yyyy-MM-dd"), end: format(now, "yyyy-MM-dd") };
      case "weekly":
        return { start: format(subWeeks(now, 1), "yyyy-MM-dd"), end: format(now, "yyyy-MM-dd") };
      case "monthly":
        return { start: format(subMonths(now, 1), "yyyy-MM-dd"), end: format(now, "yyyy-MM-dd") };
    }
  };

  const handleSaveSummary = () => {
    const dates = getPeriodDates();
    saveSummary.mutate({
      summaryType: period,
      periodStart: dates.start,
      periodEnd: dates.end,
      content: {
        totalAudits,
        avgScore,
        locationTrends,
        sectionPerformance: sectionPerformance.slice(0, 5),
      },
    });
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improvement":
      case "improving":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "decline":
      case "declining":
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const insightSubItems = [
    { title: "Overview", url: "/insights", icon: Sparkles, description: "Analytics overview" },
    { title: "AI Feed", url: "/ai-feed", icon: TrendingUp, description: "AI-powered insights" },
  ];

  return (
    <ModuleGate module="reports">
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-bold">Insights</h1>
            <p className="text-muted-foreground mt-1">
              Analytics and performance trends
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button variant="outline" className="gap-2 w-full sm:w-auto" onClick={handleSaveSummary}>
              <Download className="h-4 w-4" />
              Save Summary
            </Button>
          </div>
        </div>

        {/* Mobile-first quick navigation to subitems */}
        <div className="grid grid-cols-2 gap-3 sm:hidden">
          {insightSubItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.url} to={item.url}>
                <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full">
                  <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{item.title}</div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Location</label>
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {locations?.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Period</label>
                <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="company">Company</TabsTrigger>
            <TabsTrigger value="workforce">Workforce</TabsTrigger>
            <TabsTrigger value="locations">Locations</TabsTrigger>
            <TabsTrigger value="sections">Sections</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Audits
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalAudits}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Average Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{avgScore}%</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Locations Tracked
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{locationTrends.length}</div>
                </CardContent>
              </Card>
            </div>

            <ComplianceChart />
          </TabsContent>

          <TabsContent value="company" className="space-y-6">
            <CompanyPerformanceOverview />
          </TabsContent>

          <TabsContent value="workforce" className="space-y-6">
            <WorkforceAnalytics 
              locationId={locationFilter === "all" ? undefined : locationFilter}
              period={period === "daily" ? "week" : period === "weekly" ? "week" : "month"}
            />
          </TabsContent>

          <TabsContent value="locations" className="space-y-6">
            <LocationPerformanceChart />
            
            <Card>
              <CardHeader>
                <CardTitle>Location Trends</CardTitle>
                <CardDescription>Score changes by location</CardDescription>
              </CardHeader>
              <CardContent>
                {trendsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading trends...</div>
                ) : locationTrends.length === 0 ? (
                  <EmptyState
                    icon={MapPin}
                    title="No Location Data"
                    description="No location data available yet. Perform audits to see trends."
                  />
                ) : (
                  <div className="space-y-3">
                    {locationTrends.map((trend) => (
                      <div key={trend.location} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">{trend.location}</h3>
                            <p className="text-sm text-muted-foreground">
                              {trend.auditCount} audits
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-2xl font-bold">{trend.currentScore}%</div>
                              {trend.auditCount >= 2 && (
                                <div className="flex items-center gap-1 text-sm">
                                  {getTrendIcon(trend.trend)}
                                  <span className={
                                    trend.trend === "improvement" ? "text-green-500" :
                                    trend.trend === "decline" ? "text-destructive" :
                                    "text-muted-foreground"
                                  }>
                                    {trend.scoreDifference > 0 ? "+" : ""}{trend.scoreDifference}%
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sections" className="space-y-6">
            <SectionPerformanceTrends />
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Saved Summaries</CardTitle>
                <CardDescription>Previously saved insight reports</CardDescription>
              </CardHeader>
              <CardContent>
                {summaries && summaries.length > 0 ? (
                  <div className="space-y-4">
                    {summaries.slice(0, 5).map((summary) => (
                      <div key={summary.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-medium capitalize">{summary.summary_type} Summary</h3>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(summary.period_start), "MMM d")} - {format(new Date(summary.period_end), "MMM d, yyyy")}
                            </p>
                          </div>
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                        </div>
                        {summary.content_html && (
                          <div className="text-sm text-muted-foreground mt-2">
                            Generated {format(new Date(summary.generated_at), "MMM d, yyyy")}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Calendar}
                    title="No Saved Summaries"
                    description="No saved summaries yet. Use 'Save Summary' to create one."
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ModuleGate>
  );
};

export default Insights;