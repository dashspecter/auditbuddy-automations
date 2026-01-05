import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  addBrandedHeader, 
  addBrandedFooter, 
  getBrandedTableStyles, 
  addSectionTitle,
  getScoreColor,
  BRAND_COLORS,
  BRAND_FONT 
} from './pdfBranding';

interface AuditSection {
  name: string;
  score: number;
  items: string[];
}

interface AuditData {
  id: string | number;
  type: string;
  location: string;
  checker: string;
  date: string;
  status: string;
  score: number;
  sections: AuditSection[];
  notes?: string;
}

export const generateAuditPDF = (audit: AuditData) => {
  const doc = new jsPDF();
  
  // Add branded header
  addBrandedHeader(doc, 'Audit Report', audit.location);
  
  let yPosition = 55;
  
  // Audit Summary Section
  yPosition = addSectionTitle(doc, 'Audit Summary', yPosition);
  
  // Summary details
  doc.setFontSize(10);
  doc.setFont(BRAND_FONT, 'normal');
  doc.setTextColor(...BRAND_COLORS.text);
  
  const summaryData = [
    ['Location:', audit.location],
    ['Auditor:', audit.checker],
    ['Date:', audit.date],
    ['Type:', audit.type.charAt(0).toUpperCase() + audit.type.slice(1)],
  ];
  
  summaryData.forEach(([label, value]) => {
    doc.setFont(BRAND_FONT, 'bold');
    doc.text(label, 15, yPosition);
    doc.setFont(BRAND_FONT, 'normal');
    doc.text(value, 50, yPosition);
    yPosition += 6;
  });
  
  yPosition += 5;
  
  // Overall Score with color coding
  doc.setFontSize(12);
  doc.setFont(BRAND_FONT, 'bold');
  doc.setTextColor(...BRAND_COLORS.text);
  doc.text('Overall Score:', 15, yPosition);
  
  // Color code the score
  const scoreColor = getScoreColor(audit.score);
  doc.setTextColor(...scoreColor);
  doc.setFontSize(20);
  doc.text(`${audit.score}%`, 55, yPosition);
  doc.setTextColor(...BRAND_COLORS.text);
  
  yPosition += 12;
  
  // Status badge
  doc.setFontSize(10);
  doc.setFont(BRAND_FONT, 'bold');
  doc.text('Status:', 15, yPosition);
  
  const statusText = audit.status === 'compliant' ? 'COMPLIANT' : 
                     audit.status === 'non-compliant' ? 'NON-COMPLIANT' : 
                     'PENDING';
  const statusColor = audit.status === 'compliant' ? BRAND_COLORS.success : 
                      audit.status === 'non-compliant' ? BRAND_COLORS.danger : 
                      BRAND_COLORS.warning;
  
  doc.setTextColor(...statusColor);
  doc.text(statusText, 40, yPosition);
  doc.setTextColor(...BRAND_COLORS.text);
  
  yPosition += 15;
  
  // Section Details
  yPosition = addSectionTitle(doc, 'Section Breakdown', yPosition);
  
  audit.sections.forEach((section) => {
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    // Section header with brand color
    doc.setFillColor(...BRAND_COLORS.lightBg);
    doc.rect(15, yPosition - 5, 180, 8, 'F');
    
    doc.setFontSize(11);
    doc.setFont(BRAND_FONT, 'bold');
    doc.setTextColor(...BRAND_COLORS.text);
    doc.text(section.name, 17, yPosition);
    
    const sectionScoreColor = getScoreColor(section.score);
    doc.setTextColor(...sectionScoreColor);
    doc.text(`${section.score}%`, 175, yPosition);
    doc.setTextColor(...BRAND_COLORS.text);
    
    yPosition += 10;
    
    // Section items
    doc.setFontSize(9);
    doc.setFont(BRAND_FONT, 'normal');
    
    section.items.forEach((item) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      
      // Orange bullet point
      doc.setFillColor(...BRAND_COLORS.primary);
      doc.circle(18, yPosition - 1.5, 1.5, 'F');
      
      // Wrap text if too long
      const splitText = doc.splitTextToSize(item, 170);
      doc.text(splitText, 24, yPosition);
      yPosition += splitText.length * 5 + 2;
    });
    
    yPosition += 5;
  });
  
  // Notes section
  if (audit.notes) {
    if (yPosition > 240) {
      doc.addPage();
      yPosition = 20;
    }
    
    yPosition = addSectionTitle(doc, 'Notes', yPosition);
    
    doc.setFontSize(9);
    doc.setFont(BRAND_FONT, 'normal');
    const notesText = doc.splitTextToSize(audit.notes, 180);
    doc.text(notesText, 15, yPosition);
  }
  
  // Add branded footer
  addBrandedFooter(doc);
  
  // Save the PDF
  const fileName = `audit_${audit.location.replace(/\s+/g, '_')}_${audit.date}.pdf`;
  doc.save(fileName);
};
