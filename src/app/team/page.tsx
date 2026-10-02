'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

const leaders = [
  { name: "عبدالله محمد المطيري", position: "رئيس النادي" },
  { name: "اريام محمد الجبو", position: "نائب رئيس النادي" },
];

const initialCommittees = [
  { id: 'design', name: 'التصميم', description: 'الهوية البصرية، تصميم البوسترات، والمحتوى المرئي.', icon: '🎨', maleLeader: 'عبدالعزيز العنزي', femaleLeader: 'شجون الحربي' },
  { id: 'media', name: 'الاعلام', description: 'منصات التواصل، التغطيات الحية، وصناعة المحتوى.', icon: '📸', maleLeader: 'راشد السبيعي', femaleLeader: 'ريم الشمري' },
  { id: 'events-org', name: 'تنظيم الفعاليات', description: 'التخطيط الميداني، إدارة الحشود، والفعاليات.', icon: '📅', maleLeader: 'فيصل الدوسري', femaleLeader: 'غادة العمري' },
  { id: 'hr', name: 'الموارد البشرية', description: 'إدارة الأعضاء، المتابعة، والتقييم والتحفيز.', icon: '👥', maleLeader: 'تركي العنزي', femaleLeader: 'سارة الرشيدي' },
  { id: 'pr', name: 'العلاقات العامة', description: 'بناء الشراكات، استقبال الضيوف، والتنسيق الخارجي.', icon: '🌐', maleLeader: 'خالد القحطاني', femaleLeader: 'ديمة العتيبي' },
  { id: 'scientific', name: 'المحتوى العلمي', description: 'المطويات الطبية، المحاضرات، والدعم الأكاديمي.', icon: '🔬', maleLeader: 'فهد المطيري', femaleLeader: 'أفنان العنزي' },
  { id: 'quality', name: 'الجودة والتطوير', description: 'تقييم الأداء، قياس رضا الأعضاء، وتحسين العمل.', icon: '📊', maleLeader: 'سلطان الحربي', femaleLeader: 'نورة الدوسري' },
];

