import { addDays, addWeeks, addMonths, addYears, format } from "date-fns";

export interface RecurrenceConfig {
  pattern: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  startDate: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
}

export const calculateNextDates = (
  config: RecurrenceConfig,
  count: number = 5
): Date[] => {
  const dates: Date[] = [];
  let currentDate = new Date(config.startDate);

  for (let i = 0; i < count; i++) {
    dates.push(new Date(currentDate));

    switch (config.pattern) {
      case "daily":
        currentDate = addDays(currentDate, 1);
        break;
      case "weekly":
        currentDate = addWeeks(currentDate, 1);
        if (config.dayOfWeek !== undefined) {
          // Adjust to the specified day of week
          const targetDay = config.dayOfWeek;
          const currentDay = currentDate.getDay();
          if (currentDay !== targetDay) {
            const daysToAdd = (targetDay - currentDay + 7) % 7;
            currentDate = addDays(currentDate, daysToAdd || 7);
          }
        }
        break;
      case "monthly":
        currentDate = addMonths(currentDate, 1);
        if (config.dayOfMonth !== undefined) {
          // Set to the specified day of month
          const targetDay = Math.min(config.dayOfMonth, getDaysInMonth(currentDate));
          currentDate.setDate(targetDay);
        }
        break;
      case "quarterly":
        currentDate = addMonths(currentDate, 3);
        if (config.dayOfMonth !== undefined) {
          const targetDay = Math.min(config.dayOfMonth, getDaysInMonth(currentDate));
          currentDate.setDate(targetDay);
        }
        break;
      case "yearly":
        currentDate = addYears(currentDate, 1);
        break;
    }
  }

  return dates;
};

const getDaysInMonth = (date: Date): number => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

export const formatSchedulePreview = (dates: Date[]): string[] => {
  return dates.map(date => format(date, "MMM d, yyyy"));
};
