'use client';
/*
 * زر شراكة RCQ العائم. معزول بـ Shadow DOM عن تنسيق الموقع.
 */
import { useEffect } from 'react';

export default function RcqButton() {
  useEffect(() => mountRcqButton(), []);
  return null;
}

type Item = { key: string; text: string; hash: string };

const SITE = 'https://rcqai.online/';
const EVERY_MS = 2600;
// RCQ wordmark (letters only, cut from the official logo), used as a mask so it takes any color.
const MARK = 'data:image/png;base64,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';

const ITEMS: Item[] = [
  { key: 'summary', text: 'لخص شابترك', hash: '#upload' },
  { key: 'quiz', text: 'اختبر كويز', hash: '#quizzes' },
  { key: 'osce', text: 'سمّع أوسكي', hash: '#quizzes' },
];

const hrefOf = (it: Item) =>
  `${SITE}?utm_source=nursing_club&utm_medium=button&utm_content=${it.key}${it.hash}`;

const EASE = 'cubic-bezier(.2,.9,.25,1)';

const CSS = `
.fab{
  --h:34px;--tile:24px;--pad:3px;--fs:11px;--by:8px;--off:12px;--end:10px;
  position:fixed;z-index:40;
  right:calc(var(--off) + env(safe-area-inset-right, 0px));
  bottom:calc(var(--off) + env(safe-area-inset-bottom, 0px));
  box-sizing:border-box;height:var(--h);
  display:flex;align-items:center;gap:6px;
  padding-block:var(--pad);padding-inline:var(--pad) var(--end);
  direction:rtl;text-align:right;
  font-family:inherit;font-size:var(--fs);font-style:normal;line-height:1.45;letter-spacing:0;text-transform:none;
  color:#630517;background:#F5D061;
  background-image:linear-gradient(180deg,rgba(255,255,255,.3),rgba(255,255,255,0) 60%);
  border:0;border-radius:calc(var(--h) / 2);
  text-decoration:none;cursor:pointer;user-select:none;-webkit-user-select:none;
  -webkit-tap-highlight-color:transparent;
  box-shadow:inset 0 0 0 1px rgba(99,5,23,.1),0 14px 30px -12px rgba(59,2,11,.55),0 4px 10px -4px rgba(59,2,11,.28);
  opacity:0;transform:translateY(14px) scale(.96);
  transition:opacity .45s ease,transform .55s ${EASE},box-shadow .3s ease,padding .4s ${EASE},gap .4s ${EASE};
}
.fab.in{opacity:1;transform:none}
.fab.in.away{opacity:0;transform:translateY(18px) scale(.92);pointer-events:none;visibility:hidden;
  transition:opacity .3s ease,transform .4s ${EASE},visibility 0s linear .4s}
.tile{
  flex:none;display:grid;place-items:center;
  width:var(--tile);height:var(--tile);border-radius:50%;
  background:#630517;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.14),inset 0 0 0 1px rgba(245,208,97,.18);
}
.mark{display:block;width:78%;aspect-ratio:120/74;margin-top:6%;background:#F5D061;
  -webkit-mask:url(${MARK}) center/contain no-repeat;mask:url(${MARK}) center/contain no-repeat;
  transition:transform .5s cubic-bezier(.3,1.5,.5,1)}
.fab.tick .mark{transform:scale(1.12) rotate(-6deg)}
.words{display:flex;flex-direction:column;justify-content:center;min-width:0;max-width:128px;overflow:hidden;
  transition:max-width .4s ${EASE},opacity .25s ease}
.stack{display:grid;overflow:hidden}
.p{grid-area:1/1;font-weight:900;font-size:1em;white-space:nowrap;padding-block:1px;
  transform:translateY(105%);opacity:0;transition:transform .5s ${EASE},opacity .35s ease}
.p.on{transform:none;opacity:1}
.p.out{transform:translateY(-105%);opacity:0}
.p.reset{transition:none}
.by{font-size:var(--by);font-weight:600;line-height:1.3;opacity:.72;white-space:nowrap}
.by b{font-weight:800;letter-spacing:.03em}
.go{display:grid;place-items:center;max-width:12px;overflow:hidden;opacity:.85;
  transition:max-width .4s ${EASE},opacity .25s ease}
.go svg{width:11px;height:11px;transition:transform .25s ${EASE}}
.fab.compact{gap:0;padding-inline:var(--pad)}
.fab.compact .words,.fab.compact .go{max-width:0 !important;opacity:0}
@media (hover:hover){
  .fab.in:hover{transform:translateY(-2px);
    box-shadow:inset 0 0 0 1px rgba(99,5,23,.12),0 18px 36px -12px rgba(59,2,11,.62),0 6px 14px -6px rgba(59,2,11,.3)}
  .fab:hover .go svg{transform:translate(-2px,-2px)}
}
.fab.in:active{transform:scale(.97);transition-duration:.12s}
.fab:focus{outline:none}
.fab:focus-visible{box-shadow:0 0 0 3px #fff,0 0 0 5px #630517,0 14px 30px -12px rgba(59,2,11,.55)}
@media (min-width:600px){
  .fab{--h:36px;--tile:26px;--fs:11.5px;--by:8.5px;--off:14px;--end:11px}
}
@media (min-width:1024px){
  .fab{--h:38px;--tile:28px;--fs:12px;--by:9px;--off:16px;--end:12px;gap:7px}
}
@media (prefers-reduced-motion:reduce){
  .fab,.words,.go,.go svg,.mark{transition-duration:.01ms !important}
  .fab,.fab.in:hover,.fab.in:active,.fab.in.away,.fab.tick .mark{transform:none}
  .p,.p.out{transform:none !important}
  .p{transition:opacity .3s ease}
}
@media print{.fab{display:none}}
`;

