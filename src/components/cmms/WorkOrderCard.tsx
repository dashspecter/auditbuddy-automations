import { format, isPast, isToday, isTomorrow } from "date-fns";
import { MapPin, Wrench, User, Clock } from "lucide-react";
import { WorkOrderStatusBadge, WorkOrderStatus } from "./WorkOrderStatusButtons";
import { WorkOrderPriorityBadge, WorkOrderPriority } from "./WorkOrderPriorityBadge";
import { cn } from "@/lib/utils";

export interface WorkOrderCardData {
  id: string;
  wo_number: number;
  title: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  due_at: string | null;
  asset_name?: string | null;
  location_name?: string | null;
  assigned_user_name?: string | null;
}

interface WorkOrderCardProps {
  workOrder: WorkOrderCardData;
  isSelected?: boolean;
  onClick?: () => void;
}

export function WorkOrderCard({ workOrder, isSelected, onClick }: WorkOrderCardProps) {
  const isOverdue = workOrder.due_at && isPast(new Date(workOrder.due_at)) && 
    workOrder.status !== 'Done' && workOrder.status !== 'Cancelled';
  
  const getDueDateLabel = () => {
    if (!workOrder.due_at) return null;
    const date = new Date(workOrder.due_at);
    
    if (isOverdue) {
      return <span className="text-destructive font-medium">Overdue • {format(date, 'MMM d')}</span>;
    }
    if (isToday(date)) {
      return <span className="text-amber-600 font-medium">Due today</span>;
    }
    if (isTomorrow(date)) {
      return <span className="text-amber-500">Due tomorrow</span>;
    }
    return <span className="text-muted-foreground">Due {format(date, 'MMM d')}</span>;
  };

  return (
    <div 
      className={cn(
        "p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm",
        isSelected 
          ? "bg-accent border-primary/50 shadow-sm" 
          : "bg-card hover:bg-accent/50 border-border"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-medium text-sm line-clamp-2">{workOrder.title}</h4>
        <WorkOrderStatusBadge status={workOrder.status} />
      </div>
      
      <div className="space-y-1.5 text-xs text-muted-foreground">
        {workOrder.asset_name && (
          <div className="flex items-center gap-1.5">
            <Wrench className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{workOrder.asset_name}</span>
          </div>
        )}
        
        {workOrder.location_name && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{workOrder.location_name}</span>
          </div>
        )}
        
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <WorkOrderPriorityBadge priority={workOrder.priority} showLabel={false} />
            <span className="text-muted-foreground">WO #{workOrder.wo_number}</span>
          </div>
          
          {workOrder.assigned_user_name && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span className="truncate max-w-[80px]">{workOrder.assigned_user_name}</span>
            </div>
          )}
        </div>
        
        {workOrder.due_at && (
          <div className="flex items-center gap-1.5 pt-0.5">
            <Clock className="h-3 w-3" />
            {getDueDateLabel()}
          </div>
        )}
      </div>
    </div>
  );
}
