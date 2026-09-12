'use client';

import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

interface StudentAchievement {
  id: string;
  studentName: string;
  awardName: string;
  image: string;
  description: string;
  createdAt: string;
}

export default function StudentAchievementsSection() {
  const [achievements, setAchievements] = useState<StudentAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const snap = await getDocs(collection(db, 'student_achievements'));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as StudentAchievement[];
        setAchievements(list);
      } catch (err) {
        console.error('Error fetching student achievements:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAchievements();
  }, []);

  if (loading) {
    return null;
  }

  if (achievements.length === 0) {
    return null; // لا يتم عرض القسم إذا لم يقم الأدمن بإضافة أي إنجاز بعد
  }

  return (
    <section className="py-16 bg-gradient-to-b from-amber-50/40 via-white to-slate-50" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* عنوان القسم */}
        <div className="text-center space-y-3">
          <span className="bg-amber-100 text-amber-800 font-black text-xs px-4 py-1.5 rounded-full uppercase tracking-wider inline-block shadow-sm">
            🏆 نبض التميز والفخر
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            إنجازات طلبة كلية التمريض
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto font-medium">
            نحتفي بنخبة من طلاب وطالبات كلية التمريض بجامعة حفر الباطن الحاصلين على جوائز ومراكز متقدمة تمثل فخر الكلية ونادي التمريض.
          </p>
        </div>

        {/* شبكة إنجازات الطلبة */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {achievements.map((ach) => (
            <div 
              key={ach.id} 
              className="bg-white rounded-3xl p-6 border border-amber-200/80 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-6 group"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img 
                      src={ach.image || '/logo.png'} 
                      alt={ach.studentName} 
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-400 shadow-md group-hover:scale-105 transition-transform" 
                    />
                    <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] shadow">
                      ⭐
                    </div>
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-sm sm:text-base group-hover:text-amber-700 transition-colors">
                      {ach.studentName}
                    </h3>
                    <span className="text-[11px] bg-amber-100/80 text-amber-900 px-3 py-1 rounded-full font-extrabold inline-block mt-1.5 border border-amber-200">
                      {ach.awardName}
                    </span>
                  </div>
                </div>

                <p className="text-slate-700 text-xs sm:text-sm font-medium bg-amber-50/40 p-4 rounded-2xl border border-amber-100/60 leading-relaxed shadow-inner">
                  "{ach.description}"
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-400 font-bold">
                <span>كلية التمريض - جامعة حفر الباطن</span>
                <span>{new Date(ach.createdAt).toLocaleDateString('ar-SA')}</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}