import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";

interface UserAvatarProps {
  avatarUrl?: string | null;
  userName?: string | null;
  userEmail?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16'
};

const iconSizes = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-8 w-8'
};

export const UserAvatar = ({ 
  avatarUrl, 
  userName, 
  userEmail,
  size = 'md',
  className = '' 
}: UserAvatarProps) => {
  const getInitials = () => {
    if (userName) {
      const names = userName.split(' ');
      if (names.length >= 2) {
        return `${names[0].charAt(0)}${names[1].charAt(0)}`.toUpperCase();
      }
      return userName.substring(0, 2).toUpperCase();
    }
    if (userEmail) {
      return userEmail.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      <AvatarImage src={avatarUrl || undefined} alt={userName || userEmail || 'User'} />
      <AvatarFallback className="bg-primary/10 text-primary">
        {avatarUrl === null || avatarUrl === undefined ? (
          <User className={iconSizes[size]} />
        ) : (
          getInitials()
        )}
      </AvatarFallback>
    </Avatar>
  );
};
