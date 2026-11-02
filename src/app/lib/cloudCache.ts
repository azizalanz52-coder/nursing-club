'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, type Firestore } from 'firebase/firestore';
import { db } from './firebase';

export type CloudRow = { id: string; [key: string]: unknown };

type CacheEntry = { at: number; rows: CloudRow[] };

const memory = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<CloudRow[]>>();

const CACHE_PREFIX = 'nurs_cloud_v1_';
const FRESH_MS = 25_000;
const MAX_LS_CHARS = 1_800_000;

const MEMORY_ONLY = new Set([
  'applications',
  'users',
  'escalated_reports',
  'quality_reports_archive',
  'quality_uploaded_files',
  'event_excuses',
]);

const SLIM_REST_COLLECTIONS = new Set(['certificates', 'site_certificates']);
const CERT_INDEX_FIELDS = [
  'issuedBy',
  'description',
  'fullName',
  'recipientName',
  'phone',
  'universityId',
  'title',
  'certTitle',
  'category',
  'createdAt',
  'dateStr',
  'issueDate',
];
const FIRESTORE_PROJECT =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'nursing-club-62994';

export const PUBLIC_CLOUD_COLLECTIONS = [
  'site_partners',
  'student_achievements',
  'site_passion_slides',
  'site_discover_events',
  'site_events',
  'site_banners',
  'site_newsletters',
  'committees',
] as const;

export const HR_INDEX_COLLECTIONS = ['site_certificates', 'hr_certificate_batches', 'committee_tasks'] as const;

function isHeavyBlob(value: string) {
  if (value.startsWith('data:') || value.startsWith('blob:')) return true;
  if (value.length > 8000 && /^[A-Za-z0-9+/=]+$/.test(value.slice(0, 80))) return true;
  return false;
}

function slimValue(value: unknown): unknown {
  if (typeof value === 'string') return isHeavyBlob(value) ? '' : value;
  if (Array.isArray(value)) return value.map(slimValue);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (key === 'password') continue;
      out[key] = slimValue(nested);
    }
    return out;
  }
  return value;
}

function defaultMapDoc(name: string, id: string, data: Record<string, unknown>): CloudRow {
  if (name === 'certificates' || name === 'site_certificates') {
    const { fileUrl, image, file, password: _password, ...rest } = data;
    return {
      id,
      ...rest,
      hasFile: Boolean(fileUrl || image || file),
    };
  }
  const { password: _password, ...rest } = data;
  return { id, ...rest };
}

function restFieldValue(field: Record<string, unknown> | undefined) {
  if (!field) return '';
  if (field.stringValue != null) return String(field.stringValue);
  if (field.integerValue != null) return Number(field.integerValue);
  if (field.doubleValue != null) return Number(field.doubleValue);
  if (field.booleanValue != null) return Boolean(field.booleanValue);
  if (field.timestampValue) return Date.parse(String(field.timestampValue)) || String(field.timestampValue);
  return '';
}

