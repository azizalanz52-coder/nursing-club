'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { emailToPhone, isDistinguishedRole, isPrivilegedRole } from '../lib/authIdentity';
import { canonicalPhone } from '../lib/certificatesLookup';
import { loadCloudCollection, peekCloudCollection } from '../lib/cloudCache';
import { committeeIdFromName, findMemberContext, resolveMemberAcceptance, resolvePortalCommitteeId } from '../lib/memberAcceptance';
import { normalizeUniversityId } from '../lib/certificatesLookup';
import {
  loadOwnProfileFields,
  persistProfileName,
  updateOwnName,
  updateOwnUniversityId,
} from '../lib/memberProfile';
import { ClubIcon, CommitteeIcon, SocialIcon } from '../components/icons';

interface CommitteeData {
  id: string;
  name: string;
  description: string;
  icon: string;
  maleLeader: string;
  femaleLeader: string;
  whatsappLink?: string;
  members: any[];
}

const PORTAL_CACHE_PREFIX = 'nurs_member_portal_v1_';

type PortalCache = {
  name: string;
  role: string;
  committee: string;
  notification: string;
  committeeData: CommitteeData | null;
};

function portalCacheKey(phone: string) {
  return `${PORTAL_CACHE_PREFIX}${canonicalPhone(phone) || phone}`;
}

function readPortalCache(phone: string): PortalCache | null {
  if (typeof window === 'undefined' || !phone) return null;
  try {
    const raw = localStorage.getItem(portalCacheKey(phone));
    if (!raw) return null;
    return JSON.parse(raw) as PortalCache;
  } catch {
    return null;
  }
}

function writePortalCache(phone: string, snap: PortalCache) {
  if (typeof window === 'undefined' || !phone) return;
  try {
    localStorage.setItem(portalCacheKey(phone), JSON.stringify(snap));
  } catch {
    /* ignore */
  }
}

const committeesMeta: Record<string, { id: string; name: string; description: string; icon: string }> = {
  design: { id: 'design', name: 'لجنة التصميم', description: 'الهوية البصرية والبوسترات والمحتوى المرئي', icon: '🎨' },
  media: { id: 'media', name: 'لجنة الإعلام', description: 'إدارة المنصات والتغطيات الحية', icon: '📸' },
  pr: { id: 'pr', name: 'لجنة العلاقات العامة', description: 'الشراكات واستقبال الضيوف', icon: '🌐' },
  quality: { id: 'quality', name: 'لجنة الجودة والتطوير', description: 'مراجعة وتقييم الأداء المؤسسي', icon: '📊' },
  scientific: { id: 'scientific', name: 'لجنة المحتوى العلمي', description: 'المطويات الطبية والأنشطة الأكاديمية', icon: '🔬' },
  hr: { id: 'hr', name: 'لجنة الموارد البشرية', description: 'شؤون الأعضاء وتقييمات الأداء', icon: '👥' },
  'events-org': { id: 'events-org', name: 'لجنة تنظيم الفعاليات', description: 'التخطيط الميداني وإدارة الحشود', icon: '📅' },
};

