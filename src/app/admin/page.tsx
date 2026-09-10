'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, setDoc, getDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';

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

interface PartnerItem {
  id: string;
  name: string;
  category: string;
  logo: string;
}

interface SuggestionItem {
  id: string;
  name: string;
  content: string;
  createdAt: string;
  status: string;
}

interface CommitteeMember {
  name: string;
  role: string;
  status: string;
  phone?: string;
}

interface Committee {
  id: string;
  name: string;
  maleLeader: string;
  femaleLeader: string;
  members: CommitteeMember[];
}

interface UserAccount {
  phone: string;
  password?: string;
  fullName?: string;
  role?: string;
  assignedCommittee?: string;
  createdAt?: string;
  latestNotification?: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  
  // التحقق هل المستخدم هو المشرف المطلق (System Admin) أم رئيس نادي
  const [isSystemAdminUser, setIsSystemAdminUser] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'users-manager' | 'discover' | 'passion' | 'events' | 'banners' | 'team' | 'requests' | 'partners' | 'suggestions'>('requests');

  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const togglePasswordVisibility = (phone: string) => {
    setShowPasswords((prev) => ({
      ...prev,
      [phone]: !prev[phone]
    }));
  };

  useEffect(() => {
    const checkAdminAuth = async () => {
      try {
        const phone = localStorage.getItem('userPhone');
        const adminAuth = sessionStorage.getItem('adminToken') === 'SECURE_ADMIN_KEY_NURSING_2026';
        
        if (!phone && !adminAuth) {
          router.push('/login');
          return;
        }

        if (phone === '0553731265' || adminAuth) {
          setIsSystemAdminUser(true);
          return;
        }

        const userRef = doc(db, 'users', phone as string);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const userRole = userData.role || 'عضو أساسي';

          if (phone === '0553731265' || userRole === 'System Admin') {
            setIsSystemAdminUser(true);
          } else {
            setIsSystemAdminUser(false);
            // إذا كان رئيس نادي أو مشرف، نسمح له بالدخول ولكن نبقي تبويب الحسابات مخفياً عنه
            if (
              userRole !== 'رئيس النادي' && 
              userRole !== 'رئيسة النادي' && 
              !userRole.includes('رئيس لجنة') && 
              !userRole.includes('مشرف')
            ) {
              router.push('/');
            }
          }
        } else {
          router.push('/');
        }
      } catch (err) {
        console.error('Auth check error:', err);
      }
    };

    checkAdminAuth();
  }, [router]);

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const [passionSlides, setPassionSlides] = useState<PassionSlide[]>([]);
  const [newPassionQuote, setNewPassionQuote] = useState<string>('');
  const [newPassionImage, setNewPassionImage] = useState<string>('/header-banner.png');

  const [discoverEvents, setDiscoverEvents] = useState<DiscoverEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [newDiscTitle, setNewDiscTitle] = useState<string>('');
  const [newDiscCategory, setNewDiscCategory] = useState<string>('أنشطة كبرى');
  const [newDiscDesc, setNewDiscDesc] = useState<string>('');
  const [newDiscImages, setNewDiscImages] = useState<string[]>([]);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDate, setNewDate] = useState<string>('');
  const [newLocation, setNewLocation] = useState<string>('');
  const [newStatus, setNewStatus] = useState<'upcoming' | 'past'>('upcoming');
  const [newPoster, setNewPoster] = useState<string>('/header-banner.png');
  const [newDesc, setNewDesc] = useState<string>('');

  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [bannerTag, setBannerTag] = useState<string>('');
  const [bannerTitle, setBannerTitle] = useState<string>('');
  const [bannerImage, setBannerImage] = useState<string>('/header-banner.png');

  const [partners, setPartners] = useState<PartnerItem[]>([]);
  const [partnerName, setPartnerName] = useState<string>('');
  const [partnerCategory, setPartnerCategory] = useState<string>('شريك إستراتيجي');
  const [partnerLogo, setPartnerLogo] = useState<string>('/logo.png');

  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [requests, setRequests] = useState<Record<string, any>[]>([]);
  const [usersList, setUsersList] = useState<UserAccount[]>([]);
  
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [acceptedCommittee, setAcceptedCommittee] = useState<string>('لجنة التصميم');
  const [whatsappLink, setWhatsappLink] = useState<string>('');

  const [requestSubTab, setRequestSubTab] = useState<'all' | 'accepted' | 'pref-1' | 'pref-2' | 'pref-3'>('all');
  const [selectedCommitteeFilter, setSelectedCommitteeFilter] = useState<string>('لجنة التصميم');

  const [committees, setCommittees] = useState<Committee[]>([
    { id: 'design', name: 'التصميم', maleLeader: 'عبدالعزيز العنزي', femaleLeader: 'شجون الحربي', members: [] },
    { id: 'media', name: 'لجنة الاعلام', maleLeader: 'راشد السبيعي', femaleLeader: 'ريم الشمري', members: [] },
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

  useEffect(() => {
    const fetchCloudData = async () => {
      try {
        const eventsSnap = await getDocs(collection(db, 'site_events'));
        if (!eventsSnap.empty) {
          const eventsList: EventItem[] = [];
          eventsSnap.forEach((d) => { eventsList.push({ id: d.id, ...d.data() } as EventItem); });
          setEvents(eventsList);
        }

        const bannersSnap = await getDocs(collection(db, 'site_banners'));
        if (!bannersSnap.empty) {
          const bannersList: BannerItem[] = [];
          bannersSnap.forEach((d) => { bannersList.push({ id: d.id, ...d.data() } as BannerItem); });
          setBanners(bannersList);
        }

        const partnersSnap = await getDocs(collection(db, 'site_partners'));
        if (!partnersSnap.empty) {
          const partnersList: PartnerItem[] = [];
          partnersSnap.forEach((d) => { partnersList.push({ id: d.id, ...d.data() } as PartnerItem); });
          setPartners(partnersList);
        }

        const suggestionsSnap = await getDocs(collection(db, 'suggestions'));
        if (!suggestionsSnap.empty) {
          const suggestionsList: SuggestionItem[] = [];
          suggestionsSnap.forEach((d) => { suggestionsList.push({ id: d.id, ...d.data() } as SuggestionItem); });
          setSuggestions(suggestionsList);
        }

        const passionSnap = await getDocs(collection(db, 'site_passion_slides'));
        if (!passionSnap.empty) {
          const slides: PassionSlide[] = [];
          passionSnap.forEach((d) => { slides.push({ id: d.id, ...d.data() } as PassionSlide); });
          setPassionSlides(slides);
        }

        const discoverSnap = await getDocs(collection(db, 'site_discover_events'));
        if (!discoverSnap.empty) {
          const eventsList: DiscoverEvent[] = [];
          discoverSnap.forEach((d) => { eventsList.push({ id: d.id, ...d.data() } as DiscoverEvent); });
          setDiscoverEvents(eventsList);
          setSelectedEventId(eventsList[0]?.id || '');
        }

        const querySnapshot = await getDocs(collection(db, 'applications'));
        const fetchedRequests = querySnapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })) as Record<string, any>[];
        if (fetchedRequests.length > 0) {
          setRequests(fetchedRequests);
        }

        const usersSnap = await getDocs(collection(db, 'users'));
        const fetchedUsers = usersSnap.docs.map((docSnap) => ({ phone: docSnap.id, ...docSnap.data() })) as UserAccount[];
        setUsersList(fetchedUsers);

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

  const handleRoleChange = async (phone: string, newRole: string) => {
    if (!isSystemAdminUser) return; // حماية إضافية
    try {
      const userRef = doc(db, 'users', phone);
      await updateDoc(userRef, { 
        role: newRole,
        latestNotification: `مبروك! تم ترقيتك وتعيين رتبتك إلى (${newRole}) بنجاح 🎉`
      });
      setUsersList(usersList.map((u) => u.phone === phone ? { ...u, role: newRole } : u));
      alert(`تم تحديث رتبة العضو إلى (${newRole}) بنجاح!`);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء تحديث الرتبة.');
    }
  };

  const handleAssignedCommitteeChange = async (phone: string, commName: string) => {
    if (!isSystemAdminUser) return; // حماية إضافية
    try {
      const userRef = doc(db, 'users', phone);
      await updateDoc(userRef, { 
        assignedCommittee: commName,
        latestNotification: `تم تعيينك من قبل الإدارة رئيساً لـ (${commName}) 🛡️`
      });
      setUsersList(usersList.map((u) => u.phone === phone ? { ...u, assignedCommittee: commName } : u));
      alert(`تم تعيين اللجنة (${commName}) لهذا العضو بنجاح!`);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء تعيين اللجنة.');
    }
  };

  const handleDeleteSuggestion = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المقترح من السحابة؟')) {
      try {
        await deleteDoc(doc(db, 'suggestions', id));
        setSuggestions(suggestions.filter((s) => s.id !== id));
        alert('تم حذف المقترح بنجاح.');
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleExcelImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const buffer = evt.target?.result;
        const wb = XLSX.read(buffer, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[];

        if (!data || data.length < 2) {
          alert('الملف فارغ أو لا يحتوي على البيانات المطلوبة.');
          return;
        }

        const rows = data.slice(1);
        let addedCount = 0;
        let skippedCount = 0;

        const existingDocsSnap = await getDocs(collection(db, 'applications'));
        const existingPhones = new Set();
        const existingUnivIds = new Set();
        
        existingDocsSnap.forEach((d) => {
          const dat = d.data();
          if (dat.phone) existingPhones.add(String(dat.phone).trim());
          if (dat.universityId) existingUnivIds.add(String(dat.universityId).trim());
        });

        for (const row of rows) {
          if (!row || row.length === 0) continue;

          const fullName = String(row[1] || '').trim(); 
          const phone = String(row[2] || '').trim();    
          const universityId = String(row[3] || '').trim(); 
          const major = String(row[4] || 'تمريض').trim();  
          const firstChoice = String(row[5] || 'غير متوفر').trim(); 
          const secondChoice = String(row[6] || 'غير متوفر').trim(); 
          const thirdChoice = String(row[7] || 'غير متوفر').trim(); 

          if (!fullName || fullName === '..' || fullName === '.' || fullName.length < 3) continue;

          if ((universityId && existingUnivIds.has(universityId)) || (phone && existingPhones.has(phone))) {
            skippedCount++;
            continue;
          }

          const reqId = universityId.length > 5 ? universityId : `req_${Date.now()}_${Math.random()}`;

          const reqObj = {
            fullName,
            phone,
            universityId,
            major,
            firstChoice,
            secondChoice,
            thirdChoice,
            status: 'معلق',
            importedAt: new Date().toISOString()
          };

          await setDoc(doc(db, 'applications', reqId), reqObj);
          if (phone) existingPhones.add(phone);
          if (universityId) existingUnivIds.add(universityId);
          addedCount++;
        }

        alert(`تمت العملية بنجاح! 🚀\n- أُضيف جديد: ${addedCount}\n- تم تخطي المكرر: ${skippedCount}`);
        window.location.reload();
      } catch (err) {
        console.error('Error importing excel:', err);
        alert('حدث خطأ أثناء قراءة ملف الأكسل.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

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
      setPassionSlides([...passionSlides, newSlide]);
      setNewPassionQuote('');
      setNewPassionImage('/header-banner.png');
      alert('تم إضافة الشريحة وحفظها سحابياً بنجاح!');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePassionSlide = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'site_passion_slides', id));
      setPassionSlides(passionSlides.filter((s) => s.id !== id));
      alert('تم حذف الشريحة بنجاح.');
    } catch (err) {
      console.error(err);
    }
  };

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
    if (!newDiscTitle.trim()) return;
    const eventId = Date.now().toString();
    const newEventObj: DiscoverEvent = {
      id: eventId,
      title: newDiscTitle,
      category: newDiscCategory,
      description: newDiscDesc || 'فعالية تابعة لنادي التمريض.',
      images: newDiscImages.length > 0 ? newDiscImages : ['/logo.png']
    };

    try {
      await setDoc(doc(db, 'site_discover_events', eventId), newEventObj);
      setDiscoverEvents([newEventObj, ...discoverEvents]);
      setSelectedEventId(eventId);
      setNewDiscTitle('');
      setNewDiscDesc('');
      setNewDiscImages([]);
      alert('تم إنشاء الفعالية ونشر الصور سحابياً للجميع!');
    } catch (err) {
      console.error(err);
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

      const updatedImages = [...(targetEvent.images || []), ...base64Images];
      const updatedEventObj = { ...targetEvent, images: updatedImages };

      try {
        await setDoc(doc(db, 'site_discover_events', selectedEventId), updatedEventObj);
        setDiscoverEvents(discoverEvents.map((ev) => (ev.id === selectedEventId ? updatedEventObj : ev)));
        alert('تم رفع وإضافة الصور سحابياً بنجاح!');
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleRemoveImageFromEvent = async (imgIndex: number) => {
    const targetEvent = discoverEvents.find((ev) => ev.id === selectedEventId);
    if (!targetEvent) return;

    const filteredImages = (targetEvent.images || []).filter((_, idx) => idx !== imgIndex);
    const updatedImages = filteredImages.length > 0 ? filteredImages : ['/logo.png'];
    const updatedEventObj = { ...targetEvent, images: updatedImages };

    try {
      await setDoc(doc(db, 'site_discover_events', selectedEventId), updatedEventObj);
      setDiscoverEvents(discoverEvents.map((ev) => (ev.id === selectedEventId ? updatedEventObj : ev)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteEntireDiscoverEvent = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذه الفعالية بالكامل؟')) {
      try {
        await deleteDoc(doc(db, 'site_discover_events', id));
        const updated = discoverEvents.filter((ev) => ev.id !== id);
        setDiscoverEvents(updated);
        if (updated.length > 0) setSelectedEventId(updated[0].id);
        alert('تم الحذف بنجاح.');
      } catch (err) {
        console.error(err);
      }
    }
  };

  const currentEditedEvent = discoverEvents.find((ev) => ev.id === selectedEventId) || discoverEvents[0];

  const handleSaveEventSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const eventId = editingEventId ? editingEventId : Date.now().toString();
    const eventObj: EventItem = {
      id: eventId,
      title: newTitle,
      date: newDate || 'قريباً',
      location: newLocation || 'جامعة حفر الباطن',
      status: newStatus,
      poster: newPoster,
      description: newDesc || 'فعالية تابعة لنادي التمريض.'
    };

    try {
      await setDoc(doc(db, 'site_events', eventId), eventObj);
      if (editingEventId) {
        setEvents(events.map((ev) => ev.id === eventId ? eventObj : ev));
        alert('تم تعديل الفعالية بنجاح!');
      } else {
        setEvents([eventObj, ...events]);
        alert('تم نشر الفعالية بنجاح!');
      }
      setEditingEventId(null);
      setNewTitle('');
      setNewDate('');
      setNewLocation('');
      setNewPoster('/header-banner.png');
      setNewDesc('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditEventClick = (ev: EventItem) => {
    setEditingEventId(ev.id);
    setNewTitle(ev.title);
    setNewDate(ev.date);
    setNewLocation(ev.location);
    setNewStatus(ev.status);
    setNewPoster(ev.poster);
    setNewDesc(ev.description);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteEvent = async (id: string) => {
    if (confirm('هل أنت متأكد من الحذف؟')) {
      try {
        await deleteDoc(doc(db, 'site_events', id));
        setEvents(events.filter((ev) => ev.id !== id));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleAddBanner = async (e: FormEvent) => {
    e.preventDefault();
    if (!bannerTitle.trim()) return;
    const bannerId = Date.now().toString();
    const newBanner: BannerItem = {
      id: bannerId,
      tag: bannerTag || 'مناسبة خاصة',
      title: bannerTitle,
      image: bannerImage,
      buttonText: 'اكتشف النادي',
      buttonLink: '/discover'
    };

    try {
      await setDoc(doc(db, 'site_banners', bannerId), newBanner);
      setBanners([newBanner, ...banners]);
      setBannerTag('');
      setBannerTitle('');
      setBannerImage('/header-banner.png');
      alert('تم إضافة وتفعيل البانر بنجاح!');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'site_banners', id));
      setBanners(banners.filter((b) => b.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddPartner = async (e: FormEvent) => {
    e.preventDefault();
    if (!partnerName.trim()) return;
    const partnerId = Date.now().toString();
    const newPartner: PartnerItem = {
      id: partnerId,
      name: partnerName.trim(),
      category: partnerCategory,
      logo: partnerLogo
    };

    try {
      await setDoc(doc(db, 'site_partners', partnerId), newPartner);
      setPartners([newPartner, ...partners]);
      setPartnerName('');
      setPartnerCategory('شريك إستراتيجي');
      setPartnerLogo('/logo.png');
      alert('تم إضافة شريك النجاح بنجاح! 🤝');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePartner = async (id: string) => {
    if (confirm('هل أنت متأكد من الحذف؟')) {
      try {
        await deleteDoc(doc(db, 'site_partners', id));
        setPartners(partners.filter((p) => p.id !== id));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const openAcceptModal = (reqId: string) => {
    setSelectedRequestId(reqId);
    setShowAcceptModal(true);
  };

  const handleConfirmAcceptRequest = async () => {
    if (!selectedRequestId) return;
    try {
      const targetRequest = requests.find((req) => req.id === selectedRequestId);
      if (!targetRequest) return;

      const docRef = doc(db, 'applications', selectedRequestId);
      await updateDoc(docRef, { 
        status: 'مقبول',
        acceptedCommittee: acceptedCommittee,
        whatsappLink: whatsappLink 
      });

      let targetCommitteeId = 'design';
      if (acceptedCommittee.includes('تصميم')) targetCommitteeId = 'design';
      else if (acceptedCommittee.includes('إعلام') || acceptedCommittee.includes('الاعلام')) targetCommitteeId = 'media';
      else if (acceptedCommittee.includes('فعاليات')) targetCommitteeId = 'events-org';
      else if (acceptedCommittee.includes('الموارد')) targetCommitteeId = 'hr';
      else if (acceptedCommittee.includes('العلاقات')) targetCommitteeId = 'pr';
      else if (acceptedCommittee.includes('العلمي')) targetCommitteeId = 'scientific';
      else if (acceptedCommittee.includes('الجودة')) targetCommitteeId = 'quality';

      const commDocRef = doc(db, 'committees', targetCommitteeId);
      const commSnap = await getDoc(commDocRef);
      
      let existingMembers: CommitteeMember[] = [];
      let maleLeader = 'قائد الطلاب';
      let femaleLeader = 'قائدة الطالبات';

      if (commSnap.exists()) {
        const commData = commSnap.data();
        existingMembers = commData.members || [];
        maleLeader = commData.maleLeader || maleLeader;
        femaleLeader = commData.femaleLeader || femaleLeader;
      }

      const newMemberObj: CommitteeMember = {
        name: targetRequest.fullName,
        role: targetRequest.major || 'عضو منضم',
        status: 'نشط',
        phone: targetRequest.phone || ''
      };

      const updatedMembers = [...existingMembers, newMemberObj];

      await setDoc(commDocRef, {
        maleLeader,
        femaleLeader,
        members: updatedMembers
      }, { merge: true });

      setRequests(requests.map((req) => req.id === selectedRequestId ? { ...req, status: 'مقبول', acceptedCommittee, whatsappLink } : req));
      setShowAcceptModal(false);
      setWhatsappLink('');
      alert(`تم قبول العضو وإضافته تلقائياً إلى (${acceptedCommittee}) بنجاح! 🚀`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectRequest = async (id: string) => {
    if(confirm('هل أنت متأكد من رفض الطلب؟')) {
      try {
        const docRef = doc(db, 'applications', id);
        await updateDoc(docRef, { status: 'مرفوض' });
        setRequests(requests.map((req) => req.id === id ? { ...req, status: 'مرفوض' } : req));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleShiftPreference = async (req: Record<string, any>) => {
    const f1 = req.firstChoice || '';
    const f2 = req.secondChoice || '';
    const f3 = req.thirdChoice || '';

    const updatedObj = {
      ...req,
      firstChoice: f2 || f3 || f1,
      secondChoice: f3 || f1 || f2,
      thirdChoice: f1 || f2 || f3
    };

    try {
      const docRef = doc(db, 'applications', req.id);
      await updateDoc(docRef, {
        firstChoice: updatedObj.firstChoice,
        secondChoice: updatedObj.secondChoice,
        thirdChoice: updatedObj.thirdChoice
      });
      setRequests(requests.map(r => r.id === req.id ? updatedObj : r));
      alert('تم تحويل الطالب إلى رغبته التالية (الثانية أو الثالثة) بنجاح! 🔄');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء تحويل رغبة الطالب.');
    }
  };

  const handleDeleteRequest = async (id: string) => {
    if(confirm('هل أنت متأكد من الحذف النهائي للطلب؟')) {
      try {
        await deleteDoc(doc(db, 'applications', id));
        setRequests(requests.filter((req) => req.id !== id));
      } catch (err) {
        console.error(err);
      }
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
      alert(`تم حفظ وتحديث قادة "${currentCommittee.name}" بنجاح!`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMemberSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    const updatedMembers = [...(currentCommittee.members || []), { name: newMemberName, role: newMemberRole || 'عضو', status: 'نشط' }];
    setCommittees(committees.map((c) => c.id === selectedCommitteeId ? { ...c, members: updatedMembers } : c));
    setNewMemberName('');
    setNewMemberRole('');

    try {
      await setDoc(doc(db, 'committees', selectedCommitteeId), {
        maleLeader: currentCommittee.maleLeader,
        femaleLeader: currentCommittee.femaleLeader,
        members: updatedMembers
      }, { merge: true });
      alert('تم إضافة العضو بنجاح!');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMember = async (index: number) => {
    const updatedMembers = [...(currentCommittee.members || [])];
    updatedMembers.splice(index, 1);

    setCommittees(committees.map((c) => c.id === selectedCommitteeId ? { ...c, members: updatedMembers } : c));

    try {
      await setDoc(doc(db, 'committees', selectedCommitteeId), {
        maleLeader: currentCommittee.maleLeader,
        femaleLeader: currentCommittee.femaleLeader,
        members: updatedMembers
      }, { merge: true });
    } catch (err) {
      console.error(err);
    }
  };

  const committeeNamesList = ['لجنة التصميم', 'لجنة الاعلام', 'لجنة تنظيم الفعاليات', 'لجنة الموارد البشرية', 'لجنة العلاقات العامة', 'لجنة المحتوى العلمي', 'لجنة الجودة والتطوير'];
  
  const matchesCommittee = (choiceStr: string, targetCommName: string) => {
    if (!choiceStr) return false;
    const cleanChoice = choiceStr.replace(/الـ/g, '').replace(/إ/g, 'ا').replace(/أ/g, 'ا').replace(/آ/g, 'ا').trim();
    const cleanTarget = targetCommName.replace(/الـ/g, '').replace(/إ/g, 'ا').replace(/أ/g, 'ا').replace(/آ/g, 'ا').trim();
    
    if (cleanChoice.includes('اعلام') && cleanTarget.includes('اعلام')) return true;
    if (cleanChoice.includes('تصميم') && cleanTarget.includes('تصميم')) return true;
    if (cleanChoice.includes('فعاليات') && cleanTarget.includes('فعاليات')) return true;
    if (cleanChoice.includes('موارد') && cleanTarget.includes('موارد')) return true;
    if (cleanChoice.includes('علاقات') && cleanTarget.includes('علاقات')) return true;
    if (cleanChoice.includes('علمي') && cleanTarget.includes('علمي')) return true;
    if (cleanChoice.includes('جودة') && cleanTarget.includes('جودة')) return true;

    return choiceStr.includes(targetCommName) || targetCommName.includes(choiceStr);
  };

  const getCountByPreference = (commName: string, prefKey: 'firstChoice' | 'secondChoice' | 'thirdChoice') => {
    return requests.filter(r => matchesCommittee(r[prefKey], commName)).length;
  };

  const filteredRequests = requests.filter(req => {
    if (requestSubTab === 'accepted') return req.status === 'مقبول';
    if (requestSubTab === 'pref-1') {
      return matchesCommittee(req.firstChoice, selectedCommitteeFilter);
    }
    if (requestSubTab === 'pref-2') {
      return matchesCommittee(req.secondChoice, selectedCommitteeFilter);
    }
    if (requestSubTab === 'pref-3') {
      return matchesCommittee(req.thirdChoice, selectedCommitteeFilter);
    }
    return true; 
  });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 selection:bg-[#630517] selection:text-[#F5D061]" dir="rtl">
      
      <div className="bg-white border-b border-slate-200 py-4 px-6 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-[#630517] text-[#F5D061] flex items-center justify-center font-black text-lg shadow">
            UHB
          </span>
          <div>
            <h1 className="text-lg font-black text-slate-900">لوحة تحكم نادي التمريض (سحابي متكامل ☁️)</h1>
            <p className="text-xs text-slate-500">إدارة اللجان والفعاليات والطلبات سحابياً</p>
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

        {/* لوحة إنجاز حماسية */}
        <div className="bg-gradient-to-r from-[#630517] to-[#80071D] rounded-3xl p-6 text-white shadow-xl flex flex-wrap justify-between items-center gap-6">
          <div className="space-y-1">
            <span className="bg-[#F5D061] text-[#630517] font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-wider">
              نظام القيادة الماسية 🏆
            </span>
            <h2 className="text-xl font-black">غرفة عمليات القيادة ونبض النادي</h2>
            <p className="text-xs text-white/80">تابع أداء اللجان، ادرس طلبات الانضمام، وانشر الفعاليات بحماس.</p>
          </div>

          <div className="flex gap-4">
            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20 text-center">
              <span className="block text-2xl font-black text-[#F5D061]">{requests.length}</span>
              <span className="text-[10px] font-bold text-white/90">إجمالي طلبات النادي</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20 text-center">
              <span className="block text-2xl font-black text-emerald-400">{requests.filter(r => r.status === 'مقبول').length}</span>
              <span className="text-[10px] font-bold text-white/90">الأعضاء المقبولون</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20 text-center">
              <span className="block text-2xl font-black text-sky-400">{events.length}</span>
              <span className="text-[10px] font-bold text-white/90">الأنشطة والفعاليات</span>
            </div>
          </div>
        </div>

        {/* Tabs - تم إخفاء تبويب الحسابات والرتب عن غير المشرف الأساسي لزيادة الأمان */}
        <div className="flex flex-wrap gap-3 border-b border-slate-200 pb-4">
          {isSystemAdminUser && (
            <button
              type="button"
              onClick={() => setActiveTab('users-manager')}
              className={`px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-sm ${
                activeTab === 'users-manager' ? 'bg-[#630517] text-[#F5D061] shadow-md scale-105' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              🔑 الحسابات والرتب والصلاحيات
            </button>
          )}

          {[
            { id: 'requests', label: '📥 طلبات الانضمام والأكسل' },
            { id: 'suggestions', label: '💡 آراء ومقترحات الطلاب' },
            { id: 'discover', label: '🖼️ معرض "اكتشف النادي"' },
            { id: 'passion', label: '✨ بطاقة "شغف وعطاء"' },
            { id: 'events', label: '📅 الفعاليات والبوسترات' },
            { id: 'banners', label: '🖼️ البانرات الرئيسية' },
            { id: 'partners', label: '🤝 شركاء النجاح والرعاة' },
            { id: 'team', label: '👥 القادة والأعضاء' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-sm ${
                activeTab === tab.id
                  ? 'bg-[#630517] text-[#F5D061] shadow-md scale-105'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'users-manager' && isSystemAdminUser && (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-xl font-black text-slate-900">إدارة حسابات المستخدمين، كلمات المرور، والرتب (خاص بالمشرف الأساسي 🛡️)</h3>
              <p className="text-xs text-slate-500">هنا فقط يمكنك التحكم بالصلاحيات المطلقة ورتب النظام.</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold">
                    <th className="pb-3 pr-2">اسم المستخدم</th>
                    <th className="pb-3">رقم الجوال (اسم الدخول)</th>
                    <th className="pb-3">كلمة المرور</th>
                    <th className="pb-3">الرتبة والصلاحيات</th>
                    <th className="pb-3">اللجنة المعينة ( لرئيس اللجنة )</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50 bg-rose-50/20">
                    <td className="py-4 pr-2 font-black text-[#630517]">عبدالعزيز العنزي (المشرف الأساسي)</td>
                    <td className="py-4 text-slate-600 font-mono font-bold" dir="ltr">0553731265</td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[#630517] font-mono font-bold bg-slate-100 px-2.5 py-1 rounded w-fit">
                          {showPasswords['0553731265'] ? 'qwer8901as' : '••••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('0553731265')}
                          className="text-slate-500 hover:text-[#630517] p-1 transition-colors cursor-pointer"
                        >
                          {showPasswords['0553731265'] ? '👁️‍🗨️' : '👁️'}
                        </button>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className="px-3 py-1 rounded-full bg-[#630517] text-[#F5D061] font-black text-[11px] inline-block" dir="ltr">
                        System Admin
                      </span>
                    </td>
                    <td className="py-4 text-slate-400 font-bold">إدارة كاملة للمنصة</td>
                  </tr>

                  {usersList.map((usr, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-4 pr-2 font-bold text-slate-900">{usr.fullName || 'مستخدم مسجل'}</td>
                      <td className="py-4 text-slate-600 font-mono" dir="ltr">{usr.phone}</td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[#630517] font-mono font-bold bg-slate-100 px-2.5 py-1 rounded w-fit">
                            {showPasswords[usr.phone] ? (usr.password || 'غير متوفرة') : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(usr.phone)}
                            className="text-slate-500 hover:text-[#630517] p-1 transition-colors cursor-pointer"
                          >
                            {showPasswords[usr.phone] ? '👁️‍🗨️' : '👁️'}
                          </button>
                        </div>
                      </td>
                      <td className="py-4">
                        <select
                          value={usr.role || 'عضو أساسي'}
                          onChange={(e) => handleRoleChange(usr.phone, e.target.value)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white shadow-sm focus:outline-none focus:border-[#630517]"
                        >
                          <option value="System Admin">System Admin (مدير النظام)</option>
                          <option value="General Supervisor">General Supervisor (مشرف عام)</option>
                          <option value="رئيس النادي">رئيس النادي</option>
                          <option value="رئيسة النادي">رئيسة النادي</option>
                          <option value="رئيس لجنة / مشرف قسم">رئيس لجنة</option>
                          <option value="عضو مميز / منسق">عضو مميز</option>
                          <option value="عضو أساسي">عضو أساسي</option>
                        </select>
                      </td>
                      <td className="py-4">
                        {(usr.role?.includes('رئيس لجنة') || usr.role?.includes('مشرف')) ? (
                          <select
                            value={usr.assignedCommittee || 'لجنة الاعلام'}
                            onChange={(e) => handleAssignedCommitteeChange(usr.phone, e.target.value)}
                            className="px-3 py-1.5 rounded-xl border border-[#630517]/30 text-xs font-black text-[#630517] bg-[#630517]/5 shadow-sm focus:outline-none"
                          >
                            <option value="لجنة الاعلام">لجنة الاعلام</option>
                            <option value="لجنة التصميم">لجنة التصميم</option>
                            <option value="لجنة تنظيم الفعاليات">لجنة تنظيم الفعاليات</option>
                            <option value="لجنة الموارد البشرية">لجنة الموارد البشرية</option>
                            <option value="لجنة العلاقات العامة">لجنة العلاقات العامة</option>
                            <option value="لجنة المحتوى العلمي">لجنة المحتوى العلمي</option>
                            <option value="لجنة الجودة والتطوير">لجنة الجودة والتطوير</option>
                          </select>
                        ) : (
                          <span className="text-slate-400 text-[11px]">غير مخصص</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'suggestions' && (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4 flex justify-between items-center flex-wrap gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">صندوق آراء ومقترحات الطلاب والزوار 💡</h3>
                <p className="text-xs text-slate-500">هنا تظهر كافة المقترحات والأفكار التي يكتبها الزوار في الصفحة الرئيسية مباشرة.</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#630517]/10 text-[#630517] font-bold text-xs">
                إجمالي المقترحات: {suggestions.length}
              </span>
            </div>

            {suggestions.length === 0 ? (
              <div className="py-16 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-sm font-bold">لا توجد مقترحات أو آراء مرسلة حتى الآن.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {suggestions.map((sug) => (
                  <div key={sug.id} className="p-6 rounded-2xl border border-slate-200 bg-slate-50 shadow-sm flex flex-col justify-between space-y-4 relative group">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-black text-[#630517] text-sm">{sug.name || 'زائر كريم'}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {sug.createdAt ? new Date(sug.createdAt).toLocaleDateString('ar-SA') : ''}
                        </span>
                      </div>
                      <p className="text-slate-700 text-xs sm:text-sm font-medium leading-relaxed bg-white p-4 rounded-xl border border-slate-200 shadow-inner">
                        "{sug.content}"
                      </p>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => handleDeleteSuggestion(sug.id)}
                        className="px-3 py-1.5 rounded-xl bg-red-50 text-red-600 font-bold text-xs hover:bg-red-100 cursor-pointer"
                      >
                        حذف المقترح ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
                </div>
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
                      selectedEventId === ev.id ? 'bg-[#630517] text-[#F5D061] shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-900">
                  {editingEventId ? '✏️ تعديل الفعالية الحالية (سحابي)' : '➕ إضافة فعالية جديدة مع البوستر (سحابي)'}
                </h3>
                {editingEventId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingEventId(null);
                      setNewTitle('');
                      setNewDate('');
                      setNewLocation('');
                      setNewPoster('/header-banner.png');
                      setNewDesc('');
                    }}
                    className="text-xs text-red-600 font-bold bg-red-50 px-3 py-1.5 rounded-xl hover:bg-red-100"
                  >
                    إلغاء التعديل ✕
                  </button>
                )}
              </div>
              
              <form onSubmit={handleSaveEventSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <label className="text-xs font-bold text-slate-600">وصف الفعالية</label>
                  <textarea
                    rows={2}
                    placeholder="تفاصيل الفعالية..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#630517]"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-600">اختر بوستر الفعالية من جهازك</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                      if (e.target.files && e.target.files[0]) {
                        const fileUrl = await convertFileToBase64(e.target.files[0]);
                        setNewPoster(fileUrl);
                      }
                    }}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white file:mr-4 file:py-1 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#630517] file:text-[#F5D061] cursor-pointer"
                  />
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="bg-[#630517] text-[#F5D061] px-8 py-3 rounded-xl font-bold text-xs shadow hover:brightness-110 transition-all cursor-pointer"
                  >
                    {editingEventId ? '💾 حفظ التعديلات سحابياً' : '+ نشر الفعالية في السحابة'}
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xl font-black text-slate-900">الفعاليات الحالية بالسحابة ({events.length})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold">
                      <th className="pb-3 pr-2">الفعالية</th>
                      <th className="pb-3">التاريخ والمكان</th>
                      <th className="pb-3">الحالة</th>
                      <th className="pb-3 text-left pl-2">الإجراءات</th>
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
                        <td className="py-4 text-left pl-2 flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => handleEditEventClick(ev)}
                            className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 font-bold hover:bg-amber-100 cursor-pointer"
                          >
                            تعديل ✏️
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEvent(ev.id)}
                            className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 font-bold hover:bg-red-100 cursor-pointer"
                          >
                            حذف ✕
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
              <h3 className="text-xl font-black text-slate-900">إضافة بانر رئيسي جديد (سحابي)</h3>
              
              <form onSubmit={handleAddBanner} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">نص الشارة العلوية</label>
                  <input
                    type="text"
                    placeholder="مثال: مناسبة خاصة"
                    value={bannerTag}
                    onChange={(e) => setBannerTag(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#630517]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">عنوان البانر الرئيسي</label>
                  <input
                    type="text"
                    placeholder="مثال: نادي التمريض"
                    value={bannerTitle}
                    onChange={(e) => setBannerTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#630517]"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-600">اختر صورة البانر من جهازك</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                      if (e.target.files && e.target.files[0]) {
                        const fileUrl = await convertFileToBase64(e.target.files[0]);
                        setBannerImage(fileUrl);
                      }
                    }}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white file:mr-4 file:py-1 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#630517] file:text-[#F5D061] cursor-pointer"
                  />
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="bg-[#630517] text-[#F5D061] px-8 py-3 rounded-xl font-bold text-xs shadow hover:brightness-110 transition-all cursor-pointer"
                  >
                    + إضافة وتفعيل البانر سحابياً
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xl font-black text-slate-900">البانرات النشطة سحابياً ({banners.length})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold">
                      <th className="pb-3 pr-2">الشارة</th>
                      <th className="pb-3">العنوان</th>
                      <th className="pb-3 text-left pl-2">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {banners.map((ban) => (
                      <tr key={ban.id} className="hover:bg-slate-50">
                        <td className="py-4 pr-2 font-bold text-[#630517]">{ban.tag}</td>
                        <td className="py-4 text-slate-900 font-extrabold">{ban.title}</td>
                        <td className="py-4 text-left pl-2">
                          <button
                            type="button"
                            onClick={() => handleDeleteBanner(ban.id)}
                            className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 font-bold hover:bg-red-100 cursor-pointer"
                          >
                            حذف ✕
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

        {activeTab === 'partners' && (
          <div className="space-y-8">
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-xl font-black text-slate-900">🤝 إضافة شريك نجاح أو راعي جديد (سحابي)</h3>
              
              <form onSubmit={handleAddPartner} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">اسم الجهة أو الشريك</label>
                  <input
                    type="text"
                    placeholder="مثال: وبل"
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#630517]"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">نوع الشراكة / التصنيف</label>
                  <select
                    value={partnerCategory}
                    onChange={(e) => setPartnerCategory(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white"
                  >
                    <option value="شريك إستراتيجي">شريك إستراتيجي</option>
                    <option value="راعي ذهبي">راعي ذهبي</option>
                    <option value="راعي فضي">راعي فضي</option>
                    <option value="جهة داعمة">جهة داعمة</option>
                  </select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-600">اختر شعار الشريك من جهازك</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                      if (e.target.files && e.target.files[0]) {
                        const fileUrl = await convertFileToBase64(e.target.files[0]);
                        setPartnerLogo(fileUrl);
                      }
                    }}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white file:mr-4 file:py-1 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#630517] file:text-[#F5D061] cursor-pointer"
                  />
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="bg-[#630517] text-[#F5D061] px-8 py-3 rounded-xl font-bold text-xs shadow hover:brightness-110 transition-all cursor-pointer"
                  >
                    + حفظ ونشر الشريك سحابياً
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xl font-black text-slate-900">الشركاء والرعاة الحاليون بالسحابة ({partners.length})</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {partners.map((p) => (
                  <div key={p.id} className="p-4 rounded-2xl border border-slate-200 flex flex-col items-center text-center space-y-3 bg-slate-50 relative group">
                    <img src={p.logo} alt={p.name} className="w-16 h-16 object-contain rounded-xl bg-white p-2 shadow-sm" />
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-xs">{p.name}</h4>
                      <span className="text-[10px] text-[#630517] font-bold bg-[#630517]/10 px-2 py-0.5 rounded-md mt-1 inline-block">{p.category}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeletePartner(p.id)}
                      className="absolute top-2 left-2 bg-red-600 text-white w-6 h-6 rounded-full text-xs font-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow"
                    >
                      ✕
                    </button>
                  </div>
                ))}
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
                  { id: 'media', name: 'لجنة الاعلام' },
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
                      selectedCommitteeId === com.id ? 'bg-[#630517] text-[#F5D061] shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
                    value={currentCommittee.maleLeader || ''}
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
                    value={currentCommittee.femaleLeader || ''}
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
                  💾 حفظ وتحديث قادة اللجنة
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
          <div className="space-y-6">
            <div className="bg-emerald-50 border-2 border-emerald-300 p-6 rounded-3xl flex items-center justify-between flex-wrap gap-4 shadow-sm">
              <div className="space-y-1">
                <h4 className="font-black text-emerald-900 text-base">📥 استيراد بيانات المتقدمين من ملف الأكسل (بدون تكرار 🛡️)</h4>
                <p className="text-xs text-emerald-700">ارفع ملف الردود لجلب جميع الطلاب الجدد فقط، والنظام سيتجاهل الأسماء والأرقام المكررة تلقائياً!</p>
              </div>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleExcelImport}
                className="file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer text-xs bg-white border border-emerald-200 rounded-xl p-1"
              />
            </div>

            {/* إحصائيات أعداد المتقدمين لكل لجنة (محدّثة حسب الرغبة الأولى) */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h4 className="font-black text-slate-900 text-sm">📊 إحصائيات المتقدمين لكل لجنة (حسب الرغبة الأولى)</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {committeeNamesList.map((comm, i) => {
                  const count = getCountByPreference(comm, 'firstChoice');
                  return (
                    <div key={i} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-1">
                      <p className="text-[11px] font-bold text-slate-600 truncate">{comm}</p>
                      <p className="text-lg font-black text-[#630517]">{count}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* فلاتر الفرز */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setRequestSubTab('all')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${requestSubTab === 'all' ? 'bg-[#630517] text-[#F5D061]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  📋 كل الطلبات ({requests.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRequestSubTab('accepted')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${requestSubTab === 'accepted' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  ✅ قائمة المقبولين ({requests.filter(r => r.status === 'مقبول').length})
                </button>
                <button
                  type="button"
                  onClick={() => setRequestSubTab('pref-1')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${requestSubTab === 'pref-1' ? 'bg-[#630517] text-[#F5D061]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  🎯 الرغبة الأولى
                </button>
                <button
                  type="button"
                  onClick={() => setRequestSubTab('pref-2')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${requestSubTab === 'pref-2' ? 'bg-[#630517] text-[#F5D061]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  🥈 الرغبة الثانية
                </button>
                <button
                  type="button"
                  onClick={() => setRequestSubTab('pref-3')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${requestSubTab === 'pref-3' ? 'bg-[#630517] text-[#F5D061]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  🥉 الرغبة الثالثة
                </button>
              </div>

              {(requestSubTab === 'pref-1' || requestSubTab === 'pref-2' || requestSubTab === 'pref-3') && (
                <select
                  value={selectedCommitteeFilter}
                  onChange={(e) => setSelectedCommitteeFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-900"
                >
                  {committeeNamesList.map((c, i) => (
                    <option key={i} value={c}>{c}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-xl font-black text-slate-900">
                {requestSubTab === 'accepted' ? 'قائمة الأعضاء المقبولين وإدارتهم' : 'طلبات انضمام الأعضاء'} ({filteredRequests.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold">
                      <th className="pb-3 pr-2">اسم المتقدم</th>
                      <th className="pb-3">الرقم الجامعي / المستوى</th>
                      <th className="pb-3">الرغبات الثلاث</th>
                      <th className="pb-3">الحالة واللجنة</th>
                      <th className="pb-3 text-left pl-2">الإجراءات والتحويل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRequests.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">لا توجد طلبات تطابق هذا الفرز حالياً.</td>
                      </tr>
                    ) : (
                      filteredRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50">
                          <td className="py-4 pr-2 font-bold text-slate-900">
                            {req.fullName}
                            <div className="text-[10px] text-slate-500 font-normal">📞 {req.phone}</div>
                          </td>
                          <td className="py-4 text-slate-600">
                            {req.universityId || '-'} <br />
                            <span className="text-[10px] text-slate-400">{req.major}</span>
                          </td>
                          <td className="py-4 text-slate-700">
                            <div className="space-y-0.5 text-[11px]">
                              <p><strong className="text-[#630517]">1:</strong> {req.firstChoice || '-'}</p>
                              <p><strong className="text-slate-400">2:</strong> {req.secondChoice || '-'}</p>
                              <p><strong className="text-slate-400">3:</strong> {req.thirdChoice || '-'}</p>
                            </div>
                          </td>
                          <td className="py-4">
                            <span className={`px-2.5 py-1 rounded-full font-bold border block w-fit mb-1 ${
                              req.status === 'مقبول' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                              req.status === 'مرفوض' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {req.status || 'معلق'}
                            </span>
                            {req.acceptedCommittee && (
                              <span className="text-[10px] font-bold text-[#630517] bg-[#630517]/10 px-2 py-0.5 rounded-md">
                                مقبول في: {req.acceptedCommittee}
                              </span>
                            )}
                          </td>
                          <td className="py-4 text-left pl-2 flex gap-1.5 justify-end flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleShiftPreference(req)}
                              className="px-2.5 py-1.5 rounded-lg bg-sky-50 text-sky-700 font-bold hover:bg-sky-100 cursor-pointer"
                              title="تحويل الطالب للرغبة التالية (الثانية أو الثالثة) عند اكتفاء العدد"
                            >
                              🔄 تحويل لرغبة أخرى
                            </button>
                            <button
                              type="button"
                              onClick={() => openAcceptModal(req.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-bold hover:bg-emerald-100 cursor-pointer"
                            >
                              قبول ✅
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectRequest(req.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 font-bold hover:bg-amber-100 cursor-pointer"
                            >
                              رفض ✕
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRequest(req.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 font-bold hover:bg-red-100 cursor-pointer"
                            >
                              {req.status === 'مقبول' ? 'إزالة (طرد) 🗑️' : 'حذف نهائي 🗑️'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

      {showAcceptModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-slate-900 border-b border-slate-100 pb-3">إتمام قبول العضو</h3>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">تم القبول في لجنة:</label>
                <select
                  value={acceptedCommittee}
                  onChange={(e) => setAcceptedCommittee(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 bg-white"
                >
                  <option value="لجنة التصميم">لجنة التصميم</option>
                  <option value="لجنة الاعلام">لجنة الاعلام</option>
                  <option value="لجنة تنظيم الفعاليات">لجنة تنظيم الفعاليات</option>
                  <option value="لجنة الموارد البشرية">لجنة الموارد البشرية</option>
                  <option value="لجنة العلاقات العامة">لجنة العلاقات العامة</option>
                  <option value="لجنة المحتوى العلمي">لجنة المحتوى العلمي</option>
                  <option value="لجنة الجودة والتطوير">لجنة الجودة والتطوير</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">رابط الانضمام لقروب اللجنة (واتساب):</label>
                <input
                  type="text"
                  placeholder="https://chat.whatsapp.com/..."
                  value={whatsappLink}
                  onChange={(e) => setWhatsappLink(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-[#630517]"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowAcceptModal(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmAcceptRequest}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-black hover:bg-emerald-700 shadow-lg cursor-pointer"
              >
                تأكيد القبول وإرسال الرابط
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}