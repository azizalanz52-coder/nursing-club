'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { msUntilNextWord, riyadhDateKey, riyadhDayIndex, scoreGuess, todayWord, wordHint, wordLetters, type LetterMark } from '../../lib/dailyWord';
import { loadGamePlays, recordGamePlay } from '../../lib/gameActivity';
import { assignPersonalWord } from '../../lib/personalWord';
import { wordShareText } from '../../lib/shareResult';
import ShareResultButton from './ShareResultButton';

const KEYS = [
  ['ض', 'ص', 'ث', 'ق', 'ف', 'غ', 'ع', 'ه', 'خ', 'ح', 'ج', 'د'],
  ['ش', 'س', 'ي', 'ب', 'ل', 'ا', 'ت', 'ن', 'م', 'ك', 'ط'],
  ['ئ', 'ء', 'ؤ', 'ر', 'ة', 'و', 'ز', 'ظ', 'ذ'],
];

const TILE: Record<LetterMark | 'empty' | 'live', string> = {
  empty: 'border-white/10 bg-[#3a1520] text-transparent',
  live: 'border-[#F5D061]/70 bg-[#4a1a24] text-[#fff6d6]',
  correct: 'border-[#1f7a3a] bg-[#1f7a3a] text-white',
  present: 'border-[#C9A227] bg-[#F5D061] text-[#3b020b]',
  absent: 'border-transparent bg-[#2a1218] text-white/45',
};

const RANK: Record<LetterMark, number> = { absent: 0, present: 1, correct: 2 };

function clock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return `${hours} س ${minutes} د`;
}