export default function MemberSmartDashboard() {
  const [currentUserPhone, setCurrentUserPhone] = useState<string>('');
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('عضو أساسي');
  const [assignedCommittee, setAssignedCommittee] = useState<string>('');
  const [userNotification, setUserNotification] = useState<string>('');
  
  const [userCommitteeData, setUserCommitteeData] = useState<CommitteeData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [profileName, setProfileName] = useState('');
  const [profileUniversityId, setProfileUniversityId] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const phone = user ? emailToPhone(user.email) : (localStorage.getItem('userPhone') || '');
      const name = localStorage.getItem('userName') || '';
      setCurrentUserPhone(phone);
      setCurrentUserName(name);
      const cached = readPortalCache(phone);
      if (cached) {
        setCurrentUserName(cached.name || name);
        setUserRole(cached.role || 'عضو أساسي');
        setAssignedCommittee(cached.committee || '');
        setUserNotification(cached.notification || '');
        setUserCommitteeData(cached.committeeData);
        setLoading(false);
      }
      void fetchLinkedData(phone, name);
    });
    return () => unsub();
  }, []);

  const fetchLinkedData = async (phone: string, name: string) => {
    try {
      let activeRole = 'عضو أساسي';
      let activeComm = '';
      let notification = '';
      let finalName = name;
      let universityId = '';

      if (phone) {
        const context = await findMemberContext(db, phone, name);
        const uData = context.data;
        if (uData) {
          if (uData.fullName) finalName = String(uData.fullName);
          if (uData.role) activeRole = String(uData.role);
          if (uData.assignedCommittee || uData.committee) activeComm = String(uData.assignedCommittee || uData.committee);
          if (uData.latestNotification) notification = String(uData.latestNotification);
          if (uData.universityId) universityId = normalizeUniversityId(uData.universityId);
        }

        if (!activeComm) {
          const acceptance = await resolveMemberAcceptance(db, context.phone, uData);
          if (acceptance?.status === 'مقبول') {
            activeComm = acceptance.acceptedCommittee || '';
          }
        }
        if (!activeComm) {
          const portalId = await resolvePortalCommitteeId(db, context.phone, uData);
          if (portalId) activeComm = committeesMeta[portalId]?.name || portalId;
        }
      }

      setCurrentUserName(finalName);
      setProfileName(finalName);
      setUserRole(activeRole);
      setAssignedCommittee(activeComm);
      setUserNotification(notification);
      if (universityId) setProfileUniversityId(universityId);
      // افتح الواجهة فوراً بعد التعرف — الملف الشخصي يتكمل بالخلفية
      setLoading(false);

      void loadOwnProfileFields(db, phone)
        .then((profile) => {
          if (profile.fullName) {
            setProfileName(profile.fullName);
            setCurrentUserName(profile.fullName);
          }
          if (profile.universityId) setProfileUniversityId(profile.universityId);
        })
        .catch((profileErr) => console.error(profileErr));

      if (!activeComm) {
        setUserCommitteeData(null);
        writePortalCache(phone, {
          name: finalName,
          role: activeRole,
          committee: '',
          notification,
          committeeData: null,
        });
        return;
      }

      let targetKey = committeeIdFromName(activeComm);
      if (!targetKey) {
        for (const key of Object.keys(committeesMeta)) {
          if (activeComm.includes(committeesMeta[key].name) || activeComm.includes(key)) {
            targetKey = key;
            break;
          }
        }
      }
      if (!targetKey) {
        setUserCommitteeData(null);
        writePortalCache(phone, {
          name: finalName,
          role: activeRole,
          committee: activeComm,
          notification,
          committeeData: null,
        });
        return;
      }

      const meta = committeesMeta[targetKey];
      const cachedCommittees = peekCloudCollection('committees') || [];
      const cachedRow = cachedCommittees.find((row) => row.id === targetKey);
      let members = Array.isArray(cachedRow?.members) ? cachedRow.members : [];
      let maleLeader = String(cachedRow?.maleLeader || 'قائد الطلاب');
      let femaleLeader = String(cachedRow?.femaleLeader || 'قائدة الطالبات');
      let whatsappLink = String(cachedRow?.whatsappLink || '');

      const commSnap = await getDoc(doc(db, 'committees', targetKey));
      if (commSnap.exists()) {
        const dat = commSnap.data();
        members = dat.members || members;
        maleLeader = dat.maleLeader || maleLeader;
        femaleLeader = dat.femaleLeader || femaleLeader;
        whatsappLink = dat.whatsappLink || whatsappLink;
      } else {
        const cloud = await loadCloudCollection(db, 'committees').catch(() => []);
        const row = cloud.find((item) => item.id === targetKey);
        if (row) {
          members = Array.isArray(row.members) ? row.members : members;
          maleLeader = String(row.maleLeader || maleLeader);
          femaleLeader = String(row.femaleLeader || femaleLeader);
          whatsappLink = String(row.whatsappLink || whatsappLink);
        }
      }

      const committeeData = {
        id: targetKey,
        name: meta.name,
        description: meta.description,
        icon: meta.icon,
        maleLeader,
        femaleLeader,
        whatsappLink,
        members
      };
      setUserCommitteeData(committeeData);
      writePortalCache(phone, {
        name: finalName,
        role: activeRole,
        committee: activeComm,
        notification,
        committeeData,
      });
    } catch (err) {
      console.error('Error fetching linked system data:', err);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = currentUserPhone === '0553731265' || isPrivilegedRole(userRole);
  const isLeader = userRole.includes('رئيس لجنة') || userRole.includes('رئيسة لجنة') || userRole.includes('قائد') || userRole.includes('قائدة');
  const isDistinguished = isDistinguishedRole(userRole);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserPhone) {
      setProfileError('سجّل الدخول أولاً لتعديل بياناتك.');
      return;
    }
    setProfileSaving(true);
    setProfileError('');
    setProfileMessage('');
    try {
      const nextName = profileName.trim();
      const nextUni = normalizeUniversityId(profileUniversityId);
      const nameChanged = Boolean(nextName && nextName !== currentUserName.trim());
      let didSave = false;
      if (nameChanged) {
        const saved = await updateOwnName(db, nextName);
        setCurrentUserName(saved.fullName);
        setProfileName(saved.fullName);
        persistProfileName(saved.fullName);
        const cached = readPortalCache(currentUserPhone);
        if (cached) writePortalCache(currentUserPhone, { ...cached, name: saved.fullName });
        didSave = true;
      }
      if (nextUni) {
        await updateOwnUniversityId(db, nextUni, currentUserPhone);
        setProfileUniversityId(nextUni);
        didSave = true;
      }
      if (!didSave) {
        setProfileError('لا توجد تغييرات للحفظ. أدخل الاسم أو الرقم الجامعي.');
        return;
      }
      setProfileMessage('تم حفظ بياناتك بنجاح.');
    } catch (err: any) {
      console.error(err);
      setProfileError(err?.message || 'تعذر حفظ البيانات. حاول مرة أخرى.');
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 selection:bg-[#630517] selection:text-[#F5D061] py-12" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* شريط التنقل العلوي المرتبط بالنظام */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2 shrink-0" dir="ltr">
              <img src="/logo.png" alt="" className="h-9 w-auto object-contain" />
              <div className="w-px h-8 bg-slate-200" />
              <img src="/uhb-logo.png" alt="" className="h-9 w-auto object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-black text-slate-900">بوابة العضو</h1>
              <p className="text-xs text-slate-500 leading-relaxed">مهام لجنتك، الاعتذارات، وروابط العمل في مكان واحد</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/team"
              className="px-3 sm:px-4 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs transition-all border border-amber-300"
            >
              <span className="inline-flex items-center gap-1.5"><ClubIcon name="crown" size={13} /> الرؤساء وقادة اللجان</span>
            </Link>
            <Link
              href="/"
              className="px-3 sm:px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all border border-slate-200"
            >
              الرئيسية ←
            </Link>
          </div>
        </div>

        {/* لوحة الترحيب الذكية */}
        <div className="bg-gradient-to-r from-[#630517] to-[#80071D] rounded-3xl p-5 sm:p-8 text-white shadow-xl space-y-6 overflow-hidden">
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div className="space-y-2">
              <span className="bg-[#F5D061] text-[#630517] font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1">
                {isAdmin ? 'إدارة عليا للنادي' : isLeader ? 'قائد لجنة' : isDistinguished ? (
                  <><ClubIcon name="medal" size={12} /> عضو مميز</>
                ) : 'عضو أساسي معتمد'}
              </span>
              <h2 className="text-2xl font-black">أهلاً بك، {currentUserName || 'زميلنا العزيز'}</h2>
              <p className="text-xs text-white/80 max-w-lg leading-relaxed">
                {isDistinguished
                  ? 'رتبة عضو مميز تكريم لأول خمسة في دراسة الحالة، وتتجدد مع لوحة الصدارة.'
                  : 'النظام مرتبط بالكامل: صلاحياتك معتمدة من الإدارة، ومهامك من لجنة الجودة وقائدك المباشر.'}
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md px-5 py-4 rounded-2xl border border-white/20 text-center space-y-1">
              <span className="block text-xs text-white/70">رتبتك في النظام</span>
              <span className="text-sm font-black text-[#F5D061]">{isAdmin ? 'إدارة عليا' : userRole}</span>
            </div>
          </div>

          {userNotification && (
            <div className="bg-amber-400 text-slate-900 p-4 rounded-2xl text-xs font-black shadow-md flex flex-col sm:flex-row sm:items-start gap-2 break-words">
              <span className="shrink-0">🔔 تنبيه من الإدارة:</span>
              <span className="leading-relaxed">{userNotification}</span>
            </div>
          )}
        </div>

        {currentUserPhone ? (
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900">بياناتي</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                عدّل اسمك ورقمك الجامعي بنفسك. رقم الجوال للعرض فقط ويُغيَّر عبر الإدارة عند الحاجة.
              </p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block space-y-1.5 sm:col-span-2">
                  <span className="text-[11px] font-black text-slate-600">الاسم الكامل</span>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="الاسم الثلاثي أو الرباعي"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#630517]"
                    required
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-[11px] font-black text-slate-600">الرقم الجامعي</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    dir="ltr"
                    value={profileUniversityId}
                    onChange={(e) => setProfileUniversityId(e.target.value)}
                    placeholder="مثال: 2230005939"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-[#630517]"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-[11px] font-black text-slate-600">رقم الجوال</span>
                  <input
                    type="text"
                    dir="ltr"
                    value={currentUserPhone}
                    readOnly
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-100 text-sm font-mono font-bold text-slate-500 cursor-not-allowed"
                  />
                </label>
              </div>

              {profileError ? (
                <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">{profileError}</p>
              ) : null}
              {profileMessage ? (
                <p className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3">{profileMessage}</p>
              ) : null}

              <button
                type="submit"
                disabled={profileSaving}
                className="px-6 py-3 rounded-2xl bg-[#630517] text-[#F5D061] font-black text-xs shadow-md hover:brightness-110 disabled:opacity-60 cursor-pointer"
              >
                {profileSaving ? 'جاري الحفظ...' : 'حفظ البيانات'}
              </button>
            </form>
          </section>
        ) : null}

        {/* بطاقة اللجنة المرتبطة */}
        {loading ? (
          <div className="py-20 text-center text-slate-400 bg-white rounded-3xl border border-slate-200 inline-flex items-center justify-center gap-2 w-full">جاري مزامنة بيانات النظام... <ClubIcon name="clock" size={16} /></div>
        ) : userCommitteeData ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6">
            <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
              <span className="w-16 h-16 rounded-2xl bg-[#630517]/10 flex items-center justify-center text-[#630517] shadow-inner">
                <CommitteeIcon id={userCommitteeData.id} size={28} />
              </span>
              <div>
                <span className="text-xs font-bold text-[#630517] bg-[#630517]/10 px-3 py-1 rounded-full">لجنتك المعتمدة سحابياً</span>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{userCommitteeData.name}</h3>
                <p className="text-xs text-slate-600 mt-1">{userCommitteeData.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-slate-400 font-bold">قائد الطلاب:</span>
                <p className="font-extrabold text-slate-900 text-sm">{userCommitteeData.maleLeader}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-slate-400 font-bold">قائدة الطالبات:</span>
                <p className="font-extrabold text-slate-900 text-sm">{userCommitteeData.femaleLeader}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-slate-100 flex-wrap">
              <Link
                href="/committee-dashboard"
                className="flex-1 py-3 px-6 rounded-2xl bg-[#630517] text-[#F5D061] font-black text-xs text-center shadow-md hover:brightness-110 transition-all"
              >
                دخول بوابتي ومهام اللجنة ➔
              </Link>
              <Link
                href={`/team/${userCommitteeData.id}`}
                className="py-3 px-6 rounded-2xl bg-slate-900 text-white font-black text-xs text-center shadow-md hover:bg-slate-800 transition-all"
              >
                صفحة اللجنة
              </Link>

              {userCommitteeData.whatsappLink && (
                <a
                  href={userCommitteeData.whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 px-6 rounded-2xl bg-emerald-600 text-white font-bold text-xs shadow-md hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                >
                  <SocialIcon name="whatsapp" size={15} title="واتساب" /> قروب واتساب اللجنة
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-4">
            {!currentUserPhone ? (
              <>
                <p className="text-slate-800 text-sm font-black">سجّل الدخول أولاً لفتح بوابتك.</p>
                <p className="text-slate-500 text-xs">من الشريط أعلاه اختر تسجيل الدخول برقم الجوال، ثم تعود لجنتك مباشرة.</p>
                <Link href="/login" className="inline-flex px-6 py-3 rounded-2xl bg-[#630517] text-[#F5D061] font-black text-xs">
                  تسجيل الدخول
                </Link>
              </>
            ) : (
              <>
                <p className="text-slate-800 text-sm font-black">حسابك ظاهر، لكن لم يُربط بلجنة بعد.</p>
                <p className="text-slate-500 text-xs">إذا قُبلت مؤخراً، حدّث الصفحة أو تواصل مع قائد لجنتك. يمكنك أيضاً الاستعلام عن القبول.</p>
                <Link href="/check-status" className="inline-flex px-6 py-3 rounded-2xl bg-[#630517] text-[#F5D061] font-black text-xs">
                  استعلام القبول
                </Link>
              </>
            )}
          </div>
        )}

      </div>
    </main>
  );
}