'use client';

import React, { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { canonicalPhone } from '../lib/certificatesLookup';
import { sortEventsByLatest, type ClubEvent } from '../lib/clubEvents';
import {
  DISCOVER_GALLERY_FOLDER,
  DISCOVER_GALLERY_MAX_PHOTOS,
  ensureUploadAuth,
  filterFilesWithinLimit,
  uploadClubFile,
  uploadingLabel,
} from '../lib/uploadFile';
import {
  countEventGalleryPhotos,
  filesForEvent,
  galleryStatusLabel,
  isDiscoverGalleryVideo,
  saveDiscoverGalleryFile,
  subscribeDiscoverGalleryFiles,
  type DiscoverGalleryFile,
} from '../lib/discoverGallery';
import GalleryPhoto from './GalleryPhoto';

type ActivityGalleryUploaderProps = {
  uploaderName: string;
  uploaderPhone: string;
  onFiles?: (files: DiscoverGalleryFile[]) => void;
};

function memberUploadError(err: unknown) {
  const raw = err instanceof Error ? err.message : '';
  const code = typeof err === 'object' && err && 'code' in err ? String((err as { code?: string }).code) : '';
  const hay = `${code} ${raw}`.toLowerCase();
  if (hay.includes('permission') || hay.includes('insufficient')) return 'تعذر حفظ الصورة داخل حسابك. أعد المحاولة.';
  if (raw.includes('شهادة')) return 'تعذر رفع الصورة. أعد المحاولة على واي فاي.';
  if (raw && /[\u0600-\u06FF]/.test(raw)) return raw;
  return 'تعذر رفع الصورة. أعد المحاولة.';
}

function sameUploader(file: DiscoverGalleryFile, phone: string) {
  const canonical = canonicalPhone(phone) || phone;
  if (!file.uploaderPhone || !canonical) return false;
  return file.uploaderPhone === canonical || file.uploaderPhone === phone;
}

export default function ActivityGalleryUploader({ uploaderName, uploaderPhone, onFiles }: ActivityGalleryUploaderProps) {
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [files, setFiles] = useState<DiscoverGalleryFile[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [pickedFiles, setPickedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    return onSnapshot(collection(db, 'site_events'), (snap) => {
      const rows = snap.docs.map((row) => {
        const data = row.data() as Partial<ClubEvent>;
        return {
          id: row.id,
          title: String(data.title || '').trim(),
          date: String(data.date || ''),
          location: String(data.location || ''),
          status: String(data.status || ''),
          poster: String(data.poster || ''),
          description: String(data.description || ''),
          createdAt: Number(data.createdAt) || 0,
        };
      }).filter((event) => event.title);
      const sorted = sortEventsByLatest(rows);
      setEvents(sorted);
      setSelectedEventId((current) => current || sorted[0]?.id || '');
    }, (err) => {
      console.error(err);
    });
  }, []);

  const onFilesRef = useRef(onFiles);
  onFilesRef.current = onFiles;

  useEffect(() => {
    let unsubFiles = () => {};
    const unsubAuth = onAuthStateChanged(auth, () => {
      unsubFiles();
      unsubFiles = subscribeDiscoverGalleryFiles(db, (rows) => {
        setFiles(rows);
        onFilesRef.current?.(rows);
      });
    });
    return () => {
      unsubAuth();
      unsubFiles();
    };
  }, []);

  const mine = files.filter((file) => sameUploader(file, uploaderPhone));
  const mineForEvent = filesForEvent(files, selectedEventId).filter((file) => sameUploader(file, uploaderPhone));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const event = events.find((item) => item.id === selectedEventId);
    if (!event) {
      alert('اختر اسم الفعالية أولاً. الأسماء تأتي من قسم الفعاليات.');
      return;
    }
    if (pickedFiles.length === 0) {
      alert('اختر صورة أولاً.');
      return;
    }
    const used = countEventGalleryPhotos([], files, event.id);
    const room = DISCOVER_GALLERY_MAX_PHOTOS - used;
    if (room <= 0) {
      alert(`فعالية ${event.title} وصلت حد ${DISCOVER_GALLERY_MAX_PHOTOS} صورة. الصور المرفوضة ما تحسب من هذا الحد.`);
      return;
    }
    const queue = pickedFiles.slice(0, room);
    const leftOut = pickedFiles.length - queue.length;

    let wakeLock: WakeLockSentinel | null = null;
    try {
      setIsUploading(true);
      setProgress(4);
      try {
        wakeLock = (await navigator.wakeLock?.request('screen')) || null;
      } catch {
        wakeLock = null;
      }
      const existing = await ensureUploadAuth();
      if (!existing) throw new Error('تعذر تثبيت جلسة الرفع. أعد فتح الصفحة وحاول مرة ثانية.');

      const failed: string[] = [];
      let saved = 0;
      for (let i = 0; i < queue.length; i += 1) {
        const file = queue[i];
        try {
          const url = await uploadClubFile(file, DISCOVER_GALLERY_FOLDER, (percent) => {
            setProgress(Math.round(((i + percent / 100) / queue.length) * 100));
          });
          await saveDiscoverGalleryFile(db, {
            eventId: event.id,
            eventTitle: event.title,
            url,
            kind: 'image',
            uploaderName: uploaderName || 'عضو الإعلام',
            uploaderPhone: canonicalPhone(uploaderPhone) || uploaderPhone,
            createdAt: Date.now(),
            status: 'pending',
          });
          saved += 1;
        } catch (err) {
          console.error(err);
          failed.push(`${file.name}: ${memberUploadError(err)}`);
        }
      }
      if (saved > 0) {
        const failedNames = new Set(failed.map((item) => item.split(':')[0]));
        setPickedFiles((current) => current.filter((file) => failedNames.has(file.name)));
      }
      if (saved === 0) throw new Error(failed[0] || 'تعذر رفع الصور. أعد المحاولة.');
      const extra = leftOut > 0 ? ` بقيت ${leftOut} صورة لأن الفعالية وصلت حد ${DISCOVER_GALLERY_MAX_PHOTOS}.` : '';
      alert(
        failed.length
          ? `وصلت ${saved} صورة لاعتماد الإدارة.${extra} تعذر: ${failed.join('، ')}.`
          : `تم رفع ${saved} صورة لفعالية «${event.title}». بانتظار اعتماد الإدارة، والعدد محسوب لك حتى لو انرفضت.${extra}`
      );
    } catch (err: any) {
      console.error(err);
      alert(err?.message || 'تعذر رفع ملفات المعرض.');
    } finally {
      setIsUploading(false);
      setProgress(0);
      void wakeLock?.release().catch(() => undefined);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-8 sm:p-10 border border-purple-200 shadow-xl space-y-6">
      <div className="border-b border-slate-100 pb-4 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">ارفع صور لمعرض الأنشطة</h2>
          <p className="text-xs text-slate-500 mt-1">اختر فعالية من قسم الفعاليات. كل صورة لها حدها، وتجتمع الصور تحت اسم الفعالية. اضغط الصورة للتكبير، واضغط مطولاً لتحميلها.</p>
        </div>
        <span className="px-3.5 py-1.5 rounded-xl bg-purple-100 text-purple-800 font-bold text-xs">
          رفعك: {mine.length}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 bg-purple-50/40 p-6 rounded-2xl border border-purple-200">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">اسم الفعالية</label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-900 font-bold"
            required
          >
            {events.length === 0 ? <option value="">لا توجد فعاليات في قسم الفعاليات بعد</option> : null}
            {events.map((event) => {
              const used = countEventGalleryPhotos([], files, event.id);
              return (
                <option key={event.id} value={event.id}>
                  {event.title} ({used}/{DISCOVER_GALLERY_MAX_PHOTOS})
                </option>
              );
            })}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">صور فقط. كل صورة حدها 8 ميغابايت، وتجتمع تحت اسم الفعالية بحد 50 صورة</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const picked = Array.from(e.target.files || []);
              e.target.value = '';
              if (!picked.length) return;
              const images = picked.filter((file) => file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name));
              if (images.length < picked.length) alert('الرفع للصور فقط.');
              const { accepted, rejected } = filterFilesWithinLimit(images);
              if (rejected.length > 0) alert('بعض الصور أكبر من 8 ميغابايت ولم تُضف.');
              if (accepted.length > 0) setPickedFiles((prev) => [...prev, ...accepted]);
            }}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white cursor-pointer"
          />
        </div>

        {pickedFiles.length > 0 && (
          <div className="space-y-1.5">
            {pickedFiles.map((file, index) => (
              <div key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between gap-2 rounded-xl border border-purple-200 bg-white px-3 py-2">
                <span className="text-[11px] font-bold text-slate-800 truncate">{file.name} · {(file.size / (1024 * 1024)).toFixed(1)} م.ب</span>
                <button type="button" onClick={() => setPickedFiles((prev) => prev.filter((_, itemIndex) => itemIndex !== index))} className="text-[11px] font-black text-red-600">إزالة</button>
              </div>
            ))}
          </div>
        )}

        <button
          type="submit"
          disabled={isUploading || pickedFiles.length === 0 || !selectedEventId}
          className="bg-purple-600 text-white px-8 py-3 rounded-xl font-black text-xs shadow hover:bg-purple-700 disabled:bg-slate-400 cursor-pointer"
        >
          {uploadingLabel(isUploading, progress, 'رفع إلى معرض الأنشطة')}
        </button>
      </form>

      <div className="space-y-3 pt-2 border-t border-slate-100">
        <h3 className="font-black text-slate-900 text-sm">ملفاتك في هذه الفعالية</h3>
        {mineForEvent.length === 0 ? (
          <p className="text-center py-8 text-slate-400 font-bold text-xs bg-slate-50 rounded-2xl">لم ترفع شيئاً في هذه الفعالية بعد.</p>
        ) : (
          <div className="columns-1 sm:columns-2 gap-4">
            {mineForEvent.map((file) => (
              <figure key={file.id} className="mb-4 break-inside-avoid space-y-2">
                {file.kind === 'video' || isDiscoverGalleryVideo(file.url) ? (
                  <video src={file.url} controls className="w-full h-auto rounded-2xl border border-slate-200 bg-slate-950" />
                ) : (
                  <GalleryPhoto src={file.url} alt={file.eventTitle} className="w-full h-auto rounded-2xl border border-slate-200 bg-slate-100" />
                )}
                <span className={`inline-block text-[10px] font-black px-2.5 py-1 rounded-full ${
                  file.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : file.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {galleryStatusLabel(file.status)}
                </span>
              </figure>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
