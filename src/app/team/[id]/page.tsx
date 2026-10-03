'use client';

import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { db } from '../../lib/firebase';
import { doc, getDoc, updateDoc, collection, getDocs, addDoc, deleteDoc } from 'firebase/firestore';

// دالة ذكية لتطبيع النصوص العربية وتوحيد الهمزات والمسافات
const normalizeArabic = (str: string) => {
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    .replace(/[إأآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '') // إزالة التشكيل
    .replace(/\s+/g, '');
};

// دالة ذكية لتطبيع رقم الجوال لضمان مطابقة دقيقة 100%
const normalizePhone = (phone: string) => {
  if (!phone) return '';
  let cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.startsWith('966')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }
  return cleaned;
};

const defaultCommitteesDetails: Record<string, any> = {
  design: {
    id: 'design',
    name: 'لجنة التصميم',
    description: 'مسؤولة عن الهوية البصرية، تصميم البوسترات، وتجهيز المحتوى المرئي لفعاليات النادي.',
    icon: '🎨',
    maleLeader: 'عبدالعزيز العنزي',
    femaleLeader: 'شجون الحربي',
    whatsappLink: 'https://chat.whatsapp.com/example-design',
    members: []
  },
  media: {
    id: 'media',
    name: 'لجنة الإعلام',
    description: 'إدارة منصات التواصل الاجتماعي، التغطيات الحية، وصناعة المحتوى المرئي والمكتوب.',
    icon: '📸',
    maleLeader: 'راشد السبيعي',
    femaleLeader: 'ريم الشمري',
    whatsappLink: 'https://chat.whatsapp.com/example-media',
    members: []
  },
  pr: {
    id: 'pr',
    name: 'لجنة العلاقات العامة',
    description: 'بناء الشراكات، استقبال الضيوف، والتنسيق الفعّال بين النادي والجهات الخارجية.',
    icon: '🌐',
    maleLeader: 'خالد القحطاني',
    femaleLeader: 'ديمة العتيبي',
    whatsappLink: 'https://chat.whatsapp.com/example-pr',
    members: []
  },
  quality: {
    id: 'quality',
    name: 'لجنة الجودة والتطوير',
    description: 'مراجعة وتقييم الأداء، قياس رضا الأعضاء، وتقديم مقترحات تحسين العمل المؤسسي.',
    icon: '📊',
    maleLeader: 'سلطان الحربي',
    femaleLeader: 'نورة الدوسري',
    whatsappLink: 'https://chat.whatsapp.com/example-quality',
    members: []
  },
  scientific: {
    id: 'scientific',
    name: 'لجنة المحتوى العلمي',
    description: 'إعداد ومراجعة المطويات الطبية، تنظيم المحاضرات التخصصية، ودعم الأنشطة الأكاديمية.',
    icon: '🔬',
    maleLeader: 'فهد المطيري',
    femaleLeader: 'أفنان العنزي',
    whatsappLink: 'https://chat.whatsapp.com/example-scientific',
    members: []
  },
  hr: {
    id: 'hr',
    name: 'لجنة الموارد البشرية',
    description: 'إدارة شؤون الأعضاء، متابعة الانضمام، وتنظيم تقييمات الأداء والتحفيز.',
    icon: '👥',
    maleLeader: 'تركي العنزي',
    femaleLeader: 'سارة الرشيدي',
    whatsappLink: 'https://chat.whatsapp.com/example-hr',
    members: []
  },
  'events-org': {
    id: 'events-org',
    name: 'لجنة التنظيم والفعاليات',
    description: 'التخطيط الميداني للفعاليات، إدارة الحشود، والتنسيق اللوجستي للورش والملتقيات.',
    icon: '📅',
    maleLeader: 'فيصل الدوسري',
    femaleLeader: 'غادة العمري',
    whatsappLink: 'https://chat.whatsapp.com/example-events',
    members: []
  },
};

