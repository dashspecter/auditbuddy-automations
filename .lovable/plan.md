

# Fix: Remove Broken QA Images + Regenerate PDF Properly

## What Went Wrong

The previous generation placed QA inspection images (`qa_page-*.jpg`) into `public/` — the app's static assets folder. These are binary artifacts that don't belong in the codebase. The PDF itself was generated to `/mnt/documents/` which is correct, but needs to be regenerated fresh with proper QA.

## Plan

### Step 1 — Remove 9 broken QA images from `public/`

Delete `public/qa_page-1.jpg` through `public/qa_page-9.jpg`. These are temporary QA artifacts that should never have been committed to the project.

### Step 2 — Regenerate the PDF with full end-to-end QA

Re-run the reportlab script to produce `/mnt/documents/Dashspect_Prezentare_Primarie.pdf` with:
- Dashspect logo embedded from `public/dashspect-logo-512.png`
- DejaVuSans font for proper Romanian diacritics (ă, â, î, ș, ț)
- All 9 pages: Cover, Problema, Soluția, Module, Cum Funcționează, Beneficii, Securitate, Studiu de Caz, Contact
- Brand colors: `#F97316` orange, `#1E293B` text, `#FEF7ED` light bg

### Step 3 — QA via `pdftoppm` to `/tmp/` (not public)

Convert PDF pages to images in `/tmp/qa_*.jpg`, visually inspect each page for:
- Romanian diacritics rendering (no black boxes)
- Logo placement and sizing
- Text overflow / clipping
- Table alignment
- Color accuracy

### Files Modified

| Action | File |
|--------|------|
| DELETE | `public/qa_page-1.jpg` through `public/qa_page-9.jpg` (9 files) |
| CREATE | `/mnt/documents/Dashspect_Prezentare_Primarie.pdf` (regenerated) |
| CREATE | `/tmp/qa_*.jpg` (temporary QA only, not in repo) |

