import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StaffNav } from "@/components/staff/StaffNav";
import { ChevronLeft, ChevronRight, RefreshCw, Share, Calendar } from "lucide-react";
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

const StaffSchedule = () => {
  const { user } = useAuth();
  const [employee, setEmployee] = useState<any>(null);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [shifts, setShifts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [swapDialogOpen, setSwapDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<any>(null);
  const [offerNote, setOfferNote] = useState("");
  const [colleagues, setColleagues] = useState<any[]>([]);
  const [selectedColleague, setSelectedColleague] = useState<string | null>(null);
  const [swapNote, setSwapNote] = useState("");

  useEffect(() => {
    if (user) loadData();
  }, [user, weekStart]);

  const loadData = async () => {
    try {
      const { data: empData, error } = await supabase
        .from("employees")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (error) {
        console.error("Error loading employee:", error);
        toast.error("Failed to load schedule");
        return;
      }

      if (empData) {
        setEmployee(empData);
        await loadWeekShifts(empData.id);
      }
    } catch (error) {
      console.error("Failed to load schedule:", error);
      toast.error("Failed to load schedule");
    } finally {
      setIsLoading(false);
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
    
    setShifts(data || []);
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = format(new Date(), "yyyy-MM-dd");
  
  // Filter to only show days with shifts
  const daysWithShifts = weekDays.filter(day => {
    const dayStr = format(day, "yyyy-MM-dd");
    return shifts.some(s => s.shifts.shift_date === dayStr);
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
        toast.error("Failed to load colleagues");
      }
    }
  };

  const submitOfferShift = async () => {
    if (!selectedShift) return;
    
    try {
      console.log("Offering shift with ID:", selectedShift.id);
      
      // Update shift assignment to mark it as offered
      const { data, error } = await supabase
        .from("shift_assignments")
        .update({
          status: "offered",
          notes: offerNote
        })
        .eq("id", selectedShift.id)
        .select();

      console.log("Update result:", { data, error });

      if (error) throw error;
      
      toast.success("Shift offered successfully! Other employees can now claim it.");
      setOfferDialogOpen(false);
      setOfferNote("");
      
      // Reload the shifts to see the updated status
      if (employee) {
        await loadWeekShifts(employee.id);
      }
    } catch (error: any) {
      console.error("Error offering shift:", error);
      toast.error("Failed to offer shift: " + error.message);
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
        toast.success("Swap request sent! Manager approval is required for different roles.");
      } else {
        toast.success("Swap request sent! The colleague will be notified.");
      }
      
      setSwapDialogOpen(false);
      setSelectedColleague(null);
      setSwapNote("");
    } catch (error: any) {
      console.error("Error creating swap request:", error);
      toast.error("Failed to create swap request: " + error.message);
    }
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
          <h1 className="text-xl font-bold mb-3">My Schedule</h1>
          
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

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
              Today
            </Button>
            <Button variant="outline" size="sm">
              <Share className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Schedule Grid */}
      <div className="px-4 py-4 space-y-3">
        {daysWithShifts.length === 0 ? (
          <Card className="p-8 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No shifts scheduled this week</p>
            <p className="text-sm text-muted-foreground mt-1">Check back later or browse the shift pool</p>
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
                  {isToday && <Badge>Today</Badge>}
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
                            <Badge variant="outline" className="text-xs">Pending</Badge>
                          )}
                          {assignment.status === "offered" && (
                            <Badge className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">
                              Offered
                            </Badge>
                          )}
                          <Badge variant="secondary">{assignment.shifts.role}</Badge>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {assignment.shifts.locations?.name}
                      </div>
                      {assignment.status === "offered" && (
                        <div className="mt-3 p-2 bg-amber-500/5 border border-amber-500/20 rounded text-xs text-amber-700 dark:text-amber-400">
                          Waiting for someone to claim this shift
                          {assignment.notes && (
                            <div className="mt-1 text-muted-foreground">Note: {assignment.notes}</div>
                          )}
                        </div>
                      )}
                      {assignment.approval_status === "approved" && assignment.status !== "offered" && (
                        <div className="flex gap-2 mt-3">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleOfferShift(assignment)}
                          >
                            <Share className="h-3 w-3 mr-1" />
                            Offer
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleSwapShift(assignment)}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Swap
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            );
          })
        )}
      </div>

      <StaffNav />

      {/* Offer Shift Dialog */}
      <Dialog open={offerDialogOpen} onOpenChange={setOfferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Offer Shift</DialogTitle>
            <DialogDescription>
              Make this shift available for other employees to claim.
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
                <Label htmlFor="offer-note">Note (optional)</Label>
                <Textarea
                  id="offer-note"
                  placeholder="Add any details about this shift..."
                  value={offerNote}
                  onChange={(e) => setOfferNote(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setOfferDialogOpen(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={submitOfferShift}>
                  Offer Shift
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
            <DialogTitle>Swap Shift</DialogTitle>
            <DialogDescription>
              Select a colleague to request a shift swap with.
            </DialogDescription>
          </DialogHeader>
          {selectedShift && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Your Shift</div>
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
                <label className="text-sm font-medium mb-2 block">Select Colleague</label>
                {colleagues.length === 0 ? (
                  <div className="text-sm text-muted-foreground p-4 text-center bg-muted rounded-lg">
                    No colleagues available
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
                <label className="text-sm font-medium mb-2 block">Note (Optional)</label>
                <textarea
                  value={swapNote}
                  onChange={(e) => setSwapNote(e.target.value)}
                  placeholder="Add a message for your colleague..."
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
                  Cancel
                </Button>
                <Button 
                  className="flex-1" 
                  onClick={submitSwapRequest}
                  disabled={!selectedColleague}
                >
                  Send Request
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