const ARROW =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 17 7 7"/><path d="M7 17V7h10"/></svg>';
const LABEL = 'RCQ: لخص شابترك، اختبر كويز، سمّع أوسكي. يفتح موقع RCQ في نافذة جديدة';

type Flagged = { __rcqClubButton?: boolean };

/** Adds the button to the page. Returns a function that removes it again. */
function mountRcqButton(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};
  const flag = window as unknown as Flagged;
  if (flag.__rcqClubButton) return () => {};
  flag.__rcqClubButton = true;

  const host = document.createElement('div');
  host.setAttribute('data-rcq', 'club-button');
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML =
    `<style>${CSS}</style>` +
    `<a class="fab" href="${hrefOf(ITEMS[0])}" target="_blank" rel="noopener" aria-label="${LABEL}">` +
    `<span class="tile"><span class="mark"></span></span>` +
    `<span class="words" aria-hidden="true"><span class="stack">` +
    ITEMS.map((it, n) => `<span class="p${n ? '' : ' on'}">${it.text}</span>`).join('') +
    `</span><span class="by">مع <b dir="ltr">RCQ</b></span></span>` +
    `<span class="go" aria-hidden="true">${ARROW}</span>` +
    `</a>`;
  document.body.appendChild(host);

  const fab = root.querySelector('.fab') as HTMLAnchorElement;
  const words = root.querySelector('.words') as HTMLElement;
  const phrases = Array.from(root.querySelectorAll<HTMLElement>('.p'));

  let idx = 0;
  let timer = 0;
  let idle = 0;
  let enter = 0;
  const paused = new Set<string>();

  const fit = () => {
    words.style.maxWidth = 'none';
    const w = Math.ceil(words.scrollWidth) + 1;
    words.style.maxWidth = `${w}px`;
  };

  const show = (next: number) => {
    const prev = phrases[idx];
    prev.classList.remove('on');
    prev.classList.add('out');
    phrases[next].classList.add('on');
    fab.classList.add('tick');
    window.setTimeout(() => {
      fab.classList.remove('tick');
      prev.classList.add('reset');
      prev.classList.remove('out');
      void prev.offsetWidth;
      prev.classList.remove('reset');
    }, 560);
    idx = next;
    fab.href = hrefOf(ITEMS[idx]);
  };

  const schedule = () => {
    window.clearTimeout(timer);
    if (paused.size) return;
    timer = window.setTimeout(() => {
      show((idx + 1) % ITEMS.length);
      schedule();
    }, EVERY_MS);
  };
  const pause = (why: string, on: boolean) => {
    if (on) paused.add(why);
    else paused.delete(why);
    schedule();
  };

  // Shrinks to just the circle while the visitor scrolls on phones and tablets.
  const setCompact = (on: boolean) => {
    if (fab.classList.contains('compact') === on) return;
    fab.classList.toggle('compact', on);
    pause('compact', on);
  };

  // Steps aside when the footer comes up (so it never sits on the footer links)
  // and while the visitor is typing in a form field (so it never covers the field).
  const awayFor = new Set<string>();
  const setAway = (why: string, on: boolean) => {
    if (on) awayFor.add(why);
    else awayFor.delete(why);
    const away = awayFor.size > 0;
    if (fab.classList.contains('away') === away) return;
    fab.classList.toggle('away', away);
    fab.tabIndex = away ? -1 : 0;
    pause('away', away);
  };
  const footer = document.querySelector('footer');
  let watch: IntersectionObserver | null = null;
  if (footer && 'IntersectionObserver' in window) {
    watch = new IntersectionObserver((list) => setAway('footer', list[list.length - 1].isIntersecting), {
      rootMargin: '0px 0px -80px 0px',
    });
    watch.observe(footer);
  }
  const nearEnd = () => {
    if (watch) return;
    const end = document.documentElement.scrollHeight - window.innerHeight - window.scrollY;
    setAway('footer', end < 120);
  };
  const FIELD = 'input:not([type=button]):not([type=submit]):not([type=checkbox]):not([type=radio]):not([type=range]),textarea,select';
  const isField = (el: Element | EventTarget | null) =>
    el instanceof HTMLElement && (el.matches(FIELD) || el.isContentEditable);
  const onFocusIn = (e: FocusEvent) => setAway('typing', isField(e.target));
  const onFocusOut = () => window.setTimeout(() => setAway('typing', isField(document.activeElement)), 0);

  let lastY = window.scrollY;
  const onScroll = () => {
    const y = window.scrollY;
    const dy = y - lastY;
    lastY = y;
    nearEnd();
    if (window.innerWidth >= 1024) return setCompact(false);
    if (dy > 6 && y > 160) setCompact(true);
    else if (dy < -6) setCompact(false);
    window.clearTimeout(idle);
    idle = window.setTimeout(() => setCompact(false), 1100);
  };
  const onResize = () => {
    if (window.innerWidth >= 1024) setCompact(false);
    fit();
  };
  const onVisibility = () => pause('hidden', document.hidden);
  const onEnter = () => pause('hover', true);
  const onLeave = () => pause('hover', false);
  const onFocus = () => pause('focus', true);
  const onBlur = () => pause('focus', false);

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVisibility);
  document.addEventListener('focusin', onFocusIn);
  document.addEventListener('focusout', onFocusOut);
  fab.addEventListener('mouseenter', onEnter);
  fab.addEventListener('mouseleave', onLeave);
  fab.addEventListener('focus', onFocus);
  fab.addEventListener('blur', onBlur);

  fit();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit).catch(() => {});
  enter = window.setTimeout(() => {
    fab.classList.add('in');
    schedule();
  }, 700);

  return () => {
    window.clearTimeout(timer);
    window.clearTimeout(idle);
    window.clearTimeout(enter);
    if (watch) watch.disconnect();
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVisibility);
    document.removeEventListener('focusin', onFocusIn);
    document.removeEventListener('focusout', onFocusOut);
    host.remove();
    flag.__rcqClubButton = false;
  };
}
