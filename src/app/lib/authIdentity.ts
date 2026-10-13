export const AUTH_EMAIL_DOMAIN = 'accounts.nursing-club.app';
export const ADMIN_PHONE = process.env.NEXT_PUBLIC_ADMIN_PHONE || '0553731265';

export function normalizePhone(phone: string) {
  return String(phone || '').trim();
}

export function phoneToEmail(phone: string) {
  return `${normalizePhone(phone)}@${AUTH_EMAIL_DOMAIN}`;
}

export function emailToPhone(email?: string | null) {
  return String(email || '').split('@')[0] || '';
}

export function isAdminPhone(phone?: string | null) {
  return normalizePhone(phone || '') === normalizePhone(ADMIN_PHONE);
}

export function isLeadershipRole(role?: string | null) {
  const value = String(role || '');
  return (
    value === 'General Supervisor' ||
    value.includes('رئيس النادي') ||
    value.includes('رئيسة النادي') ||
    value.includes('نائبة الرئيس') ||
    value.includes('نائب رئيس')
  );
}

export function isPrivilegedRole(role?: string | null) {
  const value = String(role || '');
  return value === 'System Admin' || isLeadershipRole(value);
}
