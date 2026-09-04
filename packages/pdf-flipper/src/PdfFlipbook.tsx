import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type TransitionEvent as ReactTransitionEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  downloadPdfSource,
  enterFitScreen,
  exitFitScreen,
  isElementFullscreen,
  pdfDownloadFileName,
  shareViewerLink,
} from "./chrome-actions";
import { decideFlip } from "./flip-controller";
import { clearGlassPointer, setGlassPointer } from "./glass-pointer";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  FitScreenIcon,
  ShareIcon,
} from "./icons";
import {
  type BookSpread,
  buildSpreads,
  clampPage,
  findSpreadIndex,
  getNextSpreadIndex,
  getReportedPage,
  getSpreadLabel,
  getSpreadLeftPage,
  getSpreadPages,
  getSpreadRightPage,
} from "./navigation";
import { PageCache } from "./page-cache";
import { copyRenderedPage } from "./page-copy";
import { loadPdfDocument, renderPdfPage } from "./pdf-renderer";
import { resolveTheme, type PdfFlipbookTheme } from "./theme";
import { hasToolsPanel, resolveTools, type PdfFlipbookTools } from "./tools";
import type { PdfSource, RenderedPage } from "./types";

export interface PdfFlipbookProps {
  src: PdfSource;
  className?: string;
  initialPage?: number;
  onPageChange?: (page: number, pageCount: number) => void;
  tools?: PdfFlipbookTools;
  fileName?: string;
  theme?: PdfFlipbookTheme;
  workerSrc?: string;
}

export type PdfFlipperProps = PdfFlipbookProps;

export type { PdfFlipbookTheme } from "./theme";
export type { PdfFlipbookTools } from "./tools";

type PdfDocument = Awaited<ReturnType<typeof loadPdfDocument>>;
type LoadState = "loading" | "ready" | "error";
type TurnPhase = "idle" | "dragging" | "settling";
type TurnDirection = -1 | 1;

interface PointerDrag {
  pointerId: number;
  originX: number;
  originTime: number;
  lastX: number;
  lastTime: number;
  progress: number;
  velocity: number;
  direction: TurnDirection | null;
}

interface FlipbookStyle extends CSSProperties {
  "--pdf-flip-progress": number;
  "--pdf-flip-direction": number;
  "--pdf-flip-zoom": number;
  "--pdf-flip-duration": string;
}

const MIN_ZOOM = 75;
const MAX_ZOOM = 150;
const ZOOM_STEP = 25;
const TURN_DURATION_MS = 1100;
const CACHE_CAPACITY = 12;

function getRenderScale(zoom: number): number {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  return (zoom / 100) * pixelRatio;
}

function getCacheKey(page: number, scale: number): string {
  return `${page}@${scale}`;
}

function destroyPdfDocument(document: PdfDocument): Promise<void> {
  return document.loadingTask.destroy();
}

function pagesForSpreads(
  spreads: BookSpread[],
  indexes: number[],
): number[] {
  const pages = new Set<number>();
  for (const index of indexes) {
    const spread = spreads[index];
    if (!spread) continue;
    for (const page of getSpreadPages(spread)) pages.add(page);
  }
  return [...pages].sort((a, b) => a - b);
}

function turningSurface(
  current: BookSpread,
  next: BookSpread,
  direction: TurnDirection,
): {
  left: number | null;
  right: number | null;
  sheetFront: number | null;
  sheetBack: number | null;
} {
  if (direction === 1) {
    return {
      left: getSpreadLeftPage(current),
      right: getSpreadRightPage(next),
      sheetFront: getSpreadRightPage(current),
      sheetBack: getSpreadLeftPage(next),
    };
  }

  return {
    left: getSpreadLeftPage(next),
    right: getSpreadRightPage(current),
    sheetFront: getSpreadLeftPage(current),
    sheetBack: getSpreadRightPage(next),
  };
}

