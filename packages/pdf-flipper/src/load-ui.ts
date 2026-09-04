import { getSpreadPages, type BookSpread } from "./navigation";

export const LOADING_SHIMMER_DELAY_MS = 180;
export const DEFAULT_SPREAD_ASPECT_RATIO = "17 / 11";

export function spreadBoxAspectRatio(
  pageWidth: number,
  pageHeight: number,
): string {
  if (!(pageWidth > 0) || !(pageHeight > 0)) {
    return DEFAULT_SPREAD_ASPECT_RATIO;
  }
  return `${pageWidth * 2} / ${pageHeight}`;
}

export function spreadPagesArePainted(
  spread: BookSpread | undefined,
  renderedPages: ReadonlyMap<number, unknown>,
): boolean {
  if (!spread) return false;
  return getSpreadPages(spread).every((page) => renderedPages.has(page));
}

export function shouldShimmerPages(input: {
  delayElapsed: boolean;
  painted: boolean;
  hasError: boolean;
}): boolean {
  return !input.hasError && !input.painted && input.delayElapsed;
}
