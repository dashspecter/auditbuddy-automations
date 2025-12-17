import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type WorkOrderStatus = 'Open' | 'OnHold' | 'InProgress' | 'Done' | 'Cancelled';

interface WorkOrderStatusButtonsProps {
  currentStatus: WorkOrderStatus;
  onStatusChange: (status: WorkOrderStatus) => void;
  disabled?: boolean;
}

const statusConfig: Record<WorkOrderStatus, { label: string; color: string }> = {
  Open: { label: 'Open', color: 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-500/30' },
  OnHold: { label: 'On Hold', color: 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/30' },
  InProgress: { label: 'In Progress', color: 'bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 border-purple-500/30' },
  Done: { label: 'Done', color: 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/30' },
  Cancelled: { label: 'Cancelled', color: 'bg-muted text-muted-foreground hover:bg-muted/80 border-border' },
};

export function WorkOrderStatusButtons({ currentStatus, onStatusChange, disabled }: WorkOrderStatusButtonsProps) {
  const mainStatuses: WorkOrderStatus[] = ['Open', 'OnHold', 'InProgress', 'Done'];

  return (
    <div className="flex flex-wrap gap-2">
      {mainStatuses.map((status) => {
        const config = statusConfig[status];
        const isActive = currentStatus === status;
        
        return (
          <Button
            key={status}
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onStatusChange(status)}
            className={cn(
              "border transition-all",
              isActive ? config.color : "bg-background hover:bg-muted"
            )}
          >
            {config.label}
          </Button>
        );
      })}
    </div>
  );
}

export function WorkOrderStatusBadge({ status }: { status: WorkOrderStatus }) {
  const config = statusConfig[status] || statusConfig.Open;
  
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
      config.color
    )}>
      {config.label}
    </span>
  );
}
