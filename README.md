# Bippy UI

Publishable React packages under the `@bippy-ui` npm scope.

## `@bippy-ui/pdf-flipper`

```bash
pnpm add @bippy-ui/pdf-flipper
```

```tsx
import { PdfFlipper } from "@bippy-ui/pdf-flipper";

export default function Catalog() {
  return <PdfFlipper src="/catalog.pdf" />;
}
```

`PdfFlipbook` is an alias of `PdfFlipper`. The package ships the PDF.js 6 legacy worker and CSS; the host app should not copy a worker into `public/`.
