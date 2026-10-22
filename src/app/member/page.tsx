'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { emailToPhone, isPrivilegedRole } from '../lib/authIdentity';
import { committeeIdFromName, findMemberContext, resolveMemberAcceptance, resolvePortalCommitteeId } from '../lib/memberAcceptance';

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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const phone = user ? emailToPhone(user.email) : (localStorage.getItem('userPhone') || '');
      const name = localStorage.getItem('userName') || '';
      setCurrentUserPhone(phone);
      setCurrentUserName(name);
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

      if (phone) {
        const context = await findMemberContext(db, phone, name);
        const uData = context.data;
        if (uData) {
          if (uData.fullName) finalName = String(uData.fullName);
          if (uData.role) activeRole = String(uData.role);
          if (uData.assignedCommittee || uData.committee) activeComm = String(uData.assignedCommittee || uData.committee);
          if (uData.latestNotification) notification = String(uData.latestNotification);
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
      setUserRole(activeRole);
      setAssignedCommittee(activeComm);
      setUserNotification(notification);

      if (!activeComm) {
        setUserCommitteeData(null);
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
        return;
      }

      const commDocRef = doc(db, 'committees', targetKey);
      const commSnap = await getDoc(commDocRef);
      const meta = committeesMeta[targetKey];

      let members = [];
      let maleLeader = 'قائد الطلاب';
      let femaleLeader = 'قائدة الطالبات';
      let whatsappLink = '';

      if (commSnap.exists()) {
        const dat = commSnap.data();
        members = dat.members || [];
        maleLeader = dat.maleLeader || maleLeader;
        femaleLeader = dat.femaleLeader || femaleLeader;
        whatsappLink = dat.whatsappLink || '';
      }

      setUserCommitteeData({
        id: targetKey,
        name: meta.name,
        description: meta.description,
        icon: meta.icon,
        maleLeader,
        femaleLeader,
        whatsappLink,
        members
      });
    } catch (err) {
      console.error('Error fetching linked system data:', err);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = currentUserPhone === '0553731265' || isPrivilegedRole(userRole);
  const isLeader = userRole.includes('رئيس لجنة') || userRole.includes('رئيسة لجنة') || userRole.includes('قائد') || userRole.includes('قائدة');

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
              👑 الرؤساء وقادة اللجان
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
              <span className="bg-[#F5D061] text-[#630517] font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-wider">
                {isAdmin ? 'إدارة عليا للنادي' : isLeader ? 'قائد لجنة' : 'عضو أساسي معتمد'}
              </span>
              <h2 className="text-2xl font-black">أهلاً بك، {currentUserName || 'زميلنا العزيز'} 👋</h2>
              <p className="text-xs text-white/80 max-w-lg leading-relaxed">
                النظام مرتبط بالكامل: صلاحياتك معتمدة من الإدارة، ومهامك من لجنة الجودة وقائدك المباشر.
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

        {/* بطاقة اللجنة المرتبطة */}
        {loading ? (
          <div className="py-20 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">جاري مزامنة بيانات النظام السحابي... ⏳</div>
        ) : userCommitteeData ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6">
            <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
              <span className="w-16 h-16 rounded-2xl bg-[#630517]/10 flex items-center justify-center text-3xl shadow-inner">
                {userCommitteeData.icon}
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
                  💬 قروب واتساب اللجنة
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