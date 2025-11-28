import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Clock, Calendar } from "lucide-react";
import { useLocationAudits } from "@/hooks/useAudits";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { Link } from "react-router-dom";
import { StatsCard } from "./StatsCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { SwipeableListItem } from "@/components/SwipeableListItem";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export const RecentAudits = () => {
  const { data: locationAudits, isLoading: locationLoading } = useLocationAudits();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);

  const thisWeekAudits = (locationAudits || [])
    .filter((audit) => {
      const auditDate = new Date(audit.audit_date);
      return auditDate >= weekStart && auditDate <= weekEnd;
    })
    .sort((a, b) => new Date(b.audit_date).getTime() - new Date(a.audit_date).getTime());

  const handleCardClick = () => {
    if (thisWeekAudits.length > 0) {
      setDialogOpen(true);
    }
  };

  return (
    <>
      <div onClick={handleCardClick} className={thisWeekAudits.length > 0 ? "cursor-pointer" : ""}>
        <StatsCard
          title="This Week Audits"
          value={locationLoading ? "..." : thisWeekAudits.length.toString()}
          icon={Calendar}
          description="Current week"
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>This Week's Audits</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {thisWeekAudits.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No audits this week</p>
              </div>
            ) : (
              thisWeekAudits.map((audit) => (
                <SwipeableListItem
                  key={audit.id}
                  onDelete={async () => {
                    try {
                      const { error } = await supabase
                        .from('location_audits')
                        .delete()
                        .eq('id', audit.id);

                      if (error) throw error;

                      toast({
                        title: "Audit deleted",
                        description: "The audit has been successfully deleted.",
                      });
                      
                      await queryClient.invalidateQueries({ queryKey: ['location_audits'] });
                    } catch (error) {
                      console.error('Error deleting audit:', error);
                      toast({
                        title: "Error",
                        description: "Failed to delete audit.",
                        variant: "destructive",
                      });
                    }
                  }}
                  className="rounded-lg"
                >
                  <Link
                    to={`/audits/${audit.id}`}
                    onClick={() => setDialogOpen(false)}
                    className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors block"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{audit.location}</p>
                        <Badge variant="location" className="text-xs">
                          Location
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(audit.audit_date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {audit.overall_score !== null && audit.overall_score !== undefined && (
                        <span className="text-lg font-bold text-foreground">
                          {audit.overall_score}%
                        </span>
                      )}
                      {audit.status === "compliant" && (
                        <Badge className="bg-success text-success-foreground gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Compliant
                        </Badge>
                      )}
                      {audit.status === "non-compliant" && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Issues Found
                        </Badge>
                      )}
                      {audit.status === "pending" && (
                        <Badge variant="outline" className="gap-1">
                          <Clock className="h-3 w-3" />
                          Pending
                        </Badge>
                      )}
                    </div>
                  </Link>
                </SwipeableListItem>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
