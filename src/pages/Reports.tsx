import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Calendar as CalendarIcon, FileSpreadsheet, FileText, MapPin, Clock } from "lucide-react";
import { format } from "date-fns";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLocationAudits } from "@/hooks/useAudits";

const COLORS = {
  compliant: 'hsl(var(--success))',
  nonCompliant: 'hsl(var(--destructive))',
  locations: ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))']
};

const COMPLIANCE_THRESHOLD = 80; // Scores >= 80 are compliant

const Reports = () => {
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [selectedAudits, setSelectedAudits] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");

  const { data: audits, isLoading } = useLocationAudits();

  // Calculate report data from real audits
  const reportData = useMemo(() => {
    if (!audits) return [];

    const locationMap = new Map<string, {
      location: string;
      totalAudits: number;
      totalScore: number;
      compliant: number;
      nonCompliant: number;
      audits: any[];
    }>();

    audits.forEach(audit => {
      const location = audit.location || 'Unknown Location';
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
  }, [audits]);

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

  const handlePieClick = (location: string | null, type: 'compliant' | 'nonCompliant') => {
    if (!audits) return;

    let filteredAudits: any[] = [];
    let title = "";

    if (location) {
      // Click from location-specific chart
      const locationData = reportData.find(loc => loc.location === location);
      if (locationData) {
        filteredAudits = locationData.audits.filter(audit => {
          const isCompliant = (audit.overall_score || 0) >= COMPLIANCE_THRESHOLD;
          return type === 'compliant' ? isCompliant : !isCompliant;
        });
        title = `${location} - ${type === 'compliant' ? 'Compliant' : 'Non-Compliant'} Audits`;
      }
    } else {
      // Click from overall chart
      filteredAudits = audits.filter(audit => {
        const isCompliant = (audit.overall_score || 0) >= COMPLIANCE_THRESHOLD;
        return type === 'compliant' ? isCompliant : !isCompliant;
      });
      title = `All Locations - ${type === 'compliant' ? 'Compliant' : 'Non-Compliant'} Audits`;
    }

    setSelectedAudits(filteredAudits);
    setDialogTitle(title);
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
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
            <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
            <p className="text-muted-foreground mt-1">Generate and export audit reports</p>
          </div>

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
                <Select defaultValue="all">
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    <SelectItem value="amzei">LBFC Amzei</SelectItem>
                    <SelectItem value="mosilor">LBFC Mosilor</SelectItem>
                    <SelectItem value="timpuri">LBFC Timpuri Noi</SelectItem>
                    <SelectItem value="apaca">LBFC Apaca</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Audit Type</label>
                <Select defaultValue="all">
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="location">Location</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Export to Excel
              </Button>
              <Button variant="outline" className="gap-2">
                <FileText className="h-4 w-4" />
                Export to PDF
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
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Location</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Total Audits</th>
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
                          <Badge className="bg-success text-success-foreground">
                            {row.compliant}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="destructive">
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
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{dialogTitle}</DialogTitle>
                <DialogDescription>
                  Showing {selectedAudits.length} audit{selectedAudits.length !== 1 ? 's' : ''}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-3">
                {selectedAudits.map((audit) => (
                  <Card key={audit.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 p-2 rounded-lg">
                            <MapPin className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground">{audit.location}</h4>
                            <p className="text-sm text-muted-foreground">
                              Audit #{audit.id.substring(0, 8)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Date</p>
                            <p className="text-sm font-medium flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(audit.audit_date || audit.created_at), 'MMM dd, yyyy')}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Score</p>
                            <p className="text-sm font-bold text-foreground">{audit.overall_score || 0}%</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Status</p>
                            <Badge className={(audit.overall_score || 0) >= COMPLIANCE_THRESHOLD ? 'bg-success' : 'bg-destructive'}>
                              {(audit.overall_score || 0) >= COMPLIANCE_THRESHOLD ? 'Compliant' : 'Non-Compliant'}
                            </Badge>
                          </div>
                          {audit.notes && (
                            <div className="col-span-2 md:col-span-1">
                              <p className="text-xs text-muted-foreground">Notes</p>
                              <p className="text-sm font-medium truncate">{audit.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
        )}
      </main>
    </div>
  );
};

export default Reports;