export default function TeamPage() {
  const [committees, setCommittees] = useState(initialCommittees);
  const [showAlertModal, setShowAlertModal] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string>('');

  useEffect(() => {
    const fetchCloudCommittees = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'committees'));
        if (!querySnapshot.empty) {
          const cloudDataMap: Record<string, any> = {};
          querySnapshot.forEach((docSnap) => {
            cloudDataMap[docSnap.id] = docSnap.data();
          });

          const merged = initialCommittees.map((comm) => {
            if (cloudDataMap[comm.id]) {
              return {
                ...comm,
                maleLeader: cloudDataMap[comm.id].maleLeader || comm.maleLeader,
                femaleLeader: cloudDataMap[comm.id].femaleLeader || comm.femaleLeader,
              };
            }
            return comm;
          });
          setCommittees(merged);
        }
      } catch (err) {
        console.error('Error fetching committees:', err);
      }
    };
    fetchCloudCommittees();
  }, []);

  // 🛡️ دالة ذكية تفحص رقم الجوال وتوجه المستخدم للجنته المقبولة حصرياً عند الضغط على بوابة العضو
  const handleMemberPortalClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    const phone = (localStorage.getItem('userPhone') || '').trim();

    if (!phone) {
      setAlertMessage('يرجى تسجيل الدخول برقم الجوال أولاً من الصفحة الرئيسية للوصول إلى بوابتك الخاصة.');
      setShowAlertModal(true);
      return;
    }

    // إذا كان الأدمن
    if (phone === '0553731265') {
      window.location.href = '/team/design';
      return;
    }

    try {
      const appsSnap = await getDocs(collection(db, 'applications'));
      let targetCommitteeId = '';

      if (!appsSnap.empty) {
        appsSnap.forEach((d) => {
          const data = d.data();
          const dataPhone = data.phone ? String(data.phone).trim() : '';
          if (dataPhone === phone && data.status === 'مقبول') {
            const acceptedComm = data.acceptedCommittee || '';
            // مطابقة اسم اللجنة مع معرفاتها
            for (const comm of initialCommittees) {
              if (acceptedComm.includes(comm.name) || acceptedComm.includes(comm.id) || comm.name.includes(acceptedComm)) {
                targetCommitteeId = comm.id;
              }
            }
          }
        });
      }

      if (targetCommitteeId) {
        window.location.href = `/team/${targetCommitteeId}`;
      } else {
        setAlertMessage('عذراً، حسابك غير مسجل كعضو مقبول في أي لجنة حالياً.');
        setShowAlertModal(true);
      }
    } catch (err) {
      console.error(err);
      setAlertMessage('حدث خطأ أثناء التحقق من صلاحيات العضوية.');
      setShowAlertModal(true);
    }
  };

  const handleCommitteeClick = async (e: React.MouseEvent, committee: any) => {
    e.preventDefault();
    const phone = (localStorage.getItem('userPhone') || '').trim();
    const isAdmin = phone === '0553731265';

    if (!phone) {
      setAlertMessage('يجب تسجيل الدخول برقم الجوال أولاً للوصول إلى بوابة الأعضاء.');
      setShowAlertModal(true);
      return;
    }

    if (isAdmin) {
      window.location.href = `/team/${committee.id}`;
      return;
    }

    try {
      const appsSnap = await getDocs(collection(db, 'applications'));
      let isAuthorized = false;

      if (!appsSnap.empty) {
        appsSnap.forEach((d) => {
          const data = d.data();
          const dataPhone = data.phone ? String(data.phone).trim() : '';
          const acceptedComm = data.acceptedCommittee || '';
          const matchesComm = acceptedComm.includes(committee.name) || acceptedComm.includes(committee.id) || committee.name.includes(acceptedComm);

          if (dataPhone === phone && data.status === 'مقبول' && matchesComm) {
            isAuthorized = true;
          }
        });
      }

      if (isAuthorized) {
        window.location.href = `/team/${committee.id}`;
      } else {
        setAlertMessage(`عذراً، هذه البوابة مخصصة لأعضاء (${committee.name}) المقبولين رسمياً فقط.`);
        setShowAlertModal(true);
      }
    } catch (err) {
      console.error(err);
      setAlertMessage('حدث خطأ أثناء التحقق من الصلاحيات.');
      setShowAlertModal(true);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 pb-20" dir="rtl">
      
      {/* ترويسة الصفحة */}
      <div className="bg-[#630517] text-white py-16 px-4 text-center space-y-4 shadow-md">
        <span className="inline-block px-4 py-1.5 rounded-full bg-[#F5D061] text-[#630517] text-xs font-black uppercase tracking-wider">
            الهيكلة التنظيمية
        </span>
        <h1 className="text-3xl sm:text-5xl font-black">رؤساء وقادة لجان نادي التمريض</h1>
        <p className="text-white/80 text-xs sm:text-sm max-w-xl mx-auto">
          تعرف على فريق القيادة في قمة الهرم الإداري، وقادة اللجان الميدانية والأكاديمية لنادي كلية التمريض بجامعة حفر الباطن.
        </p>
        <div className="pt-2 flex justify-center gap-4">
          <Link href="/" className="text-xs text-[#F5D061] underline font-bold">
            ← العودة للرئيسية
          </Link>
          <a href="#" onClick={handleMemberPortalClick} className="text-xs text-white underline font-bold cursor-pointer">
            🛡️ بوابة العضو
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20">
        
        {/* 1. رؤساء النادي أولاً في الأعلى */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs text-[#630517] font-black uppercase tracking-widest bg-[#630517]/10 px-4 py-1 rounded-full">
              قادة النادي
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">رؤساء نادي التمريض</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {leaders.map((leader, index) => (
              <div
                key={index}
                className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-xl text-center space-y-4 hover:border-[#630517] transition-all group"
              >
                <div className="w-24 h-24 mx-auto rounded-full bg-[#630517] text-[#F5D061] flex items-center justify-center text-3xl font-black shadow-md group-hover:scale-105 transition-transform">
                  👑
                </div>
                <h3 className="text-2xl font-black text-slate-900">{leader.name}</h3>
                <span className="inline-block bg-[#F5D061]/20 text-[#630517] font-black px-4 py-1.5 rounded-full text-xs">
                  {leader.position}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* 2. لجان النادي وقادتها بالأسفل */}
        <section className="space-y-8 pt-10 border-t border-slate-200">
          <div className="text-center space-y-2">
            <span className="text-xs text-[#630517] font-black uppercase tracking-widest bg-[#630517]/10 px-4 py-1 rounded-full">
              اللجان التنظيمية
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">لجان نادي التمريض السبع</h2>
            <p className="text-slate-600 text-sm">اضغط على لجنتك المعتمدة لاستعراض تفاصيلها والمهام الخاصة بك</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {committees.map((committee) => (
              <div
                key={committee.id}
                onClick={(e) => handleCommitteeClick(e, committee)}
                className="bg-white rounded-3xl border border-slate-200 p-7 shadow-lg flex flex-col justify-between space-y-6 hover:shadow-xl hover:border-[#630517] hover:scale-[1.02] transition-all cursor-pointer group"
              >
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#630517]/10 flex items-center justify-center text-2xl group-hover:bg-[#630517] group-hover:text-[#F5D061] transition-all">
                    {committee.icon}
                  </div>
                  <h3 className="text-xl font-black text-slate-900 group-hover:text-[#630517] transition-colors">{committee.name}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{committee.description}</p>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                    <span className="text-slate-400 font-bold">قائد الطلاب:</span>
                    <span className="font-extrabold text-slate-900">{committee.maleLeader}</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                    <span className="text-slate-400 font-bold">قائدة الطالبات:</span>
                    <span className="font-extrabold text-slate-900">{committee.femaleLeader}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>

      {showAlertModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-6 border-2 border-[#630517]/20">
            <div className="w-16 h-16 bg-red-100 text-red-700 rounded-2xl mx-auto flex items-center justify-center text-3xl font-bold">
              🔒
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900">منطقة مؤمنة للأعضاء</h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">{alertMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAlertModal(false)}
              className="w-full py-3 rounded-2xl bg-[#630517] text-[#F5D061] font-black text-xs shadow hover:brightness-110 cursor-pointer transition-all"
            >
              حسنًا، فهمت ➔
            </button>
          </div>
        </div>
      )}
    </main>
  );
}