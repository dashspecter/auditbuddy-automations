import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import {
  addBrandedHeader,
  addBrandedFooter,
  getBrandedTableStyles,
  addSectionTitle,
  BRAND_COLORS,
  loadLogoForPDF,
} from './pdfBranding';
import type { PayrollEmployeeDetail } from '@/hooks/usePayrollBatchDetails';

interface PayrollReportOptions {
  employees: PayrollEmployeeDetail[];
  periodStart: string;
  periodEnd: string;
}

function formatDateList(dates: string[]): string {
  if (dates.length === 0) return '';
  return dates.map(d => format(parseISO(d), 'MMM d')).join(', ');
}

function formatMissingCol(count: number, dates: string[]): string {
  if (count === 0) return '0';
  return `${count} (${formatDateList(dates)})`;
}

function formatEarlyDepCol(details: Array<{ date: string; reason: string; minutes_early: number }>): string {
  if (details.length === 0) return '0';
  const items = details.map(d => {
    const hrs = Math.floor(d.minutes_early / 60);
    const mins = d.minutes_early % 60;
    const timeStr = hrs > 0 ? `${hrs}h${mins > 0 ? `${mins}m` : ''}` : `${mins}m`;
    return `${format(parseISO(d.date), 'MMM d')}: ${timeStr} early — ${d.reason}`;
  });
  return `${details.length} (${items.join('; ')})`;
}

function formatAbsentCol(details: Array<{ date: string; reason_code: string }>): string {
  if (details.length === 0) return '0';
  const items = details.map(d => `${format(parseISO(d.date), 'MMM d')}: ${d.reason_code}`);
  return `${details.length} (${items.join('; ')})`;
}

function formatLateCol(count: number, totalMinutes: number): string {
  if (count === 0) return '0';
  return `${count} (${totalMinutes}min)`;
}

function formatCrossLocCol(details: Array<{ date: string; location_name: string }>): string {
  if (details.length === 0) return '0';
  const items = details.map(d => `${format(parseISO(d.date), 'MMM d')}: ${d.location_name}`);
  return `${details.length} (${items.join('; ')})`;
}

