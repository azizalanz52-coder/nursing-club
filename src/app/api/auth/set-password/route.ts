import { NextResponse } from 'next/server';

const ADMIN_PHONE = process.env.ADMIN_PHONE || process.env.NEXT_PUBLIC_ADMIN_PHONE || '0553731265';
const FIREBASE_API_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || '';
const AUTH_EMAIL_DOMAIN = 'accounts.nursing-club.app';
function canonicalPhone(value: string) {
  const digits = String(value || '').replace(/\D/g, '');
  let core = digits;
  if (core.startsWith('966')) core = core.slice(3);
  if (core.startsWith('0')) core = core.slice(1);
  return core ? `0${core}` : '';
}

function phoneEmails(phone: string) {
  const raw = String(phone || '').trim();
  const digits = raw.replace(/\D/g, '');
  let core = digits;
  if (core.startsWith('966')) core = core.slice(3);
  if (core.startsWith('0')) core = core.slice(1);
  const variants = [raw];
  if (core) variants.push(core, `0${core}`, `966${core}`);
  return Array.from(new Set(variants.filter(Boolean))).map((item) => `${item}@${AUTH_EMAIL_DOMAIN}`);
}

function errorMessage(data: any) {
  return String(data?.error?.message || '');
}

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

async function signInWithPassword(email: string, password: string) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: false }),
    }
  );
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, data };
}

async function signUpWithPassword(email: string, password: string) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: false }),
    }
  );
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, data };
}

async function resetViaOobLink(email: string, password: string) {
  const send = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestType: 'PASSWORD_RESET',
        email,
        returnOobLink: true,
      }),
    }
  );
  const sent = await send.json().catch(() => ({}));
  const link = String(sent?.oobLink || '');
  if (!send.ok || !link) return false;
  let oobCode = '';
  try {
    oobCode = new URL(link).searchParams.get('oobCode') || '';
  } catch {
    return false;
  }
  if (!oobCode) return false;
  const reset = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oobCode, newPassword: password }),
    }
  );
  return reset.ok;
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
    const callerPhone = canonicalPhone(callerEmail.split('@')[0]);
    if (callerPhone !== canonicalPhone(ADMIN_PHONE)) {
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

    const emails = phoneEmails(phone);
    let lastError = '';

    for (const email of emails) {
      const signedIn = await signInWithPassword(email, password);
      if (signedIn.ok) {
        return NextResponse.json({ ok: true, updated: true });
      }

      const created = await signUpWithPassword(email, password);
      if (created.ok) {
        return NextResponse.json({ ok: true, created: true });
      }

      const message = errorMessage(created.data);
      lastError = message || lastError;
      if (!message.includes('EMAIL_EXISTS')) continue;

      const reset = await resetViaOobLink(email, password);
      if (reset) {
        return NextResponse.json({ ok: true, updated: true });
      }
    }

    return NextResponse.json(
      {
        error:
          lastError.includes('EMAIL_EXISTS')
            ? 'الحساب موجود في نظام الدخول وتعذر استبدال كلمة المرور من هنا. جرّب كلمة من 6 خانات فأكثر.'
            : 'تعذر حفظ كلمة المرور في نظام الدخول.',
      },
      { status: 400 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'تعذر تحديث كلمة المرور.' }, { status: 500 });
  }
}
