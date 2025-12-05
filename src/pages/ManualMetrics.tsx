import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, TrendingUp, MapPin } from "lucide-react";
import { useCreateManualMetric, useManualMetrics, useMetricNames } from "@/hooks/useManualMetrics";
import { useLocations } from "@/hooks/useLocations";
import { LocationSelector } from "@/components/LocationSelector";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ManualMetrics() {
  const [metricName, setMetricName] = useState("");
  const [metricValue, setMetricValue] = useState("");
  const [metricDate, setMetricDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [locationId, setLocationId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [selectedMetricForChart, setSelectedMetricForChart] = useState<string>("");

  const createMetric = useCreateManualMetric();
  const { data: allMetrics } = useManualMetrics();
  const { data: metricNames } = useMetricNames();
  const { data: locations } = useLocations();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!metricName || !metricValue || !metricDate) {
      return;
    }

    await createMetric.mutateAsync({
      metric_name: metricName,
      metric_value: parseFloat(metricValue),
      metric_date: metricDate,
      location_id: locationId || undefined,
      notes: notes || undefined,
    });

    // Reset form
    setMetricValue("");
    setNotes("");
  };

  // Prepare chart data
  const getChartData = (metricName: string, locationId?: string) => {
    if (!allMetrics) return [];

    let filteredMetrics = allMetrics.filter(m => m.metric_name === metricName);
    
    if (locationId && locationId !== "__all__") {
      filteredMetrics = filteredMetrics.filter(m => m.location_id === locationId);
    }

    // Group by date and calculate average if multiple entries per date
    const groupedByDate = filteredMetrics.reduce((acc, metric) => {
      const date = metric.metric_date;
      if (!acc[date]) {
        acc[date] = { total: 0, count: 0 };
      }
      acc[date].total += metric.metric_value;
      acc[date].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    return Object.entries(groupedByDate)
      .map(([date, { total, count }]) => ({
        date: format(new Date(date), "MMM d"),
        fullDate: format(new Date(date), "PPP"),
        value: Math.round((total / count) * 100) / 100,
      }))
      .sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());
  };

  // Get locations that have data for this metric
  const getLocationsWithData = (metricName: string) => {
    if (!allMetrics || !locations) return [];

    return locations
      .map(location => {
        const locationMetrics = allMetrics.filter(
          m => m.metric_name === metricName && m.location_id === location.id
        );
        
        if (locationMetrics.length === 0) return null;
        
        return {
          id: location.id,
          name: location.name,
          chartData: getChartData(metricName, location.id),
          count: locationMetrics.length,
        };
      })
      .filter(Boolean);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <TrendingUp className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Manual Metrics</h1>
          <p className="text-muted-foreground">Track custom metrics over time</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
          {/* Input Form */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add New Metric
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Metric Name *</Label>
                <Input
                  list="metric-names"
                  value={metricName}
                  onChange={(e) => setMetricName(e.target.value)}
                  placeholder="e.g., Delivery Platform Score"
                  required
                />
                <datalist id="metric-names">
                  {metricNames?.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>

              <div>
                <Label>Value *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={metricValue}
                  onChange={(e) => setMetricValue(e.target.value)}
                  placeholder="Enter metric value"
                  required
                />
              </div>

              <div>
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={metricDate}
                  onChange={(e) => setMetricDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label>Location (Optional)</Label>
                <LocationSelector
                  value={locationId}
                  onValueChange={setLocationId}
                  placeholder="Select location or leave blank for global"
                />
              </div>

              <div>
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes about this metric"
                  rows={3}
                />
              </div>

              <Button type="submit" className="w-full" disabled={createMetric.isPending}>
                {createMetric.isPending ? "Adding..." : "Add Metric"}
              </Button>
            </form>
          </Card>

          {/* Recent Metrics */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Metrics</h2>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {allMetrics?.slice(0, 20).map((metric) => (
                <div key={metric.id} className="p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold">{metric.metric_name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <span>{format(new Date(metric.metric_date), "PPP")}</span>
                        {metric.locations && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {metric.locations.name}
                            </span>
                          </>
                        )}
                      </div>
                      {metric.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{metric.notes}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-base px-3 py-1">
                      {metric.metric_value}
                    </Badge>
                  </div>
                </div>
              ))}
              {(!allMetrics || allMetrics.length === 0) && (
                <p className="text-center text-muted-foreground py-8">No metrics yet</p>
              )}
            </div>
          </Card>
        </div>

        {/* Charts Section */}
        {metricNames && metricNames.length > 0 && (
          <Card className="p-6 mt-6">
            <h2 className="text-xl font-semibold mb-4">Metric Trends</h2>
            
            <div className="mb-4">
              <Label>Select Metric</Label>
              <Select value={selectedMetricForChart} onValueChange={setSelectedMetricForChart}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a metric to visualize" />
                </SelectTrigger>
                <SelectContent>
                  {metricNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedMetricForChart && (
              <div className="space-y-6">
                {getLocationsWithData(selectedMetricForChart).map((location: any) => (
                  <Card key={location.id} className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <MapPin className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">{location.name}</h3>
                      <Badge variant="outline" className="ml-auto">
                        {location.count} {location.count === 1 ? 'entry' : 'entries'}
                      </Badge>
                    </div>
                    
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={location.chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          labelFormatter={(label) => {
                            const item = location.chartData.find((d: any) => d.date === label);
                            return item?.fullDate || label;
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="value"
                          name={selectedMetricForChart}
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>
                ))}
                
                {getLocationsWithData(selectedMetricForChart).length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No location data available for this metric
                  </p>
                )}
              </div>
            )}
          </Card>
        )}
      </div>
  );
}
