import { readPdfBytes } from "./source";
import type { PdfSource } from "./types";

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

export function pdfDownloadFileName(
  source: PdfSource,
  fileName?: string,
): string {
  const explicit = fileName?.trim();
  if (explicit) {
    return explicit.toLowerCase().endsWith(".pdf")
      ? explicit
      : `${explicit}.pdf`;
  }

  const path =
    typeof source === "string"
      ? source.split("?")[0]?.split("#")[0]
      : source instanceof URL
        ? source.pathname
        : "";
  const last = path.split("/").filter(Boolean).pop();
  if (last?.toLowerCase().endsWith(".pdf")) return last;
  return "document.pdf";
}

export function viewerShareUrl(_shareUrl?: string): string {
  if (typeof window !== "undefined") return window.location.href;
  return "";
}

export async function shareViewerLink(): Promise<"copied"> {
  const url = viewerShareUrl();
  if (!navigator.clipboard?.writeText) {
    throw new Error("Copying the link is not available in this browser.");
  }
  await navigator.clipboard.writeText(url);
  return "copied";
}

export async function downloadPdfBytes(
  bytes: ArrayBuffer | Uint8Array,
  fileName: string,
): Promise<void> {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const copy = new Uint8Array(view.byteLength);
  copy.set(view);
  const blob = new Blob([copy], { type: "application/pdf" });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function downloadPdfSource(
  source: PdfSource,
  fileName: string,
): Promise<void> {
  const bytes = await readPdfBytes(source);
  await downloadPdfBytes(bytes, fileName);
}

export function isElementFullscreen(element: Element): boolean {
  const doc = document as FullscreenDocument;
  return (
    document.fullscreenElement === element ||
    doc.webkitFullscreenElement === element
  );
}

export async function enterFitScreen(element: HTMLElement): Promise<void> {
  const target = element as FullscreenElement;
  const request =
    target.requestFullscreen?.bind(target) ??
    target.webkitRequestFullscreen?.bind(target);
  if (!request) {
    throw new Error("Fullscreen is not supported in this browser.");
  }
  await request();
}

export async function exitFitScreen(): Promise<void> {
  const doc = document as FullscreenDocument;
  const exit =
    document.exitFullscreen?.bind(document) ??
    doc.webkitExitFullscreen?.bind(doc);
  if (exit) await exit();
}
