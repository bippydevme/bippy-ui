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
    expect(names).toContain(".nojekyll");
  });
});

describe("workspace and GitHub Pages", () => {
  it("keeps pnpm 10 settings in pnpm-workspace.yaml", () => {
    const workspace = readFileSync(join(repoRoot, "pnpm-workspace.yaml"), "utf8");
    const rootPkg = JSON.parse(
      readFileSync(join(repoRoot, "package.json"), "utf8"),
    ) as { pnpm?: unknown };
    expect(workspace).toContain("onlyBuiltDependencies");
    expect(workspace).toContain("linkWorkspacePackages: true");
    expect(workspace).toContain("preferWorkspacePackages: true");
    expect(rootPkg.pnpm).toBeUndefined();
    expect(existsSync(join(repoRoot, ".npmrc"))).toBe(false);
  });

  it("exports the Next demo statically for GitHub Pages", () => {
    const config = readFileSync(
      join(repoRoot, "apps", "next", "next.config.ts"),
      "utf8",
    );
    const home = readFileSync(
      join(repoRoot, "apps", "next", "app", "page.tsx"),
      "utf8",
    );
    const demo = readFileSync(
      join(repoRoot, "apps", "next", "app", "pdf-flipper", "page.tsx"),
      "utf8",
    );
    const playground = readFileSync(
      join(repoRoot, "apps", "next", "app", "pdf-flipper", "playground.tsx"),
      "utf8",
    );
    expect(config).toContain('output: "export"');
    expect(config).toContain('GITHUB_PAGES === "true"');
    expect(config).toContain('"/bippy-ui"');
    expect(home).toContain('href="/pdf-flipper"');
    expect(demo).toContain("NEXT_PUBLIC_BASE_PATH");
    expect(demo).not.toMatch(/src=["']\/catalog\.pdf["']/);
    expect(playground).toContain("Theme");
    expect(playground).toContain("Background");
    expect(playground).toContain("theme={theme}");
  });

  it("has CI, Pages, and publish workflows", () => {
    const ci = readFileSync(join(repoRoot, ".github", "workflows", "ci.yml"), "utf8");
    const pages = readFileSync(
      join(repoRoot, ".github", "workflows", "pages.yml"),
      "utf8",
    );
    const publish = readFileSync(
      join(repoRoot, ".github", "workflows", "publish.yml"),
      "utf8",
    );
    expect(ci).toContain("pnpm --filter @bippy-ui/pdf-flipper test");
    expect(ci).toContain("pnpm --filter next-app build");
    expect(ci).toContain('GITHUB_PAGES: "true"');
    expect(pages).toContain("actions/upload-pages-artifact");
    expect(pages).toContain("apps/next/out");
    expect(publish).toContain("pnpm --filter @bippy-ui/pdf-flipper publish");
    expect(publish).toContain("secrets.NPM_TOKEN");
    expect(publish).toContain('github.ref == \'refs/heads/main\'');
  });
});
