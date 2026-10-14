import { getDownloadURL, ref, uploadBytes, uploadBytesResumable } from 'firebase/storage';
import { storage } from './firebase';

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

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
  if (progress <= 0) return 'جاري بدء الرفع السحابي...';
  return `جاري الرفع السحابي... ${progress}%`;
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
  if (code.includes('canceled') || message.includes('canceled') || message.includes('cancelled') || message.includes('مهلة')) {
    return 'انتهت مهلة الرفع. تحقق من الاتصال ثم أعد المحاولة.';
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

export async function uploadClubFile(
  file: File,
  folderPath: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  assertUploadSize(file);

  const safeFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${safeExtension(file)}`;
  const storageRef = ref(storage, `${folderPath}/${safeFileName}`);
  const timeoutMs = Math.max(90_000, Math.ceil(file.size / 8000) + 20_000);

  const metadata = { contentType: file.type || 'application/octet-stream' };

  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file, metadata);

    let settled = false;
    let lastPercent = -1;
    let timedOut = false;
    let started = false;
    let fallingBack = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(stallTimer);
      fn();
    };

    const fallbackToSimpleUpload = async () => {
      fallingBack = true;
      try {
        task.cancel();
        await uploadBytes(storageRef, file, metadata);
        const url = await getDownloadURL(storageRef);
        onProgress?.(100);
        finish(() => resolve(url));
      } catch (error) {
        finish(() => reject(new Error(storageErrorMessage(error))));
      }
    };

    const timer = setTimeout(() => {
      timedOut = true;
      task.cancel();
      finish(() => reject(new Error('انتهت مهلة الرفع. تحقق من الاتصال ثم أعد المحاولة.')));
    }, timeoutMs);

    const stallTimer = setTimeout(() => {
      if (!started && !settled) {
        void fallbackToSimpleUpload();
      }
    }, 8000);

    const fail = (error: unknown) => {
      if (settled || fallingBack) return;
      if (timedOut) {
        finish(() => reject(new Error('انتهت مهلة الرفع. تحقق من الاتصال ثم أعد المحاولة.')));
        return;
      }
      finish(() => reject(new Error(storageErrorMessage(error))));
    };

    task.on(
      'state_changed',
      (snapshot) => {
        if (snapshot.bytesTransferred > 0) started = true;
        const percent = snapshot.totalBytes
          ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
          : 0;
        if (percent !== lastPercent) {
          lastPercent = percent;
          onProgress?.(percent);
        }
      },
      fail,
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          onProgress?.(100);
          finish(() => resolve(url));
        } catch (error) {
          fail(error);
        }
      }
    );
  });
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
