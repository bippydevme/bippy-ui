export type BookSpread =
  | { kind: "front-cover"; page: number }
  | { kind: "interior"; left: number; right: number | null }
  | { kind: "back-cover"; page: number };

export function clampPage(page: number, pageCount: number): number {
  if (pageCount < 1) return 1;
  return Math.min(Math.max(Math.round(page), 1), pageCount);
}

export function getNextPage(
  page: number,
  pageCount: number,
  direction: -1 | 1,
): number {
  return clampPage(page + direction, pageCount);
}

export function buildSpreads(pageCount: number): BookSpread[] {
  if (pageCount < 1) return [];
  if (pageCount === 1) return [{ kind: "front-cover", page: 1 }];

  const spreads: BookSpread[] = [{ kind: "front-cover", page: 1 }];
  const lastInterior = pageCount - 1;
  for (let page = 2; page <= lastInterior; page += 2) {
    spreads.push({
      kind: "interior",
      left: page,
      right: page + 1 <= lastInterior ? page + 1 : null,
    });
  }
  spreads.push({ kind: "back-cover", page: pageCount });
  return spreads;
}

export function getSpreadPages(spread: BookSpread): number[] {
  switch (spread.kind) {
    case "front-cover":
    case "back-cover":
      return [spread.page];
    case "interior":
      return spread.right === null ? [spread.left] : [spread.left, spread.right];
    default: {
      const exhaustive: never = spread;
      return exhaustive;
    }
  }
}

export function getSpreadLeftPage(spread: BookSpread): number | null {
  switch (spread.kind) {
    case "front-cover":
      return null;
    case "back-cover":
      return spread.page;
    case "interior":
      return spread.left;
    default: {
      const exhaustive: never = spread;
      return exhaustive;
    }
  }
}

export function getSpreadRightPage(spread: BookSpread): number | null {
  switch (spread.kind) {
    case "front-cover":
      return spread.page;
    case "back-cover":
      return null;
    case "interior":
      return spread.right;
    default: {
      const exhaustive: never = spread;
      return exhaustive;
    }
  }
}

export function getSpreadLabel(spread: BookSpread): string {
  switch (spread.kind) {
    case "front-cover":
      return "Cover";
    case "back-cover":
      return "Back cover";
    case "interior":
      return spread.right === null
        ? `Page ${spread.left}`
        : `Pages ${spread.left}–${spread.right}`;
    default: {
      const exhaustive: never = spread;
      return exhaustive;
    }
  }
}

export function getReportedPage(spread: BookSpread): number {
  switch (spread.kind) {
    case "front-cover":
    case "back-cover":
      return spread.page;
    case "interior":
      return spread.left;
    default: {
      const exhaustive: never = spread;
      return exhaustive;
    }
  }
}

export function findSpreadIndex(spreads: BookSpread[], page: number): number {
  const index = spreads.findIndex((spread) =>
    getSpreadPages(spread).includes(page),
  );
  return index === -1 ? 0 : index;
}

export function getNextSpreadIndex(
  index: number,
  spreadCount: number,
  direction: -1 | 1,
): number {
  if (spreadCount < 1) return 0;
  return Math.min(Math.max(index + direction, 0), spreadCount - 1);
}
