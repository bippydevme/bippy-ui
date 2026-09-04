export const PDFJS_WORKER_FILE = "pdf.worker.min.mjs";
export const DEFAULT_PDFJS_VERSION = "6.3.289";

export interface ResolvePdfWorkerSrcOptions {
  workerSrc?: string;
  metaUrl?: string;
  pdfjsVersion?: string;
}

export function jsDelivrPdfWorkerSrc(
  version: string = DEFAULT_PDFJS_VERSION,
): string {
  return `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/legacy/build/${PDFJS_WORKER_FILE}`;
}

function isBrowserFetchable(url: URL): boolean {
  return url.protocol === "http:" || url.protocol === "https:";
}

export function bundledPdfWorkerSrc(metaUrl: string): string | null {
  try {
    const workerFileName = `./${PDFJS_WORKER_FILE}`;
    const url = new URL(workerFileName, metaUrl);
    if (!isBrowserFetchable(url)) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function resolvePdfWorkerSrc(
  options: ResolvePdfWorkerSrcOptions = {},
): string {
  const explicit = options.workerSrc?.trim();
  if (explicit) return explicit;

  const bundled = bundledPdfWorkerSrc(options.metaUrl ?? import.meta.url);
  if (bundled) return bundled;

  return jsDelivrPdfWorkerSrc(options.pdfjsVersion ?? DEFAULT_PDFJS_VERSION);
}
