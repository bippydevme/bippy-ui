import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: false,
  splitting: false,
  target: "es2022",
  outExtension() {
    return { js: ".js" };
  },
  external: [
    "react",
    "react-dom",
    "react/jsx-runtime",
    "react/jsx-dev-runtime",
    /^pdfjs-dist/,
  ],
  esbuildOptions(options) {
    options.banner = { js: '"use client";' };
    options.plugins = [
      ...(options.plugins ?? []),
      {
        name: "external-package-css",
        setup(build) {
          build.onResolve({ filter: /\.css$/ }, (args) => ({
            path: args.path,
            external: true,
          }));
        },
      },
    ];
  },
});
