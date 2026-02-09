import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BRAND_COLORS, BRAND_FONT, addBrandedFooter } from './pdfBranding';
import { format } from 'date-fns';

interface OfferModule {
  name: string;
  description: string;
  included: boolean; // true = paid core, false = free bonus
}

interface OfferData {
  clientName: string;
  clientWebsite: string;
  clientEmployees: number;
  clientLocations: number;
  offerDate: string;
  validUntil: string;
  coreModules: OfferModule[];
  bonusModules: OfferModule[];
  basePrice: number;
  discountPercent: number;
  finalPrice: number;
  currency: string;
  includesSetup: boolean;
  offerNumber: string;
}

const addOfferHeader = (doc: jsPDF) => {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Full-width orange header
  doc.setFillColor(...BRAND_COLORS.primary);
  doc.rect(0, 0, pageWidth, 52, 'F');

  // Accent stripe
  doc.setFillColor(...BRAND_COLORS.primaryDark);
  doc.rect(0, 48, pageWidth, 4, 'F');

  // Logo circle
  doc.setFillColor(...BRAND_COLORS.white);
  doc.circle(25, 26, 12, 'F');
  doc.setTextColor(...BRAND_COLORS.primary);
  doc.setFontSize(16);
  doc.setFont(BRAND_FONT, 'bold');
  doc.text('D', 21, 31);

  // Brand name + tagline
  doc.setTextColor(...BRAND_COLORS.white);
  doc.setFontSize(24);
  doc.setFont(BRAND_FONT, 'bold');
  doc.text('Dashspect', 42, 24);

  doc.setFontSize(10);
  doc.setFont(BRAND_FONT, 'normal');
  doc.text('Operations Management Platform', 42, 32);

  // "Commercial Offer" label
  doc.setFontSize(12);
  doc.setFont(BRAND_FONT, 'bold');
  doc.text('COMMERCIAL OFFER', pageWidth - 15, 24, { align: 'right' });

  doc.setTextColor(...BRAND_COLORS.text);
};

const addClientSection = (doc: jsPDF, offer: OfferData, y: number): number => {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Left box: Client info
  const boxWidth = (pageWidth - 40) / 2;

  // Client box
  doc.setFillColor(245, 245, 250);
  doc.roundedRect(15, y, boxWidth, 42, 3, 3, 'F');

  doc.setFontSize(8);
  doc.setFont(BRAND_FONT, 'bold');
  doc.setTextColor(...BRAND_COLORS.textMuted);
  doc.text('PREPARED FOR', 20, y + 8);

  doc.setFontSize(14);
  doc.setFont(BRAND_FONT, 'bold');
  doc.setTextColor(...BRAND_COLORS.text);
  doc.text(offer.clientName, 20, y + 17);

  doc.setFontSize(9);
  doc.setFont(BRAND_FONT, 'normal');
  doc.setTextColor(...BRAND_COLORS.textMuted);
  doc.text(offer.clientWebsite, 20, y + 24);

  doc.setFontSize(9);
  doc.setFont(BRAND_FONT, 'normal');
  doc.text(`${offer.clientEmployees} employees  •  ${offer.clientLocations} locations`, 20, y + 32);

  // Right box: Offer details
  const rightX = 15 + boxWidth + 10;
  doc.setFillColor(...BRAND_COLORS.lightBg);
  doc.roundedRect(rightX, y, boxWidth, 42, 3, 3, 'F');

  doc.setFontSize(8);
  doc.setFont(BRAND_FONT, 'bold');
  doc.setTextColor(...BRAND_COLORS.textMuted);
  doc.text('OFFER DETAILS', rightX + 5, y + 8);

  doc.setFontSize(9);
  doc.setFont(BRAND_FONT, 'normal');
  doc.setTextColor(...BRAND_COLORS.text);

  const details = [
    [`Offer #:`, offer.offerNumber],
    [`Date:`, offer.offerDate],
    [`Valid until:`, offer.validUntil],
  ];

  details.forEach(([label, value], i) => {
    doc.setFont(BRAND_FONT, 'bold');
    doc.text(label, rightX + 5, y + 17 + i * 7);
    doc.setFont(BRAND_FONT, 'normal');
    doc.text(value, rightX + 30, y + 17 + i * 7);
  });

  return y + 52;
};

