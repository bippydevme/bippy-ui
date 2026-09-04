import { afterEach, describe, expect, it } from "vitest";

import { installPdfJsMapCompat } from "../src/pdfjs-compat";

describe("pdfjs Map.getOrInsertComputed compat", () => {
  afterEach(() => {
    installPdfJsMapCompat();
  });

  it("polyfills Map and WeakMap when the browser method is missing", () => {
    const mapDescriptor = Object.getOwnPropertyDescriptor(
      Map.prototype,
      "getOrInsertComputed",
    );
    const weakDescriptor = Object.getOwnPropertyDescriptor(
      WeakMap.prototype,
      "getOrInsertComputed",
    );

    if (mapDescriptor?.configurable) {
      delete (Map.prototype as { getOrInsertComputed?: unknown })
        .getOrInsertComputed;
    }
    if (weakDescriptor?.configurable) {
      delete (WeakMap.prototype as { getOrInsertComputed?: unknown })
        .getOrInsertComputed;
    }

    installPdfJsMapCompat();

    const map = new Map<string, number>();
    const created = map.getOrInsertComputed("n", () => 7);
    expect(created).toBe(7);
    expect(map.getOrInsertComputed("n", () => 99)).toBe(7);

    const key = {};
    const weak = new WeakMap<object, string>();
    expect(weak.getOrInsertComputed(key, () => "ok")).toBe("ok");
    expect(weak.getOrInsertComputed(key, () => "nope")).toBe("ok");
  });
});
