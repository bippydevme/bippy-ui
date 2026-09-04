import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(packageRoot, "..", "..");

const SKIP_DIRS = new Set([
  ".git",
  ".next",
  "dist",
  "out",
  "node_modules",
]);

const TEXT_FILE = /\.(ts|tsx|js|mjs|css|md|json|py|yml|yaml)$/;

const FORBIDDEN = [
  { name: "Folio", pattern: /\bFolio\b/ },
  { name: "Payload", pattern: /\bPayload\b/ },
  { name: "Cursor Agent", pattern: /Cursor Agent/ },
  { name: "cursoragent", pattern: /cursoragent@/ },
  { name: "@bippyui", pattern: /@bippyui\// },
  { name: "@bippygroup", pattern: /@bippygroup\// },
  { name: "@bippydev", pattern: /@bippydev\// },
];

function listTextFiles(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name) || name === "pnpm-lock.yaml") continue;
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      if (name === "tests") continue;
      listTextFiles(path, acc);
      continue;
    }
    if (TEXT_FILE.test(name)) acc.push(path);
  }
  return acc;
}

describe("source brand and copyright names", () => {
  it("does not ship third-party product names in Bippy UI source", () => {
    const files = listTextFiles(repoRoot);
    expect(files.length).toBeGreaterThan(10);

    const hits: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const rule of FORBIDDEN) {
        if (rule.pattern.test(text)) {
          hits.push(`${file.replace(`${repoRoot}/`, "")}: ${rule.name}`);
        }
      }
    }

    expect(hits).toEqual([]);
  });
});