export async function generatePayrollReportPDF({ employees, periodStart, periodEnd }: PayrollReportOptions) {
  const doc = new jsPDF({ orientation: 'landscape' });
  const periodLabel = `${format(parseISO(periodStart), 'MMM d')} – ${format(parseISO(periodEnd), 'MMM d, yyyy')}`;

  let logoDataUrl: string | undefined;
  try { logoDataUrl = await loadLogoForPDF(); } catch { /* fallback */ }

  // Header
  addBrandedHeader(doc, 'Payroll Summary Report', periodLabel, logoDataUrl);

  // ── Company-Wide Summary ──
  let y = 55;
  y = addSectionTitle(doc, 'Company-Wide Summary', y);

  const totals = employees.reduce(
    (acc, e) => ({
      regularHours: acc.regularHours + e.regular_hours,
      overtimeHours: acc.overtimeHours + e.overtime_hours,
      vacation: acc.vacation + e.vacation_days,
      medical: acc.medical + e.medical_days,
      otherLeave: acc.otherLeave + (e.other_leave_days ?? 0),
      earlyDep: acc.earlyDep + e.early_departure_days,
      missing: acc.missing + e.missing_no_reason,
      extraSchedule: acc.extraSchedule + e.extra_schedule_days,
      crossLocation: acc.crossLocation + e.extra_location_days,
      partial: acc.partial + e.partial_count,
      late: acc.late + e.late_count,
      lateMinutes: acc.lateMinutes + e.total_late_minutes,
      absent: acc.absent + e.absent_days,
      halfShifts: acc.halfShifts + (e.half_shift_count || 0),
      extraHalf: acc.extraHalf + (e.extra_half_count || 0),
    }),
    { regularHours: 0, overtimeHours: 0, vacation: 0, medical: 0, otherLeave: 0, earlyDep: 0, missing: 0, extraSchedule: 0, crossLocation: 0, partial: 0, late: 0, lateMinutes: 0, absent: 0, halfShifts: 0, extraHalf: 0 }
  );

  const summaryData = [
    ['Employees', `${employees.length}`],
    ['Regular Hours', `${totals.regularHours.toFixed(1)}h`],
    ['Overtime Hours', `${totals.overtimeHours.toFixed(1)}h`],
    ['', ''],
    ['Extra Schedule Days', `${totals.extraSchedule}`],
    ['Cross-Location Shifts', `${totals.crossLocation}`],
    ['', ''],
    ['Missing (No Reason)', `${totals.missing}`],
    ['Absent (with reason)', `${totals.absent}`],
    ['', ''],
    ['Vacation Days', `${totals.vacation}`],
    ['Medical Days', `${totals.medical}`],
    ['Other Leave Days', `${totals.otherLeave}`],
    ['', ''],
    ['Partial Shifts', `${totals.partial}`],
    ['Half Shifts', `${totals.halfShifts}`],
    ['Extra Half Shifts', `${totals.extraHalf}`],
    ['Late Arrivals', `${totals.late} (${totals.lateMinutes}min total)`],
    ['Early Departures', `${totals.earlyDep}`],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Total']],
    body: summaryData,
    theme: 'grid',
    ...getBrandedTableStyles(),
    tableWidth: 120,
    margin: { left: 15 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 70 },
      1: { halign: 'right', cellWidth: 50 },
    },
    didParseCell: (data) => {
      // Make section separators (empty rows) visually lighter
      if (data.row.raw[0] === '' && data.row.raw[1] === '') {
        data.cell.styles.fillColor = [255, 255, 255];
        data.cell.styles.lineWidth = 0;
      }
    },
  });

  // ── Per-Location Sections ──
  const byLocation: Record<string, PayrollEmployeeDetail[]> = {};
  for (const emp of employees) {
    const loc = emp.location_name || 'Unknown';
    if (!byLocation[loc]) byLocation[loc] = [];
    byLocation[loc].push(emp);
  }

  const tableStyles = getBrandedTableStyles();
  const locationNames = Object.keys(byLocation).sort();

  for (const locName of locationNames) {
    const locEmployees = byLocation[locName];

    doc.addPage('landscape');
    addBrandedHeader(doc, locName, periodLabel, logoDataUrl);

    let locY = 55;
    locY = addSectionTitle(doc, `${locName} — ${locEmployees.length} employee${locEmployees.length !== 1 ? 's' : ''}`, locY);

    const rows = locEmployees.map(emp => {
      // Partial shifts with hours breakdown
      let partialStr = '0';
      if (emp.partial_count > 0 && emp.partial_details && emp.partial_details.length > 0) {
        const items = emp.partial_details.map(p =>
          `${format(parseISO(p.date), 'MMM d')}: ${p.actual_hours}h/${p.scheduled_hours}h`
        );
        partialStr = `${emp.partial_count} (${items.join('; ')})`;
      } else if (emp.partial_count > 0) {
        partialStr = `${emp.partial_count} (${formatDateList(emp.partial_dates)})`;
      }

      return [
        emp.employee_name,
        emp.role,
        emp.days_worked,
        partialStr,
        (emp.half_shift_count || 0) > 0
          ? `${emp.half_shift_count} (${formatDateList(emp.half_shift_dates || [])})`
          : '0',
        (emp.extra_half_count || 0) > 0
          ? `${emp.extra_half_count} (${formatDateList(emp.extra_half_dates || [])})`
          : '0',
        formatLateCol(emp.late_count, emp.total_late_minutes),
        formatEarlyDepCol(emp.early_departure_details),
        formatMissingCol(emp.missing_no_reason, emp.missing_no_reason_dates),
        emp.absent_days > 0 ? formatAbsentCol(emp.absent_details) : '0',
        emp.extra_schedule_days > 0
          ? `${emp.extra_schedule_days} (${formatDateList(emp.extra_schedule_dates)})`
          : '0',
        emp.vacation_days,
        emp.medical_days,
        (emp.other_leave_days ?? 0) > 0
          ? `${emp.other_leave_days} (${formatDateList(emp.other_leave_dates ?? [])})`
          : '0',
        emp.extra_location_days > 0 ? formatCrossLocCol(emp.extra_location_details) : '0',
        `${emp.regular_hours}`,
        `${emp.overtime_hours}`,
      ];
    });

    // Location subtotals
    const sub = locEmployees.reduce(
      (a, e) => ({
        worked: a.worked + e.days_worked,
        partial: a.partial + e.partial_count,
        half: a.half + (e.half_shift_count || 0),
        extraHalf: a.extraHalf + (e.extra_half_count || 0),
        late: a.late + e.late_count,
        lateMins: a.lateMins + e.total_late_minutes,
        earlyDep: a.earlyDep + e.early_departure_days,
        missing: a.missing + e.missing_no_reason,
        absent: a.absent + e.absent_days,
        extra: a.extra + e.extra_schedule_days,
        vacation: a.vacation + e.vacation_days,
        medical: a.medical + e.medical_days,
        otherLeave: a.otherLeave + (e.other_leave_days ?? 0),
        crossLoc: a.crossLoc + e.extra_location_days,
        reg: a.reg + e.regular_hours,
        ot: a.ot + e.overtime_hours,
      }),
      { worked: 0, partial: 0, half: 0, extraHalf: 0, late: 0, lateMins: 0, earlyDep: 0, missing: 0, absent: 0, extra: 0, vacation: 0, medical: 0, otherLeave: 0, crossLoc: 0, reg: 0, ot: 0 }
    );

    rows.push([
      'TOTAL', '',
      sub.worked,
      `${sub.partial}`,
      `${sub.half}`,
      `${sub.extraHalf}`,
      `${sub.late} (${sub.lateMins}min)`,
      `${sub.earlyDep}`,
      `${sub.missing}`,
      `${sub.absent}`,
      `${sub.extra}`,
      sub.vacation,
      sub.medical,
      `${sub.otherLeave}`,
      `${sub.crossLoc}`,
      `${sub.reg.toFixed(1)}`,
      `${sub.ot.toFixed(1)}`,
    ]);

    autoTable(doc, {
      startY: locY,
      head: [[
        'Employee', 'Role',
        'Days\nWorked', 'Partial\nShifts', 'Half\nShifts', 'Extra\nHalf',
        'Late', 'Early\nDep.', 'Missing\n(no reason)', 'Absent',
        'Extra\nSched.', 'Vacation', 'Medical', 'Other\nLeave', 'Cross-\nLoc.',
        'Reg.\nHrs', 'OT\nHrs',
      ]],
      body: rows,
      theme: 'grid',
      ...tableStyles,
      styles: { ...tableStyles.styles, fontSize: 6, cellPadding: 1.2 },
      columnStyles: {
        0: { cellWidth: 26 },   // Employee
        1: { cellWidth: 14 },   // Role
        2: { halign: 'center', cellWidth: 10 }, // Days Worked
        3: { cellWidth: 16 },   // Partial
        4: { cellWidth: 12 },   // Half Shifts
        5: { cellWidth: 12 },   // Extra Half
        6: { cellWidth: 16 },   // Late
        7: { cellWidth: 18 },   // Early Dep
        8: { cellWidth: 18 },   // Missing
        9: { cellWidth: 16 },   // Absent
        10: { cellWidth: 14 },  // Extra Sched
        11: { halign: 'center', cellWidth: 10 }, // Vacation
        12: { halign: 'center', cellWidth: 10 }, // Medical
        13: { halign: 'center', cellWidth: 10 }, // Other Leave
        14: { cellWidth: 14 },  // Cross-Loc
        15: { halign: 'center', cellWidth: 10 }, // Reg Hrs
        16: { halign: 'center', cellWidth: 10 }, // OT Hrs
      },
      didParseCell: (data) => {
        if (data.row.index === rows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = BRAND_COLORS.tableBg;
        }
      },
    });
  }

  // ── Cross-Location Appendix ──
  const crossLocData = employees.filter(e => e.extra_location_days > 0);
  if (crossLocData.length > 0) {
    doc.addPage('landscape');
    addBrandedHeader(doc, 'Cross-Location Work', periodLabel, logoDataUrl);
    let clY = 55;
    clY = addSectionTitle(doc, 'Employees Who Worked at Other Locations', clY);

    const clRows: string[][] = [];
    for (const emp of crossLocData) {
      for (const detail of emp.extra_location_details) {
        clRows.push([
          emp.employee_name,
          emp.location_name,
          format(parseISO(detail.date), 'MMM d, yyyy'),
          detail.location_name,
        ]);
      }
    }

    autoTable(doc, {
      startY: clY,
      head: [['Employee', 'Home Location', 'Date', 'Worked At']],
      body: clRows,
      theme: 'grid',
      ...tableStyles,
    });
  }

  // ── Anomalies Appendix ──
  const anomalyData = employees.filter(e => e.anomalies.length > 0);
  if (anomalyData.length > 0) {
    doc.addPage('landscape');
    addBrandedHeader(doc, 'Anomalies Summary', periodLabel, logoDataUrl);
    let anY = 55;
    anY = addSectionTitle(doc, 'Late Arrivals, Auto Clock-Outs & Other Issues', anY);

    const anRows: string[][] = [];
    for (const emp of anomalyData) {
      const autoClockDates: string[] = [];
      const lateDates: string[] = [];
      const partialItems: string[] = [];
      const otherItems: string[] = [];

      for (const a of emp.anomalies) {
        const lower = a.toLowerCase();
        const dateMatch = a.match(/(\d{4}-\d{2}-\d{2})/);
        const dateStr = dateMatch ? dateMatch[1] : null;

        if (lower.includes('auto') && lower.includes('clock')) {
          autoClockDates.push(dateStr || '');
        } else if (lower.includes('partial shift')) {
          partialItems.push(a);
        } else if (lower.includes('late')) {
          lateDates.push(dateStr || '');
        } else {
          otherItems.push(a);
        }
      }

      const fmtGroup = (dates: string[]): string => {
        const validDates = dates.filter(Boolean);
        if (validDates.length === 0 && dates.length > 0) return `${dates.length}`;
        if (validDates.length === 0) return '0';
        return formatMissingCol(validDates.length, validDates);
      };

      anRows.push([
        emp.employee_name,
        emp.location_name,
        fmtGroup(autoClockDates),
        fmtGroup(lateDates),
        partialItems.length > 0 ? `${partialItems.length}` : '0',
        otherItems.length > 0 ? otherItems.join('; ') : '–',
      ]);
    }

    autoTable(doc, {
      startY: anY,
      head: [['Employee', 'Location', 'Auto\nClock-Outs', 'Late\nArrivals', 'Partial\nShifts', 'Other']],
      body: anRows,
      theme: 'grid',
      ...tableStyles,
      styles: { ...tableStyles.styles, fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 35 },
        2: { cellWidth: 45 },
        3: { cellWidth: 45 },
        4: { cellWidth: 30 },
        5: { cellWidth: 65 },
      },
    });
  }

  // Footer on all pages
  addBrandedFooter(doc);

  const filename = `Payroll_Report_${periodStart}_${periodEnd}.pdf`;
  doc.save(filename);
}
