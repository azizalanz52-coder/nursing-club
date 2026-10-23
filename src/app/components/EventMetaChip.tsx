'use client';

import { splitCampusVenue } from '../lib/clubEvents';
import { ClubIcon, type ClubIconName } from './icons';

export default function EventMetaChip({
  icon,
  value,
}: {
  icon: ClubIconName;
  value?: string;
}) {
  const rows = splitCampusVenue(value);
  if (!rows.length) return null;

  return (
    <div className="flex items-start gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-2.5 rounded-xl border border-white/20 shadow-inner text-xs font-bold text-slate-100">
      <ClubIcon name={icon} size={14} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1 space-y-1 leading-relaxed">
        {rows.map((row) => (
          <p key={`${row.label}:${row.text}`} className="break-words">
            {row.label ? <span className="text-[#F5D061]">{row.label}: </span> : null}
            <span>{row.text}</span>
          </p>
        ))}
      </div>
    </div>
  );
}
