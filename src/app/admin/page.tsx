'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'events' | 'team' | 'requests' | 'banners'>('events');

  // 1. إدارة الفعاليات والبوسترات
  const [events, setEvents] = useState([
    {
      id: '1',
      title: 'ملتقى التمريض التفاعلي 2026',
      date: '25 سبتمبر 2026',
      location: 'مسرح جامعة حفر الباطن',
      status: 'upcoming',
      poster: '/logo.png',
      description: 'ملتقى يهدف إلى استعراض أحدث الممارسات في التمريض وورش عمل تفاعلية.'
    },
    {
      id: '2',
      title: 'حملة التوعية بالسكري',
      date: '15 مايو 2026',
      location: 'المجمع التجاري - حفر الباطن',
      status: 'past',
      poster: '/logo.png',
      description: 'حملة ميدانية استهدفت التوعية بأخطار السكري وتقديم فحوصات مجانية.'
    }
  ]);

  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newStatus, setNewStatus] = useState<'upcoming' | 'past'>('upcoming');
  const [newPoster, setNewPoster] = useState('/logo.png');
  const [newDesc, setNewDesc] = useState('');

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const newEvent = {
      id: Date.now().toString(),
      title: newTitle,
      date: newDate || 'قريباً',
      location: newLocation || 'جامعة حفر الباطن',
      status: newStatus,
      poster: newPoster || '/logo.png',
      description: newDesc || 'فعالية تابعة لنادي التمريض.'
    };
    const updatedEvents = [newEvent, ...events];
    setEvents(updatedEvents);
    localStorage.setItem('UHB_EVENTS', JSON.stringify(updatedEvents));
    setNewTitle('');
    setNewDate('');
    setNewLocation('');
    setNewDesc('');
  };

  const handleDeleteEvent = (id: string) => {
    const updatedEvents = events.filter(ev => ev.id !== id);
    setEvents(updatedEvents);
    localStorage.setItem('UHB_EVENTS', JSON.stringify(updatedEvents));
  };

  // 2. إدارة البانرات والهيدر
  const [banners, setBanners] = useState([
    {
      id: '1',
      tag: 'نادي التمريض • جامعة حفر الباطن',
      title: 'نادي التمريض',
      image: '/header-banner.png',
      buttonText: 'اكتشف النادي',
      buttonLink: '/discover'
    }
  ]);

  const [bannerTag, setBannerTag] = useState('');
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerImage, setBannerImage] = useState('/header-banner.png');

  // 3. طلبات الانضمام (من Firebase)
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    // جلب الفعاليات والبانرات من التخزين المحلي
    const savedEvents = localStorage.getItem('UHB_EVENTS');
    if (savedEvents) {
      try {
        const parsed = JSON.parse(savedEvents);
        if (parsed && parsed.length > 0) setEvents(parsed);
      } catch (e) {
        console.error(e);
      }
    }

    const savedBanners = localStorage.getItem('UHB_BANNERS');
    if (savedBanners) {
      try {
        const parsed = JSON.parse(savedBanners);
        if (parsed && parsed.length > 0) setBanners(parsed);
      } catch (e) {
        console.error(e);
      }
    }

    // جلب الطلبات الحقيقية من Firebase
    const fetchRequests = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'applications'));
        const fetchedRequests = querySnapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
        if (fetchedRequests.length > 0) {
          setRequests(fetchedRequests);
        }
      } catch (err) {
        console.error('Error fetching applications:', err);
      }
    };

    fetchRequests();
  }, []);

  const handleAddBanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerTitle.trim()) return;
    const newBanner = {
      id: Date.now().toString(),
      tag: bannerTag || 'مناسبة خاصة',
      title: bannerTitle,
      image: bannerImage || '/header-banner.png',
      buttonText: 'اكتشف النادي',
      buttonLink: '/discover'
    };
    const updatedBanners = [newBanner, ...banners];
    setBanners(updatedBanners);
    localStorage.setItem('UHB_BANNERS', JSON.stringify(updatedBanners));
    setBannerTag('');
    setBannerTitle('');
    alert('تم إضافة وتفعيل البانر بنجاح في الواجهة الرئيسية!');
  };

  const handleDeleteBanner = (id: string) => {
    const updatedBanners = banners.filter(b => b.id !== id);
    setBanners(updatedBanners);
    localStorage.setItem('UHB_BANNERS', JSON.stringify(updatedBanners));
  };

  const handleAcceptRequest = async (id: string) => {
    try {
      const docRef = doc(db, 'applications', id);
      await updateDoc(docRef, { status: 'تم القبول ✓' });
      setRequests(requests.map(req => req.id === id ? { ...req, status: 'تم القبول ✓' } : req));
    } catch (err) {
      console.error('Error accepting request:', err);
    }
  };

  const handleDeleteRequest = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'applications', id));
      setRequests(requests.filter(req => req.id !== id));
    } catch (err) {
      console.error('Error deleting request:', err);
    }
  };

  // 4. إدارة اللجان والقادة والأعضاء
  const [committees, setCommittees] = useState([
    {
      id: 'design',
      name: 'لجنة التصميم',
      maleLeader: 'عبدالعزيز العنزي',
      femaleLeader: 'شهد المرواني',
      members: [{ name: 'سارة محمد', role: 'مصممة جرافيك' }, { name: 'عمر خالد', role: 'مصمم موشن جرافيك' }]
    },
    {
      id: 'media',
      name: 'لجنة الإعلام',
      maleLeader: 'راشد السبيعي',
      femaleLeader: 'ريم الشمري',
      members: [{ name: 'فيصل السعيد', role: 'مصور ميداني' }]
    },
    {
      id: 'pr',
      name: 'لجنة العلاقات العامة',
      maleLeader: 'خالد القحطاني',
      femaleLeader: 'ديمة العتيبي',
      members: []
    },
    {
      id: 'quality',
      name: 'لجنة الجودة والتطوير',
      maleLeader: 'سلطان الحربي',
      femaleLeader: 'نورة الدوسري',
      members: []
    },
    {
      id: 'scientific',
      name: 'لجنة المحتوى العلمي',
      maleLeader: 'فهد المطيري',
      femaleLeader: 'أفنان العنزي',
      members: []
    },
    {
      id: 'hr',
      name: 'لجنة الموارد البشرية',
      maleLeader: 'تركي العنزي',
      femaleLeader: 'سارة الرشيدي',
      members: []
    },
    {
      id: 'events-org',
      name: 'لجنة التنظيم والفعاليات',
      maleLeader: 'فيصل الدوسري',
      femaleLeader: 'غادة العمري',
      members: []
    },
  ]);

  const [selectedCommitteeId, setSelectedCommitteeId] = useState('design');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('');

  const currentCommittee = committees.find(c => c.id === selectedCommitteeId) || committees[0];

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    setCommittees(committees.map(c => {
      if (c.id === selectedCommitteeId) {
        return {
          ...c,
          members: [...c.members, { name: newMemberName, role: newMemberRole || 'عضو' }]
        };
      }
      return c;
    }));
    setNewMemberName('');
    setNewMemberRole('');
  };

  const handleDeleteMember = (index: number) => {
    setCommittees(committees.map(c => {
      if (c.id === selectedCommitteeId) {
        const updatedMembers = [...c.members];
        updatedMembers.splice(index, 1);
        return { ...c, members: updatedMembers };
      }
      return c;
    }));
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 selection:bg-[#630517] selection:text-[#F5D061]" dir="rtl">
      
      {/* شريط الأدمن العلوي */}
      <div className="bg-white border-b border-slate-200 py-4 px-6 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-[#630517] text-[#F5D061] flex items-center justify-center font-black text-lg shadow">
            UHB
          </span>
          <div>
            <h1 className="text-lg font-black text-slate-900">لوحة تحكم نادي التمريض (صلاحيات كاملة)</h1>
            <p className="text-xs text-slate-500">إدارة البانرات، الفعاليات، اللجان، الأعضاء، والطلبات بكل صلاحية</p>
          </div>
        </div>

        <Link
          href="/"
          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all border border-slate-200"
        >
          العودة للموقع الرئيسي ←
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

        {/* أزرار التنقل بين الأقسام */}
        <div className="flex flex-wrap gap-3 border-b border-slate-200 pb-4">
          {[
            { id: 'events', label: '📅 إدارة الفعاليات والبوسترات' },
            { id: 'banners', label: '🖼️ إدارة البانرات (الهيدر)' },
            { id: 'team', label: '👥 إدارة القادة والأعضاء باللجان' },
            { id: 'requests', label: '📥 طلبات الانضمام (Firebase)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-2.5 rounded-2xl font-bold text-sm transition-all shadow-sm ${
                activeTab === tab.id
                  ? 'bg-[#630517] text-[#F5D061] shadow-md scale-105'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 1. قسم الفعاليات والبوسترات */}
        {activeTab === 'events' && (
          <div className="space-y-8">
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-xl font-black text-slate-900">إضافة فعالية جديدة مع البوستر</h3>
              
              <form onSubmit={handleAddEvent} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">عنوان الفعالية</label>
                  <input
                    type="text"
                    placeholder="مثال: ملتقى التمريض السنوي"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#630517]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">التاريخ</label>
                  <input
                    type="text"
                    placeholder="مثال: 25 سبتمبر 2026"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#630517]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">المكان</label>
                  <input
                    type="text"
                    placeholder="مثال: مسرح جامعة حفر الباطن"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#630517]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">الحالة</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white"
                  >
                    <option value="upcoming">قريباً</option>
                    <option value="past">انتهت</option>
                  </select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-600">مسار البوستر (صورة)</label>
                  <input
                    type="text"
                    placeholder="مثال: /logo.png"
                    value={newPoster}
                    onChange={(e) => setNewPoster(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#630517]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="bg-[#630517] text-[#F5D061] px-8 py-3 rounded-xl font-bold text-xs shadow hover:brightness-110 transition-all"
                  >
                    + نشر الفعالية في الموقع
                  </button>
                </div>
              </form>
            </div>

            {/* جدول الفعاليات */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xl font-black text-slate-900">الفعاليات الحالية ({events.length})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold">
                      <th className="pb-3 pr-2">الفعالية</th>
                      <th className="pb-3">التاريخ والمكان</th>
                      <th className="pb-3">الحالة</th>
                      <th className="pb-3 text-left pl-2">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {events.map((ev) => (
                      <tr key={ev.id} className="hover:bg-slate-50">
                        <td className="py-4 pr-2 font-bold text-slate-900">{ev.title}</td>
                        <td className="py-4 text-slate-600">{ev.date} | 📍 {ev.location}</td>
                        <td className="py-4">
                          <span className={`px-2.5 py-1 rounded-full font-bold ${ev.status === 'upcoming' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>
                            {ev.status === 'upcoming' ? 'قريباً' : 'انتهت'}
                          </span>
                        </td>
                        <td className="py-4 text-left pl-2">
                          <button
                            onClick={() => handleDeleteEvent(ev.id)}
                            className="px-3 py-1 rounded-lg bg-red-50 text-red-600 font-bold hover:bg-red-100"
                          >
                            حذف
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 2. قسم إدارة البانرات (الهيدر) */}
        {activeTab === 'banners' && (
          <div className="space-y-8">
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-xl font-black text-slate-900">إضافة بانر رئيسي جديد (اليوم الوطني / المناسبات)</h3>
              
              <form onSubmit={handleAddBanner} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">نص الشارة العلوية</label>
                  <input
                    type="text"
                    placeholder="مثال: اليوم الوطني السعودي 🇸🇦"
                    value={bannerTag}
                    onChange={(e) => setBannerTag(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#630517]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">عنوان البانر الرئيسي</label>
                  <input
                    type="text"
                    placeholder="مثال: نحتفل بالوطن ونمضي قدماً"
                    value={bannerTitle}
                    onChange={(e) => setBannerTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#630517]"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-600">مسار صورة البانر (في مجلد public)</label>
                  <input
                    type="text"
                    placeholder="مثال: /header-banner.png"
                    value={bannerImage}
                    onChange={(e) => setBannerImage(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#630517]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="bg-[#630517] text-[#F5D061] px-8 py-3 rounded-xl font-bold text-xs shadow hover:brightness-110 transition-all"
                  >
                    + إضافة وتفعيل البانر في الواجهة
                  </button>
                </div>
              </form>
            </div>

            {/* جدول البانرات الحالية */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xl font-black text-slate-900">البانرات النشطة ({banners.length})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold">
                      <th className="pb-3 pr-2">الشارة</th>
                      <th className="pb-3">العنوان</th>
                      <th className="pb-3">مسار الصورة</th>
                      <th className="pb-3 text-left pl-2">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {banners.map((ban) => (
                      <tr key={ban.id} className="hover:bg-slate-50">
                        <td className="py-4 pr-2 font-bold text-[#630517]">{ban.tag}</td>
                        <td className="py-4 text-slate-900 font-extrabold">{ban.title}</td>
                        <td className="py-4 text-slate-500">{ban.image}</td>
                        <td className="py-4 text-left pl-2">
                          <button
                            onClick={() => handleDeleteBanner(ban.id)}
                            className="px-3 py-1 rounded-lg bg-red-50 text-red-600 font-bold hover:bg-red-100"
                          >
                            حذف
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 3. قسم إدارة اللجان والقادة والأعضاء */}
        {activeTab === 'team' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-extrabold text-slate-900">اختر اللجنة لإدارة قادتها وأعضائها</h3>
              <div className="flex flex-wrap gap-2">
                {committees.map((com) => (
                  <button
                    key={com.id}
                    onClick={() => setSelectedCommitteeId(com.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      selectedCommitteeId === com.id
                        ? 'bg-[#630517] text-[#F5D061] shadow'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {com.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <h3 className="text-xl font-black text-slate-900">إدارة {currentCommittee.name}</h3>
                <span className="text-xs bg-[#630517]/10 text-[#630517] font-bold px-3 py-1 rounded-full">
                  {currentCommittee.members.length} أعضاء
                </span>
              </div>

              {/* تعديل القادة */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">قائد الطلاب</label>
                  <input
                    type="text"
                    value={currentCommittee.maleLeader}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCommittees(committees.map(c => c.id === selectedCommitteeId ? { ...c, maleLeader: val } : c));
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#630517]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">قائدة الطالبات</label>
                  <input
                    type="text"
                    value={currentCommittee.femaleLeader}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCommittees(committees.map(c => c.id === selectedCommitteeId ? { ...c, femaleLeader: val } : c));
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#630517]"
                  />
                </div>
              </div>

              {/* إدارة الأعضاء */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="font-extrabold text-slate-900 text-sm">قائمة الأعضاء المنضمين</h4>
                {currentCommittee.members.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center bg-slate-50 rounded-2xl">لا يوجد أعضاء حالياً.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 font-bold">
                          <th className="pb-2 pr-2">اسم العضو</th>
                          <th className="pb-2">الدور</th>
                          <th className="pb-2 text-left pl-2">إجراء</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {currentCommittee.members.map((m, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-3 pr-2 font-bold text-slate-900">{m.name}</td>
                            <td className="py-3 text-slate-600">{m.role}</td>
                            <td className="py-3 text-left pl-2">
                              <button
                                onClick={() => handleDeleteMember(idx)}
                                className="px-3 py-1 rounded-lg bg-red-50 text-red-600 font-bold hover:bg-red-100"
                              >
                                حذف
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <form onSubmit={handleAddMember} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100">
                  <input
                    type="text"
                    placeholder="اسم العضو الجديد"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#630517]"
                  />
                  <input
                    type="text"
                    placeholder="الدور أو المهمة"
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#630517]"
                  />
                  <button
                    type="submit"
                    className="bg-[#630517] text-[#F5D061] py-2.5 rounded-xl font-bold text-xs shadow hover:brightness-110"
                  >
                    + إضافة عضو للجنة
                  </button>
                </form>
              </div>

            </div>
          </div>
        )}

        {/* 4. طلبات الانضمام الحقيقية من Firebase */}
        {activeTab === 'requests' && (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-xl font-black text-slate-900">طلبات انضمام الأعضاء (من قاعدة البيانات)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold">
                    <th className="pb-3 pr-2">اسم المتقدم</th>
                    <th className="pb-3">الرقم الجامعي / التخصص</th>
                    <th className="pb-3">اللجنة الأولى</th>
                    <th className="pb-3">الحالة</th>
                    <th className="pb-3 text-left pl-2">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">لا توجد طلبات انضمام مسجلة حتى الآن.</td>
                    </tr>
                  ) : (
                    requests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50">
                        <td className="py-4 pr-2 font-bold text-slate-900">{req.fullName}</td>
                        <td className="py-4 text-slate-600">{req.universityId} - {req.major}</td>
                        <td className="py-4 text-slate-700 font-bold">{req.firstChoice}</td>
                        <td className="py-4">
                          <span className="px-2.5 py-1 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            {req.status || 'معلق'}
                          </span>
                        </td>
                        <td className="py-4 text-left pl-2 flex gap-2 justify-end">
                          <button
                            onClick={() => handleAcceptRequest(req.id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-bold hover:bg-emerald-100"
                          >
                            قبول
                          </button>
                          <button
                            onClick={() => handleDeleteRequest(req.id)}
                            className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 font-bold hover:bg-red-100"
                          >
                            رفض
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}