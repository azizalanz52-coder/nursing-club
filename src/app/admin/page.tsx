'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';

interface PassionSlide {
  id: string;
  image: string;
  quote: string;
}

interface DiscoverEvent {
  id: string;
  title: string;
  category: string;
  description: string;
  images: string[];
}

interface EventItem {
  id: string;
  title: string;
  date: string;
  location: string;
  status: 'upcoming' | 'past';
  poster: string;
  description: string;
}

interface BannerItem {
  id: string;
  tag: string;
  title: string;
  image: string;
  buttonText: string;
  buttonLink: string;
}

interface CommitteeMember {
  name: string;
  role: string;
  status: string;
}

interface Committee {
  id: string;
  name: string;
  maleLeader: string;
  femaleLeader: string;
  members: CommitteeMember[];
}

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'events' | 'team' | 'requests' | 'banners' | 'discover' | 'passion'>('discover');

  useEffect(() => {
    const phone = localStorage.getItem('userPhone');
    if (phone !== '0553731265') {
      alert('عذراً، هذه الصفحة مخصصة للمدير فقط.');
      router.push('/');
    }
  }, [router]);

  // Convert uploaded image file to Base64 to save safely in Firestore database
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Passion Slides States
  const [passionSlides, setPassionSlides] = useState<PassionSlide[]>([]);
  const [newPassionQuote, setNewPassionQuote] = useState<string>('');
  const [newPassionImage, setNewPassionImage] = useState<string>('/header-banner.png');

  // Discover Events States
  const [discoverEvents, setDiscoverEvents] = useState<DiscoverEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [newDiscTitle, setNewDiscTitle] = useState<string>('');
  const [newDiscCategory, setNewDiscCategory] = useState<string>('أنشطة كبرى');
  const [newDiscDesc, setNewDiscDesc] = useState<string>('');
  const [newDiscImages, setNewDiscImages] = useState<string[]>([]);

  // Other States
  const [events, setEvents] = useState<EventItem[]>([
    {
      id: '1',
      title: 'ملتقى التمريض التفاعلي 2026',
      date: '25 سبتمبر 2026',
      location: 'مسرح جامعة حفر الباطن',
      status: 'upcoming',
      poster: '/header-banner.png',
      description: 'ملتقى يهدف إلى استعراض أحدث الممارسات في التمريض وورش عمل تفاعلية.'
    }
  ]);

  const [newTitle, setNewTitle] = useState<string>('');
  const [newDate, setNewDate] = useState<string>('');
  const [newLocation, setNewLocation] = useState<string>('');
  const [newStatus, setNewStatus] = useState<'upcoming' | 'past'>('upcoming');
  const [newPoster, setNewPoster] = useState<string>('/header-banner.png');
  const [newDesc, setNewDesc] = useState<string>('');

  const [banners, setBanners] = useState<BannerItem[]>([
    {
      id: '1',
      tag: 'نادي التمريض • جامعة حفر الباطن',
      title: 'نادي التمريض',
      image: '/header-banner.png',
      buttonText: 'اكتشف النادي',
      buttonLink: '/discover'
    }
  ]);

  const [bannerTag, setBannerTag] = useState<string>('');
  const [bannerTitle, setBannerTitle] = useState<string>('');
  const [bannerImage, setBannerImage] = useState<string>('/header-banner.png');

  const [requests, setRequests] = useState<Record<string, string>[]>([]);

  const [committees, setCommittees] = useState<Committee[]>([
    { 
      id: 'design', 
      name: 'التصميم', 
      maleLeader: 'عبدالعزيز العنزي', 
      femaleLeader: 'شجون الحربي', 
      members: [
        { name: 'سارة محمد', role: 'مصممة جرافيك', status: 'نشط' },
        { name: 'عمر خالد', role: 'مصمم موشن جرافيك', status: 'نشط' },
        { name: 'فاطمة أحمد', role: 'مسؤولة الهوية البصرية', status: 'نشط' }
      ] 
    },
    { id: 'media', name: 'الاعلام', maleLeader: 'راشد السبيعي', femaleLeader: 'ريم الشمري', members: [] },
    { id: 'events-org', name: 'تنظيم الفعاليات', maleLeader: 'فيصل الدوسري', femaleLeader: 'غادة العمري', members: [] },
    { id: 'hr', name: 'الموارد البشرية', maleLeader: 'تركي العنزي', femaleLeader: 'سارة الرشيدي', members: [] },
    { id: 'pr', name: 'العلاقات العامة', maleLeader: 'خالد القحطاني', femaleLeader: 'ديمة العتيبي', members: [] },
    { id: 'scientific', name: 'المحتوى العلمي', maleLeader: 'فهد المطيري', femaleLeader: 'أفنان العنزي', members: [] },
    { id: 'quality', name: 'الجودة والتطوير', maleLeader: 'سلطان الحربي', femaleLeader: 'نورة الدوسري', members: [] },
  ]);

  const [selectedCommitteeId, setSelectedCommitteeId] = useState<string>('design');
  const currentCommittee = committees.find((c) => c.id === selectedCommitteeId) || committees[0];

  const [newMemberName, setNewMemberName] = useState<string>('');
  const [newMemberRole, setNewMemberRole] = useState<string>('');

  // Fetch Cloud & Local Data on Mount
  useEffect(() => {
    // Local storage items
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

    // Cloud Firebase Fetching
    const fetchCloudData = async () => {
      try {
        // Passion Slides Cloud
        const passionSnap = await getDocs(collection(db, 'site_passion_slides'));
        if (!passionSnap.empty) {
          const slides: PassionSlide[] = [];
          passionSnap.forEach((d) => {
            slides.push({ id: d.id, ...d.data() } as PassionSlide);
          });
          setPassionSlides(slides);
        } else {
          const defaultSlides: PassionSlide[] = [
            { id: '1', image: '/header-banner.png', quote: '«التمريض ليس مجرد مهنة، بل هو فن وعِلم يلامس حياة الإنسان في أصعب لحظاته.»' },
            { id: '2', image: '/logo.png', quote: '«بالعطاء المستمر والعمل الجماعي نصنع أثراً يخلده الزمن في قلوب المجتمع.»' },
            { id: '3', image: '/header-banner.png', quote: '«نطمح لأن نكون المنارة التي تضيء دروب التميز لكل ممرض وممرضة في جامعة حفر الباطن.»' }
          ];
          setPassionSlides(defaultSlides);
        }

        // Discover Events Cloud
        const discoverSnap = await getDocs(collection(db, 'site_discover_events'));
        if (!discoverSnap.empty) {
          const eventsList: DiscoverEvent[] = [];
          discoverSnap.forEach((d) => {
            eventsList.push({ id: d.id, ...d.data() } as DiscoverEvent);
          });
          setDiscoverEvents(eventsList);
          setSelectedEventId(eventsList[0]?.id || '');
        } else {
          const defaultEvents: DiscoverEvent[] = [
            {
              id: '1',
              title: 'حفل تدشين نادي كلية التمريض',
              category: 'أنشطة كبرى',
              description: 'دشن وكيل الجامعة للشؤون الأكاديمية أ.د. محمد بن عتيق العنزي، وبحضور عميد كلية التمريض د. جلال نعيم الحربي، نادي كلية التمريض - شطر الطلاب لحظة فخر في مسيرة الكلية، سُعدنا فيها بحضوركم ومشاركتكم، وبإذن الله القادم أجمل',
              images: ['/logo.png', '/header-banner.png']
            },
            {
              id: '2',
              title: 'حملة القياسات الحيوية والتثقيف الصحي',
              category: 'خدمة المجتمع',
              description: 'فعالية توعوية ميدانية لقياس العلامات الحيوية وتقديم الاستشارات للزوار.',
              images: ['/logo.png', '/header-banner.png']
            }
          ];
          setDiscoverEvents(defaultEvents);
          setSelectedEventId('1');
        }

        // Applications Requests
        const querySnapshot = await getDocs(collection(db, 'applications'));
        const fetchedRequests = querySnapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        })) as Record<string, string>[];
        if (fetchedRequests.length > 0) {
          setRequests(fetchedRequests);
        }

        // Committees
        const commSnapshot = await getDocs(collection(db, 'committees'));
        if (!commSnapshot.empty) {
          const cloudMap: Record<string, Partial<Committee>> = {};
          commSnapshot.forEach((d) => { cloudMap[d.id] = d.data() as Partial<Committee>; });
          setCommittees((prev) => prev.map((c) => cloudMap[c.id] ? { ...c, ...cloudMap[c.id] } : c));
        }
      } catch (err) {
        console.error('Error fetching cloud data:', err);
      }
    };

    fetchCloudData();
  }, []);

  // --- Passion Slides Cloud Handlers ---
  const handleAddPassionSlide = async (e: FormEvent) => {
    e.preventDefault();
    const slideId = Date.now().toString();
    const newSlide: PassionSlide = {
      id: slideId,
      image: newPassionImage,
      quote: newPassionQuote || 'شغف، عطاء، واحترافية في خدمة المجتمع.'
    };

    try {
      await setDoc(doc(db, 'site_passion_slides', slideId), newSlide);
      const updated = [...passionSlides, newSlide];
      setPassionSlides(updated);
      setNewPassionQuote('');
      setNewPassionImage('/header-banner.png');
      alert('تم إضافة الشريحة وحفظها سحابياً للجميع بنجاح!');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء الحفظ السحابي.');
    }
  };

  const handleDeletePassionSlide = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'site_passion_slides', id));
      const updated = passionSlides.filter((s) => s.id !== id);
      setPassionSlides(updated);
      alert('تم حذف الشريحة من السحابة بنجاح.');
    } catch (err) {
      console.error(err);
    }
  };

  // --- Discover Events Cloud Handlers ---
  const handleSelectMultipleImagesForNewEvent = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const base64Images: string[] = [];
      for (const file of filesArray) {
        const base64 = await convertFileToBase64(file);
        base64Images.push(base64);
      }
      setNewDiscImages((prev) => [...prev, ...base64Images]);
    }
  };

  const handleCreateNewDiscoverEvent = async (e: FormEvent) => {
    e.preventDefault();
    if (!newDiscTitle.trim()) {
      alert('يرجى كتابة عنوان الفعالية.');
      return;
    }
    const eventId = Date.now().toString();
    const newEventObj: DiscoverEvent = {
      id: eventId,
      title: newDiscTitle,
      category: newDiscCategory,
      description: newDiscDesc || 'فعالية تابعة لنادي التمريض بجامعة حفر الباطن.',
      images: newDiscImages.length > 0 ? newDiscImages : ['/logo.png']
    };

    try {
      await setDoc(doc(db, 'site_discover_events', eventId), newEventObj);
      const updated = [newEventObj, ...discoverEvents];
      setDiscoverEvents(updated);
      setSelectedEventId(eventId);
      setNewDiscTitle('');
      setNewDiscDesc('');
      setNewDiscImages([]);
      alert('تم إنشاء الفعالية ونشر الصور سحابياً للجميع في المعرض!');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء النشر السحابي.');
    }
  };

  const handleAddMultipleImagesToExistingEvent = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && selectedEventId) {
      const filesArray = Array.from(e.target.files);
      const base64Images: string[] = [];
      for (const file of filesArray) {
        const base64 = await convertFileToBase64(file);
        base64Images.push(base64);
      }

      const targetEvent = discoverEvents.find((ev) => ev.id === selectedEventId);
      if (!targetEvent) return;

      const updatedImages = [...targetEvent.images, ...base64Images];
      const updatedEventObj = { ...targetEvent, images: updatedImages };

      try {
        await setDoc(doc(db, 'site_discover_events', selectedEventId), updatedEventObj);
        const updatedList = discoverEvents.map((ev) => (ev.id === selectedEventId ? updatedEventObj : ev));
        setDiscoverEvents(updatedList);
        alert('تم رفع وإضافة الصور سحابياً بنجاح للجميع!');
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleRemoveImageFromEvent = async (imgIndex: number) => {
    const targetEvent = discoverEvents.find((ev) => ev.id === selectedEventId);
    if (!targetEvent) return;

    const filteredImages = targetEvent.images.filter((_, idx) => idx !== imgIndex);
    const updatedImages = filteredImages.length > 0 ? filteredImages : ['/logo.png'];
    const updatedEventObj = { ...targetEvent, images: updatedImages };

    try {
      await setDoc(doc(db, 'site_discover_events', selectedEventId), updatedEventObj);
      const updatedList = discoverEvents.map((ev) => (ev.id === selectedEventId ? updatedEventObj : ev));
      setDiscoverEvents(updatedList);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteEntireDiscoverEvent = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذه الفعالية بالكامل من المعرض والسحابة؟')) {
      try {
        await deleteDoc(doc(db, 'site_discover_events', id));
        const updated = discoverEvents.filter((ev) => ev.id !== id);
        setDiscoverEvents(updated);
        if (updated.length > 0) setSelectedEventId(updated[0].id);
        alert('تم حذف الفعالية سحابياً بنجاح.');
      } catch (err) {
        console.error(err);
      }
    }
  };

  const currentEditedEvent = discoverEvents.find((ev) => ev.id === selectedEventId) || discoverEvents[0];

  // --- Other Handlers ---
  const handleAddEvent = (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      alert('يرجى كتابة عنوان الفعالية.');
      return;
    }
    const newEvent: EventItem = {
      id: Date.now().toString(),
      title: newTitle,
      date: newDate || 'قريباً',
      location: newLocation || 'جامعة حفر الباطن',
      status: newStatus,
      poster: newPoster,
      description: newDesc || 'فعالية تابعة لنادي التمريض.'
    };
    const updatedEvents = [newEvent, ...events];
    setEvents(updatedEvents);
    localStorage.setItem('UHB_EVENTS', JSON.stringify(updatedEvents));
    setNewTitle('');
    setNewDate('');
    setNewLocation('');
    setNewPoster('/header-banner.png');
    setNewDesc('');
    alert('تم نشر الفعالية وحفظها بنجاح!');
  };

  const handleDeleteEvent = (id: string) => {
    const updatedEvents = events.filter((ev) => ev.id !== id);
    setEvents(updatedEvents);
    localStorage.setItem('UHB_EVENTS', JSON.stringify(updatedEvents));
  };

  const handleAddBanner = (e: FormEvent) => {
    e.preventDefault();
    if (!bannerTitle.trim()) {
      alert('يرجى كتابة عنوان البانر.');
      return;
    }
    const newBanner: BannerItem = {
      id: Date.now().toString(),
      tag: bannerTag || 'مناسبة خاصة',
      title: bannerTitle,
      image: bannerImage,
      buttonText: 'اكتشف النادي',
      buttonLink: '/discover'
    };
    const updatedBanners = [newBanner, ...banners];
    setBanners(updatedBanners);
    localStorage.setItem('UHB_BANNERS', JSON.stringify(updatedBanners));
    setBannerTag('');
    setBannerTitle('');
    setBannerImage('/header-banner.png');
    alert('تم إضافة وتفعيل البانر بنجاح في الواجهة الرئيسية!');
  };

  const handleDeleteBanner = (id: string) => {
    const updatedBanners = banners.filter((b) => b.id !== id);
    setBanners(updatedBanners);
    localStorage.setItem('UHB_BANNERS', JSON.stringify(updatedBanners));
  };

  const handleAcceptRequest = async (id: string) => {
    try {
      const docRef = doc(db, 'applications', id);
      await updateDoc(docRef, { status: 'تم القبول ✓' });
      setRequests(requests.map((req) => req.id === id ? { ...req, status: 'تم القبول ✓' } : req));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRequest = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'applications', id));
      setRequests(requests.filter((req) => req.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveLeadersSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'committees', selectedCommitteeId), {
        maleLeader: currentCommittee.maleLeader,
        femaleLeader: currentCommittee.femaleLeader,
        members: currentCommittee.members || []
      }, { merge: true });
      alert(`تم حفظ وتحديث قادة "${currentCommittee.name}" سحابياً بنجاح!`);
    } catch (err) {
      console.error('Error saving leaders:', err);
      alert('حدث خطأ أثناء الحفظ.');
    }
  };

  const handleAddMemberSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    const updatedMembers = [...(currentCommittee.members || []), { name: newMemberName, role: newMemberRole || 'عضو', status: 'نشط' }];
    const updated = committees.map((c) => c.id === selectedCommitteeId ? { ...c, members: updatedMembers } : c);
    setCommittees(updated);
    setNewMemberName('');
    setNewMemberRole('');

    try {
      await setDoc(doc(db, 'committees', selectedCommitteeId), {
        maleLeader: currentCommittee.maleLeader,
        femaleLeader: currentCommittee.femaleLeader,
        members: updatedMembers
      }, { merge: true });
      alert('تم إضافة العضو وحفظه سحابياً بنجاح!');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMember = async (index: number) => {
    const updatedMembers = [...(currentCommittee.members || [])];
    updatedMembers.splice(index, 1);

    const updated = committees.map((c) => c.id === selectedCommitteeId ? { ...c, members: updatedMembers } : c);
    setCommittees(updated);

    try {
      await setDoc(doc(db, 'committees', selectedCommitteeId), {
        maleLeader: currentCommittee.maleLeader,
        femaleLeader: currentCommittee.femaleLeader,
        members: updatedMembers
      }, { merge: true });
      alert('تم حذف العضو وتحديث السحابة بنجاح!');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 selection:bg-[#630517] selection:text-[#F5D061]" dir="rtl">
      
      <div className="bg-white border-b border-slate-200 py-4 px-6 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-[#630517] text-[#F5D061] flex items-center justify-center font-black text-lg shadow">
            UHB
          </span>
          <div>
            <h1 className="text-lg font-black text-slate-900">لوحة تحكم نادي التمريض (سحابي متكامل ☁️)</h1>
            <p className="text-xs text-slate-500">إدارة الفعاليات والبانرات والمعرض وبطاقة شغف وعطاء سحابياً</p>
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

        <div className="flex flex-wrap gap-3 border-b border-slate-200 pb-4">
          {[
            { id: 'discover', label: '🖼️ إدارة معرض "اكتشف النادي" (سحابي)' },
            { id: 'passion', label: '✨ إدارة بطاقة "شغف وعطاء" (سحابي)' },
            { id: 'events', label: '📅 إدارة الفعاليات والبوسترات' },
            { id: 'banners', label: '🖼️ إدارة البانرات (الهيدر)' },
            { id: 'team', label: '👥 إدارة القادة والأعضاء' },
            { id: 'requests', label: '📥 طلبات الانضمام (Firebase)' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
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

        {activeTab === 'discover' && (
          <div className="space-y-8">
            
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-xl font-black text-slate-900">➕ إضافة فعالية جديدة مع معرض صور سحابي</h3>
              
              <form onSubmit={handleCreateNewDiscoverEvent} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">عنوان الفعالية الجديدة</label>
                  <input
                    type="text"
                    placeholder="مثال: حفل تدشين نادي كلية التمريض"
                    value={newDiscTitle}
                    onChange={(e) => setNewDiscTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#630517]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">التصنيف</label>
                  <input
                    type="text"
                    placeholder="مثال: أنشطة كبرى، خدمة المجتمع"
                    value={newDiscCategory}
                    onChange={(e) => setNewDiscCategory(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#630517]"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">وصف الفعالية</label>
                  <textarea
                    rows={3}
                    placeholder="اكتب تفاصيل الفعالية..."
                    value={newDiscDesc}
                    onChange={(e) => setNewDiscDesc(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#630517]"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">اختر صور المعرض (متعددة 📁)</label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleSelectMultipleImagesForNewEvent}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white file:mr-4 file:py-1 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#630517] file:text-[#F5D061] cursor-pointer"
                  />
                  <p className="text-xs text-emerald-700 font-bold mt-1">تم اختيار {newDiscImages.length} صور للفعالية الجديدة جاهزة للرفع السحابي.</p>
                </div>

                {newDiscImages.length > 0 && (
                  <div className="sm:col-span-2 grid grid-cols-4 sm:grid-cols-6 gap-3 pt-2">
                    {newDiscImages.map((img, idx) => (
                      <div key={idx} className="h-20 rounded-xl overflow-hidden border border-slate-200 relative bg-slate-100">
                        <img src={img} alt="معاينة" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}

                <div className="sm:col-span-2 pt-2">
                  <button
                    type="submit"
                    className="bg-[#630517] text-[#F5D061] px-8 py-3 rounded-xl font-black text-xs shadow hover:brightness-110 cursor-pointer"
                  >
                    + رفع ونشر الفعالية سحابياً للجميع
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-xl font-black text-slate-900">إدارة الصور وإضافتها للفعاليات القائمة (سحابي)</h3>
              
              <div className="flex flex-wrap gap-3">
                {discoverEvents.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => setSelectedEventId(ev.id)}
                    className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                      selectedEventId === ev.id
                        ? 'bg-[#630517] text-[#F5D061] shadow'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {ev.title} ({ev.images?.length || 0} صور)
                  </button>
                ))}
              </div>

              {currentEditedEvent && (
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex justify-between items-center flex-wrap gap-4">
                    <h4 className="font-extrabold text-slate-900 text-sm">إضافة صور جديدة لـ: {currentEditedEvent.title}</h4>
                    <button
                      type="button"
                      onClick={() => handleDeleteEntireDiscoverEvent(currentEditedEvent.id)}
                      className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 font-bold text-xs hover:bg-red-100 cursor-pointer"
                    >
                      حذف هذه الفعالية بالكامل من السحابة ✕
                    </button>
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleAddMultipleImagesToExistingEvent}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white file:mr-4 file:py-1 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#630517] file:text-[#F5D061] cursor-pointer"
                  />
                </div>
              )}

              {currentEditedEvent && (
                <div className="space-y-4">
                  <h4 className="font-extrabold text-slate-900 text-sm">الصور الحالية بالسحابة للفعالية ({currentEditedEvent.images?.length || 0})</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                    {currentEditedEvent.images?.map((img, idx) => (
                      <div key={idx} className="relative h-32 rounded-2xl overflow-hidden border border-slate-200 group bg-slate-100 shadow-sm">
                        <img src={img} alt={`صورة ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveImageFromEvent(idx)}
                          className="absolute top-2 right-2 bg-red-600 text-white w-7 h-7 rounded-full text-xs font-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {activeTab === 'passion' && (
          <div className="space-y-8">
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-xl font-black text-slate-900">إدارة صور وعبارات بطاقة "شغف، عطاء، واحترافية" (سحابي)</h3>
              
              <form onSubmit={handleAddPassionSlide} className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">اختر صورة الشريحة من جهازك</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                      if (e.target.files && e.target.files[0]) {
                        const base64 = await convertFileToBase64(e.target.files[0]);
                        setNewPassionImage(base64);
                      }
                    }}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs bg-white file:mr-4 file:py-1 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#630517] file:text-[#F5D061] cursor-pointer"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">المقولة أو العبارة الترويجية</label>
                  <textarea
                    rows={2}
                    placeholder="اكتب العبارة..."
                    value={newPassionQuote}
                    onChange={(e) => setNewPassionQuote(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#630517]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="bg-[#630517] text-[#F5D061] px-6 py-3 rounded-xl font-bold text-xs shadow hover:brightness-110 cursor-pointer"
                  >
                    + إضافة الشريحة سحابياً للجميع
                  </button>
                </div>
              </form>

              <div className="space-y-4">
                <h4 className="font-extrabold text-slate-900 text-sm">الشرائح السحابية الحالية ({passionSlides.length})</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {passionSlides.map((slide) => (
                    <div key={slide.id} className="relative h-44 rounded-2xl overflow-hidden border border-slate-200 group shadow-sm bg-slate-900">
                      <img src={slide.image} alt="شريحة" className="w-full h-full object-cover opacity-50" />
                      <div className="absolute inset-0 p-4 flex flex-col justify-between z-10 text-white text-xs">
                        <p className="font-bold line-clamp-3 text-[#F5D061]">{slide.quote}</p>
                        <button
                          type="button"
                          onClick={() => handleDeletePassionSlide(slide.id)}
                          className="self-end bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-black shadow cursor-pointer"
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

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
                    onChange={(e) => setNewStatus(e.target.value as 'upcoming' | 'past')}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white"
                  >
                    <option value="upcoming">قريباً</option>
                    <option value="past">انتهت</option>
                  </select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-600">اختر بوستر الفعالية من جهازك أو أدخل رابطه</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                      if (e.target.files && e.target.files[0]) {
                        const fileUrl = await convertFileToBase64(e.target.files[0]);
                        setNewPoster(fileUrl);
                      }
                    }}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white file:mr-4 file:py-1 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#630517] file:text-[#F5D061] hover:file:brightness-110 cursor-pointer"
                  />
                  <input
                    type="text"
                    placeholder="أو اكتب مسار الصورة يدوياً"
                    value={newPoster}
                    onChange={(e) => setNewPoster(e.target.value)}
                    className="w-full mt-2 px-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#630517]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="bg-[#630517] text-[#F5D061] px-8 py-3 rounded-xl font-bold text-xs shadow hover:brightness-110 transition-all cursor-pointer"
                  >
                    + نشر الفعالية في الموقع
                  </button>
                </div>
              </form>
            </div>

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
                            type="button"
                            onClick={() => handleDeleteEvent(ev.id)}
                            className="px-3 py-1 rounded-lg bg-red-50 text-red-600 font-bold hover:bg-red-100 cursor-pointer"
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

        {activeTab === 'banners' && (
          <div className="space-y-8">
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-xl font-black text-slate-900">إضافة بانر رئيسي جديد</h3>
              
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
                  <label className="text-xs font-bold text-slate-600">اختر صورة البانر من جهازك أو أدخل رابطها</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                      if (e.target.files && e.target.files[0]) {
                        const fileUrl = await convertFileToBase64(e.target.files[0]);
                        setBannerImage(fileUrl);
                      }
                    }}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white file:mr-4 file:py-1 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#630517] file:text-[#F5D061] hover:file:brightness-110 cursor-pointer"
                  />
                  <input
                    type="text"
                    placeholder="أو اكتب مسار الصورة يدوياً"
                    value={bannerImage}
                    onChange={(e) => setBannerImage(e.target.value)}
                    className="w-full mt-2 px-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#630517]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="bg-[#630517] text-[#F5D061] px-8 py-3 rounded-xl font-bold text-xs shadow hover:brightness-110 transition-all cursor-pointer"
                  >
                    + إضافة وتفعيل البانر في الواجهة
                  </button>
                </div>
              </form>
            </div>

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
                        <td className="py-4 text-slate-500 truncate max-w-xs">{ban.image}</td>
                        <td className="py-4 text-left pl-2">
                          <button
                            type="button"
                            onClick={() => handleDeleteBanner(ban.id)}
                            className="px-3 py-1 rounded-lg bg-red-50 text-red-600 font-bold hover:bg-red-100 cursor-pointer"
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

        {activeTab === 'team' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-extrabold text-slate-900">اختر اللجنة لتعديل قادتها وأعضائها</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'design', name: 'التصميم' },
                  { id: 'media', name: 'الاعلام' },
                  { id: 'events-org', name: 'تنظيم الفعاليات' },
                  { id: 'hr', name: 'الموارد البشرية' },
                  { id: 'pr', name: 'العلاقات العامة' },
                  { id: 'scientific', name: 'المحتوى العلمي' },
                  { id: 'quality', name: 'الجودة والتطوير' },
                ].map((com) => (
                  <button
                    key={com.id}
                    type="button"
                    onClick={() => setSelectedCommitteeId(com.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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

            <form onSubmit={handleSaveLeadersSubmit} className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <h3 className="text-xl font-black text-slate-900">إدارة قادة {currentCommittee.name}</h3>
                <span className="text-xs bg-[#630517]/10 text-[#630517] font-bold px-3 py-1 rounded-full">
                  {(currentCommittee.members || []).length} أعضاء
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">قائد الطلاب</label>
                  <input
                    type="text"
                    value={currentCommittee.maleLeader}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCommittees(committees.map((c) => c.id === selectedCommitteeId ? { ...c, maleLeader: val } : c));
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
                      setCommittees(committees.map((c) => c.id === selectedCommitteeId ? { ...c, femaleLeader: val } : c));
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#630517]"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="bg-[#630517] text-[#F5D061] px-6 py-3 rounded-xl font-black text-xs shadow hover:brightness-110 transition-all cursor-pointer"
                >
                  💾 حفظ وتحديث قادة اللجنة (Submit)
                </button>
              </div>
            </form>

            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
              <h4 className="font-extrabold text-slate-900 text-sm">قائمة الأعضاء المنضمين للجنة</h4>
              {(!currentCommittee.members || currentCommittee.members.length === 0) ? (
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
                              type="button"
                              onClick={() => handleDeleteMember(idx)}
                              className="px-3 py-1 rounded-lg bg-red-50 text-red-600 font-bold hover:bg-red-100 cursor-pointer"
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

              <form onSubmit={handleAddMemberSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100">
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
                  className="bg-[#630517] text-[#F5D061] py-2.5 rounded-xl font-bold text-xs shadow hover:brightness-110 cursor-pointer"
                >
                  + إضافة عضو وحفظه سحابياً
                </button>
              </form>
            </div>

          </div>
        )}

        {activeTab === 'requests' && (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-xl font-black text-slate-900">طلبات انضمام الأعضاء</h3>
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
                            type="button"
                            onClick={() => handleAcceptRequest(req.id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-bold hover:bg-emerald-100 cursor-pointer"
                          >
                            قبول
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRequest(req.id)}
                            className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 font-bold hover:bg-red-100 cursor-pointer"
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