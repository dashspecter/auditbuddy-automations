import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { modulesV2, type ModuleV2, type CategoryType } from '@/components/presentation/modulesData';
import {
  addBrandedHeader,
  addBrandedFooter,
  addSectionTitle,
  BRAND_COLORS,
  BRAND_FONT,
} from './pdfBranding';

// ============================================================================
// FULL PRESENTATION PDF EXPORT
// ============================================================================

const PAGE_WIDTH = 210;
const MARGIN = 15;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const checkPageBreak = (doc: jsPDF, yPos: number, needed: number): number => {
  if (yPos + needed > 275) {
    doc.addPage();
    return 20;
  }
  return yPos;
};

const categoryColors: Record<CategoryType, [number, number, number]> = {
  Operations: [249, 115, 22],
  Quality: [34, 197, 94],
  People: [59, 130, 246],
  Assets: [168, 85, 247],
  Finance: [234, 179, 8],
  AI: [99, 102, 241],
};

const drawBulletPoint = (doc: jsPDF, text: string, x: number, y: number, maxWidth: number): number => {
  doc.setFillColor(...BRAND_COLORS.primary);
  doc.circle(x + 2, y - 1.2, 1.2, 'F');
  const lines = doc.splitTextToSize(text, maxWidth - 10);
  doc.text(lines, x + 7, y);
  return y + lines.length * 4.5 + 1;
};

