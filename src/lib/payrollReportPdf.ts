import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import {
  addBrandedHeader,
  addBrandedFooter,
  getBrandedTableStyles,
  addSectionTitle,
  BRAND_COLORS,
  BRAND_FONT,
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

export function generatePayrollReportPDF({ employees, periodStart, periodEnd }: PayrollReportOptions) {
  const doc = new jsPDF({ orientation: 'landscape' });
  const periodLabel = `${format(parseISO(periodStart), 'MMM d')} – ${format(parseISO(periodEnd), 'MMM d, yyyy')}`;

  // Header
  addBrandedHeader(doc, 'Payroll Summary Report', periodLabel);

  // ── Company-Wide Summary ──
  let y = 55;
  y = addSectionTitle(doc, 'Company-Wide Summary', y);

  const totals = employees.reduce(
    (acc, e) => ({
      regularHours: acc.regularHours + e.regular_hours,
      overtimeHours: acc.overtimeHours + e.overtime_hours,
      vacation: acc.vacation + e.vacation_days,
      medical: acc.medical + e.medical_days,
      missing: acc.missing + e.missing_no_reason,
      extraSchedule: acc.extraSchedule + e.extra_schedule_days,
      crossLocation: acc.crossLocation + e.extra_location_days,
    }),
    { regularHours: 0, overtimeHours: 0, vacation: 0, medical: 0, missing: 0, extraSchedule: 0, crossLocation: 0 }
  );

  const summaryData = [
    ['Employees', `${employees.length}`],
    ['Regular Hours', `${totals.regularHours.toFixed(1)}h`],
    ['Overtime Hours', `${totals.overtimeHours.toFixed(1)}h`],
    ['Extra Schedule Days', `${totals.extraSchedule}`],
    ['Vacation Days', `${totals.vacation}`],
    ['Medical Days', `${totals.medical}`],
    ['Missing (No Reason)', `${totals.missing}`],
    ['Cross-Location Shifts', `${totals.crossLocation}`],
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
    addBrandedHeader(doc, locName, periodLabel);

    let locY = 55;
    locY = addSectionTitle(doc, `${locName} — ${locEmployees.length} employee${locEmployees.length !== 1 ? 's' : ''}`, locY);

    const rows = locEmployees.map(emp => [
      emp.employee_name,
      emp.role,
      emp.days_worked,
      emp.days_confirmed,
      emp.extra_schedule_days > 0
        ? `${emp.extra_schedule_days} (${formatDateList(emp.extra_schedule_dates)})`
        : '0',
      emp.vacation_days,
      emp.medical_days,
      formatMissingCol(emp.missing_no_reason, emp.missing_no_reason_dates),
      `${emp.regular_hours}`,
      `${emp.overtime_hours}`,
    ]);

    // Location subtotals
    const sub = locEmployees.reduce(
      (a, e) => ({
        worked: a.worked + e.days_worked,
        confirmed: a.confirmed + e.days_confirmed,
        extra: a.extra + e.extra_schedule_days,
        vacation: a.vacation + e.vacation_days,
        medical: a.medical + e.medical_days,
        missing: a.missing + e.missing_no_reason,
        reg: a.reg + e.regular_hours,
        ot: a.ot + e.overtime_hours,
      }),
      { worked: 0, confirmed: 0, extra: 0, vacation: 0, medical: 0, missing: 0, reg: 0, ot: 0 }
    );

    rows.push([
      'TOTAL',
      '',
      sub.worked,
      sub.confirmed,
      `${sub.extra}`,
      sub.vacation,
      sub.medical,
      `${sub.missing}`,
      `${sub.reg.toFixed(1)}`,
      `${sub.ot.toFixed(1)}`,
    ]);

    autoTable(doc, {
      startY: locY,
      head: [['Employee', 'Role', 'Days\nWorked', 'Conf.\nDays', 'Extra\nSchedule', 'Vacation\nDays', 'Medical\nDays', 'Missing\n(no reason)', 'Reg.\nHrs', 'OT\nHrs']],
      body: rows,
      theme: 'grid',
      ...tableStyles,
      styles: { ...tableStyles.styles, fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 28 },
        2: { halign: 'center', cellWidth: 18 },
        3: { halign: 'center', cellWidth: 18 },
        4: { cellWidth: 38 },
        5: { halign: 'center', cellWidth: 22 },
        6: { halign: 'center', cellWidth: 22 },
        7: { cellWidth: 42 },
        8: { halign: 'center', cellWidth: 20 },
        9: { halign: 'center', cellWidth: 20 },
      },
      didParseCell: (data) => {
        // Bold the totals row
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
    addBrandedHeader(doc, 'Cross-Location Work', periodLabel);
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
    addBrandedHeader(doc, 'Anomalies', periodLabel);
    let anY = 55;
    anY = addSectionTitle(doc, 'Late Arrivals, Auto Clock-Outs & Other Issues', anY);

    const anRows: string[][] = [];
    for (const emp of anomalyData) {
      for (const anomaly of emp.anomalies) {
        anRows.push([emp.employee_name, emp.location_name, anomaly]);
      }
    }

    autoTable(doc, {
      startY: anY,
      head: [['Employee', 'Location', 'Issue']],
      body: anRows,
      theme: 'grid',
      ...tableStyles,
    });
  }

  // Footer on all pages
  addBrandedFooter(doc);

  const filename = `Payroll_Report_${periodStart}_${periodEnd}.pdf`;
  doc.save(filename);
}
