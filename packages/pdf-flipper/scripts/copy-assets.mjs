import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(packageRoot, "dist");

mkdirSync(distDir, { recursive: true });

copyFileSync(join(packageRoot, "src", "styles.css"), join(distDir, "styles.css"));

const pdfjsRoot = dirname(require.resolve("pdfjs-dist/package.json"));
copyFileSync(
  join(pdfjsRoot, "legacy", "build", "pdf.worker.min.mjs"),
  join(distDir, "pdf.worker.min.mjs"),
);

for (const leftover of ["index.css", "index.css.map"]) {
  const path = join(distDir, leftover);
  if (existsSync(path)) rmSync(path);
}

const indexPath = join(distDir, "index.js");
let index = readFileSync(indexPath, "utf8");
index = index.replace(/^(?:['"]use client['"];\s*)+/, "");
const hasCssImport =
  index.includes('import "./styles.css"') ||
  index.includes("import './styles.css'");
index = `"use client";\n${hasCssImport ? "" : 'import "./styles.css";\n'}${index}`;
writeFileSync(indexPath, index);

const required = [
  "index.js",
  "index.d.ts",
  "styles.css",
  "pdf.worker.min.mjs",
];

for (const file of required) {
  const path = join(distDir, file);
  if (!existsSync(path)) {
    throw new Error(`pdf-flipper build did not emit dist/${file}`);
  }
}

index = readFileSync(indexPath, "utf8");
if (!index.startsWith('"use client";') && !index.startsWith("'use client';")) {
  throw new Error('dist/index.js must start with "use client"');
}
if (!index.includes("./styles.css")) {
  throw new Error("dist/index.js must import ./styles.css");
}
if (index.includes("?url")) {
  throw new Error("dist/index.js must not use Vite ?url worker imports");
}
if (
  index.includes('"/pdf.worker.min.mjs"') ||
  index.includes("'/pdf.worker.min.mjs'")
) {
  throw new Error("dist/index.js must not default to /pdf.worker.min.mjs");
}

const worker = readFileSync(join(distDir, "pdf.worker.min.mjs"), "utf8");
if (!worker.includes("Copyright 2024 Mozilla Foundation")) {
  throw new Error(
    "dist/pdf.worker.min.mjs must keep the original PDF.js license header",
  );
}

console.log(
  "pdf-flipper dist ok:",
  required.map((file) => `dist/${file}`).join(", "),
);