const addPricingSection = (doc: jsPDF, offer: OfferData, y: number): number => {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Section title
  doc.setFontSize(14);
  doc.setFont(BRAND_FONT, 'bold');
  doc.setTextColor(...BRAND_COLORS.primary);
  doc.text('Core Package', 15, y);
  y += 3;

  // Core modules table
  const coreTableData = offer.coreModules.map(m => [m.name, m.description]);

  autoTable(doc, {
    startY: y,
    head: [['Module', 'Description']],
    body: coreTableData,
    headStyles: {
      fillColor: BRAND_COLORS.primary,
      textColor: BRAND_COLORS.white,
      fontStyle: 'bold',
      font: BRAND_FONT,
      fontSize: 10,
    },
    bodyStyles: {
      textColor: BRAND_COLORS.text,
      font: BRAND_FONT,
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: BRAND_COLORS.lightBg,
    },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold' },
      1: { cellWidth: 'auto' },
    },
    margin: { left: 15, right: 15 },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // Pricing box
  const boxWidth = pageWidth - 30;
  doc.setFillColor(245, 245, 250);
  doc.roundedRect(15, y, boxWidth, 45, 3, 3, 'F');

  // Accent line on left
  doc.setFillColor(...BRAND_COLORS.primary);
  doc.rect(15, y, 4, 45, 'F');

  let pY = y + 12;

  // Base price
  doc.setFontSize(10);
  doc.setFont(BRAND_FONT, 'normal');
  doc.setTextColor(...BRAND_COLORS.textMuted);
  doc.text('List Price:', 25, pY);
  doc.setFont(BRAND_FONT, 'normal');
  doc.setTextColor(...BRAND_COLORS.text);
  doc.text(`${offer.basePrice.toLocaleString()} ${offer.currency} + VAT / month`, 60, pY);

  pY += 8;

  // Discount
  doc.setFontSize(10);
  doc.setFont(BRAND_FONT, 'normal');
  doc.setTextColor(...BRAND_COLORS.textMuted);
  doc.text('Discount:', 25, pY);
  doc.setFont(BRAND_FONT, 'bold');
  doc.setTextColor(...BRAND_COLORS.success);
  doc.text(`-${offer.discountPercent}%`, 60, pY);

  pY += 10;

  // Divider
  doc.setDrawColor(200, 200, 210);
  doc.setLineWidth(0.3);
  doc.line(25, pY - 4, 15 + boxWidth - 5, pY - 4);

  // Final price
  doc.setFontSize(11);
  doc.setFont(BRAND_FONT, 'bold');
  doc.setTextColor(...BRAND_COLORS.textMuted);
  doc.text('Monthly Total:', 25, pY + 2);

  doc.setFontSize(18);
  doc.setFont(BRAND_FONT, 'bold');
  doc.setTextColor(...BRAND_COLORS.primary);
  doc.text(`${offer.finalPrice.toLocaleString()} ${offer.currency} + VAT`, 60, pY + 3);

  return y + 55;
};

const addBonusSection = (doc: jsPDF, offer: OfferData, y: number): number => {
  // Check for page break
  if (y > 200) {
    doc.addPage();
    y = 20;
  }

  // Section title
  doc.setFontSize(14);
  doc.setFont(BRAND_FONT, 'bold');
  doc.setTextColor(...BRAND_COLORS.primary);
  doc.text('Included FREE — Bonus Modules & Services', 15, y);
  y += 3;

  // Add setup as first bonus item
  const bonusTableData = [
    ...(offer.includesSetup
      ? [['Platform Setup', 'Full account setup, location configuration, user onboarding, and initial data migration — included at no cost.']]
      : []),
    ...offer.bonusModules.map(m => [m.name, m.description]),
  ];

  autoTable(doc, {
    startY: y,
    head: [['Included Free', 'Description']],
    body: bonusTableData,
    headStyles: {
      fillColor: BRAND_COLORS.success,
      textColor: BRAND_COLORS.white,
      fontStyle: 'bold',
      font: BRAND_FONT,
      fontSize: 10,
    },
    bodyStyles: {
      textColor: BRAND_COLORS.text,
      font: BRAND_FONT,
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [240, 253, 244],
    },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold' },
      1: { cellWidth: 'auto' },
    },
    margin: { left: 15, right: 15 },
  });

  return (doc as any).lastAutoTable.finalY + 10;
};

