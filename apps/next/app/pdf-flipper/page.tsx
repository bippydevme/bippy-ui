import { PdfFlipper } from "@bippy-ui/pdf-flipper";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactElement } from "react";

export const metadata: Metadata = {
  title: "Bippy UI — PDF Flipper",
  description: "Demo of @bippy-ui/pdf-flipper",
};

const catalogSrc = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/catalog.pdf`;

export default function PdfFlipperDemoPage(): ReactElement {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="space-y-1">
        <p className="text-sm tracking-wide text-stone-500 uppercase">
          <Link href="/" className="hover:text-stone-800">
            Bippy UI
          </Link>
          <span aria-hidden="true"> / </span>
          @bippy-ui/pdf-flipper
        </p>
        <h1 className="text-3xl font-semibold">Catalog</h1>
      </header>
      <PdfFlipper src={catalogSrc} />
    </main>
  );
}
