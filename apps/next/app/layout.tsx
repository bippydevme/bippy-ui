import type { Metadata } from "next";
import type { ReactElement, ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "Bippy UI — PDF Flipper",
  description: "Demo of @bippy-ui/pdf-flipper",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>): ReactElement {
  return (
    <html lang="en">
      <body className="min-h-screen bg-stone-100 text-stone-900 antialiased">
        {children}
      </body>
    </html>
  );
}
