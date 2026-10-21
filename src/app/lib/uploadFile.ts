import { onAuthStateChanged } from 'firebase/auth';
import { getDownloadURL, ref, uploadBytes, uploadBytesResumable } from 'firebase/storage';
import { auth, storage } from './firebase';

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const FIRESTORE_SAFE_BYTES = 450 * 1024;

export function isOverUploadLimit(file: File) {
  return file.size > MAX_UPLOAD_BYTES;
}

export function uploadLimitMessage() {
  return 'حجم الملف أكبر من 8 ميغابايت. صغّر الملف ثم أعد المحاولة.';
}

export function assertUploadSize(file: File) {
  if (isOverUploadLimit(file)) {
    throw new Error(uploadLimitMessage());
  }
}

export function filterFilesWithinLimit(files: File[]) {
  const accepted: File[] = [];
  const rejected: File[] = [];
  for (const file of files) {
    if (isOverUploadLimit(file)) rejected.push(file);
    else accepted.push(file);
  }
  return { accepted, rejected };
}

export function uploadingLabel(isUploading: boolean, progress: number, idleText: string) {
  if (!isUploading) return idleText;
  if (progress <= 0) return 'جاري بدء الرفع...';
  return `جاري الرفع... ${progress}%`;
}

function storageErrorMessage(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: string }).code) : '';
  const message = error instanceof Error ? error.message : String(error || '');
  if (code.includes('unauthorized') || message.includes('unauthorized')) {
    return 'صلاحية الرفع مرفوضة. سجّل الدخول مرة أخرى ثم أعد المحاولة.';
  }
  if (code.includes('retry-limit') || code.includes('network') || message.includes('network')) {
    return 'ضعف في الاتصال أثناء الرفع. أعد المحاولة.';
  }
  return message || 'تعذر رفع الملف. حاول مرة أخرى.';
}

function safeExtension(file: File) {
  const fromName = file.name.toLowerCase().match(/\.(jpe?g|png|gif|webp|heic|heif|mp4|mov|webm|pdf)$/i);
  if (fromName) return fromName[0];

  const fromType: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/heic': '.heic',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/quicktime': '.mov',
    'application/pdf': '.pdf',
  };
  return fromType[file.type] || '';
}

export async function requireAuthUser() {
  const user = await waitForAuthUser(12000);
  await user.getIdToken();
  return user;
}

function waitForAuthUser(timeoutMs = 15000) {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  return new Promise<NonNullable<typeof auth.currentUser>>((resolve, reject) => {
    const timer = setTimeout(() => {
      unsub();
      if (auth.currentUser) resolve(auth.currentUser);
      else reject(new Error('سجّل الدخول ثم أعد رفع الملف.'));
    }, timeoutMs);
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      clearTimeout(timer);
      unsub();
      resolve(user);
    });
  });
}

function dataUrlBytes(dataUrl: string) {
  const comma = dataUrl.indexOf(',');
  const encoded = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return Math.ceil(encoded.length * 0.75);
}

