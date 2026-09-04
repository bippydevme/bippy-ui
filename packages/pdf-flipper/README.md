# @bippy-ui/pdf-flipper

React PDF reader that opens like a bound book: cover on the right, interior pages in left/right pairs, back cover on the left.

[![npm](https://img.shields.io/npm/v/@bippy-ui/pdf-flipper?color=111&label=npm)](https://www.npmjs.com/package/@bippy-ui/pdf-flipper)
[![license](https://img.shields.io/npm/l/@bippy-ui/pdf-flipper?color=111)](https://github.com/bippydevme/bippy-ui/blob/main/LICENSE)
[![react](https://img.shields.io/badge/react-18%20%7C%2019-111)](https://react.dev)

CSS, TypeScript types, and the PDF.js 6 **legacy** worker ship with the package. The host app does not install `pdfjs-dist` and does not copy a worker into `public/`.

## Installation

```bash
pnpm add @bippy-ui/pdf-flipper
```

```bash
npm install @bippy-ui/pdf-flipper
```

```bash
yarn add @bippy-ui/pdf-flipper
```

Peer dependencies: `react` and `react-dom` `^18 || ^19`.

## Quick start

Put a PDF in the app `public/` folder, then render:

```tsx
import { PdfFlipper } from "@bippy-ui/pdf-flipper";

export default function Catalog() {
  return <PdfFlipper src="/catalog.pdf" />;
}
```

`PdfFlipbook` is an alias of `PdfFlipper`. Styles load from the package entry. Next.js App Router can import this from a server page — the entry is marked `"use client"`.

## Features

- Spread layout with a turning sheet, drag-to-flip, and arrow keys
- Liquid-glass toolbar: zoom, fit to screen, share, download
- `theme` follows the system, or locks to light / dark
- CSS variables for chrome color without a theme provider
- Worker resolved from the bundled file, then jsDelivr, then an optional `workerSrc`

## Compatibility

| Environment | Status |
| --- | --- |
| Next.js App Router + TypeScript | Supported |
| Vite + React | Expected to work; pass `workerSrc` if the worker fails to load |
| Astro + `@astrojs/react` | Use a client island (`client:only="react"`) |
| Create React App | Not recommended |
| React Native / server-only components | Not supported |

This is a **DOM client** component. It needs `window`, `document`, and `canvas`.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `src` | `string \| URL \| ArrayBuffer` | — | **Required.** PDF URL, `URL` object, or in-memory bytes. Remote URLs must allow CORS. |
| `className` | `string` | — | Extra class on the root `.pdf-flipbook` element. |
| `initialPage` | `number` | `1` | One-based page to open. Clamped after the document loads. |
| `onPageChange` | `(page: number, pageCount: number) => void` | — | Fires after a committed page turn. `page` is the reported page for the spread (cover, left interior page, or back cover). |
| `tools` | `boolean \| Partial<PdfFlipbookToolFlags>` | `true` | Reader chrome. `false` hides every control. `true` (or omit) shows all. A flags object merges onto the defaults. |
| `fileName` | `string` | from `src`, else `document.pdf` | Filename used by **Download PDF**. A missing `.pdf` suffix is appended. |
| `theme` | `"auto" \| "light" \| "dark"` | `"auto"` | Chrome palette. `auto` follows `prefers-color-scheme`. Set `light` or `dark` when the host page should not follow the OS. |
| `workerSrc` | `string` | bundled worker, then jsDelivr | Absolute URL to a PDF.js **legacy** worker. Use this if the bundler rewrites `import.meta.url` and the worker 404s. |

### `tools` flags

Defaults are all `true`. Passing `{ download: false }` keeps the rest on.

| Flag | Type | Default | Description |
| --- | --- | --- | --- |
| `navigation` | `boolean` | `true` | Previous / next orbs beside the book. |
| `zoom` | `boolean` | `true` | Zoom out, reset, zoom in (`75%`–`150%`, step `25%`). |
| `pageLabel` | `boolean` | `true` | Cover / page range label on the toolbar. |
| `fitScreen` | `boolean` | `true` | Fullscreen. <kbd>Esc</kbd> exits. |
| `share` | `boolean` | `true` | Copies `window.location.href` to the clipboard. |
| `download` | `boolean` | `true` | Downloads the current PDF. |

```tsx
<PdfFlipper
  src="/catalog.pdf"
  fileName="Spring catalog.pdf"
  theme="light"
  initialPage={1}
  tools={{ share: true, download: true, fitScreen: true }}
  onPageChange={(page, pageCount) => {
    console.log(page, pageCount);
  }}
/>
```

Hide chrome entirely:

```tsx
<PdfFlipper src="/catalog.pdf" tools={false} />
```

### Local file

`src` accepts an `ArrayBuffer`, so a file picker never has to upload:

```tsx
const bytes = await file.arrayBuffer();
<PdfFlipper src={bytes} fileName={file.name} />
```

## Theme tokens

Set `--pdf-chrome-*` on the root (or via `className`). Pair custom tokens with `theme="light"` or `theme="dark"` so `auto` does not overwrite them from the system color scheme.

| Token | Role |
| --- | --- |
| `--pdf-chrome-fill` | Frosted plate |
| `--pdf-chrome-rim` | Outer hairline |
| `--pdf-chrome-outer` | Extra ring |
| `--pdf-chrome-inner` | Inner specular stroke |
| `--pdf-chrome-sheen` / `--pdf-chrome-sheen-wash` | Top highlight |
| `--pdf-chrome-shadow` | Plate shadow |
| `--pdf-chrome-ink` | Icons and labels |
| `--pdf-chrome-icon-halo` | Icon contrast halo |
| `--pdf-chrome-chip` | Page label plate |
| `--pdf-chrome-control` | Icon button fill |
| `--pdf-chrome-control-hover` | Hover fill |
| `--pdf-chrome-control-rim` | Control hairline |
| `--pdf-chrome-divider` | Toolbar dividers |
| `--pdf-chrome-note-fill` / `--pdf-chrome-note-ink` | Status toast |

```css
.pdf-flipper-host {
  --pdf-chrome-ink: #1a1a16;
  --pdf-chrome-fill: rgb(255 255 255 / 20%);
}
```

```tsx
<PdfFlipper className="pdf-flipper-host" theme="light" src="/catalog.pdf" />
```

## Keyboard

The root is focusable (`tabIndex={0}`).

| Key | Action |
| --- | --- |
| <kbd>ArrowRight</kbd> | Next spread |
| <kbd>ArrowLeft</kbd> | Previous spread |
| <kbd>Esc</kbd> | Exit fullscreen |

Pointer: drag a page to turn. Side orbs also turn.

## Worker

Do not copy `pdf.worker.min.mjs` into the app `public/` folder. Resolution order:

1. `workerSrc` when provided
2. `new URL("./pdf.worker.min.mjs", import.meta.url)` when that URL is `http:` / `https:`
3. jsDelivr `pdfjs-dist` **legacy** worker matching the installed PDF.js version

Never import the worker with Vite `?url`. Never default to `/pdf.worker.min.mjs`.

```tsx
<PdfFlipper
  src="/catalog.pdf"
  workerSrc="https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/legacy/build/pdf.worker.min.mjs"
/>
```

## Exports

| Name | Kind |
| --- | --- |
| `PdfFlipper` | Component |
| `PdfFlipbook` | Alias of `PdfFlipper` |
| `PdfFlipperProps` / `PdfFlipbookProps` | Props type |
| `PdfSource` | `string \| URL \| ArrayBuffer` |
| `PdfFlipbookTheme` | `"auto" \| "light" \| "dark"` |
| `PdfFlipbookTools` / `PdfFlipbookToolFlags` / `PdfFlipbookTool` | Toolbar types |
| `PdfOpenError` | Thrown when a URL source cannot be opened (`kind`: `"missing" \| "cors" \| "invalid"`) |

## License

MIT. The published tarball includes the PDF.js 6 legacy worker (Apache-2.0, Mozilla Foundation). See `NOTICE`.
