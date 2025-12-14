import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Calendar as CalendarIcon, FileSpreadsheet, FileText, MapPin, Clock } from "lucide-react";
import { format } from "date-fns";
import { useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLocationAudits } from "@/hooks/useAudits";
import { useLocations } from "@/hooks/useLocations";
import { useTemplates } from "@/hooks/useTemplates";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ComplianceChart } from "@/components/dashboard/ComplianceChart";
import { LocationPerformanceCards } from "@/components/dashboard/LocationPerformanceCards";
import { LocationTrendAnalysis } from "@/components/dashboard/LocationTrendAnalysis";
import { SectionPerformanceTrends } from "@/components/dashboard/SectionPerformanceTrends";
import { EmployeePerformanceChart } from "@/components/dashboard/EmployeePerformanceChart";
import { EmployeeLeaderboard } from "@/components/dashboard/EmployeeLeaderboard";
import { StaffLeaderboard } from "@/components/StaffLeaderboard";
import { EmployeePerformanceDashboard } from "@/components/reports/EmployeePerformanceDashboard";
import { ModuleGate } from "@/components/ModuleGate";
import { EmptyState } from "@/components/EmptyState";
import AuditResponsesSummary from "@/components/audit/AuditResponsesSummary";
import { SectionScoreBreakdown } from "@/components/SectionScoreBreakdown";
import { useStaffAudits } from "@/hooks/useStaffAudits";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Wrapper component to fetch sections for the breakdown
const SectionScoreBreakdownWrapper = ({ 
  templateId, 
  customData, 
  auditId 
}: { 
  templateId: string; 
  customData: Record<string, any>; 
  auditId: string 
}) => {
  const { data: sections } = useQuery({
    queryKey: ['template-sections-for-breakdown', templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_sections')
        .select(`
          id,
          name,
          description,
          audit_fields (
            id,
            name,
            field_type,
            options
          )
        `)
        .eq('template_id', templateId)
        .order('display_order');

      if (error) throw error;
      return data || [];
    },
  });

  if (!sections || sections.length === 0) return null;

  return (
    <SectionScoreBreakdown
      sections={sections as any}
      customData={customData}
      auditId={auditId}
    />
  );
};

const COLORS = {
  compliant: 'hsl(var(--success))',
  nonCompliant: 'hsl(var(--destructive))',
  locations: ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))']
};

const COMPLIANCE_THRESHOLD = 80; // Scores >= 80 are compliant

