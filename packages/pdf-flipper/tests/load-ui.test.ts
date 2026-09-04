import { describe, expect, it } from "vitest";

import { buildSpreads } from "../src/navigation";
import {
  DEFAULT_SPREAD_ASPECT_RATIO,
  spreadBoxAspectRatio,
  spreadPagesArePainted,
  shouldShimmerPages,
} from "../src/load-ui";

describe("loading UI", () => {
  it("keeps the stage aspect ratio as a two-page spread", () => {
    expect(spreadBoxAspectRatio(612, 792)).toBe("1224 / 792");
    expect(spreadBoxAspectRatio(0, 792)).toBe(DEFAULT_SPREAD_ASPECT_RATIO);
  });

  it("waits until every page on the current spread is painted", () => {
    const spreads = buildSpreads(5);
    const cover = spreads[0];
    const interior = spreads[1];
    const painted = new Map<number, true>([[1, true], [2, true]]);

    expect(spreadPagesArePainted(cover, painted)).toBe(true);
    expect(spreadPagesArePainted(interior, painted)).toBe(false);
    expect(spreadPagesArePainted(interior, new Map([[2, true], [3, true]]))).toBe(
      true,
    );
    expect(spreadPagesArePainted(undefined, painted)).toBe(false);
  });

  it("hides the shimmer until the delay elapses and the spread is not painted", () => {
    expect(
      shouldShimmerPages({
        delayElapsed: false,
        painted: false,
        hasError: false,
      }),
    ).toBe(false);
    expect(
      shouldShimmerPages({
        delayElapsed: true,
        painted: false,
        hasError: false,
      }),
    ).toBe(true);
    expect(
      shouldShimmerPages({
        delayElapsed: true,
        painted: true,
        hasError: false,
      }),
    ).toBe(false);
    expect(
      shouldShimmerPages({
        delayElapsed: true,
        painted: false,
        hasError: true,
      }),
    ).toBe(false);
  });
});
