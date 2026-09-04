import Link from "next/link";
import type { ReactElement } from "react";

export default function HomePage(): ReactElement {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-4 py-16">
      <header className="space-y-2">
        <p className="text-sm tracking-wide text-stone-500 uppercase">@bippy-ui</p>
        <h1 className="text-3xl font-semibold">Bippy UI</h1>
        <p className="text-stone-600">React UI packages. Open a demo:</p>
      </header>
      <ul className="space-y-3">
        <li>
          <Link
            href="/pdf-flipper"
            className="block rounded-2xl border border-stone-200 bg-white px-5 py-4 transition-colors hover:border-stone-400"
          >
            <p className="font-medium">@bippy-ui/pdf-flipper</p>
            <p className="text-sm text-stone-500">
              PDF reader that turns like a bound book
            </p>
          </Link>
        </li>
      </ul>
    </main>
  );
}
