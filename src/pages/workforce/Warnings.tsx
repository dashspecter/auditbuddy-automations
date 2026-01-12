import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { format, subDays } from "date-fns";
import { AlertTriangle, Plus, FileText, Search, Filter, MoreHorizontal, Edit, Trash2, Eye } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useCompany } from "@/contexts/CompanyContext";
import { useLocations } from "@/hooks/useLocations";
import { useEmployees } from "@/hooks/useEmployees";
import { useWarnings, useDeleteStaffEvent } from "@/hooks/useStaffEvents";
import { WarningDialog } from "@/components/workforce/WarningDialog";
import { WarningDetailDialog } from "@/components/workforce/WarningDetailDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const SEVERITY_COLORS: Record<string, string> = {
  minor: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  major: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const CATEGORY_LABELS: Record<string, string> = {
  attendance: "Attendance",
  punctuality: "Punctuality",
  tasks: "Tasks",
  hygiene_safety: "Hygiene & Safety",
  customer: "Customer Service",
  cash_inventory: "Cash & Inventory",
  policy: "Policy",
  other: "Other",
};

export default function Warnings() {
  const { t } = useTranslation();
  const { company } = useCompany();
  const { data: locations } = useLocations();
  const { data: employees } = useEmployees();
  const deleteEvent = useDeleteStaffEvent();

  // Filters state
  const [activeTab, setActiveTab] = useState<"warning" | "coaching_note">("warning");
  const [filterLocationId, setFilterLocationId] = useState<string>("");
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>("");
  const [filterSeverity, setFilterSeverity] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [viewingEvent, setViewingEvent] = useState<any>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);

  const { data: warningsData, isLoading } = useWarnings(company?.id, {
    locationId: filterLocationId || undefined,
    employeeId: filterEmployeeId || undefined,
    severity: filterSeverity || undefined,
    category: filterCategory || undefined,
    dateFrom,
    dateTo,
    eventType: activeTab,
  });

  // Filter by search query
  const filteredWarnings = (warningsData || []).filter((warning: any) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      warning.employee?.full_name?.toLowerCase().includes(searchLower) ||
      warning.metadata?.title?.toLowerCase().includes(searchLower) ||
      warning.description?.toLowerCase().includes(searchLower)
    );
  });

  const handleDelete = async () => {
    if (deletingEventId) {
      await deleteEvent.mutateAsync(deletingEventId);
      setDeletingEventId(null);
    }
  };

  const getInitials = (name: string) => {
    return name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "??";
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-warning" />
              {t("warnings.title", "Warnings & Notes")}
            </h1>
            <p className="text-muted-foreground">
              {t("warnings.description", "Track employee warnings and coaching notes")}
            </p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {activeTab === "warning" 
              ? t("warnings.addWarning", "Add Warning")
              : t("warnings.addNote", "Add Note")}
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList>
            <TabsTrigger value="warning" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              {t("warnings.warnings", "Warnings")}
            </TabsTrigger>
            <TabsTrigger value="coaching_note" className="gap-2">
              <FileText className="h-4 w-4" />
              {t("warnings.coachingNotes", "Coaching Notes")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                  <div className="relative lg:col-span-2">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t("common.search", "Search...")}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  
                  <Select value={filterLocationId} onValueChange={setFilterLocationId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("common.allLocations", "All Locations")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Locations</SelectItem>
                      {locations?.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={filterEmployeeId} onValueChange={setFilterEmployeeId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("warnings.allEmployees", "All Employees")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Employees</SelectItem>
                      {employees?.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {activeTab === "warning" && (
                    <>
                      <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("warnings.allSeverities", "All Severities")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Severities</SelectItem>
                          <SelectItem value="minor">{t("warnings.minor", "Minor")}</SelectItem>
                          <SelectItem value="major">{t("warnings.major", "Major")}</SelectItem>
                          <SelectItem value="critical">{t("warnings.critical", "Critical")}</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("warnings.allCategories", "All Categories")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Categories</SelectItem>
                          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  )}
                </div>
                
                <div className="flex gap-4 mt-4">
                  <div>
                    <label className="text-sm text-muted-foreground">{t("common.from", "From")}</label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-40"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">{t("common.to", "To")}</label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-40"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Warnings List */}
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-4 space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-1/3" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredWarnings.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    {activeTab === "warning"
                      ? t("warnings.noWarnings", "No warnings found")
                      : t("warnings.noNotes", "No coaching notes found")}
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredWarnings.map((warning: any) => (
                      <div
                        key={warning.id}
                        className="p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={warning.employee?.avatar_url} />
                          <AvatarFallback>
                            {getInitials(warning.employee?.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">
                              {warning.employee?.full_name || "Unknown"}
                            </span>
                            {activeTab === "warning" && warning.metadata?.severity && (
                              <Badge className={SEVERITY_COLORS[warning.metadata.severity]}>
                                {t(`warnings.${warning.metadata.severity}`, warning.metadata.severity)}
                              </Badge>
                            )}
                            {warning.metadata?.category && (
                              <Badge variant="outline">
                                {CATEGORY_LABELS[warning.metadata.category] || warning.metadata.category}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {warning.metadata?.title || warning.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                            <span>{warning.employee?.locations?.name || "Global"}</span>
                            <span>{format(new Date(warning.event_date), 'MMM dd, yyyy')}</span>
                            {warning.creator?.full_name && (
                              <span>by {warning.creator.full_name}</span>
                            )}
                          </div>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewingEvent(warning)}>
                              <Eye className="h-4 w-4 mr-2" />
                              {t("common.view", "View")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditingEvent(warning)}>
                              <Edit className="h-4 w-4 mr-2" />
                              {t("common.edit", "Edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => setDeletingEventId(warning.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t("common.delete", "Delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create/Edit Dialog */}
      <WarningDialog
        open={isCreateOpen || !!editingEvent}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingEvent(null);
          }
        }}
        eventType={activeTab}
        editingEvent={editingEvent}
        employees={employees || []}
        locations={locations || []}
      />

      {/* View Dialog */}
      <WarningDetailDialog
        open={!!viewingEvent}
        onOpenChange={(open) => !open && setViewingEvent(null)}
        event={viewingEvent}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingEventId} onOpenChange={(open) => !open && setDeletingEventId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("warnings.deleteTitle", "Delete Warning")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("warnings.deleteDescription", "Are you sure you want to delete this warning? This action cannot be undone.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {t("common.delete", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