async function compressImageToDataUrl(file: File, maxBytes = FIRESTORE_SAFE_BYTES): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      const timer = setTimeout(() => reject(new Error('تعذر قراءة الصورة.')), 15000);
      image.onload = () => {
        clearTimeout(timer);
        resolve(image);
      };
      image.onerror = () => {
        clearTimeout(timer);
        reject(new Error('تعذر قراءة الصورة.'));
      };
      image.src = objectUrl;
    });

    let width = img.naturalWidth || img.width;
    let height = img.naturalHeight || img.height;
    const maxDim = 1600;
    if (Math.max(width, height) > maxDim) {
      const scale = maxDim / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('تعذر ضغط الصورة.');

    let quality = 0.86;
    for (let i = 0; i < 10; i++) {
      canvas.width = width;
      canvas.height = height;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      if (dataUrlBytes(dataUrl) <= maxBytes) return dataUrl;
      quality -= 0.1;
      if (quality < 0.45) {
        width = Math.round(width * 0.8);
        height = Math.round(height * 0.8);
        quality = 0.72;
      }
    }

    throw new Error('الصورة كبيرة حتى بعد الضغط. اختر صورة أوضح وأصغر ثم أعد المحاولة.');
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function isVideoFile(file: File) {
  return file.type.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(file.name);
}

function isRetryableUploadError(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: string }).code) : '';
  const message = error instanceof Error ? error.message : String(error || '');
  if (message.includes('STORAGE_TIMEOUT')) return true;
  if (code.includes('unauthorized') || message.includes('unauthorized')) return false;
  if (code.includes('unauthenticated') || message.includes('unauthenticated')) return false;
  if (code.includes('quota') || code.includes('invalid-checksum')) return false;
  return true;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label = 'STORAGE_TIMEOUT') {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(label)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function startProgressTicker(file: File, onProgress?: (percent: number) => void) {
  const megaBytes = Math.max(0.4, file.size / (1024 * 1024));
  const expectedMs = Math.max(3500, megaBytes * 2200);
  const started = Date.now();
  onProgress?.(18);
  const tick = setInterval(() => {
    const ratio = Math.min(0.88, (Date.now() - started) / expectedMs);
    onProgress?.(Math.round(18 + ratio * 70));
  }, 180);
  return () => clearInterval(tick);
}

const fileMetadata = (file: File) => ({
  contentType: file.type || 'application/octet-stream',
  cacheControl: 'public,max-age=86400',
});

async function uploadDirect(file: File, storageRef: ReturnType<typeof ref>, onProgress?: (percent: number) => void) {
  const stop = startProgressTicker(file, onProgress);
  try {
    const result = await uploadBytes(storageRef, file, fileMetadata(file));
    onProgress?.(92);
    return await getDownloadURL(result.ref);
  } finally {
    stop();
  }
}

async function uploadResumable(file: File, storageRef: ReturnType<typeof ref>, onProgress?: (percent: number) => void) {
  const task = uploadBytesResumable(storageRef, file, fileMetadata(file));
  try {
    return await new Promise<string>((resolve, reject) => {
      task.on(
        'state_changed',
        (snap) => {
          const ratio = snap.totalBytes ? snap.bytesTransferred / snap.totalBytes : 0;
          onProgress?.(Math.min(90, Math.round(15 + ratio * 75)));
        },
        reject,
        async () => {
          try {
            resolve(await getDownloadURL(task.snapshot.ref));
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  } catch (error) {
    try {
      task.cancel();
    } catch {
      // ignore cancel errors
    }
    throw error;
  }
}

async function uploadToStorage(file: File, folderPath: string, onProgress?: (percent: number) => void) {
  const user = await waitForAuthUser(12000);
  await user.getIdToken();

  const safeFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${safeExtension(file)}`;
  const storageRef = ref(storage, `${folderPath}/${safeFileName}`);
  const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name);
  onProgress?.(12);

  try {
    const url = await withTimeout(uploadDirect(file, storageRef, onProgress), isImage ? 15000 : 22000);
    onProgress?.(100);
    return url;
  } catch (error) {
    if (isImage || !isRetryableUploadError(error)) throw error;
    const url = await withTimeout(uploadResumable(file, storageRef, onProgress), 28000);
    onProgress?.(100);
    return url;
  }
}

export async function uploadClubFile(
  file: File,
  folderPath: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  assertUploadSize(file);

  try {
    return await uploadToStorage(file, folderPath, onProgress);
  } catch (error) {
    if (file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name)) {
      onProgress?.(55);
      const dataUrl = await compressImageToDataUrl(file);
      onProgress?.(100);
      return dataUrl;
    }

    const mapped = storageErrorMessage(error);
    const timedOut = mapped.includes('STORAGE_TIMEOUT') || String(error).includes('STORAGE_TIMEOUT');
    const isVideo = isVideoFile(file);
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

    if (timedOut) {
      throw new Error(
        isPdf
          ? 'تعذر رفع ملف PDF لأن الاتصال توقف أثناء الرفع. أبقِ الصفحة مفتوحة وأعد المحاولة على واي فاي.'
          : isVideo
            ? 'تعذر إكمال رفع المقطع لأن الاتصال توقف. أبقِ الصفحة مفتوحة حتى تظهر نسبة الرفع 100٪، ويفضّل الواي فاي.'
            : 'تعذر رفع الملف لأن الاتصال توقف أثناء الرفع. أعد المحاولة على شبكة أقوى.'
      );
    }
    throw new Error(mapped);
  }
}

export function certMediaFields(fileUrl: string) {
  if (fileUrl.startsWith('data:')) {
    return { fileUrl, image: '' };
  }
  return { fileUrl, image: fileUrl };
}

export function certDisplayUrl(cert: { fileUrl?: string; image?: string; file?: string } | null | undefined) {
  const fileUrl = String(cert?.fileUrl || '');
  const image = String(cert?.image || '');
  const file = String(cert?.file || '');
  return fileUrl || image || file;
}

export function certFileCandidates(cert: { fileUrl?: string; image?: string; file?: string } | null | undefined) {
  return Array.from(new Set([cert?.fileUrl, cert?.image, cert?.file].map((value) => String(value || '').trim()).filter(Boolean)));
}

function decodeCertBase64(raw: string) {
  const cleaned = raw.replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/');
  const pad = cleaned.length % 4;
  return atob(pad ? `${cleaned}${'='.repeat(4 - pad)}` : cleaned);
}

function openBlob(bytes: Uint8Array, mimeType: string, certTitle: string) {
  const blob = new Blob([bytes], { type: mimeType });
  const blobUrl = URL.createObjectURL(blob);
  const win = window.open(blobUrl, '_blank');
  if (win) return;
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = `${certTitle || 'الشهادة'}.${mimeType.includes('pdf') ? 'pdf' : 'jpg'}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function openCertificateFile(fileData: string, certTitle: string) {
  if (!fileData) throw new Error('empty');
  if (/^https?:\/\//i.test(fileData) || fileData.startsWith('blob:')) {
    window.open(fileData, '_blank');
    return;
  }

  let mimeType = 'image/jpeg';
  let payload = fileData.trim();

  if (payload.startsWith('data:')) {
    const parts = payload.split(',');
    const match = parts[0].match(/:(.*?);/);
    if (match) mimeType = match[1];
    payload = parts.slice(1).join(',');
    try {
      const binary = decodeCertBase64(payload);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      openBlob(bytes, mimeType, certTitle);
      return;
    } catch {
      const a = document.createElement('a');
      a.href = fileData;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.download = `${certTitle || 'الشهادة'}.${mimeType.includes('pdf') ? 'pdf' : 'jpg'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }
  }

  if (payload.startsWith('JVBERi0')) mimeType = 'application/pdf';
  else if (payload.startsWith('iVBORw0KGgo')) mimeType = 'image/png';
  else if (payload.startsWith('/9j/')) mimeType = 'image/jpeg';

  const binary = decodeCertBase64(payload);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  openBlob(bytes, mimeType, certTitle);
}

export function openCertificateMedia(cert: { fileUrl?: string; image?: string; file?: string; title?: string; certTitle?: string } | null | undefined) {
  const title = String(cert?.certTitle || cert?.title || 'الشهادة');
  const candidates = certFileCandidates(cert);
  if (!candidates.length) throw new Error('empty');
  let lastError: unknown;
  for (const src of candidates) {
    try {
      openCertificateFile(src, title);
      return;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('unreadable');
}

export function omitHeavyCertMedia<T extends Record<string, any>>(cert: T) {
  const { fileUrl, image, file, ...rest } = cert;
  return {
    ...rest,
    hasFile: Boolean(fileUrl || image || file),
  } as Omit<T, 'fileUrl' | 'image' | 'file'> & { hasFile: boolean };
}

export async function uploadClubFiles(
  files: File[],
  folderPath: string,
  onProgress?: (percent: number) => void
): Promise<string[]> {
  const urls: string[] = [];
  if (files.length === 0) return urls;
  for (let i = 0; i < files.length; i++) {
    urls.push(
      await uploadClubFile(files[i], folderPath, (percent) => {
        onProgress?.(Math.round(((i + percent / 100) / files.length) * 100));
      })
    );
  }
  return urls;
}
