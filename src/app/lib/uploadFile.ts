import { onAuthStateChanged } from 'firebase/auth';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, storage } from './firebase';

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const FIRESTORE_SAFE_BYTES = 450 * 1024;
const STORAGE_WAIT_MS = 12_000;

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

function waitForAuthUser(timeoutMs = 4000) {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  return new Promise<typeof auth.currentUser>((resolve) => {
    const timer = setTimeout(() => {
      unsub();
      resolve(auth.currentUser);
    }, timeoutMs);
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      clearTimeout(timer);
      unsub();
      resolve(user);
    });
  });
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
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
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('تعذر قراءة الصورة.'));
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

async function uploadToStorage(file: File, folderPath: string, onProgress?: (percent: number) => void) {
  await waitForAuthUser(1500);
  const safeFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${safeExtension(file)}`;
  const storageRef = ref(storage, `${folderPath}/${safeFileName}`);
  onProgress?.(20);

  const url = await withTimeout(
    (async () => {
      await uploadBytes(storageRef, file, {
        contentType: file.type || 'application/octet-stream',
      });
      onProgress?.(85);
      return await getDownloadURL(storageRef);
    })(),
    STORAGE_WAIT_MS,
    'STORAGE_TIMEOUT'
  );

  onProgress?.(100);
  return url;
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
    if (mapped.includes('STORAGE_TIMEOUT') || String(error).includes('STORAGE_TIMEOUT')) {
      throw new Error(
        file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
          ? 'تعذر رفع ملف PDF لأن سحابة الملفات لا تستجيب. ارفع صورة الشهادة ثم أعد المحاولة.'
          : 'تعذر رفع الملف لأن سحابة الملفات لا تستجيب حالياً. ارفع صورة أصغر، أو فعّل Firebase Storage ثم أعد المحاولة.'
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
