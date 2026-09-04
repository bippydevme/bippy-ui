import { afterEach, describe, expect, it, vi } from "vitest";

import { PdfOpenError, readPdfBytes } from "../src/source";
import { pdfDownloadFileName } from "../src/chrome-actions";

describe("pdf source", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns ArrayBuffer bytes without fetching", async () => {
    const bytes = new Uint8Array([37, 80, 68, 70, 45]);
    const result = await readPdfBytes(bytes.buffer);
    expect(result).toEqual(bytes);
  });

  it("rejects a missing remote PDF", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("missing", { status: 404 })),
    );
    await expect(readPdfBytes("/missing.pdf")).rejects.toMatchObject({
      name: "PdfOpenError",
      kind: "missing",
    } satisfies Partial<PdfOpenError>);
  });

  it("names downloads from the source path", () => {
    expect(pdfDownloadFileName("/catalog.pdf")).toBe("catalog.pdf");
    expect(pdfDownloadFileName("/catalog.pdf", "Spring catalog")).toBe(
      "Spring catalog.pdf",
    );
  });
});