export default function WordChallenge({ phone, name, onPlayed }: { phone: string; name: string; onPlayed?: () => void }) {
  const [day, setDay] = useState<number | null>(null);
  const [answer, setAnswer] = useState('');
  const [guesses, setGuesses] = useState<string[]>([]);
  const [current, setCurrent] = useState('');
  const [left, setLeft] = useState(0);
  const [sealed, setSealed] = useState(false);
  const [playedMs, setPlayedMs] = useState<number | undefined>();
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const now = Date.now();
    const index = riyadhDayIndex(now);
    const secretKey = `nurs-word-secret-${phone}-${index}`;
    setDay(index);
    const savedStart = Number(window.localStorage.getItem(`nurs-word-start-${index}`));
    if (savedStart) startedAt.current = savedStart;
    const savedResult = window.localStorage.getItem(`nurs-word-result-${index}`);
    if (savedResult) {
      try {
        const row = JSON.parse(savedResult) as { durationMs?: number };
        if (row.durationMs) setPlayedMs(row.durationMs);
      } catch {
        window.localStorage.removeItem(`nurs-word-result-${index}`);
      }
    }
    const savedGuesses = window.localStorage.getItem(`nurs-word-${index}`);
    if (savedGuesses) {
      try {
        const rows = JSON.parse(savedGuesses) as string[];
        if (!cancelled && Array.isArray(rows)) setGuesses(rows.filter((row) => typeof row === 'string').slice(0, 6));
      } catch {
        window.localStorage.removeItem(`nurs-word-${index}`);
      }
    }
    const localWord = window.localStorage.getItem(secretKey);
    const applyWord = (word: string) => {
      if (cancelled || !word) return;
      window.localStorage.setItem(secretKey, word);
      setAnswer(word);
    };
    if (localWord) applyWord(localWord);
    else if (savedGuesses) applyWord(todayWord(now));
    else {
      void assignPersonalWord(phone, now).then(applyWord).catch((err) => {
        console.error(err);
        applyWord(todayWord(now));
      });
    }
    void loadGamePlays(riyadhDateKey(now)).then(async (list) => {
      const mine = list.find((row) => row.game === 'word' && row.phone === phone && (row.status === 'won' || row.status === 'lost'));
      if (mine) {
        if (!cancelled) {
          setSealed(true);
          if (mine.durationMs) setPlayedMs(mine.durationMs);
        }
        return;
      }
      const secret = window.localStorage.getItem(secretKey) || '';
      let savedRows: string[] = [];
      if (savedGuesses) {
        try {
          const parsed = JSON.parse(savedGuesses) as string[];
          if (Array.isArray(parsed)) savedRows = parsed.filter((row) => typeof row === 'string').slice(0, 6);
        } catch {
          savedRows = [];
        }
      }
      const solved = secret ? savedRows.some((guess) => wordLetters(guess) === wordLetters(secret)) : false;
      const finished = solved || savedRows.length >= 6;
      if (!finished) return;
      let durationMs: number | undefined;
      if (savedResult) {
        try {
          const row = JSON.parse(savedResult) as { durationMs?: number };
          if (row.durationMs) durationMs = row.durationMs;
        } catch {
          durationMs = undefined;
        }
      }
      await recordGamePlay({
        game: 'word',
        phone,
        name,
        status: solved ? 'won' : 'lost',
        attempts: savedRows.length,
        score: solved ? 1 : 0,
        durationMs,
      });
      if (!cancelled) onPlayed?.();
    }).catch((err) => console.error(err));
    return () => {
      cancelled = true;
    };
  }, [phone, name]);

  useEffect(() => {
    const tick = () => setLeft(msUntilNextWord());
    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const answerKey = wordLetters(answer);
  const won = guesses.some((guess) => wordLetters(guess) === answerKey);
  const lost = !won && guesses.length >= 6;
  const locked = won || lost || sealed;
  const keyMarks = useMemo(() => {
    const marks = new Map<string, LetterMark>();
    if (!answer) return marks;
    guesses.forEach((guess) => {
      const letters = [...wordLetters(guess)];
      scoreGuess(guess, answer).forEach((mark, index) => {
        const letter = letters[index];
        const prev = marks.get(letter);
        if (!prev || RANK[mark] > RANK[prev]) marks.set(letter, mark);
      });
    });
    return marks;
  }, [answer, guesses]);

  if (!day || !answer) {
    return <p className="text-center text-sm font-bold text-[#F5D061]">نجهز كلمة اليوم...</p>;
  }

  const markStart = () => {
    if (startedAt.current || !day) return;
    const now = Date.now();
    startedAt.current = now;
    window.localStorage.setItem(`nurs-word-start-${day}`, String(now));
  };

  const typeLetter = (letter: string) => {
    if (locked || [...current].length >= 5) return;
    markStart();
    setCurrent((value) => value + letter);
  };

  const submit = () => {
    if (locked || [...current].length !== 5) return;
    const next = [...guesses, current];
    setGuesses(next);
    setCurrent('');
    window.localStorage.setItem(`nurs-word-${day}`, JSON.stringify(next));
    const solved = wordLetters(current) === answerKey;
    const finished = solved || next.length >= 6;
    const durationMs = startedAt.current ? Date.now() - startedAt.current : undefined;
    if (finished && day) {
      setPlayedMs(durationMs);
      window.localStorage.setItem(`nurs-word-result-${day}`, JSON.stringify({ durationMs }));
    }
    void recordGamePlay({
      game: 'word',
      phone,
      name,
      status: solved ? 'won' : finished ? 'lost' : 'playing',
      attempts: next.length,
      score: solved ? 1 : 0,
      durationMs,
    }).then(() => {
      if (finished) onPlayed?.();
    }).catch((err) => console.error(err));
  };

  const rows = [...guesses];
  if (!locked && rows.length < 6) rows.push(current);
  while (rows.length < 6) rows.push('');

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-[#F5D061] px-3 py-1 text-[11px] font-black text-[#3b020b]">كلمة اليوم</span>
        <span className="text-xs font-black text-[#fff6d6]">{guesses.length}/6</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          ['5', 'حروف'],
          ['6', 'محاولات'],
          ['24', 'ساعة'],
        ].map(([value, label]) => (
          <div key={label} className="rounded-2xl border border-[#F5D061]/25 bg-white/5 px-2 py-3">
            <p className="text-lg font-black text-[#F5D061]">{value}</p>
            <p className="text-[11px] font-bold text-[#fff6d6]/80">{label}</p>
          </div>
        ))}
      </div>
      <div className="text-center">
        <p className="text-[11px] font-bold text-[#fff6d6]/70">التلميح</p>
        <p className="text-2xl font-black text-[#F5D061]">{wordHint(answer)}</p>
      </div>
      <div className="mx-auto grid max-w-sm gap-2">
        {rows.map((row, rowIndex) => {
          const letters = [...row];
          const marked = rowIndex < guesses.length;
          const marks = marked ? scoreGuess(row, answer) : [];
          const live = !locked && rowIndex === guesses.length;
          return (
            <div key={rowIndex} className="grid grid-cols-5 gap-2">
              {Array.from({ length: 5 }, (_, index) => {
                const tone = marked ? TILE[marks[index]] : letters[index] && live ? TILE.live : TILE.empty;
                return (
                  <span key={index} className={`flex aspect-square items-center justify-center rounded-2xl border text-2xl font-black ${tone}`}>
                    {letters[index] || ''}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
      {won || lost ? (
        <div className="space-y-1 text-center">
          <p className="text-xl font-black text-[#F5D061]">{won ? `أحسنت. كلمة اليوم هي ${answer}` : `كلمة اليوم ${answer}`}</p>
          <p className="text-xs font-bold text-[#fff6d6]/70">المحاولة التالية بعد {clock(left)}.</p>
        </div>
      ) : (
        <p className="text-center text-xs font-bold text-[#fff6d6]/75">
          {sealed ? `مرة واحدة كل ٢٤ ساعة. ترجع بعد ${clock(left)}.` : `${[...current].length}/5 حروف · مرة واحدة اليوم`}
        </p>
      )}
      {won || lost ? (
        <div className="text-center">
          <ShareResultButton dark text={wordShareText(won, guesses.length, playedMs)} />
        </div>
      ) : null}
      <div className="space-y-2">
        {KEYS.map((row) => (
          <div key={row.join('')} className="flex flex-wrap justify-center gap-1">
            {row.map((key) => {
              const mark = keyMarks.get(wordLetters(key));
              const tone = mark === 'correct'
                ? 'bg-[#1f7a3a] text-white'
                : mark === 'present'
                  ? 'bg-[#F5D061] text-[#3b020b]'
                  : mark === 'absent'
                    ? 'bg-[#2a1218] text-white/40'
                    : 'bg-[#fff6d6] text-[#1a0208]';
              return (
                <button key={key} type="button" onClick={() => typeLetter(key)} disabled={locked} className={`h-11 min-w-8 rounded-xl px-2 text-sm font-black disabled:opacity-40 ${tone}`}>
                  {key}
                </button>
              );
            })}
          </div>
        ))}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={() => setCurrent((value) => [...value].slice(0, -1).join(''))} disabled={locked} className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-[#fff6d6] disabled:opacity-40">
            مسح
          </button>
          <button type="button" onClick={submit} disabled={locked || [...current].length !== 5} className="flex-1 rounded-2xl bg-gradient-to-l from-[#F5D061] to-[#E2B739] py-3 text-sm font-black text-[#3b020b] disabled:opacity-40">
            تأكيد التخمين
          </button>
        </div>
      </div>
    </div>
  );
}
