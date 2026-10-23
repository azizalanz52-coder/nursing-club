export type ClubEvent = {
  id: string;
  title: string;
  date: string;
  location: string;
  status: string;
  poster: string;
  description: string;
  createdAt?: number;
  timestamp?: number;
};

const ARAB_MONTHS: Record<string, number> = {
  يناير: 0,
  فبراير: 1,
  مارس: 2,
  أبريل: 3,
  ابريل: 3,
  مايو: 4,
  يونيو: 5,
  يوليو: 6,
  أغسطس: 7,
  اغسطس: 7,
  سبتمبر: 8,
  أكتوبر: 9,
  اكتوبر: 9,
  نوفمبر: 10,
  ديسمبر: 11,
};

const PLACEHOLDER_IDS = new Set(['1', '2', '3']);

export function parseEventDateMs(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (!value) return 0;
  const text = String(value).trim();
  if (!text) return 0;
  const asNum = Number(text);
  if (Number.isFinite(asNum) && asNum > 1e11) return asNum;
  const iso = Date.parse(text);
  if (Number.isFinite(iso)) return iso;
  const arabic = text.match(/(\d{1,2})\s+([^\s\d]+)\s+(\d{4})/);
  if (arabic) {
    const month = ARAB_MONTHS[arabic[2]];
    if (month != null) return new Date(Number(arabic[3]), month, Number(arabic[1])).getTime();
  }
  const yearOnly = text.match(/(20\d{2})/);
  if (yearOnly) return new Date(Number(yearOnly[1]), 0, 1).getTime();
  return 0;
}

export function eventPostedAt(event: ClubEvent): number {
  const created = parseEventDateMs(event.createdAt ?? event.timestamp);
  if (created) return created;
  const idNum = Number(event.id);
  if (Number.isFinite(idNum) && idNum > 1e11) return idNum;
  return parseEventDateMs(event.date);
}

export function eventYear(event: ClubEvent): number {
  const fromDate = parseEventDateMs(event.date);
  if (fromDate) return new Date(fromDate).getFullYear();
  const posted = eventPostedAt(event);
  return posted ? new Date(posted).getFullYear() : 0;
}

export function isPlaceholderEvent(event: ClubEvent): boolean {
  return PLACEHOLDER_IDS.has(String(event.id));
}

export function isCurrentSeasonEvent(event: ClubEvent, minYear = 2026): boolean {
  if (isPlaceholderEvent(event)) return false;
  const year = eventYear(event);
  if (year && year < minYear) return false;
  return true;
}

export function sortEventsByLatest(events: ClubEvent[]): ClubEvent[] {
  return [...events].sort((a, b) => eventPostedAt(b) - eventPostedAt(a));
}

export function latestClubEvents(events: ClubEvent[], limit = 3): ClubEvent[] {
  return sortEventsByLatest(events.filter((event) => isCurrentSeasonEvent(event))).slice(0, limit);
}

export type CampusVenueLine = {
  label: string;
  text: string;
};

function splitOneVenueChunk(text: string): CampusVenueLine[] {
  const value = text.replace(/\s+/g, ' ').trim();
  if (!value) return [];

  const tokens = [
    { label: 'الطلاب', index: value.search(/الطلاب/) },
    { label: 'الطالبات', index: value.search(/الطالبات/) },
  ].filter((token) => token.index >= 0).sort((a, b) => a.index - b.index);

  if (tokens.length === 0) return [{ label: '', text: value }];

  const lines: CampusVenueLine[] = [];
  if (tokens[0].index > 0) {
    const prefix = value.slice(0, tokens[0].index).replace(/[\s:：\-–—,،|/]+$/u, '').trim();
    if (prefix) lines.push({ label: '', text: prefix });
  }

  tokens.forEach((token, index) => {
    const start = token.index + token.label.length;
    const end = index + 1 < tokens.length ? tokens[index + 1].index : value.length;
    const body = value
      .slice(start, end)
      .replace(/^[\s:：\-–—,،|/]+/u, '')
      .replace(/[\s:：\-–—,،|/]+$/u, '')
      .trim();
    if (body) lines.push({ label: token.label, text: body });
  });

  return lines.length ? lines : [{ label: '', text: value }];
}

export function splitCampusVenue(value?: string): CampusVenueLine[] {
  const raw = String(value || '').trim();
  if (!raw) return [];
  return raw
    .split(/\n+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .flatMap((chunk) => splitOneVenueChunk(chunk));
}
