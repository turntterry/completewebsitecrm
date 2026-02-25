import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Email utility tests ───────────────────────────────────────────────────────

describe("buildMagicLinkEmail", () => {
  it("generates HTML with customer name and magic link URL", async () => {
    const { buildMagicLinkEmail } = await import("./email");
    const { html, text } = buildMagicLinkEmail({
      customerName: "John Smith",
      magicLinkUrl: "https://example.com/client?token=abc123",
      companyName: "Exterior Experts",
      context: "quote",
    });

    expect(html).toContain("John Smith");
    expect(html).toContain("https://example.com/client?token=abc123");
    expect(html).toContain("Exterior Experts");
    expect(html).toContain("Open Client Portal");
    expect(text).toContain("John Smith");
    expect(text).toContain("https://example.com/client?token=abc123");
  });

  it("uses correct subject context for invoice", async () => {
    const { buildMagicLinkEmail } = await import("./email");
    const { html } = buildMagicLinkEmail({
      customerName: "Jane Doe",
      magicLinkUrl: "https://example.com/client?token=xyz",
      companyName: "Exterior Experts",
      context: "invoice",
    });

    expect(html).toContain("invoice");
  });

  it("defaults to general context", async () => {
    const { buildMagicLinkEmail } = await import("./email");
    const { html } = buildMagicLinkEmail({
      customerName: "Bob",
      magicLinkUrl: "https://example.com/client?token=def",
      companyName: "Exterior Experts",
    });

    expect(html).toContain("client portal");
  });

  it("includes expiry warning in text", async () => {
    const { buildMagicLinkEmail } = await import("./email");
    const { text } = buildMagicLinkEmail({
      customerName: "Alice",
      magicLinkUrl: "https://example.com/client?token=ghi",
      companyName: "Exterior Experts",
      context: "general",
    });

    expect(text).toContain("48 hours");
  });
});

// ─── sendEmail tests ───────────────────────────────────────────────────────────

describe("sendEmail", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns false when RESEND_API_KEY is not set", async () => {
    const originalKey = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;

    const { sendEmail } = await import("./email");
    const result = await sendEmail({
      to: "test@example.com",
      subject: "Test",
      html: "<p>Test</p>",
    });

    expect(result).toBe(false);
    process.env.RESEND_API_KEY = originalKey;
  });

  it("returns false when Resend API returns non-OK status", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => "Unprocessable Entity",
    }));

    const { sendEmail } = await import("./email");
    const result = await sendEmail({
      to: "test@example.com",
      subject: "Test",
      html: "<p>Test</p>",
    });

    expect(result).toBe(false);
    vi.unstubAllGlobals();
  });

  it("returns true on successful API response", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: "email_123" }),
    }));

    const { sendEmail } = await import("./email");
    const result = await sendEmail({
      to: "test@example.com",
      subject: "Test",
      html: "<p>Test</p>",
    });

    expect(result).toBe(true);
    vi.unstubAllGlobals();
  });
});
