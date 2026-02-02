import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { format, subDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Download, Calendar as CalendarIcon, Trash2, TrendingUp, TrendingDown,
  Scale, DollarSign, AlertTriangle, Package, BarChart3, ArrowLeft, ImageIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line, ComposedChart
} from "recharts";
import { useWasteReport, useWasteEntries, useWasteProducts, useWasteReasons, WasteEntryFilters, getWastePhotoUrl, WasteEntry } from "@/hooks/useWaste";
import { useLocations } from "@/hooks/useLocations";
import { ModuleGate } from "@/components/ModuleGate";
import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/hooks/use-toast";
import { useSmartBack } from "@/hooks/useSmartBack";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export default function WasteReports() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const goBack = useSmartBack({ adminFallback: "/admin/waste/entries" });
  
  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 30));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("overview");
  
  // Photo viewing state
  const [selectedEntry, setSelectedEntry] = useState<WasteEntry | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);

  // Load photo when entry selected
  useEffect(() => {
    const loadPhoto = async () => {
      if (selectedEntry?.photo_path) {
        const url = await getWastePhotoUrl(selectedEntry.photo_path);
        setPhotoUrl(url);
      } else {
        setPhotoUrl(null);
      }
    };
    loadPhoto();
  }, [selectedEntry]);

  const handleViewPhoto = (entry: WasteEntry) => {
    setSelectedEntry(entry);
    setPhotoDialogOpen(true);
  };

  const { data: locations } = useLocations();
  const { data: products } = useWasteProducts(false);
  const { data: reasons } = useWasteReasons(false);

  // Get unique categories
  const categories = useMemo(() => {
    return [...new Set(products?.map(p => p.category).filter(Boolean))];
  }, [products]);

  const filters: WasteEntryFilters = {
    from: dateFrom,
    to: dateTo,
    locationIds: locationFilter !== "all" ? [locationFilter] : undefined,
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    status: 'recorded',
  };

  const { data: report, isLoading: reportLoading } = useWasteReport(filters);
  const { data: entries, isLoading: entriesLoading } = useWasteEntries(filters);

  const handleExportCSV = () => {
    if (!entries || entries.length === 0) {
      toast({ title: "No data", description: "No data to export", variant: "destructive" });
      return;
    }

    const headers = ["Date", "Location", "Product", "Category", "Reason", "Weight (kg)", "Cost (RON)", "Notes"];
    const rows = entries.map(entry => [
      format(new Date(entry.occurred_at), 'yyyy-MM-dd HH:mm'),
      entry.locations?.name || '',
      entry.waste_products?.name || '',
      entry.waste_products?.category || '',
      entry.waste_reasons?.name || '',
      entry.weight_kg.toFixed(3),
      entry.cost_total.toFixed(2),
      entry.notes || ''
    ]);

    let csvContent = headers.join(",") + "\n";
    rows.forEach(row => {
      csvContent += row.map(cell => `"${cell}"`).join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `waste-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast({ title: "Success", description: "CSV exported" });
  };

  const handleExportPDF = () => {
    if (!report) {
      toast({ title: "No data", description: "No data to export", variant: "destructive" });
      return;
    }

    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Waste Report", 14, 22);
    doc.setFontSize(11);
    doc.text(`${format(dateFrom, 'MMM d, yyyy')} - ${format(dateTo, 'MMM d, yyyy')}`, 14, 30);
    
    // KPIs
    doc.setFontSize(12);
    doc.text("Summary", 14, 42);
    doc.setFontSize(10);
    doc.text(`Total Weight: ${report.kpis.total_weight_kg.toFixed(2)} kg`, 14, 50);
    doc.text(`Total Cost: ${report.kpis.total_cost.toFixed(2)} RON`, 14, 56);
    doc.text(`Entries: ${report.kpis.entry_count}`, 14, 62);
    doc.text(`Avg Cost/Entry: ${report.kpis.avg_cost_per_entry.toFixed(2)} RON`, 14, 68);

    // Top Products Table
    if (report.top_products.length > 0) {
      autoTable(doc, {
        head: [["Product", "Weight (kg)", "Cost (RON)", "Entries"]],
        body: report.top_products.slice(0, 10).map(p => [
          p.name,
          p.weight_kg.toFixed(2),
          p.cost.toFixed(2),
          p.entries.toString()
        ]),
        startY: 78,
        margin: { left: 14, right: 14 },
      });
    }

    doc.save(`waste-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast({ title: "Success", description: "PDF exported" });
  };

  const isLoading = reportLoading || entriesLoading;

  return (
    <ModuleGate module="wastage">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={goBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Waste Reports</h1>
              <p className="text-muted-foreground mt-1">
                Analyze waste patterns and identify opportunities to reduce costs
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button variant="outline" onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">From</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateFrom, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dateFrom} onSelect={(d) => d && setDateFrom(d)} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">To</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateTo, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dateTo} onSelect={(d) => d && setDateTo(d)} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations?.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat!}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : !report ? (
          <EmptyState
            icon={Trash2}
            title="No waste data"
            description="Start logging waste entries to see analytics"
          />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="entries">Entries</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Scale className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Weight</p>
                        <p className="text-2xl font-bold">{report.kpis.total_weight_kg.toFixed(1)} kg</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-destructive/10">
                        <DollarSign className="h-5 w-5 text-destructive" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Cost</p>
                        <p className="text-2xl font-bold">{report.kpis.total_cost.toFixed(0)} RON</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-warning/10">
                        <Trash2 className="h-5 w-5 text-warning" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Entries</p>
                        <p className="text-2xl font-bold">{report.kpis.entry_count}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <BarChart3 className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Avg/Entry</p>
                        <p className="text-2xl font-bold">{report.kpis.avg_cost_per_entry.toFixed(1)} RON</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* By Category Donut */}
                <Card>
                  <CardHeader>
                    <CardTitle>Waste by Category</CardTitle>
                    <CardDescription>Cost breakdown by product category</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {report.by_category.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No data</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={report.by_category}
                            dataKey="cost"
                            nameKey="category"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ category, percent }) => `${category} (${(percent * 100).toFixed(0)}%)`}
                          >
                            {report.by_category.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => `${value.toFixed(2)} RON`} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* By Reason Donut */}
                <Card>
                  <CardHeader>
                    <CardTitle>Waste by Reason</CardTitle>
                    <CardDescription>Why waste is occurring</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {report.by_reason.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No data</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={report.by_reason}
                            dataKey="cost"
                            nameKey="reason"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ reason, percent }) => `${reason} (${(percent * 100).toFixed(0)}%)`}
                          >
                            {report.by_reason.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => `${value.toFixed(2)} RON`} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Daily Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Daily Trend</CardTitle>
                  <CardDescription>Waste cost and entries over time</CardDescription>
                </CardHeader>
                <CardContent>
                  {report.daily_trend.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No data</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={report.daily_trend}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="day" 
                          tickFormatter={(value) => format(new Date(value), 'MMM d')}
                          className="text-xs"
                        />
                        <YAxis yAxisId="left" className="text-xs" />
                        <YAxis yAxisId="right" orientation="right" className="text-xs" />
                        <Tooltip 
                          labelFormatter={(value) => format(new Date(value), 'MMM d, yyyy')}
                          formatter={(value: number, name: string) => [
                            name === 'Cost (RON)' ? `${value.toFixed(2)}` : value,
                            name
                          ]}
                        />
                        <Legend />
                        <Bar yAxisId="left" dataKey="cost" fill="hsl(var(--destructive))" name="Cost (RON)" />
                        <Line yAxisId="right" type="monotone" dataKey="entries" stroke="hsl(var(--primary))" name="Entries" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="products" className="space-y-6 mt-6">
              {/* Top Products Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Waste Products</CardTitle>
                  <CardDescription>Products with highest waste cost</CardDescription>
                </CardHeader>
                <CardContent>
                  {report.top_products.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No data</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart 
                        data={report.top_products.slice(0, 10)} 
                        layout="vertical"
                        margin={{ left: 100 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" className="text-xs" />
                        <YAxis dataKey="name" type="category" width={90} className="text-xs" />
                        <Tooltip formatter={(value: number) => `${value.toFixed(2)} RON`} />
                        <Bar dataKey="cost" fill="hsl(var(--destructive))" name="Cost (RON)" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Products Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Product Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Weight (kg)</TableHead>
                        <TableHead className="text-right">Cost (RON)</TableHead>
                        <TableHead className="text-right">Entries</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.top_products.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>{product.category || '-'}</TableCell>
                          <TableCell className="text-right">{product.weight_kg.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{product.cost.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{product.entries}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trends" className="space-y-6 mt-6">
              {/* Weight Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Weight Trend</CardTitle>
                  <CardDescription>Daily waste weight over time</CardDescription>
                </CardHeader>
                <CardContent>
                  {report.daily_trend.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No data</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={report.daily_trend}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="day" 
                          tickFormatter={(value) => format(new Date(value), 'MMM d')}
                          className="text-xs"
                        />
                        <YAxis className="text-xs" />
                        <Tooltip 
                          labelFormatter={(value) => format(new Date(value), 'MMM d, yyyy')}
                          formatter={(value: number) => [`${value.toFixed(2)} kg`, 'Weight']}
                        />
                        <Bar dataKey="weight_kg" fill="hsl(var(--primary))" name="Weight (kg)" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="entries" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Waste Entries</CardTitle>
                  <CardDescription>Detailed list of all waste entries</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Photo</TableHead>
                          <TableHead>Date/Time</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead className="text-right">Weight (kg)</TableHead>
                          <TableHead className="text-right">Cost (RON)</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {entries?.slice(0, 100).map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell>
                              {entry.photo_path ? (
                                <button
                                  onClick={() => handleViewPhoto(entry)}
                                  className="w-10 h-10 rounded bg-muted flex items-center justify-center hover:bg-accent transition-colors"
                                >
                                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                </button>
                              ) : (
                                <div className="w-10 h-10 rounded bg-muted/50 flex items-center justify-center">
                                  <ImageIcon className="h-4 w-4 text-muted-foreground/30" />
                                </div>
                              )}
                            </TableCell>
                            <TableCell>{format(new Date(entry.occurred_at), 'MMM d, HH:mm')}</TableCell>
                            <TableCell>{entry.locations?.name}</TableCell>
                            <TableCell>{entry.waste_products?.name}</TableCell>
                            <TableCell>{entry.waste_reasons?.name || '-'}</TableCell>
                            <TableCell className="text-right">{entry.weight_kg.toFixed(3)}</TableCell>
                            <TableCell className="text-right">{entry.cost_total.toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge variant={entry.status === 'recorded' ? 'default' : 'destructive'}>
                                {entry.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {entries && entries.length > 100 && (
                    <p className="text-sm text-muted-foreground text-center mt-4">
                      Showing first 100 entries. Export to CSV for full data.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Photo Dialog */}
        <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Waste Entry Photo</DialogTitle>
            </DialogHeader>
            {selectedEntry && (
              <div className="space-y-4">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Waste entry photo"
                    className="w-full rounded-lg object-cover max-h-[400px]"
                  />
                ) : (
                  <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
                    <p className="text-muted-foreground">No photo available</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Product</p>
                    <p className="font-medium">{selectedEntry.waste_products?.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Location</p>
                    <p className="font-medium">{selectedEntry.locations?.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Weight</p>
                    <p className="font-medium">{selectedEntry.weight_kg.toFixed(2)} kg</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Cost</p>
                    <p className="font-medium">{selectedEntry.cost_total.toFixed(2)} RON</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Date</p>
                    <p className="font-medium">{format(new Date(selectedEntry.occurred_at), 'MMM d, yyyy HH:mm')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Reason</p>
                    <p className="font-medium">{selectedEntry.waste_reasons?.name || '-'}</p>
                  </div>
                </div>
                {selectedEntry.notes && (
                  <div>
                    <p className="text-muted-foreground text-sm">Notes</p>
                    <p className="text-sm">{selectedEntry.notes}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ModuleGate>
  );
}