const addSummaryBanner = (doc: jsPDF, offer: OfferData, y: number): number => {
  const pageWidth = doc.internal.pageSize.getWidth();

  if (y > 230) {
    doc.addPage();
    y = 20;
  }

  // Summary banner
  doc.setFillColor(...BRAND_COLORS.primary);
  doc.roundedRect(15, y, pageWidth - 30, 35, 3, 3, 'F');

  doc.setTextColor(...BRAND_COLORS.white);
  doc.setFontSize(11);
  doc.setFont(BRAND_FONT, 'bold');
  doc.text('TOTAL INVESTMENT SUMMARY', 20, y + 10);

  doc.setFontSize(9);
  doc.setFont(BRAND_FONT, 'normal');
  doc.text(`${offer.coreModules.length} core modules + ${offer.bonusModules.length + (offer.includesSetup ? 1 : 0)} bonus items included free`, 20, y + 18);
  doc.text(`For ${offer.clientEmployees} employees across ${offer.clientLocations} locations`, 20, y + 25);

  doc.setFontSize(20);
  doc.setFont(BRAND_FONT, 'bold');
  doc.text(`${offer.finalPrice.toLocaleString()} ${offer.currency}`, pageWidth - 20, y + 18, { align: 'right' });
  doc.setFontSize(9);
  doc.setFont(BRAND_FONT, 'normal');
  doc.text('+ VAT / month', pageWidth - 20, y + 26, { align: 'right' });

  return y + 45;
};

const addTermsSection = (doc: jsPDF, y: number): number => {
  if (y > 230) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(12);
  doc.setFont(BRAND_FONT, 'bold');
  doc.setTextColor(...BRAND_COLORS.primary);
  doc.text('Terms & Conditions', 15, y);
  y += 7;

  const terms = [
    'This offer is valid for 30 days from the date of issue.',
    'Monthly subscription, billed at the start of each calendar month.',
    'All prices are in EUR and are exclusive of VAT (19%).',
    'A minimum commitment period of 12 months applies.',
    'Platform setup and onboarding are included at no additional cost.',
    'Technical support is provided via email and in-app chat.',
    'Data is hosted securely within the EU, compliant with GDPR.',
  ];

  doc.setFontSize(8.5);
  doc.setFont(BRAND_FONT, 'normal');
  doc.setTextColor(...BRAND_COLORS.textMuted);

  terms.forEach(term => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.setFillColor(...BRAND_COLORS.primary);
    doc.circle(18, y - 1.2, 1.2, 'F');
    doc.text(term, 23, y);
    y += 6;
  });

  return y + 5;
};

