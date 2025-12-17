import { useState } from "react";
import { format } from "date-fns";
import { 
  Calendar, MapPin, Wrench, User, FileText, Paperclip, 
  MessageSquare, Clock, Edit2, MoreHorizontal, ChevronDown 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorkOrderStatusButtons, WorkOrderStatus } from "./WorkOrderStatusButtons";
import { WorkOrderPriorityBadge, WorkOrderPriority } from "./WorkOrderPriorityBadge";
import { useUpdateCmmsWorkOrder, useAddCmmsWorkOrderComment, type CmmsWorkOrder } from "@/hooks/useCmmsWorkOrders";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface WorkOrderDetailProps {
  workOrder: CmmsWorkOrder;
  onClose?: () => void;
}

export function WorkOrderDetail({ workOrder, onClose }: WorkOrderDetailProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const updateWorkOrder = useUpdateCmmsWorkOrder();
  const addComment = useAddCmmsWorkOrderComment();
  
  const [isEditing, setIsEditing] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [editedTitle, setEditedTitle] = useState(workOrder.title);
  const [editedDescription, setEditedDescription] = useState(workOrder.description || "");

  const handleStatusChange = async (status: WorkOrderStatus) => {
    try {
      const updates: Record<string, any> = { status };
      if (status === 'InProgress' && !workOrder.started_at) {
        updates.started_at = new Date().toISOString();
      }
      if (status === 'Done' && !workOrder.completed_at) {
        updates.completed_at = new Date().toISOString();
      }
      
      await updateWorkOrder.mutateAsync({ id: workOrder.id, ...updates });
      toast({ title: "Status updated" });
    } catch (error) {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  const handlePriorityChange = async (priority: WorkOrderPriority) => {
    try {
      await updateWorkOrder.mutateAsync({ id: workOrder.id, priority });
      toast({ title: "Priority updated" });
    } catch (error) {
      toast({ title: "Failed to update priority", variant: "destructive" });
    }
  };

  const handleSaveChanges = async () => {
    try {
      await updateWorkOrder.mutateAsync({
        id: workOrder.id,
        title: editedTitle,
        description: editedDescription,
      });
      setIsEditing(false);
      toast({ title: "Work order updated" });
    } catch (error) {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return;
    
    try {
      await addComment.mutateAsync({
        workOrderId: workOrder.id,
        comment: newComment.trim()
      });
      setNewComment("");
      toast({ title: "Comment added" });
    } catch (error) {
      toast({ title: "Failed to add comment", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="font-semibold text-lg"
              />
            ) : (
              <h2 className="font-semibold text-lg">{workOrder.title}</h2>
            )}
            <p className="text-sm text-muted-foreground mt-0.5">
              WO #{workOrder.wo_number}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {isEditing ? (
              <>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveChanges} disabled={updateWorkOrder.isPending}>
                  Save
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Status buttons */}
        <div className="mt-4">
          <WorkOrderStatusButtons
            currentStatus={workOrder.status as WorkOrderStatus}
            onStatusChange={handleStatusChange}
            disabled={updateWorkOrder.isPending}
          />
          <p className="text-xs text-muted-foreground mt-2">
            Tap a status to update instantly.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Fields Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Due Date
            </Label>
            <p className="text-sm font-medium">
              {workOrder.due_at ? format(new Date(workOrder.due_at), 'MMM d, yyyy') : 'Not set'}
            </p>
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              Assigned To
            </Label>
            <p className="text-sm font-medium">
              {workOrder.assigned_user_id ? 'User assigned' : 'Unassigned'}
            </p>
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Priority</Label>
            <Select
              value={workOrder.priority}
              onValueChange={(value) => handlePriorityChange(value as WorkOrderPriority)}
            >
              <SelectTrigger className="h-8">
                <SelectValue>
                  <WorkOrderPriorityBadge priority={workOrder.priority as WorkOrderPriority} />
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {['low', 'medium', 'high', 'urgent'].map((p) => (
                  <SelectItem key={p} value={p}>
                    <WorkOrderPriorityBadge priority={p as WorkOrderPriority} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Type</Label>
            <p className="text-sm font-medium capitalize">{workOrder.type}</p>
          </div>
          
          {workOrder.asset_id && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Wrench className="h-3.5 w-3.5" />
                Asset
              </Label>
              <p className="text-sm font-medium">Asset linked</p>
            </div>
          )}
          
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Location
            </Label>
            <p className="text-sm font-medium">
              {workOrder.location_id ? 'Location set' : 'Not set'}
            </p>
          </div>
        </div>

        <Separator />

        {/* Description */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Description
          </Label>
          {isEditing ? (
            <Textarea
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              placeholder="Add a clear description of the issue or task…"
              rows={4}
            />
          ) : (
            <p className="text-sm whitespace-pre-wrap">
              {workOrder.description || (
                <span className="text-muted-foreground italic">
                  Add a clear description of the issue or task…
                </span>
              )}
            </p>
          )}
        </div>

        {/* Attachments */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Paperclip className="h-3.5 w-3.5" />
            Attachments
          </Label>
          <Button variant="outline" size="sm" className="w-full">
            Add photos / files
          </Button>
        </div>

        <Separator />

        {/* Comments */}
        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            Comments
          </Label>
          
          <div className="space-y-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              rows={2}
            />
            <Button 
              size="sm" 
              onClick={handleAddComment}
              disabled={!newComment.trim() || addComment.isPending}
            >
              Add Comment
            </Button>
          </div>
        </div>

        {/* Time tracking */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1">
            <Clock className="h-4 w-4 mr-1.5" />
            Log Time
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <Wrench className="h-4 w-4 mr-1.5" />
            Add Parts
          </Button>
        </div>
      </div>
    </div>
  );
}
