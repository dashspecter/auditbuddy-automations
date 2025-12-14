import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Users, Eye } from "lucide-react";

interface PresenceUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  viewing_location?: string;
  online_at: string;
}

interface SchedulePresenceIndicatorProps {
  activeUsers: PresenceUser[];
  locations?: Array<{ id: string; name: string }>;
}

export const SchedulePresenceIndicator = ({ activeUsers, locations = [] }: SchedulePresenceIndicatorProps) => {
  if (activeUsers.length === 0) return null;

  const getLocationName = (locationId?: string) => {
    if (!locationId || locationId === 'all') return 'All Locations';
    return locations.find(l => l.id === locationId)?.name || 'Unknown Location';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const maxVisible = 3;
  const visibleUsers = activeUsers.slice(0, maxVisible);
  const remainingCount = activeUsers.length - maxVisible;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
        <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
          {activeUsers.length === 1 ? '1 person' : `${activeUsers.length} people`} viewing
        </span>
        
        <div className="flex -space-x-2">
          {visibleUsers.map((user) => (
            <Tooltip key={user.id}>
              <TooltipTrigger asChild>
                <Avatar className="h-6 w-6 border-2 border-white dark:border-gray-900 cursor-pointer">
                  <AvatarImage src={user.avatar_url} alt={user.full_name} />
                  <AvatarFallback className="text-xs bg-blue-500 text-white">
                    {getInitials(user.full_name)}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm">
                  <p className="font-medium">{user.full_name}</p>
                  <p className="text-muted-foreground text-xs">
                    Viewing: {getLocationName(user.viewing_location)}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
          
          {remainingCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-900 flex items-center justify-center cursor-pointer">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                    +{remainingCount}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm">
                  {activeUsers.slice(maxVisible).map(user => (
                    <p key={user.id}>{user.full_name}</p>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};
