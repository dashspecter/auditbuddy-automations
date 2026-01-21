import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Trophy, CalendarIcon } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { LocationPerformance } from "@/hooks/usePerformanceTrends";

interface LocationPerformanceDetailProps {
  location: LocationPerformance | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LocationPerformanceDetail = ({
  location,
  open,
  onOpenChange,
}: LocationPerformanceDetailProps) => {
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  if (!location) return null;

  // Filter audits by date range
  const filteredAudits = location.audits.filter(audit => {
    const auditDate = new Date(audit.audit_date);
    if (dateFrom && auditDate < dateFrom) return false;
    if (dateTo && auditDate > dateTo) return false;
    return true;
  });

  // Recalculate stats based on filtered audits
  const avgScore = filteredAudits.length > 0
    ? Math.round(filteredAudits.reduce((sum, a) => sum + (a.overall_score || 0), 0) / filteredAudits.length)
    : 0;

  const getTrendIcon = (trend: 'improving' | 'declining' | 'stable') => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-5 w-5 text-success" />;
      case 'declining':
        return <TrendingDown className="h-5 w-5 text-destructive" />;
      default:
        return <Minus className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getTrendBadge = (trend: 'improving' | 'declining' | 'stable') => {
    const variants = {
      improving: { text: 'Improving', className: 'bg-success text-success-foreground' },
      declining: { text: 'Declining', className: 'bg-destructive text-destructive-foreground' },
      stable: { text: 'Stable', className: 'bg-muted text-muted-foreground' },
    };
    const { text, className } = variants[trend];
    return <Badge className={className}>{text}</Badge>;
  };

  const overallTrendData = filteredAudits
    .sort((a, b) => new Date(a.audit_date).getTime() - new Date(b.audit_date).getTime())
    .map(audit => ({
      date: audit.audit_date,
      score: audit.overall_score || 0
    }));

  const dateRangeLabel = dateFrom || dateTo
    ? `${dateFrom ? format(dateFrom, 'MMM dd, yyyy') : 'Start'} - ${dateTo ? format(dateTo, 'MMM dd, yyyy') : 'Now'}`
    : 'All Time';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{location.locationName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Date Range Filter */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">Date Range:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "MMM dd, yyyy") : "From"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground">–</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "MMM dd, yyyy") : "To"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            {(dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>
                Clear
              </Button>
            )}
            <Badge variant="secondary" className="ml-auto">{dateRangeLabel}</Badge>
          </div>

          {/* Overview Card */}
          <Card className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Overall Trend</p>
                <div className="flex items-center gap-2 mt-1">
                  {getTrendIcon(location.overallTrend)}
                  {getTrendBadge(location.overallTrend)}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Average Score</p>
                <p className="text-3xl font-bold mt-1">{avgScore}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Audits</p>
                <p className="text-3xl font-bold mt-1">{filteredAudits.length}</p>
              </div>
            </div>
          </Card>

          {/* Overall Performance Trend Chart */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Overall Performance Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={overallTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
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
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--primary))', r: 5 }}
                  name="Overall Score"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Weakest Areas & Best Improvements */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <h3 className="text-lg font-semibold">Weakest Areas</h3>
              </div>
              <div className="space-y-3">
                {location.weakestAreas.map((area, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">{area.section}</span>
                    <Badge variant="destructive">{area.score}%</Badge>
                  </div>
                ))}
                {location.weakestAreas.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    All areas performing well
                  </p>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="h-5 w-5 text-success" />
                <h3 className="text-lg font-semibold">Best Improvements</h3>
              </div>
              <div className="space-y-3">
                {location.bestImprovements.map((improvement, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">{improvement.section}</span>
                    <Badge className="bg-success text-success-foreground">
                      +{improvement.improvement.toFixed(0)}%
                    </Badge>
                  </div>
                ))}
                {location.bestImprovements.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No significant improvements detected
                  </p>
                )}
              </div>
            </Card>
          </div>

          {/* Section Breakdown */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Section Performance Breakdown</h3>
            {location.sections.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No section data available</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {location.sections.map((section) => (
                  <div key={section.sectionName} className="p-4 border border-border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium">{section.sectionName}</h4>
                      {getTrendIcon(section.trend)}
                    </div>
                    <p className="text-2xl font-bold">{section.avgScore}%</p>
                    <p className="text-xs text-muted-foreground mt-1 capitalize">{section.trend}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
