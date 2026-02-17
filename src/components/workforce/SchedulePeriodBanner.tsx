import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Send, 
  Lock, 
  Unlock, 
  FileEdit, 
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { 
  SchedulePeriod,
  usePublishSchedulePeriod,
  useLockSchedulePeriod,
  useUnlockSchedulePeriod,
  usePublishAndLockSchedulePeriod,
  usePendingChangeRequests
} from "@/hooks/useScheduleGovernance";
import { useCompany } from "@/hooks/useCompany";

interface SchedulePeriodBannerProps {
  period: SchedulePeriod | null;
  isLoading?: boolean;
  locationName?: string;
  onViewChangeRequests?: () => void;
}

export const SchedulePeriodBanner = ({
  period,
  isLoading,
  locationName,
  onViewChangeRequests,
}: SchedulePeriodBannerProps) => {
  const [confirmDialog, setConfirmDialog] = useState<'publish' | 'lock' | 'publish_and_lock' | 'unlock' | null>(null);
  
  const { data: company } = useCompany();
  const publishMutation = usePublishSchedulePeriod();
  const lockMutation = useLockSchedulePeriod();
  const unlockMutation = useUnlockSchedulePeriod();
  const publishAndLockMutation = usePublishAndLockSchedulePeriod();
  const { data: pendingRequests = [] } = usePendingChangeRequests(period?.id);
  
  const pendingCount = pendingRequests.length;
  const isOwnerOrAdmin = company?.userRole === 'company_owner' || company?.userRole === 'company_admin';

  if (!period && !isLoading) return null;

  const handlePublish = async () => {
    if (!period) return;
    await publishMutation.mutateAsync({ periodId: period.id });
    setConfirmDialog(null);
  };

  const handleLock = async () => {
    if (!period) return;
    await lockMutation.mutateAsync({ periodId: period.id });
    setConfirmDialog(null);
  };

  const handlePublishAndLock = async () => {
    if (!period) return;
    await publishAndLockMutation.mutateAsync({ periodId: period.id });
    setConfirmDialog(null);
  };

  const handleUnlock = async () => {
    if (!period) return;
    await unlockMutation.mutateAsync({ periodId: period.id });
    setConfirmDialog(null);
  };

  const getStateInfo = () => {
    switch (period?.state) {
      case 'draft':
        return {
          icon: FileEdit,
          label: 'Draft',
          variant: 'secondary' as const,
          color: 'text-muted-foreground',
          bgColor: 'bg-muted/50',
          description: 'Schedule is not yet visible to staff. Publish to notify them.',
        };
      case 'published':
        return {
          icon: Send,
          label: 'Published',
          variant: 'default' as const,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50 dark:bg-blue-950/30',
          description: 'Staff can see this schedule. Lock to prevent further changes.',
        };
      case 'locked':
        return {
          icon: Lock,
          label: 'Locked',
          variant: 'outline' as const,
          color: 'text-green-600',
          bgColor: 'bg-green-50 dark:bg-green-950/30',
          description: 'Schedule is finalized. Changes require approval.',
        };
      default:
        return {
          icon: Clock,
          label: 'Loading',
          variant: 'secondary' as const,
          color: 'text-muted-foreground',
          bgColor: 'bg-muted/50',
          description: '',
        };
    }
  };

  const stateInfo = getStateInfo();
  const StateIcon = stateInfo.icon;
  const isPending = publishMutation.isPending || lockMutation.isPending || publishAndLockMutation.isPending || unlockMutation.isPending;

  return (
    <>
      <div className={`rounded-lg border px-4 py-3 ${stateInfo.bgColor}`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${stateInfo.bgColor}`}>
              <StateIcon className={`h-5 w-5 ${stateInfo.color}`} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">Schedule Status:</span>
                <Badge variant={stateInfo.variant}>{stateInfo.label}</Badge>
                {locationName && (
                  <span className="text-sm text-muted-foreground">• {locationName}</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {stateInfo.description}
              </p>
              {/* Timestamps for published/locked states */}
              {period?.state === 'published' && period.published_at && (
                <p className="text-xs text-muted-foreground mt-1">
                  Published {format(new Date(period.published_at), 'MMM d, h:mm a')}
                </p>
              )}
              {period?.state === 'locked' && (
                <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                  {period.published_at && (
                    <p>Published {format(new Date(period.published_at), 'MMM d, h:mm a')}</p>
                  )}
                  {period.locked_at && (
                    <p>Locked {format(new Date(period.locked_at), 'MMM d, h:mm a')}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Pending change requests indicator */}
            {pendingCount > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={onViewChangeRequests}
                    >
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      <span>{pendingCount} Pending</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {pendingCount} change request{pendingCount !== 1 ? 's' : ''} awaiting approval
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Action buttons based on state */}
            {period?.state === 'draft' && (
              <>
                <Button
                  variant="default"
                  size="sm"
                  className="gap-1"
                  onClick={() => setConfirmDialog('publish')}
                  disabled={isPending}
                >
                  <Send className="h-4 w-4" />
                  Publish
                </Button>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => setConfirmDialog('publish_and_lock')}
                        disabled={isPending}
                      >
                        <Lock className="h-4 w-4" />
                        Publish & Lock
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Publish the schedule and immediately lock it to prevent changes
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            )}

            {period?.state === 'published' && (
              <Button
                variant="default"
                size="sm"
                className="gap-1"
                onClick={() => setConfirmDialog('lock')}
                disabled={isPending}
              >
                <Lock className="h-4 w-4" />
                Lock Schedule
              </Button>
            )}

            {period?.state === 'locked' && isOwnerOrAdmin && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => setConfirmDialog('unlock')}
                disabled={isPending}
              >
                <Unlock className="h-4 w-4" />
                Unlock Schedule
              </Button>
            )}

            {period?.state === 'locked' && !isOwnerOrAdmin && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>Finalized</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    Only company owners or admins can unlock the schedule. Contact them if you need to make changes.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation dialogs */}
      <AlertDialog open={confirmDialog === 'publish'} onOpenChange={() => setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish Schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              This will make the schedule visible to all staff members. They will be able to see their assigned shifts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePublish} disabled={isPending}>
              {isPending ? 'Publishing...' : 'Publish'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDialog === 'lock'} onOpenChange={() => setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lock Schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              Locking the schedule will prevent direct edits. Any changes will need to go through the approval process.
              This helps maintain schedule stability and provides an audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLock} disabled={isPending}>
              {isPending ? 'Locking...' : 'Lock Schedule'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDialog === 'publish_and_lock'} onOpenChange={() => setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish and Lock Schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              This will publish the schedule to staff and immediately lock it.
              Any future changes will require manager approval.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePublishAndLock} disabled={isPending}>
              {isPending ? 'Processing...' : 'Publish & Lock'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDialog === 'unlock'} onOpenChange={() => setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlock Schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revert the schedule to "Published" status, allowing direct edits again.
              Any pending change requests will remain but new changes won't require approval until the schedule is locked again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnlock} disabled={isPending}>
              {isPending ? 'Unlocking...' : 'Unlock Schedule'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
