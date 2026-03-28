/**
 * Unit tests for useDashChat hook logic (pure utility functions).
 * Run with: npx vitest run
 */
import { describe, it, expect } from "vitest";

// ─── Test sanitizeDisplayContent logic ───────────────────────
function sanitizeDisplayContent(content: string): string {
  return content
    .replace(/\n?\n?\[Attached files?:\s*[^\]]*\]/gi, "")
    .replace(/\n?\[File URLs?:\s*[^\]]*\]/gi, "")
    .replace(/\n?\[Attached:\s*[^\]]*\]/gi, "")
    .trim();
}

describe("sanitizeDisplayContent", () => {
  it("strips attached files annotation", () => {
    const input = "Hello\n\n[Attached files: photo.jpg]";
    expect(sanitizeDisplayContent(input)).toBe("Hello");
  });

  it("strips file URL annotation", () => {
    const input = "Check this out\n[File URLs: https://example.com/file.pdf]";
    expect(sanitizeDisplayContent(input)).toBe("Check this out");
  });

  it("preserves clean messages", () => {
    expect(sanitizeDisplayContent("What are today's attendance exceptions?")).toBe(
      "What are today's attendance exceptions?"
    );
  });

  it("handles multiple annotations", () => {
    const input = "Upload\n\n[Attached files: a.pdf, b.pdf]\n[File URLs: https://x.com/a, https://x.com/b]";
    expect(sanitizeDisplayContent(input)).toBe("Upload");
  });
});

// ─── Test buildTransportText logic ───────────────────────────
function buildTransportText(displayText: string, attachments?: { name: string; url: string }[]): string {
  if (!attachments || attachments.length === 0) return displayText;
  const names = attachments.map(a => a.name).join(", ");
  const urls = attachments.map(a => a.url).join(", ");
  return `${displayText}\n\n[Attached files: ${names}]\n[File URLs: ${urls}]`;
}

describe("buildTransportText", () => {
  it("returns plain text when no attachments", () => {
    expect(buildTransportText("hello")).toBe("hello");
  });

  it("appends attachment metadata for backend transport", () => {
    const result = buildTransportText("check this", [{ name: "doc.pdf", url: "https://x.com/doc.pdf" }]);
    expect(result).toContain("[Attached files: doc.pdf]");
    expect(result).toContain("[File URLs: https://x.com/doc.pdf]");
  });

  it("handles multiple attachments", () => {
    const result = buildTransportText("multiple", [
      { name: "a.pdf", url: "https://x.com/a.pdf" },
      { name: "b.pdf", url: "https://x.com/b.pdf" },
    ]);
    expect(result).toContain("a.pdf, b.pdf");
  });
});

// ─── Test pagination logic ────────────────────────────────────
const DISPLAY_PAGE_SIZE = 50;

function computeDisplayMessages<T>(messages: T[], extraHistory: number): T[] {
  return messages.slice(Math.max(0, messages.length - DISPLAY_PAGE_SIZE - extraHistory));
}

function computeHasMoreHistory(messagesLength: number, extraHistory: number): boolean {
  return messagesLength > DISPLAY_PAGE_SIZE + extraHistory;
}

describe("message pagination", () => {
  it("shows last 50 messages by default", () => {
    const msgs = Array.from({ length: 80 }, (_, i) => i);
    const display = computeDisplayMessages(msgs, 0);
    expect(display.length).toBe(50);
    expect(display[0]).toBe(30); // starts from index 30 (80 - 50)
  });

  it("shows more when extraHistory increases", () => {
    const msgs = Array.from({ length: 80 }, (_, i) => i);
    const display = computeDisplayMessages(msgs, 50);
    expect(display.length).toBe(80); // all messages visible
  });

  it("hasMoreHistory is true when messages exceed page size", () => {
    expect(computeHasMoreHistory(80, 0)).toBe(true);
    expect(computeHasMoreHistory(30, 0)).toBe(false);
    expect(computeHasMoreHistory(80, 50)).toBe(false); // all loaded
  });

  it("shows all when messages <= page size", () => {
    const msgs = Array.from({ length: 20 }, (_, i) => i);
    const display = computeDisplayMessages(msgs, 0);
    expect(display.length).toBe(20);
  });
});

// ─── Test approval routing pattern guards ────────────────────
describe("typed approval regex guards", () => {
  const APPROVE_PATTERNS = /^(yes|approve|confirm|go ahead|da|aprob[aă]|execut[aă]|ok|do it|proceed)[\s!.]*$/i;
  const REJECT_PATTERNS = /^(no|reject|cancel|nu|refuz[aă]|anuleaz[aă]|stop|don'?t)[\s!.]*$/i;

  it("matches affirmative patterns", () => {
    expect(APPROVE_PATTERNS.test("yes")).toBe(true);
    expect(APPROVE_PATTERNS.test("approve")).toBe(true);
    expect(APPROVE_PATTERNS.test("ok")).toBe(true);
    expect(APPROVE_PATTERNS.test("go ahead")).toBe(true);
    expect(APPROVE_PATTERNS.test("da")).toBe(true);
  });

  it("matches rejection patterns", () => {
    expect(REJECT_PATTERNS.test("no")).toBe(true);
    expect(REJECT_PATTERNS.test("cancel")).toBe(true);
    expect(REJECT_PATTERNS.test("stop")).toBe(true);
  });

  it("does NOT match general messages", () => {
    expect(APPROVE_PATTERNS.test("yes please show me the report")).toBe(false);
    expect(APPROVE_PATTERNS.test("ok but first show me")).toBe(false);
    expect(REJECT_PATTERNS.test("no problem")).toBe(false);
  });
});
