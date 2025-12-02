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

  const handleSwapShift = (assignment: any) => {
    setSelectedShift(assignment);
    setSwapDialogOpen(true);
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
    if (!selectedShift) return;
    
    try {
      // Create a swap request (this could be a new table or notification)
      toast.info("Swap requests feature coming soon! You'll be able to select another shift to swap with.");
      setSwapDialogOpen(false);
    } catch (error: any) {
      console.error("Error creating swap request:", error);
      toast.error("Failed to create swap request");
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Swap Shift</DialogTitle>
            <DialogDescription>
              Request to swap this shift with another employee.
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
              
              <div className="text-sm text-muted-foreground">
                Swap functionality allows you to exchange shifts with another employee. This feature will let you browse available shifts and request a swap.
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setSwapDialogOpen(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={submitSwapRequest}>
                  Continue
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
