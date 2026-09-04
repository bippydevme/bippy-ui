# Bippy UI

React UI packages under the [`@bippy-ui`](https://www.npmjs.com/org/bippy-ui) scope.

[![npm](https://img.shields.io/npm/v/@bippy-ui/pdf-flipper?color=111&label=@bippy-ui/pdf-flipper)](https://www.npmjs.com/package/@bippy-ui/pdf-flipper)
[![license](https://img.shields.io/github/license/bippydevme/bippy-ui?color=111)](./LICENSE)

## Packages

| Package | Description | Install |
| --- | --- | --- |
| [`@bippy-ui/pdf-flipper`](./packages/pdf-flipper) | PDF reader that turns like a bound book | `pnpm add @bippy-ui/pdf-flipper` |

## `@bippy-ui/pdf-flipper`

Spread layout, drag-to-flip, liquid-glass chrome. CSS and the PDF.js 6 legacy worker are bundled — do not copy a worker into `public/`.

### Installation

```bash
pnpm add @bippy-ui/pdf-flipper
```

```bash
npm install @bippy-ui/pdf-flipper
```

```bash
yarn add @bippy-ui/pdf-flipper
```

Requires `react` and `react-dom` `^18 || ^19`.

### Quick start

```tsx
import { PdfFlipper } from "@bippy-ui/pdf-flipper";

export default function Catalog() {
  return <PdfFlipper src="/catalog.pdf" />;
}
```

`PdfFlipbook` is an alias of `PdfFlipper`. Next.js App Router can import this from a server page; the package entry is `"use client"`.

### Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `src` | `string \| URL \| ArrayBuffer` | — | **Required.** PDF URL, `URL`, or `ArrayBuffer`. Remote URLs need CORS. |
| `className` | `string` | — | Class on the root `.pdf-flipbook` element. |
| `initialPage` | `number` | `1` | One-based page to open. Clamped after load. |
| `onPageChange` | `(page: number, pageCount: number) => void` | — | After a committed turn. |
| `tools` | `boolean \| Partial<PdfFlipbookToolFlags>` | `true` | `false` hides all chrome. A flags object merges onto all-on defaults. |
| `fileName` | `string` | from `src`, else `document.pdf` | Download filename. |
| `theme` | `"auto" \| "light" \| "dark"` | `"auto"` | Chrome palette. `auto` follows `prefers-color-scheme`. |
| `workerSrc` | `string` | bundled, then jsDelivr | Optional PDF.js **legacy** worker URL. |

### `tools` flags

| Flag | Default | Description |
| --- | --- | --- |
| `navigation` | `true` | Previous / next orbs |
| `zoom` | `true` | 75%–150% |
| `pageLabel` | `true` | Cover / page range |
| `fitScreen` | `true` | Fullscreen (<kbd>Esc</kbd> exits) |
| `share` | `true` | Copy current URL |
| `download` | `true` | Download PDF |

```tsx
<PdfFlipper
  src="/catalog.pdf"
  fileName="Spring catalog.pdf"
  theme="light"
  tools={{ share: true, download: true, fitScreen: true }}
/>
```

### Compatibility

| Environment | Status |
| --- | --- |
| Next.js App Router + TypeScript | Supported |
| Vite + React | Expected to work; pass `workerSrc` if needed |
| Astro + React | Client island (`client:only="react"`) |
| Create React App | Not recommended |
| React Native | Not supported |

Full API, theme tokens, keyboard map, and worker notes: [`packages/pdf-flipper/README.md`](./packages/pdf-flipper/README.md).

## Development

```bash
pnpm install
pnpm --filter @bippy-ui/pdf-flipper test
pnpm --filter @bippy-ui/pdf-flipper build
pnpm --filter next-app dev
```

Demo app: `apps/next` (`<PdfFlipper src="/catalog.pdf" />`).

## License

MIT © [bippydevme](https://github.com/bippydevme)
