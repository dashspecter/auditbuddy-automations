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

// ── Formatting helpers ──────────────────────────────────────────────────────

function fmtDate(d: string) { return format(parseISO(d), 'MMM d'); }

function fmtDateList(dates: string[]): string {
  return dates.map(fmtDate).join(', ');
}

function fmtMissing(count: number, dates: string[]): string {
  if (count === 0) return '0';
  return `${count} (${fmtDateList(dates)})`;
}

function fmtEarlyDep(details: Array<{ date: string; reason: string; minutes_early: number }>): string {
  if (details.length === 0) return '0';
  const items = details.map(d => {
    const hrs = Math.floor(d.minutes_early / 60);
    const mins = d.minutes_early % 60;
    const t = hrs > 0 ? `${hrs}h${mins > 0 ? `${mins}m` : ''}` : `${mins}m`;
    return `${fmtDate(d.date)}: ${t} — ${d.reason}`;
  });
  return `${details.length} (${items.join('; ')})`;
}

function fmtAbsent(details: Array<{ date: string; reason_code: string }>): string {
  if (details.length === 0) return '0';
  return `${details.length} (${details.map(d => `${fmtDate(d.date)}: ${d.reason_code}`).join('; ')})`;
}

function fmtLate(count: number, totalMin: number): string {
  return count === 0 ? '0' : `${count} (${totalMin}min)`;
}

function fmtCrossLoc(details: Array<{ date: string; location_name: string }>): string {
  if (details.length === 0) return '0';
  return `${details.length} (${details.map(d => `${fmtDate(d.date)}: ${d.location_name}`).join('; ')})`;
}

// Column headers (17 columns)
const COL_HEADS = [
  'Employee', 'Role',
  'Days\nWorked', 'Partial\nShifts', 'Half\nShifts', 'Extra\nHalf',
  'Late', 'Early\nDep.', 'Missing\n(no reason)', 'Absent',
  'Extra\nSched.', 'Vacation', 'Medical', 'Other\nLeave', 'Cross-\nLoc.',
  'Reg.\nHrs', 'OT\nHrs',
];

const COL_STYLES = {
  0: { cellWidth: 26 },   // Employee
  1: { cellWidth: 14 },   // Role
  2: { halign: 'center' as const, cellWidth: 10 }, // Days Worked
  3: { cellWidth: 16 },   // Partial
  4: { cellWidth: 12 },   // Half Shifts
  5: { cellWidth: 12 },   // Extra Half
  6: { cellWidth: 16 },   // Late
  7: { cellWidth: 18 },   // Early Dep
  8: { cellWidth: 18 },   // Missing
  9: { cellWidth: 16 },   // Absent
  10: { cellWidth: 14 },  // Extra Sched
  11: { halign: 'center' as const, cellWidth: 10 }, // Vacation
  12: { halign: 'center' as const, cellWidth: 10 }, // Medical
  13: { halign: 'center' as const, cellWidth: 10 }, // Other Leave
  14: { cellWidth: 14 },  // Cross-Loc
  15: { halign: 'center' as const, cellWidth: 10 }, // Reg Hrs
  16: { halign: 'center' as const, cellWidth: 10 }, // OT Hrs
};

// Special marker for location header rows
const LOC_HDR = '\x00LOC\x00';
// Special marker for subtotal rows
const SUB_HDR = '\x00SUB\x00';

