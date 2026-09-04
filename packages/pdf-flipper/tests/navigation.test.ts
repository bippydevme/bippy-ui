import { describe, expect, it } from "vitest";

import {
  buildSpreads,
  clampPage,
  findSpreadIndex,
  getReportedPage,
  getSpreadLabel,
} from "../src/navigation";
import { decideFlip } from "../src/flip-controller";
import { resolveTheme } from "../src/theme";
import { hasToolsPanel, resolveTools } from "../src/tools";

describe("book navigation", () => {
  it("opens with a right-side cover, interior pairs, and a left-side back cover", () => {
    const spreads = buildSpreads(5);
    expect(spreads).toEqual([
      { kind: "front-cover", page: 1 },
      { kind: "interior", left: 2, right: 3 },
      { kind: "interior", left: 4, right: null },
      { kind: "back-cover", page: 5 },
    ]);
    expect(getSpreadLabel(spreads[0]!)).toBe("Cover");
    expect(getSpreadLabel(spreads[1]!)).toBe("Pages 2–3");
    expect(getReportedPage(spreads[1]!)).toBe(2);
    expect(findSpreadIndex(spreads, 5)).toBe(3);
    expect(clampPage(99, 5)).toBe(5);
  });
});

describe("chrome helpers", () => {
  it("commits a turn when progress or velocity crosses the threshold", () => {
    expect(decideFlip({ progress: 0.5, velocity: 0 })).toBe("commit");
    expect(decideFlip({ progress: 0.2, velocity: 0.65 })).toBe("commit");
    expect(decideFlip({ progress: 0.2, velocity: 0.1 })).toBe("cancel");
  });

  it("resolves theme and tool flags", () => {
    expect(resolveTheme(undefined)).toBe("auto");
    expect(resolveTheme("light")).toBe("light");
    expect(resolveTools(false).navigation).toBe(false);
    expect(resolveTools({ download: false }).download).toBe(false);
    expect(resolveTools({ download: false }).share).toBe(true);
    expect(hasToolsPanel(resolveTools({ navigation: true }))).toBe(true);
    expect(hasToolsPanel(resolveTools(false))).toBe(false);
  });
});
