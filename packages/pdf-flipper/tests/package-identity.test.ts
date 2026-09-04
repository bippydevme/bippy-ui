import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(packageRoot, "..", "..");

describe("package identity", () => {
  it("publishes as @bippy-ui/pdf-flipper", () => {
    const pkg = JSON.parse(
      readFileSync(join(packageRoot, "package.json"), "utf8"),
    ) as {
      name: string;
      peerDependencies: Record<string, string>;
      dependencies: Record<string, string>;
    };

    expect(pkg.name).toBe("@bippy-ui/pdf-flipper");
    expect(pkg.name.startsWith("@bippy-ui/")).toBe(true);
    expect(pkg.peerDependencies.react).toBe("^18 || ^19");
    expect(pkg.peerDependencies["react-dom"]).toBe("^18 || ^19");
    expect(pkg.dependencies["pdfjs-dist"]).toBe("^6.3.289");
  });

  it("never uses a forbidden npm scope", () => {
    const pkg = readFileSync(join(packageRoot, "package.json"), "utf8");
    const readme = readFileSync(join(repoRoot, "README.md"), "utf8");
    for (const source of [pkg, readme]) {
      expect(source).not.toContain("@bippyui/");
      expect(source).not.toContain("@bippygroup/");
      expect(source).not.toContain("@bippydev/");
    }
  });

  it("exports PdfFlipper with a PdfFlipbook alias and a use client entry", () => {
    const entry = readFileSync(join(packageRoot, "src", "index.ts"), "utf8");
    expect(entry.startsWith('"use client";')).toBe(true);
    expect(entry).toContain('import "./styles.css"');
    expect(entry).toContain("PdfFlipper");
    expect(entry).toContain("PdfFlipbook");
  });

  it("keeps the pdf-flipbook class prefix", () => {
    const css = readFileSync(join(packageRoot, "src", "styles.css"), "utf8");
    expect(css).toContain(".pdf-flipbook {");
    expect(css).toContain(".pdf-flipbook__stage");
  });

  it("does not put a PDF.js worker in the Next app public folder", () => {
    const publicDir = join(repoRoot, "apps", "next", "public");
    expect(existsSync(join(publicDir, "catalog.pdf"))).toBe(true);
    const names = existsSync(publicDir) ? readdirSync(publicDir) : [];
    expect(names).not.toContain("pdf.worker.min.mjs");
    expect(names.some((name) => name.includes("pdf.worker"))).toBe(false);
  });
});