export default function CommitteeDetailPage() {
  const params = useParams();
  const id = (params?.id as string) || '';
  const baseDetails = defaultCommitteesDetails[id] || null;
  
  const [committee, setCommittee] = useState<any>(baseDetails);
  const [currentUserPhone, setCurrentUserPhone] = useState<string>('');
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isAuthorizedMember, setIsAuthorizedMember] = useState<boolean>(false);
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [committeeTasks, setCommitteeTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // حالات نافذة الاعتذار
  const [showExcuseModal, setShowExcuseModal] = useState<boolean>(false);
  const [selectedEventTitle, setSelectedEventTitle] = useState<string>('');
  const [excuseText, setExcuseText] = useState<string>('');
  const [modalMessage, setModalMessage] = useState<string>('');
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);

  // خصائص لجنة العلاقات العامة (سجل الشراكات)
  const [publicPartnersList, setPublicPartnersList] = useState<any[]>([]);
  const [partnerName, setPartnerName] = useState('');
  const [partnerContactPerson, setPartnerContactPerson] = useState('');
  const [partnerPhone, setPartnerPhone] = useState('');
  const [partnerStatus, setPartnerStatus] = useState<'قيد المراجعة' | 'وافقوا' | 'رفضوا'>('قيد المراجعة');
  const [partnerNotes, setPartnerNotes] = useState('');

  // خصائص لجنة الإعلام (رفع الصور ومقاطع الفيديو)
  const [mediaGallery, setMediaGallery] = useState<any[]>([]);
  const [mediaTitle, setMediaTitle] = useState('');
  const [mediaCategory, setMediaCategory] = useState('تغطيات مرئية وفيديوهات 🎥');
  const [mediaBase64, setMediaBase64] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');

  // نافذة معاينة الميديا الكبيرة داخل الصفحة
  const [previewItem, setPreviewItem] = useState<any | null>(null);

  useEffect(() => {
    const phone = localStorage.getItem('userPhone') || '';
    const name = localStorage.getItem('userName') || '';
    const trimmedPhone = phone.trim();
    
    setCurrentUserPhone(trimmedPhone);
    setCurrentUserName(name.trim());
    
    if (trimmedPhone !== '') {
      setIsLoggedIn(true);
    }

    if (!baseDetails) {
      setLoading(false);
      return;
    }

    const fetchCloudData = async () => {
      try {
        const docRef = doc(db, 'committees', id);
        const docSnap = await getDoc(docRef);
        
        let mergedMembers = baseDetails.members || [];
        if (docSnap.exists()) {
          const cloudData = docSnap.data();
          if (cloudData.members && cloudData.members.length > 0) {
            mergedMembers = cloudData.members;
          }
          setCommittee((prev: any) => ({
            ...prev,
            maleLeader: cloudData.maleLeader || prev.maleLeader,
            femaleLeader: cloudData.femaleLeader || prev.femaleLeader,
            whatsappLink: cloudData.whatsappLink || prev.whatsappLink,
          }));
        }

        const appsSnap = await getDocs(collection(db, 'applications'));
        let userAuthorized = trimmedPhone === '0553731265';
        const normUserPhone = normalizePhone(trimmedPhone);

        if (!appsSnap.empty) {
          const acceptedFromApps: any[] = [];
          appsSnap.forEach((d) => {
            const data = d.data();
            const acceptedComm = data.acceptedCommittee || data.committee || data.assignedCommittee || '';
            const statusStr = String(data.status || '');
            const isAccepted = normalizeArabic(statusStr).includes('مقبول') || statusStr === 'مقبول';

            const normAccepted = normalizeArabic(acceptedComm);
            const normBaseName = normalizeArabic(baseDetails.name);
            const normId = normalizeArabic(id);

            // مطابقة ذكية تتغلب على اختلاف الهمزات (الإعلام / الاعلام)
            const matchesId = 
              normAccepted.includes(normBaseName) || 
              normBaseName.includes(normAccepted) || 
              normAccepted.includes(normId) ||
              normId.includes(normAccepted) ||
              (id === 'media' && (normAccepted.includes('اعلام') || normAccepted.includes('إعلام'))) ||
              (id === 'pr' && normAccepted.includes('علاقات')) ||
              (id === 'design' && normAccepted.includes('تصميم')) ||
              (id === 'quality' && (normAccepted.includes('جوده') || normAccepted.includes('تطوير'))) ||
              (id === 'scientific' && normAccepted.includes('علمي')) ||
              (id === 'hr' && (normAccepted.includes('موارد') || normAccepted.includes('بشري'))) ||
              (id === 'events-org' && (normAccepted.includes('تنظيم') || normAccepted.includes('فعاليات')));

            if (isAccepted && matchesId) {
              acceptedFromApps.push({
                name: data.fullName || data.name || '',
                phone: data.phone ? String(data.phone).trim() : '',
                role: 'عضو أساسي',
                status: 'نشط ✓',
                universityId: data.universityId || ''
              });

              const appPhoneNorm = normalizePhone(data.phone);
              if (normUserPhone !== '' && appPhoneNorm !== '' && appPhoneNorm === normUserPhone) {
                userAuthorized = true;
              }
            }
          });

          if (acceptedFromApps.length > 0) {
            const existingPhones = new Set(mergedMembers.map((m: any) => normalizePhone(m.phone)));
            const uniqueNew = acceptedFromApps.filter(m => !existingPhones.has(normalizePhone(m.phone)));
            mergedMembers = [...mergedMembers, ...uniqueNew];
          }
        }

        if (!userAuthorized && normUserPhone !== '') {
          const foundInDirect = mergedMembers.some((m: any) => m.phone && normalizePhone(m.phone) === normUserPhone);
          if (foundInDirect) userAuthorized = true;
        }

        setIsAuthorizedMember(userAuthorized);
        setCommittee((prev: any) => ({ ...prev, members: mergedMembers }));

        const eventsSnap = await getDocs(collection(db, 'site_events'));
        if (!eventsSnap.empty) {
          const evs: any[] = [];
          eventsSnap.forEach((d) => { evs.push({ id: d.id, ...d.data() }); });
          setEventsList(evs);
          if (evs.length > 0) setSelectedEventTitle(evs[0].title);
        }

        const tasksSnap = await getDocs(collection(db, 'committee_tasks'));
        if (!tasksSnap.empty) {
          const tasks: any[] = [];
          tasksSnap.forEach((d) => { tasks.push({ id: d.id, ...d.data() }); });
          setCommitteeTasks(tasks);
        }

        // جلب سجل الشراكات (للعلاقات العامة)
        const partnersSnap = await getDocs(collection(db, 'public_partners_relations'));
        setPublicPartnersList(partnersSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // جلب المعرض الإعلامي (للإعلام)
        const mediaSnap = await getDocs(collection(db, 'media_committee_gallery'));
        setMediaGallery(mediaSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      } catch (err) {
        console.error('Error fetching cloud data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCloudData();
  }, [id, baseDetails]);

  const isAdmin = currentUserPhone === '0553731265';

  const handleUploadExcuseSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!excuseText.trim() || !selectedEventTitle) return;

    try {
      const updatedMembers = (committee.members || []).map((m: any) => {
        const memberPhone = normalizePhone(m.phone);
        const userNormPhone = normalizePhone(currentUserPhone);
        if (userNormPhone !== '' && memberPhone === userNormPhone) {
          return {
            ...m,
            targetEvent: selectedEventTitle,
            excuseText: excuseText.trim(),
            excuseStatus: 'تم تسجيل الاعتذار عن الحضور بمرونة ✓',
            excuseDate: new Date().toLocaleDateString('ar-SA')
          };
        }
        return m;
      });

      const docRef = doc(db, 'committees', id);
      await updateDoc(docRef, { members: updatedMembers });

      setCommittee({ ...committee, members: updatedMembers });
      setShowExcuseModal(false);
      setExcuseText('');
      setModalMessage(`تم إرسال اعتذارك عن فعالية (${selectedEventTitle}) بنجاح 📋✨`);
      setShowSuccessModal(true);
    } catch (err) {
      console.error('Error uploading excuse:', err);
      setModalMessage('حدث خطأ أثناء إرسال الاعتذار، يرجى المحاولة مرة أخرى.');
      setShowSuccessModal(true);
    }
  };

  // ربط مهام اللجنة أو مهام الجودة الموجهة إليها بشكل ذكي
  const relevantTasks = committeeTasks.filter(t => {
    const cName = normalizeArabic(t.committee || '');
    const commName = normalizeArabic(committee?.name || '');
    return committee && (
      cName.includes(commName) || 
      commName.includes(cName) || 
      cName.includes(normalizeArabic(id)) ||
      cName.includes('جوده') || 
      cName.includes('تطوير') ||
      (id === 'media' && (cName.includes('اعلام') || cName.includes('إعلام')))
    );
  });

  const handleToggleSubTask = async (taskId: string, subTaskIdx: number) => {
    try {
      const taskItem = committeeTasks.find(t => t.id === taskId);
      if (!taskItem) return;

      const updatedSubTasks = [...taskItem.subTasks];
      const isNowCompleted = !updatedSubTasks[subTaskIdx].completed;
      updatedSubTasks[subTaskIdx].completed = isNowCompleted;
      updatedSubTasks[subTaskIdx].completedBy = isNowCompleted ? (currentUserName || 'عضو نشط') : '';

      const taskRef = doc(db, 'committee_tasks', taskId);
      await updateDoc(taskRef, { subTasks: updatedSubTasks });

      setCommitteeTasks(committeeTasks.map(t => t.id === taskId ? { ...t, subTasks: updatedSubTasks } : t));
    } catch (e) { console.error(e); }
  };

  // إضافة شريك / شركة جديدة (خاص بالعلاقات العامة)
  const handleAddPartnerSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!partnerName.trim()) return;

    const newPartnerObj = {
      name: partnerName.trim(),
      contactPerson: partnerContactPerson.trim() || 'غير محدد',
      phone: partnerPhone.trim() || 'غير متوفر',
      status: partnerStatus,
      notes: partnerNotes.trim() || 'لا توجد ملاحظات إضافية',
      addedBy: currentUserName || 'عضو العلاقات العامة',
      createdAt: Date.now(),
      dateStr: new Date().toLocaleDateString('ar-SA')
    };

    try {
      const docRef = await addDoc(collection(db, 'public_partners_relations'), newPartnerObj);
      setPublicPartnersList([{ id: docRef.id, ...newPartnerObj }, ...publicPartnersList]);
      setPartnerName('');
      setPartnerContactPerson('');
      setPartnerPhone('');
      setPartnerNotes('');
      setPartnerStatus('قيد المراجعة');
      alert('تم إضافة الشركة وسجل التفاوض بنجاح ليراه جميع الأعضاء لمنع تكرار التواصل! 🤝🎯');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء حفظ بيانات الشركة.');
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // رفع صورة أو فيديو (خاص بلجنة الإعلام) - مربوط بقاعدة البيانات المركزية
  const handleUploadMediaSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!mediaTitle.trim() || !mediaBase64) {
      alert('يرجى كتابة عنوان التغطية واختيار ملف الصورة أو الفيديو.');
      return;
    }
    const newObj = {
      title: mediaTitle.trim(),
      category: mediaCategory,
      mediaUrl: mediaBase64,
      mediaType: mediaType,
      createdAt: new Date().toLocaleDateString('ar-SA'),
      addedBy: currentUserName || 'عضو الإعلام'
    };
    try {
      const docRef = await addDoc(collection(db, 'media_committee_gallery'), newObj);
      setMediaGallery([{ id: docRef.id, ...newObj }, ...mediaGallery]);
      setMediaTitle('');
      setMediaBase64('');
      alert('تم رفع ونشر محتوى لجنة الإعلام وتخزينها سحابياً لتظهر للجميع ولوحة الأدمن بنجاح! 📸🚀');
    } catch (err) { 
      console.error(err); 
      alert('حدث خطأ أثناء رفع الملف، يرجى المحاولة مرة أخرى.');
    }
  };

  // حذف عنصر ميديا من الأرشيف
  const handleDeleteMediaItem = async (itemId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المادة الإعلامية نهائياً؟')) return;
    try {
      await deleteDoc(doc(db, 'media_committee_gallery', itemId));
      setMediaGallery(mediaGallery.filter(item => item.id !== itemId));
      alert('تم حذف المادة الإعلامية بنجاح 🗑️');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء الحذف.');
    }
  };

  if (!baseDetails) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-800 py-20 px-4" dir="rtl">
        <div className="max-w-md mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 bg-red-100 text-red-700 rounded-2xl mx-auto flex items-center justify-center text-3xl font-bold">🔍</div>
          <div className="space-y-2">
            <h1 className="text-xl font-black text-slate-900">لم يتم تحديد اللجنة</h1>
            <p className="text-xs text-slate-500 leading-relaxed">يرجى الانتقال إلى صفحة الهيكلة التنظيمية واختيار لجنتك المعتمدة.</p>
          </div>
          <div className="pt-2">
            <Link href="/team" className="w-full py-3 rounded-2xl bg-[#630517] text-[#F5D061] font-black text-xs shadow hover:brightness-110 transition-all inline-block">
              الانتقال لصفحة اللجان ➔
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center" dir="rtl">
        <p className="text-sm font-bold text-slate-500 animate-pulse">جاري التحقق من صلاحيات العضوية والخصوصية...</p>
      </main>
    );
  }

  if (!isLoggedIn) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-800 py-20 px-4" dir="rtl">
        <div className="max-w-md mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-2xl mx-auto flex items-center justify-center text-3xl font-bold">🔒</div>
          <div className="space-y-2">
            <h1 className="text-xl font-black text-slate-900">تسجيل الدخول مطلوب</h1>
            <p className="text-xs text-slate-500 leading-relaxed">بوابة الأعضاء واللجان مخصصة للأعضاء المقبولين فقط. يرجى تسجيل الدخول برقم الجوال.</p>
          </div>
          <div className="pt-2">
            <Link href="/" className="w-full py-3 rounded-2xl bg-[#630517] text-[#F5D061] font-black text-xs shadow hover:brightness-110 transition-all inline-block">
              العودة للرئيسية وتسجيل الدخول ➔
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!isAuthorizedMember) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-800 py-20 px-4" dir="rtl">
        <div className="max-w-md mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 bg-red-100 text-red-700 rounded-2xl mx-auto flex items-center justify-center text-3xl font-bold">⚠️</div>
          <div className="space-y-2">
            <h1 className="text-xl font-black text-slate-900">عذراً، لست من أعضاء هذه اللجنة</h1>
            <p className="text-xs text-slate-500 leading-relaxed">حسابك غير مقترن أو مقبول رسمياً في ({committee?.name}). هذه الصفحة مؤمنة تماماً.</p>
          </div>
          <div className="pt-2">
            <Link href="/team" className="w-full py-3 rounded-2xl bg-[#630517] text-[#F5D061] font-black text-xs shadow hover:brightness-110 transition-all inline-block">
              العودة لقائمة اللجان ➔
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 selection:bg-[#630517] selection:text-[#F5D061] py-12" dir="rtl">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        <div className="flex justify-between items-center">
          <Link href="/team" className="text-sm font-bold text-[#630517] hover:underline flex items-center gap-1">
            ← العودة لجميع اللجان
          </Link>
          <div className="flex items-center gap-3">
            {!isAdmin && (
              <button
                type="button"
                onClick={() => setShowExcuseModal(true)}
                className="px-4 py-2 rounded-2xl bg-[#630517] text-[#F5D061] font-black text-xs shadow-md hover:brightness-110 transition-all cursor-pointer flex items-center gap-1.5"
              >
                🙋‍♂️ أنا أعتذر عن حضور فعالية
              </button>
            )}
            <span className="px-4 py-1 rounded-full bg-[#630517]/10 text-[#630517] text-xs font-extrabold tracking-wider uppercase border border-[#630517]/20">
              بوابة الأعضاء الرسمية
            </span>
          </div>
        </div>

        {/* رأس اللجنة */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-xl space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#630517]/10 border border-[#630517]/20 flex items-center justify-center text-3xl shadow-sm">
                {committee?.icon}
              </div>
              <div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">عضو معتمد في هذه اللجنة ✓</span>
                <h1 className="text-3xl font-black text-slate-900 mt-1">{committee?.name}</h1>
                <p className="text-slate-600 text-sm mt-1">{committee?.description}</p>
              </div>
            </div>

            {committee?.whatsappLink && (
              <a
                href={committee.whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3 rounded-2xl bg-emerald-600 text-white font-black text-xs shadow hover:bg-emerald-700 transition-all flex items-center gap-2"
              >
                <span>💬</span>
                <span>قروب واتساب اللجنة</span>
              </a>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
            <div className="flex justify-between items-center bg-slate-50 px-4 py-3 rounded-2xl border border-slate-200/80">
              <span className="text-slate-400 font-bold">قائد الطلاب:</span>
              <span className="font-extrabold text-slate-900 text-sm">{committee?.maleLeader}</span>
            </div>
            <div className="flex justify-between items-center bg-slate-50 px-4 py-3 rounded-2xl border border-slate-200/80">
              <span className="text-slate-400 font-bold">قائدة الطالبات:</span>
              <span className="font-extrabold text-slate-900 text-sm">{committee?.femaleLeader}</span>
            </div>
          </div>
        </div>

        {/* 🤝 الخاصية المخصصة: سجل الشراكات (تظهر حصرياً لأعضاء لجنة العلاقات العامة) */}
        {(id === 'pr' || normalizeArabic(committee?.name || '').includes('علاقات')) && (
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-sky-200 shadow-xl space-y-6">
            <div className="border-b border-slate-100 pb-4 flex justify-between items-center flex-wrap gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">🤝 سجل الشراكات والمحلات المرئية (منع تكرار التواصل)</h2>
                <p className="text-xs text-slate-500 mt-1">قاعدة بيانات مركزية تشاهدها اللجنة بالكامل؛ لتجنب التواصل مع أي جهة سبق وتم التواصل معها:</p>
              </div>
              <span className="px-3.5 py-1.5 rounded-xl bg-sky-100 text-sky-800 font-bold text-xs">
                إجمالي الجهات: {publicPartnersList.length}
              </span>
            </div>

            {/* نموذج إضافة شركة جديدة للعضو */}
            <form onSubmit={handleAddPartnerSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-sky-50/40 p-6 rounded-2xl border border-sky-200">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">اسم الشركة أو المحل</label>
                <input
                  type="text"
                  placeholder="مثال: صيدلية النهدي / مقهى كيرف"
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-900"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">اسم المسؤول المُتواصل معه</label>
                <input
                  type="text"
                  placeholder="مثال: الأستاذ محمد (مدير الفرع)"
                  value={partnerContactPerson}
                  onChange={(e) => setPartnerContactPerson(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-900"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">حالة التواصل الحالية</label>
                <select
                  value={partnerStatus}
                  onChange={(e: any) => setPartnerStatus(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-900 font-bold"
                >
                  <option value="قيد المراجعة">⏳ قيد المراجعة / جاري التفاوض</option>
                  <option value="وافقوا">✅ وافقوا رسمياً وتم إبرام التعاون</option>
                  <option value="رفضوا">❌ نعتذر / رفضوا التعاون</option>
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-3">
                <label className="text-xs font-bold text-slate-700">تفاصيل أو ملاحظات الخصم / الرعاية المقدمة</label>
                <input
                  type="text"
                  placeholder="مثال: وافقوا على تقديم خصم 20% لطلاب النادي"
                  value={partnerNotes}
                  onChange={(e) => setPartnerNotes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-900"
                />
              </div>
              <div className="sm:col-span-3 pt-2">
                <button type="submit" className="bg-sky-600 text-white px-8 py-3 rounded-xl font-black text-xs shadow hover:bg-sky-700 cursor-pointer">
                  + إضافة الجهة للسجل العام (مانع التكرار) 🚀
                </button>
              </div>
            </form>

            {/* عرض الشركات المسجلة */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              {publicPartnersList.length === 0 ? (
                <p className="col-span-2 text-center py-8 text-slate-400 font-bold text-xs">لا توجد جهات أو شركات مسجلة في السجل حالياً.</p>
              ) : (
                publicPartnersList.map((partner) => (
                  <div key={partner.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className={`text-[10px] font-black px-3 py-1 rounded-full ${
                        partner.status === 'وافقوا' ? 'bg-emerald-100 text-emerald-800' : partner.status === 'رفضوا' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {partner.status === 'وافقوا' ? '✅ تم الموافقة والتعاون' : partner.status === 'رفضوا' ? '❌ نعتذر / مرفوض' : '⏳ قيد التفاوض'}
                      </span>
                      <span className="text-[10px] text-slate-400">الإضافة: {partner.dateStr}</span>
                    </div>
                    <h4 className="font-black text-slate-900 text-sm">{partner.name}</h4>
                    <p className="text-xs text-slate-700"><strong>المسؤول:</strong> {partner.contactPerson}</p>
                    <p className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-100"><strong>ملاحظات:</strong> {partner.notes}</p>
                    <p className="text-[10px] text-slate-400">بواسطة: {partner.addedBy}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 📸 الخاصية المخصصة: رفع الصور والمقاطع (لجنة الإعلام) - مع عرض المعاينة وزر الحذف */}
        {(id === 'media' || normalizeArabic(committee?.name || '').includes('اعلام') || normalizeArabic(committee?.name || '').includes('إعلام')) && (
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-purple-200 shadow-xl space-y-6">
            <div className="border-b border-slate-100 pb-4 flex justify-between items-center flex-wrap gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">📸 مركز رفع وتوثيق محتوى لجنة الإعلام (صور ومقاطع فيديو بدون قيود حجمية)</h2>
                <p className="text-xs text-slate-500 mt-1">خاص برفع التغطيات المرئية والفيديوهات والصور الكبيرة وتخزينها سحابياً لعرضها في المنصة.</p>
              </div>
              <span className="px-3.5 py-1.5 rounded-xl bg-purple-100 text-purple-800 font-bold text-xs">
                إجمالي المواد: {mediaGallery.length}
              </span>
            </div>

            {/* نموذج رفع المادة */}
            <form onSubmit={handleUploadMediaSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-purple-50/40 p-6 rounded-2xl border border-purple-200">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">عنوان التغطية أو الفعالية</label>
                <input
                  type="text"
                  placeholder="مثال: تغطية ملتقى التمريض المرئي"
                  value={mediaTitle}
                  onChange={(e) => setMediaTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-900"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">تصنيف المحتوى</label>
                <select
                  value={mediaCategory}
                  onChange={(e) => setMediaCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-900 font-bold"
                >
                  <option value="تغطيات مرئية وفيديوهات 🎥">تغطيات مرئية وفيديوهات 🎥</option>
                  <option value="صور فعاليات وتوثيق 📸">صور فعاليات وتوثيق 📸</option>
                  <option value="تصاميم وبوسترات 🎨">تصاميم وبوسترات 🎨</option>
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700">اختر الملفات والفيديوهات (📁 بدون أي قيود على الحجم)</label>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      setMediaType(file.type.startsWith('video') ? 'video' : 'image');
                      setMediaBase64(await convertFileToBase64(file));
                    }
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white cursor-pointer"
                  required
                />
              </div>

              {/* معاينة فورية للملف المختار قبل الرفع */}
              {mediaBase64 && (
                <div className="sm:col-span-2 p-4 bg-white rounded-2xl border border-purple-200 space-y-2">
                  <span className="text-xs font-bold text-purple-800">👁️ معاينة الملف قبل النشر:</span>
                  {mediaType === 'video' ? (
                    <video src={mediaBase64} controls className="w-full h-48 object-cover rounded-xl border" />
                  ) : (
                    <img src={mediaBase64} alt="معاينة" className="w-full h-48 object-cover rounded-xl border" />
                  )}
                </div>
              )}

              <div className="sm:col-span-2 pt-2">
                <button type="submit" className="bg-purple-600 text-white px-8 py-3 rounded-xl font-black text-xs shadow hover:bg-purple-700 cursor-pointer">
                  + رفع ونشر محتوى لجنة الإعلام سحابياً 🎬
                </button>
              </div>
            </form>

            {/* عرض أرشيف ومقاطع لجنة الإعلام المرئية مع أزرار المعاينة والحذف */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="font-black text-slate-900 text-sm">أرشيف تغطيات لجنة الإعلام ({mediaGallery.length})</h3>
              {mediaGallery.length === 0 ? (
                <p className="text-center py-8 text-slate-400 font-bold text-xs bg-slate-50 rounded-2xl">لم يتم رفع أي محتوى مرئي أو صور للجنة الإعلام حتى الآن.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {mediaGallery.map((item) => (
                    <div key={item.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <span className="text-[10px] bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full font-bold">{item.category}</span>
                        <h5 className="font-extrabold text-slate-900 text-sm">{item.title}</h5>
                        <p className="text-[10px] text-slate-400">بواسطة: {item.addedBy} ({item.createdAt})</p>
                      </div>

                      <div className="rounded-xl overflow-hidden border border-slate-200 bg-black/5 relative group h-36">
                        {item.mediaType === 'video' ? (
                          <video src={item.mediaUrl} className="w-full h-full object-cover" />
                        ) : (
                          <img src={item.mediaUrl} alt={item.title} className="w-full h-full object-cover" />
                        )}
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setPreviewItem(item)}
                          className="flex-1 py-2 bg-sky-50 text-sky-700 text-center font-bold text-xs rounded-xl border border-sky-200 hover:bg-sky-100 transition-all cursor-pointer"
                        >
                          👁️ عرض المعاينة
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMediaItem(item.id)}
                          className="px-3 py-2 bg-red-50 text-red-600 text-center font-bold text-xs rounded-xl border border-red-200 hover:bg-red-100 transition-all cursor-pointer"
                          title="حذف المادة"
                        >
                          🗑️ حذف
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* مهام اللجنة (Checklist Tasks) والربط مع الجودة */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-xl space-y-6">
          <div className="flex justify-between items-center flex-wrap gap-2 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">📌 مهام اللجنة ومهام لجنة الجودة والتطوير</h2>
              <p className="text-xs text-slate-500 mt-1">تابع المهام والفعاليات المسندة للجنة وقم بتحديث إنجازها لتكسب نقاطك الفردية:</p>
            </div>
            <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-xl text-xs font-bold">
              {relevantTasks.length} مهام متاحة
            </span>
          </div>

          {relevantTasks.length === 0 ? (
            <p className="text-center py-8 text-slate-400 text-xs bg-slate-50 rounded-2xl">لا توجد مهام أو فعاليات معتمدة لهذه اللجنة حتى الآن.</p>
          ) : (
            <div className="space-y-6">
              {relevantTasks.map((taskGroup) => (
                <div key={taskGroup.id} className="p-6 rounded-3xl border border-slate-200 bg-slate-50/50 shadow-sm space-y-4">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <div>
                      <span className="text-[10px] bg-[#630517]/10 text-[#630517] font-bold px-2.5 py-1 rounded-md">لجنة: {taskGroup.committee}</span>
                      <h4 className="font-extrabold text-slate-900 text-sm mt-2">فعالية: {taskGroup.eventTitle}</h4>
                    </div>
                    <span className="text-xs font-bold text-slate-500">الموعد: {taskGroup.dueDate}</span>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    {(taskGroup.subTasks || []).map((st: any, idx: number) => (
                      <div
                        key={idx}
                        onClick={() => handleToggleSubTask(taskGroup.id, idx)}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                          st.completed ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-lg flex items-center justify-center font-bold text-xs border ${
                            st.completed ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                          }`}>
                            {st.completed ? '✓' : ''}
                          </div>
                          <span className={`text-xs font-bold ${st.completed ? 'line-through' : ''}`}>{st.text}</span>
                        </div>
                        {st.completedBy && (<span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">بإنجاز: {st.completedBy}</span>)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* نافذة معاينة الميديا الكبيرة داخل الصفحة */}
      {previewItem && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-3xl w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <span className="text-[10px] bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full font-bold">{previewItem.category}</span>
                <h3 className="font-black text-slate-900 text-lg mt-1">{previewItem.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center hover:bg-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden border max-h-[60vh] flex items-center justify-center bg-black">
              {previewItem.mediaType === 'video' ? (
                <video src={previewItem.mediaUrl} controls autoPlay className="max-h-[60vh] w-auto mx-auto" />
              ) : (
                <img src={previewItem.mediaUrl} alt={previewItem.title} className="max-h-[60vh] w-auto mx-auto object-contain" />
              )}
            </div>

            <div className="flex justify-between items-center text-xs text-slate-500 pt-2">
              <span>تم الرفع بواسطة: <strong>{previewItem.addedBy}</strong> ({previewItem.createdAt})</span>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="px-6 py-2 bg-[#630517] text-[#F5D061] font-bold rounded-xl cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة رفع الاعتذار */}
      {showExcuseModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <form onSubmit={handleUploadExcuseSubmit} className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl space-y-6 border-2 border-[#630517]/20">
            <div className="w-16 h-16 bg-[#630517] text-[#F5D061] rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-lg">
              🙋‍♂️
            </div>
            <div className="space-y-1 text-center">
              <h3 className="text-xl font-black text-slate-900">أنا أعتذر عن حضور فعالية</h3>
              <p className="text-xs text-slate-500">اختر الفعالية التي تعتذر عنها واكتب سببك ببساطة:</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">اختر الفعالية</label>
                <select
                  value={selectedEventTitle}
                  onChange={(e) => setSelectedEventTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:outline-none focus:border-[#630517]"
                  required
                >
                  {eventsList.length === 0 ? (
                    <option value="الفعالية العامة للنادي">الفعالية العامة للنادي</option>
                  ) : (
                    eventsList.map((ev, i) => (
                      <option key={i} value={ev.title}>{ev.title} ({ev.date || 'قريباً'})</option>
                    ))
                  )}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">سبب الاعتذار</label>
                <textarea
                  rows={3}
                  placeholder="مثال: أعتذر عن عدم الحضور بسبب ظرف طارئ..."
                  value={excuseText}
                  onChange={(e) => setExcuseText(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#630517]"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowExcuseModal(false)}
                className="w-1/2 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="w-1/2 py-3 rounded-2xl bg-[#630517] text-[#F5D061] font-black text-xs shadow hover:brightness-110 cursor-pointer"
              >
                إرسال الاعتذار 🚀
              </button>
            </div>
          </form>
        </div>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-6 border-2 border-[#F5D061]">
            <div className="w-16 h-16 bg-[#630517] text-[#F5D061] rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-lg">
              ✨
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900">تم بنجاح</h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">{modalMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-3 rounded-2xl bg-[#630517] text-[#F5D061] font-black text-xs shadow hover:brightness-110 cursor-pointer transition-all"
            >
              حسنًا 🚀
            </button>
          </div>
        </div>
      )}
    </main>
  );
}