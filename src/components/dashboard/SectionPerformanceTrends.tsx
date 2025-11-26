import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format, subMonths, startOfMonth } from "date-fns";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { usePerformanceTrends } from "@/hooks/usePerformanceTrends";
import { useLocations } from "@/hooks/useLocations";
import { useTemplates } from "@/hooks/useTemplates";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export const SectionPerformanceTrends = () => {
  const today = new Date();
  const lastMonth = subMonths(today, 1);
  
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date>(lastMonth);
  const [dateTo, setDateTo] = useState<Date>(today);
  const [templateFilter, setTemplateFilter] = useState<string>("all");

  const { data: locations } = useLocations(false);
  const { data: templates } = useTemplates();
  const { sectionPerformance, isLoading } = usePerformanceTrends(
    locationFilter,
    dateFrom,
    dateTo,
    templateFilter
  );

  const getTrendIcon = (trend: 'improving' | 'declining' | 'stable') => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-success" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendColor = (trend: 'improving' | 'declining' | 'stable') => {
    switch (trend) {
      case 'improving':
        return 'hsl(var(--success))';
      case 'declining':
        return 'hsl(var(--destructive))';
      default:
        return 'hsl(var(--muted-foreground))';
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
            <p className="text-muted-foreground">Loading performance trends...</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Performance Trends by Section</h3>
          <p className="text-sm text-muted-foreground mt-1">Average scores and trends over time</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Location</label>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Locations" />
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

          <div className="space-y-2">
            <label className="text-sm font-medium">From Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateFrom && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">To Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateTo && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={dateTo} onSelect={setDateTo} />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Template</label>
            <Select value={templateFilter} onValueChange={setTemplateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Templates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Templates</SelectItem>
                {templates?.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {sectionPerformance.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No data available for the selected filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {sectionPerformance.map((section) => (
              <Card key={section.sectionName} className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-medium text-foreground">{section.sectionName}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-2xl font-bold">{section.avgScore}%</span>
                      {getTrendIcon(section.trend)}
                    </div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={section.dataPoints}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fontSize: 12 }}
                      domain={[0, 100]}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      labelFormatter={(value) => format(new Date(value), 'PPP')}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke={getTrendColor(section.trend)} 
                      strokeWidth={2}
                      dot={{ fill: getTrendColor(section.trend), r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};
