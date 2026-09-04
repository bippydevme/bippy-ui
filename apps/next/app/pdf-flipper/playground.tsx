"use client";

import { PdfFlipper, type PdfFlipbookTheme } from "@bippy-ui/pdf-flipper";
import Link from "next/link";
import { useState, type ReactElement } from "react";

const THEMES: { id: PdfFlipbookTheme; label: string }[] = [
  { id: "auto", label: "Auto" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];

const BACKGROUNDS = [
  { id: "stone", label: "Stone", color: "#f5f5f4" },
  { id: "white", label: "White", color: "#ffffff" },
  { id: "cream", label: "Cream", color: "#f6f1e6" },
  { id: "black", label: "Black", color: "#0c0a09" },
  { id: "navy", label: "Navy", color: "#0f172a" },
] as const;

function luminance(hex: string): number {
  const value = hex.replace("#", "");
  if (value.length !== 6) return 1;
  const red = Number.parseInt(value.slice(0, 2), 16) / 255;
  const green = Number.parseInt(value.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(value.slice(4, 6), 16) / 255;
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function PdfFlipperPlayground({ src }: { src: string }): ReactElement {
  const [theme, setTheme] = useState<PdfFlipbookTheme>("auto");
  const [background, setBackground] = useState("#f5f5f4");
  const darkSurface = luminance(background) < 0.45;
  const ink = darkSurface ? "#f5f5f4" : "#1c1917";
  const muted = darkSurface ? "#a8a29e" : "#78716c";
  const chip = darkSurface ? "rgb(255 255 255 / 10%)" : "rgb(28 25 23 / 8%)";
  const preset = BACKGROUNDS.find((item) => item.color === background);
  const controlClass =
    "rounded-full border px-3 py-1 text-sm transition-colors disabled:opacity-100";

  return (
    <div className="min-h-screen" style={{ backgroundColor: background, color: ink }}>
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-8">
        <header className="space-y-4">
          <div className="space-y-1">
            <p
              className="text-sm tracking-wide uppercase"
              style={{ color: muted }}
            >
              <Link href="/" className="hover:underline">
                Bippy UI
              </Link>
              <span aria-hidden="true"> / </span>
              @bippy-ui/pdf-flipper
            </p>
            <h1 className="text-3xl font-semibold">Catalog</h1>
          </div>
          <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
            <fieldset className="space-y-2">
              <legend className="text-xs font-medium tracking-wide uppercase" style={{ color: muted }}>
                Theme
              </legend>
              <div className="flex flex-wrap gap-1.5">
                {THEMES.map((item) => {
                  const selected = theme === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={controlClass}
                      aria-pressed={selected}
                      onClick={() => setTheme(item.id)}
                      style={{
                        borderColor: selected ? ink : "transparent",
                        background: chip,
                        color: ink,
                      }}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <fieldset className="space-y-2">
              <legend className="text-xs font-medium tracking-wide uppercase" style={{ color: muted }}>
                Background
              </legend>
              <div className="flex flex-wrap items-center gap-1.5">
                {BACKGROUNDS.map((item) => {
                  const selected = preset?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={controlClass}
                      aria-pressed={selected}
                      aria-label={item.label}
                      onClick={() => setBackground(item.color)}
                      style={{
                        borderColor: selected ? ink : "transparent",
                        background: chip,
                        color: ink,
                      }}
                    >
                      <span
                        className="mr-2 inline-block size-3 rounded-full border"
                        style={{
                          backgroundColor: item.color,
                          borderColor: darkSurface
                            ? "rgb(255 255 255 / 35%)"
                            : "rgb(28 25 23 / 20%)",
                        }}
                      />
                      {item.label}
                    </button>
                  );
                })}
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="color"
                    value={background}
                    aria-label="Custom background color"
                    onChange={(event) => setBackground(event.target.value)}
                    className="size-8 cursor-pointer rounded-full border-0 bg-transparent p-0"
                  />
                </label>
              </div>
            </fieldset>
          </div>
        </header>
        <PdfFlipper src={src} theme={theme} />
      </main>
    </div>
  );
}
