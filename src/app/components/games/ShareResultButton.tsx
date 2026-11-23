'use client';

import React, { useState } from 'react';
import { ClubIcon } from '../icons';
import { shareResultText } from '../../lib/shareResult';

export default function ShareResultButton({ text, dark }: { text: string; dark?: boolean }) {
  const [note, setNote] = useState('');

  const send = async () => {
    const result = await shareResultText(text);
    if (result === 'copied') setNote('اننسخت النتيجة. الصقها في واتساب.');
    else if (result === 'failed') setNote(text);
    else setNote('');
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void send()}
        className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black ${
          dark ? 'bg-[#F5D061] text-[#630517]' : 'bg-[#630517] text-[#F5D061]'
        }`}
      >
        <ClubIcon name="send" size={16} />
        أرسل نتيجتي
      </button>
      {note ? <p className={`text-xs font-bold leading-relaxed ${dark ? 'text-[#fff6d6]' : 'text-[#630517]'}`}>{note}</p> : null}
    </div>
  );
}
