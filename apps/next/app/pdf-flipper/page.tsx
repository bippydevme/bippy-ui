import type { Metadata } from "next";
import type { ReactElement } from "react";

import { PdfFlipperPlayground } from "./playground";

export const metadata: Metadata = {
  title: "Bippy UI — PDF Flipper",
  description: "Demo of @bippy-ui/pdf-flipper",
};

const catalogSrc = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/catalog.pdf`;

export default function PdfFlipperDemoPage(): ReactElement {
  return <PdfFlipperPlayground src={catalogSrc} />;
}
