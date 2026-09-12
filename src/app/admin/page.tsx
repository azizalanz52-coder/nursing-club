'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, setDoc, getDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

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
  lastActive?: number;
}

// واجهة إنجازات طلبة التمريض
interface StudentAchievement {
  id: string;
  studentName: string;
  awardName: string;
  image: string;
  description: string;
  createdAt: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  
  const [isSystemAdminUser, setIsSystemAdminUser] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'users-manager' | 'discover' | 'passion' | 'events' | 'banners' | 'team' | 'requests' | 'partners' | 'suggestions' | 'escalated-reports' | 'historical-vault' | 'performance-radar' | 'media-committee' | 'student-achievements'>('requests');

  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const [escalatedReports, setEscalatedReports] = useState<any[]>([]);
  const [historicalVaultReports, setHistoricalVaultReports] = useState<any[]>([]);

  // حالات إنجازات طلبة كلية التمريض
  const [studentAchievements, setStudentAchievements] = useState<StudentAchievement[]>([]);
  const [studentNameInput, setStudentNameInput] = useState<string>('');
  const [awardNameInput, setAwardNameInput] = useState<string>('');
  const [achievementDescInput, setAchievementDescInput] = useState<string>('');
  const [studentImageInput, setStudentImageInput] = useState<string>('/logo.png');

