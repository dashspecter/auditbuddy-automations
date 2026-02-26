import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, Wallet, User, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { ScoutNotificationBell } from '@/components/scout-portal/ScoutNotificationBell';
import { useScoutAuth } from '@/hooks/useScoutAuth';

const navItems = [
  { label: 'Jobs', icon: Briefcase, path: '/' },
  { label: 'Earnings', icon: Wallet, path: '/earnings' },
  { label: 'Profile', icon: User, path: '/profile' },
];

export default function ScoutPortalLayout() {
  const location = useLocation();
  const { scoutId } = useScoutAuth();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/' || location.pathname.startsWith('/jobs');
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <OfflineIndicator />
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b border-border px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-primary">
            Scouts
          </Link>
          <ScoutNotificationBell scoutId={scoutId} />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 pb-20">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-pb">
        <div className="max-w-lg mx-auto flex items-center justify-around h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2 px-3 min-w-[64px] min-h-[44px] transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
