// PDF.js 6's modern build requires Map.getOrInsertComputed, which some
// current browsers still lack. Import a polyfill, then the legacy build.
import "./pdfjs-compat";
import {
  getDocument,
  GlobalWorkerOptions,
  version as pdfjsVersion,
  type PDFDocumentProxy,
} from "pdfjs-dist/legacy/build/pdf.mjs";

import { readPdfBytes } from "./source";
import type { PdfSource, RenderedPage } from "./types";
import { resolvePdfWorkerSrc } from "./worker";

export function applyPdfWorkerSrc(workerSrc?: string): void {
  GlobalWorkerOptions.workerSrc = resolvePdfWorkerSrc({
    workerSrc,
    pdfjsVersion,
  });
}

function getAbortReason(signal: AbortSignal): unknown {
  return (
    signal.reason ??
    new DOMException("The PDF document load was aborted.", "AbortError")
  );
}

function getRenderAbortReason(signal: AbortSignal): unknown {
  return (
    signal.reason ??
    new DOMException("The PDF page render was aborted.", "AbortError")
  );
}

export async function loadPdfDocument(
  source: PdfSource,
  signal?: AbortSignal,
  workerSrc?: string,
): Promise<PDFDocumentProxy> {
  applyPdfWorkerSrc(workerSrc);
  const data = await readPdfBytes(source, signal);
  if (signal?.aborted) throw getAbortReason(signal);

  const loadingTask = getDocument({ data });

  if (!signal) return loadingTask.promise;

  let abort: (() => void) | undefined;
  const abortPromise = new Promise<never>((_, reject) => {
    abort = () => {
      const reason = getAbortReason(signal);
      void loadingTask.destroy().then(
        () => reject(reason),
        () => reject(reason),
      );
    };

    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
  });

  try {
    const documentPromise = loadingTask.promise.then(
      (document) => (signal.aborted ? abortPromise : document),
      (error: unknown) => {
        if (signal.aborted) return abortPromise;
        throw error;
      },
    );
    return await Promise.race([documentPromise, abortPromise]);
  } catch (error) {
    if (!signal.aborted) {
      await loadingTask.destroy().catch(() => undefined);
    }
    throw error;
  } finally {
    if (abort) signal.removeEventListener("abort", abort);
  }
}

export async function readPdfPageMetrics(
  document: PDFDocumentProxy,
  pageNumber: number,
  signal?: AbortSignal,
): Promise<{ width: number; height: number }> {
  const page = await document.getPage(pageNumber);
  try {
    if (signal?.aborted) throw getRenderAbortReason(signal);
    const viewport = page.getViewport({ scale: 1 });
    return { width: viewport.width, height: viewport.height };
  } finally {
    page.cleanup();
  }
}

export async function renderPdfPage(
  document: PDFDocumentProxy,
  pageNumber: number,
  scale: number,
  signal?: AbortSignal,
): Promise<RenderedPage> {
  const page = await document.getPage(pageNumber);
  if (signal?.aborted) {
    page.cleanup();
    throw getRenderAbortReason(signal);
  }

  let removeAbortListener: (() => void) | undefined;
  try {
    const viewport = page.getViewport({ scale });
    const canvas = window.document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) throw new Error("Unable to create a 2D canvas context");

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const renderTask = page.render({
      canvas,
      canvasContext: context,
      viewport,
    });
    if (signal) {
      const abort = () => {
        renderTask.cancel();
      };
      signal.addEventListener("abort", abort, { once: true });
      removeAbortListener = () => signal.removeEventListener("abort", abort);
      if (signal.aborted) abort();
    }
    await renderTask.promise;

    return {
      canvas,
      width: viewport.width,
      height: viewport.height,
    };
  } finally {
    removeAbortListener?.();
    page.cleanup();
  }
}
