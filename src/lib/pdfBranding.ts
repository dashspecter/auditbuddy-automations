import jsPDF from 'jspdf';

// Dashspect brand colors (Orange theme - HSL 25 95% 53%)
export const BRAND_COLORS = {
  primary: [249, 115, 22] as [number, number, number],      // Orange primary
  primaryLight: [251, 146, 60] as [number, number, number], // Orange light
  primaryDark: [234, 88, 12] as [number, number, number],   // Orange dark
  success: [34, 197, 94] as [number, number, number],       // Green
  warning: [234, 179, 8] as [number, number, number],       // Yellow
  danger: [239, 68, 68] as [number, number, number],        // Red
  text: [30, 41, 59] as [number, number, number],           // Dark slate
  textMuted: [100, 116, 139] as [number, number, number],   // Muted slate
  white: [255, 255, 255] as [number, number, number],
  lightBg: [254, 247, 237] as [number, number, number],     // Orange tint bg
  tableBg: [255, 237, 213] as [number, number, number],     // Orange table header bg
};

// Brand font - using Helvetica as it's built into jsPDF
export const BRAND_FONT = 'helvetica';

/**
 * Adds the Dashspect branded header to a PDF document
 */
export const addBrandedHeader = (
  doc: jsPDF, 
  title: string, 
  subtitle?: string
) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header background with gradient effect (solid orange)
  doc.setFillColor(...BRAND_COLORS.primary);
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  // Lighter stripe for visual interest
  doc.setFillColor(...BRAND_COLORS.primaryLight);
  doc.rect(0, 40, pageWidth, 5, 'F');
  
  // Logo placeholder - circle with "D"
  doc.setFillColor(...BRAND_COLORS.white);
  doc.circle(20, 22, 10, 'F');
  doc.setTextColor(...BRAND_COLORS.primary);
  doc.setFontSize(14);
  doc.setFont(BRAND_FONT, 'bold');
  doc.text('D', 16.5, 26);
  
  // Title
  doc.setTextColor(...BRAND_COLORS.white);
  doc.setFontSize(20);
  doc.setFont(BRAND_FONT, 'bold');
  doc.text(title, 35, 20);
  
  // Company name
  doc.setFontSize(10);
  doc.setFont(BRAND_FONT, 'normal');
  doc.text('Dashspect', 35, 28);
  
  // Subtitle/date on the right
  if (subtitle) {
    doc.setFontSize(10);
    doc.text(subtitle, pageWidth - 15, 20, { align: 'right' });
  }
  
  // Generated date
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 15, 28, { align: 'right' });
  
  // Reset text color
  doc.setTextColor(...BRAND_COLORS.text);
};

/**
 * Adds branded footer to all pages
 */
export const addBrandedFooter = (doc: jsPDF) => {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Footer line
    doc.setDrawColor(...BRAND_COLORS.primary);
    doc.setLineWidth(0.5);
    doc.line(15, pageHeight - 18, pageWidth - 15, pageHeight - 18);
    
    // Footer text
    doc.setFontSize(8);
    doc.setFont(BRAND_FONT, 'normal');
    doc.setTextColor(...BRAND_COLORS.textMuted);
    
    // Page number
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 12, { align: 'center' });
    
    // Powered by Dashspect
    doc.setTextColor(...BRAND_COLORS.primary);
    doc.text('Powered by Dashspect', pageWidth / 2, pageHeight - 7, { align: 'center' });
  }
};

/**
 * Gets the branded table styles for autoTable
 */
export const getBrandedTableStyles = () => ({
  headStyles: {
    fillColor: BRAND_COLORS.primary,
    textColor: BRAND_COLORS.white,
    fontStyle: 'bold' as const,
    font: BRAND_FONT,
  },
  bodyStyles: {
    textColor: BRAND_COLORS.text,
    font: BRAND_FONT,
  },
  alternateRowStyles: {
    fillColor: BRAND_COLORS.lightBg,
  },
  styles: {
    font: BRAND_FONT,
    fontSize: 10,
  },
});

/**
 * Adds a section title with brand styling
 */
export const addSectionTitle = (doc: jsPDF, title: string, yPosition: number): number => {
  doc.setFontSize(14);
  doc.setFont(BRAND_FONT, 'bold');
  doc.setTextColor(...BRAND_COLORS.primary);
  doc.text(title, 15, yPosition);
  doc.setTextColor(...BRAND_COLORS.text);
  return yPosition + 8;
};

/**
 * Gets score color based on value
 */
export const getScoreColor = (score: number): [number, number, number] => {
  if (score >= 80) return BRAND_COLORS.success;
  if (score >= 60) return BRAND_COLORS.warning;
  return BRAND_COLORS.danger;
};

/**
 * Creates a new branded PDF document
 */
export const createBrandedPDF = (title: string, subtitle?: string): jsPDF => {
  const doc = new jsPDF();
  addBrandedHeader(doc, title, subtitle);
  return doc;
};

/**
 * Finalizes and saves the branded PDF
 */
export const saveBrandedPDF = (doc: jsPDF, filename: string) => {
  addBrandedFooter(doc);
  doc.save(filename);
};
