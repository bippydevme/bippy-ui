import { PdfFlipper } from "@bippy-ui/pdf-flipper";
import type { ReactElement } from "react";

const catalogSrc = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/catalog.pdf`;

export default function HomePage(): ReactElement {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="space-y-1">
        <p className="text-sm tracking-wide text-stone-500 uppercase">
          @bippy-ui/pdf-flipper
        </p>
        <h1 className="text-3xl font-semibold">Catalog</h1>
      </header>
      <PdfFlipper src={catalogSrc} />
    </main>
  );
}
