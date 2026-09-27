'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

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
  'events-org': { id: 'events-org', name: 'لجنة التنظيم والفعاليات', description: 'التخطيط الميداني وإدارة الحشود', icon: '📅' },
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
    const phone = localStorage.getItem('userPhone') || '';
    const name = localStorage.getItem('userName') || '';
    setCurrentUserPhone(phone);
    setCurrentUserName(name);

    const fetchLinkedData = async () => {
      try {
        let activeRole = 'عضو أساسي';
        let activeComm = '';
        let notification = '';
        let finalName = name;

        if (phone) {
          const userSnap = await getDoc(doc(db, 'users', phone));
          if (userSnap.exists()) {
            const uData = userSnap.data();
            if (uData.fullName) finalName = uData.fullName;
            if (uData.role) activeRole = uData.role;
            if (uData.assignedCommittee) activeComm = uData.assignedCommittee;
            if (uData.latestNotification) notification = uData.latestNotification;
          }

          if (!activeComm) {
            const appsSnap = await getDocs(collection(db, 'applications'));
            appsSnap.forEach(d => {
              const appData = d.data();
              if (appData.phone === phone && appData.status === 'مقبول') {
                activeComm = appData.acceptedCommittee || '';
              }
            });
          }
        }

        setCurrentUserName(finalName);
        setUserRole(activeRole);
        setAssignedCommittee(activeComm);
        setUserNotification(notification);

        let targetKey = 'design';
        for (const key of Object.keys(committeesMeta)) {
          if (activeComm.includes(committeesMeta[key].name) || activeComm.includes(key)) {
            targetKey = key;
            break;
          }
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

    fetchLinkedData();
  }, []);

  const isAdmin = currentUserPhone === '0553731265' || userRole === 'System Admin' || userRole === 'رئيس النادي' || userRole === 'رئيسة النادي' || userRole === 'نائب رئيس النادي' || userRole === 'نائبة رئيس النادي';
  const isLeader = userRole.includes('رئيس لجنة') || userRole.includes('مشرف');

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 selection:bg-[#630517] selection:text-[#F5D061] py-12" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* شريط التنقل العلوي المرتبط بالنظام */}
        <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[#630517] text-[#F5D061] flex items-center justify-center font-black text-lg">
              UHB
            </span>
            <div>
              <h1 className="text-base font-black text-slate-900">بوابة العضو المرتبطة سحابياً 🛡️</h1>
              <p className="text-xs text-slate-500">منصة موحدة تتصل مباشرة بلوحة الأدمن وقادة اللجان</p>
            </div>
          </div>
          <Link
            href="/"
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all border border-slate-200"
          >
            الرئيسية ←
          </Link>
        </div>

        {/* لوحة الترحيب الذكية */}
        <div className="bg-gradient-to-r from-[#630517] to-[#80071D] rounded-3xl p-8 text-white shadow-xl space-y-6">
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
              <span className="text-sm font-black text-[#F5D061]">{userRole}</span>
            </div>
          </div>

          {userNotification && (
            <div className="bg-amber-400 text-slate-900 p-4 rounded-2xl text-xs font-black shadow-md flex items-center gap-3">
              <span>🔔 تنبيه من الإدارة:</span>
              <span>{userNotification}</span>
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
                href={`/team/${userCommitteeData.id}`}
                className="flex-1 py-3 px-6 rounded-2xl bg-[#630517] text-[#F5D061] font-black text-xs text-center shadow-md hover:brightness-110 transition-all"
              >
                الدخول لصفحة المهام واعتذارات الحضور ➔
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
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
            <p className="text-slate-500 text-sm font-bold">لم يتم ربط حسابك بأي لجنة حتى الآن من قبل لوحة التحكم.</p>
          </div>
        )}

      </div>
    </main>
  );
}