const addContactSection = (doc: jsPDF, y: number): number => {
  if (y > 240) {
    doc.addPage();
    y = 20;
  }

  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(12);
  doc.setFont(BRAND_FONT, 'bold');
  doc.setTextColor(...BRAND_COLORS.primary);
  doc.text('Get Started', 15, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont(BRAND_FONT, 'normal');
  doc.setTextColor(...BRAND_COLORS.text);

  const contactInfo = [
    'Ready to proceed? Contact us to schedule your onboarding:',
    '',
    'Email:  hello@dashspect.com',
    'Phone:  +40 756 123 456',
    'Web:    www.dashspect.com',
  ];

  contactInfo.forEach(line => {
    doc.text(line, 15, y);
    y += 5.5;
  });

  return y;
};

export const generateProperPizzaOffer = () => {
  const today = new Date();
  const validUntil = new Date(today);
  validUntil.setDate(validUntil.getDate() + 30);

  const offer: OfferData = {
    clientName: 'Proper Pizza',
    clientWebsite: 'properpizza.ro',
    clientEmployees: 260,
    clientLocations: 9,
    offerDate: format(today, 'dd MMMM yyyy'),
    validUntil: format(validUntil, 'dd MMMM yyyy'),
    coreModules: [
      {
        name: 'Workforce & Scheduling',
        description: 'Build and publish shift schedules, QR/kiosk clock-in/out, manage time-off requests, calculate hours and labor costs across all 9 locations.',
        included: true,
      },
      {
        name: 'Tasks & Daily Execution',
        description: 'Assign, track, and verify daily tasks with photo evidence. Recurring checklists for opening/closing with mobile-first interface for frontline staff.',
        included: true,
      },
      {
        name: 'Audits & Checklists',
        description: 'Standardize inspections with scored custom templates, photo capture, scheduled recurring audits, and instant PDF report generation.',
        included: true,
      },
      {
        name: 'Mystery Shopper',
        description: 'Capture real guest experiences with anonymous evaluations, custom forms, unique links, service quality scoring, and participation vouchers.',
        included: true,
      },
    ],
    bonusModules: [
      {
        name: 'Operations Dashboard',
        description: 'Real-time command center with live task completion rates, location comparison, and trend analysis.',
        included: false,
      },
      {
        name: 'Incident Reporting',
        description: 'Log incidents with photos, assign corrective actions (CAPA), track resolution, and analyze recurring issues.',
        included: false,
      },
      {
        name: 'Training & Certifications',
        description: 'Assign role-based training, track quiz scores, set expiry reminders, and identify compliance gaps.',
        included: false,
      },
      {
        name: 'Waste & Loss Prevention',
        description: 'Log waste by product/reason, set targets, track variance vs. sales, and identify top waste items.',
        included: false,
      },
      {
        name: 'Equipment & Assets',
        description: 'Complete asset register with QR tracking, warranty alerts, and full maintenance history.',
        included: false,
      },
      {
        name: 'Maintenance & CMMS',
        description: 'Schedule preventive maintenance, manage work orders, track parts inventory, and analyze downtime.',
        included: false,
      },
      {
        name: 'Reporting & Analytics',
        description: 'Cross-module reports, scheduled delivery, PDF/Excel export, and trend charts.',
        included: false,
      },
      {
        name: 'Governance & Permissions',
        description: 'Granular role-based access, location restrictions, activity audit logs, and approval workflows.',
        included: false,
      },
    ],
    basePrice: 1550,
    discountPercent: 20,
    finalPrice: 1240,
    currency: 'EUR',
    includesSetup: true,
    offerNumber: `DSP-${format(today, 'yyyyMMdd')}-001`,
  };

  const doc = new jsPDF();

  // Page 1 - Header + Client + Pricing
  addOfferHeader(doc);
  let y = 62;
  y = addClientSection(doc, offer, y);
  y += 5;
  y = addPricingSection(doc, offer, y);

  // Bonus modules (may flow to page 2)
  y = addBonusSection(doc, offer, y);

  // Summary banner
  y = addSummaryBanner(doc, offer, y);

  // Terms
  y = addTermsSection(doc, y);

  // Contact
  y = addContactSection(doc, y);

  // Footer on all pages
  addBrandedFooter(doc);

  // Save
  const fileName = `Dashspect_Offer_Proper_Pizza_${format(today, 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
};
