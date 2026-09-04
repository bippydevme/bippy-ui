export function setGlassPointer(
  node: HTMLElement,
  clientX: number,
  clientY: number,
): void {
  const rect = node.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  node.style.setProperty(
    "--pdf-glass-x",
    `${((clientX - rect.left) / rect.width) * 100}%`,
  );
  node.style.setProperty(
    "--pdf-glass-y",
    `${((clientY - rect.top) / rect.height) * 100}%`,
  );
}

export function clearGlassPointer(node: HTMLElement): void {
  node.style.removeProperty("--pdf-glass-x");
  node.style.removeProperty("--pdf-glass-y");
}
