'use client';

import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type GalleryPhotoProps = {
  src: string;
  alt: string;
  className?: string;
};

async function downloadPhoto(src: string, alt: string) {
  const name = `${(alt || 'photo').replace(/[^\w\u0600-\u06FF-]+/g, '-').slice(0, 40) || 'photo'}.jpg`;
  try {
    const response = await fetch(src);
    if (!response.ok) throw new Error('download failed');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch {
    window.open(src, '_blank', 'noopener,noreferrer');
  }
}

function usePhotoHold(onOpen: () => void, onDownload: () => void) {
  const holdTimer = useRef<number | null>(null);
  const held = useRef(false);
  const lastDownload = useRef(0);

  const clearHold = () => {
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
  };

  const save = () => {
    const now = Date.now();
    if (now - lastDownload.current < 1200) return;
    lastDownload.current = now;
    onDownload();
  };

  return {
    onPointerDown: () => {
      held.current = false;
      clearHold();
      holdTimer.current = window.setTimeout(() => {
        held.current = true;
        save();
      }, 550);
    },
    onPointerUp: clearHold,
    onPointerLeave: (event: React.PointerEvent) => {
      if (event.pointerType === 'mouse') clearHold();
    },
    onPointerCancel: clearHold,
    onContextMenu: (event: React.MouseEvent) => {
      event.preventDefault();
      held.current = true;
      clearHold();
      save();
    },
    onClick: (event: React.MouseEvent) => {
      event.stopPropagation();
      if (held.current) {
        held.current = false;
        return;
      }
      onOpen();
    },
  };
}

export default function GalleryPhoto({ src, alt, className = '' }: GalleryPhotoProps) {
  const [open, setOpen] = useState(false);
  const thumb = usePhotoHold(() => setOpen(true), () => { void downloadPhoto(src, alt); });
  const zoomed = usePhotoHold(() => undefined, () => { void downloadPhoto(src, alt); });

  return (
    <>
      <button
        type="button"
        className="block w-full cursor-zoom-in"
        style={{ WebkitTouchCallout: 'none' }}
        {...thumb}
      >
        <img src={src} alt={alt} draggable={false} className={className} style={{ WebkitTouchCallout: 'none', userSelect: 'none' }} />
      </button>
      {open && typeof document !== 'undefined'
        ? createPortal(
          <div className="fixed inset-0 z-[500] bg-black/90 flex items-center justify-center p-3" onClick={() => setOpen(false)}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-white/15 text-white font-black"
            >
              ✕
            </button>
            <img
              src={src}
              alt={alt}
              draggable={false}
              className="max-h-[92vh] max-w-[96vw] w-auto h-auto object-contain"
              style={{ WebkitTouchCallout: 'none', userSelect: 'none' }}
              {...zoomed}
            />
          </div>,
          document.body
        )
        : null}
    </>
  );
}
