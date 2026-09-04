export const PDF_FLIPBOOK_TOOL_KEYS = [
  "navigation",
  "zoom",
  "pageLabel",
  "fitScreen",
  "share",
  "download",
] as const;

export type PdfFlipbookTool = (typeof PDF_FLIPBOOK_TOOL_KEYS)[number];

export type PdfFlipbookToolFlags = Record<PdfFlipbookTool, boolean>;

export type PdfFlipbookTools = boolean | Partial<PdfFlipbookToolFlags>;

const ALL_ON: PdfFlipbookToolFlags = {
  navigation: true,
  zoom: true,
  pageLabel: true,
  fitScreen: true,
  share: true,
  download: true,
};

const ALL_OFF: PdfFlipbookToolFlags = {
  navigation: false,
  zoom: false,
  pageLabel: false,
  fitScreen: false,
  share: false,
  download: false,
};

export function resolveTools(
  tools: PdfFlipbookTools | undefined,
): PdfFlipbookToolFlags {
  if (tools === false) return { ...ALL_OFF };
  if (tools === true || tools === undefined) return { ...ALL_ON };
  return { ...ALL_ON, ...tools };
}

export function hasToolsPanel(flags: PdfFlipbookToolFlags): boolean {
  return (
    flags.zoom ||
    flags.pageLabel ||
    flags.fitScreen ||
    flags.share ||
    flags.download
  );
}