function buildEmpRow(emp: PayrollEmployeeDetail): (string | number)[] {
  let partialStr = '0';
  if (emp.partial_count > 0) {
    if (emp.partial_details?.length > 0) {
      const items = emp.partial_details.map(p =>
        `${fmtDate(p.date)}: ${p.actual_hours}h/${p.scheduled_hours}h`
      );
      partialStr = `${emp.partial_count} (${items.join('; ')})`;
    } else {
      partialStr = `${emp.partial_count} (${fmtDateList(emp.partial_dates)})`;
    }
  }

  return [
    emp.employee_name,
    emp.role,
    emp.days_worked,
    partialStr,
    (emp.half_shift_count || 0) > 0
      ? `${emp.half_shift_count} (${fmtDateList(emp.half_shift_dates || [])})`
      : '0',
    (emp.extra_half_count || 0) > 0
      ? `${emp.extra_half_count} (${fmtDateList(emp.extra_half_dates || [])})`
      : '0',
    fmtLate(emp.late_count, emp.total_late_minutes),
    fmtEarlyDep(emp.early_departure_details),
    fmtMissing(emp.missing_no_reason, emp.missing_no_reason_dates),
    emp.absent_days > 0 ? fmtAbsent(emp.absent_details) : '0',
    emp.extra_schedule_days > 0
      ? `${emp.extra_schedule_days} (${fmtDateList(emp.extra_schedule_dates)})`
      : '0',
    emp.vacation_days,
    emp.medical_days,
    (emp.other_leave_days ?? 0) > 0
      ? `${emp.other_leave_days} (${fmtDateList(emp.other_leave_dates ?? [])})`
      : '0',
    emp.extra_location_days > 0 ? fmtCrossLoc(emp.extra_location_details) : '0',
    `${emp.regular_hours}`,
    `${emp.overtime_hours}`,
  ];
}

