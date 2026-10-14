'use client';

import { useEffect, useRef, useState } from 'react';
import {
  bindClubNoticeHandler,
  compactNotice,
  inferNoticeKind,
  type ClubNoticeKind,
  type ClubNoticeRequest,
} from '../lib/clubNotice';

type ActiveNotice = ClubNoticeRequest & { resolve: (ok: boolean) => void };

export function ClubNoticeDialog({
  kind,
  title,
  message,
  onClose,
  onConfirm,
}: {
  kind: ClubNoticeKind;
  title?: string;
  message: string;
  onClose: () => void;
  onConfirm?: () => void;
}) {
  const copy = compactNotice(message, kind, title);
  const mark = kind === 'success' ? '✓' : kind === 'error' ? '!' : kind === 'confirm' ? '?' : 'i';

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4" dir="rtl" role="alertdialog" aria-modal="true">
      <button
        type="button"
        aria-label="إغلاق"
        className="absolute inset-0 bg-black/40 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="relative w-full max-w-[17.5rem] overflow-hidden rounded-[1.6rem] bg-white shadow-[0_20px_50px_rgba(99,5,23,0.22)]">
        <div className="h-1 bg-[#F5D061]" />
        <section className="px-5 pt-6 pb-5 text-center space-y-4">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#630517] text-[#F5D061] text-lg font-black">
            {mark}
          </div>
          <div className="space-y-1">
            <h3 className="text-[#630517] text-[1.05rem] font-black leading-snug">{copy.title}</h3>
            {copy.detail ? (
              <p className="text-slate-500 text-sm font-medium leading-7">{copy.detail}</p>
            ) : null}
          </div>
          {kind === 'confirm' ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-full bg-slate-100 text-slate-600 font-black text-xs hover:bg-slate-200 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="flex-1 py-2.5 rounded-full bg-[#630517] text-[#F5D061] font-black text-xs hover:brightness-110 cursor-pointer"
              >
                نعم
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-full bg-[#630517] text-[#F5D061] font-black text-xs hover:brightness-110 cursor-pointer"
            >
              حسنًا
            </button>
          )}
        </section>
      </div>
    </div>
  );
}

export default function ClubNoticeHost() {
  const [active, setActive] = useState<ActiveNotice | null>(null);
  const queueRef = useRef<ActiveNotice[]>([]);

  useEffect(() => {
    const originalAlert = window.alert.bind(window);

    const enqueue = (req: ClubNoticeRequest) =>
      new Promise<boolean>((resolve) => {
        const item = { ...req, resolve };
        setActive((current) => {
          if (current) {
            queueRef.current.push(item);
            return current;
          }
          return item;
        });
      });

    bindClubNoticeHandler(enqueue);
    window.alert = (message?: any) => {
      const text = String(message ?? '');
      void enqueue({ message: text, kind: inferNoticeKind(text) });
    };

    return () => {
      window.alert = originalAlert;
      bindClubNoticeHandler(null);
    };
  }, []);

  const finish = (ok: boolean) => {
    setActive((current) => {
      current?.resolve(ok);
      return queueRef.current.shift() ?? null;
    });
  };

  if (!active) return null;

  return (
    <ClubNoticeDialog
      kind={active.kind}
      title={active.title}
      message={active.message}
      onClose={() => finish(active.kind === 'confirm' ? false : true)}
      onConfirm={active.kind === 'confirm' ? () => finish(true) : undefined}
    />
  );
}