async function fetchSlimRestCollection(name: string): Promise<CloudRow[]> {
  const rows: CloudRow[] = [];
  let token = '';
  const mask = CERT_INDEX_FIELDS.map((field) => `mask.fieldPaths=${encodeURIComponent(field)}`).join('&');
  for (let page = 0; page < 20; page += 1) {
    const url = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents/${name}?pageSize=300&${mask}${
      token ? `&pageToken=${encodeURIComponent(token)}` : ''
    }`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`slim ${name} ${res.status}`);
    const data = (await res.json()) as {
      documents?: Array<{ name?: string; fields?: Record<string, Record<string, unknown>> }>;
      nextPageToken?: string;
    };
    for (const doc of data.documents || []) {
      const id = String(doc.name || '').split('/').pop() || '';
      if (!id) continue;
      const fields = doc.fields || {};
      const row: CloudRow = { id, hasFile: true };
      CERT_INDEX_FIELDS.forEach((key) => {
        if (fields[key]) row[key] = restFieldValue(fields[key]);
      });
      if (typeof row.description === 'string' && row.description.length > 180) {
        row.description = row.description.slice(0, 180);
      }
      rows.push(row);
    }
    if (!data.nextPageToken) break;
    token = data.nextPageToken;
  }
  return rows;
}

function persist(name: string, rows: CloudRow[]) {
  if (typeof window === 'undefined' || MEMORY_ONLY.has(name)) return;
  try {
    const slim = slimValue(rows);
    const raw = JSON.stringify({ at: Date.now(), rows: slim });
    if (raw.length > MAX_LS_CHARS) return;
    localStorage.setItem(`${CACHE_PREFIX}${name}`, raw);
  } catch {
    /* quota / private mode */
  }
}

function readDisk(name: string): CloudRow[] | null {
  if (typeof window === 'undefined' || MEMORY_ONLY.has(name)) return null;
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${name}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { rows?: CloudRow[] };
    return Array.isArray(parsed.rows) ? parsed.rows : null;
  } catch {
    return null;
  }
}

export function peekCloudCollection<T extends { id: string } = CloudRow>(name: string): T[] | null {
  const mem = memory.get(name);
  if (mem?.rows) return mem.rows as T[];
  const disk = readDisk(name);
  if (disk) {
    memory.set(name, { at: 0, rows: disk });
    return disk as T[];
  }
  return null;
}

export function writeCloudCollection(name: string, rows: unknown[]) {
  const list = (Array.isArray(rows) ? rows : []) as CloudRow[];
  memory.set(name, { at: Date.now(), rows: list });
  persist(name, list);
}

export function invalidateCloudCollection(name: string) {
  memory.delete(name);
  inflight.delete(name);
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`${CACHE_PREFIX}${name}`);
  } catch {
    /* ignore */
  }
}

export async function loadCloudCollection<T extends { id: string } = CloudRow>(
  firestore: Firestore,
  name: string,
  options?: {
    force?: boolean;
    persist?: boolean;
    maxAgeMs?: number;
    mapDoc?: (id: string, data: Record<string, unknown>) => T;
  }
): Promise<T[]> {
  const maxAge = options?.maxAgeMs ?? (SLIM_REST_COLLECTIONS.has(name) ? 120_000 : FRESH_MS);
  const cached = memory.get(name);
  if (!options?.force && cached && Date.now() - cached.at < maxAge && cached.at > 0) {
    return cached.rows as T[];
  }

  const pending = inflight.get(name);
  if (pending && !options?.force) return pending as Promise<T[]>;

  const request = (async () => {
    try {
      let rows: CloudRow[] = [];
      if (SLIM_REST_COLLECTIONS.has(name) && !options?.mapDoc) {
        try {
          rows = await fetchSlimRestCollection(name);
        } catch {
          const snap = await getDocs(collection(firestore, name));
          rows = snap.docs.map((docSnap) => defaultMapDoc(name, docSnap.id, docSnap.data() as Record<string, unknown>));
        }
      } else {
        const snap = await getDocs(collection(firestore, name));
        const mapDoc = options?.mapDoc || ((id, data) => defaultMapDoc(name, id, data) as T);
        rows = snap.docs.map((docSnap) => mapDoc(docSnap.id, docSnap.data() as Record<string, unknown>)) as CloudRow[];
      }
      memory.set(name, { at: Date.now(), rows });
      if (options?.persist !== false) persist(name, rows);
      return rows;
    } catch (err) {
      if (cached?.rows) return cached.rows;
      const disk = readDisk(name);
      if (disk) return disk;
      throw err;
    }
  })().finally(() => {
    if (inflight.get(name) === request) inflight.delete(name);
  });

  inflight.set(name, request);
  return request as Promise<T[]>;
}

export function mergeCachedCollections<T extends { id: string } = CloudRow>(...names: string[]) {
  const mapped = new Map<string, T>();
  names.forEach((name) => {
    (peekCloudCollection<T>(name) || []).forEach((row) => mapped.set(row.id, row));
  });
  return Array.from(mapped.values());
}

export function warmPublicCloud(firestore: Firestore = db) {
  if (typeof window === 'undefined') return;
  PUBLIC_CLOUD_COLLECTIONS.forEach((name) => {
    void loadCloudCollection(firestore, name).catch(() => undefined);
  });
  HR_INDEX_COLLECTIONS.forEach((name) => {
    void loadCloudCollection(firestore, name).catch(() => undefined);
  });
}

export function useCloudCollection<T extends { id: string } = CloudRow>(
  name: string,
  options?: {
    fallback?: T[];
    keepFallbackIfEmpty?: boolean;
    enabled?: boolean;
    mapDoc?: (id: string, data: Record<string, unknown>) => T;
  }
) {
  const fallback = options?.fallback || [];
  const [rows, setRows] = useState<T[]>(fallback);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (options?.enabled === false) return;
    let cancelled = false;
    const cached = peekCloudCollection<T>(name);
    if (cached && cached.length > 0) {
      setRows(cached);
      setLoading(false);
    }
    void loadCloudCollection<T>(db, name, { mapDoc: options?.mapDoc })
      .then((fresh) => {
        if (cancelled) return;
        if (fresh.length > 0) setRows(fresh);
        else if (!options?.keepFallbackIfEmpty) setRows([]);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [name, options?.enabled]);

  return { rows, loading };
}
