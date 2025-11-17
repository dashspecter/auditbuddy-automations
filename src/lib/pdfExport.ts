import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AuditSection {
  name: string;
  score: number;
  items: string[];
}

interface AuditData {
  id: number;
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
  
  // Brand colors
  const primaryColor: [number, number, number] = [59, 130, 246]; // blue
  const successColor: [number, number, number] = [34, 197, 94]; // green
  const warningColor: [number, number, number] = [234, 179, 8]; // yellow
  const dangerColor: [number, number, number] = [239, 68, 68]; // red
  
  // Header with branding
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Audit Report', 15, 20);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 15, 30);
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  
  let yPosition = 50;
  
  // Audit Summary Section
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Audit Summary', 15, yPosition);
  yPosition += 10;
  
  // Summary details
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  const summaryData = [
    ['Location:', audit.location],
    ['Auditor:', audit.checker],
    ['Date:', audit.date],
    ['Type:', audit.type.charAt(0).toUpperCase() + audit.type.slice(1)],
  ];
  
  summaryData.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 15, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 50, yPosition);
    yPosition += 7;
  });
  
  yPosition += 5;
  
  // Overall Score with color coding
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Overall Score:', 15, yPosition);
  
  // Color code the score
  let scoreColor: [number, number, number];
  if (audit.score >= 80) {
    scoreColor = successColor;
  } else if (audit.score >= 60) {
    scoreColor = warningColor;
  } else {
    scoreColor = dangerColor;
  }
  
  doc.setTextColor(...scoreColor);
  doc.setFontSize(24);
  doc.text(`${audit.score}%`, 60, yPosition);
  doc.setTextColor(0, 0, 0);
  
  yPosition += 15;
  
  // Status badge
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Status:', 15, yPosition);
  
  const statusText = audit.status === 'compliant' ? 'COMPLIANT' : 
                     audit.status === 'non-compliant' ? 'NON-COMPLIANT' : 
                     'PENDING';
  const statusColor = audit.status === 'compliant' ? successColor : 
                      audit.status === 'non-compliant' ? dangerColor : 
                      warningColor;
  
  doc.setTextColor(...statusColor);
  doc.text(statusText, 40, yPosition);
  doc.setTextColor(0, 0, 0);
  
  yPosition += 15;
  
  // Section Details
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Section Breakdown', 15, yPosition);
  yPosition += 10;
  
  audit.sections.forEach((section, index) => {
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    // Section header
    doc.setFillColor(240, 240, 240);
    doc.rect(15, yPosition - 5, 180, 8, 'F');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(section.name, 17, yPosition);
    doc.text(`${section.score}%`, 175, yPosition);
    
    yPosition += 10;
    
    // Section items
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    section.items.forEach((item) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      
      // Bullet point
      doc.setFillColor(...successColor);
      doc.circle(18, yPosition - 1.5, 1, 'F');
      
      // Wrap text if too long
      const splitText = doc.splitTextToSize(item, 170);
      doc.text(splitText, 22, yPosition);
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
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes', 15, yPosition);
    yPosition += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const notesText = doc.splitTextToSize(audit.notes, 180);
    doc.text(notesText, 15, yPosition);
  }
  
  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Page ${i} of ${pageCount}`,
      105,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
    doc.text(
      'Confidential - For internal use only',
      105,
      doc.internal.pageSize.height - 5,
      { align: 'center' }
    );
  }
  
  // Save the PDF
  const fileName = `audit_${audit.location.replace(/\s+/g, '_')}_${audit.date}.pdf`;
  doc.save(fileName);
};
