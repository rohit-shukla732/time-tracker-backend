'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

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

      <div className="relative flex-1 min-h-0 flex items-center justify-center pb-10">
        {screenshots.length > 1 && (
          <>
            <button
              onClick={e => { e.stopPropagation(); onNavigate(index - 1); }}
              disabled={index === 0}
              aria-label="Previous screenshot"
              className={`${navBtn} left-4 sm:left-8`}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); onNavigate(index + 1); }}
              disabled={index === screenshots.length - 1}
              aria-label="Next screenshot"
              className={`${navBtn} right-4 sm:right-8`}
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}

        <div
          className="relative w-full h-full max-w-5xl mx-16 sm:mx-24"
          onClick={e => e.stopPropagation()}
        >
          <Image
            src={shot.url}
            alt={shot.filename}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 1024px"
            className="object-contain"
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
