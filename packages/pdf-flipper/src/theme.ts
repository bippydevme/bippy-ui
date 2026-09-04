export const PDF_FLIPBOOK_THEMES = ["auto", "light", "dark"] as const;

export type PdfFlipbookTheme = (typeof PDF_FLIPBOOK_THEMES)[number];

export function resolveTheme(
  theme: PdfFlipbookTheme | undefined,
): PdfFlipbookTheme {
  if (theme === undefined) return "auto";

  switch (theme) {
    case "auto":
    case "light":
    case "dark":
      return theme;
    default: {
      const _exhaustive: never = theme;
      return _exhaustive;
    }
  }
}
