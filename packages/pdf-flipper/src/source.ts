import type { PdfSource } from "./types";

export type PdfOpenKind = "missing" | "cors" | "invalid";

export class PdfOpenError extends Error {
  readonly kind: PdfOpenKind;

  constructor(kind: PdfOpenKind, message: string) {
    super(message);
    this.name = "PdfOpenError";
    this.kind = kind;
  }
}

function abortError(signal?: AbortSignal): DOMException {
  return signal?.reason instanceof DOMException
    ? signal.reason
    : new DOMException("The PDF document load was aborted.", "AbortError");
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function normalizePdfSource(source: PdfSource): string | Uint8Array {
  if (typeof source === "string") return source;
  if (source instanceof URL) return source.toString();
  if (source instanceof ArrayBuffer) return new Uint8Array(source.slice(0));

  throw new TypeError("Unsupported PDF source");
}

export async function readPdfBytes(
  source: PdfSource,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  if (signal?.aborted) throw abortError(signal);

  if (source instanceof ArrayBuffer) {
    return new Uint8Array(source.slice(0));
  }

  const url = typeof source === "string" ? source : source.toString();
  let response: Response;
  try {
    response = await fetch(url, { signal });
  } catch (error) {
    if (isAbortError(error) || signal?.aborted) throw error;
    throw new PdfOpenError(
      "cors",
      `Could not fetch this PDF from ${url}. If it is a remote file, the server must allow cross-origin (CORS) requests.`,
    );
  }

  if (response.status === 404) {
    throw new PdfOpenError(
      "missing",
      `Could not find ${url}. Put the PDF in your app's public folder, or pass an ArrayBuffer.`,
    );
  }

  if (!response.ok) {
    throw new PdfOpenError(
      "invalid",
      `The PDF request failed (${response.status}).`,
    );
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (
    bytes.byteLength < 5 ||
    String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3], bytes[4]) !==
      "%PDF-"
  ) {
    throw new PdfOpenError("invalid", "The file is not a valid PDF.");
  }

  return bytes;
}
