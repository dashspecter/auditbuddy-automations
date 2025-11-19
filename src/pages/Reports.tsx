import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Calendar as CalendarIcon, FileSpreadsheet, FileText } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const reportData = [
  { location: "LBFC Amzei", totalAudits: 24, avgScore: 87, compliant: 20, nonCompliant: 4 },
  { location: "LBFC Mosilor", totalAudits: 18, avgScore: 72, compliant: 12, nonCompliant: 6 },
  { location: "LBFC Timpuri Noi", totalAudits: 22, avgScore: 91, compliant: 21, nonCompliant: 1 },
  { location: "LBFC Apaca", totalAudits: 20, avgScore: 85, compliant: 17, nonCompliant: 3 },
];

const COLORS = {
  compliant: 'hsl(var(--success))',
  nonCompliant: 'hsl(var(--destructive))',
  locations: ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))']
};

const Reports = () => {
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
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
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Total Audits</h4>
              <p className="text-3xl font-bold text-foreground">84</p>
              <p className="text-sm text-success mt-1">+12% from last month</p>
            </Card>
            
            <Card className="p-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Average Score</h4>
              <p className="text-3xl font-bold text-foreground">83.8%</p>
              <p className="text-sm text-success mt-1">+5.2% from last month</p>
            </Card>
            
            <Card className="p-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Compliance Rate</h4>
              <p className="text-3xl font-bold text-foreground">83%</p>
              <p className="text-sm text-muted-foreground mt-1">70 of 84 audits</p>
            </Card>
          </div>

          {/* Overall Compliance Pie Chart */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Overall Compliance Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Compliant', value: 70 },
                    { name: 'Non-Compliant', value: 14 }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill={COLORS.compliant} />
                  <Cell fill={COLORS.nonCompliant} />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/* Per Location Pie Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reportData.map((location, index) => {
              const pieData = [
                { name: 'Compliant', value: location.compliant },
                { name: 'Non-Compliant', value: location.nonCompliant }
              ];

              return (
                <Card key={location.location} className="p-6">
                  <h3 className="text-lg font-semibold mb-4">{location.location}</h3>
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

          {/* Location Comparison Pie Chart */}
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
                  label={({ name, percent }) => `${name.replace('LBFC ', '')}: ${(percent * 100).toFixed(0)}%`}
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
        </div>
      </main>
    </div>
  );
};

export default Reports;