function CanvasPage({
  page,
  className,
}: {
  page: RenderedPage | undefined;
  className: string;
}): ReactElement {
  const hostRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    host.replaceChildren();
    if (page) {
      page.canvas.className = "pdf-flipbook__canvas";
      page.canvas.setAttribute("aria-hidden", "true");
      host.append(page.canvas);
    }

    return () => {
      if (page?.canvas.parentElement === host) page.canvas.remove();
    };
  }, [page]);

  return <div ref={hostRef} className={className} aria-hidden="true" />;
}

function BookLeaf({
  side,
  pageNumber,
  rendered,
}: {
  side: "left" | "right";
  pageNumber: number;
  rendered: RenderedPage | undefined;
}): ReactElement {
  return (
    <div
      className={`pdf-flipbook__leaf pdf-flipbook__leaf--${side}`}
      data-page={pageNumber}
    >
      <CanvasPage className="pdf-flipbook__canvas-host" page={rendered} />
    </div>
  );
}

function GlassLens(): ReactElement {
  return <span className="pdf-flipbook__lens" aria-hidden="true" />;
}

function trackGlassPointer(event: ReactPointerEvent<HTMLElement>): void {
  setGlassPointer(event.currentTarget, event.clientX, event.clientY);
  const target = event.target;
  if (!(target instanceof Element)) return;
  const control = target.closest("button");
  if (
    !(control instanceof HTMLElement) ||
    control === event.currentTarget ||
    !event.currentTarget.contains(control)
  ) {
    return;
  }
  setGlassPointer(control, event.clientX, event.clientY);
}

function leaveGlassPointer(event: ReactPointerEvent<HTMLElement>): void {
  clearGlassPointer(event.currentTarget);
}

