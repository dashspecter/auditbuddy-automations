import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Save, TrendingUp, TrendingDown, Calendar, DollarSign, Info, MapPin } from "lucide-react";
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, parseISO, isToday, isSameDay } from "date-fns";
import { useLocations } from "@/hooks/useLocations";
import { useLaborCosts, useUpsertLaborCost } from "@/hooks/useLaborCosts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SalesManagement = () => {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedLocationId, setSelectedLocationId] = useState<string>("all");
  const [salesInputs, setSalesInputs] = useState<Record<string, Record<string, string>>>({});
  
  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  
  const { data: locations = [] } = useLocations();
  const { data: laborCosts = [], isLoading } = useLaborCosts(
    selectedLocationId === "all" ? undefined : selectedLocationId,
    format(currentWeekStart, 'yyyy-MM-dd'),
    format(weekEnd, 'yyyy-MM-dd')
  );
  const upsertLaborCost = useUpsertLaborCost();

  const goToPreviousWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const goToNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  const goToToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const getLaborCostForDay = (locationId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return laborCosts.find(lc => lc.location_id === locationId && lc.date === dateStr);
  };

  const getSalesInput = (locationId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    if (salesInputs[locationId]?.[dateStr] !== undefined) {
      return salesInputs[locationId][dateStr];
    }
    const existing = getLaborCostForDay(locationId, date);
    return existing?.actual_sales?.toString() || "";
  };

  const handleSalesChange = (locationId: string, date: Date, value: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setSalesInputs(prev => ({
      ...prev,
      [locationId]: {
        ...prev[locationId],
        [dateStr]: value
      }
    }));
  };

  const handleSaveSales = async (locationId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const value = salesInputs[locationId]?.[dateStr];
    if (value === undefined) return;

    const numValue = parseFloat(value) || 0;
    const existing = getLaborCostForDay(locationId, date);

    try {
      await upsertLaborCost.mutateAsync({
        location_id: locationId,
        date: dateStr,
        actual_sales: numValue,
        scheduled_cost: existing?.scheduled_cost || 0,
        scheduled_hours: existing?.scheduled_hours || 0,
        actual_cost: existing?.actual_cost || 0,
        actual_hours: existing?.actual_hours || 0,
        projected_sales: existing?.projected_sales || 0,
      });
      toast.success("Sales saved successfully");
    } catch (error) {
      toast.error("Failed to save sales");
    }
  };

  const getWeekTotalForLocation = (locationId: string) => {
    return weekDays.reduce((total, day) => {
      const lc = getLaborCostForDay(locationId, day);
      return total + (lc?.actual_sales || 0);
    }, 0);
  };

  const getLaborPercentage = (locationId: string, date: Date) => {
    const lc = getLaborCostForDay(locationId, date);
    if (!lc || !lc.actual_sales || lc.actual_sales === 0) return null;
    return ((lc.scheduled_cost || 0) / lc.actual_sales * 100).toFixed(1);
  };

  const filteredLocations = selectedLocationId === "all" 
    ? locations 
    : locations.filter(l => l.id === selectedLocationId);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Sales Management</h1>
            <p className="text-muted-foreground">Record daily sales to track labor cost performance</p>
          </div>
        </div>

        {/* Week Navigation */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={goToNextWeek}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <span className="font-medium min-w-[200px]">
                  {format(currentWeekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
                </span>
                <Button variant="outline" onClick={goToToday}>Today</Button>
              </div>
              
              <div className="flex items-center gap-4">
                <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {locations.map(location => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-primary">Why track sales?</p>
                <p className="text-muted-foreground mt-1">
                  Recording daily sales helps calculate labor cost percentage (target: under 30%). 
                  This data enables better scheduling decisions and helps predict staffing needs based on historical performance.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sales Input Grid */}
        {filteredLocations.map(location => {
          const weekTotal = getWeekTotalForLocation(location.id);
          
          return (
            <Card key={location.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-lg">{location.name}</CardTitle>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Week Total</div>
                    <div className="font-bold text-lg">{weekTotal.toLocaleString()} Lei</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const isDayToday = isToday(day);
                    const laborCost = getLaborCostForDay(location.id, day);
                    const laborPct = getLaborPercentage(location.id, day);
                    const currentValue = getSalesInput(location.id, day);
                    const hasUnsavedChanges = salesInputs[location.id]?.[dateStr] !== undefined && 
                      salesInputs[location.id][dateStr] !== (laborCost?.actual_sales?.toString() || "");
                    
                    return (
                      <div 
                        key={dateStr}
                        className={`p-3 rounded-lg border ${
                          isDayToday ? 'ring-2 ring-primary bg-primary/5' : 'bg-muted/30'
                        }`}
                      >
                        <div className="text-center mb-2">
                          <div className="font-medium text-sm">{format(day, 'EEE')}</div>
                          <div className="text-xs text-muted-foreground">{format(day, 'MMM d')}</div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="relative">
                            <Input
                              type="number"
                              placeholder="0"
                              value={currentValue}
                              onChange={(e) => handleSalesChange(location.id, day, e.target.value)}
                              className="text-center pr-8 text-sm"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                              Lei
                            </span>
                          </div>
                          
                          {hasUnsavedChanges && (
                            <Button 
                              size="sm" 
                              className="w-full text-xs h-7"
                              onClick={() => handleSaveSales(location.id, day)}
                              disabled={upsertLaborCost.isPending}
                            >
                              <Save className="h-3 w-3 mr-1" />
                              Save
                            </Button>
                          )}
                          
                          {laborPct !== null && (
                            <div className="text-center">
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge 
                                    variant={parseFloat(laborPct) > 30 ? "destructive" : "default"}
                                    className="text-xs"
                                  >
                                    {parseFloat(laborPct) > 30 ? (
                                      <TrendingUp className="h-3 w-3 mr-1" />
                                    ) : (
                                      <TrendingDown className="h-3 w-3 mr-1" />
                                    )}
                                    {laborPct}%
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Labor cost as % of sales</p>
                                  <p className="text-xs text-muted-foreground">
                                    {(laborCost?.scheduled_cost || 0).toFixed(0)} Lei labor / {(laborCost?.actual_sales || 0).toFixed(0)} Lei sales
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          )}
                          
                          {laborCost && (
                            <div className="text-xs text-center text-muted-foreground">
                              {(laborCost.scheduled_hours || 0).toFixed(1)}h scheduled
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredLocations.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No locations found</h3>
              <p className="text-muted-foreground">Create locations first to start tracking sales.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
};

export default SalesManagement;