function buildSubtotalRow(label: string, locEmployees: PayrollEmployeeDetail[]): string[] {
  const s = locEmployees.reduce(
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

  return [
    `${SUB_HDR}${label}`, '',
    `${s.worked}`, `${s.partial}`, `${s.half}`, `${s.extraHalf}`,
    `${s.late} (${s.lateMins}min)`, `${s.earlyDep}`,
    `${s.missing}`, `${s.absent}`, `${s.extra}`,
    `${s.vacation}`, `${s.medical}`, `${s.otherLeave}`, `${s.crossLoc}`,
    `${s.reg.toFixed(1)}`, `${s.ot.toFixed(1)}`,
  ];
}

export async function generatePayrollReportPDF({ employees, periodStart, periodEnd }: PayrollReportOptions) {
  const doc = new jsPDF({ orientation: 'landscape' });
  const periodLabel = `${format(parseISO(periodStart), 'MMM d')} – ${format(parseISO(periodEnd), 'MMM d, yyyy')}`;

  let logoDataUrl: string | undefined;
  try { logoDataUrl = await loadLogoForPDF(); } catch { /* fallback */ }

  // ── Page 1: Company-Wide Summary ─────────────────────────────────────────
  addBrandedHeader(doc, 'Payroll Summary Report', periodLabel, logoDataUrl);

  let y = 55;
  y = addSectionTitle(doc, 'Company-Wide Summary', y);

  const totals = employees.reduce(
    (acc, e) => ({
      reg: acc.reg + e.regular_hours,
      ot: acc.ot + e.overtime_hours,
      vacation: acc.vacation + e.vacation_days,
      medical: acc.medical + e.medical_days,
      otherLeave: acc.otherLeave + (e.other_leave_days ?? 0),
      earlyDep: acc.earlyDep + e.early_departure_days,
      missing: acc.missing + e.missing_no_reason,
      extraSched: acc.extraSched + e.extra_schedule_days,
      crossLoc: acc.crossLoc + e.extra_location_days,
      partial: acc.partial + e.partial_count,
      late: acc.late + e.late_count,
      lateMins: acc.lateMins + e.total_late_minutes,
      absent: acc.absent + e.absent_days,
      half: acc.half + (e.half_shift_count || 0),
      extraHalf: acc.extraHalf + (e.extra_half_count || 0),
    }),
    { reg: 0, ot: 0, vacation: 0, medical: 0, otherLeave: 0, earlyDep: 0, missing: 0, extraSched: 0, crossLoc: 0, partial: 0, late: 0, lateMins: 0, absent: 0, half: 0, extraHalf: 0 }
  );

  const summaryData: [string, string][] = [
    ['Employees', `${employees.length}`],
    ['Regular Hours', `${totals.reg.toFixed(1)}h`],
    ['Overtime Hours', `${totals.ot.toFixed(1)}h`],
    ['', ''],
    ['⚠  Missing (No Reason)', `${totals.missing}`],
    ['⚠  Absent (with reason)', `${totals.absent}`],
    ['', ''],
    ['＋  Extra Schedule Days', `${totals.extraSched}`],
    ['＋  Cross-Location Shifts', `${totals.crossLoc}`],
    ['', ''],
    ['○  Vacation Days', `${totals.vacation}`],
    ['○  Medical Days', `${totals.medical}`],
    ['○  Other Leave Days', `${totals.otherLeave}`],
    ['', ''],
    ['~  Partial Shifts', `${totals.partial}`],
    ['~  Half Shifts', `${totals.half}`],
    ['~  Extra Half Shifts', `${totals.extraHalf}`],
    ['~  Late Arrivals', `${totals.late} (${totals.lateMins}min total)`],
    ['~  Early Departures', `${totals.earlyDep}`],
  ];

  const tableStyles = getBrandedTableStyles();

  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Total']],
    body: summaryData,
    theme: 'grid',
    ...tableStyles,
    tableWidth: 130,
    margin: { left: 15 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 80 },
      1: { halign: 'right', cellWidth: 50 },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.raw[0] === '' && data.row.raw[1] === '') {
        data.cell.styles.fillColor = [255, 255, 255];
        (data.cell.styles as any).lineWidth = 0;
      }
    },
  });

  // ── Page 2+: Single employee table, all locations ─────────────────────────
  // Group by location but render as ONE continuous table with section dividers
  const byLocation: Record<string, PayrollEmployeeDetail[]> = {};
  for (const emp of employees) {
    const loc = emp.location_name || 'Unknown';
    if (!byLocation[loc]) byLocation[loc] = [];
    byLocation[loc].push(emp);
  }
  const locationNames = Object.keys(byLocation).sort();

  // Build all rows: location header → employee rows → subtotal row → repeat
  const allRows: (string | number)[][] = [];
  const locationHeaderRowIndices = new Set<number>();
  const subtotalRowIndices = new Set<number>();

  for (const locName of locationNames) {
    const locEmps = byLocation[locName];

    // Location header row (spans visually via styling)
    locationHeaderRowIndices.add(allRows.length);
    allRows.push([`${LOC_HDR}${locName} — ${locEmps.length} employee${locEmps.length !== 1 ? 's' : ''}`, ...Array(16).fill('')]);

    // Employee rows
    for (const emp of locEmps) {
      allRows.push(buildEmpRow(emp));
    }

    // Subtotal row
    subtotalRowIndices.add(allRows.length);
    allRows.push(buildSubtotalRow('Subtotal', locEmps));
  }

  doc.addPage('landscape');
  addBrandedHeader(doc, 'Employee Breakdown', periodLabel, logoDataUrl);

  autoTable(doc, {
    startY: 55,
    head: [COL_HEADS],
    body: allRows,
    theme: 'grid',
    ...tableStyles,
    styles: { ...tableStyles.styles, fontSize: 6, cellPadding: 1.2 },
    columnStyles: COL_STYLES,
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      const rowIdx = data.row.index;
      const raw0 = String(data.row.raw[0] ?? '');

      if (locationHeaderRowIndices.has(rowIdx)) {
        // Orange location header bar
        data.cell.styles.fillColor = BRAND_COLORS.primary;
        data.cell.styles.textColor = [255, 255, 255];
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 7;
        // Strip marker from first cell display
        if (data.column.index === 0) {
          data.cell.text = [raw0.replace(LOC_HDR, '')];
        } else {
          data.cell.text = [''];
        }
      } else if (subtotalRowIndices.has(rowIdx) || raw0.startsWith(SUB_HDR)) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = BRAND_COLORS.tableBg;
        if (data.column.index === 0) {
          data.cell.text = [raw0.replace(SUB_HDR, '')];
        }
      }
    },
  });

  // ── Cross-Location Appendix ───────────────────────────────────────────────
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

  // ── Anomalies Appendix ────────────────────────────────────────────────────
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
        const valid = dates.filter(Boolean);
        if (valid.length === 0 && dates.length > 0) return `${dates.length}`;
        if (valid.length === 0) return '0';
        return fmtMissing(valid.length, valid);
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

  addBrandedFooter(doc);

  doc.save(`Payroll_Report_${periodStart}_${periodEnd}.pdf`);
}
