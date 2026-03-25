

# Generate Branded PDF Presentation for City Hall Mayor (Romanian)

This will be a **standalone script-generated PDF** (not a UI feature), written to `/mnt/documents/` for immediate download. The PDF will be in **Romanian**, branded with Dashspect colors and logo, and tailored specifically for a **municipal/city hall audience**.

## Content Structure (8-9 pages)

1. **Cover Page** — Dashspect logo, title "Platforma Digitală pentru Primării", subtitle, date
2. **Problema** — Current pain points in city hall operations (paper-based, no visibility, no accountability)
3. **Soluția Dashspect** — High-level value proposition with 4-5 key benefits
4. **Module Relevante pentru Primărie** — Table of applicable modules (Tasks, Audits, Corrective Actions, Training, Attendance, CMMS, Dashboard) with Romanian descriptions tailored to municipal use
5. **Cum Funcționează** — 4-step visual flow (Define → Assign → Execute → Analyze)
6. **Beneficii Concrete** — Stat callouts and bullet points (faster resolution, compliance, transparency, cost savings)
7. **Securitate & Guvernanță** — Roles, permissions, audit trail, data ownership — critical for public sector
8. **Studiu de Caz / Scenarii** — 2-3 concrete scenarios showing how departments (Urbanism, HR, Tehnic) would use it
9. **Contact & Următorii Pași** — Contact info, call to action

## Technical Approach

- Use `reportlab` via `code--exec` to generate a multi-page branded PDF
- Embed the Dashspect logo from `public/dashspect-logo-512.png`
- Use brand colors: primary orange `#F97316`, dark text `#1E293B`, muted `#64748B`
- Output to `/mnt/documents/Dashspect_Prezentare_Primarie.pdf`
- QA via `pdftoppm` conversion and visual inspection

## Brand Elements

- Logo: `public/dashspect-logo-512.png`
- Primary: `#F97316` (orange)
- Dark: `#EA580C`
- Text: `#1E293B`
- Light BG: `#FEF7ED`
- Font: Helvetica (built-in, supports Romanian diacritics with DejaVu fallback)

## Key Romanian Content Points

- **Transparență** — Real-time visibility for all departments
- **Responsabilitate** — Every task tracked, every action logged
- **Eficiență** — Eliminate paper, automate follow-ups
- **Conformitate** — Audit trails for legal compliance
- **Control** — Roles & permissions per department/location

## Files Created

| File | Location |
|------|----------|
| Generator script | `/tmp/gen_primarie_pdf.py` |
| Output PDF | `/mnt/documents/Dashspect_Prezentare_Primarie.pdf` |

