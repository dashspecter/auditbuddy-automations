-- Make document_id nullable for manual tests
ALTER TABLE tests ALTER COLUMN document_id DROP NOT NULL;