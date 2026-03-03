import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { ArrowRight, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';

export const CommandHeader = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const displayName = user?.user_metadata?.full_name?.split(' ')[0] ?? '';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {greeting}{displayName ? `, ${displayName}` : ''} 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            {format(now, 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <Badge variant="secondary" className="gap-1 text-xs">
          <Eye className="h-3 w-3" />
          Read-only
        </Badge>
      </div>
      <Link
        to="/dashboard"
        className="flex items-center gap-1 text-sm text-primary font-medium hover:underline"
      >
        Go to Full Dashboard
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
};
