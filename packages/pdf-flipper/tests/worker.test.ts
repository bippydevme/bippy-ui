import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  bundledPdfWorkerSrc,
  DEFAULT_PDFJS_VERSION,
  jsDelivrPdfWorkerSrc,
  resolvePdfWorkerSrc,
} from "../src/worker";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function readSrc(file: string): string {
  return readFileSync(join(packageRoot, "src", file), "utf8");
}

describe("resolvePdfWorkerSrc", () => {
  it("uses an explicit workerSrc prop first", () => {
    expect(
      resolvePdfWorkerSrc({
        workerSrc: "https://cdn.example/custom-worker.mjs",
        metaUrl: "https://example.com/pkg/dist/index.js",
      }),
    ).toBe("https://cdn.example/custom-worker.mjs");
  });

  it("resolves the bundled worker from import.meta.url", () => {
    expect(
      bundledPdfWorkerSrc("https://cdn.example/pkg/dist/index.js"),
    ).toBe("https://cdn.example/pkg/dist/pdf.worker.min.mjs");
    expect(
      resolvePdfWorkerSrc({
        metaUrl: "https://cdn.example/pkg/dist/index.js",
      }),
    ).toBe("https://cdn.example/pkg/dist/pdf.worker.min.mjs");
  });

  it("falls back to the jsDelivr legacy worker when import.meta.url is not fetchable", () => {
    const src = resolvePdfWorkerSrc({
      metaUrl: "file:///tmp/packages/pdf-flipper/dist/index.js",
      pdfjsVersion: DEFAULT_PDFJS_VERSION,
    });
    expect(src).toBe(jsDelivrPdfWorkerSrc(DEFAULT_PDFJS_VERSION));
    expect(src).toContain("cdn.jsdelivr.net/npm/pdfjs-dist@");
    expect(src).toContain("/legacy/build/pdf.worker.min.mjs");
  });

  it("never defaults to a public-root worker path or a Vite URL import", () => {
    const fileSrc = resolvePdfWorkerSrc({
      metaUrl: "file:///workspace/packages/pdf-flipper/src/index.js",
    });
    const httpSrc = resolvePdfWorkerSrc({
      metaUrl: "https://example.com/dist/index.js",
    });

    for (const src of [fileSrc, httpSrc]) {
      expect(src).not.toBe("/pdf.worker.min.mjs");
      expect(src).not.toMatch(/(?:^|\/\/)pdf\.worker\.min\.mjs$/);
      expect(src.startsWith("/")).toBe(false);
      expect(src).not.toContain("?url");
    }
  });
});

describe("package worker contract", () => {
  it("does not resolve the worker through Vite ?url, BASE_URL, or /pdf.worker.min.mjs", () => {
    const renderer = readSrc("pdf-renderer.ts");
    const worker = readSrc("worker.ts");

    expect(renderer).not.toContain("?url");
    expect(renderer).not.toContain("import.meta.env");
    expect(renderer).not.toContain("BASE_URL");
    expect(renderer).not.toMatch(/["'`]\/pdf\.worker\.min\.mjs["'`]/);
    expect(worker).not.toMatch(/["'`]\/pdf\.worker\.min\.mjs["'`]/);
  });
});
