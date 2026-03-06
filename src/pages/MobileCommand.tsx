import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMobileCommandData } from '@/hooks/useMobileCommandData';
import { useAppVisibility } from '@/hooks/useAppVisibility';
import { PullToRefresh } from '@/components/PullToRefresh';
import { CommandHeader } from '@/components/mobile-command/CommandHeader';
import { LiveWorkforceSection } from '@/components/mobile-command/LiveWorkforceSection';
import { TodayAuditsSection } from '@/components/mobile-command/TodayAuditsSection';
import { WeeklyAuditSummarySection } from '@/components/mobile-command/WeeklyAuditSummary';
import { MonthlyNegativeSummarySection } from '@/components/mobile-command/MonthlyNegativeSummary';

const MobileCommand = () => {
  const navigate = useNavigate();
  const {
    clockedIn,
    scheduledToday,
    scheduledAudits,
    completedAudits,
    weeklySummary,
    monthlyNegatives,
    refetchAll,
    userRole,
  } = useMobileCommandData();

  useEffect(() => {
    if (userRole && userRole !== 'company_owner' && userRole !== 'company_admin') {
      navigate('/dashboard', { replace: true });
    }
  }, [userRole, navigate]);

  useAppVisibility({
    onVisible: () => { refetchAll(); },
  });

  return (
    <div className="min-h-screen bg-background px-safe py-safe">
      <PullToRefresh onRefresh={refetchAll}>
        <div className="max-w-lg mx-auto p-4 space-y-4 pb-8">
          <CommandHeader />

          <LiveWorkforceSection
            data={clockedIn.data}
            scheduled={scheduledToday.data}
            isLoading={clockedIn.isLoading || scheduledToday.isLoading}
          />

          <TodayAuditsSection
            scheduled={scheduledAudits.data}
            completed={completedAudits.data}
            isLoading={scheduledAudits.isLoading || completedAudits.isLoading}
          />

          <WeeklyAuditSummarySection
            data={weeklySummary.data}
            isLoading={weeklySummary.isLoading}
          />

          <MonthlyNegativeSummarySection
            data={monthlyNegatives.data}
            isLoading={monthlyNegatives.isLoading}
          />
        </div>
      </PullToRefresh>
    </div>
  );
};

export default MobileCommand;
