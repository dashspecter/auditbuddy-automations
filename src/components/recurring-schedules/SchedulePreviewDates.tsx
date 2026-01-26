import { useMemo } from 'react';
import { CalendarDays } from 'lucide-react';
import { calculateNextDates, RecurrenceConfig } from '@/lib/recurringScheduleUtils';
import { format } from 'date-fns';

interface SchedulePreviewDatesProps {
  pattern: 'daily' | 'weekly' | 'monthly';
  startDate: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
}

/**
 * Preview component showing next 5 scheduled dates based on recurrence config.
 * Helps users visualize when audits will be generated.
 */
export const SchedulePreviewDates = ({
  pattern,
  startDate,
  dayOfWeek,
  dayOfMonth,
}: SchedulePreviewDatesProps) => {
  const previewDates = useMemo(() => {
    if (!startDate) return [];

    const config: RecurrenceConfig = {
      pattern,
      startDate,
      dayOfWeek: pattern === 'weekly' ? dayOfWeek : undefined,
      dayOfMonth: pattern === 'monthly' ? dayOfMonth : undefined,
    };

    return calculateNextDates(config, 5);
  }, [pattern, startDate, dayOfWeek, dayOfMonth]);

  if (previewDates.length === 0) return null;

  return (
    <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <CalendarDays className="h-4 w-4" />
        <span>Preview: Next 5 scheduled dates</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {previewDates.map((date, index) => (
          <span
            key={index}
            className="inline-flex items-center rounded-md bg-background px-2 py-1 text-xs font-medium border"
          >
            {format(date, 'EEE, MMM d, yyyy')}
          </span>
        ))}
      </div>
    </div>
  );
};