export function PdfFlipbook({
  src,
  className,
  initialPage = 1,
  onPageChange,
  tools,
  fileName,
  theme,
  workerSrc,
}: PdfFlipbookProps): ReactElement {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [spreads, setSpreads] = useState<BookSpread[]>([]);
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [renderedPages, setRenderedPages] = useState(
    () => new Map<number, RenderedPage>(),
  );
  const [zoom, setZoom] = useState(100);
  const [phase, setPhase] = useState<TurnPhase>("idle");
  const [direction, setDirection] = useState<TurnDirection | null>(null);
  const [progress, setProgress] = useState(0);

  const cacheRef = useRef(new PageCache<RenderedPage>(CACHE_CAPACITY));
  const documentRef = useRef<PdfDocument | null>(null);
  const renderControllerRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);
  const spreadIndexRef = useRef(spreadIndex);
  const spreadsRef = useRef(spreads);
  const initialPageRef = useRef(initialPage);
  const onPageChangeRef = useRef(onPageChange);
  const turningRef = useRef(false);
  const kickoffTimerRef = useRef<number | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);
  const settleCommitRef = useRef(false);
  const settleDirectionRef = useRef<TurnDirection | null>(null);
  const pointerRef = useRef<PointerDrag | null>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  const [isFitScreen, setIsFitScreen] = useState(false);
  const [chromeNote, setChromeNote] = useState<string | null>(null);
  const chrome = useMemo(() => resolveTools(tools), [tools]);
  const showToolsPanel = hasToolsPanel(chrome);

  useEffect(() => {
    initialPageRef.current = initialPage;
  }, [initialPage]);

  useEffect(() => {
    onPageChangeRef.current = onPageChange;
  }, [onPageChange]);

  useEffect(() => {
    const onFullscreenChange = () => {
      const root = rootRef.current;
      setIsFitScreen(Boolean(root && isElementFullscreen(root)));
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const root = rootRef.current;
      if (!root || !isElementFullscreen(root)) return;
      event.preventDefault();
      void exitFitScreen();
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        onFullscreenChange,
      );
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!chromeNote) return;
    const timer = window.setTimeout(() => setChromeNote(null), 2200);
    return () => window.clearTimeout(timer);
  }, [chromeNote]);

  const clearTurnTimers = useCallback(() => {
    if (kickoffTimerRef.current !== null) {
      window.clearTimeout(kickoffTimerRef.current);
      kickoffTimerRef.current = null;
    }
    if (fallbackTimerRef.current !== null) {
      window.clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  const releasePointer = useCallback(() => {
    const surface = surfaceRef.current;
    const drag = pointerRef.current;
    pointerRef.current = null;
    if (
      surface &&
      drag &&
      surface.hasPointerCapture?.(drag.pointerId)
    ) {
      try {
        surface.releasePointerCapture(drag.pointerId);
      } catch {
        // The browser may have already released capture after pointercancel.
      }
    }
  }, []);

  const cancelTurnResources = useCallback(() => {
    clearTurnTimers();
    releasePointer();
    turningRef.current = false;
    settleCommitRef.current = false;
    settleDirectionRef.current = null;
  }, [clearTurnTimers, releasePointer]);

  const resetTurn = useCallback(() => {
    cancelTurnResources();
    setPhase("idle");
    setDirection(null);
    setProgress(0);
  }, [cancelTurnResources]);

  const finishTurn = useCallback(() => {
    if (!turningRef.current) return;

    clearTurnTimers();
    const shouldCommit = settleCommitRef.current;
    const turnDirection = settleDirectionRef.current;
    if (shouldCommit && turnDirection !== null) {
      const nextIndex = getNextSpreadIndex(
        spreadIndexRef.current,
        spreadsRef.current.length,
        turnDirection,
      );
      if (nextIndex !== spreadIndexRef.current) {
        const nextSpread = spreadsRef.current[nextIndex];
        spreadIndexRef.current = nextIndex;
        setSpreadIndex(nextIndex);
        if (nextSpread) {
          onPageChangeRef.current?.(
            getReportedPage(nextSpread),
            pageCount,
          );
        }
      }
    }
    resetTurn();
  }, [clearTurnTimers, pageCount, resetTurn]);

  const settleTurn = useCallback(
    (
      turnDirection: TurnDirection,
      shouldCommit: boolean,
      targetProgress: number,
    ) => {
      releasePointer();
      turningRef.current = true;
      settleCommitRef.current = shouldCommit;
      settleDirectionRef.current = turnDirection;
      setDirection(turnDirection);
      setPhase("settling");
      setProgress(targetProgress);
      clearTurnTimers();
      fallbackTimerRef.current = window.setTimeout(
        finishTurn,
        TURN_DURATION_MS + 120,
      );
    },
    [clearTurnTimers, finishTurn, releasePointer],
  );

  const requestTurn = useCallback(
    (turnDirection: TurnDirection) => {
      if (
        turningRef.current ||
        loadState !== "ready" ||
        getNextSpreadIndex(
          spreadIndexRef.current,
          spreadsRef.current.length,
          turnDirection,
        ) === spreadIndexRef.current
      ) {
        return;
      }

      turningRef.current = true;
      settleCommitRef.current = true;
      settleDirectionRef.current = turnDirection;
      setDirection(turnDirection);
      setPhase("settling");
      setProgress(0);
      clearTurnTimers();

      kickoffTimerRef.current = window.setTimeout(() => {
        kickoffTimerRef.current = null;
        if (turningRef.current) setProgress(1);
      }, 0);
      fallbackTimerRef.current = window.setTimeout(
        finishTurn,
        TURN_DURATION_MS + 120,
      );
    },
    [clearTurnTimers, finishTurn, loadState],
  );

  const handleFitScreen = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    if (isFitScreen) {
      void exitFitScreen();
      return;
    }
    void enterFitScreen(root).catch(() => {
      setChromeNote("Fullscreen is not available");
    });
  }, [isFitScreen]);

  const handleShare = useCallback(() => {
    void shareViewerLink()
      .then(() => {
        setChromeNote("Link copied");
      })
      .catch(() => {
        setChromeNote("Couldn’t copy the link");
      });
  }, []);

  const handleDownload = useCallback(() => {
    void downloadPdfSource(src, pdfDownloadFileName(src, fileName)).catch(
      () => {
        setChromeNote("Couldn’t download this PDF");
      },
    );
  }, [fileName, src]);

  useEffect(() => {
    const generation = ++generationRef.current;
    const controller = new AbortController();
    let loadedDocument: PdfDocument | null = null;
    let active = true;

    resetTurn();
    cacheRef.current.clear();
    documentRef.current = null;
    setRenderedPages(new Map());
    setLoadState("loading");
    setLoadError(null);
    setPageCount(0);
    setSpreads([]);
    spreadsRef.current = [];
    setSpreadIndex(0);
    spreadIndexRef.current = 0;

    void loadPdfDocument(src, controller.signal, workerSrc)
      .then((document) => {
        if (!active || generation !== generationRef.current) {
          return destroyPdfDocument(document);
        }

        loadedDocument = document;
        documentRef.current = document;
        const nextSpreads = buildSpreads(document.numPages);
        const nextIndex = findSpreadIndex(
          nextSpreads,
          clampPage(initialPageRef.current, document.numPages),
        );
        spreadsRef.current = nextSpreads;
        spreadIndexRef.current = nextIndex;
        setSpreads(nextSpreads);
        setSpreadIndex(nextIndex);
        setPageCount(document.numPages);
        setLoadState("ready");
        return undefined;
      })
      .catch((error: unknown) => {
        if (
          active &&
          generation === generationRef.current &&
          !controller.signal.aborted
        ) {
          setLoadState("error");
          setLoadError(
            error instanceof Error
              ? error.message
              : "The file may be malformed or unsupported.",
          );
        }
      });

    return () => {
      active = false;
      controller.abort();
      renderControllerRef.current?.abort();
      renderControllerRef.current = null;
      cancelTurnResources();
      cacheRef.current.clear();
      if (documentRef.current === loadedDocument) documentRef.current = null;
      if (loadedDocument) {
        void destroyPdfDocument(loadedDocument).catch(() => undefined);
      }
    };
  }, [cancelTurnResources, resetTurn, src, workerSrc]);

  useEffect(() => {
    if (loadState !== "ready" || !documentRef.current || spreads.length === 0) {
      return;
    }

    const generation = generationRef.current;
    const document = documentRef.current;
    const controller = new AbortController();
    renderControllerRef.current = controller;
    const scale = getRenderScale(zoom);
    const pages = pagesForSpreads(spreads, [
      spreadIndex - 1,
      spreadIndex,
      spreadIndex + 1,
    ]);
    let active = true;

    void Promise.all(
      pages.map(async (page) => {
        const cacheKey = getCacheKey(page, scale);
        const cached = cacheRef.current.get(cacheKey);
        if (cached) return [page, cached] as const;

        const rendered = await renderPdfPage(
          document,
          page,
          scale,
          controller.signal,
        );
        if (active && generation === generationRef.current) {
          cacheRef.current.set(cacheKey, rendered);
        }
        return [page, rendered] as const;
      }),
    )
      .then((entries) => {
        if (active && generation === generationRef.current) {
          setRenderedPages(new Map(entries));
        }
      })
      .catch((error: unknown) => {
        if (
          active &&
          generation === generationRef.current &&
          !controller.signal.aborted
        ) {
          setLoadState("error");
          setLoadError(
            error instanceof Error
              ? error.message
              : "The PDF page could not be rendered.",
          );
        }
      });

    return () => {
      active = false;
      controller.abort();
      if (renderControllerRef.current === controller) {
        renderControllerRef.current = null;
      }
    };
  }, [loadState, spreadIndex, spreads, zoom]);

  useEffect(
    () => () => {
      clearTurnTimers();
      releasePointer();
      generationRef.current += 1;
    },
    [clearTurnTimers, releasePointer],
  );

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (
      event.button !== 0 ||
      event.isPrimary === false ||
      pointerRef.current !== null ||
      turningRef.current ||
      loadState !== "ready"
    ) {
      return;
    }

    pointerRef.current = {
      pointerId: event.pointerId,
      originX: event.clientX,
      originTime: event.timeStamp,
      lastX: event.clientX,
      lastTime: event.timeStamp,
      progress: 0,
      velocity: 0,
      direction: null,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      pointerRef.current = null;
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = pointerRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const delta = event.clientX - drag.originX;
    if (delta === 0) return;

    const turnDirection: TurnDirection = delta < 0 ? 1 : -1;
    const isAtBoundary =
      getNextSpreadIndex(
        spreadIndexRef.current,
        spreadsRef.current.length,
        turnDirection,
      ) === spreadIndexRef.current;
    if (isAtBoundary) {
      drag.direction = null;
      drag.progress = 0;
      drag.velocity = 0;
      setDirection(null);
      setPhase("idle");
      setProgress(0);
      return;
    }

    const elapsed = Math.max(event.timeStamp - drag.lastTime, 1);
    drag.velocity = Math.abs(event.clientX - drag.lastX) / elapsed;
    drag.lastX = event.clientX;
    drag.lastTime = event.timeStamp;
    drag.direction = turnDirection;
    const pageWidth = Math.max(event.currentTarget.clientWidth / 2, 1);
    drag.progress = Math.min(Math.abs(delta) / pageWidth, 1);
    turningRef.current = true;
    setDirection(turnDirection);
    setPhase("dragging");
    setProgress(drag.progress);
  };

  const endPointerDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
    cancelled: boolean,
  ) => {
    const drag = pointerRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const turnDirection = drag.direction;
    const elapsed = Math.max(event.timeStamp - drag.originTime, 1);
    const totalVelocity = Math.abs(event.clientX - drag.originX) / elapsed;
    const releaseVelocity = Math.max(drag.velocity, totalVelocity);
    const shouldCommit =
      !cancelled &&
      turnDirection !== null &&
      decideFlip({ progress: drag.progress, velocity: releaseVelocity }) ===
        "commit";

    if (turnDirection === null) {
      resetTurn();
      return;
    }
    settleTurn(turnDirection, shouldCommit, shouldCommit ? 1 : 0);
  };

  const currentSpread = spreads[spreadIndex];
  const targetIndex =
    direction === null
      ? spreadIndex
      : getNextSpreadIndex(spreadIndex, spreads.length, direction);
  const targetSpread = spreads[targetIndex];
  const surface =
    currentSpread && targetSpread && direction !== null
      ? turningSurface(currentSpread, targetSpread, direction)
      : {
          left: currentSpread ? getSpreadLeftPage(currentSpread) : null,
          right: currentSpread ? getSpreadRightPage(currentSpread) : null,
          sheetFront: null,
          sheetBack: null,
        };
  const samplePage =
    renderedPages.get(surface.right ?? surface.left ?? surface.sheetFront ?? 0) ??
    renderedPages.values().next().value;
  const sheetFrontSource =
    surface.sheetFront === null
      ? undefined
      : renderedPages.get(surface.sheetFront);
  const sheetBackSource =
    surface.sheetBack === null
      ? undefined
      : renderedPages.get(surface.sheetBack);
  const sheetFrontCopy = useMemo(
    () => (sheetFrontSource ? copyRenderedPage(sheetFrontSource) : undefined),
    [direction, spreadIndex, sheetFrontSource],
  );
  const sheetBackCopy = useMemo(
    () => (sheetBackSource ? copyRenderedPage(sheetBackSource) : undefined),
    [direction, spreadIndex, sheetBackSource],
  );
  const rootStyle: FlipbookStyle = {
    "--pdf-flip-progress": progress,
    "--pdf-flip-direction": direction ?? 1,
    "--pdf-flip-zoom": zoom / 100,
    "--pdf-flip-duration": `${TURN_DURATION_MS}ms`,
  };
  const chromeTheme = resolveTheme(theme);
  const rootClassName = [
    "pdf-flipbook",
    isFitScreen ? "pdf-flipbook--fit-screen" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");
  const lastSpreadIndex = Math.max(spreads.length - 1, 0);
  const sheetClassName = [
    "pdf-flipbook__sheet",
    direction === -1
      ? "pdf-flipbook__sheet--backward"
      : "pdf-flipbook__sheet--forward",
  ].join(" ");

  const pageLabel =
    loadState === "loading"
      ? "Loading PDF…"
      : loadState === "error"
        ? "PDF unavailable"
        : currentSpread
          ? getSpreadLabel(currentSpread)
          : "";

  return (
    <section
      ref={rootRef}
      className={rootClassName}
      data-theme={chromeTheme}
      style={rootStyle}
      tabIndex={0}
      aria-label="PDF flipbook viewer"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          if (isFitScreen) {
            event.preventDefault();
            void exitFitScreen();
          }
          return;
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          requestTurn(-1);
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          requestTurn(1);
        }
      }}
    >
      <div
        className={[
          "pdf-flipbook__preview",
          chrome.navigation ? "pdf-flipbook__preview--with-nav" : null,
          showToolsPanel ? "pdf-flipbook__preview--with-tools" : null,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {chrome.navigation ? (
          <button
            type="button"
            className="pdf-flipbook__nav pdf-flipbook__nav--prev"
            aria-label="Previous page"
            disabled={
              loadState !== "ready" || spreadIndex <= 0 || turningRef.current
            }
            onPointerMove={trackGlassPointer}
            onPointerLeave={leaveGlassPointer}
            onClick={() => requestTurn(-1)}
          >
            <GlassLens />
            <ChevronLeftIcon />
          </button>
        ) : null}

        {loadState === "loading" && (
          <div className="pdf-flipbook__skeleton" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        )}

        {loadState === "error" && (
          <div className="pdf-flipbook__error" role="alert">
            <strong>Unable to open this PDF.</strong>
            <span>
              {loadError ??
                "The file may be malformed or unsupported. For a remote file, confirm that its server allows cross-origin (CORS) requests."}
            </span>
          </div>
        )}

        {loadState === "ready" && currentSpread && (
          <div className="pdf-flipbook__viewport">
            <div
              ref={surfaceRef}
              className={[
                "pdf-flipbook__stage",
                `pdf-flipbook__stage--${phase}`,
                `pdf-flipbook__stage--${currentSpread.kind}`,
                direction === 1
                  ? "pdf-flipbook__stage--turn-forward"
                  : direction === -1
                    ? "pdf-flipbook__stage--turn-backward"
                    : null,
              ]
                .filter(Boolean)
                .join(" ")}
              style={
                samplePage
                  ? {
                      aspectRatio: `${samplePage.width * 2} / ${samplePage.height}`,
                    }
                  : undefined
              }
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={(event) => endPointerDrag(event, false)}
              onPointerCancel={(event) => endPointerDrag(event, true)}
              onLostPointerCapture={() => {
                if (pointerRef.current && phase === "dragging") resetTurn();
              }}
            >
              {surface.left !== null && (
                <BookLeaf
                  side="left"
                  pageNumber={surface.left}
                  rendered={renderedPages.get(surface.left)}
                />
              )}
              {surface.right !== null && (
                <BookLeaf
                  side="right"
                  pageNumber={surface.right}
                  rendered={renderedPages.get(surface.right)}
                />
              )}
              {direction !== null && (
                <div
                  className={sheetClassName}
                  onTransitionEnd={(
                    event: ReactTransitionEvent<HTMLDivElement>,
                  ) => {
                    if (
                      event.target === event.currentTarget &&
                      event.propertyName === "transform"
                    ) {
                      finishTurn();
                    }
                  }}
                >
                  <div className="pdf-flipbook__sheet-face pdf-flipbook__sheet-front">
                    <CanvasPage
                      className="pdf-flipbook__canvas-host"
                      page={sheetFrontCopy}
                    />
                    <span className="pdf-flipbook__highlight" />
                  </div>
                  <div className="pdf-flipbook__sheet-face pdf-flipbook__sheet-back">
                    <CanvasPage
                      className="pdf-flipbook__canvas-host"
                      page={sheetBackCopy}
                    />
                  </div>
                </div>
              )}
              <span className="pdf-flipbook__cast-shadow" aria-hidden="true" />
            </div>
          </div>
        )}

        {chrome.navigation ? (
          <button
            type="button"
            className="pdf-flipbook__nav pdf-flipbook__nav--next"
            aria-label="Next page"
            disabled={
              loadState !== "ready" ||
              spreadIndex >= lastSpreadIndex ||
              turningRef.current
            }
            onPointerMove={trackGlassPointer}
            onPointerLeave={leaveGlassPointer}
            onClick={() => requestTurn(1)}
          >
            <GlassLens />
            <ChevronRightIcon />
          </button>
        ) : null}

        {showToolsPanel ? (
          <div
            className="pdf-flipbook__tools"
            role="toolbar"
            aria-label="Reader tools"
            onPointerMove={trackGlassPointer}
            onPointerLeave={leaveGlassPointer}
          >
            <GlassLens />
            {chrome.pageLabel ? (
              <div className="pdf-flipbook__page" aria-live="polite">
                {pageLabel}
              </div>
            ) : null}

            {chromeNote ? (
              <div className="pdf-flipbook__note" role="status" aria-live="polite">
                {chromeNote}
              </div>
            ) : null}

            {chrome.pageLabel &&
            (chrome.zoom ||
              chrome.fitScreen ||
              chrome.share ||
              chrome.download) ? (
              <span className="pdf-flipbook__tools-divider" aria-hidden="true" />
            ) : null}

            {chrome.zoom ? (
              <div className="pdf-flipbook__zoom">
                <button
                  type="button"
                  aria-label="Zoom out"
                  disabled={zoom === MIN_ZOOM}
                  onClick={() =>
                    setZoom((value) => Math.max(MIN_ZOOM, value - ZOOM_STEP))
                  }
                >
                  −
                </button>
                <button
                  type="button"
                  aria-label="Reset zoom"
                  onClick={() => setZoom(100)}
                >
                  {zoom}%
                </button>
                <button
                  type="button"
                  aria-label="Zoom in"
                  disabled={zoom === MAX_ZOOM}
                  onClick={() =>
                    setZoom((value) => Math.min(MAX_ZOOM, value + ZOOM_STEP))
                  }
                >
                  +
                </button>
              </div>
            ) : null}

            {chrome.fitScreen || chrome.share || chrome.download ? (
              <span className="pdf-flipbook__tools-divider" aria-hidden="true" />
            ) : null}

            {chrome.fitScreen || chrome.share || chrome.download ? (
              <div className="pdf-flipbook__actions">
                {chrome.fitScreen ? (
                  <button
                    type="button"
                    aria-label={
                      isFitScreen ? "Exit full screen" : "Fit to screen"
                    }
                    aria-pressed={isFitScreen}
                    onClick={handleFitScreen}
                  >
                    <FitScreenIcon />
                  </button>
                ) : null}

                {chrome.share ? (
                  <button
                    type="button"
                    aria-label="Share link"
                    onClick={handleShare}
                  >
                    <ShareIcon />
                  </button>
                ) : null}

                {chrome.download ? (
                  <button
                    type="button"
                    aria-label="Download PDF"
                    onClick={handleDownload}
                  >
                    <DownloadIcon />
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export const PdfFlipper = PdfFlipbook;