  const [modalType, setModalType] = useState<'none' | 'success' | 'phone' | 'password' | 'name' | 'confirm'>('none');
  const [modalMessage, setModalMessage] = useState<string>('');
  const [activeUserPhoneForAction, setActiveUserPhoneForAction] = useState<string>('');
  const [modalInputVal, setModalInputVal] = useState<string>('');
  const [confirmActionCallback, setConfirmActionCallback] = useState<(() => void) | null>(null);

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
            if (
              userRole !== 'رئيس النادي' && 
              userRole !== 'نائبة الرئيس' && 
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
    fetchEscalatedReports();
    fetchHistoricalVault();
    fetchStudentAchievements();
  }, [router]);

  const fetchStudentAchievements = async () => {
    try {
      const snap = await getDocs(collection(db, 'student_achievements'));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as StudentAchievement[];
      setStudentAchievements(list);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddStudentAchievement = async (e: FormEvent) => {
    e.preventDefault();
    if (!studentNameInput.trim() || !awardNameInput.trim()) return;

    const achId = Date.now().toString();
    const newAch: StudentAchievement = {
      id: achId,
      studentName: studentNameInput.trim(),
      awardName: awardNameInput.trim(),
      image: studentImageInput,
      description: achievementDescInput.trim() || 'إنجاز مشرف ومميز يضاف لسجل طالبات وطلاب كلية التمريض.',
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'student_achievements', achId), newAch);
      setStudentAchievements([newAch, ...studentAchievements]);
      setStudentNameInput('');
      setAwardNameInput('');
      setAchievementDescInput('');
      setStudentImageInput('/logo.png');
      setModalMessage('تم إضافة إنجاز الطالب بنجاح ونشره سحابياً للموقع! 🏆✨');
      setModalType('success');
    } catch (err) {
      console.error(err);
      setModalMessage('حدث خطأ أثناء حفظ الإنجاز.');
      setModalType('success');
    }
  };

  const handleDeleteStudentAchievement = (id: string) => {
    triggerConfirmModal('هل أنت متأكد من حذف هذا الإنجاز من السحابة؟', async () => {
      try {
        await deleteDoc(doc(db, 'student_achievements', id));
        setStudentAchievements(studentAchievements.filter(a => a.id !== id));
        setModalMessage('تم حذف الإنجاز بنجاح.');
        setModalType('success');
      } catch (err) {
        console.error(err);
      }
    });
  };

  const fetchEscalatedReports = async () => {
    try {
      const snap = await getDocs(collection(db, 'escalated_reports'));
      const reports = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setEscalatedReports(reports);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchHistoricalVault = async () => {
    try {
      const snap1 = await getDocs(collection(db, 'historical_vault_reports'));
      const snap2 = await getDocs(collection(db, 'quality_reports_archive'));
      
      const reports1 = snap1.docs.map(d => ({ id: d.id, ...d.data() }));
      const reports2 = snap2.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const combined = [...reports1, ...reports2];
      setHistoricalVaultReports(combined);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadReportPdf = (vaultItem: any) => {
    try {
      const docPdf = new jsPDF();
      docPdf.text('Nursing Club - Historical Vault Report', 14, 20);
      docPdf.text(`Title / Committee: ${vaultItem.title || vaultItem.targetCommittee || 'N/A'}`, 14, 30);
      docPdf.text(`Details: ${vaultItem.reason || vaultItem.status || 'N/A'}`, 14, 40);
      docPdf.text(`Reporter / Author: ${vaultItem.reporter || vaultItem.author || 'Quality Committee'}`, 14, 50);
      docPdf.text(`Date: ${vaultItem.dateStr || (vaultItem.archivedAt ? new Date(vaultItem.archivedAt).toLocaleDateString() : 'N/A')}`, 14, 60);
      docPdf.save(`Vault_Report_${vaultItem.id || Date.now()}.pdf`);
      
      setModalMessage('تم تحميل التقرير كملف PDF بنجاح! 📄');
      setModalType('success');
    } catch (err) {
      console.error('PDF generation error:', err);
      setModalMessage('حدث خطأ أثناء محاولة تحميل ملف الـ PDF.');
      setModalType('success');
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

  const [passionSlides, setPassionSlides] = useState<PassionSlide[]>([]);
  const [newPassionQuote, setNewPassionQuote] = useState<string>('');
  const [newPassionImage, setNewPassionImage] = useState<string>('/header-banner.png');

  const [discoverEvents, setDiscoverEvents] = useState<DiscoverEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [newDiscTitle, setNewDiscTitle] = useState<string>('');
  const [newDiscCategory, setNewDiscCategory] = useState<string>('أنشطة كبرى');
  const [newDiscDesc, setNewDiscDesc] = useState<string>('');
  const [newDiscImages, setNewDiscImages] = useState<string[]>([]);

  const [mediaUploads, setMediaUploads] = useState<any[]>([]);
  const [mediaTitle, setMediaTitle] = useState<string>('');
  const [mediaCategory, setMediaCategory] = useState<string>('تغطيات مرئية');
  const [mediaFiles, setMediaFiles] = useState<string[]>([]);

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
    { id: 'design', name: 'لجنة التصميم', maleLeader: 'عبدالعزيز العنزي', femaleLeader: 'شجون الحربي', members: [] },
    { id: 'media', name: 'لجنة الاعلام', maleLeader: 'راشد السبيعي', femaleLeader: 'ريم الشمري', members: [] },
    { id: 'events-org', name: 'لجنة تنظيم الفعاليات', maleLeader: 'فيصل الدوسري', femaleLeader: 'غادة العمري', members: [] },
    { id: 'hr', name: 'لجنة الموارد البشرية', maleLeader: 'تركي العنزي', femaleLeader: 'سارة الرشيدي', members: [] },
    { id: 'pr', name: 'لجنة العلاقات العامة', maleLeader: 'خالد القحطاني', femaleLeader: 'ديمة العتيبي', members: [] },
    { id: 'scientific', name: 'لجنة المحتوى العلمي', maleLeader: 'فهد المطيري', femaleLeader: 'أفنان العنزي', members: [] },
    { id: 'quality', name: 'لجنة الجودة والتطوير', maleLeader: 'سلطان الحربي', femaleLeader: 'نورة الدوسري', members: [] },
  ]);

  const [selectedCommitteeId, setSelectedCommitteeId] = useState<string>('design');
  const currentCommittee = committees.find((c) => c.id === selectedCommitteeId) || committees[0];

  const [newMemberName, setNewMemberName] = useState<string>('');
  const [newMemberRole, setNewMemberRole] = useState<string>('');

  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
  const [warningTargetReportId, setWarningTargetReportId] = useState<string>('');
  const [warningTargetCommittee, setWarningTargetCommittee] = useState<string>('');
  const [warningMessageText, setWarningMessageText] = useState<string>('');

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

        const mediaSnap = await getDocs(collection(db, 'media_committee_uploads'));
        if (!mediaSnap.empty) {
          const mediaList: any[] = [];
          mediaSnap.forEach((d) => { mediaList.push({ id: d.id, ...d.data() }); });
          setMediaUploads(mediaList);
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
    if (!isSystemAdminUser) return;
    try {
      const userRef = doc(db, 'users', phone);
      await updateDoc(userRef, { 
        role: newRole,
        latestNotification: `مبروك! تم ترقيتك وتعيين رتبتك إلى (${newRole}) بنجاح 🎉`
      });
      setUsersList(usersList.map((u) => u.phone === phone ? { ...u, role: newRole } : u));
      setModalMessage(`تم تحديث رتبة العضو إلى (${newRole}) بنجاح سحابياً! 🚀`);
      setModalType('success');
    } catch (err) {
      console.error(err);
      setModalMessage('حدث خطأ أثناء تحديث الرتبة.');
      setModalType('success');
    }
  };

  const handleAssignedCommitteeChange = async (phone: string, commName: string) => {
    if (!isSystemAdminUser) return;
    try {
      const userRef = doc(db, 'users', phone);
      await updateDoc(userRef, { 
        assignedCommittee: commName,
        latestNotification: `تم تعيينك من قبل الإدارة رئيساً لـ (${commName}) 🛡️`
      });
      setUsersList(usersList.map((u) => u.phone === phone ? { ...u, assignedCommittee: commName } : u));
      setModalMessage(`تم تعيين اللجنة (${commName}) لهذا العضو بنجاح سحابياً! 🚀`);
      setModalType('success');
    } catch (err) {
      console.error(err);
      setModalMessage('حدث خطأ أثناء تعيين اللجنة.');
      setModalType('success');
    }
  };

  const openPasswordModal = (phone: string) => {
    setActiveUserPhoneForAction(phone);
    setModalInputVal('');
    setModalType('password');
  };

  const submitUpdatePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!modalInputVal.trim()) return;

    try {
      const userRef = doc(db, 'users', activeUserPhoneForAction);
      await updateDoc(userRef, { password: modalInputVal.trim() });
      setUsersList(usersList.map(u => u.phone === activeUserPhoneForAction ? { ...u, password: modalInputVal.trim() } : u));
      setModalMessage('تم تحديث كلمة المرور بنجاح سحابياً! 🔒');
      setModalType('success');
    } catch (err) {
      console.error(err);
      setModalMessage('حدث خطأ أثناء تحديث كلمة المرور.');
      setModalType('success');
    }
  };

  const openNameModal = (phone: string, currentName: string) => {
    setActiveUserPhoneForAction(phone);
    setModalInputVal(currentName || '');
    setModalType('name');
  };

  const submitUpdateName = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = modalInputVal.trim();
    if (!trimmedName) return;

    try {
      const userRef = doc(db, 'users', activeUserPhoneForAction);
      await updateDoc(userRef, { fullName: trimmedName });
      setUsersList(usersList.map(u => u.phone === activeUserPhoneForAction ? { ...u, fullName: trimmedName } : u));
      setModalMessage('تم تحديث اسم المستخدم بنجاح سحابياً! 👤');
      setModalType('success');
    } catch (err) {
      console.error(err);
      setModalMessage('حدث خطأ أثناء تحديث الاسم.');
      setModalType('success');
    }
  };

  const openPhoneModal = (oldPhone: string) => {
    setActiveUserPhoneForAction(oldPhone);
    setModalInputVal(oldPhone);
    setModalType('phone');
  };

  const submitUpdatePhone = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedNewPhone = modalInputVal.trim();
    if (!trimmedNewPhone || trimmedNewPhone === activeUserPhoneForAction) return;

    try {
      const oldUserRef = doc(db, 'users', activeUserPhoneForAction);
      const oldUserSnap = await getDoc(oldUserRef);

      if (!oldUserSnap.exists()) {
        setModalMessage('لم يتم العثور على بيانات المستخدم.');
        setModalType('success');
        return;
      }

      const userData = oldUserSnap.data();
      const newUserRef = doc(db, 'users', trimmedNewPhone);
      
      await setDoc(newUserRef, {
        ...userData,
        phone: trimmedNewPhone,
        latestNotification: 'تم تحديث رقم جوالك الإداري بنجاح 📱'
      });

      await deleteDoc(oldUserRef);

      setUsersList(usersList.map(u => u.phone === activeUserPhoneForAction ? { ...u, phone: trimmedNewPhone } : u));
      setModalMessage('تم تحديث رقم جوال المستخدم بنجاح وتحديثه سحابياً! 🚀');
      setModalType('success');
    } catch (err) {
      console.error(err);
      setModalMessage('حدث خطأ أثناء تحديث رقم الجوال.');
      setModalType('success');
    }
  };

  const triggerConfirmModal = (message: string, callback: () => void) => {
    setModalMessage(message);
    setConfirmActionCallback(() => callback);
    setModalType('confirm');
  };

  const handleOpenWarningModal = (rep: any) => {
    setWarningTargetReportId(rep.id);
    setWarningTargetCommittee(rep.targetCommittee);
    setWarningMessageText(`عاجل لقائد وقائدة (${rep.targetCommittee}): تم رصد تقصير في المهام لديكم (${rep.reason}). نرجو تدارك الأمر وتصحيحه خلال 24 ساعة، وإلا سيتم رفع بلاغ رسمي وإحالتكم فوراً لرئيس ونائبة الرئيس لاتخاذ الإجراءات التأديبية ⚠️.`);
    setShowWarningModal(true);
  };

  const handleSendWarningToLeaders = async (e: FormEvent) => {
    e.preventDefault();
    if (!warningTargetReportId) return;

    try {
      const repRef = doc(db, 'escalated_reports', warningTargetReportId);
      await updateDoc(repRef, {
        status: 'تم إرسال إنذار للقادة (بانتظار الرد)',
        warningText: warningMessageText,
        warningSentAt: new Date().toISOString()
      });

      setEscalatedReports(escalatedReports.map(r => r.id === warningTargetReportId ? {
        ...r,
        status: 'تم إرسال إنذار للقادة (بانتظار الرد)',
        warningText: warningMessageText
      } : r));

      setShowWarningModal(false);
      setModalMessage('تم إرسال الإنذار التحذيري لقائد وقائدة اللجنة بنجاح! 📨');
      setModalType('success');
    } catch (err) {
      console.error(err);
      setModalMessage('حدث خطأ أثناء إرسال الإنذار.');
      setModalType('success');
    }
  };

  const handleEscalateToPresidentsFinal = async (rep: any) => {
    triggerConfirmModal(`هل أنت متأكد من عدم تجاوب قائد وقائدة (${rep.targetCommittee}) وترغب في رفع البلاغ وإحالته رسمياً لرئيس ونائبة الرئيس الآن وأرشفته؟`, async () => {
      try {
        const repRef = doc(db, 'escalated_reports', rep.id);
        const finalStatus = 'مُحال رسمياً لرئيس ونائبة الرئيس (لعدم التجاوب 🚨)';
        
        await updateDoc(repRef, {
          status: finalStatus,
          escalatedToPresidentsAt: new Date().toISOString()
        });

        const archiveId = `vault_${rep.id}_${Date.now()}`;
        const archivedObj = {
          ...rep,
          status: finalStatus,
          archivedAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'historical_vault_reports', archiveId), archivedObj);

        setEscalatedReports(escalatedReports.map(r => r.id === rep.id ? {
          ...r,
          status: finalStatus
        } : r));

        setHistoricalVaultReports([archivedObj, ...historicalVaultReports]);

        setModalMessage('تم رفع البلاغ وإحالته رسمياً لرئيس ونائبة الرئيس وأرشفته في السجل التاريخي بنجاح تام! ⚖️📦');
        setModalType('success');
      } catch (err) {
        console.error(err);
      }
    });
  };

  const handleDeleteSuggestion = (id: string) => {
    triggerConfirmModal('هل أنت متأكد من حذف هذا المقترح من السحابة؟', async () => {
      try {
        await deleteDoc(doc(db, 'suggestions', id));
        setSuggestions(suggestions.filter((s) => s.id !== id));
        setModalMessage('تم حذف المقترح بنجاح.');
        setModalType('success');
      } catch (err) {
        console.error(err);
      }
    });
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
          setModalMessage('الملف فارغ أو لا يحتوي على البيانات المطلوبة.');
          setModalType('success');
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

        setModalMessage(`تمت العملية بنجاح! 🚀\n- أُضيف جديد: ${addedCount}\n- تم تخطي المكرر: ${skippedCount}`);
        setModalType('success');
      } catch (err) {
        console.error('Error importing excel:', err);
        setModalMessage('حدث خطأ أثناء قراءة ملف الأكسل.');
        setModalType('success');
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
      setModalMessage('تم إضافة الشريحة وحفظها سحابياً بنجاح! ✨');
      setModalType('success');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePassionSlide = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'site_passion_slides', id));
      setPassionSlides(passionSlides.filter((s) => s.id !== id));
      setModalMessage('تم حذف الشريحة بنجاح.');
      setModalType('success');
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
      setModalMessage('تم إنشاء الفعالية ونشر الصور سحابياً للجميع! 🖼️');
      setModalType('success');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectMediaFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const base64Files: string[] = [];
      for (const file of filesArray) {
        const base64 = await convertFileToBase64(file);
        base64Files.push(base64);
      }
      setMediaFiles((prev) => [...prev, ...base64Files]);
    }
  };

  const handleUploadMediaCommitteeContent = async (e: FormEvent) => {
    e.preventDefault();
    if (!mediaTitle.trim()) return;
    const mediaId = Date.now().toString();
    const mediaObj = {
      id: mediaId,
      title: mediaTitle,
      category: mediaCategory,
      files: mediaFiles,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'media_committee_uploads', mediaId), mediaObj);
      setMediaUploads([mediaObj, ...mediaUploads]);
      setMediaTitle('');
      setMediaFiles([]);
      setModalMessage('تم رفع الصور والفيديوهات الخاصة بلجنة الإعلام بنجاح سحابياً! 🎥📸');
      setModalType('success');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMediaUpload = (id: string) => {
    triggerConfirmModal('هل أنت متأكد من حذف محتوى لجنة الإعلام هذا؟', async () => {
      try {
        await deleteDoc(doc(db, 'media_committee_uploads', id));
        setMediaUploads(mediaUploads.filter((m) => m.id !== id));
        setModalMessage('تم الحذف بنجاح.');
        setModalType('success');
      } catch (err) {
        console.error(err);
      }
    });
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
        setModalMessage('تم رفع وإضافة الصور سحابياً بنجاح! 🚀');
        setModalType('success');
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

  const handleDeleteEntireDiscoverEvent = (id: string) => {
    triggerConfirmModal('هل أنت متأكد من حذف هذه الفعالية بالكامل؟', async () => {
      try {
        await deleteDoc(doc(db, 'site_discover_events', id));
        const updated = discoverEvents.filter((ev) => ev.id !== id);
        setDiscoverEvents(updated);
        if (updated.length > 0) setSelectedEventId(updated[0].id);
        setModalMessage('تم الحذف بنجاح.');
        setModalType('success');
      } catch (err) {
        console.error(err);
      }
    });
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
        setModalMessage('تم تعديل الفعالية بنجاح! 📅');
        setModalType('success');
      } else {
        setEvents([eventObj, ...events]);
        setModalMessage('تم نشر الفعالية بنجاح سحابياً! 📅');
        setModalType('success');
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

  const handleDeleteEvent = (id: string) => {
    triggerConfirmModal('هل أنت متأكد من حذف هذه الفعالية؟', async () => {
      try {
        await deleteDoc(doc(db, 'site_events', id));
        setEvents(events.filter((ev) => ev.id !== id));
        setModalMessage('تم الحذف بنجاح.');
        setModalType('success');
      } catch (err) {
        console.error(err);
      }
    });
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
      setModalMessage('تم إضافة وتفعيل البانر بنجاح سحابياً! 🖼️');
      setModalType('success');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteBanner = (id: string) => {
    triggerConfirmModal('هل أنت متأكد من حذف هذا البانر؟', async () => {
      try {
        await deleteDoc(doc(db, 'site_banners', id));
        setBanners(banners.filter((b) => b.id !== id));
        setModalMessage('تم الحذف بنجاح.');
        setModalType('success');
      } catch (err) {
        console.error(err);
      }
    });
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
      setModalMessage('تم إضافة شريك النجاح بنجاح سحابياً! 🤝');
      setModalType('success');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePartner = (id: string) => {
    triggerConfirmModal('هل أنت متأكد من حذف هذا الشريك؟', async () => {
      try {
        await deleteDoc(doc(db, 'site_partners', id));
        setPartners(partners.filter((p) => p.id !== id));
        setModalMessage('تم الحذف بنجاح.');
        setModalType('success');
      } catch (err) {
        console.error(err);
      }
    });
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
        whatsappLink: whatsappLink,
        latestNotification: `مبروك! تم قبولك رسمياً في (${acceptedCommittee}) 🎉. انضم لقروب الواتساب: ${whatsappLink}`
      });

      if (targetRequest.phone) {
        try {
          const userDocRef = doc(db, 'users', targetRequest.phone);
          await updateDoc(userDocRef, {
            latestNotification: `🎉 مبارك القبول النهائي في (${acceptedCommittee})!`
          });
        } catch (e) { console.error(e); }
      }

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
      setModalMessage(`تم قبول العضو وإضافته تلقائياً إلى (${acceptedCommittee}) بنجاح سحابياً! 🚀`);
      setModalType('success');
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectRequest = (id: string) => {
    triggerConfirmModal('هل أنت متأكد من رفض هذا الطلب؟', async () => {
      try {
        const docRef = doc(db, 'applications', id);
        await updateDoc(docRef, { 
          status: 'مرفوض',
          latestNotification: 'عذراً، لم يتم قبول طلبك في النادي هذه المرة. نتمنى لك التوفيق!'
        });
        setRequests(requests.map((req) => req.id === id ? { ...req, status: 'مرفوض' } : req));
        setModalMessage('تم رفض الطلب وإرسال التنبيه للعضو.');
        setModalType('success');
      } catch (err) {
        console.error(err);
      }
    });
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
      setModalMessage('تم تحويل الطالب إلى رغبته التالية بنجاح سحابياً! 🔄');
      setModalType('success');
    } catch (err) {
      console.error(err);
      setModalMessage('حدث خطأ أثناء تحويل رغبة الطالب.');
      setModalType('success');
    }
  };

  const handleDeleteRequest = (id: string) => {
    triggerConfirmModal('هل أنت متأكد من الحذف النهائي للطلب من السحابة؟', async () => {
      try {
        await deleteDoc(doc(db, 'applications', id));
        setRequests(requests.filter((req) => req.id !== id));
        setModalMessage('تم الحذف النهائي بنجاح.');
        setModalType('success');
      } catch (err) {
        console.error(err);
      }
    });
  };

  const handleSaveLeadersSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'committees', selectedCommitteeId), {
        maleLeader: currentCommittee.maleLeader,
        femaleLeader: currentCommittee.femaleLeader,
        members: currentCommittee.members || []
      }, { merge: true });
      setModalMessage(`تم حفظ وتحديث قادة "${currentCommittee.name}" بنجاح سحابياً! ✨`);
      setModalType('success');
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
      setModalMessage('تم إضافة العضو بنجاح سحابياً! 👥');
      setModalType('success');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMember = (index: number) => {
    triggerConfirmModal('هل أنت متأكد من حذف هذا العضو من اللجنة؟', async () => {
      const updatedMembers = [...(currentCommittee.members || [])];
      updatedMembers.splice(index, 1);

      setCommittees(committees.map((c) => c.id === selectedCommitteeId ? { ...c, members: updatedMembers } : c));

      try {
        await setDoc(doc(db, 'committees', selectedCommitteeId), {
          maleLeader: currentCommittee.maleLeader,
          femaleLeader: currentCommittee.femaleLeader,
          members: updatedMembers
        }, { merge: true });
        setModalMessage('تم الحذف بنجاح.');
        setModalType('success');
      } catch (err) {
        console.error(err);
      }
    });
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

        <div className="bg-gradient-to-r from-[#630517] to-[#80071D] rounded-3xl p-6 text-white shadow-xl flex flex-wrap justify-between items-center gap-6">
          <div className="space-y-1">
            <span className="bg-[#F5D061] text-[#630517] font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-wider">
              نظام القيادة الماسية 🏆
            </span>
            <h2 className="text-xl font-black">غرفة عمليات القيادة ونبض النادي</h2>
            <p className="text-xs text-white/80">تابع أداء اللجان، ادرس طلبات الانضمام، وانشر الفعاليات والإنجازات.</p>
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
              <span className="block text-2xl font-black text-amber-300">{studentAchievements.length}</span>
              <span className="text-[10px] font-bold text-white/90">إنجازات الطلبة</span>
            </div>
          </div>
        </div>

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

          <button
            type="button"
            onClick={() => setActiveTab('student-achievements')}
            className={`px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-sm ${
              activeTab === 'student-achievements' ? 'bg-amber-600 text-white shadow-md scale-105' : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            🏆 إنجازات طلبة كلية التمريض
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('performance-radar')}
            className={`px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-sm ${
              activeTab === 'performance-radar' ? 'bg-indigo-700 text-white shadow-md scale-105' : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
            }`}
          >
            📊 رادار أداء اللجان الشامل 🛡️
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('media-committee')}
            className={`px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-sm ${
              activeTab === 'media-committee' ? 'bg-rose-700 text-white shadow-md scale-105' : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            🎥 قسم لجنة الإعلام (صور وفيديوهات)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('historical-vault')}
            className={`px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-sm ${
              activeTab === 'historical-vault' ? 'bg-amber-700 text-white shadow-md scale-105' : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            📦 أرشيف التقارير التاريخية ({historicalVaultReports.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('escalated-reports')}
            className={`px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-sm relative ${
              activeTab === 'escalated-reports' ? 'bg-red-600 text-white shadow-md scale-105' : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
            }`}
          >
            🚨 تقارير وإنذارات الجودة ({escalatedReports.length})
          </button>

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

        {/* قسم إنجازات طلبة كلية التمريض الجديد */}
        {activeTab === 'student-achievements' && (
          <div className="space-y-8">
            <div className="bg-white rounded-3xl p-8 border border-amber-300 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-xl font-black text-amber-900">🏆 إضافة إنجاز جديد لطالب من كلية التمريض</h3>
                <p className="text-xs text-slate-500">أدخل اسم الطالب، اسم الجائزة أو التكريم، صورة الطالب، وتفاصيل الإنجاز لعرضها في الصفحة الرئيسية للموقع.</p>
              </div>

              <form onSubmit={handleAddStudentAchievement} className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-amber-50/40 p-6 rounded-2xl border border-amber-200">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">اسم الطالب / الطالبة</label>
                  <input
                    type="text"
                    placeholder="مثال: عبدالعزيز بن سليمان العنزي"
                    value={studentNameInput}
                    onChange={(e) => setStudentNameInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:border-amber-600"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">اسم الجائزة أو الإنجاز</label>
                  <input
                    type="text"
                    placeholder="مثال: المركز الأول في مسار الابتكار الطبي"
                    value={awardNameInput}
                    onChange={(e) => setAwardNameInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:border-amber-600"
                    required
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">صورة الطالب أو الطالبة الشخصية / التكريم (صورة 📁)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                      if (e.target.files && e.target.files[0]) {
                        const base64 = await convertFileToBase64(e.target.files[0]);
                        setStudentImageInput(base64);
                      }
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white file:mr-4 file:py-1 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-600 file:text-white cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">وصف الإنجاز والتفاصيل</label>
                  <textarea
                    rows={3}
                    placeholder="اكتب نبذة مختصرة عن التكريم أو الإنجاز المفخرة لكلية التمريض..."
                    value={achievementDescInput}
                    onChange={(e) => setAchievementDescInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div className="sm:col-span-2 pt-2">
                  <button
                    type="submit"
                    className="bg-amber-600 text-white px-8 py-3 rounded-xl font-black text-xs shadow hover:bg-amber-700 cursor-pointer"
                  >
                    + نشر إنجاز الطالب في الموقع سحابياً 🚀
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-xl font-black text-slate-900">سجل إنجازات طلبة كلية التمريض المعتمدة ({studentAchievements.length})</h3>
              {studentAchievements.length === 0 ? (
                <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-sm font-bold">لم تتم إضافة أي إنجاز للطلبة حتى الآن.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {studentAchievements.map((ach) => (
                    <div key={ach.id} className="p-6 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-sm flex flex-col justify-between space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <img src={ach.image || '/logo.png'} alt={ach.studentName} className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-400 shadow" />
                          <div>
                            <h4 className="font-black text-slate-900 text-sm">{ach.studentName}</h4>
                            <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold inline-block mt-1">
                              {ach.awardName}
                            </span>
                          </div>
                        </div>
                        <p className="text-slate-700 text-xs font-semibold bg-white p-3 rounded-xl border border-amber-100 shadow-inner leading-relaxed">
                          "{ach.description}"
                        </p>
                      </div>

                      <div className="pt-2 border-t border-amber-200 flex justify-between items-center text-[11px]">
                        <span className="text-slate-400">{new Date(ach.createdAt).toLocaleDateString('ar-SA')}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteStudentAchievement(ach.id)}
                          className="px-3 py-1 rounded-lg bg-red-50 text-red-600 font-bold hover:bg-red-100 cursor-pointer"
                        >
                          حذف الإنجاز ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* باقي التبويبات كما هي */}
        {activeTab === 'media-committee' && (
          <div className="space-y-8">
            <div className="bg-white rounded-3xl p-8 border border-rose-200 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-xl font-black text-rose-900">🎥 رفع وتوثيق محتوى لجنة الإعلام (صور وفيديوهات)</h3>
                <p className="text-xs text-slate-500">خاص برفع التغطيات المرئية والفيديوهات والصور وتخزينها سحابياً لعرضها في المنصة.</p>
              </div>

              <form onSubmit={handleUploadMediaCommitteeContent} className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-rose-50/30 p-6 rounded-2xl border border-rose-100">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">عنوان التغطية أو الفعالية</label>
                  <input
                    type="text"
                    placeholder="مثال: تغطية ملتقى التمريض المرئي"
                    value={mediaTitle}
                    onChange={(e) => setMediaTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-rose-700"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">تصنيف المحتوى</label>
                  <select
                    value={mediaCategory}
                    onChange={(e) => setMediaCategory(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white"
                  >
                    <option value="تغطيات مرئية وفيديوهات">تغطيات مرئية وفيديوهات 🎥</option>
                    <option value="صور فوتوغرافية">صور فوتوغرافية 📸</option>
                    <option value="موشن غرافيك">موشن غرافيك 🎬</option>
                  </select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">اختر الملفات (صور وفيديوهات متعددة 📁)</label>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleSelectMediaFiles}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white file:mr-4 file:py-1 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-rose-700 file:text-white cursor-pointer"
                  />
                </div>

                <div className="sm:col-span-2 pt-2">
                  <button
                    type="submit"
                    className="bg-rose-700 text-white px-8 py-3 rounded-xl font-black text-xs shadow hover:bg-rose-800 cursor-pointer"
                  >
                    + رفع ونشر محتوى لجنة الإعلام سحابياً
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-xl font-black text-slate-900">أرشيف تغطيات لجنة الإعلام ({mediaUploads.length})</h3>
              {mediaUploads.length === 0 ? (
                <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-sm font-bold">لم يتم رفع أي محتوى مرئي أو صور للجنة الإعلام حتى الآن.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {mediaUploads.map((item) => (
                    <div key={item.id} className="p-6 rounded-2xl border border-rose-100 bg-rose-50/10 shadow-sm space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-black text-rose-900 text-sm">{item.title}</h4>
                        <span className="text-[10px] bg-rose-100 text-rose-800 px-2.5 py-1 rounded-full font-bold">{item.category}</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {item.files?.map((fileSrc: string, fIdx: number) => {
                          const isVideo = fileSrc.startsWith('data:video') || fileSrc.includes('.mp4');
                          return (
                            <div key={fIdx} className="relative h-28 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shadow-sm">
                              {isVideo ? (
                                <video src={fileSrc} controls className="w-full h-full object-cover" />
                              ) : (
                                <img src={fileSrc} alt={`محتوى ${fIdx + 1}`} className="w-full h-full object-cover" />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="pt-2 border-t border-rose-100 flex justify-between items-center text-[11px]">
                        <span className="text-slate-400">{new Date(item.createdAt).toLocaleDateString('ar-SA')}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteMediaUpload(item.id)}
                          className="px-3 py-1 rounded-lg bg-red-50 text-red-600 font-bold hover:bg-red-100 cursor-pointer"
                        >
                          حذف المحتوى ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'performance-radar' && (
          <div className="bg-white rounded-3xl p-8 border border-indigo-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4 flex justify-between items-center flex-wrap gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">📊 رادار مراقبة أداء اللجان الشامل</h3>
                <p className="text-xs text-slate-500">متابعة حية من قاعدة البيانات للأعضاء المقبولين، أداء اللجان، والجاهزية التشغيلية.</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs">
                عدد اللجان النشطة: {committees.length}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {committees.map((comm) => {
                const acceptedCommMembers = requests.filter(r => r.acceptedCommittee === comm.name || r.status === 'مقبول').length;
                const membersListCount = comm.members?.length || 0;
                const totalActiveCount = Math.max(acceptedCommMembers, membersListCount);
                const performanceScore = Math.min(100, totalActiveCount * 12 + 45);

                return (
                  <div key={comm.id} className="p-6 rounded-2xl border border-indigo-100 bg-indigo-50/20 shadow-sm flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="font-black text-indigo-900 text-base">{comm.name}</h4>
                        <span className="px-2.5 py-1 rounded-full bg-indigo-600 text-white font-mono text-[10px] font-bold">
                          أداء {performanceScore}%
                        </span>
                      </div>

                      <div className="space-y-1 text-xs text-slate-700 bg-white p-3 rounded-xl border border-indigo-100">
                        <p><strong>👨‍✈️ قائد الطلاب:</strong> {comm.maleLeader || 'غير متوفر'}</p>
                        <p><strong>👩‍✈️ قائدة الطالبات:</strong> {comm.femaleLeader || 'غير متوفر'}</p>
                        <p><strong>👥 الأعضاء المقبولون:</strong> {totalActiveCount} أعضاء فاعلين</p>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-slate-500">
                          <span>مؤشر الإنجاز والمهام</span>
                          <span>{performanceScore}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${performanceScore > 75 ? 'bg-emerald-500' : performanceScore > 50 ? 'bg-indigo-600' : 'bg-amber-500'}`}
                            style={{ width: `${performanceScore}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-indigo-100 flex justify-between items-center text-[11px]">
                      <span className="text-slate-500">الحالة التشغيلية:</span>
                      <span className="font-bold text-emerald-600">🟢 مستقر وتحت السيطرة</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'historical-vault' && (
          <div className="bg-white rounded-3xl p-8 border border-amber-300 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4 flex justify-between items-center flex-wrap gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">📦 أرشيف التقارير التاريخية (Historical Vault)</h3>
                <p className="text-xs text-slate-500">سجل كامل ومؤرشف سحابياً لكافة التقارير المعتمدة وتقارير محفظة أدلة الجودة الختامية.</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-xs">
                إجمالي المؤرشف: {historicalVaultReports.length}
              </span>
            </div>

            {historicalVaultReports.length === 0 ? (
              <div className="py-16 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-sm font-bold">لا توجد تقارير في الأرشيف التاريخي حتى الآن. سيتم أرشفة البلاغات والتقارير المعتمدة من لجنة الجودة تلقائياً هنا.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {historicalVaultReports.map((vaultItem, idx) => (
                  <div key={vaultItem.id || idx} className="p-6 rounded-2xl border border-amber-200 bg-amber-50/40 shadow-sm space-y-3">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <span className="font-black text-amber-900 text-sm">العنوان / اللجنة: {vaultItem.title || vaultItem.targetCommittee}</span>
                      <span className="text-[10px] bg-amber-200 text-amber-900 font-mono px-2 py-0.5 rounded font-bold">
                        {vaultItem.dateStr || (vaultItem.archivedAt ? new Date(vaultItem.archivedAt).toLocaleDateString('ar-SA') : 'معتمد رسمياً')}
                      </span>
                    </div>
                    <p className="text-slate-800 text-xs sm:text-sm font-semibold bg-white p-3 rounded-xl border border-amber-100 shadow-inner">
                      <strong>التفاصيل:</strong> {vaultItem.reason || vaultItem.status || 'معتمد ومؤرشف في محفظة أدلة الجودة'}
                    </p>
                    <div className="pt-2 border-t border-amber-200 flex justify-between items-center text-[11px] text-slate-600 font-bold flex-wrap gap-2">
                      <span>الرافع والموثق: {vaultItem.reporter || vaultItem.author || 'لجنة الجودة والتطوير'}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDownloadReportPdf(vaultItem)}
                          className="px-3 py-1 bg-amber-700 text-white rounded-lg font-bold text-[11px] shadow hover:bg-amber-800 transition-colors"
                        >
                          📥 تحميل PDF
                        </button>
                        <span className="text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg">✅ معتمد</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'escalated-reports' && (
          <div className="bg-white rounded-3xl p-8 border border-red-300 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4 flex justify-between items-center flex-wrap gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">🚨 مركز تقارير الجودة (نظام الإنذار والإحالة للرؤساء)</h3>
                <p className="text-xs text-slate-500">أرسل إنذاراً تحذيرياً أولاً لقائد وقائدة اللجنة، وإذا لم يتجاوبوا قم إحالة البلاغ رسمياً لرئيس ونائبة الرئيس.</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 font-bold text-xs">
                إجمالي البلاغات: {escalatedReports.length}
              </span>
            </div>

            {escalatedReports.length === 0 ? (
              <div className="py-16 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-sm font-bold">لا توجد تقارير تقصير أو شكاوى مرفوعة حتى الآن. الوضع ممتاز وتحت السيطرة التامة.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {escalatedReports.map((rep) => (
                  <div key={rep.id} className="p-6 rounded-2xl border border-red-200 bg-red-50/40 shadow-sm flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <span className="font-black text-red-800 text-sm">اللجنة المعنية: {rep.targetCommittee}</span>
                        <span className="text-[10px] bg-red-200 text-red-900 font-mono px-2 py-0.5 rounded font-bold">
                          {rep.createdAt ? new Date(rep.createdAt).toLocaleDateString('ar-SA') : ''}
                        </span>
                      </div>
                      
                      <p className="text-slate-800 text-xs sm:text-sm font-semibold leading-relaxed bg-white p-4 rounded-xl border border-red-100 shadow-inner">
                        <strong>التفاصيل والتقصير المرصود:</strong> {rep.reason}
                      </p>

                      {rep.leaderDefenseReply && (
                        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 space-y-1">
                          <strong>💬 رد وتبرير قائد اللجنة:</strong>
                          <p>{rep.leaderDefenseReply}</p>
                        </div>
                      )}

                      {rep.warningText && (
                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 space-y-1">
                          <strong>⚠️ الإنذار المرسل للقادة:</strong>
                          <p>{rep.warningText}</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 pt-2 border-t border-red-200">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-500">الرافع: {rep.reporter}</span>
                        <span className="font-bold text-red-700 bg-red-100 px-3 py-1 rounded-lg">{rep.status || 'معلق'}</span>
                      </div>

                      <div className="flex gap-2 pt-1 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleOpenWarningModal(rep)}
                          className="flex-1 py-2 px-3 rounded-xl bg-amber-600 text-white font-bold text-xs shadow hover:bg-amber-700 cursor-pointer transition-all"
                        >
                          ⚠️ إنذار قائد وقائدة اللجنة
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEscalateToPresidentsFinal(rep)}
                          className="flex-1 py-2 px-3 rounded-xl bg-red-600 text-white font-black text-xs shadow hover:bg-red-700 cursor-pointer transition-all"
                        >
                          🚨 إحالة البلاغ للرؤساء فوراً
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'users-manager' && isSystemAdminUser && (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-xl font-black text-slate-900">إدارة حسابات المستخدمين، الأسماء، كلمات المرور، والرتب (خاص بالمشرف الأساسي 🛡️)</h3>
              <p className="text-xs text-slate-500">يمكنك تعديل اسم المستخدم، رقم الجوال، كلمة المرور، أو الرتبة وتحديثها سحابياً في أي وقت.</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold">
                    <th className="pb-3 pr-2">اسم المستخدم وحالة الاتصال</th>
                    <th className="pb-3">رقم الجوال (اسم الدخول)</th>
                    <th className="pb-3">كلمة المرور</th>
                    <th className="pb-3">الرتبة والصلاحيات</th>
                    <th className="pb-3">اللجنة المعينة ( لرئيس اللجنة )</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50 bg-rose-50/20">
                    <td className="py-4 pr-2 font-black text-[#630517]">
                      عبدالعزيز العنزي (المشرف الأساسي)
                      <span className="block text-[10px] text-emerald-600 font-bold mt-0.5">🟢 متصل الآن</span>
                    </td>
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

                  {usersList.map((usr, idx) => {
                    const isOnline = usr.lastActive && (Date.now() - usr.lastActive < 4 * 60 * 1000);

                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-4 pr-2 font-bold text-slate-900">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span>{usr.fullName || 'مستخدم مسجل'}</span>
                            <button
                              type="button"
                              onClick={() => openNameModal(usr.phone, usr.fullName || '')}
                              className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg font-bold hover:bg-indigo-100 cursor-pointer shadow-sm transition-all"
                              title="تعديل الاسم الكامل"
                            >
                              ✏️ تعديل الاسم
                            </button>
                          </div>
                          <span className={`block text-[10px] font-bold mt-0.5 ${isOnline ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {isOnline ? '🟢 نشط الآن في الموقع' : '⚪ غير متصل حالياً'}
                          </span>
                        </td>
                        <td className="py-4 text-slate-600 font-mono" dir="ltr">
                          <div className="flex items-center gap-2">
                            <span>{usr.phone}</span>
                            <button
                              type="button"
                              onClick={() => openPhoneModal(usr.phone)}
                              className="text-[10px] bg-sky-50 text-sky-700 px-2 py-0.5 rounded-lg font-bold hover:bg-sky-100 cursor-pointer shadow-sm transition-all"
                              title="تعديل رقم الجوال"
                            >
                              ✏️ تعديل الرقم
                            </button>
                          </div>
                        </td>
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
                            <button
                              type="button"
                              onClick={() => openPasswordModal(usr.phone)}
                              className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-lg font-bold hover:bg-amber-100 cursor-pointer shadow-sm transition-all"
                              title="تعديل كلمة المرور"
                            >
                              ✏️ تعديل
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
                            <option value="نائبة الرئيس">نائبة الرئيس</option>
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
                    );
                  })}
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
              <h3 className="text-xl font-black text-slate-900">➕ إضافة فعالية جديدة مع معرض صور وفيديوهات سحابي</h3>
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
                  <label className="text-xs font-bold text-slate-700">اختر صور وفيديوهات المعرض (صور وفيديوهات متعددة 📁)</label>
                  <input
                    type="file"
                    accept="image/*,video/*"
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
              <h3 className="text-xl font-black text-slate-900">إدارة الصور والفيديوهات وإضافتها للفعاليات القائمة (سحابي)</h3>
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
                    {ev.title} ({ev.images?.length || 0} ملفات)
                  </button>
                ))}
              </div>

              {currentEditedEvent && (
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex justify-between items-center flex-wrap gap-4">
                    <h4 className="font-extrabold text-slate-900 text-sm">إضافة صور أو فيديوهات جديدة لـ: {currentEditedEvent.title}</h4>
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
                    accept="image/*,video/*"
                    multiple
                    onChange={handleAddMultipleImagesToExistingEvent}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white file:mr-4 file:py-1 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#630517] file:text-[#F5D061] cursor-pointer"
                  />
                </div>
              )}

              {currentEditedEvent && (
                <div className="space-y-4">
                  <h4 className="font-extrabold text-slate-900 text-sm">الملفات الحالية بالسحابة للفعالية ({currentEditedEvent.images?.length || 0})</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                    {currentEditedEvent.images?.map((img, idx) => {
                      const isVideo = img.startsWith('data:video') || img.includes('.mp4');
                      return (
                        <div key={idx} className="relative h-32 rounded-2xl overflow-hidden border border-slate-200 group bg-slate-900 shadow-sm">
                          {isVideo ? (
                            <video src={img} className="w-full h-full object-cover" />
                          ) : (
                            <img src={img} alt={`ملف ${idx + 1}`} className="w-full h-full object-cover" />
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveImageFromEvent(idx)}
                            className="absolute top-2 right-2 bg-red-600 text-white w-7 h-7 rounded-full text-xs font-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
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
                  <label className="text-xs font-bold text-slate-700">اختر صورة أو فيديو الشريحة من جهازك</label>
                  <input
                    type="file"
                    accept="image/*,video/*"
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
                  {passionSlides.map((slide) => {
                    const isVideo = slide.image.startsWith('data:video') || slide.image.includes('.mp4');
                    return (
                      <div key={slide.id} className="relative h-44 rounded-2xl overflow-hidden border border-slate-200 group shadow-sm bg-slate-900">
                        {isVideo ? (
                          <video src={slide.image} className="w-full h-full object-cover opacity-50" />
                        ) : (
                          <img src={slide.image} alt="شريحة" className="w-full h-full object-cover opacity-50" />
                        )}
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
                    );
                  })}
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
                  <label className="text-xs font-bold text-slate-600">اختر بوستر أو فيديو الفعالية من جهازك</label>
                  <input
                    type="file"
                    accept="image/*,video/*"
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
                  <label className="text-xs font-bold text-slate-600">اختر صورة أو فيديو البانر من جهازك</label>
                  <input
                    type="file"
                    accept="image/*,video/*"
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
                  <label className="text-xs font-bold text-slate-600">اختر شعار أو فيديو الشريك من جهازك</label>
                  <input
                    type="file"
                    accept="image/*,video/*"
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
                {partners.map((p) => {
                  const isVideo = p.logo.startsWith('data:video') || p.logo.includes('.mp4');
                  return (
                    <div key={p.id} className="p-4 rounded-2xl border border-slate-200 flex flex-col items-center text-center space-y-3 bg-slate-50 relative group">
                      {isVideo ? (
                        <video src={p.logo} className="w-16 h-16 object-contain rounded-xl bg-white p-2 shadow-sm" />
                      ) : (
                        <img src={p.logo} alt={p.name} className="w-16 h-16 object-contain rounded-xl bg-white p-2 shadow-sm" />
                      )}
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
                  );
                })}
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
                  { id: 'design', name: 'لجنة التصميم' },
                  { id: 'media', name: 'لجنة الاعلام' },
                  { id: 'events-org', name: 'لجنة تنظيم الفعاليات' },
                  { id: 'hr', name: 'لجنة الموارد البشرية' },
                  { id: 'pr', name: 'لجنة العلاقات العامة' },
                  { id: 'scientific', name: 'لجنة المحتوى العلمي' },
                  { id: 'quality', name: 'لجنة الجودة والتطوير' },
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
                              title="تحويل الطالب لرغبته التالية"
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

      {showWarningModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <form onSubmit={handleSendWarningToLeaders} className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl space-y-6 border-2 border-amber-400">
            <div className="w-16 h-16 bg-amber-500 text-white rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-lg">
              ⚠️
            </div>
            <div className="space-y-2 text-center">
              <h3 className="text-xl font-black text-slate-900">إرسال إنذار تحذيري لقادة ({warningTargetCommittee})</h3>
              <p className="text-xs text-slate-500">نص الإنذار الذي سيصل للجنة مع مهلة التصحيح:</p>
            </div>
            <textarea
              rows={4}
              value={warningMessageText}
              onChange={(e) => setWarningMessageText(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500 leading-relaxed"
              required
            />
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowWarningModal(false)}
                className="w-1/2 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="w-1/2 py-3 rounded-xl bg-amber-600 text-white font-black text-xs shadow hover:bg-amber-700 cursor-pointer"
              >
                إرسال الإنذار رسمياً 📨
              </button>
            </div>
          </form>
        </div>
      )}

      {modalType === 'success' && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-6 border-2 border-[#F5D061]">
            <div className="w-16 h-16 bg-[#630517] text-[#F5D061] rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-lg">
              ✨
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900">تنبيه النظام</h3>
              <p className="text-xs text-slate-600 font-medium whitespace-pre-line leading-relaxed">{modalMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => setModalType('none')}
              className="w-full py-3 rounded-2xl bg-[#630517] text-[#F5D061] font-black text-xs shadow hover:brightness-110 cursor-pointer transition-all"
            >
              حسنًا 🚀
            </button>
          </div>
        </div>
      )}

      {modalType === 'confirm' && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-6 border-2 border-[#F5D061]">
            <div className="w-16 h-16 bg-red-600 text-white rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-lg">
              🚨
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900">تأكيد الإحالة للرؤساء</h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">{modalMessage}</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalType('none')}
                className="w-1/2 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalType('none');
                  if (confirmActionCallback) confirmActionCallback();
                }}
                className="w-1/2 py-3 rounded-xl bg-red-600 text-white font-black text-xs shadow hover:bg-red-700 cursor-pointer"
              >
                تأكيد الإحالة رسمياً ⚖️
              </button>
            </div>
          </div>
        </div>
      )}

      {modalType === 'name' && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <form onSubmit={submitUpdateName} className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6 border-2 border-[#F5D061]">
            <div className="w-16 h-16 bg-[#630517] text-[#F5D061] rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-lg">
              👤
            </div>
            <div className="space-y-2 text-center">
              <h3 className="text-xl font-black text-slate-900">تعديل الاسم الكامل</h3>
              <p className="text-xs text-slate-500">أدخل الاسم الجديد للعضو:</p>
            </div>
            <input
              type="text"
              placeholder="الاسم الكامل الجديد..."
              value={modalInputVal}
              onChange={(e) => setModalInputVal(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-bold text-center text-slate-900 focus:outline-none focus:border-[#630517]"
              required
            />
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalType('none')}
                className="w-1/2 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="w-1/2 py-3 rounded-xl bg-[#630517] text-[#F5D061] font-black text-xs shadow hover:brightness-110 cursor-pointer"
              >
                Submit 🚀
              </button>
            </div>
          </form>
        </div>
      )}

      {modalType === 'phone' && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <form onSubmit={submitUpdatePhone} className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6 border-2 border-[#F5D061]">
            <div className="w-16 h-16 bg-[#630517] text-[#F5D061] rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-lg">
              📱
            </div>
            <div className="space-y-2 text-center">
              <h3 className="text-xl font-black text-slate-900">تعديل رقم الجوال (اسم الدخول)</h3>
              <p className="text-xs text-slate-500">أدخل رقم الجوال الجديد بالصيغة الصحيحة:</p>
            </div>
            <input
              type="text"
              value={modalInputVal}
              onChange={(e) => setModalInputVal(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-mono font-bold text-center text-slate-900 focus:outline-none focus:border-[#630517]"
              dir="ltr"
              required
            />
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalType('none')}
                className="w-1/2 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="w-1/2 py-3 rounded-xl bg-[#630517] text-[#F5D061] font-black text-xs shadow hover:brightness-110 cursor-pointer"
              >
                Submit 🚀
              </button>
            </div>
          </form>
        </div>
      )}

      {modalType === 'password' && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <form onSubmit={submitUpdatePassword} className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6 border-2 border-[#F5D061]">
            <div className="w-16 h-16 bg-[#630517] text-[#F5D061] rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-lg">
              🔒
            </div>
            <div className="space-y-2 text-center">
              <h3 className="text-xl font-black text-slate-900">تعديل كلمة المرور</h3>
              <p className="text-xs text-slate-500">أدخل كلمة المرور الجديدة للعضو:</p>
            </div>
            <input
              type="text"
              placeholder="كلمة المرور الجديدة..."
              value={modalInputVal}
              onChange={(e) => setModalInputVal(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-mono font-bold text-center text-slate-900 focus:outline-none focus:border-[#630517]"
              required
            />
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalType('none')}
                className="w-1/2 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="w-1/2 py-3 rounded-xl bg-[#630517] text-[#F5D061] font-black text-xs shadow hover:brightness-110 cursor-pointer"
              >
                Submit 🚀
              </button>
            </div>
          </form>
        </div>
      )}

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