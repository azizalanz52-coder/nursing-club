'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { msUntilNextWord, riyadhDayIndex, scoreGuess, wordHint, wordLetters, type LetterMark } from '../../lib/dailyWord';
import { commitWordGuess, loadWordAttempt } from '../../lib/gameActivity';
import { wordSealed } from '../../lib/gameAttempt';
import { releaseEmptyWord } from '../../lib/personalWord';
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
  const [accountStatus, setAccountStatus] = useState<'' | 'won' | 'lost'>('');
  const [ready, setReady] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [playedMs, setPlayedMs] = useState<number | undefined>();
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const index = riyadhDayIndex();
    const secretKey = `nurs-word-secret-${phone}-${index}`;
    const guessKey = `nurs-word-${phone}-${index}`;
    setDay(index);
    const readGuesses = (key: string) => {
      try {
        const parsed = JSON.parse(window.localStorage.getItem(key) || 'null') as unknown;
        return Array.isArray(parsed) ? parsed.filter((row): row is string => typeof row === 'string').slice(0, 6) : [];
      } catch {
        return [];
      }
    };
    const localWord = window.localStorage.getItem(secretKey) || '';
    const storedGuesses = readGuesses(guessKey);
    const legacyGuesses = storedGuesses.length ? storedGuesses : readGuesses(`nurs-word-${index}`);
    void (async () => {
      const gate = await loadWordAttempt(phone);
      if (cancelled) return;
      if (!gate.ok) {
        setBlocked(true);
        setReady(true);
        return;
      }
      let guesses = gate.play.guesses;
      let status = gate.play.status;
      let word = gate.play.word;
      if (gate.play.durationMs) setPlayedMs(gate.play.durationMs);
      if (wordSealed(status || undefined) && guesses.length === 0 && localWord && wordLetters(localWord) !== wordLetters(word)) {
        if (word) await releaseEmptyWord(phone, word);
        word = localWord;
      }
      const sameWord = Boolean(localWord) && wordLetters(localWord) === wordLetters(word);
      const prefix = guesses.every((guess, guessIndex) => legacyGuesses[guessIndex] === guess);
      if (!wordSealed(status || undefined) && sameWord && prefix && legacyGuesses.length > guesses.length) {
        for (const guess of legacyGuesses.slice(guesses.length)) {
          const committed = await commitWordGuess(phone, name, guess);
          if (!committed.ok) break;
          guesses = committed.play.guesses;
          status = committed.play.status;
          if (committed.play.durationMs) setPlayedMs(committed.play.durationMs);
        }
        if (!cancelled && (status === 'won' || status === 'lost')) onPlayed?.();
      } else if (wordSealed(status || undefined) && guesses.length === 0 && sameWord && legacyGuesses.length) {
        guesses = legacyGuesses;
      }
      if (cancelled) return;
      if (!word) {
        setBlocked(true);
        setReady(true);
        return;
      }
      setAnswer(word);
      setGuesses(guesses);
      if (status === 'won' || status === 'lost') setAccountStatus(status);
      window.localStorage.setItem(secretKey, word);
      window.localStorage.setItem(guessKey, JSON.stringify(guesses));
      setReady(true);
    })().catch((err) => {
      console.error(err);
      if (!cancelled) {
        setBlocked(true);
        setReady(true);
      }
    });
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
  const guessWon = Boolean(answer) && guesses.some((guess) => wordLetters(guess) === answerKey);
  const guessLost = !guessWon && guesses.length >= 6;
  const won = guessWon || (accountStatus === 'won' && !guessLost);
  const lost = guessLost || (accountStatus === 'lost' && !guessWon);
  const locked = !ready || blocked || saving || won || lost || accountStatus === 'won' || accountStatus === 'lost';
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

  if (!ready || !day) {
    return <p className="text-center text-sm font-bold text-[#F5D061]">نتحقق من محاولتك...</p>;
  }
  if (blocked || !answer) {
    return <p className="text-center text-sm font-bold text-[#F5D061]">ما انربطت المحاولة بالحساب. حدّث الصفحة وأنت داخل.</p>;
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
    const typed = current;
    setSaving(true);
    void commitWordGuess(phone, name, typed).then((result) => {
      if (!result.ok) {
        setBlocked(true);
        return;
      }
      setGuesses(result.play.guesses);
      setAnswer(result.play.word);
      setCurrent('');
      if (result.play.status === 'won' || result.play.status === 'lost') setAccountStatus(result.play.status);
      if (result.play.durationMs) setPlayedMs(result.play.durationMs);
      window.localStorage.setItem(`nurs-word-${phone}-${day}`, JSON.stringify(result.play.guesses));
      if (result.play.applied && (result.play.status === 'won' || result.play.status === 'lost')) onPlayed?.();
    }).catch((err) => {
      console.error(err);
      setBlocked(true);
    }).finally(() => setSaving(false));
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
          {`${[...current].length}/5 حروف · مرة واحدة اليوم`}
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
