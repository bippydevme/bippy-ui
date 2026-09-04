export type PdfSource = string | URL | ArrayBuffer;

export interface RenderedPage {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}
