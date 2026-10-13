import { NextResponse } from 'next/server';

const ADMIN_PHONE = process.env.ADMIN_PHONE || process.env.NEXT_PUBLIC_ADMIN_PHONE || '0553731265';
const FIREBASE_API_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || '';

export async function POST(request: Request) {
  try {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      return NextResponse.json(
        { error: 'حساب المشرف غير مهيأ على الخادم. أضف ADMIN_PASSWORD في متغيرات البيئة.' },
        { status: 503 }
      );
    }
    if (!FIREBASE_API_KEY) {
      return NextResponse.json({ error: 'إعداد Firebase غير مكتمل.' }, { status: 503 });
    }

    const body = await request.json().catch(() => ({}));
    const phone = String(body.phone || '').trim();
    const password = String(body.password || '');

    if (phone !== ADMIN_PHONE || password !== adminPassword) {
      return NextResponse.json({ error: 'بيانات المشرف غير صحيحة.' }, { status: 401 });
    }

    const email = `${ADMIN_PHONE}@accounts.nursing-club.app`;
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );
    const data = await response.json();

    if (!response.ok && data?.error?.message !== 'EMAIL_EXISTS') {
      return NextResponse.json(
        { error: 'تعذر إنشاء حساب المشرف في نظام الدخول.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'تعذر تجهيز حساب المشرف.' }, { status: 500 });
  }
}
