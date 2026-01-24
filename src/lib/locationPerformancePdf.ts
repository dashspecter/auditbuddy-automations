import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  addBrandedHeader, 
  addBrandedFooter, 
  getBrandedTableStyles,
  addSectionTitle,
  BRAND_COLORS,
  BRAND_FONT,
  getScoreColor
} from './pdfBranding';
import type { EffectiveEmployeeScore } from './effectiveScore';
import { formatEffectiveScore, formatComponentScore, calculateAverageEffectiveScore } from './effectiveScore';

export interface LocationPerformanceData {
  location_id: string;
  location_name: string;
  employees: EffectiveEmployeeScore[];
  dateRange?: {
    start: string;
    end: string;
    label: string;
  };
}

/**
 * Generates a branded PDF report for a location's employee performance
 */
export const generateLocationPerformancePDF = (data: LocationPerformanceData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Add branded header
  const subtitle = data.dateRange 
    ? `Performance Report • ${data.dateRange.label}`
    : 'Performance Report';
  addBrandedHeader(doc, data.location_name, subtitle);
  
  let yPosition = 55;
  
  // Calculate summary stats
  const avgScore = calculateAverageEffectiveScore(data.employees);
  const totalEmployees = data.employees.length;
  const employeesWithScore = data.employees.filter(e => e.effective_score !== null).length;
  const highPerformers = data.employees.filter(e => e.effective_score !== null && e.effective_score >= 90).length;
  const needsImprovement = data.employees.filter(e => e.effective_score !== null && e.effective_score < 70).length;
  
  // Summary Section
  yPosition = addSectionTitle(doc, 'Performance Summary', yPosition);
  
  // Summary cards
  const cardWidth = (pageWidth - 40) / 4;
  const cardHeight = 25;
  const cardStartX = 15;
  
  const summaryCards = [
    { label: 'Total Employees', value: totalEmployees.toString() },
    { label: 'Average Score', value: avgScore !== null ? Math.round(avgScore).toString() : '—' },
    { label: 'High Performers', value: `${highPerformers} (90+)` },
    { label: 'Needs Improvement', value: `${needsImprovement} (<70)` },
  ];
  
  summaryCards.forEach((card, index) => {
    const x = cardStartX + index * (cardWidth + 5);
    
    // Card background
    doc.setFillColor(...BRAND_COLORS.lightBg);
    doc.roundedRect(x, yPosition, cardWidth, cardHeight, 3, 3, 'F');
    
    // Card content
    doc.setFontSize(8);
    doc.setFont(BRAND_FONT, 'normal');
    doc.setTextColor(...BRAND_COLORS.textMuted);
    doc.text(card.label, x + cardWidth / 2, yPosition + 8, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setFont(BRAND_FONT, 'bold');
    doc.setTextColor(...BRAND_COLORS.text);
    doc.text(card.value, x + cardWidth / 2, yPosition + 18, { align: 'center' });
  });
  
  yPosition += cardHeight + 15;
  
  // Employee Performance Table
  yPosition = addSectionTitle(doc, 'Employee Rankings', yPosition);
  
  const tableData = data.employees.map((employee, index) => {
    const effectiveScoreFormatted = formatEffectiveScore(employee.effective_score);
    
    return [
      (index + 1).toString(),
      employee.employee_name,
      employee.role,
      formatComponentScore(employee.attendance_score, employee.attendance_used),
      formatComponentScore(employee.punctuality_score, employee.punctuality_used),
      formatComponentScore(employee.task_score, employee.task_used),
      formatComponentScore(employee.test_score, employee.test_used),
      formatComponentScore(employee.performance_review_score, employee.review_used),
      (employee.warning_count || 0).toString(),
      effectiveScoreFormatted,
    ];
  });
  
  const brandedStyles = getBrandedTableStyles();
  
  autoTable(doc, {
    startY: yPosition,
    head: [[
      '#',
      'Employee',
      'Role',
      'Attend.',
      'Punct.',
      'Tasks',
      'Tests',
      'Reviews',
      'Warn.',
      'Score'
    ]],
    body: tableData,
    ...brandedStyles,
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 35 },
      2: { cellWidth: 25 },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 15, halign: 'center' },
      5: { cellWidth: 15, halign: 'center' },
      6: { cellWidth: 15, halign: 'center' },
      7: { cellWidth: 15, halign: 'center' },
      8: { cellWidth: 12, halign: 'center' },
      9: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      // Color code the final score column
      if (data.column.index === 9 && data.section === 'body') {
        const scoreText = data.cell.text[0];
        if (scoreText !== '—') {
          const score = parseFloat(scoreText);
          const color = getScoreColor(score);
          data.cell.styles.textColor = color;
        }
      }
      // Color code warning column if there are warnings
      if (data.column.index === 8 && data.section === 'body') {
        const warnCount = parseInt(data.cell.text[0] || '0');
        if (warnCount > 0) {
          data.cell.styles.textColor = BRAND_COLORS.danger;
        }
      }
    },
    margin: { left: 15, right: 15 },
  });
  
  // Get final Y position after table
  const finalY = (doc as any).lastAutoTable?.finalY || yPosition + 50;
  
  // Score Legend
  let legendY = finalY + 15;
  
  // Check if we need a new page
  if (legendY > doc.internal.pageSize.getHeight() - 50) {
    doc.addPage();
    legendY = 20;
  }
  
  legendY = addSectionTitle(doc, 'Score Legend', legendY);
  
  const legendItems = [
    { label: '90+ Excellent', color: BRAND_COLORS.success },
    { label: '70-89 Good', color: [59, 130, 246] as [number, number, number] }, // blue
    { label: '50-69 Needs Improvement', color: BRAND_COLORS.warning },
    { label: '<50 Critical', color: BRAND_COLORS.danger },
  ];
  
  let legendX = 15;
  legendItems.forEach((item, index) => {
    // Color dot
    doc.setFillColor(...item.color);
    doc.circle(legendX + 3, legendY + 3, 3, 'F');
    
    // Label
    doc.setFontSize(9);
    doc.setFont(BRAND_FONT, 'normal');
    doc.setTextColor(...BRAND_COLORS.text);
    doc.text(item.label, legendX + 10, legendY + 5);
    
    legendX += 45;
  });
  
  // Add footer to all pages
  addBrandedFooter(doc);
  
  // Generate filename
  const sanitizedName = data.location_name.replace(/[^a-zA-Z0-9]/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `${sanitizedName}_Performance_Report_${dateStr}.pdf`;
  
  doc.save(filename);
};
