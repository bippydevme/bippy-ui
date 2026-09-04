import type { RenderedPage } from "./types";

export function copyRenderedPage(page: RenderedPage): RenderedPage {
  const canvas = document.createElement("canvas");
  canvas.width = page.canvas.width;
  canvas.height = page.canvas.height;
  canvas.className = "pdf-flipbook__canvas";
  canvas.setAttribute("aria-hidden", "true");
  const context = canvas.getContext("2d");
  if (context) context.drawImage(page.canvas, 0, 0);
  return {
    canvas,
    width: page.width,
    height: page.height,
  };
}