export const generateFullPresentationPDF = () => {
  const doc = new jsPDF();

  // ── COVER / HEADER ──
  addBrandedHeader(doc, 'Platform Overview', 'DashSpect Full Presentation');

  let y = 55;

  // Tagline
  doc.setFontSize(13);
  doc.setFont(BRAND_FONT, 'bold');
  doc.setTextColor(...BRAND_COLORS.text);
  doc.text('DashSpect turns daily operations into a system —', MARGIN, y);
  y += 6;
  doc.text('across every location.', MARGIN, y);
  y += 10;

  doc.setFontSize(9);
  doc.setFont(BRAND_FONT, 'normal');
  doc.setTextColor(...BRAND_COLORS.textMuted);
  const intro = doc.splitTextToSize(
    'Standardize execution. Drive accountability. Get real-time visibility. Reduce incidents, lower waste, and keep training current — all from one platform.',
    CONTENT_WIDTH,
  );
  doc.text(intro, MARGIN, y);
  y += intro.length * 4 + 8;

  // ── TYPICAL RESULTS ──
  y = addSectionTitle(doc, 'Typical Results', y);
  const outcomes = [
    'Faster issue resolution — Real-time alerts, not weekly reports',
    'Higher audit consistency — Same standards, every location',
    'Reduced repeat incidents — Structured follow-up closes the loop',
    'Better training compliance — Visible progress, automatic reminders',
    'Stronger governance — Right access, clear accountability',
  ];
  doc.setFontSize(9);
  doc.setFont(BRAND_FONT, 'normal');
  doc.setTextColor(...BRAND_COLORS.text);
  outcomes.forEach((o) => {
    y = checkPageBreak(doc, y, 6);
    y = drawBulletPoint(doc, o, MARGIN, y, CONTENT_WIDTH);
  });
  y += 4;

  // ── HOW IT WORKS ──
  y = checkPageBreak(doc, y, 40);
  y = addSectionTitle(doc, 'How It Works', y);
  const steps = [
    '1. Define standards — Create templates, checklists, and procedures that reflect your operating standards.',
    '2. Assign execution — Push tasks and audits to the right people at the right time, automatically.',
    '3. Capture evidence — Staff complete work with photos, notes, and timestamps. No more paper.',
    '4. Analyze & improve — Review trends, spot issues, and make data-driven decisions to improve.',
  ];
  doc.setFontSize(9);
  doc.setFont(BRAND_FONT, 'normal');
  steps.forEach((s) => {
    y = checkPageBreak(doc, y, 8);
    const lines = doc.splitTextToSize(s, CONTENT_WIDTH);
    doc.text(lines, MARGIN, y);
    y += lines.length * 4.5 + 2;
  });
  y += 4;

  // ── KIOSK MODE ──
  y = checkPageBreak(doc, y, 30);
  y = addSectionTitle(doc, 'Kiosk Mode', y);
  doc.setFontSize(9);
  doc.setFont(BRAND_FONT, 'normal');
  doc.setTextColor(...BRAND_COLORS.textMuted);
  const kioskDesc = doc.splitTextToSize(
    'A shared screen experience for fast, reliable execution — especially for high-turnover teams. Staff sign in with PIN/QR, see only what\'s relevant for their current shift, and all data syncs in real-time.',
    CONTENT_WIDTH,
  );
  doc.text(kioskDesc, MARGIN, y);
  y += kioskDesc.length * 4 + 6;

  // ── MODULE OVERVIEW TABLE ──
  y = checkPageBreak(doc, y, 30);
  y = addSectionTitle(doc, 'Module Overview', y);

  const tableData = modulesV2.map((m) => [
    m.name,
    m.category,
    m.maturityStage,
    m.optional ? 'Optional' : 'Core',
    m.kioskReady ? '✓' : '',
    m.recommended ? '★' : '',
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Module', 'Category', 'Maturity', 'Type', 'Kiosk', 'Rec.']],
    body: tableData,
    margin: { left: MARGIN, right: MARGIN },
    headStyles: {
      fillColor: BRAND_COLORS.primary,
      textColor: BRAND_COLORS.white,
      fontStyle: 'bold',
      font: BRAND_FONT,
      fontSize: 8,
    },
    bodyStyles: {
      textColor: BRAND_COLORS.text,
      font: BRAND_FONT,
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: BRAND_COLORS.lightBg },
    styles: { cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 50 },
      4: { halign: 'center', cellWidth: 14 },
      5: { halign: 'center', cellWidth: 14 },
    },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // ── DETAILED MODULE PAGES ──
  modulesV2.forEach((module) => {
    doc.addPage();
    y = 20;

    // Module title bar
    const catColor = categoryColors[module.category] || BRAND_COLORS.primary;
    doc.setFillColor(...catColor);
    doc.rect(0, y - 8, PAGE_WIDTH, 14, 'F');
    doc.setTextColor(...BRAND_COLORS.white);
    doc.setFontSize(14);
    doc.setFont(BRAND_FONT, 'bold');
    doc.text(module.name, MARGIN, y);
    doc.setFontSize(9);
    doc.setFont(BRAND_FONT, 'normal');
    doc.text(
      `${module.category}  •  ${module.maturityStage}  •  ${module.optional ? 'Optional' : 'Core'}${module.kioskReady ? '  •  Kiosk-ready' : ''}`,
      MARGIN,
      y + 5,
    );
    y += 14;

    // Summary
    doc.setTextColor(...BRAND_COLORS.text);
    doc.setFontSize(10);
    doc.setFont(BRAND_FONT, 'normal');
    const summaryLines = doc.splitTextToSize(module.summary, CONTENT_WIDTH);
    doc.text(summaryLines, MARGIN, y);
    y += summaryLines.length * 5 + 6;

    // Highlights
    y = addSectionTitle(doc, 'Highlights', y);
    doc.setFontSize(9);
    doc.setFont(BRAND_FONT, 'normal');
    doc.setTextColor(...BRAND_COLORS.text);
    module.highlights.forEach((h) => {
      y = checkPageBreak(doc, y, 6);
      y = drawBulletPoint(doc, h, MARGIN, y, CONTENT_WIDTH);
    });
    y += 4;

    // Outputs
    y = checkPageBreak(doc, y, 12);
    y = addSectionTitle(doc, 'Outputs', y);
    doc.setFontSize(9);
    doc.setFont(BRAND_FONT, 'normal');
    doc.text(module.outputs.join('  •  '), MARGIN, y);
    y += 8;

    // Best For
    y = checkPageBreak(doc, y, 12);
    y = addSectionTitle(doc, 'Best For', y);
    doc.setFontSize(9);
    doc.setFont(BRAND_FONT, 'normal');
    doc.text(module.bestFor.join('  •  '), MARGIN, y);
    y += 8;

    // How teams use it
    y = checkPageBreak(doc, y, 20);
    y = addSectionTitle(doc, 'What Teams Usually Do With This', y);
    doc.setFontSize(9);
    doc.setFont(BRAND_FONT, 'normal');
    module.details.howTeamsUseIt.forEach((item) => {
      y = checkPageBreak(doc, y, 8);
      y = drawBulletPoint(doc, item, MARGIN, y, CONTENT_WIDTH);
    });
    y += 4;

    // Sample artifacts
    y = checkPageBreak(doc, y, 20);
    y = addSectionTitle(doc, 'Sample Report Card', y);
    doc.setFontSize(9);
    doc.setFont(BRAND_FONT, 'normal');
    doc.setTextColor(...BRAND_COLORS.textMuted);
    module.details.sampleArtifacts.forEach((item) => {
      y = checkPageBreak(doc, y, 8);
      y = drawBulletPoint(doc, item, MARGIN, y, CONTENT_WIDTH);
    });
    doc.setTextColor(...BRAND_COLORS.text);
  });

  // ── SECURITY & GOVERNANCE ──
  doc.addPage();
  y = 20;
  y = addSectionTitle(doc, 'Security & Governance', y);
  const securityItems = [
    'Roles & Permissions — Granular control over who can view, edit, and approve across every module.',
    'Location-based Access — Restrict users to specific locations or regions. Managers see only their sites.',
    'Audit Logs — Complete history of every action, change, and login. Exportable for compliance.',
    'Data Ownership — Your data stays yours. Export anytime. Delete on request. No lock-in.',
  ];
  doc.setFontSize(9);
  doc.setFont(BRAND_FONT, 'normal');
  doc.setTextColor(...BRAND_COLORS.text);
  securityItems.forEach((item) => {
    y = drawBulletPoint(doc, item, MARGIN, y, CONTENT_WIDTH);
  });
  y += 6;

  // ── INTEGRATIONS ──
  y = checkPageBreak(doc, y, 30);
  y = addSectionTitle(doc, 'Integrations', y);
  const integrations = [
    'POS & ERP — Connect to point-of-sale and enterprise systems for sales data and inventory sync.',
    'HR & Payroll — Sync employee data and export hours to your payroll provider.',
    'API & Webhooks — Build custom integrations with our REST API and real-time webhooks.',
  ];
  doc.setFontSize(9);
  doc.setFont(BRAND_FONT, 'normal');
  integrations.forEach((item) => {
    y = drawBulletPoint(doc, item, MARGIN, y, CONTENT_WIDTH);
  });
  y += 6;

  // ── INDUSTRIES ──
  y = checkPageBreak(doc, y, 20);
  y = addSectionTitle(doc, 'Industries', y);
  doc.setFontSize(9);
  doc.setFont(BRAND_FONT, 'normal');
  doc.text('Restaurants  •  Retail  •  Hospitality  •  Dark Kitchens  •  Logistics Depots  •  Healthcare Facilities', MARGIN, y);
  y += 10;

  // ── FAQ ──
  y = checkPageBreak(doc, y, 30);
  y = addSectionTitle(doc, 'Frequently Asked Questions', y);

  const faqs = [
    { q: 'How fast can we roll out to 10 locations?', a: 'Most teams are live within 1–2 weeks. We provide onboarding support, template libraries, and training materials to accelerate your rollout. Larger deployments typically take 3–4 weeks with a phased approach.' },
    { q: 'Can each location have different checklists but the same governance?', a: 'Yes. You can create location-specific templates while maintaining company-wide standards and reporting. Admins see everything; managers see only their locations.' },
    { q: 'Do staff need training to use it?', a: 'The mobile interface is designed for zero training. Staff can complete tasks, clock in, and submit incidents in seconds. Managers typically need a 30-minute walkthrough.' },
    { q: 'Does it work on mobile and kiosk?', a: 'Yes. Staff access the platform via mobile web (no app download required). Kiosk mode provides a dedicated shared-device experience for clock-in/out, task execution, and training shifts.' },
    { q: 'How do you prevent "checkbox theatre"?', a: 'Three ways: (1) Photo evidence requirements on critical tasks, (2) Manager verification workflows, and (3) Trend analysis that flags unusual patterns.' },
  ];

  doc.setFontSize(9);
  faqs.forEach((faq) => {
    y = checkPageBreak(doc, y, 20);
    doc.setFont(BRAND_FONT, 'bold');
    doc.setTextColor(...BRAND_COLORS.primary);
    const qLines = doc.splitTextToSize(`Q: ${faq.q}`, CONTENT_WIDTH);
    doc.text(qLines, MARGIN, y);
    y += qLines.length * 4.5 + 1;

    doc.setFont(BRAND_FONT, 'normal');
    doc.setTextColor(...BRAND_COLORS.text);
    const aLines = doc.splitTextToSize(faq.a, CONTENT_WIDTH);
    doc.text(aLines, MARGIN, y);
    y += aLines.length * 4.5 + 5;
  });

  // ── CONTACT ──
  y = checkPageBreak(doc, y, 25);
  y = addSectionTitle(doc, 'Get Started Today', y);
  doc.setFontSize(10);
  doc.setFont(BRAND_FONT, 'normal');
  doc.setTextColor(...BRAND_COLORS.text);
  doc.text('Email: alex@grecea.work', MARGIN, y);
  y += 6;
  doc.text('Phone: 0741 427 777', MARGIN, y);

  // ── FOOTER ──
  addBrandedFooter(doc);

  doc.save('DashSpect_Platform_Overview.pdf');
};