const Reports = () => {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') === 'employee' ? 'employee' : 'location';
  
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [templateFilter, setTemplateFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [selectedAudits, setSelectedAudits] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");

  const { data: audits, isLoading } = useLocationAudits();
  const { data: staffAudits, isLoading: isLoadingStaffAudits } = useStaffAudits();
  const { data: locations } = useLocations(false);
  const { data: templates } = useTemplates();
  
  const { data: users } = useQuery({
    queryKey: ['users_list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });

  // Calculate report data from real audits with filters
  const reportData = useMemo(() => {
    if (!audits) return [];

    let filteredAudits = audits.filter(audit => {
      const auditDate = new Date(audit.audit_date);
      
      if (dateFrom && auditDate < dateFrom) return false;
      if (dateTo && auditDate > dateTo) return false;
      if (locationFilter !== "all" && audit.location_id !== locationFilter) return false;
      if (templateFilter !== "all" && audit.template_id !== templateFilter) return false;
      if (userFilter !== "all" && audit.user_id !== userFilter) return false;
      
      return true;
    });

    const locationMap = new Map<string, {
      location: string;
      totalAudits: number;
      totalScore: number;
      compliant: number;
      nonCompliant: number;
      audits: any[];
    }>();

    filteredAudits.forEach(audit => {
      const location = audit.locations?.name || audit.location || 'Unknown Location';
      if (!locationMap.has(location)) {
        locationMap.set(location, {
          location,
          totalAudits: 0,
          totalScore: 0,
          compliant: 0,
          nonCompliant: 0,
          audits: []
        });
      }

      const locData = locationMap.get(location)!;
      locData.totalAudits++;
      locData.totalScore += (audit.overall_score || 0);
      locData.audits.push(audit);

      if ((audit.overall_score || 0) >= COMPLIANCE_THRESHOLD) {
        locData.compliant++;
      } else {
        locData.nonCompliant++;
      }
    });

    return Array.from(locationMap.values()).map(loc => ({
      ...loc,
      avgScore: loc.totalAudits > 0 ? Math.round(loc.totalScore / loc.totalAudits) : 0
    }));
  }, [audits, dateFrom, dateTo, locationFilter, templateFilter, userFilter]);

  // Calculate overall stats
  const overallStats = useMemo(() => {
    if (!audits) return { totalAudits: 0, avgScore: 0, compliant: 0, nonCompliant: 0 };

    const totalAudits = audits.length;
    const totalScore = audits.reduce((sum, audit) => sum + (audit.overall_score || 0), 0);
    const avgScore = totalAudits > 0 ? Math.round(totalScore / totalAudits) : 0;
    const compliant = audits.filter(a => (a.overall_score || 0) >= COMPLIANCE_THRESHOLD).length;
    const nonCompliant = totalAudits - compliant;

    return { totalAudits, avgScore, compliant, nonCompliant };
  }, [audits]);

  const handleExportCSV = () => {
    if (!reportData || reportData.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = ["Location", "Total Audits", "Average Score", "Compliant", "Non-Compliant", "Compliance Rate"];
    const rows = reportData.map(row => [
      row.location,
      row.totalAudits,
      `${row.avgScore}%`,
      row.compliant,
      row.nonCompliant,
      `${row.totalAudits > 0 ? Math.round((row.compliant / row.totalAudits) * 100) : 0}%`
    ]);

    let csvContent = headers.join(",") + "\n";
    rows.forEach(row => {
      csvContent += row.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `audit-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("CSV exported successfully");
  };

  const handleExportPDF = () => {
    if (!reportData || reportData.length === 0) {
      toast.error("No data to export");
      return;
    }

    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Audit Performance Report", 14, 20);
    
    doc.setFontSize(11);
    doc.text(`Generated: ${format(new Date(), 'PPP')}`, 14, 28);
    
    if (dateFrom || dateTo) {
      const dateRange = `Date Range: ${dateFrom ? format(dateFrom, 'PPP') : 'Start'} - ${dateTo ? format(dateTo, 'PPP') : 'End'}`;
      doc.text(dateRange, 14, 35);
    }

    autoTable(doc, {
      head: [["Location", "Total Audits", "Avg Score", "Compliant", "Non-Compliant", "Compliance Rate"]],
      body: reportData.map(row => [
        row.location,
        row.totalAudits.toString(),
        `${row.avgScore}%`,
        row.compliant.toString(),
        row.nonCompliant.toString(),
        `${row.totalAudits > 0 ? Math.round((row.compliant / row.totalAudits) * 100) : 0}%`
      ]),
      startY: dateFrom || dateTo ? 42 : 35,
      theme: 'grid',
    });

    doc.save(`audit-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success("PDF exported successfully");
  };

  const handlePieClick = (location: string | null, type: 'compliant' | 'nonCompliant') => {
    console.log('=== PIE CHART CLICKED ===');
    console.log('Location:', location);
    console.log('Type:', type);
    console.log('Audits available:', audits?.length);
    
    if (!audits) {
      console.error('No audits available');
      toast.error('No audit data available');
      return;
    }

    try {
      let filteredAudits: any[] = [];
      let title = "";

      if (location) {
        console.log('Filtering by location:', location);
        const locationData = reportData.find(loc => loc.location === location);
        console.log('Location data found:', locationData);
        
        if (locationData) {
          filteredAudits = locationData.audits.filter(audit => {
            const isCompliant = (audit.overall_score || 0) >= COMPLIANCE_THRESHOLD;
            return type === 'compliant' ? isCompliant : !isCompliant;
          });
          title = `${location} - ${type === 'compliant' ? 'Compliant' : 'Non-Compliant'} Audits`;
        } else {
          console.error('Location not found in reportData');
        }
      } else {
        console.log('Filtering all audits');
        filteredAudits = audits.filter(audit => {
          const isCompliant = (audit.overall_score || 0) >= COMPLIANCE_THRESHOLD;
          return type === 'compliant' ? isCompliant : !isCompliant;
        });
        title = `All Locations - ${type === 'compliant' ? 'Compliant' : 'Non-Compliant'} Audits`;
      }

      console.log('Filtered audits:', filteredAudits.length);
      console.log('Title:', title);
      console.log('About to set state...');
      
      setSelectedAudits(filteredAudits);
      setDialogTitle(title);
      setDialogOpen(true);
      
      console.log('State set successfully');
    } catch (error) {
      console.error('ERROR in handlePieClick:', error);
      toast.error('Failed to load audit details');
    }
  };

  const reportSubItems = [
    { title: "Location", url: "/reports?tab=location", icon: MapPin, description: "Location performance" },
    { title: "Employee", url: "/reports?tab=employee", icon: Clock, description: "Employee performance" },
    { title: "Vouchers", url: "/audits/vouchers", icon: FileSpreadsheet, description: "Manage vouchers" },
  ];

  return (
    <ModuleGate module="reports">
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
              <p className="text-muted-foreground">Loading reports...</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Reports</h1>
            <p className="text-muted-foreground mt-1">View performance reports by location and employee</p>
          </div>

          {/* Mobile-first quick navigation to subitems */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:hidden">
            {reportSubItems.map((item) => {
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

          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="location">Location Performance</TabsTrigger>
              <TabsTrigger value="employee">Employee Performance</TabsTrigger>
            </TabsList>

            <TabsContent value="location" className="space-y-6 mt-6">

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Filter Reports</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">From Date</label>
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
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">To Date</label>
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
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Location</label>
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All locations" />
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
                <label className="text-sm font-medium text-foreground">Template</label>
                <Select value={templateFilter} onValueChange={setTemplateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All templates" />
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

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">User</label>
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {users?.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-6">
              <Button size="sm" className="gap-1.5 px-2 sm:px-3" onClick={handleExportCSV}>
                <FileSpreadsheet className="h-4 w-4" />
                <span className="hidden sm:inline">CSV</span>
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 px-2 sm:px-3" onClick={handleExportPDF}>
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">PDF</span>
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Location Summary</h3>
            {reportData.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No audit data available</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold text-foreground min-w-[150px]">Location</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground min-w-[120px]">Total Audits</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Avg Score</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Compliant</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Non-Compliant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((row, index) => (
                      <tr key={index} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
                        <td className="py-3 px-4 font-medium text-foreground">{row.location}</td>
                        <td className="py-3 px-4 text-muted-foreground">{row.totalAudits}</td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-foreground">{row.avgScore}%</span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge 
                            className="bg-success text-success-foreground cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => handlePieClick(row.location, 'compliant')}
                          >
                            {row.compliant}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge 
                            variant="destructive"
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => handlePieClick(row.location, 'nonCompliant')}
                          >
                            {row.nonCompliant}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Total Audits</h4>
              <p className="text-3xl font-bold text-foreground">{overallStats.totalAudits}</p>
            </Card>
            
            <Card className="p-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Average Score</h4>
              <p className="text-3xl font-bold text-foreground">{overallStats.avgScore}%</p>
            </Card>
            
            <Card className="p-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Compliance Rate</h4>
              <p className="text-3xl font-bold text-foreground">
                {overallStats.totalAudits > 0 
                  ? Math.round((overallStats.compliant / overallStats.totalAudits) * 100) 
                  : 0}%
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {overallStats.compliant} of {overallStats.totalAudits} audits
              </p>
            </Card>
          </div>

          {/* Overall Compliance Pie Chart */}
          {overallStats.totalAudits > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Overall Compliance Distribution</h3>
              <p className="text-sm text-muted-foreground mb-4">Click on a slice to view detailed audit list</p>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Compliant', value: overallStats.compliant },
                      { name: 'Non-Compliant', value: overallStats.nonCompliant }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    onClick={(data) => {
                      const type = data.name === 'Compliant' ? 'compliant' : 'nonCompliant';
                      handlePieClick(null, type);
                    }}
                    cursor="pointer"
                  >
                    <Cell fill={COLORS.compliant} />
                    <Cell fill={COLORS.nonCompliant} />
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Compliance Trends Chart */}
          <ComplianceChart />

          {/* Location Performance Cards with Trends */}
          <LocationPerformanceCards />

          {/* Location Trend Analysis */}
          <LocationTrendAnalysis />

          {/* Section Performance Trends */}
          <SectionPerformanceTrends />

          {/* Per Location Pie Charts */}
          {reportData.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reportData.map((location, index) => {
                const pieData = [
                  { name: 'Compliant', value: location.compliant },
                  { name: 'Non-Compliant', value: location.nonCompliant }
                ];

                return (
                  <Card key={location.location} className="p-6">
                    <h3 className="text-lg font-semibold mb-2">{location.location}</h3>
                    <p className="text-xs text-muted-foreground mb-3">Click on a slice to view audits</p>
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Average Score</span>
                        <span className="font-bold text-foreground">{location.avgScore}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Audits</span>
                        <span className="font-medium">{location.totalAudits}</span>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          onClick={(data) => {
                            const type = data.name === 'Compliant' ? 'compliant' : 'nonCompliant';
                            handlePieClick(location.location, type);
                          }}
                          cursor="pointer"
                        >
                          <Cell fill={COLORS.compliant} />
                          <Cell fill={COLORS.nonCompliant} />
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Location Performance Trend Line Chart */}
          {reportData.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Location Performance Trend</h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={reportData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="location"
                    stroke="hsl(var(--muted-foreground))"
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
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="avgScore" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', r: 5 }}
                    name="Average Score"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Location Comparison Pie Chart */}
          {reportData.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Total Audits by Location</h3>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={reportData.map(loc => ({
                      name: loc.location,
                      value: loc.totalAudits
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {reportData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS.locations[index % COLORS.locations.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Audit Details Dialog */}
          {dialogOpen && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{dialogTitle}</DialogTitle>
                  <DialogDescription>
                    Showing {selectedAudits.length} audit{selectedAudits.length !== 1 ? 's' : ''}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 mt-4">
                  {selectedAudits.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No audits found
                    </div>
                  ) : (
                    selectedAudits.map((audit) => {
                      try {
                        return (
                          <Card key={audit.id} className="p-4">
                            <div className="space-y-3">
                              {/* Basic Info */}
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="font-bold">
                                    {audit.locations?.name || audit.location || 'Unknown Location'}
                                  </h3>
                                  <p className="text-sm text-muted-foreground">
                                    {audit.audit_date ? format(new Date(audit.audit_date), 'PPP') : 'No date'}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xl font-bold">{audit.overall_score || 0}%</p>
                                  <Badge className={`${(audit.overall_score || 0) >= COMPLIANCE_THRESHOLD ? 'bg-success' : 'bg-destructive'}`}>
                                    {(audit.overall_score || 0) >= COMPLIANCE_THRESHOLD ? 'Compliant' : 'Non-Compliant'}
                                  </Badge>
                                </div>
                              </div>

                              {/* Auditor */}
                              <div className="text-sm border-t pt-2">
                                <span className="text-muted-foreground">Auditor: </span>
                                <span className="font-medium">{audit.profiles?.full_name || audit.profiles?.email || 'N/A'}</span>
                              </div>

                              {/* Notes */}
                              {audit.notes && (
                                <div className="text-sm border-t pt-2">
                                  <p className="text-muted-foreground mb-1">Notes:</p>
                                  <p>{audit.notes}</p>
                                </div>
                              )}
                            </div>
                          </Card>
                        );
                      } catch (error) {
                        console.error('Error rendering audit card:', error);
                        return (
                          <Card key={audit.id} className="p-4 bg-destructive/10">
                            <p className="text-sm text-destructive">Error displaying audit {audit.id}</p>
                          </Card>
                        );
                      }
                    })
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
            </TabsContent>

            <TabsContent value="employee" className="space-y-6 mt-6">
              {/* Employee Performance Dashboard with Stats and Leaderboard */}
              <EmployeePerformanceDashboard />

              {/* Employee Performance Charts */}
              <div className="grid gap-6 md:grid-cols-2">
                <EmployeePerformanceChart />
                <EmployeeLeaderboard />
              </div>
              
              <StaffLeaderboard />

              <Card>
                <CardHeader>
                  <CardTitle>All Staff Performance Records</CardTitle>
                  <CardDescription>Complete history of all staff performance audits</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingStaffAudits ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    </div>
                  ) : !staffAudits || staffAudits.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No staff performance records found.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Score</TableHead>
                            <TableHead>Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {staffAudits.map((audit) => (
                            <TableRow key={audit.id}>
                              <TableCell className="font-medium">{audit.employees?.full_name || "Unknown"}</TableCell>
                              <TableCell>{audit.employees?.role || "-"}</TableCell>
                              <TableCell>{audit.locations?.name || "-"}</TableCell>
                              <TableCell>{format(new Date(audit.audit_date), "PPP")}</TableCell>
                              <TableCell>
                                <Badge variant={audit.score >= 80 ? "default" : audit.score >= 60 ? "secondary" : "destructive"}>
                                  {audit.score}%
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-xs truncate">{audit.notes || "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        )}
        </div>
    </ModuleGate>
  );
};

export default Reports;
