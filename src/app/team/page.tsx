'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';

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

export default function TeamHubPage() {
  const [currentUserPhone, setCurrentUserPhone] = useState<string>('');
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('عضو نشط');
  const [userAssignedCommittee, setUserAssignedCommittee] = useState<string>('');
  const [userNotification, setUserNotification] = useState<string>('');
  
  const [committeesList, setCommitteesList] = useState<CommitteeData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const phone = localStorage.getItem('userPhone') || '';
    const name = localStorage.getItem('userName') || '';
    setCurrentUserPhone(phone);
    setCurrentUserName(name);

    const fetchAllData = async () => {
      try {
        if (phone) {
          const userSnap = await getDoc(doc(db, 'users', phone));
          if (userSnap.exists()) {
            const uData = userSnap.data();
            if (uData.fullName) setCurrentUserName(uData.fullName);
            if (uData.role) setUserRole(uData.role);
            if (uData.assignedCommittee) setUserAssignedCommittee(uData.assignedCommittee);
            if (uData.latestNotification) setUserNotification(uData.latestNotification);
          }
        }

        const comms: CommitteeData[] = [];
        for (const key of Object.keys(committeesMeta)) {
          const meta = committeesMeta[key];
          const docRef = doc(db, 'committees', key);
          const snap = await getDoc(docRef);
          
          let members = [];
          let maleLeader = 'قائد الطلاب';
          let femaleLeader = 'قائدة الطالبات';
          let whatsappLink = '';

          if (snap.exists()) {
            const dat = snap.data();
            members = dat.members || [];
            maleLeader = dat.maleLeader || maleLeader;
            femaleLeader = dat.femaleLeader || femaleLeader;
            whatsappLink = dat.whatsappLink || '';
          }

          comms.push({
            id: key,
            name: meta.name,
            description: meta.description,
            icon: meta.icon,
            maleLeader,
            femaleLeader,
            whatsappLink,
            members
          });
        }

        setCommitteesList(comms);
      } catch (err) {
        console.error('Error fetching team hub data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  const isAdmin = currentUserPhone === '0553731265' || userRole === 'System Admin' || userRole === 'رئيس النادي';

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 selection:bg-[#630517] selection:text-[#F5D061] py-12" dir="rtl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* شريط التنقل العلوي */}
        <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[#630517] text-[#F5D061] flex items-center justify-center font-black text-lg">
              UHB
            </span>
            <div>
              <h1 className="text-base font-black text-slate-900">بوابة أعضاء نادي التمريض الماسية 💎</h1>
              <p className="text-xs text-slate-500">منصة إدارة اللجان وتسهيل مهام الأعضاء</p>
            </div>
          </div>
          <Link
            href="/"
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all border border-slate-200"
          >
            الرئيسية ←
          </Link>
        </div>

        {/* لوحة العضو الذكية الترحيبية */}
        <div className="bg-gradient-to-r from-[#630517] to-[#80071D] rounded-3xl p-8 text-white shadow-xl space-y-6">
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div className="space-y-2">
              <span className="bg-[#F5D061] text-[#630517] font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-wider">
                {isAdmin ? 'إداري النظام ورئاسة النادي 🛡️' : 'عضو مفعل في المنصة ✨'}
              </span>
              <h2 className="text-2xl font-black">أهلاً بك، {currentUserName || 'زميلنا العزيز'} 👋</h2>
              <p className="text-xs text-white/80 max-w-xl leading-relaxed">
                هذه بوابتك الخاصة لمتابعة لجانك، إرسال اعتذارات الحضور بمرونة تامة، الوصول لروابط قروبات الواتساب، وتأدية المهام.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md px-5 py-4 rounded-2xl border border-white/20 text-center space-y-1">
              <span className="block text-xs text-white/70">رتبتك الحالية</span>
              <span className="text-sm font-black text-[#F5D061]">{userRole}</span>
            </div>
          </div>

          {userNotification && (
            <div className="bg-amber-400 text-slate-900 p-4 rounded-2xl text-xs font-black shadow-md flex items-center gap-3">
              <span>🔔 إشعار إداري جديد:</span>
              <span>{userNotification}</span>
            </div>
          )}
        </div>

        {/* شبكة اللجان السبع التفاعلية */}
        <div className="space-y-6">
          <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
            <div>
              <h3 className="text-xl font-black text-slate-900">لجان نادي كلية التمريض (حسب تخصصك ولجنتك)</h3>
              <p className="text-xs text-slate-500">اختر لجنتك للانتقال لبوابة المهام الخاصة بك والأعضاء:</p>
            </div>
            <span className="px-3 py-1 bg-slate-100 text-slate-600 font-bold text-xs rounded-xl">7 لجان رئيسية</span>
          </div>

          {loading ? (
            <div className="py-20 text-center text-slate-400">جاري تحميل بيانات اللجان والأعضاء من السحابة... ⏳</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {committeesList.map((comm) => (
                <div key={comm.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-6 group">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="w-12 h-12 rounded-2xl bg-[#630517]/10 flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform">
                        {comm.icon}
                      </span>
                      <span className="text-[10px] font-bold text-[#630517] bg-[#630517]/10 px-3 py-1 rounded-full">
                        {comm.members?.length || 0} أعضاء
                      </span>
                    </div>

                    <h4 className="text-lg font-black text-slate-900">{comm.name}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{comm.description}</p>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <div className="text-[11px] text-slate-500 space-y-1">
                      <p><strong>👨‍✈️ قادة الطلاب:</strong> {comm.maleLeader}</p>
                      <p><strong>👩‍✈️ قادة الطالبات:</strong> {comm.femaleLeader}</p>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <Link
                        href={`/team/${comm.id}`}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-[#630517] text-[#F5D061] font-black text-xs text-center shadow hover:brightness-110 transition-all"
                      >
                        دخول بوابة اللجنة ➔
                      </Link>

                      {comm.whatsappLink && (
                        <a
                          href={comm.whatsappLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2.5 px-3 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow hover:bg-emerald-700 transition-all flex items-center justify-center"
                          title="رابط قروب الواتساب"
                        >
                          💬 واتساب
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}