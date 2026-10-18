import { NextResponse } from 'next/server';

const ADMIN_PHONE = process.env.ADMIN_PHONE || process.env.NEXT_PUBLIC_ADMIN_PHONE || '0553731265';
const FIREBASE_API_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || '';
const AUTH_EMAIL_DOMAIN = 'accounts.nursing-club.app';

async function lookupEmail(idToken: string) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    }
  );
  const data = await response.json();
  if (!response.ok) return '';
  return String(data?.users?.[0]?.email || '');
}

export async function POST(request: Request) {
  try {
    if (!FIREBASE_API_KEY) {
      return NextResponse.json({ error: 'إعداد Firebase غير مكتمل.' }, { status: 503 });
    }

    const authHeader = request.headers.get('authorization') || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!idToken) {
      return NextResponse.json({ error: 'سجّل الدخول كمشرف ثم أعد المحاولة.' }, { status: 401 });
    }

    const callerEmail = await lookupEmail(idToken);
    const callerPhone = callerEmail.split('@')[0];
    if (callerPhone !== ADMIN_PHONE) {
      return NextResponse.json({ error: 'تعيين كلمة المرور للمشرف العام فقط.' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const phone = String(body.phone || '').trim();
    const password = String(body.password || '');
    if (!phone || password.length < 6) {
      return NextResponse.json(
        { error: 'يجب أن تكون كلمة المرور 6 أحرف أو أرقام على الأقل.' },
        { status: 400 }
      );
    }

    const email = `${phone}@${AUTH_EMAIL_DOMAIN}`;
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: false }),
      }
    );
    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({ ok: true, created: true });
    }

    if (data?.error?.message === 'EMAIL_EXISTS') {
      return NextResponse.json({
        ok: true,
        created: false,
        message: 'تم حذف كلمة المرور من قاعدة البيانات. الحساب موجود في نظام الدخول ولا تُحفظ كلمته عندنا.',
      });
    }

    return NextResponse.json(
      { error: 'تعذر حفظ كلمة المرور في نظام الدخول.' },
      { status: 400 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'تعذر تحديث كلمة المرور.' }, { status: 500 });
  }
}
