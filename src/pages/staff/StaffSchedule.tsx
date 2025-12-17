import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StaffBottomNav } from "@/components/staff/StaffBottomNav";
import { ChevronLeft, ChevronRight, RefreshCw, Share, Calendar, Users } from "lucide-react";
import { format, startOfWeek, addDays, addWeeks, subWeeks } from "date-fns";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserRole } from "@/hooks/useUserRole";

const StaffSchedule = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: roleData } = useUserRole();
  const [employee, setEmployee] = useState<any>(null);
  const [companyRole, setCompanyRole] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [shifts, setShifts] = useState<any[]>([]);
  const [locationShifts, setLocationShifts] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [swapDialogOpen, setSwapDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<any>(null);
  const [offerNote, setOfferNote] = useState("");
  const [colleagues, setColleagues] = useState<any[]>([]);
  const [selectedColleague, setSelectedColleague] = useState<string | null>(null);
  const [swapNote, setSwapNote] = useState("");
  const [viewMode, setViewMode] = useState<"my" | "location">("my");

  useEffect(() => {
    if (user) loadData();
  }, [user, weekStart, roleData]);

  const loadData = async () => {
    try {
      const { data: empData, error } = await supabase
        .from("employees")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (error) {
        console.error("Error loading employee:", error);
        toast.error(t('staffSchedule.failedLoadSchedule'));
        return;
      }

      if (empData) {
        setEmployee(empData);
        
        // Get company role
        const { data: companyUserData } = await supabase
          .from("company_users")
          .select("company_role")
          .eq("user_id", user?.id)
          .maybeSingle();
        
        setCompanyRole(companyUserData?.company_role || null);
        
        // Load user's shifts
        await loadWeekShifts(empData.id);
        
        // Check if user is a company admin/owner (can see all locations) or employee manager (sees only their location)
        const isCompanyAdmin = roleData?.isAdmin || 
          companyUserData?.company_role === 'company_admin' || 
          companyUserData?.company_role === 'company_owner';
        const isEmployeeManager = empData.role?.toLowerCase() === 'manager';
        const isManager = isCompanyAdmin || roleData?.isManager || isEmployeeManager;
        
        if (isManager) {
          if (isCompanyAdmin || roleData?.isManager) {
            // Company admins and app managers can see all company locations
            const { data: locationsData } = await supabase
              .from("locations")
              .select("*")
              .eq("company_id", empData.company_id);
            
            if (locationsData) {
              setLocations(locationsData);
              if (!selectedLocation && locationsData.length > 0) {
                setSelectedLocation(empData.location_id || locationsData[0].id);
              }
            }
          } else if (isEmployeeManager) {
            // Employee managers only see their assigned location(s)
            const { data: locationsData } = await supabase
              .from("locations")
              .select("*")
              .eq("id", empData.location_id);
            
            if (locationsData) {
              setLocations(locationsData);
              if (!selectedLocation && locationsData.length > 0) {
                setSelectedLocation(locationsData[0].id);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to load schedule:", error);
      toast.error(t('staffSchedule.failedLoadSchedule'));
    } finally {
      setIsLoading(false);
    }
  };

  // Load location shifts when manager switches to location view
  useEffect(() => {
    if (viewMode === "location" && selectedLocation && employee) {
      loadLocationShifts();
    }
  }, [viewMode, selectedLocation, weekStart]);

  const loadLocationShifts = async () => {
    if (!selectedLocation) return;
    
    const weekEnd = addDays(weekStart, 6);
    
    // Load shifts for the location with assignments
    const { data: shiftsData, error } = await supabase
      .from("shifts")
      .select(`
        *,
        shift_assignments(
          id,
          staff_id,
          approval_status
        ),
        locations(name)
      `)
      .eq("location_id", selectedLocation)
      .gte("shift_date", format(weekStart, "yyyy-MM-dd"))
      .lte("shift_date", format(weekEnd, "yyyy-MM-dd"))
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Error loading location shifts:", error);
    }

    if (shiftsData) {
      // Get all unique staff IDs from assignments
      const staffIds = new Set<string>();
      shiftsData.forEach((shift: any) => {
        shift.shift_assignments?.forEach((assignment: any) => {
          if (assignment.staff_id) {
            staffIds.add(assignment.staff_id);
          }
        });
      });

      // Fetch employee details separately
      let employeesMap: Record<string, any> = {};
      if (staffIds.size > 0) {
        
        const { data: employeesData, error: empError } = await supabase
          .from("employees")
          .select("id, full_name, avatar_url, role")
          .in("id", Array.from(staffIds));
        
        if (empError) {
          console.error("Error fetching employees:", empError);
        }
        
        
        
        if (employeesData) {
          employeesData.forEach((emp: any) => {
            employeesMap[emp.id] = emp;
          });
        }
      }

      

      // Merge employee data into shifts
      const enrichedShifts = shiftsData.map((shift: any) => ({
        ...shift,
        shift_assignments: shift.shift_assignments?.map((assignment: any) => ({
          ...assignment,
          employees: employeesMap[assignment.staff_id] || null
        }))
      }));

      
      setLocationShifts(enrichedShifts);
    }

    // Load operating schedules
    const { data: schedulesData } = await supabase
      .from("location_operating_schedules")
      .select("*")
      .eq("location_id", selectedLocation)
      .order("day_of_week", { ascending: true });

    if (schedulesData) {
      setSchedules(schedulesData);
    }
  };

  const loadWeekShifts = async (employeeId: string) => {
    const weekEnd = addDays(weekStart, 6);
    const { data, error } = await supabase
      .from("shift_assignments")
      .select(`
        id,
        staff_id,
        shift_id,
        approval_status,
        status,
        notes,
        shifts:shift_id (
          id,
          shift_date,
          start_time,
          end_time,
          role,
          location_id,
          locations:location_id (
            name
          )
        )
      `)
      .eq("staff_id", employeeId)
      .in("approval_status", ["approved", "pending"])
      .gte("shifts.shift_date", weekStart.toISOString().split('T')[0])
      .lte("shifts.shift_date", weekEnd.toISOString().split('T')[0])
      .order("shift_date", { foreignTable: "shifts", ascending: true });

    if (error) {
      console.error("Error loading shifts:", error);
    }
    
    // Filter out assignments where shifts is null (happens when date filter excludes the shift)
    const validShifts = (data || []).filter(s => s.shifts !== null);
    setShifts(validShifts);
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = format(new Date(), "yyyy-MM-dd");
  
  // Filter to only show days with shifts
  const daysWithShifts = weekDays.filter(day => {
    const dayStr = format(day, "yyyy-MM-dd");
    return shifts.some(s => s.shifts?.shift_date === dayStr);
  });

  const handleOfferShift = (assignment: any) => {
    setSelectedShift(assignment);
    setOfferDialogOpen(true);
  };

  const handleSwapShift = async (assignment: any) => {
    setSelectedShift(assignment);
    setSwapDialogOpen(true);
    
    // Load colleagues from the same company
    if (employee) {
      try {
        const { data, error } = await supabase
          .from("employees")
          .select("id, full_name, role, avatar_url")
          .eq("company_id", employee.company_id)
          .eq("status", "active")
          .neq("id", employee.id)
          .order("full_name");

        if (error) throw error;
        setColleagues(data || []);
      } catch (error) {
        console.error("Error loading colleagues:", error);
        toast.error(t('staffSchedule.failedLoadColleagues'));
      }
    }
  };

  const submitOfferShift = async () => {
    if (!selectedShift) return;
    
    try {
      
      
      // Update shift assignment to mark it as offered
      const { data, error } = await supabase
        .from("shift_assignments")
        .update({
          status: "offered",
          notes: offerNote
        })
        .eq("id", selectedShift.id)
        .select();

      

      if (error) throw error;
      
      toast.success(t('staffSchedule.shiftOfferedSuccess'));
      setOfferDialogOpen(false);
      setOfferNote("");
      
      // Reload the shifts to see the updated status
      if (employee) {
        await loadWeekShifts(employee.id);
      }
    } catch (error: any) {
      console.error("Error offering shift:", error);
      toast.error(t('staffSchedule.failedOfferShift') + ": " + error.message);
    }
  };

  const submitSwapRequest = async () => {
    if (!selectedShift || !selectedColleague || !employee) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get target colleague role
      const { data: targetEmployee, error: targetError } = await supabase
        .from("employees")
        .select("role")
        .eq("id", selectedColleague)
        .single();

      if (targetError) throw targetError;

      // Check if roles are different
      const requiresManagerApproval = selectedShift.shifts.role !== targetEmployee.role;

      // Create swap request
      const { error } = await supabase
        .from("shift_swap_requests")
        .insert({
          requester_assignment_id: selectedShift.id,
          target_staff_id: selectedColleague,
          requester_notes: swapNote || null,
          created_by: user.id,
          company_id: employee.company_id,
          status: requiresManagerApproval ? "pending_manager_approval" : "pending",
          requires_manager_approval: requiresManagerApproval,
          target_response: "pending"
        });

      if (error) throw error;

      if (requiresManagerApproval) {
        toast.success(t('staffSchedule.swapSentManagerApproval'));
      } else {
        toast.success(t('staffSchedule.swapSentSuccess'));
      }
      
      setSwapDialogOpen(false);
      setSelectedColleague(null);
      setSwapNote("");
    } catch (error: any) {
      console.error("Error creating swap request:", error);
      toast.error(t('staffSchedule.failedCreateSwap') + ": " + error.message);
    }
  };

  // Check if user is a manager
  const isManager = roleData?.isManager || roleData?.isAdmin || 
    companyRole === 'company_admin' || companyRole === 'company_owner' ||
    employee?.role?.toLowerCase() === 'manager';

  const getLocationShiftsForDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return locationShifts.filter((shift) => shift.shift_date === dateStr);
  };

  const getOperatingHours = (date: Date) => {
    const dayOfWeek = (date.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
    const schedule = schedules.find(s => s.day_of_week === dayOfWeek);
    
    if (!schedule) return "24/7";
    if (schedule.is_closed) return "Closed";
    
    return `${schedule.open_time?.slice(0, 5) || "00:00"} - ${schedule.close_time?.slice(0, 5) || "00:00"}`;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      Manager: "bg-blue-500",
      Server: "bg-teal-500",
      Bartender: "bg-orange-500",
      Host: "bg-purple-500",
      Chef: "bg-yellow-500",
      "Line Cook": "bg-pink-500",
      Dishwasher: "bg-cyan-500",
    };
    return colors[role] || "bg-gray-500";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10 pt-safe">
        <div className="px-4 py-4">
          {isManager ? (
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "my" | "location")} className="mb-3">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="my" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {t('staffSchedule.mySchedule')}
                </TabsTrigger>
                <TabsTrigger value="location" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {t('staffSchedule.location')}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          ) : (
            <h1 className="text-xl font-bold mb-3">{t('staffSchedule.mySchedule')}</h1>
          )}
          
          {/* Week Navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={() => setWeekStart(subWeeks(weekStart, 1))}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="text-center">
              <div className="font-semibold">
                {format(weekStart, "MMM d")} - {format(addDays(weekStart, 6), "MMM d, yyyy")}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Quick Actions / Location Filter */}
          {viewMode === "location" && isManager ? (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {locations.map((location) => (
                <Button
                  key={location.id}
                  variant={selectedLocation === location.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedLocation(location.id)}
                >
                  {location.name}
                </Button>
              ))}
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
                {t('staffSchedule.today')}
              </Button>
              <Button variant="outline" size="sm">
                <Share className="h-4 w-4 mr-2" />
                {t('staffSchedule.export')}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === "location" && isManager ? (
        /* Location Schedule View */
        <div className="px-4 py-4 space-y-3">
          {weekDays.map((day) => {
            const dayShifts = getLocationShiftsForDay(day);
            const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
            
            return (
              <div key={day.toString()} className={isToday ? "bg-primary/5 -mx-4 px-4 py-3 rounded-lg" : ""}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold ${isToday ? "text-primary" : "text-foreground"}`}>
                      {format(day, "EEE, MMM d")}
                    </span>
                    <Badge variant="outline" className="text-sm font-medium px-2 py-1">
                      <Users className="h-4 w-4 mr-1" />
                      {dayShifts.length}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground font-medium">
                    {getOperatingHours(day)}
                  </span>
                </div>
                
                <div className="space-y-2">
                  {dayShifts.length === 0 ? (
                    <Card className="p-3 text-center text-sm text-muted-foreground">
                      {t('staffSchedule.noShiftsScheduled')}
                    </Card>
                  ) : (
                    dayShifts.map((shift) => (
                      <Card
                        key={shift.id}
                        className={`p-3 ${getRoleColor(shift.role)}/10 border-l-4`}
                        style={{ borderLeftColor: getRoleColor(shift.role).replace("bg-", "").replace("500", "#") }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            {shift.shift_assignments && shift.shift_assignments.length > 0 ? (
                              shift.shift_assignments.map((assignment: any) => (
                                <div key={assignment.id} className="flex items-center gap-3 mb-2">
                                  <div className="flex items-center gap-3 flex-1">
                                    <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-base font-bold">
                                      {assignment.employees?.full_name?.charAt(0) || "?"}
                                    </div>
                                    <span className="text-base font-semibold">
                                      {assignment.employees?.full_name || `Staff ID: ${assignment.staff_id?.substring(0, 8)}...`}
                                    </span>
                                  </div>
                                  <Badge variant={assignment.approval_status === "approved" ? "default" : "secondary"} className="text-xs font-medium">
                                    {assignment.approval_status}
                                  </Badge>
                                </div>
                              ))
                            ) : (
                              <span className="text-base text-muted-foreground italic font-medium">{t('staffSchedule.unassigned')}</span>
                            )}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                              <span className="font-medium">{shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}</span>
                              <Badge variant="outline" className="text-xs font-medium">
                                {shift.role}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* My Schedule View */
        <div className="px-4 py-4 space-y-3">
          {daysWithShifts.length === 0 ? (
            <Card className="p-8 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">{t('staffSchedule.noShiftsThisWeek')}</p>
              <p className="text-sm text-muted-foreground mt-1">{t('staffSchedule.checkBackLater')}</p>
            </Card>
          ) : (
            daysWithShifts.map((day) => {
              const dayStr = format(day, "yyyy-MM-dd");
              const isToday = dayStr === today;
              const dayShifts = shifts.filter(s => s.shifts.shift_date === dayStr);

              return (
                <Card 
                  key={dayStr} 
                  className={`p-4 ${isToday ? "border-primary bg-primary/5" : ""}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-semibold">{format(day, "EEEE")}</div>
                      <div className="text-sm text-muted-foreground">{format(day, "MMM d")}</div>
                    </div>
                    {isToday && <Badge>{t('staffSchedule.today')}</Badge>}
                  </div>

                  <div className="space-y-2">
                    {dayShifts.map((assignment: any) => (
                      <div key={assignment.id} className="bg-muted/50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">
                            {assignment.shifts.start_time.slice(0, 5)} - {assignment.shifts.end_time.slice(0, 5)}
                          </span>
                          <div className="flex gap-2">
                            {assignment.approval_status === "pending" && (
                              <Badge variant="outline" className="text-xs">{t('staffSchedule.pending')}</Badge>
                            )}
                            {assignment.status === "offered" && (
                              <Badge className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">
                                {t('staffSchedule.offered')}
                              </Badge>
                            )}
                            <Badge variant="secondary">{assignment.shifts.role}</Badge>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {assignment.shifts.locations?.name}
                        </div>
                        {assignment.status === "offered" && (
                          <div className={`mt-3 p-2 border rounded text-xs ${
                            dayStr < today 
                              ? "bg-muted/50 border-muted text-muted-foreground"
                              : "bg-amber-500/5 border-amber-500/20 text-amber-700 dark:text-amber-400"
                          }`}>
                            {dayStr < today 
                              ? t('staffSchedule.shiftExpiredNotClaimed')
                              : t('staffSchedule.waitingForClaim')
                            }
                            {assignment.notes && (
                              <div className="mt-1 text-muted-foreground">{t('staffSchedule.note')}: {assignment.notes}</div>
                            )}
                          </div>
                        )}
                        {assignment.approval_status === "approved" && assignment.status !== "offered" && (
                          dayStr < today ? (
                            <div className="mt-3 p-2 border rounded text-xs bg-muted/50 border-muted text-muted-foreground flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">{t('staffSchedule.completed')}</Badge>
                              <span>{t('staffSchedule.shiftEnded')}</span>
                            </div>
                          ) : (
                            <div className="flex gap-2 mt-3">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex-1"
                                onClick={() => handleOfferShift(assignment)}
                              >
                                <Share className="h-3 w-3 mr-1" />
                                {t('staffSchedule.offer')}
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex-1"
                                onClick={() => handleSwapShift(assignment)}
                              >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                {t('staffSchedule.swap')}
                              </Button>
                            </div>
                          )
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      <StaffBottomNav />

      {/* Offer Shift Dialog */}
      <Dialog open={offerDialogOpen} onOpenChange={setOfferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('staffSchedule.offerShift')}</DialogTitle>
            <DialogDescription>
              {t('staffSchedule.offerShiftDesc')}
            </DialogDescription>
          </DialogHeader>
          {selectedShift && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg">
                <div className="font-medium">
                  {format(new Date(selectedShift.shifts.shift_date), "EEEE, MMMM d")}
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedShift.shifts.start_time.slice(0, 5)} - {selectedShift.shifts.end_time.slice(0, 5)}
                </div>
                <Badge variant="secondary" className="mt-2">
                  {selectedShift.shifts.role}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="offer-note">{t('staffSchedule.noteOptional')}</Label>
                <Textarea
                  id="offer-note"
                  placeholder={t('staffSchedule.addDetailsPlaceholder')}
                  value={offerNote}
                  onChange={(e) => setOfferNote(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setOfferDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button className="flex-1" onClick={submitOfferShift}>
                  {t('staffSchedule.offerShift')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Swap Shift Dialog */}
      <Dialog open={swapDialogOpen} onOpenChange={setSwapDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('staffSchedule.swapShift')}</DialogTitle>
            <DialogDescription>
              {t('staffSchedule.swapShiftDesc')}
            </DialogDescription>
          </DialogHeader>
          {selectedShift && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">{t('staffSchedule.yourShift')}</div>
                <div className="font-medium">
                  {format(new Date(selectedShift.shifts.shift_date), "EEEE, MMMM d")}
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedShift.shifts.start_time.slice(0, 5)} - {selectedShift.shifts.end_time.slice(0, 5)}
                </div>
                <Badge variant="secondary" className="mt-2">
                  {selectedShift.shifts.role}
                </Badge>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">{t('staffSchedule.selectColleague')}</label>
                {colleagues.length === 0 ? (
                  <div className="text-sm text-muted-foreground p-4 text-center bg-muted rounded-lg">
                    {t('staffSchedule.noColleaguesAvailable')}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {colleagues.map((colleague) => (
                      <div
                        key={colleague.id}
                        onClick={() => setSelectedColleague(colleague.id)}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedColleague === colleague.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            {colleague.avatar_url ? (
                              <img 
                                src={colleague.avatar_url} 
                                alt={colleague.full_name}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-sm font-medium">
                                {colleague.full_name.split(" ").map((n: string) => n[0]).join("")}
                              </span>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm">{colleague.full_name}</div>
                            <div className="text-xs text-muted-foreground">{colleague.role}</div>
                          </div>
                          {selectedColleague === colleague.id && (
                            <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                              <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">{t('staffSchedule.noteOptional')}</label>
                <textarea
                  value={swapNote}
                  onChange={(e) => setSwapNote(e.target.value)}
                  placeholder={t('staffSchedule.addMessagePlaceholder')}
                  className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => {
                    setSwapDialogOpen(false);
                    setSelectedColleague(null);
                    setSwapNote("");
                  }}
                >
                  {t('common.cancel')}
                </Button>
                <Button 
                  className="flex-1" 
                  onClick={submitSwapRequest}
                  disabled={!selectedColleague}
                >
                  {t('staffSchedule.sendRequest')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffSchedule;
