'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, RefreshCw } from 'lucide-react';

interface LightboxScreenshot {
  id: string;
  url: string;
  filename: string;
}

interface ScreenshotLightboxProps {
  screenshots: LightboxScreenshot[];
  index: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

const navBtn =
  'absolute top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60';

const toolBtn =
  'p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60';

const MIN_SCALE = 1;
const MAX_SCALE = 6;
const ZOOM_STEP = 0.5;

// Inner stage keyed by screenshot index so view state resets naturally on nav.
function LightboxStage({ shot }: { shot: LightboxScreenshot }) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; offX: number; offY: number } | null>(null);

  const resetView = () => {
    setScale(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  const zoomIn = () => setScale((s) => Math.min(MAX_SCALE, s + ZOOM_STEP));

  const zoomOut = () =>
    setScale((s) => {
      const next = Math.max(MIN_SCALE, s - ZOOM_STEP);
      if (next === MIN_SCALE) setOffset({ x: 0, y: 0 });
      return next;
    });

  const handlePointerDown = (e: React.PointerEvent) => {
    if (scale <= 1) return;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      offX: offset.x,
      offY: offset.y,
    };
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || scale <= 1) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset({ x: dragRef.current.offX + dx, y: dragRef.current.offY + dy });
  };

  const handlePointerUp = () => {
    dragRef.current = null;
    setIsDragging(false);
  };

  return (
    <div
      className="relative w-full h-full max-w-5xl overflow-hidden flex items-center justify-center"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ cursor: scale > 1 ? 'grab' : 'default' }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={shot.url}
        alt={shot.filename}
        draggable={false}
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${scale})`,
          transition: isDragging ? 'none' : 'transform 0.2s ease',
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          touchAction: 'none',
          userSelect: 'none',
        }}
        className="select-none"
      />
      {/* Toolbar overlayed on the stage */}
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-full px-3 py-2 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={zoomIn} aria-label="Zoom in" title="Zoom in (+)" className={toolBtn}>
          <ZoomIn className="h-5 w-5" />
        </button>
        <button onClick={zoomOut} aria-label="Zoom out" title="Zoom out (-)" className={toolBtn}>
          <ZoomOut className="h-5 w-5" />
        </button>
        <button
          onClick={() => setRotation((r) => (r + 90) % 360)}
          aria-label="Rotate image"
          title="Rotate 90°"
          className={toolBtn}
        >
          <RotateCw className="h-5 w-5" />
        </button>
        <button
          onClick={resetView}
          aria-label="Reset view"
          title="Reset view (0)"
          className={toolBtn}
          disabled={scale === 1 && rotation === 0}
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

export function ScreenshotLightbox({
  screenshots,
  index,
  onClose,
  onNavigate,
}: ScreenshotLightboxProps) {
  useEffect(() => {
    if (index === null) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && index > 0) onNavigate(index - 1);
      if (e.key === 'ArrowRight' && index < screenshots.length - 1) onNavigate(index + 1);
    };

    window.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [index, screenshots.length, onClose, onNavigate]);

  if (index === null) return null;

  const shot = screenshots[index];
  if (!shot) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Screenshot viewer: ${shot.filename}`}
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col"
      onClick={onClose}
    >
      <div className="flex items-start justify-between px-6 py-4 text-white shrink-0">
        <div className="min-w-0 mr-4">
          <p className="text-[14px] font-medium truncate">{shot.filename}</p>
          <p className="text-[12px] text-white/60 mt-0.5">
            {index + 1} / {screenshots.length}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close screenshot viewer"
          className="p-2 rounded-full hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative flex-1 min-h-0 flex items-center justify-center pb-4">
        {screenshots.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onNavigate(index - 1); }}
              disabled={index === 0}
              aria-label="Previous screenshot"
              className={`${navBtn} left-4 sm:left-8`}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onNavigate(index + 1); }}
              disabled={index === screenshots.length - 1}
              aria-label="Next screenshot"
              className={`${navBtn} right-4 sm:right-8`}
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}

        <LightboxStage key={shot.id} shot={shot} />
      </div>
    </div>,
    document.body
  );
}
