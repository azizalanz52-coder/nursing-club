'use client';

import React, { useEffect, useRef, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { sortEventsByLatest, type ClubEvent } from '../lib/clubEvents';
import {
  canClearRejectedGalleryFile,
  clearRejectedGalleryFile,
  filesForEvent,
  galleryStatusLabel,
  isDiscoverGalleryVideo,
  isGalleryFileCleared,
  rejectedClearWaitLabel,
  setDiscoverGalleryFileStatus,
  stampGalleryRejection,
  subscribeDiscoverGalleryFiles,
  type DiscoverGalleryFile,
  type GalleryReviewStatus,
} from '../lib/discoverGallery';
import GalleryPhoto from './GalleryPhoto';

const FILTERS: Array<{ id: 'all' | GalleryReviewStatus; label: string }> = [
  { id: 'pending', label: 'بانتظار الاعتماد' },
  { id: 'approved', label: 'المعتمدة' },
  { id: 'rejected', label: 'المرفوضة' },
  { id: 'all', label: 'الكل' },
];

export default function MediaGalleryReview() {
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [files, setFiles] = useState<DiscoverGalleryFile[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [filter, setFilter] = useState<'all' | GalleryReviewStatus>('pending');
  const [busyId, setBusyId] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const stampedRejections = useRef(new Set<string>());

  useEffect(() => {
    return onSnapshot(collection(db, 'site_events'), (snap) => {
      const rows = sortEventsByLatest(snap.docs.map((row) => {
        const data = row.data() as Partial<ClubEvent>;
        return {
          id: row.id,
          title: String(data.title || 'فعالية').trim(),
          date: String(data.date || ''),
          location: String(data.location || ''),
          status: String(data.status || ''),
          poster: String(data.poster || ''),
          description: String(data.description || ''),
          createdAt: Number(data.createdAt) || 0,
        };
      }).filter((event) => event.title));
      setEvents(rows);
      setSelectedId((current) => current || rows[0]?.id || '');
    });
  }, []);

  useEffect(() => subscribeDiscoverGalleryFiles(db, setFiles), []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const missing = files.filter((file) => file.status === 'rejected' && !file.rejectedAt && !file.clearedAt && !stampedRejections.current.has(file.id));
    if (!missing.length) return;
    missing.forEach((file) => stampedRejections.current.add(file.id));
    void Promise.all(missing.map((file) => stampGalleryRejection(db, file.id))).catch(() => {
      missing.forEach((file) => stampedRejections.current.delete(file.id));
    });
  }, [files]);

  const visibleFiles = files.filter((file) => !isGalleryFileCleared(file));
  const selected = events.find((event) => event.id === selectedId) || events[0];
  const knownIds = new Set(events.map((event) => event.id));
  const orphanFiles = visibleFiles.filter((file) => file.eventId && !knownIds.has(file.eventId));
  const eventFiles = selectedId === 'orphans'
    ? orphanFiles
      : selected
      ? filesForEvent(visibleFiles, selected.id)
      : [];
  const shown = eventFiles.filter((file) => filter === 'all' || file.status === filter);
  const pendingCount = visibleFiles.filter((file) => file.status === 'pending').length;

  const decide = async (file: DiscoverGalleryFile, status: GalleryReviewStatus) => {
    try {
      setBusyId(file.id);
      await setDiscoverGalleryFileStatus(db, file.id, status);
    } catch (err) {
      console.error(err);
      alert('تعذر حفظ القرار. تأكد أن الجلسة ما زالت مسجّلة.');
    } finally {
      setBusyId('');
    }
  };

  const clearRejected = async (file: DiscoverGalleryFile) => {
    if (!canClearRejectedGalleryFile(file, now)) return;
    if (!window.confirm('تختفي الصورة من القائمة، ويبقى عددها محسوباً للعضو.')) return;
    try {
      setBusyId(file.id);
      await clearRejectedGalleryFile(db, file.id);
    } catch (err) {
      console.error(err);
      alert('تعذر حذف الصورة من القائمة. تأكد أن الجلسة ما زالت مسجّلة.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="bg-white rounded-3xl p-8 border border-rose-200 shadow-sm space-y-6">
      <div className="border-b border-slate-100 pb-4 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h3 className="text-xl font-black text-rose-900">اعتماد صور لجنة الإعلام</h3>
          <p className="text-xs text-slate-500">الاعتماد ينشر الصورة في معرض الأنشطة. المرفوضة تبقى يوماً ثم تقدر تحذفها من القائمة، ويبقى العدد محسوباً للعضو.</p>
        </div>
        <span className="px-3.5 py-1.5 rounded-xl bg-amber-100 text-amber-900 font-bold text-xs">
          بانتظار الاعتماد: {pendingCount}
        </span>
      </div>

      {events.length === 0 && orphanFiles.length === 0 ? (
        <p className="text-center py-8 text-slate-400 font-bold text-xs bg-slate-50 rounded-2xl">لا توجد فعاليات في قسم الفعاليات بعد.</p>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {orphanFiles.length > 0 ? (
            <button
              type="button"
              onClick={() => setSelectedId('orphans')}
              className={`shrink-0 px-4 py-2 rounded-xl text-xs font-black border cursor-pointer ${
                selectedId === 'orphans' ? 'bg-rose-700 text-white border-rose-700' : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              خارج قسم الفعاليات ({orphanFiles.length})
            </button>
          ) : null}
          {events.map((event) => {
            const rows = filesForEvent(visibleFiles, event.id);
            const waiting = rows.filter((file) => file.status === 'pending').length;
            const active = selected?.id === event.id;
            return (
              <button
                key={event.id}
                type="button"
                onClick={() => setSelectedId(event.id)}
                className={`shrink-0 px-4 py-2 rounded-xl text-xs font-black border cursor-pointer ${
                  active ? 'bg-rose-700 text-white border-rose-700' : 'bg-white text-slate-700 border-slate-200'
                }`}
              >
                {event.title} ({rows.length}){waiting ? ` · ${waiting} جديد` : ''}
              </button>
            );
          })}
        </div>
      )}

      {selected || selectedId === 'orphans' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black cursor-pointer ${
                  filter === item.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {shown.length === 0 ? (
            <p className="text-center py-8 text-slate-400 font-bold text-xs bg-slate-50 rounded-2xl">لا توجد صور في هذا التصنيف{selected ? ` لفعالية ${selected.title}` : ''}.</p>
          ) : (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
              {shown.map((file) => (
                <article key={file.id} className="mb-4 break-inside-avoid rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                  {file.kind === 'video' || isDiscoverGalleryVideo(file.url) ? (
                    <video src={file.url} controls className="w-full h-auto rounded-xl bg-slate-950" />
                  ) : (
                    <GalleryPhoto src={file.url} alt={file.eventTitle} className="w-full h-auto rounded-xl bg-white" />
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-black text-slate-900">{file.uploaderName}</p>
                    <span className={`text-[10px] font-black px-2 py-1 rounded-full ${
                      file.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : file.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {galleryStatusLabel(file.status)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId === file.id || file.status === 'approved'}
                      onClick={() => decide(file, 'approved')}
                      className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-[11px] font-black disabled:bg-slate-300 cursor-pointer"
                    >
                      اعتماد
                    </button>
                    <button
                      type="button"
                      disabled={busyId === file.id || file.status === 'rejected'}
                      onClick={() => decide(file, 'rejected')}
                      className="flex-1 py-2 rounded-xl bg-rose-600 text-white text-[11px] font-black disabled:bg-slate-300 cursor-pointer"
                    >
                      رفض
                    </button>
                    {canClearRejectedGalleryFile(file, now) ? (
                      <button
                        type="button"
                        disabled={busyId === file.id}
                        onClick={() => clearRejected(file)}
                        className="flex-1 py-2 rounded-xl bg-slate-800 text-white text-[11px] font-black disabled:bg-slate-300 cursor-pointer"
                      >
                        حذف
                      </button>
                    ) : null}
                  </div>
                  {rejectedClearWaitLabel(file, now) ? (
                    <p className="text-[10px] font-bold text-slate-500">{rejectedClearWaitLabel(file, now)}</p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
