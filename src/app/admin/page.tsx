'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, setDoc, getDoc, addDoc, onSnapshot } from 'firebase/firestore';
import { isIncompleteUserAccount, notifyCommitteeByKeyword, setUserPasswordOnPhone } from '../lib/userAccounts';
import { formatScientificDate, groupTextsByArchiveTitle, scientificArchiveTitle, scientificPdfUrl, scientificStatusLabel } from '../lib/scientificTexts';
import { certMediaFields, filterFilesWithinLimit, isOverUploadLimit, uploadClubFile, uploadClubFiles, uploadLimitMessage, uploadingLabel } from '../lib/uploadFile';
import { DEFAULT_WELCOME_BANNER, WELCOME_BANNER_ID } from '../lib/welcomeBanner';
import { clubConfirm, inferNoticeKind } from '../lib/clubNotice';
import { ClubNoticeDialog } from '../components/ClubNotice';
import HrCertificateBatches from '../components/HrCertificateBatches';
import { printQualityEventReport, QUALITY_EVENT_REPORTS, computedSuccessIndex, recommendationLabel, type QualityEventReport } from '../lib/qualityEventReport';
import CommitteePerformanceRadar from '../components/admin/CommitteePerformanceRadar';
import PlatformBriefingEditor from '../components/admin/PlatformBriefingEditor';
import { emailToPhone, isAdminPhone, isLeadershipRole } from '../lib/authIdentity';
import { canonicalPhone, normalizeUniversityId } from '../lib/certificatesLookup';
import { stampMemberAcceptance } from '../lib/memberAcceptance';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
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
  description?: string;
  theme?: 'club' | 'pink-october';
  cinematic?: boolean;
}

interface PartnerItem {
  id: string;
  name: string;
  category: string;
  logo: string;
  websiteUrl?: string;
  offerType?: string;
  offerCode?: string;
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
  whatsappLink?: string;
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

interface StudentAchievement {
  id: string;
  studentName: string;
  awardName: string;
  image: string;
  description: string;
  createdAt: string;
}

interface CertificateItem {
  id: string;
  recipientName: string;
  phone: string;
  universityId?: string;
  password?: string;
  certTitle: string;
  category: string;
  image: string;
  issueDate: string;
  description: string;
}

interface ExamEntry {
  course: string;
  courseCode?: string;
  date: string;
  time?: string;
  location?: string;
  notes?: string;
}

interface NewsletterItem {
  id: string;
  title: string;
  category: string;
  content: string;
  link?: string;
  date: string;
  image: string;
  type?: 'article' | 'exam-schedule';
  featured?: boolean;
  examCohort?: string;
  examSemester?: string;
  exams?: ExamEntry[];
}

interface ScientificTextItem {
  id: string;
  title: string;
  category?: string;
  author: string;
  content?: string;
  fileUrl?: string;
  pdfUrl?: string;
  fileName?: string;
  status?: 'pending' | 'approved' | 'rejected';
  source?: string;
  createdAt: string;
  createdAtMs?: number;
  archiveTitle?: string;
  archived?: boolean;
  collectionName?: 'scientific_committee_texts' | 'site_scientific_texts';
}

export default function AdminDashboard() {
  const router = useRouter();
  
  const [isSystemAdminUser, setIsSystemAdminUser] = useState<boolean>(false);
  const [isPresidentsRole, setIsPresidentsRole] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'users-manager' | 'discover' | 'passion' | 'events' | 'banners' | 'team' | 'requests' | 'partners' | 'suggestions' | 'escalated-reports' | 'historical-vault' | 'performance-radar' | 'media-committee' | 'student-achievements' | 'certificates' | 'case-study' | 'weekly-newsletter' | 'scientific-texts' | 'platform-briefing'>('case-study');

  const [isRegistrationClosed, setIsRegistrationClosed] = useState<boolean>(false);

  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [escalatedReports, setEscalatedReports] = useState<any[]>([]);
  const [historicalVaultReports, setHistoricalVaultReports] = useState<any[]>([]);
  const [qualityEvaluationReports, setQualityEvaluationReports] = useState<any[]>([]);
  const [qualityUploadedFiles, setQualityUploadedFiles] = useState<any[]>([]);
  const [qualityEventReports, setQualityEventReports] = useState<QualityEventReport[]>([]);

  const [caseSubmissions, setCaseSubmissions] = useState<any[]>([]);

  const [studentAchievements, setStudentAchievements] = useState<StudentAchievement[]>([]);
  const [editingAchievementId, setEditingAchievementId] = useState<string | null>(null);
  const [studentNameInput, setStudentNameInput] = useState<string>('');
  const [awardNameInput, setAwardNameInput] = useState<string>('');
  const [achievementDescInput, setAchievementDescInput] = useState<string>('');
  const [studentImageInput, setStudentImageInput] = useState<string>('/logo.png');

  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [editingCertId, setEditingCertId] = useState<string | null>(null);
  const [certRecipientInput, setCertRecipientInput] = useState<string>('');
  const [certPhoneInput, setCertPhoneInput] = useState<string>('');
  const [certUniversityIdInput, setCertUniversityIdInput] = useState<string>('');
  const [certPasswordInput, setCertPasswordInput] = useState<string>('');
  const [certTitleInput, setCertTitleInput] = useState<string>('');
  const [certCategoryInput, setCertCategoryInput] = useState<string>('شهادة شكر وتقدير');
  const [certImageInput, setCertImageInput] = useState<string>('/logo.png');
  const [certDescInput, setCertDescInput] = useState<string>('');

  const emptyExamRow = (): ExamEntry => ({ course: '', courseCode: '', date: '', time: '', location: '', notes: '' });

  const [newsletters, setNewsletters] = useState<NewsletterItem[]>([]);
  const [editingNewsletterId, setEditingNewsletterId] = useState<string | null>(null);
  const [newsTitleInput, setNewsTitleInput] = useState<string>('');
  const [newsCategoryInput, setNewsCategoryInput] = useState<string>('أخبار النادي الأسبوعية');
  const [newsContentInput, setNewsContentInput] = useState<string>('');
  const [newsLinkInput, setNewsLinkInput] = useState<string>('');
  const [newsImageInput, setNewsImageInput] = useState<string>('/logo.png');
  const [newsTypeInput, setNewsTypeInput] = useState<'article' | 'exam-schedule'>('article');
  const [newsFeaturedInput, setNewsFeaturedInput] = useState<boolean>(false);
  const [examCohortInput, setExamCohortInput] = useState<string>('دفعة 2024');
  const [examSemesterInput, setExamSemesterInput] = useState<string>('');
  const [examRows, setExamRows] = useState<ExamEntry[]>([emptyExamRow()]);

  // حالة تبويب نصوص المحتوى العلمي
  const [scientificTexts, setScientificTexts] = useState<ScientificTextItem[]>([]);
  const [editingScientificId, setEditingScientificId] = useState<string | null>(null);
  const [sciTitleInput, setSciTitleInput] = useState<string>('');
  const [sciCategoryInput, setSciCategoryInput] = useState<string>('أبحاث ومقالات علمية');
  const [sciAuthorInput, setSciAuthorInput] = useState<string>('');
  const [sciContentInput, setSciContentInput] = useState<string>('');
  const [sciFileInput, setSciFileInput] = useState<string>('');
  const [sciFileName, setSciFileName] = useState<string>('');
  const [sciCollectionName, setSciCollectionName] = useState<'scientific_committee_texts' | 'site_scientific_texts'>('scientific_committee_texts');
  const [sciReviewFilter, setSciReviewFilter] = useState<'pending' | 'all' | 'archived'>('pending');
  const [sciArchiveTitle, setSciArchiveTitle] = useState<string>('');

  const [modalType, setModalType] = useState<'none' | 'success' | 'phone' | 'password' | 'name' | 'confirm'>('none');
  const [modalMessage, setModalMessage] = useState<string>('');
  const [activeUserPhoneForAction, setActiveUserPhoneForAction] = useState<string>('');
  const [modalInputVal, setModalInputVal] = useState<string>('');
  const [confirmActionCallback, setConfirmActionCallback] = useState<(() => void) | null>(null);

  const [showShiftModal, setShowShiftModal] = useState<boolean>(false);
  const [selectedReqForShift, setSelectedReqForShift] = useState<Record<string, any> | null>(null);
  const [targetShiftCommittee, setTargetShiftCommittee] = useState<string>('لجنة التصميم');

  const [requestSearchQuery, setRequestSearchQuery] = useState<string>('');
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const getMediaSources = (item: any): string[] => {
    if (Array.isArray(item?.files) && item.files.length > 0) return item.files.filter(Boolean);
    const urls = [item?.mediaUrl, item?.imageUrl].filter(Boolean);
    return Array.from(new Set(urls));
  };

  const isMediaVideo = (src: string, item?: any) => {
    if (item?.mediaType === 'video') return true;
    const s = String(src || '').toLowerCase();
    return s.startsWith('data:video') || s.includes('.mp4') || s.includes('.mov') || s.includes('.webm');
  };

  const formatMediaDate = (item: any) => {
    if (item?.dateStr) return item.dateStr;
    const d = item?.createdAt;
    if (!d) return 'تاريخ غير محدد';
    if (typeof d === 'number') return new Date(d).toLocaleDateString('ar-SA');
    if (typeof d === 'string' && (d.includes('T') || /^\d{4}-/.test(d))) {
      const parsed = new Date(d);
      if (!Number.isNaN(parsed.getTime())) return parsed.toLocaleDateString('ar-SA');
    }
    return String(d);
  };

  const formatVaultDate = (vaultItem: any) => {
    const d = vaultItem.createdAt || vaultItem.archivedAt || vaultItem.warningSentAt;
    if (typeof d === 'number') return new Date(d).toLocaleDateString('ar-SA');
    if (typeof d === 'string' && (d.includes('T') || /^\d{4}-/.test(d))) {
      const parsed = new Date(d);
      if (!Number.isNaN(parsed.getTime())) return parsed.toLocaleDateString('ar-SA');
    }
    if (vaultItem.dateStr) return String(vaultItem.dateStr);
    if (d) return String(d);
    return 'تاريخ غير محدد';
  };

  const togglePasswordVisibility = (phone: string) => {
    setShowPasswords((prev) => ({
      ...prev,
      [phone]: !prev[phone]
    }));
  };

  useEffect(() => {
    const checkAdminAuth = async () => {
      try {
        try {
          if (typeof auth.authStateReady === 'function') {
            await auth.authStateReady();
          }
        } catch {}

        const firebaseUser = auth.currentUser || await new Promise<import('firebase/auth').User | null>((resolve) => {
          const unsub = onAuthStateChanged(auth, (user) => {
            unsub();
            resolve(user);
          });
        });

        if (!firebaseUser) {
          const storedPhone = localStorage.getItem('userPhone') || '';
          if (isAdminPhone(storedPhone) || storedPhone) {
            localStorage.setItem('userPhone', storedPhone);
            if (isAdminPhone(storedPhone)) {
              setIsSystemAdminUser(true);
              setIsPresidentsRole(true);
              return;
            }
            const storedSnap = await getDoc(doc(db, 'users', storedPhone));
            if (storedSnap.exists()) {
              const userRole = storedSnap.data()?.role || 'عضو أساسي';
              if (userRole === 'System Admin') {
                setIsSystemAdminUser(true);
                setIsPresidentsRole(true);
                return;
              }
              if (isLeadershipRole(userRole)) {
                setIsPresidentsRole(true);
                return;
              }
            }
          }
          router.push('/login');
          return;
        }

        const phone = emailToPhone(firebaseUser.email);
        localStorage.setItem('userPhone', phone);
        sessionStorage.removeItem('adminToken');

        if (isAdminPhone(phone)) {
          setIsSystemAdminUser(true);
          setIsPresidentsRole(true);
          return;
        }

        const userRef = doc(db, 'users', phone);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const userRole = userData.role || 'عضو أساسي';

          if (isAdminPhone(phone) || userRole === 'System Admin') {
            setIsSystemAdminUser(true);
            setIsPresidentsRole(true);
          } else if (isLeadershipRole(userRole)) {
            setIsPresidentsRole(true);
            setIsSystemAdminUser(false);
          } else {
            setIsSystemAdminUser(false);
            setIsPresidentsRole(false);
            if (!userRole.includes('رئيس لجنة') && !userRole.includes('مشرف')) {
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
    fetchCertificates();
    fetchNewsletters();
    fetchScientificTexts();
    fetchCaseSubmissions();
    fetchSiteSettings();
  }, [router]);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'scientific_committee_texts'),
      () => {
        fetchScientificTexts();
      },
      (err) => {
        console.error('Error listening to scientific texts:', err);
      }
    );
    return () => unsub();
  }, []);

  const getRealUserName = (phone: string, defaultName: string) => {
    if (!phone) return defaultName;
    const found = usersList.find(u => u.phone === phone);
    return found?.fullName || defaultName;
  };

  const fetchSiteSettings = async () => {
    try {
      const settingsRef = doc(db, 'site_settings', 'general');
      const snap = await getDoc(settingsRef);
      if (snap.exists()) {
        const data = snap.data();
        if (typeof data.isRegistrationClosed === 'boolean') {
          setIsRegistrationClosed(data.isRegistrationClosed);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleRegistrationStatus = async () => {
    const newState = !isRegistrationClosed;
    try {
      const settingsRef = doc(db, 'site_settings', 'general');
      await setDoc(settingsRef, { isRegistrationClosed: newState }, { merge: true });
      setIsRegistrationClosed(newState);
      setModalMessage(newState ? 'تم إغلاق نموذج الانضمام للجان بنجاح سحابياً! 🔒🚫' : 'تم فتح نموذج الانضمام للجان بنجاح سحابياً للجميع! 🔓✨');
      setModalType('success');
    } catch (err) {
      console.error(err);
      setModalMessage('حدث خطأ أثناء تغيير حالة نموذج الانضمام.');
      setModalType('success');
    }
  };

  const fetchCaseSubmissions = async () => {
    try {
      const snap = await getDocs(collection(db, 'case_study_submissions'));
      const list = await Promise.all(snap.docs.map(async (d) => {
        const data = d.data();
        let finalDate = data.createdAt || data.submittedAt;
        if (!finalDate) {
          finalDate = new Date().toISOString();
          try {
            await updateDoc(doc(db, 'case_study_submissions', d.id), { createdAt: finalDate });
          } catch (err) {}
        }
        return { id: d.id, ...data, createdAt: finalDate };
      }));
      setCaseSubmissions(list);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStudentAchievements = async () => {
    try {
      const snap = await getDocs(collection(db, 'student_achievements'));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as StudentAchievement[];
      setStudentAchievements(list);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCertificates = async () => {
    try {
      const snap = await getDocs(collection(db, 'site_certificates'));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as CertificateItem[];
      setCertificates(list);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchNewsletters = async () => {
    try {
      const snap = await getDocs(collection(db, 'site_newsletters'));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as NewsletterItem[];
      setNewsletters(list);
    } catch (e) {
      console.error(e);
    }
  };

  const mapScientificDoc = (
    d: { id: string; data: () => Record<string, unknown> },
    collectionName: 'scientific_committee_texts' | 'site_scientific_texts'
  ): ScientificTextItem => {
    const data = d.data();
    const createdAtMs = typeof data.createdAtMs === 'number'
      ? data.createdAtMs
      : (typeof data.createdAt === 'number' ? data.createdAt : Date.parse(String(data.createdAt || '')) || 0);
    return {
      id: d.id,
      title: String(data.title || ''),
      category: String(data.category || 'نصوص اللجنة'),
      author: String(data.author || 'لجنة المحتوى العلمي'),
      content: String(data.content || ''),
      fileUrl: String(data.fileUrl || ''),
      pdfUrl: String(data.pdfUrl || ''),
      fileName: String(data.fileName || ''),
      status: (data.status as ScientificTextItem['status']) || (collectionName === 'site_scientific_texts' ? 'approved' : 'pending'),
      source: String(data.source || collectionName),
      createdAt: String(data.createdAt || ''),
      createdAtMs,
      archiveTitle: String(data.archiveTitle || ''),
      archived: Boolean(data.archived),
      collectionName,
    };
  };

  const fetchScientificTexts = async () => {
    try {
      const [siteSnap, commSnap] = await Promise.all([
        getDocs(collection(db, 'site_scientific_texts')),
        getDocs(collection(db, 'scientific_committee_texts')),
      ]);
      const mapped = new Map<string, ScientificTextItem>();
      siteSnap.docs.forEach((d) => {
        mapped.set(`site_${d.id}`, mapScientificDoc(d, 'site_scientific_texts'));
      });
      commSnap.docs.forEach((d) => {
        mapped.set(`comm_${d.id}`, mapScientificDoc(d, 'scientific_committee_texts'));
      });
      setScientificTexts(
        Array.from(mapped.values()).sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const resetScientificForm = () => {
    setEditingScientificId(null);
    setSciTitleInput('');
    setSciAuthorInput('');
    setSciContentInput('');
    setSciFileInput('');
    setSciFileName('');
    setSciCollectionName('scientific_committee_texts');
    setSciArchiveTitle('');
  };

  const handleSaveScientificText = async (e: FormEvent) => {
    e.preventDefault();
    if (!sciTitleInput.trim()) return;
    if (!sciContentInput.trim() && !sciFileInput) {
      setModalMessage('اكتب النص أو ارفع ملف PDF.');
      setModalType('success');
      return;
    }

    const sciId = editingScientificId ? editingScientificId : Date.now().toString();
    const targetCollection = editingScientificId ? sciCollectionName : 'scientific_committee_texts';
    const isPdf = sciFileName.toLowerCase().endsWith('.pdf') || sciFileInput.startsWith('data:application/pdf');
    const updatedSci: ScientificTextItem = {
      id: sciId,
      title: sciTitleInput.trim(),
      category: sciCategoryInput,
      author: sciAuthorInput.trim() || 'إدارة النادي',
      content: sciContentInput.trim(),
      fileUrl: sciFileInput,
      pdfUrl: isPdf ? sciFileInput : '',
      fileName: sciFileName,
      status: 'approved',
      source: 'admin',
      createdAt: new Date().toISOString(),
      createdAtMs: Date.now(),
      archiveTitle: sciArchiveTitle.trim() || 'نصوص عامة',
      archived: false,
      collectionName: targetCollection,
    };

    try {
      await setDoc(doc(db, targetCollection, sciId), updatedSci);
      if (editingScientificId) {
        setScientificTexts(scientificTexts.map(s => s.id === sciId && s.collectionName === targetCollection ? updatedSci : s));
        setModalMessage('تم تحديث النص العلمي بنجاح.');
      } else {
        setScientificTexts([updatedSci, ...scientificTexts]);
        setModalMessage('تم حفظ النص واعتماده. يظهر الآن للجنة التصميم.');
      }
      resetScientificForm();
      setModalType('success');
    } catch (err) {
      console.error(err);
      setModalMessage('حدث خطأ أثناء حفظ نص المحتوى العلمي.');
      setModalType('success');
    }
  };

  const handleEditScientificTextClick = (item: ScientificTextItem) => {
    setEditingScientificId(item.id);
    setSciTitleInput(item.title);
    setSciCategoryInput(item.category || 'أبحاث ومقالات علمية');
    setSciAuthorInput(item.author || '');
    setSciContentInput(item.content || '');
    setSciFileInput(item.pdfUrl || item.fileUrl || '');
    setSciFileName(item.fileName || '');
    setSciCollectionName(item.collectionName || 'scientific_committee_texts');
    setSciArchiveTitle(item.archiveTitle || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleArchiveScientificText = (item: ScientificTextItem, archived: boolean) => {
    const archiveTitle = item.archiveTitle || window.prompt('اكتب عنوان الأرشيف، مثال: نصوص فعالية الصحة النفسية')?.trim() || '';
    if (archived && !archiveTitle) return;
    triggerConfirmModal(
      archived ? `أرشفة هذا النص تحت عنوان: ${archiveTitle}؟` : 'إرجاع هذا النص من الأرشيف إلى القائمة الحالية؟',
      async () => {
        try {
          const col = item.collectionName || 'scientific_committee_texts';
          await updateDoc(doc(db, col, item.id), {
            archived,
            archiveTitle: archiveTitle || item.archiveTitle || 'نصوص عامة',
            ...(archived ? { archivedAt: Date.now() } : { restoredAt: Date.now() }),
          });
          setScientificTexts(scientificTexts.map((s) => (
            s.id === item.id && s.collectionName === col
              ? { ...s, archived, archiveTitle: archiveTitle || s.archiveTitle }
              : s
          )));
          setModalMessage(archived ? 'تم أرشفة النص. يبقى محفوظاً للرجوع له لاحقاً.' : 'تم إرجاع النص من الأرشيف.');
          setModalType('success');
        } catch (err) {
          console.error(err);
          setModalMessage('تعذر تحديث الأرشيف.');
          setModalType('success');
        }
      }
    );
  };

  const handleReviewScientificText = (item: ScientificTextItem, status: 'approved' | 'rejected') => {
    const label = status === 'approved' ? 'اعتماد هذا النص وتمريره للجنة التصميم؟' : 'رفض هذا النص وإعادته للجنة المحتوى العلمي؟';
    triggerConfirmModal(label, async () => {
      try {
        const col = item.collectionName || 'scientific_committee_texts';
        await updateDoc(doc(db, col, item.id), {
          status,
          reviewedAt: Date.now(),
          reviewedBy: 'إدارة النادي والرؤساء',
        });
        setScientificTexts(scientificTexts.map((s) => (
          s.id === item.id && s.collectionName === col ? { ...s, status } : s
        )));
        if (status === 'approved') {
          await notifyCommitteeByKeyword(db, 'تصميم', `🔬 [نص معتمد من الإدارة]: "${item.title}" جاهز للاستخدام في التصاميم.`);
        }
        setModalMessage(status === 'approved' ? 'تم اعتماد النص وأُرسل للجنة التصميم.' : 'تم رفض النص. اللجنة تقدر تعدّله وتعيد رفعه.');
        setModalType('success');
      } catch (err) {
        console.error(err);
        setModalMessage('تعذر تحديث حالة النص.');
        setModalType('success');
      }
    });
  };

  const handleDeleteScientificText = (item: ScientificTextItem) => {
    triggerConfirmModal('هل أنت متأكد من حذف هذا النص العلمي نهائياً من السحابة؟', async () => {
      try {
        const col = item.collectionName || 'scientific_committee_texts';
        await deleteDoc(doc(db, col, item.id));
        if (col !== 'site_scientific_texts') {
          await deleteDoc(doc(db, 'site_scientific_texts', item.id)).catch(() => undefined);
        }
        setScientificTexts(scientificTexts.filter(s => !(s.id === item.id && s.collectionName === col)));
        setModalMessage('تم حذف النص العلمي بنجاح.');
        setModalType('success');
      } catch (err) {
        console.error(err);
      }
    });
  };

  const resetNewsletterForm = () => {
    setEditingNewsletterId(null);
    setNewsTitleInput('');
    setNewsCategoryInput('أخبار النادي الأسبوعية');
    setNewsContentInput('');
    setNewsLinkInput('');
    setNewsImageInput('/logo.png');
    setNewsTypeInput('article');
    setNewsFeaturedInput(false);
    setExamCohortInput('دفعة 2024');
    setExamSemesterInput('');
    setExamRows([emptyExamRow()]);
  };

  const handleSaveNewsletter = async (e: FormEvent) => {
    e.preventDefault();
    const isExam = newsTypeInput === 'exam-schedule';
    const cleanedExams = examRows
      .map((row) => ({
        course: row.course.trim(),
        courseCode: row.courseCode?.trim() || '',
        date: row.date,
        time: row.time?.trim() || '',
        location: row.location?.trim() || '',
        notes: row.notes?.trim() || '',
      }))
      .filter((row) => row.course && row.date);

    if (!newsTitleInput.trim()) return;
    if (!isExam && !newsContentInput.trim()) return;
    if (isExam && cleanedExams.length === 0) {
      setModalMessage('أضف اختباراً واحداً على الأقل باسم المادة وتاريخه.');
      setModalType('success');
      return;
    }

    const newsId = editingNewsletterId ? editingNewsletterId : Date.now().toString();
    const updatedNews: NewsletterItem = {
      id: newsId,
      title: newsTitleInput.trim(),
      category: isExam ? 'جداول الاختبارات' : newsCategoryInput,
      content: newsContentInput.trim(),
      link: newsLinkInput.trim(),
      image: newsImageInput,
      date: new Date().toISOString(),
      type: newsTypeInput,
      featured: newsFeaturedInput,
      examCohort: isExam ? examCohortInput.trim() : '',
      examSemester: isExam ? examSemesterInput.trim() : '',
      exams: isExam ? cleanedExams : [],
    };

    try {
      await setDoc(doc(db, 'site_newsletters', newsId), updatedNews);
      if (editingNewsletterId) {
        setNewsletters(newsletters.map(n => n.id === newsId ? updatedNews : n));
        setModalMessage(isExam ? 'تم تحديث جدول الاختبارات، ويظهر الآن في صفحة النشرة.' : 'تم تحديث النشرة الأسبوعية بنجاح.');
      } else {
        setNewsletters([updatedNews, ...newsletters]);
        setModalMessage(isExam ? 'تم نشر جدول الاختبارات في النشرة الأكاديمية.' : 'تم إصدار النشرة وظهرت في صفحة الموقع.');
      }
      resetNewsletterForm();
      setModalType('success');
    } catch (err) {
      console.error(err);
      setModalMessage('حدث خطأ أثناء حفظ النشرة.');
      setModalType('success');
    }
  };

  const handleEditNewsletterClick = (news: NewsletterItem) => {
    const isExam = news.type === 'exam-schedule' || (news.exams && news.exams.length > 0);
    setEditingNewsletterId(news.id);
    setNewsTitleInput(news.title);
    setNewsCategoryInput(news.category || 'أخبار النادي الأسبوعية');
    setNewsContentInput(news.content);
    setNewsLinkInput(news.link || '');
    setNewsImageInput(news.image || '/logo.png');
    setNewsTypeInput(isExam ? 'exam-schedule' : 'article');
    setNewsFeaturedInput(Boolean(news.featured));
    setExamCohortInput(news.examCohort || 'دفعة 2024');
    setExamSemesterInput(news.examSemester || '');
    setExamRows(news.exams && news.exams.length ? news.exams : [emptyExamRow()]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteNewsletter = (id: string) => {
    triggerConfirmModal('هل أنت متأكد من حذف هذه النشرة نهائياً من السحابة؟', async () => {
      try {
        await deleteDoc(doc(db, 'site_newsletters', id));
        setNewsletters(newsletters.filter(n => n.id !== id));
        setModalMessage('تم حذف النشرة بنجاح.');
        setModalType('success');
      } catch (err) {
        console.error(err);
      }
    });
  };

  const handleSaveCertificate = async (e: FormEvent) => {
    e.preventDefault();
    if (!certRecipientInput.trim() || !certTitleInput.trim()) return;
    const phone = canonicalPhone(certPhoneInput) || certPhoneInput.trim();
    const universityId = normalizeUniversityId(certUniversityIdInput);
    if (!phone && !universityId) return;

    const certId = editingCertId ? editingCertId : Date.now().toString();
    const media = certMediaFields(certImageInput);
    const updatedCert: CertificateItem = {
      id: certId,
      recipientName: certRecipientInput.trim(),
      phone,
      universityId,
      password: certPasswordInput.trim() || '',
      certTitle: certTitleInput.trim(),
      category: certCategoryInput,
      image: media.image || media.fileUrl,
      description: certDescInput.trim() || 'شهادة معتمدة من نادي كلية التمريض بجامعة حفر الباطن.',
      issueDate: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'site_certificates', certId), updatedCert);
      if (editingCertId) {
        setCertificates(certificates.map(c => c.id === certId ? updatedCert : c));
        setModalMessage('تم تحديث وتعديل الشهادة برقم الجوال وكلمة المرور بنجاح سحابياً! ✏️📜');
      } else {
        setCertificates([updatedCert, ...certificates]);
        setModalMessage('تم اصدار ونشر الشهادة وربطها برقم الجوال وكلمة المرور بنجاح! 🎓✨');
      }
      setEditingCertId(null);
      setCertRecipientInput('');
      setCertPhoneInput('');
      setCertUniversityIdInput('');
      setCertPasswordInput('');
      setCertTitleInput('');
      setCertDescInput('');
      setCertImageInput('/logo.png');
      setModalType('success');
    } catch (err) {
      console.error(err);
      setModalMessage('حدث خطأ أثناء حفظ الشهادة.');
      setModalType('success');
    }
  };

  const handleEditCertificateClick = (cert: CertificateItem) => {
    setEditingCertId(cert.id);
    setCertRecipientInput(cert.recipientName);
    setCertPhoneInput(cert.phone || '');
    setCertUniversityIdInput(cert.universityId || '');
    setCertPasswordInput(cert.password || '');
    setCertTitleInput(cert.certTitle);
    setCertCategoryInput(cert.category || 'شهادة شكر وتقدير');
    setCertDescInput(cert.description);
    setCertImageInput(cert.image || '/logo.png');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteCertificate = (id: string) => {
    triggerConfirmModal('هل أنت متأكد من حذف هذه الشهادة نهائياً من السحابة؟', async () => {
      try {
        await deleteDoc(doc(db, 'site_certificates', id));
        setCertificates(certificates.filter(c => c.id !== id));
        setModalMessage('تم حذف الشهادة بنجاح.');
        setModalType('success');
      } catch (err) {
        console.error(err);
      }
    });
  };

  const handleDeleteCaseSubmission = async (id: string) => {
    if (!(await clubConfirm('هل أنت متأكد من حذف هذه المشاركة وإزالتها نهائياً من لوحة الصدارة؟'))) return;
    
    try {
      await deleteDoc(doc(db, 'case_study_submissions', id));
      setCaseSubmissions(caseSubmissions.filter(sub => sub.id !== id));
      setModalMessage('تمت الإزالة من لوحة الصدارة بنجاح.');
      setModalType('success');
    } catch (err) {
      console.error(err);
    }
  };

  // 1. استبدال state اسم الطالب القديم بهذه الـ State الجديدة
const [studentNamesList, setStudentNamesList] = useState<string[]>(['']);

// 2. إضافة هذه الدوال للتحكم في إضافة/حذف وتحديث حقول أسماء الطلاب
const handleAddStudentNameField = () => {
  setStudentNamesList([...studentNamesList, '']);
};

const handleRemoveStudentNameField = (index: number) => {
  if (studentNamesList.length === 1) {
    setStudentNamesList(['']);
  } else {
    setStudentNamesList(studentNamesList.filter((_, idx) => idx !== index));
  }
};

const handleStudentNameChange = (index: number, value: string) => {
  const updated = [...studentNamesList];
  updated[index] = value;
  setStudentNamesList(updated);
};

// 3. تحديث دالة الحفظ لتدمج الأسماء بإنضباط وترتيب
const handleSaveStudentAchievement = async (e: FormEvent) => {
  e.preventDefault();
  const joinedNames = studentNamesList.map(n => n.trim()).filter(Boolean).join(', ');
  if (!joinedNames || !awardNameInput.trim()) return;

  const achId = editingAchievementId ? editingAchievementId : Date.now().toString();
  const updatedAch: StudentAchievement = {
    id: achId,
    studentName: joinedNames,
    awardName: awardNameInput.trim(),
    image: studentImageInput,
    description: achievementDescInput.trim() || 'إنجاز جماعي مشرف ومميز يضاف لسجل طلبة كلية التمريض.',
    createdAt: new Date().toISOString()
  };

  try {
    await setDoc(doc(db, 'student_achievements', achId), updatedAch);
    if (editingAchievementId) {
      setStudentAchievements(studentAchievements.map(a => a.id === achId ? updatedAch : a));
      setModalMessage('تم تعديل وتحديث الإنجاز بنجاح سحابياً! ✏️✨');
    } else {
      setStudentAchievements([updatedAch, ...studentAchievements]);
      setModalMessage('تم إضافة الإنجاز الجماعي بنجاح ونشره سحابياً للموقع! 🏆✨');
    }
    setEditingAchievementId(null);
    setStudentNamesList(['']);
    setAwardNameInput('');
    setAchievementDescInput('');
    setStudentImageInput('/logo.png');
    setModalType('success');
  } catch (err) {
    console.error(err);
    setModalMessage('حدث خطأ أثناء حفظ الإنجاز.');
    setModalType('success');
  }
};

// 4. تحديث دالة التعديل لتفكيك الأسماء السابقة وحطها في الحقول المنظمة
const handleEditStudentAchievementClick = (ach: StudentAchievement) => {
  setEditingAchievementId(ach.id);
  const parsedNames = ach.studentName ? ach.studentName.split(/[,،\n]+/).map(n => n.trim()).filter(Boolean) : [''];
  setStudentNamesList(parsedNames.length > 0 ? parsedNames : ['']);
  setAwardNameInput(ach.awardName);
  setAchievementDescInput(ach.description);
  setStudentImageInput(ach.image || '/logo.png');
  window.scrollTo({ top: 0, behavior: 'smooth' });
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
      const evalSnap = await getDocs(collection(db, 'quality_reports_archive'));
      const fileSnap = await getDocs(collection(db, 'quality_uploaded_files'));
      const eventSnap = await getDocs(collection(db, QUALITY_EVENT_REPORTS));

      const evaluations = evalSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((item: any) => {
          if (item.reportType === 'uploaded_file' || item.fileUrl) return false;
          if (item.reportType === 'committee_evaluation') return true;
          return Boolean(item.advantages || item.errors || item.bestCommittee || item.bestMembers || item.featuredMembers);
        })
        .sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));

      const files = fileSnap.docs
        .map(d => ({ id: d.id, ...d.data(), reportType: 'uploaded_file' }))
        .sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));

      const eventReports = eventSnap.docs
        .map((item) => ({ id: item.id, ...item.data() } as QualityEventReport))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      setQualityEvaluationReports(evaluations);
      setQualityUploadedFiles(files);
      setQualityEventReports(eventReports);
      setHistoricalVaultReports([...evaluations, ...files, ...eventReports]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteQualityEvaluation = (id: string) => {
    triggerConfirmModal('هل أنت متأكد من حذف تقييم اللجان هذا من الأرشيف؟', async () => {
      try {
        await deleteDoc(doc(db, 'quality_reports_archive', id));
        setQualityEvaluationReports(prev => prev.filter(item => item.id !== id));
        setHistoricalVaultReports(prev => prev.filter(item => item.id !== id));
        setModalMessage('تم حذف تقييم اللجان من الأرشيف.');
        setModalType('success');
      } catch (err) {
        console.error(err);
      }
    });
  };

  const handleDeleteQualityUploadedFile = (id: string) => {
    triggerConfirmModal('هل أنت متأكد من حذف هذا الملف المرفوع من الأرشيف؟', async () => {
      try {
        await deleteDoc(doc(db, 'quality_uploaded_files', id));
        setQualityUploadedFiles(prev => prev.filter(item => item.id !== id));
        setHistoricalVaultReports(prev => prev.filter(item => item.id !== id));
        setModalMessage('تم حذف الملف المرفوع من الأرشيف.');
        setModalType('success');
      } catch (err) {
        console.error(err);
      }
    });
  };

  const handlePrintArchiveReport = (arch: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('الرجاء السماح للنوافذ المنبثقة (Pop-ups) في المتصفح لفتح التقرير.');
      return;
    }

    const reportTitle = arch.title || arch.activityName || arch.eventName || 'تقييم اللجان والأعضاء';
    const reportDate = arch.dateStr || (arch.archivedAt 
      ? new Date(arch.archivedAt).toLocaleDateString('ar-SA') 
      : (arch.createdAt ? new Date(arch.createdAt).toLocaleDateString('ar-SA') : 'غير محدد'));
    const reportAuthor = arch.reporter || arch.author || arch.createdByName || 'لجنة الجودة والتطوير';

    const rawContent = arch.details || arch.description || arch.content || '';

    let featuredCommittee = arch.featuredCommittee || arch.bestCommittee || arch.topCommittee || '';
    if (!featuredCommittee && rawContent.includes('اللجنة المتميزة:')) {
      const match = rawContent.match(/اللجنة المتميزة:\s*([^\n✔️⚠️]+)/);
      if (match) featuredCommittee = match[1].trim();
    }
    if (!featuredCommittee) featuredCommittee = 'لم يتم التحديد';

    let positives = arch.advantages || arch.positives || arch.features || arch.positivesText || '';
    if (!positives && rawContent.includes('المميزات:')) {
      const match = rawContent.match(/المميزات:\s*([^\n⚠️]+)/);
      if (match) positives = match[1].trim();
    }
    if (!positives) positives = 'لا توجد ملاحظات إيجابية مضافة';

    let notes = arch.errors || arch.notes || arch.negatives || arch.negativesText || '';
    if (!notes && rawContent.includes('الملاحظات:')) {
      const match = rawContent.match(/الملاحظات:\s*([\s\S]+)/);
      if (match) notes = match[1].trim();
    }
    if (!notes) notes = 'لا توجد ملاحظات مرصودة';

    const rawMembers = arch.featuredMembers || arch.topMembers || arch.members || arch.distinguishedMembers || arch.bestMembers;

    let membersRows = '';
    if (Array.isArray(rawMembers)) {
      membersRows = rawMembers.map((m: any) => {
        const commName = m.committee || m.committeeName || 'اللجنة';
        const membName = m.member || m.memberName || m.name || m.details || '-';
        return '<tr><td style="font-weight: 900; color: #0f172a;">' + commName + '</td><td>' + membName + '</td></tr>';
      }).join('');
    } else if (rawMembers && typeof rawMembers === 'object') {
      membersRows = Object.entries(rawMembers).map(([commName, membName]) => {
        return '<tr><td style="font-weight: 900; color: #0f172a;">' + commName + '</td><td>' + (membName || 'لم يتم التحديد') + '</td></tr>';
      }).join('');
    }
    if (!membersRows) {
      membersRows = '<tr><td colspan="2">لم يتم إدخال أعضاء متميزين في هذا التقييم.</td></tr>';
    }

    const reportHTML = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>تقرير الجودة - ${reportTitle}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap');
          body {
            font-family: 'Tajawal', Tahoma, Arial, sans-serif;
            padding: 30px 50px;
            color: #1e293b;
            background: #ffffff;
            direction: rtl;
            line-height: 1.8;
          }
          .no-print {
            display: flex;
            justify-content: center;
            gap: 15px;
            margin-bottom: 25px;
          }
          .btn-print {
            background: #630517;
            color: #F5D061;
            padding: 10px 22px;
            border: none;
            border-radius: 12px;
            font-size: 13px;
            font-weight: 900;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(99,5,23,0.25);
          }
          .btn-pdf {
            background: #0284c7;
            color: #ffffff;
            padding: 10px 22px;
            border: none;
            border-radius: 12px;
            font-size: 13px;
            font-weight: 900;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(2,132,199,0.25);
          }
          .header {
            text-align: center;
            margin-bottom: 12px;
          }
          .header h1 {
            color: #630517;
            font-size: 26px;
            margin: 0 0 4px 0;
            font-weight: 900;
          }
          .header .subtitle {
            color: #64748b;
            font-size: 13px;
            font-weight: 700;
            margin: 2px 0;
          }
          .header .date-str {
            color: #64748b;
            font-size: 12px;
            font-weight: 700;
            margin-top: 2px;
          }
          .divider {
            border: 0;
            height: 2px;
            background: #630517;
            margin: 15px 0 25px 0;
          }
          .featured-box {
            background: #f8fafc;
            border-right: 5px solid #630517;
            padding: 16px 20px;
            border-radius: 6px;
            margin-bottom: 25px;
          }
          .featured-box .title {
            font-size: 14px;
            font-weight: 900;
            color: #0f172a;
            margin-bottom: 4px;
          }
          .featured-box .desc {
            font-size: 12px;
            color: #475569;
            font-weight: 700;
          }
          .section-title {
            font-size: 15px;
            font-weight: 900;
            color: #630517;
            border-right: 4px solid #630517;
            padding-right: 10px;
            margin: 25px 0 12px 0;
          }
          .custom-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
            font-size: 12px;
          }
          .custom-table th {
            background: #f1f5f9;
            color: #334155;
            font-weight: 900;
            padding: 10px 14px;
            border: 1px solid #e2e8f0;
            text-align: right;
          }
          .custom-table td {
            padding: 10px 14px;
            border: 1px solid #e2e8f0;
            color: #1e293b;
            font-weight: 700;
          }
          .box-green {
            background: #f0fdf4;
            border: 1px solid #dcfce7;
            border-right: 5px solid #16a34a;
            padding: 16px 20px;
            border-radius: 6px;
            font-size: 13px;
            color: #166534;
            font-weight: 700;
            margin-bottom: 25px;
          }
          .box-red {
            background: #fef2f2;
            border: 1px solid #fee2e2;
            border-right: 5px solid #dc2626;
            padding: 16px 20px;
            border-radius: 6px;
            font-size: 13px;
            color: #991b1b;
            font-weight: 700;
            margin-bottom: 25px;
          }
          @page { size: A4 portrait; margin: 12mm; }
          @media print {
            .no-print { display: none !important; }
            html, body { overflow: visible !important; height: auto !important; padding: 0; }
            .header, .featured-box, .box-green, .box-red, tr { break-inside: avoid; page-break-inside: avoid; }
            thead { display: table-header-group; }
          }
        </style>
      </head>
      <body>
        <div class="no-print">
          <button class="btn-print" onclick="window.print()">🖨️ طباعة التقرير الفورية</button>
          <button class="btn-pdf" onclick="window.print()">📄 حفظ التقرير كـ PDF (اختر Save as PDF)</button>
        </div>

        <div class="header">
          <h1>نادي كلية التمريض - جامعة حفر الباطن</h1>
          <div class="subtitle">${reportAuthor} • ${reportTitle}</div>
          <div class="date-str">تاريخ الاصدار: ${reportDate}</div>
        </div>

        <hr class="divider" />

        <div class="featured-box">
          <div class="title">🏆 أفضل لجنة أداءً وإنجازاً للمهام (محدد يدويّاً):</div>
          <div class="desc">استناداً للتقييم الإداري المعتمد، تصدرت <strong style="color: #630517;">${featuredCommittee}</strong> قائمة اللجان المتميزة في الأداء والانضباط.</div>
        </div>

        <div class="section-title">أولاً: أبرز الأعضاء المتميزين في اللجان (إدخال وإشراف رئيس/قائدة الجودة)</div>
        <table class="custom-table">
          <thead>
            <tr>
              <th style="width: 32%;">اللجنة التنظيمية</th>
              <th>أبرز عضو متميز وإنجازاته (يدوي)</th>
            </tr>
          </thead>
          <tbody>
            ${membersRows}
          </tbody>
        </table>

        <div class="section-title">ثانياً: المميزات والإيجابيات البارزة</div>
        <div class="box-green">
          ${String(positives).replace(/\n/g, '<br/>')}
        </div>

        <div class="section-title">ثالثاً: الأخطاء والملاحظات المرصودة للتحسين المستقبلي</div>
        <div class="box-red">
          ${String(notes).replace(/\n/g, '<br/>')}
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(reportHTML);
    printWindow.document.close();
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
  const [newDiscFiles, setNewDiscFiles] = useState<File[]>([]);
  const [isUploadingDiscover, setIsUploadingDiscover] = useState<boolean>(false);
  const [cloudUploadProgress, setCloudUploadProgress] = useState(0);

  const [mediaUploads, setMediaUploads] = useState<any[]>([]);
  const [mediaTitle, setMediaTitle] = useState<string>('');
  const [mediaCategory, setMediaCategory] = useState<string>('تغطيات مرئية وفيديوهات');
  const [mediaFiles, setMediaFiles] = useState<string[]>([]);
  const [mediaFileObjects, setMediaFileObjects] = useState<File[]>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState<boolean>(false);

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
  const [bannerDescription, setBannerDescription] = useState<string>('');
  const [bannerTheme, setBannerTheme] = useState<'club' | 'pink-october'>('club');
  const [bannerCinematic, setBannerCinematic] = useState(false);
  const [bannerButtonText, setBannerButtonText] = useState<string>('');
  const [bannerButtonLink, setBannerButtonLink] = useState<string>('');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerUploadProgress, setBannerUploadProgress] = useState(0);
  const [welcomeReplacing, setWelcomeReplacing] = useState(false);
  const [welcomeReplaceProgress, setWelcomeReplaceProgress] = useState(0);

  const [partners, setPartners] = useState<PartnerItem[]>([]);
  const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string>('');
  const [partnerCategory, setPartnerCategory] = useState<string>('شريك إستراتيجي');
  const [partnerLogo, setPartnerLogo] = useState<string>('/logo.png');
  const [partnerWebsiteUrl, setPartnerWebsiteUrl] = useState<string>('');
  const [partnerOfferType, setPartnerOfferType] = useState<string>('');
  const [partnerOfferCode, setPartnerOfferCode] = useState<string>('');

  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [requests, setRequests] = useState<Record<string, any>[]>([]);
  
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [acceptedCommittee, setAcceptedCommittee] = useState<string>('لجنة التصميم');
  const [whatsappLink, setWhatsappLink] = useState<string>('');

  const [requestSubTab, setRequestSubTab] = useState<'all' | 'accepted' | 'pending' | 'pref-1' | 'pref-2' | 'pref-3'>('all');
  const [selectedCommitteeFilter, setSelectedCommitteeFilter] = useState<string>('لجنة التصميم');

  const [committees, setCommittees] = useState<Committee[]>([
    { id: 'design', name: 'لجنة التصميم', maleLeader: 'عبدالرحمن الشهري', femaleLeader: 'شجون الحربي', whatsappLink: '', members: [] },
    { id: 'media', name: 'لجنة الإعلام', maleLeader: 'راشد السبيعي', femaleLeader: 'ريم الشمري', whatsappLink: '', members: [] },
    { id: 'events-org', name: 'لجنة تنظيم الفعاليات', maleLeader: 'فيصل الدوسري', femaleLeader: 'غادة العمري', whatsappLink: '', members: [] },
    { id: 'hr', name: 'لجنة الموارد البشرية', maleLeader: 'تركي العنزي', femaleLeader: 'سارة الرشيدي', whatsappLink: '', members: [] },
    { id: 'pr', name: 'لجنة العلاقات العامة', maleLeader: 'خالد القحطاني', femaleLeader: 'ديمة العتيبي', whatsappLink: '', members: [] },
    { id: 'scientific', name: 'لجنة المحتوى العلمي', maleLeader: 'فهد المطيري', femaleLeader: 'أفنان العنزي', whatsappLink: '', members: [] },
    { id: 'quality', name: 'لجنة الجودة والتطوير', maleLeader: 'سلطان الحربي', femaleLeader: 'نورة الدوسري', whatsappLink: '', members: [] },
  ]);

  const [selectedCommitteeId, setSelectedCommitteeId] = useState<string>('design');
  const currentCommittee = committees.find((c) => c.id === selectedCommitteeId) || committees[0];

  const [newMemberName, setNewMemberName] = useState<string>('');
  const [newMemberRole, setNewMemberRole] = useState<string>('');

  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
  const [warningTargetReportId, setWarningTargetReportId] = useState<string>('');
  const [warningTargetCommittee, setWarningTargetCommittee] = useState<string>('');
  const [warningMessageText, setWarningMessageText] = useState<string>('');

  const [usersList, setUsersList] = useState<UserAccount[]>([]);
  const [showIncompleteUsers, setShowIncompleteUsers] = useState(false);
  const [isCleaningIncompleteUsers, setIsCleaningIncompleteUsers] = useState(false);

  useEffect(() => {
    const fetchCloudData = async () => {
      try {
        const eventsSnap = await getDocs(collection(db, 'site_events'));
        if (!eventsSnap.empty) {
          const eventsList: EventItem[] = [];
          eventsSnap.forEach((d) => { eventsList.push({ id: d.id, ...d.data() } as EventItem); });
          setEvents(eventsList);
        }

        const welcomeRef = doc(db, 'site_banners', WELCOME_BANNER_ID);
        const welcomeSnap = await getDoc(welcomeRef);
        if (!welcomeSnap.exists()) {
          await setDoc(welcomeRef, DEFAULT_WELCOME_BANNER);
        }
        const bannersSnap = await getDocs(collection(db, 'site_banners'));
        const bannersList: BannerItem[] = [];
        bannersSnap.forEach((d) => { bannersList.push({ id: d.id, ...d.data() } as BannerItem); });
        bannersList.sort((a, b) => {
          if (a.id === WELCOME_BANNER_ID) return -1;
          if (b.id === WELCOME_BANNER_ID) return 1;
          return Number(b.id) - Number(a.id);
        });
        setBanners(bannersList);

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

        const gallerySnap = await getDocs(collection(db, 'media_committee_gallery'));
        const uploadsSnap = await getDocs(collection(db, 'media_committee_uploads'));
        const mediaList: any[] = [];
        gallerySnap.forEach((d) => mediaList.push({ id: d.id, ...d.data(), _col: 'media_committee_gallery' }));
        uploadsSnap.forEach((d) => mediaList.push({ id: d.id, ...d.data(), _col: 'media_committee_uploads' }));
        mediaList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setMediaUploads(mediaList);

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

    const unsubMedia = onSnapshot(collection(db, 'media_committee_gallery'), async (gallerySnap) => {
      const gallery = gallerySnap.docs.map((d) => ({ id: d.id, ...d.data(), _col: 'media_committee_gallery' }));
      const uploadsSnap = await getDocs(collection(db, 'media_committee_uploads'));
      const uploads = uploadsSnap.docs.map((d) => ({ id: d.id, ...d.data(), _col: 'media_committee_uploads' }));
      const seen = new Set(gallery.map((g: any) => g.id));
      const merged = [...gallery, ...uploads.filter((u: any) => !seen.has(u.id))];
      merged.sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));
      setMediaUploads(merged);
    });

    return () => unsubMedia();
  }, []);

  const handleDeleteIncompleteAccounts = async () => {
    const stubs = usersList.filter((u) => isIncompleteUserAccount(u) && u.phone !== '0553731265');
    if (stubs.length === 0) return;
    if (!(await clubConfirm(`سيتم حذف ${stubs.length} حساب غير مكتمل (بدون كلمة مرور). الشهادات وطلبات الانضمام تبقى، والطالب يقدر ينشئ حسابه بنفسه. هل أنت متأكد؟`))) return;

    setIsCleaningIncompleteUsers(true);
    try {
      for (const usr of stubs) {
        await deleteDoc(doc(db, 'users', usr.phone));
      }
      setUsersList(usersList.filter((u) => !isIncompleteUserAccount(u) || u.phone === '0553731265'));
      setShowIncompleteUsers(false);
      setModalMessage(`تم حذف ${stubs.length} حساب غير مكتمل. اللي يبون يسجلون يكملون إنشاء الحساب بأنفسهم.`);
      setModalType('success');
    } catch (err) {
      console.error(err);
      setModalMessage('حدث خطأ أثناء حذف الحسابات غير المكتملة.');
      setModalType('success');
    } finally {
      setIsCleaningIncompleteUsers(false);
    }
  };

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

  const handleUpdateCaseScore = async (id: string, currentScore: number, delta: number) => {
    const newScore = Math.max(0, currentScore + delta);
    try {
      await updateDoc(doc(db, 'case_study_submissions', id), { score: newScore });
      setCaseSubmissions(caseSubmissions.map(sub => sub.id === id ? { ...sub, score: newScore } : sub));
    } catch (err) {
      console.error(err);
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
      await setUserPasswordOnPhone(db, activeUserPhoneForAction, modalInputVal.trim());
      setUsersList(usersList.map(u => u.phone === activeUserPhoneForAction ? { ...u, password: modalInputVal.trim() } : u));
      setModalMessage('تم تحديث كلمة المرور. تقدر تدخل فيها مباشرة من تسجيل الدخول.');
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
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false }) as any[];

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
        
        existingDocsSnap.docs.forEach((d) => {
          const dat = d.data();
          if (dat.phone) existingPhones.add(String(dat.phone).trim());
          if (dat.universityId) existingUnivIds.add(String(dat.universityId).trim());
        });

        for (const row of rows) {
          if (!row || row.length === 0) continue;

          const rawTimestamp = String(row[0] || '').trim();
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
            submittedAt: rawTimestamp || new Date().toLocaleString('ar-SA'),
            importedAt: new Date().toISOString()
          };

          await setDoc(doc(db, 'applications', reqId), reqObj);
          if (phone) existingPhones.add(phone);
          if (universityId) existingUnivIds.add(universityId);
          addedCount++;
        }

        const updatedSnap = await getDocs(collection(db, 'applications'));
        const fetchedRequests = updatedSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })) as Record<string, any>[];
        setRequests(fetchedRequests);

        setModalMessage(`تمت عملية استيراد الأكسل بنجاح! 🚀\n- أُضيف جديد: ${addedCount}\n- تم تخطي المكرر: ${skippedCount}`);
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

  const handleSelectMultipleImagesForNewEvent = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const { accepted, rejected } = filterFilesWithinLimit(Array.from(e.target.files));
    if (rejected.length > 0) {
      setModalMessage(uploadLimitMessage());
      setModalType('success');
    }
    if (accepted.length > 0) {
      setNewDiscFiles((prev) => [...prev, ...accepted]);
    }
    e.target.value = '';
  };

  const handleCreateNewDiscoverEvent = async (e: FormEvent) => {
    e.preventDefault();
    if (!newDiscTitle.trim() || isUploadingDiscover) return;

    setIsUploadingDiscover(true);
    setCloudUploadProgress(0);
    const eventId = Date.now().toString();

    try {
      const uploadedUrls = await uploadClubFiles(newDiscFiles, 'discover-events', setCloudUploadProgress);
      const newEventObj: DiscoverEvent = {
        id: eventId,
        title: newDiscTitle.trim(),
        category: newDiscCategory,
        description: newDiscDesc || 'فعالية تابعة لنادي التمريض.',
        images: uploadedUrls.length > 0 ? uploadedUrls : ['/logo.png']
      };
      await setDoc(doc(db, 'site_discover_events', eventId), newEventObj);
      setDiscoverEvents([newEventObj, ...discoverEvents]);
      setSelectedEventId(eventId);
      setNewDiscTitle('');
      setNewDiscDesc('');
      setNewDiscImages([]);
      setNewDiscFiles([]);
      setModalMessage('تم إنشاء الفعالية ونشر الصور سحابياً للجميع بنجاح! 🖼️🚀');
      setModalType('success');
    } catch (err: any) {
      console.error('Error saving event:', err);
      setModalMessage(err?.message || 'حدث خطأ أثناء رفع الفعالية بالسحابة.');
      setModalType('success');
    } finally {
      setIsUploadingDiscover(false);
      setCloudUploadProgress(0);
    }
  };

  const handleSelectMediaFiles = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const { accepted, rejected } = filterFilesWithinLimit(Array.from(e.target.files));
    if (rejected.length > 0) {
      setModalMessage(uploadLimitMessage());
      setModalType('success');
    }
    if (accepted.length > 0) {
      setMediaFileObjects((prev) => [...prev, ...accepted]);
    }
    e.target.value = '';
  };

  const handleUploadMediaCommitteeContent = async (e: FormEvent) => {
    e.preventDefault();
    if (!mediaTitle.trim() || mediaFileObjects.length === 0) {
      setModalMessage('يرجى كتابة عنوان التغطية واختيار ملف صورة أو فيديو.');
      setModalType('success');
      return;
    }

    try {
      setIsUploadingMedia(true);
      setCloudUploadProgress(0);
      const uploadedUrls = await uploadClubFiles(mediaFileObjects, 'media_gallery', setCloudUploadProgress);
      const hasVideo = mediaFileObjects.some((file) => file.type.startsWith('video'));

      const mediaObj = {
        title: mediaTitle.trim(),
        category: mediaCategory,
        files: uploadedUrls,
        mediaUrl: uploadedUrls[0],
        imageUrl: uploadedUrls[0],
        mediaType: hasVideo ? 'video' : 'image',
        createdAt: new Date().toLocaleDateString('ar-SA'),
        timestamp: Date.now(),
        addedBy: 'لوحة الأدمن',
        uploadedBy: 'لوحة الأدمن',
        uploaderRole: 'أدمن',
        committee: 'لجنة الإعلام',
        source: 'لوحة تحكم الأدمن',
        status: 'معتمد'
      };

      const docRef = await addDoc(collection(db, 'media_committee_gallery'), mediaObj);
      setMediaUploads([{ id: docRef.id, ...mediaObj, _col: 'media_committee_gallery' }, ...mediaUploads]);
      setMediaTitle('');
      setMediaFiles([]);
      setMediaFileObjects([]);
      setModalMessage('تم رفع الصور والفيديوهات الخاصة بلجنة الإعلام، وهي مربوطة الآن بصفحة الأعضاء! 🎥📸');
      setModalType('success');
    } catch (err: any) {
      console.error(err);
      setModalMessage(err?.message || 'حدث خطأ أثناء رفع محتوى لجنة الإعلام.');
      setModalType('success');
    } finally {
      setIsUploadingMedia(false);
      setCloudUploadProgress(0);
    }
  };

  const handleDeleteMediaUpload = (id: string) => {
    triggerConfirmModal('هل أنت متأكد من حذف محتوى لجنة الإعلام هذا؟', async () => {
      try {
        const target = mediaUploads.find((m) => m.id === id);
        const colName = target?._col || 'media_committee_gallery';
        await deleteDoc(doc(db, colName, id));
        if (colName === 'media_committee_gallery') {
          try { await deleteDoc(doc(db, 'media_committee_uploads', id)); } catch {}
        } else {
          try { await deleteDoc(doc(db, 'media_committee_gallery', id)); } catch {}
        }
        setMediaUploads(mediaUploads.filter((m) => m.id !== id));
        setModalMessage('تم الحذف بنجاح.');
        setModalType('success');
      } catch (err) {
        console.error(err);
      }
    });
  };

  const handleAddMultipleImagesToExistingEvent = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !selectedEventId) return;
    const { accepted, rejected } = filterFilesWithinLimit(Array.from(e.target.files));
    e.target.value = '';
    if (rejected.length > 0) {
      setModalMessage(uploadLimitMessage());
      setModalType('success');
    }
    if (accepted.length === 0) return;

    const targetEvent = discoverEvents.find((ev) => ev.id === selectedEventId);
    if (!targetEvent) return;

    try {
      setIsUploadingDiscover(true);
      setCloudUploadProgress(0);
      const uploadedUrls = await uploadClubFiles(accepted, 'discover-events', setCloudUploadProgress);
      const updatedImages = [...(targetEvent.images || []), ...uploadedUrls];
      const updatedEventObj = { ...targetEvent, images: updatedImages };
      await setDoc(doc(db, 'site_discover_events', selectedEventId), updatedEventObj);
      setDiscoverEvents(discoverEvents.map((ev) => (ev.id === selectedEventId ? updatedEventObj : ev)));
      setModalMessage('تم رفع وإضافة الصور سحابياً بنجاح! 🚀');
      setModalType('success');
    } catch (err: any) {
      console.error(err);
      setModalMessage(err?.message || 'تعذر رفع الملفات. حاول مرة أخرى.');
      setModalType('success');
    } finally {
      setIsUploadingDiscover(false);
      setCloudUploadProgress(0);
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

  const handleReplaceBannerImage = async (bannerId: string, file: File) => {
    if (isOverUploadLimit(file)) {
      setModalMessage(uploadLimitMessage());
      setModalType('success');
      return;
    }
    setWelcomeReplacing(true);
    setWelcomeReplaceProgress(0);
    try {
      const image = await uploadClubFile(file, 'banners', setWelcomeReplaceProgress);
      await setDoc(doc(db, 'site_banners', bannerId), { image }, { merge: true });
      setBanners(banners.map((b) => (b.id === bannerId ? { ...b, image } : b)));
      setModalMessage('تم تغيير صورة البنر. حدّث الرئيسية لتشوفها.');
      setModalType('success');
    } catch (err: any) {
      console.error(err);
      setModalMessage(err?.message || 'تعذر استبدال البنر. صغّر الملف ثم أعد المحاولة.');
      setModalType('success');
    } finally {
      setWelcomeReplacing(false);
      setWelcomeReplaceProgress(0);
    }
  };

  const handleAddBanner = async (e: FormEvent) => {
    e.preventDefault();
    if (!bannerTitle.trim()) {
      setModalMessage('أدخل عنوان البانر أولاً.');
      setModalType('success');
      return;
    }
    if (!bannerFile) {
      setModalMessage('اختر صورة أو فيديو البانر أولاً.');
      setModalType('success');
      return;
    }
    if (isOverUploadLimit(bannerFile)) {
      setModalMessage(uploadLimitMessage());
      setModalType('success');
      return;
    }

    setBannerUploading(true);
    setBannerUploadProgress(0);
    try {
      const image = await uploadClubFile(bannerFile, 'banners', setBannerUploadProgress);
      const bannerId = Date.now().toString();
      const isPink = bannerTheme === 'pink-october';
      const newBanner: BannerItem = {
        id: bannerId,
        tag: bannerTag.trim() || (isPink ? 'Pink October' : 'مناسبة خاصة'),
        title: bannerTitle.trim(),
        image,
        description: bannerDescription.trim(),
        theme: bannerTheme,
        cinematic: bannerCinematic,
        buttonText: bannerButtonText.trim() || (isPink ? 'ابدئي التحدي الوردي' : 'اكتشف النادي'),
        buttonLink: bannerButtonLink.trim() || (isPink ? '/case-study' : '/discover'),
      };

      await setDoc(doc(db, 'site_banners', bannerId), newBanner);
      setBanners([newBanner, ...banners]);
      setBannerTag('');
      setBannerTitle('');
      setBannerDescription('');
      setBannerTheme('club');
      setBannerCinematic(false);
      setBannerButtonText('');
      setBannerButtonLink('');
      setBannerFile(null);
      setModalMessage('تم إضافة وتفعيل البانر بنجاح.');
      setModalType('success');
    } catch (err: any) {
      console.error(err);
      setModalMessage(err?.message || 'تعذر حفظ البانر. صغّر الملف ثم أعد المحاولة.');
      setModalType('success');
    } finally {
      setBannerUploading(false);
      setBannerUploadProgress(0);
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

  const handleSavePartner = async (e: FormEvent) => {
    e.preventDefault();
    if (!partnerName.trim()) return;
    const partnerId = editingPartnerId ? editingPartnerId : Date.now().toString();
    const updatedPartner: PartnerItem = {
      id: partnerId,
      name: partnerName.trim(),
      category: partnerCategory,
      logo: partnerLogo,
      websiteUrl: partnerWebsiteUrl.trim(),
      offerType: partnerOfferType.trim(),
      offerCode: partnerOfferCode.trim().toUpperCase(),
    };

    try {
      await setDoc(doc(db, 'site_partners', partnerId), updatedPartner);
      if (editingPartnerId) {
        setPartners(partners.map((p) => p.id === partnerId ? updatedPartner : p));
        setModalMessage('تم تحديث وتعديل بيانات الشريك/الراعي بنجاح سحابياً! ✏️🤝');
      } else {
        setPartners([updatedPartner, ...partners]);
        setModalMessage('تم إضافة شريك النجاح بنجاح سحابياً! 🤝');
      }
      setEditingPartnerId(null);
      setPartnerName('');
      setPartnerCategory('شريك إستراتيجي');
      setPartnerLogo('/logo.png');
      setPartnerWebsiteUrl('');
      setPartnerOfferType('');
      setPartnerOfferCode('');
      setModalType('success');
    } catch (err) {
      console.error(err);
      setModalMessage('حدث خطأ أثناء حفظ بيانات الشريك.');
      setModalType('success');
    }
  };

  const handleEditPartnerClick = (p: PartnerItem) => {
    setEditingPartnerId(p.id);
    setPartnerName(p.name);
    setPartnerCategory(p.category || 'شريك إستراتيجي');
    setPartnerLogo(p.logo || '/logo.png');
    setPartnerWebsiteUrl(p.websiteUrl || '');
    setPartnerOfferType(p.offerType || '');
    setPartnerOfferCode(p.offerCode || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    const defaultComm = committees.find(c => c.name === acceptedCommittee);
    setWhatsappLink(defaultComm?.whatsappLink || '');
    setShowAcceptModal(true);
  };

  const handleCommitteeSelectChange = (newCommName: string) => {
    setAcceptedCommittee(newCommName);
    const matchedComm = committees.find(c => c.name === newCommName);
    setWhatsappLink(matchedComm?.whatsappLink || '');
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
          await stampMemberAcceptance(db, targetRequest.phone, {
            assignedCommittee: acceptedCommittee,
            committee: acceptedCommittee,
            latestNotification: `🎉 مبارك القبول النهائي في (${acceptedCommittee})!`,
            whatsappLink: whatsappLink,
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
      let existingWhatsapp = '';

      if (commSnap.exists()) {
        const commData = commSnap.data();
        existingMembers = commData.members || [];
        maleLeader = commData.maleLeader || maleLeader;
        femaleLeader = commData.femaleLeader || femaleLeader;
        existingWhatsapp = commData.whatsappLink || '';
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
        whatsappLink: existingWhatsapp,
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

  const openManualShiftModal = (req: Record<string, any>) => {
    setSelectedReqForShift(req);
    setTargetShiftCommittee(req.firstChoice || 'لجنة التصميم');
    setShowShiftModal(true);
  };

  const handleConfirmManualShift = async () => {
    if (!selectedReqForShift) return;

    const updatedObj = {
      ...selectedReqForShift,
      firstChoice: targetShiftCommittee
    };

    try {
      const docRef = doc(db, 'applications', selectedReqForShift.id);
      await updateDoc(docRef, {
        firstChoice: targetShiftCommittee
      });
      setRequests(requests.map(r => r.id === selectedReqForShift.id ? updatedObj : r));
      setShowShiftModal(false);
      setSelectedReqForShift(null);
      setModalMessage(`تم تحويل رغبة الطالب إلى (${targetShiftCommittee}) بنجاح سحابياً! 🔄`);
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
        whatsappLink: currentCommittee.whatsappLink || '',
        members: currentCommittee.members || []
      }, { merge: true });
      setModalMessage(`تم حفظ وتحديث قادة ورابط واتساب "${currentCommittee.name}" بنجاح سحابياً! ✨`);
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
        whatsappLink: currentCommittee.whatsappLink || '',
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
          whatsappLink: currentCommittee.whatsappLink || '',
          members: updatedMembers
        }, { merge: true });
        setModalMessage('تم الحذف بنجاح.');
        setModalType('success');
      } catch (err) {
        console.error(err);
      }
    });
  };

  const committeeNamesList = ['لجنة التصميم', 'لجنة الإعلام', 'لجنة تنظيم الفعاليات', 'لجنة الموارد البشرية', 'لجنة العلاقات العامة', 'لجنة المحتوى العلمي', 'لجنة الجودة والتطوير'];
  
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
    let matchesSubTab = true;
    if (requestSubTab === 'accepted') matchesSubTab = req.status === 'مقبول';
    else if (requestSubTab === 'pending') matchesSubTab = req.status === 'معلق' || !req.status || req.status === 'قيد المراجعة';
    else if (requestSubTab === 'pref-1') matchesSubTab = matchesCommittee(req.firstChoice, selectedCommitteeFilter);
    else if (requestSubTab === 'pref-2') matchesSubTab = matchesCommittee(req.secondChoice, selectedCommitteeFilter);
    else if (requestSubTab === 'pref-3') matchesSubTab = matchesCommittee(req.thirdChoice, selectedCommitteeFilter);

    if (!matchesSubTab) return false;

    if (requestSearchQuery.trim()) {
      const q = requestSearchQuery.trim().toLowerCase();
      const name = (req.fullName || '').toLowerCase();
      const phone = (req.phone || '').toLowerCase();
      const univId = (req.universityId || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || univId.includes(q);
    }

    return true;
  }).sort((a, b) => {
    const nameA = (a.fullName || '').trim();
    const nameB = (b.fullName || '').trim();
    return nameA.localeCompare(nameB, 'ar');
  });

  const matchesUserSearch = (usr: UserAccount) => {
    if (!userSearchQuery.trim()) return true;
    const q = userSearchQuery.trim().toLowerCase();
    const matchedReq = requests.find((r) => String(r.phone).trim() === String(usr.phone).trim());
    const name = (usr.fullName || matchedReq?.fullName || '').toLowerCase();
    const phone = (usr.phone || '').toLowerCase();
    return name.includes(q) || phone.includes(q);
  };

  const sortUsersByName = (list: UserAccount[]) =>
    [...list].sort((a, b) => {
      const matchedA = requests.find((r) => String(r.phone).trim() === String(a.phone).trim());
      const matchedB = requests.find((r) => String(r.phone).trim() === String(b.phone).trim());
      const nameA = (a.fullName || matchedA?.fullName || a.phone || '').trim();
      const nameB = (b.fullName || matchedB?.fullName || b.phone || '').trim();
      return nameA.localeCompare(nameB, 'ar');
    });

  const completeRegisteredUsers = usersList.filter(
    (usr) => !isIncompleteUserAccount(usr) && !isAdminPhone(usr.phone)
  );
  const registeredAccountsCount = completeRegisteredUsers.length + 1;
  const filteredAndSortedUsers = sortUsersByName(
    completeRegisteredUsers.filter((usr) => matchesUserSearch(usr))
  );
  const incompleteUsers = sortUsersByName(
    usersList.filter((usr) => isIncompleteUserAccount(usr) && matchesUserSearch(usr))
  );
  const incompleteAccountsCount = usersList.filter((usr) => isIncompleteUserAccount(usr)).length;
  const pendingScientificCount = scientificTexts.filter((s) => s.status === 'pending' && !s.archived).length;
  const archivedScientificCount = scientificTexts.filter((s) => s.archived).length;
  const filteredScientificTexts = sciReviewFilter === 'pending'
    ? scientificTexts.filter((s) => s.status === 'pending' && !s.archived)
    : sciReviewFilter === 'archived'
      ? scientificTexts.filter((s) => s.archived)
      : scientificTexts.filter((s) => !s.archived);
  const groupedScientificTexts = groupTextsByArchiveTitle(filteredScientificTexts);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 selection:bg-[#630517] selection:text-[#F5D061]" dir="rtl">
      
      <div className="bg-white border-b border-slate-200 py-4 px-6 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-[#630517] text-[#F5D061] flex items-center justify-center font-black text-lg shadow">
            UHB
          </span>
          <div>
            <h1 className="text-lg font-black text-slate-900">لوحة تحكم نادي التمريض (سحابي متكامل ☁)</h1>
            <p className="text-xs text-slate-500">إدارة اللجان والفعاليات والطلبات سحابياً</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleToggleRegistrationStatus}
            className={`px-4 py-2 rounded-xl font-black text-xs transition-all shadow-sm flex items-center gap-2 cursor-pointer ${
              isRegistrationClosed 
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse' 
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            {isRegistrationClosed ? '🟢 فتح نموذج الانضمام' : '🔴 إغلاق نموذج الانضمام'}
          </button>

          <Link
            href="/"
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all border border-slate-200"
          >
            العودة للموقع الرئيسي ←
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

        <div className="bg-gradient-to-r from-[#630517] to-[#80071D] rounded-3xl p-6 text-white shadow-xl flex flex-wrap justify-between items-center gap-6">
          <div className="space-y-1">
            <span className="bg-[#F5D061] text-[#630517] font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-wider">
              نظام القيادة الماسية 🏆
            </span>
            <h2 className="text-xl font-black">غرفة عمليات القيادة ونبض النادي</h2>
            <p className="text-xs text-white/80">تابع أداء اللجان، ادرس طلبات الانضمام، وانشر الفعاليات والشهادات والنصوص العلمية.</p>
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
              <span className="block text-2xl font-black text-teal-300">{scientificTexts.length}</span>
              <span className="text-[10px] font-bold text-white/90">نصوص المحتوى العلمي</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20 text-center">
              <span className="block text-2xl font-black text-amber-300">{certificates.length}</span>
              <span className="text-[10px] font-bold text-white/90">إجمالي الشهادات</span>
            </div>
          </div>
        </div>

        {isPresidentsRole && !isSystemAdminUser && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 font-bold">
            دخول قيادي: لوحة التشغيل كاملة (الطلبات، اللجان، النشرة، الشهادات، الجودة). تغيير الرتب والحسابات لمدير النظام فقط.
          </div>
        )}

        <div className="flex flex-wrap gap-3 border-b border-slate-200 pb-4">
          <button
            type="button"
            onClick={() => setActiveTab('platform-briefing')}
            className={`px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-sm ${
              activeTab === 'platform-briefing'
                ? 'bg-[#630517] text-[#F5D061] shadow-md scale-105'
                : 'bg-[#fff6d6] text-[#630517] border border-[#F5D061]/60 hover:bg-[#F5D061]/30'
            }`}
          >
            📘 ملف مميزات الموقع
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('case-study')}
            className={`px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-sm ${
              activeTab === 'case-study' ? 'bg-[#9d174d] text-white shadow-md scale-105' : 'bg-pink-50 text-pink-900 border border-pink-200 hover:bg-pink-100'
            }`}
          >
            🩺 دراسة الحالة ({caseSubmissions.length})
          </button>

          {isSystemAdminUser && (
            <button
              type="button"
              onClick={() => setActiveTab('users-manager')}
              className={`px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-sm ${
                activeTab === 'users-manager' 
                  ? 'bg-[#630517] text-[#F5D061] shadow-md scale-105' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              🔑 الحسابات والرتب والصلاحيات ({registeredAccountsCount})
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('scientific-texts')}
            className={`px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-sm ${
              activeTab === 'scientific-texts' ? 'bg-teal-700 text-white shadow-md scale-105' : 'bg-teal-50 text-teal-900 border border-teal-200 hover:bg-teal-100'
            }`}
          >
            🔬 نصوص المحتوى العلمي ({pendingScientificCount > 0 ? `${pendingScientificCount} بانتظار` : scientificTexts.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('certificates')}
            className={`px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-sm ${
              activeTab === 'certificates' ? 'bg-sky-700 text-white shadow-md scale-105' : 'bg-sky-50 text-sky-900 border border-sky-200 hover:bg-sky-100'
            }`}
          >
            📜 تبويب الشهادات المعتمدة ({certificates.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('weekly-newsletter')}
            className={`px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-sm ${
              activeTab === 'weekly-newsletter' ? 'bg-purple-700 text-white shadow-md scale-105' : 'bg-purple-50 text-purple-900 border border-purple-200 hover:bg-purple-100'
            }`}
          >
            📰 النشرة وجداول الاختبارات ({newsletters.length})
          </button>

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
            📦 أرشيف التقارير التاريخية ({qualityEvaluationReports.length + qualityUploadedFiles.length + qualityEventReports.length})
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
            { id: 'banners', label: '🖼️ بنر الترحيب' },
            { id: 'requests', label: '📥 طلبات الانضمام والأكسل' },
            { id: 'suggestions', label: '💡 آراء ومقترحات الطلاب' },
            { id: 'discover', label: '🖼️ معرض "اكتشف النادي"' },
            { id: 'passion', label: '✨ بطاقة "شغف وعطاء"' },
            { id: 'events', label: '📅 الفعاليات والبوسترات' },
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

        {activeTab === 'platform-briefing' && <PlatformBriefingEditor />}

        {/* تبويب نصوص المحتوى العلمي: صندوق تقييم من اللجنة */}
        {activeTab === 'scientific-texts' && (
          <div className="space-y-8">
            <div className="bg-white rounded-3xl p-8 border border-teal-300 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4 flex justify-between items-center flex-wrap gap-4">
                <div>
                  <h3 className="text-xl font-black text-teal-900">صندوق تقييم نصوص لجنة المحتوى العلمي</h3>
                  <p className="text-xs text-slate-500">
                    قادة وأعضاء اللجنة يرفعون النص أو PDF تحت عنوان فعالية. بعد انتهائها يأرشفونها للرجوع لها لاحقاً، مثل نصوص فعالية الصحة النفسية.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSciReviewFilter('pending')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black ${
                      sciReviewFilter === 'pending' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    بانتظار التقييم ({pendingScientificCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSciReviewFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black ${
                      sciReviewFilter === 'all' ? 'bg-teal-700 text-white' : 'bg-teal-50 text-teal-800 border border-teal-200'
                    }`}
                  >
                    الحالية ({scientificTexts.filter((s) => !s.archived).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSciReviewFilter('archived')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black ${
                      sciReviewFilter === 'archived' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    الأرشيف ({archivedScientificCount})
                  </button>
                </div>
              </div>

              {groupedScientificTexts.length === 0 ? (
                <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-sm font-bold">
                    {sciReviewFilter === 'pending'
                      ? 'لا توجد نصوص بانتظار التقييم حالياً.'
                      : sciReviewFilter === 'archived'
                        ? 'لا يوجد أرشيف بعد.'
                        : 'لم تصل أي نصوص حالية من لجنة المحتوى العلمي.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {groupedScientificTexts.map(([archiveTitle, items]) => (
                    <section key={archiveTitle} className="space-y-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <h4 className="text-sm font-black text-slate-900">{archiveTitle}</h4>
                        <span className="text-[10px] font-bold text-slate-500">{items.length} نص</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {items.map((sci) => (
                    <div key={`${sci.collectionName}-${sci.id}`} className="p-6 rounded-2xl border border-teal-200 bg-teal-50/20 shadow-sm flex flex-col justify-between space-y-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start gap-3">
                          <div>
                            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold inline-block mb-1 ${
                              sci.status === 'pending'
                                ? 'bg-amber-200 text-amber-900'
                                : sci.status === 'rejected'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {scientificStatusLabel(sci.status)}
                            </span>
                            <span className="text-[10px] bg-amber-50 text-[#630517] border border-amber-100 px-2.5 py-0.5 rounded-full font-bold inline-block mb-1 mr-1">
                              {scientificArchiveTitle(sci)}
                            </span>
                            {sci.category ? (
                              <span className="text-[10px] bg-teal-200 text-teal-900 px-2.5 py-0.5 rounded-full font-bold inline-block mb-1 mr-1">
                                {sci.category}
                              </span>
                            ) : null}
                            <h4 className="font-black text-slate-900 text-sm">{sci.title}</h4>
                            <span className="text-[11px] text-slate-500 font-bold block mt-0.5">✍️ {sci.author || 'لجنة المحتوى العلمي'}</span>
                          </div>
                          {sci.fileUrl && !scientificPdfUrl(sci) ? (
                            <img src={sci.fileUrl} alt={sci.title} className="w-14 h-14 rounded-2xl object-cover border-2 border-teal-400 shadow shrink-0" />
                          ) : null}
                        </div>
                        {sci.content ? (
                          <p className="text-slate-700 text-xs font-medium bg-white p-4 rounded-xl border border-teal-100 shadow-inner leading-relaxed whitespace-pre-line">
                            {sci.content}
                          </p>
                        ) : null}
                        {scientificPdfUrl(sci) ? (
                          <a
                            href={scientificPdfUrl(sci)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex text-xs font-bold text-teal-800 bg-white border border-teal-200 px-3 py-1.5 rounded-lg hover:bg-teal-50"
                          >
                            فتح ملف PDF {sci.fileName ? `(${sci.fileName})` : ''}
                          </a>
                        ) : null}
                      </div>

                      <div className="pt-2 border-t border-teal-200 flex justify-between items-center flex-wrap gap-2 text-[11px]">
                        <span className="text-slate-400">{formatScientificDate(sci.createdAtMs || sci.createdAt)}</span>
                        <div className="flex gap-2 flex-wrap">
                          {sci.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleReviewScientificText(sci, 'approved')}
                                className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 cursor-pointer"
                              >
                                اعتماد ✓
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReviewScientificText(sci, 'rejected')}
                                className="px-3 py-1 rounded-lg bg-amber-100 text-amber-900 font-bold hover:bg-amber-200 cursor-pointer"
                              >
                                رفض
                              </button>
                            </>
                          )}
                          {sci.status === 'rejected' && (
                            <button
                              type="button"
                              onClick={() => handleReviewScientificText(sci, 'approved')}
                              className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 cursor-pointer"
                            >
                              اعتماد بعد المراجعة ✓
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleArchiveScientificText(sci, !sci.archived)}
                            className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 cursor-pointer"
                          >
                            {sci.archived ? 'إرجاع من الأرشيف' : 'أرشفة'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditScientificTextClick(sci)}
                            className="px-3 py-1 rounded-lg bg-teal-100 text-teal-900 font-bold hover:bg-teal-200 cursor-pointer"
                          >
                            تعديل ✏️
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteScientificText(sci)}
                            className="px-3 py-1 rounded-lg bg-red-50 text-red-600 font-bold hover:bg-red-100 cursor-pointer"
                          >
                            حذف ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4 flex justify-between items-center flex-wrap gap-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    {editingScientificId ? '✏️ تعديل نص' : 'ملاحظة من الإدارة (اختياري)'}
                  </h3>
                  <p className="text-xs text-slate-500">الرفع الأساسي من قادة وأعضاء لجنة المحتوى العلمي. هذا النموذج إذا أردتم إضافة نص معتمد مباشرة.</p>
                </div>
                {editingScientificId && (
                  <button
                    type="button"
                    onClick={resetScientificForm}
                    className="text-xs text-red-600 font-bold bg-red-50 px-3 py-1.5 rounded-xl hover:bg-red-100"
                  >
                    إلغاء التعديل ✕
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveScientificText} className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-teal-50/40 p-6 rounded-2xl border border-teal-200">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">عنوان الأرشيف / اسم الفعالية</label>
                  <input
                    type="text"
                    placeholder="مثال: نصوص فعالية الصحة النفسية"
                    value={sciArchiveTitle}
                    onChange={(e) => setSciArchiveTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:border-teal-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">عنوان المقال أو النص العلمي</label>
                  <input
                    type="text"
                    placeholder="مثال: المستجدات الحديثة في الرعاية التمريضية المركزة"
                    value={sciTitleInput}
                    onChange={(e) => setSciTitleInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:border-teal-600"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">تصنيف المحتوى</label>
                  <select
                    value={sciCategoryInput}
                    onChange={(e) => setSciCategoryInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white"
                  >
                    <option value="أبحاث ومقالات علمية">أبحاث ومقالات علمية 🧪</option>
                    <option value="تلخيصات ومفاهيم تمريضية">تلخيصات ومفاهيم تمريضية 🩺</option>
                    <option value="ملفات واختبارات الهيئة">ملفات واختبارات الهيئة 📚</option>
                    <option value="إرشادات وممارسات إكلينيكية">إرشادات وممارسات إكلينيكية 🏥</option>
                  </select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">اسم الكاتب / المراجِع العلمي (اختياري)</label>
                  <input
                    type="text"
                    placeholder="مثال: إعداد لجنة المحتوى العلمي"
                    value={sciAuthorInput}
                    onChange={(e) => setSciAuthorInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:border-teal-600"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">رفع ملف PDF فيه النصوص</label>
                  <input
                    type="file"
                    accept="application/pdf,.pdf,image/*"
                    onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        const base64 = await convertFileToBase64(file);
                        setSciFileInput(base64);
                        setSciFileName(file.name);
                      }
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white file:ml-4 file:py-1 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-teal-600 file:text-white cursor-pointer"
                  />
                  {sciFileName ? <p className="text-[10px] text-slate-500">الملف: {sciFileName}</p> : null}
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">نص المحتوى العلمي (اختياري إذا رفعت PDF)</label>
                  <textarea
                    rows={6}
                    placeholder="اكتب المحتوى هنا أو اتركه فارغاً إذا كان الملف يحتوي النصوص..."
                    value={sciContentInput}
                    onChange={(e) => setSciContentInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:border-teal-600 leading-relaxed font-sans"
                  />
                </div>

                <div className="sm:col-span-2 pt-2">
                  <button
                    type="submit"
                    className="bg-teal-700 text-white px-8 py-3 rounded-xl font-black text-xs shadow hover:bg-teal-800 cursor-pointer"
                  >
                    {editingScientificId ? '💾 حفظ التعديلات' : '+ حفظ واعتماد النص مباشرة'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'weekly-newsletter' && (
          <div className="space-y-8">
            <div className="bg-white rounded-3xl p-8 border border-[#630517]/20 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4 flex justify-between items-center flex-wrap gap-4">
                <div>
                  <h3 className="text-xl font-black text-[#630517]">
                    {editingNewsletterId ? 'تعديل إصدار النشرة' : 'النشرة الأكاديمية وجداول اختبارات الدفعات'}
                  </h3>
                  <p className="text-xs text-slate-500">انشر جدولاً لدفعة معيّنة أو خبراً/مصدراً، ويظهر مباشرة في صفحة النشرة.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href="/newsletter"
                    target="_blank"
                    className="text-xs font-black text-[#630517] bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl hover:bg-amber-100"
                  >
                    فتح صفحة النشرة ↗
                  </Link>
                  {editingNewsletterId && (
                    <button
                      type="button"
                      onClick={resetNewsletterForm}
                      className="text-xs text-red-600 font-bold bg-red-50 px-3 py-1.5 rounded-xl hover:bg-red-100"
                    >
                      إلغاء التعديل ✕
                    </button>
                  )}
                </div>
              </div>

              <form onSubmit={handleSaveNewsletter} className="space-y-5 bg-[#630517]/5 p-6 rounded-2xl border border-[#630517]/10">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setNewsTypeInput('exam-schedule')}
                    className={`px-4 py-2 rounded-xl text-xs font-black ${newsTypeInput === 'exam-schedule' ? 'bg-[#630517] text-[#F5D061]' : 'bg-white text-slate-600 border border-slate-200'}`}
                  >
                    جدول اختبارات دفعة
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewsTypeInput('article')}
                    className={`px-4 py-2 rounded-xl text-xs font-black ${newsTypeInput === 'article' ? 'bg-[#630517] text-[#F5D061]' : 'bg-white text-slate-600 border border-slate-200'}`}
                  >
                    خبر أو مصدر في النشرة
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">{newsTypeInput === 'exam-schedule' ? 'عنوان الجدول' : 'عنوان الخبر'}</label>
                    <input
                      type="text"
                      placeholder={newsTypeInput === 'exam-schedule' ? 'مثال: جدول اختبارات منتصف الفصل - دفعة 2024' : 'مثال: مصادر مراجعة اختبار الهيئة هذا الأسبوع'}
                      value={newsTitleInput}
                      onChange={(e) => setNewsTitleInput(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:border-[#630517]"
                      required
                    />
                  </div>

                  {newsTypeInput === 'article' ? (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">التصنيف</label>
                      <select
                        value={newsCategoryInput}
                        onChange={(e) => setNewsCategoryInput(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white"
                      >
                        <option value="أخبار النادي الأسبوعية">أخبار النادي الأسبوعية</option>
                        <option value="مصادر اختبار الهيئة">مصادر اختبار الهيئة</option>
                        <option value="تحديثات كلية التمريض">تحديثات كلية التمريض</option>
                        <option value="نصائح دراسية">نصائح دراسية</option>
                        <option value="مقالات وابتكارات">مقالات وابتكارات</option>
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">الدفعة</label>
                      <input
                        list="nursing-cohorts"
                        value={examCohortInput}
                        onChange={(e) => setExamCohortInput(e.target.value)}
                        placeholder="دفعة 2024"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white"
                      />
                      <datalist id="nursing-cohorts">
                        <option value="دفعة 2021" />
                        <option value="دفعة 2022" />
                        <option value="دفعة 2023" />
                        <option value="دفعة 2024" />
                        <option value="دفعة 2025" />
                        <option value="دفعة 2026" />
                        <option value="الامتياز" />
                        <option value="جميع الدفعات" />
                      </datalist>
                    </div>
                  )}

                  {newsTypeInput === 'exam-schedule' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">الفصل الدراسي</label>
                      <input
                        type="text"
                        placeholder="مثال: الفصل الأول 1447 / 2025-2026"
                        value={examSemesterInput}
                        onChange={(e) => setExamSemesterInput(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">رابط مفيد (اختياري)</label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={newsLinkInput}
                      onChange={(e) => setNewsLinkInput(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 font-mono bg-white"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700">صورة اختيارية</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                        if (e.target.files && e.target.files[0]) {
                          const base64 = await convertFileToBase64(e.target.files[0]);
                          setNewsImageInput(base64);
                        }
                      }}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white file:mr-4 file:py-1 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#630517] file:text-[#F5D061] cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700">{newsTypeInput === 'exam-schedule' ? 'ملاحظة للطلاب (اختياري)' : 'المحتوى'}</label>
                    <textarea
                      rows={newsTypeInput === 'exam-schedule' ? 2 : 4}
                      placeholder={newsTypeInput === 'exam-schedule' ? 'مثال: يُرجى الحضور قبل الموعد بربع ساعة، والبطاقة الجامعية مطلوبة.' : 'اكتب الخبر أو المصدر أو النصيحة الدراسية...'}
                      value={newsContentInput}
                      onChange={(e) => setNewsContentInput(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white leading-relaxed"
                      required={newsTypeInput === 'article'}
                    />
                  </div>

                  {newsTypeInput === 'article' && (
                    <label className="sm:col-span-2 flex items-center gap-2 text-xs font-bold text-slate-700">
                      <input type="checkbox" checked={newsFeaturedInput} onChange={(e) => setNewsFeaturedInput(e.target.checked)} />
                      تثبيت هذا الخبر في أعلى النشرة
                    </label>
                  )}
                </div>

                {newsTypeInput === 'exam-schedule' && (
                  <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-black text-[#630517]">مواد الجدول</p>
                      <button
                        type="button"
                        onClick={() => setExamRows([...examRows, emptyExamRow()])}
                        className="text-[11px] font-black bg-amber-50 text-[#630517] px-3 py-1.5 rounded-lg"
                      >
                        + إضافة مادة
                      </button>
                    </div>
                    <div className="space-y-3">
                      {examRows.map((row, idx) => (
                        <div key={idx} className="grid grid-cols-1 sm:grid-cols-6 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <input value={row.course} onChange={(e) => setExamRows(examRows.map((r, i) => i === idx ? { ...r, course: e.target.value } : r))} placeholder="المادة *" className="sm:col-span-2 px-3 py-2 rounded-lg border border-slate-200 text-xs" required={idx === 0} />
                          <input value={row.courseCode || ''} onChange={(e) => setExamRows(examRows.map((r, i) => i === idx ? { ...r, courseCode: e.target.value } : r))} placeholder="الرمز" className="px-3 py-2 rounded-lg border border-slate-200 text-xs" />
                          <input type="date" value={row.date} onChange={(e) => setExamRows(examRows.map((r, i) => i === idx ? { ...r, date: e.target.value } : r))} className="px-3 py-2 rounded-lg border border-slate-200 text-xs" required={idx === 0} />
                          <input value={row.time || ''} onChange={(e) => setExamRows(examRows.map((r, i) => i === idx ? { ...r, time: e.target.value } : r))} placeholder="الوقت" className="px-3 py-2 rounded-lg border border-slate-200 text-xs" />
                          <div className="flex gap-2">
                            <input value={row.location || ''} onChange={(e) => setExamRows(examRows.map((r, i) => i === idx ? { ...r, location: e.target.value } : r))} placeholder="القاعة" className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-xs" />
                            {examRows.length > 1 && (
                              <button type="button" onClick={() => setExamRows(examRows.filter((_, i) => i !== idx))} className="text-red-600 text-xs font-black px-2">✕</button>
                            )}
                          </div>
                          <input value={row.notes || ''} onChange={(e) => setExamRows(examRows.map((r, i) => i === idx ? { ...r, notes: e.target.value } : r))} placeholder="ملاحظات" className="sm:col-span-6 px-3 py-2 rounded-lg border border-slate-200 text-xs" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="bg-[#630517] text-[#F5D061] px-8 py-3 rounded-xl font-black text-xs shadow hover:brightness-110 cursor-pointer"
                >
                  {editingNewsletterId ? 'حفظ التحديث في النشرة' : newsTypeInput === 'exam-schedule' ? 'نشر جدول الاختبارات في النشرة' : 'نشر في صفحة النشرة'}
                </button>
              </form>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-xl font-black text-slate-900">ما هو منشور في النشرة ({newsletters.length})</h3>
              {newsletters.length === 0 ? (
                <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-sm font-bold">لا يوجد إصدار بعد. انشر جدولاً أو خبراً ليظهر للطلاب فوراً.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {newsletters.map((news) => {
                    const isExam = news.type === 'exam-schedule' || (news.exams && news.exams.length > 0);
                    return (
                      <div key={news.id} className="p-6 rounded-2xl border border-[#630517]/15 bg-[#630517]/[0.03] shadow-sm flex flex-col justify-between space-y-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] bg-[#630517] text-[#F5D061] px-2.5 py-0.5 rounded-full font-bold">
                              {isExam ? news.examCohort || 'جدول اختبارات' : news.category}
                            </span>
                            {news.featured && <span className="text-[10px] font-black text-amber-700">مثبّت</span>}
                          </div>
                          <h4 className="font-black text-slate-900 text-sm">{news.title}</h4>
                          {isExam ? (
                            <p className="text-xs text-slate-600 font-bold">{news.exams?.length || 0} مادة • {news.examSemester || 'بدون فصل'}</p>
                          ) : (
                            <p className="text-slate-700 text-xs bg-white p-3 rounded-xl border border-slate-100 leading-relaxed line-clamp-4">{news.content}</p>
                          )}
                        </div>
                        <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[11px]">
                          <span className="text-slate-400">{news.date ? new Date(news.date).toLocaleDateString('ar-SA') : ''}</span>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => handleEditNewsletterClick(news)} className="px-3 py-1 rounded-lg bg-amber-50 text-[#630517] font-bold hover:bg-amber-100 cursor-pointer">تعديل</button>
                            <button type="button" onClick={() => handleDeleteNewsletter(news.id)} className="px-3 py-1 rounded-lg bg-red-50 text-red-600 font-bold hover:bg-red-100 cursor-pointer">حذف</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'case-study' && (
          <div className="bg-white rounded-3xl p-8 border border-pink-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4 flex justify-between items-center flex-wrap gap-4">
              <div>
                <h3 className="text-xl font-black text-pink-900">🎀 دراسة الحالة — أسبوع سرطان الثدي</h3>
                <p className="text-xs text-slate-500">متابعة المشاركين في تحدي Pink October، درجاتهم، وأرقام جوالاتهم.</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-pink-100 text-pink-800 font-bold text-xs">
                إجمالي المشاركات: {caseSubmissions.length}
              </span>
            </div>

            {caseSubmissions.length === 0 ? (
              <div className="py-16 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-sm font-bold">لم يتم تسجيل أي مشاركات في دراسة الحالة حتى الآن.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold">
                      <th className="pb-3 pr-2">اسم الطالب / المشارك (الاسم الحقيقي)</th>
                      <th className="pb-3">رقم الجوال</th>
                      <th className="pb-3">الدرجة / النقاط</th>
                      <th className="pb-3">تاريخ ووقت المشاركة</th>
                      <th className="pb-3 text-left pl-2">الإجراءات وصلاحيات النقاط</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {caseSubmissions.map((sub, idx) => {
                      const formattedDate = sub.createdAt || sub.submittedAt
                        ? new Date(sub.createdAt || sub.submittedAt).toLocaleString('ar-SA')
                        : new Date().toLocaleString('ar-SA');

                      const userPhone = sub.phone || sub.phoneNumber || '';
                      const rawName = sub.studentName || sub.fullName || sub.name || 'مشارك كريم';
                      const realStudentName = getRealUserName(userPhone, rawName);

                      return (
                        <tr key={sub.id || idx} className="hover:bg-slate-50">
                          <td className="py-4 pr-2 font-bold text-slate-900">
                            👤 {realStudentName}
                          </td>
                          <td className="py-4 text-slate-600 font-mono" dir="ltr">
                            📞 {userPhone || 'غير متوفر'}
                          </td>
                          <td className="py-4">
                            <span className="px-3 py-1 rounded-full bg-pink-100 text-pink-800 font-bold text-xs font-mono">
                              ⭐ {sub.score || 0} نقطة
                            </span>
                          </td>
                          <td className="py-4 text-slate-500 font-mono" dir="ltr">
                            🕒 {formattedDate}
                          </td>
                          <td className="py-4 text-left pl-2 flex items-center gap-1.5 justify-end flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleUpdateCaseScore(sub.id, sub.score || 0, 1)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-bold hover:bg-emerald-100 cursor-pointer text-[11px]"
                            >
                              + بونص 🟢
                            </button>

                            <button
                              type="button"
                              onClick={() => handleUpdateCaseScore(sub.id, sub.score || 0, -1)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 font-bold hover:bg-amber-100 cursor-pointer text-[11px]"
                            >
                              - خصم 🟠
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setCertRecipientInput(realStudentName);
                                setCertPhoneInput(userPhone);
                                setCertTitleInput('شهادة مشاركة في دراسة الحالة الطبية');
                                setCertCategoryInput('شهادة اجتياز دورة');
                                setActiveTab('certificates');
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-sky-50 text-sky-700 font-bold hover:bg-sky-100 cursor-pointer text-[11px]"
                            >
                              إصدار شهادة 📜
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteCaseSubmission(sub.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 font-bold hover:bg-red-100 cursor-pointer text-[11px]"
                              title="إزالة من لوحة الصدارة"
                            >
                              حذف من الصدارة 🗑️
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'certificates' && (
          <div className="space-y-8">
            <div className="bg-white rounded-3xl p-8 border border-sky-300 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4 flex justify-between items-center flex-wrap gap-4">
                <div>
                  <h3 className="text-xl font-black text-sky-900">
                    {editingCertId ? '✏️ تعديل بيانات الشهادة المعتمدة' : '📜 إصدار ورفع شهادة شكر أو إنجاز جديدة'}
                  </h3>
                  <p className="text-xs text-slate-500">أدخل اسم المكرم، رقم الجوال وكلمة المرور الخاصة به (للاستعلام)، عنوان الشهادة، ونوعها.</p>
                </div>
                {editingCertId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCertId(null);
                      setCertRecipientInput('');
                      setCertPhoneInput('');
                      setCertUniversityIdInput('');
                      setCertPasswordInput('');
                      setCertTitleInput('');
                      setCertDescInput('');
                      setCertImageInput('/logo.png');
                    }}
                    className="text-xs text-red-600 font-bold bg-red-50 px-3 py-1.5 rounded-xl hover:bg-red-100"
                  >
                    إلغاء التعديل ✕
                  </button>
                )}
              </div>

              <HrCertificateBatches
                certificates={certificates.map((cert) => ({
                  phone: cert.phone,
                  universityId: cert.universityId,
                  title: cert.certTitle,
                  certTitle: cert.certTitle,
                }))}
                actorName="لوحة الأدمن"
                formAnchorId="admin-cert-form"
                onIssue={(person, certTitle) => {
                  setCertRecipientInput(person.fullName);
                  setCertPhoneInput(person.phone);
                  setCertUniversityIdInput(person.universityId);
                  setCertTitleInput(certTitle);
                  setCertCategoryInput('شهادة مشاركة فعالية');
                }}
              />

              <form id="admin-cert-form" onSubmit={handleSaveCertificate} className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-sky-50/40 p-6 rounded-2xl border border-sky-200">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">اسم المستفيد أو المكرم</label>
                  <input
                    type="text"
                    placeholder="مثال: عبد العزيز سليمان العنزي"
                    value={certRecipientInput}
                    onChange={(e) => setCertRecipientInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:border-sky-600"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">رقم جوال المستفيد (للاستعلام)</label>
                  <input
                    type="text"
                    placeholder="05XXXXXXXX"
                    value={certPhoneInput}
                    onChange={(e) => setCertPhoneInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:border-sky-600 font-mono"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">الرقم الجامعي (إن وجد)</label>
                  <input
                    type="text"
                    placeholder="الرقم الجامعي"
                    value={certUniversityIdInput}
                    onChange={(e) => setCertUniversityIdInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:border-sky-600 font-mono"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">كلمة المرور الخاصة به (للاستعلام)</label>
                  <input
                    type="text"
                    placeholder="كلمة المرور..."
                    value={certPasswordInput}
                    onChange={(e) => setCertPasswordInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:border-sky-600 font-mono"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">عنوان الشهادة أو الفعالية</label>
                  <input
                    type="text"
                    placeholder="مثال: شهادة شكر على التنظيم المتميز"
                    value={certTitleInput}
                    onChange={(e) => setCertTitleInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:border-sky-600"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">تصنيف الشهادة</label>
                  <select
                    value={certCategoryInput}
                    onChange={(e) => setCertCategoryInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white"
                  >
                    <option value="شهادة شكر وتقدير">شهادة شكر وتقدير 🌟</option>
                    <option value="شهادة اجتياز دورة">شهادة اجتياز دورة 🎓</option>
                    <option value="شهادة مشاركة فعالية">شهادة مشاركة فعالية 🗓️</option>
                    <option value="شهادة تميز قيادي">شهادة تميز قيادي 🛡️</option>
                  </select>
                </div>

                <div className="space-y-1.5 sm:col-span-3">
                  <label className="text-xs font-bold text-slate-700">صورة أو ملف الشهادة (الحد 8 ميغابايت)</label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const url = await uploadClubFile(file, 'certificates');
                        setCertImageInput(url);
                      } catch (err) {
                        setModalMessage(err instanceof Error ? err.message : 'تعذر رفع ملف الشهادة.');
                        setModalType('success');
                      }
                    }}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs bg-white file:mr-4 file:py-1 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-sky-600 file:text-white cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-3">
                  <label className="text-xs font-bold text-slate-700">وصف أو تفاصيل إضافية للشهادة</label>
                  <textarea
                    rows={2}
                    placeholder="اكتب تفاصيل تكريم العضو..."
                    value={certDescInput}
                    onChange={(e) => setCertDescInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:border-sky-600"
                  />
                </div>

                <div className="sm:col-span-3 pt-2">
                  <button
                    type="submit"
                    className="bg-sky-600 text-white px-8 py-3 rounded-xl font-black text-xs shadow hover:bg-sky-700 cursor-pointer"
                  >
                    {editingCertId ? '💾 حفظ التعديلات وتحديث الشهادة سحابياً' : '+ إصدار ونشر الشهادة سحابياً وربطها برقم الجوال وكلمة المرور 🚀'}
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-xl font-black text-slate-900">سجل الشهادات والاعتمادات الصادرة ({certificates.length})</h3>
              {certificates.length === 0 ? (
                <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-sm font-bold">لم تتم إضافة أي شهادة حتى الآن.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {certificates.map((cert) => (
                    <div key={cert.id} className="p-6 rounded-2xl border border-sky-200 bg-sky-50/20 shadow-sm flex flex-col justify-between space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <img src={cert.image || '/logo.png'} alt={cert.certTitle} className="w-14 h-14 rounded-2xl object-cover border-2 border-sky-400 shadow" />
                          <div>
                            <h4 className="font-black text-slate-900 text-sm">👤 {cert.recipientName}</h4>
                            <span className="text-[10px] text-slate-500 font-mono block" dir="ltr">📞 {cert.phone || 'غير مسجل'}</span>
                            <span className="text-[10px] bg-sky-200 text-sky-900 px-2 py-0.5 rounded-full font-bold inline-block mt-1">
                              {cert.category}
                            </span>
                          </div>
                        </div>
                        <h5 className="font-bold text-sky-900 text-xs">{cert.certTitle}</h5>
                        <p className="text-slate-700 text-xs font-semibold bg-white p-3 rounded-xl border border-sky-100 shadow-inner leading-relaxed">
                          "{cert.description}"
                        </p>
                      </div>

                      <div className="pt-2 border-t border-sky-200 flex justify-between items-center text-[11px]">
                        <span className="text-slate-400">{new Date(cert.issueDate).toLocaleDateString('ar-SA')}</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditCertificateClick(cert)}
                            className="px-3 py-1 rounded-lg bg-sky-100 text-sky-900 font-bold hover:bg-sky-200 cursor-pointer"
                          >
                            تعديل ✏️
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCertificate(cert.id)}
                            className="px-3 py-1 rounded-lg bg-red-50 text-red-600 font-bold hover:bg-red-100 cursor-pointer"
                          >
                            حذف ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      {activeTab === 'student-achievements' && (
  <div className="space-y-8">
    <div className="bg-white rounded-3xl p-8 border border-amber-300 shadow-sm space-y-6">
      <div className="border-b border-slate-100 pb-4 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h3 className="text-xl font-black text-amber-900">
            {editingAchievementId ? '✏️ تعديل الإنجاز الجماعي أو الفردي' : '🏆 إضافة إنجاز جماعي أو فردي جديد من كلية التمريض'}
          </h3>
          <p className="text-xs text-slate-500">أدخل أسماء الطلبة بشكل منظم بضغط زر (+)، اسم الجائزة، صورة التكريم، وتفاصيل الإنجاز.</p>
        </div>
        {editingAchievementId && (
          <button
            type="button"
            onClick={() => {
              setEditingAchievementId(null);
              setStudentNamesList(['']);
              setAwardNameInput('');
              setAchievementDescInput('');
              setStudentImageInput('/logo.png');
            }}
            className="text-xs text-red-600 font-bold bg-red-50 px-3 py-1.5 rounded-xl hover:bg-red-100"
          >
            إلغاء التعديل ✕
          </button>
        )}
      </div>

      <form onSubmit={handleSaveStudentAchievement} className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-amber-50/40 p-6 rounded-2xl border border-amber-200">
        
        {/* نظام إضافة أسماء الطلاب بالزر الديناميكي (+) */}
        <div className="space-y-2 sm:col-span-2 bg-white p-4 rounded-2xl border border-amber-200 shadow-sm">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <label className="text-xs font-black text-slate-800">
              👥 أسماء الطلبة المشاركين / المكرمين:
            </label>
            <button
              type="button"
              onClick={handleAddStudentNameField}
              className="bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-1 cursor-pointer"
            >
              ➕ إضافة اسم طالب آخر
            </button>
          </div>

          <div className="space-y-2.5 pt-2">
            {studentNamesList.map((nameVal, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-amber-900 bg-amber-100 px-3 py-2.5 rounded-xl shrink-0">
                  طالب #{index + 1}
                </span>
                <input
                  type="text"
                  placeholder={`اكتب اسم الطالب (مثال: عبد العزيز العنزي)`}
                  value={nameVal}
                  onChange={(e) => handleStudentNameChange(index, e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50/50 focus:bg-white focus:outline-none focus:border-amber-600 transition-all font-medium"
                  required={index === 0}
                />
                {studentNamesList.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveStudentNameField(index)}
                    className="p-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 font-bold text-xs shrink-0 cursor-pointer transition-all"
                    title="حذف هذا الاسم"
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
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
          <label className="text-xs font-bold text-slate-700">صورة الإنجاز أو فريق العمل / التكريم (الحد 8 ميغابايت)</label>
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
            placeholder="اكتب نبذة مختصرة عن الإنجاز..."
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
            {editingAchievementId ? '💾 حفظ التعديلات وتحديث الإنجاز سحابياً' : '+ نشر الإنجاز الجماعي في الموقع سحابياً 🚀'}
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
              <div className="space-y-4">
                {/* رأس الكرت: الشعار واسم الجائزة */}
                <div className="flex items-start gap-3">
                  <img src={ach.image || '/logo.png'} alt={ach.awardName} className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-400 shadow shrink-0" />
                  <div>
                    <span className="text-[11px] bg-amber-200/90 text-amber-950 px-2.5 py-1 rounded-lg font-black inline-block">
                      🏆 {ach.awardName}
                    </span>
                  </div>
                </div>

                {/* تفكيك وعرض أسماء الطلاب بشكل مرتب ومفصول */}
                <div className="space-y-1.5 bg-white/90 p-3 rounded-xl border border-amber-100 shadow-xs">
                  <span className="text-[10px] font-black text-amber-800 block">👥 الطلبة المشاركون / المكرمون:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {ach.studentName.split(/[,،\n]+/).filter(Boolean).map((name, idx) => (
                      <span key={idx} className="bg-amber-100/80 text-amber-950 font-bold text-xs px-2.5 py-1 rounded-lg border border-amber-200/80 shadow-2xs flex items-center gap-1">
                        👤 {name.trim()}
                      </span>
                    ))}
                  </div>
                </div>

                {/* الوصف */}
                <p className="text-slate-700 text-xs font-semibold bg-white p-3 rounded-xl border border-amber-100 shadow-inner leading-relaxed">
                  "{ach.description}"
                </p>
              </div>

              <div className="pt-2 border-t border-amber-200 flex justify-between items-center text-[11px]">
                <span className="text-slate-400">{new Date(ach.createdAt).toLocaleDateString('ar-SA')}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEditStudentAchievementClick(ach)}
                    className="px-3 py-1 rounded-lg bg-amber-100 text-amber-900 font-bold hover:bg-amber-200 cursor-pointer"
                  >
                    تعديل ✏️
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteStudentAchievement(ach.id)}
                    className="px-3 py-1 rounded-lg bg-red-50 text-red-600 font-bold hover:bg-red-100 cursor-pointer"
                  >
                    حذف ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
)}
        {activeTab === 'media-committee' && (
          <div className="space-y-8">
            <div className="bg-white rounded-3xl p-8 border border-rose-200 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-xl font-black text-rose-900">🎥 رفع وتوثيق محتوى لجنة الإعلام</h3>
                <p className="text-xs text-slate-500">مربوط مباشرة بصفحة أعضاء لجنة الإعلام: أي صورة أو فيديو يرفعها الأعضاء تصلك هنا تلقائياً، ورفوعات الأدمن تظهر لهم أيضاً.</p>
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
                  <label className="text-xs font-bold text-slate-700">اختر الملفات والفيديوهات (الحد 8 ميغابايت لكل ملف)</label>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleSelectMediaFiles}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white file:mr-4 file:py-1 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-rose-700 file:text-white cursor-pointer"
                  />
                  {mediaFileObjects.length > 0 && (
                    <p className="text-[11px] font-bold text-rose-800">تم اختيار {mediaFileObjects.length} ملف: {mediaFileObjects.map((f) => f.name).join('، ')}</p>
                  )}
                </div>

                <div className="sm:col-span-2 pt-2">
                  <button
                    type="submit"
                    disabled={isUploadingMedia}
                    className="bg-rose-700 text-white px-8 py-3 rounded-xl font-black text-xs shadow hover:bg-rose-800 disabled:bg-slate-400 cursor-pointer"
                  >
                    {uploadingLabel(isUploadingMedia, cloudUploadProgress, '+ رفع ونشر محتوى لجنة الإعلام سحابياً')}
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
                  {mediaUploads.map((item) => {
                    const sources = getMediaSources(item);
                    return (
                    <div key={item.id} className="p-6 rounded-2xl border border-rose-100 bg-rose-50/10 shadow-sm space-y-4">
                      <div className="flex justify-between items-center gap-3">
                        <h4 className="font-black text-rose-900 text-sm">{item.title}</h4>
                        <span className="text-[10px] bg-rose-100 text-rose-800 px-2.5 py-1 rounded-full font-bold shrink-0">{item.category}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-bold">
                        من: {item.addedBy || item.uploadedBy || 'عضو الإعلام'}
                        {item.source ? ` — ${item.source}` : ''}
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {sources.map((fileSrc: string, fIdx: number) => {
                          const isVideo = isMediaVideo(fileSrc, item);
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
                        <span className="text-slate-400">{formatMediaDate(item)}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteMediaUpload(item.id)}
                          className="px-3 py-1 rounded-lg bg-red-50 text-red-600 font-bold hover:bg-red-100 cursor-pointer"
                        >
                          حذف المحتوى ✕
                        </button>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'performance-radar' && (
          <CommitteePerformanceRadar
            committees={committees}
            requests={requests}
            mediaUploads={mediaUploads}
            certificates={certificates}
            partners={partners}
            events={events}
            scientificTexts={scientificTexts}
            qualityEvaluationReports={qualityEvaluationReports}
            qualityUploadedFiles={qualityUploadedFiles}
            escalatedReports={escalatedReports}
            matchesCommittee={matchesCommittee}
          />
        )}

        {activeTab === 'historical-vault' && (
          <div className="space-y-8">
            <div className="bg-white rounded-3xl p-8 border border-indigo-300 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4 flex justify-between items-center flex-wrap gap-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900">📁 الملفات المرفوعة (وورد / إكسل / PDF)</h3>
                  <p className="text-xs text-slate-500">الملفات التي ترفعها لجنة الجودة بنفسها من جهازها. هذا القسم منفصل عن تقييم اللجان.</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-900 font-bold text-xs">
                  إجمالي الملفات: {qualityUploadedFiles.length}
                </span>
              </div>

              {qualityUploadedFiles.length === 0 ? (
                <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-sm font-bold">لا توجد ملفات وورد أو إكسل مرفوعة حتى الآن.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {qualityUploadedFiles.map((fileItem, idx) => (
                    <div key={fileItem.id || idx} className="p-6 rounded-2xl border border-indigo-200 bg-indigo-50/40 shadow-sm space-y-3">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <span className="font-black text-indigo-900 text-sm">{fileItem.title || 'ملف مرفوع'}</span>
                        <span className="text-[10px] bg-indigo-200 text-indigo-900 font-mono px-2 py-0.5 rounded font-bold">
                          {formatVaultDate(fileItem)}
                        </span>
                      </div>
                      <p className="text-slate-700 text-xs font-semibold bg-white p-3 rounded-xl border border-indigo-100">
                        اسم الملف: {fileItem.fileName || 'غير محدد'}
                        {fileItem.fileKind ? ` • النوع: ${fileItem.fileKind === 'word' ? 'وورد' : fileItem.fileKind === 'excel' ? 'إكسل' : fileItem.fileKind === 'pdf' ? 'PDF' : fileItem.fileKind}` : ''}
                      </p>
                      <div className="pt-2 border-t border-indigo-200 flex justify-between items-center text-[11px] text-slate-600 font-bold flex-wrap gap-2">
                        <span>الرافع: {fileItem.author || 'لجنة الجودة والتطوير'}</span>
                        <div className="flex items-center gap-2">
                          {fileItem.fileUrl ? (
                            <a
                              href={fileItem.fileUrl}
                              download={fileItem.fileName || 'quality-file'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3.5 py-1.5 bg-indigo-700 text-white rounded-xl font-black text-xs shadow-md hover:bg-indigo-800 transition-all"
                            >
                              📥 فتح / تنزيل الملف
                            </a>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => handleDeleteQualityUploadedFile(fileItem.id)}
                            className="px-3 py-1.5 bg-red-100 text-red-700 rounded-xl font-bold text-xs hover:bg-red-200 cursor-pointer"
                          >
                            حذف
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-3xl p-8 border border-amber-300 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4 flex justify-between items-center flex-wrap gap-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900">📊 تقييم اللجان والأعضاء</h3>
                  <p className="text-xs text-slate-500">تقارير تقييم الأداء والإيجابيات والسلبيات وأبرز الأعضاء. هذا القسم منفصل عن الملفات المرفوعة.</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-xs">
                  إجمالي التقييمات: {qualityEvaluationReports.length}
                </span>
              </div>

              {qualityEvaluationReports.length === 0 ? (
                <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-sm font-bold">لا توجد تقييمات لجان مرفوعة حتى الآن.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {qualityEvaluationReports.map((vaultItem, idx) => (
                    <div key={vaultItem.id || idx} className="p-6 rounded-2xl border border-amber-200 bg-amber-50/40 shadow-sm space-y-3">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <span className="font-black text-amber-900 text-sm">{vaultItem.title || 'تقييم لجان'}</span>
                        <span className="text-[10px] bg-amber-200 text-amber-900 font-mono px-2 py-0.5 rounded font-bold">
                          {formatVaultDate(vaultItem)}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-[#630517] bg-white p-2.5 rounded-xl border border-amber-100">
                        أفضل لجنة: {vaultItem.bestCommittee || 'لم يتم التحديد'}
                      </p>
                      {vaultItem.advantages ? (
                        <p className="text-slate-800 text-xs font-semibold bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                          <strong>الإيجابيات:</strong> {vaultItem.advantages}
                        </p>
                      ) : null}
                      {vaultItem.errors ? (
                        <p className="text-slate-800 text-xs font-semibold bg-red-50 p-3 rounded-xl border border-red-100">
                          <strong>السلبيات:</strong> {vaultItem.errors}
                        </p>
                      ) : null}
                      <div className="pt-2 border-t border-amber-200 flex justify-between items-center text-[11px] text-slate-600 font-bold flex-wrap gap-2">
                        <span>الرافع: {vaultItem.author || 'لجنة الجودة والتطوير'}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handlePrintArchiveReport(vaultItem)}
                            className="px-3.5 py-1.5 bg-[#630517] text-[#F5D061] rounded-xl font-black text-xs shadow-md hover:bg-[#80071D] transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            📄 فتح التقييم / طباعة
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteQualityEvaluation(vaultItem.id)}
                            className="px-3 py-1.5 bg-red-100 text-red-700 rounded-xl font-bold text-xs hover:bg-red-200 cursor-pointer"
                          >
                            حذف
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-3xl p-8 border border-[#630517]/20 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4 flex justify-between items-center flex-wrap gap-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900">التقرير الشامل للفعالية</h3>
                  <p className="text-xs text-slate-500">تقارير الفعاليات من لجنة الجودة والتطوير.</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-[#630517] text-[#F5D061] font-bold text-xs">
                  {qualityEventReports.length} تقرير
                </span>
              </div>
              {qualityEventReports.length === 0 ? (
                <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-sm font-bold">لا توجد تقارير شاملة حتى الآن.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {qualityEventReports.map((report) => (
                    <div key={report.id} className="p-6 rounded-2xl border border-[#630517]/20 bg-[#630517]/5 space-y-3">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <span className="font-black text-[#630517] text-sm">{report.eventTitle}</span>
                        <span className="text-[10px] bg-[#F5D061] text-[#630517] font-mono px-2 py-0.5 rounded font-bold">
                          {computedSuccessIndex(report)}% نجاح
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-semibold">
                        {report.organizer || 'نادي كلية التمريض'} • {report.eventDate || 'بدون تاريخ'}
                      </p>
                      <p className="text-xs font-bold text-slate-800">التوصية: {recommendationLabel(report.recommendation)}</p>
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-[#630517]/10">
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              printQualityEventReport(report);
                            } catch (err) {
                              alert(err instanceof Error ? err.message : 'تعذر فتح التقرير.');
                            }
                          }}
                          className="px-3.5 py-1.5 bg-[#630517] text-[#F5D061] rounded-xl font-black text-xs cursor-pointer"
                        >
                          فتح / طباعة
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            triggerConfirmModal('حذف التقرير الشامل لهذه الفعالية؟', async () => {
                              await deleteDoc(doc(db, QUALITY_EVENT_REPORTS, report.id));
                              setQualityEventReports((prev) => prev.filter((item) => item.id !== report.id));
                              setModalMessage('تم حذف التقرير الشامل.');
                              setModalType('success');
                            });
                          }}
                          className="px-3 py-1.5 bg-red-100 text-red-700 rounded-xl font-bold text-xs cursor-pointer"
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'escalated-reports' && (
          <div className="bg-white rounded-3xl p-8 border border-red-300 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4 flex justify-between items-center flex-wrap gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">🚨 مركز تقارير الجودة (نظام الإنذار والإحالة للرؤساء)</h3>
                <p className="text-xs text-slate-500">أرسل إنذاراً تحذيرياً أولاً لقائد وقائدة اللجنة، أو قم بإحالة البلاغ رسمياً لرئيس ونائبة الرئيس.</p>
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

        {activeTab === 'users-manager' && (isSystemAdminUser || isPresidentsRole) && (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4 flex justify-between items-center flex-wrap gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">إدارة حسابات المستخدمين والرتب</h3>
                <p className="text-xs text-slate-500 mt-1">
                  الحسابات المسجلة في الموقع: <strong className="text-[#630517]">{registeredAccountsCount}</strong>
                  {userSearchQuery.trim() ? ` • المعروض الآن: ${filteredAndSortedUsers.length + 1}` : ''}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  المشرف العام ونائبة الرئيس يدخلون لوحة القيادة التشغيلية (طلبات، لجان، نشرة، شهادات). تغيير الرتب يبقى لمدير النظام فقط.
                </p>
              </div>
              <input
                type="text"
                placeholder="🔍 ابحث بالاسم أو رقم الجوال..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50 focus:outline-none focus:border-[#630517] w-64"
              />
            </div>

            {incompleteAccountsCount > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-black text-amber-900">حسابات غير مكتملة: {incompleteAccountsCount}</p>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    هذه أرقام انحفظت بدون تسجيل حقيقي ولا كلمة مرور. احذفها من هنا، وبعدها يقدر صاحب الرقم ينشئ حسابه بنفسه.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowIncompleteUsers((prev) => !prev)}
                    className="px-3 py-2 rounded-xl bg-white text-amber-800 border border-amber-200 font-bold text-xs hover:bg-amber-100 cursor-pointer"
                  >
                    {showIncompleteUsers ? 'إخفاء القائمة' : 'عرض الأرقام'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteIncompleteAccounts}
                    disabled={isCleaningIncompleteUsers}
                    className="px-3 py-2 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 cursor-pointer disabled:opacity-60"
                  >
                    {isCleaningIncompleteUsers ? 'جاري الحذف...' : 'حذف الحسابات غير المكتملة'}
                  </button>
                </div>
              </div>
            )}

            {showIncompleteUsers && incompleteUsers.length > 0 && (
              <div className="rounded-2xl border border-dashed border-amber-300 bg-white overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-amber-100 text-amber-700 font-bold">
                      <th className="py-3 pr-4">الاسم</th>
                      <th className="py-3">رقم الجوال</th>
                      <th className="py-3 pl-4">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-50">
                    {incompleteUsers.map((usr) => {
                      const matchedReq = requests.find((r) => String(r.phone).trim() === String(usr.phone).trim());
                      const displayName = usr.fullName || matchedReq?.fullName || 'بدون اسم';
                      return (
                        <tr key={usr.phone}>
                          <td className="py-3 pr-4 font-bold text-slate-800">{displayName}</td>
                          <td className="py-3 font-mono text-slate-600" dir="ltr">{usr.phone}</td>
                          <td className="py-3 pl-4 text-amber-700 font-bold">بانتظار إكمال الحساب</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold">
                    <th className="pb-3 pr-2">#</th>
                    <th className="pb-3">اسم المستخدم وحالة الاتصال</th>
                    <th className="pb-3">رقم الجوال (اسم الدخول)</th>
                    <th className="pb-3">الدخول</th>
                    <th className="pb-3">الرتبة والصلاحيات</th>
                    <th className="pb-3">اللجنة المعينة ( لرئيس اللجنة )</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50 bg-rose-50/20">
                    <td className="py-4 pr-2 font-black text-slate-400">1</td>
                    <td className="py-4 font-black text-[#630517]">
                      عبدالعزيز سليمان العنزي (Admin)
                      <span className="block text-[10px] text-emerald-600 font-bold mt-0.5">🟢 متصل الآن</span>
                    </td>
                    <td className="py-4 text-slate-600 font-mono font-bold" dir="ltr">0553731265</td>
                    <td className="py-4">
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded">محمية في نظام الدخول</span>
                    </td>
                    <td className="py-4">
                      <span className="px-3 py-1 rounded-full bg-[#630517] text-[#F5D061] font-black text-[11px] inline-block" dir="ltr">
                        System Admin
                      </span>
                    </td>
                    <td className="py-4 text-slate-400 font-bold">إدارة كاملة للمنصة</td>
                  </tr>

                  {filteredAndSortedUsers.map((usr, idx) => {
                    const isOnline = usr.lastActive && (Date.now() - usr.lastActive < 4 * 60 * 1000);
                    const matchedReq = requests.find(r => String(r.phone).trim() === String(usr.phone).trim());
                    const displayName = usr.fullName || matchedReq?.fullName || 'مستخدم مسجل';

                    return (
                      <tr key={usr.phone || idx} className="hover:bg-slate-50">
                        <td className="py-4 pr-2 font-black text-slate-400">{idx + 2}</td>
                        <td className="py-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span>{displayName}</span>
                            <button
                              type="button"
                              onClick={() => openNameModal(usr.phone, displayName !== 'مستخدم مسجل' ? displayName : '')}
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
                            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded">
                              محمية في نظام الدخول
                            </span>
                            <button
                              type="button"
                              onClick={() => openPasswordModal(usr.phone)}
                              className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-lg font-bold hover:bg-amber-100 cursor-pointer shadow-sm transition-all"
                              title="تعيين كلمة مرور انتقالية"
                            >
                              ✏ كلمة مرور انتقالية
                            </button>
                          </div>
                        </td>
                        <td className="py-4">
                          <select
                            value={usr.role || 'عضو أساسي'}
                            onChange={(e) => handleRoleChange(usr.phone, e.target.value)}
                            className="px-3 py-1.5 rounded-xl border border-slate-300 font-bold text-xs bg-white text-slate-800"
                          >
                            <option value="System Admin">System Admin (مدير النظام)</option>
                            <option value="General Supervisor">General Supervisor (مشرف عام)</option>
                            <option value="رئيس النادي">رئيس النادي</option>
                            <option value="نائبة الرئيس">نائبة الرئيس</option>
                            <option value="رئيس لجنة">رئيس لجنة</option>
                            <option value="عضو مميز">عضو مميز</option>
                            <option value="الجندي الخفي">الجندي الخفي 🛡️</option>
                            <option value="عضو أساسي">عضو أساسي</option>
                          </select>
                        </td>
                        <td className="py-4">
                          {(usr.role?.includes('رئيس لجنة') || usr.role?.includes('مشرف')) ? (
                            <select
                              value={usr.assignedCommittee || 'لجنة الإعلام'}
                              onChange={(e) => handleAssignedCommitteeChange(usr.phone, e.target.value)}
                              className="px-3 py-1.5 rounded-xl border border-[#630517]/30 text-xs font-black text-[#630517] bg-[#630517]/5 shadow-sm focus:outline-none"
                            >
                              <option value="لجنة الإعلام">لجنة الإعلام</option>
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
              <p className="text-xs text-slate-500">الحد الأقصى 8 ميغابايت لكل ملف. الملفات تُرفع سحابياً ولا تُحفظ داخل فايرستور.</p>
              <form onSubmit={handleCreateNewDiscoverEvent} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">عنوان الفعالية الجديدة</label>
                  <input
                    type="text"
                    placeholder="مثال: حفل تدشين نادي كلية التمريض"
                    value={newDiscTitle}
                    onChange={(e) => setNewDiscTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#630517]"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">التصنيف</label>
                  <input
                    type="text"
                    placeholder="مثال: أنشطة كبرى, خدمة المجتمع"
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
                  <label className="text-xs font-bold text-slate-700">اختر صور وفيديوهات المعرض (الحد 8 ميغابايت لكل ملف)</label>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleSelectMultipleImagesForNewEvent}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white file:mr-4 file:py-1 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#630517] file:text-[#F5D061] cursor-pointer"
                  />
                  {newDiscFiles.length > 0 && (
                    <p className="text-xs font-bold text-emerald-600 mt-1">✅ تم اختيار {newDiscFiles.length} ملف: {newDiscFiles.map((f) => f.name).join('، ')}</p>
                  )}
                </div>
                <div className="sm:col-span-2 pt-2">
                  <button
                    type="submit"
                    disabled={isUploadingDiscover}
                    className="bg-[#630517] text-[#F5D061] px-8 py-3 rounded-xl font-black text-xs shadow hover:brightness-110 cursor-pointer disabled:opacity-50"
                  >
                    {uploadingLabel(isUploadingDiscover, cloudUploadProgress, '+ رفع ونشر الفعالية سحابياً للجميع 🚀')}
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
                  <p className="text-[11px] text-slate-500 font-bold">الحد 8 ميغابايت لكل ملف.</p>
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
                  <label className="text-xs font-bold text-slate-700">اختر صورة أو فيديو الشريحة من جهازك (الحد 8 ميغابايت)</label>
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
                  <label className="text-xs font-bold text-slate-600">اختر بوستر أو فيديو الفعالية (الحد 8 ميغابايت)</label>
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
            <div className="bg-white rounded-3xl p-8 border-2 border-[#630517]/20 shadow-sm space-y-5">
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900">بنرات الصفحة الترحيبية</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  أول بطاقة هي بنر NURSS الترحيبي اللي كان ثابتاً في الكود. غيّر صورته من هنا، وPink October بنر منفصل تقدر تحذفه أو تخليه معهم.
                </p>
              </div>
              {banners.length === 0 ? (
                <p className="text-xs text-slate-400 font-bold">ما فيه بنر مرفوع بعد، الرئيسية تعرض شعار NURSS الافتراضي إلى أن ترفع واحد.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {banners.map((ban) => (
                    <div key={ban.id} className="rounded-2xl border border-slate-200 p-4 space-y-3 bg-slate-50/70">
                      <img
                        src={ban.image || '/header-banner.png'}
                        alt={ban.title}
                        className="w-full h-36 object-contain rounded-xl bg-white border border-slate-100"
                      />
                      <p className="text-sm font-black text-slate-900">{ban.title}</p>
                      <p className="text-[11px] text-slate-500 font-bold">
                        {ban.id === WELCOME_BANNER_ID ? 'البنر الترحيبي الافتراضي (NURSS)' : ban.tag}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="px-3 py-1.5 rounded-lg bg-[#630517] text-[#F5D061] font-bold text-[11px] cursor-pointer">
                          تغيير الصورة
                          <input
                            type="file"
                            accept="image/*,video/*"
                            className="hidden"
                            disabled={welcomeReplacing}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                              const file = e.target.files?.[0];
                              e.target.value = '';
                              if (file) handleReplaceBannerImage(ban.id, file);
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => handleDeleteBanner(ban.id)}
                          className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 font-bold text-[11px] hover:bg-red-100 cursor-pointer"
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {welcomeReplacing ? (
                <p className="text-xs font-bold text-[#630517]">{uploadingLabel(true, welcomeReplaceProgress, 'جاري تغيير الصورة')}</p>
              ) : null}
            </div>

            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900">إضافة بنر إضافي (اختياري)</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  إذا تبي أكثر من بنر في الرئيسية يتبدلون تلقائياً، أضفهم من هنا.
                </p>
              </div>
              
              <form onSubmit={handleAddBanner} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">نص الشارة العلوية</label>
                  <input
                    type="text"
                    placeholder="مثال: Pink October"
                    value={bannerTag}
                    onChange={(e) => setBannerTag(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#630517]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">عنوان البانر الرئيسي</label>
                  <input
                    type="text"
                    placeholder="مثال: أسبوع سرطان الثدي"
                    value={bannerTitle}
                    onChange={(e) => setBannerTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#630517]"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-600">هوية العرض في الصفحة الرئيسية</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setBannerTheme('pink-october')}
                      className={`rounded-2xl border-2 p-4 text-right transition-all cursor-pointer ${
                        bannerTheme === 'pink-october'
                          ? 'border-pink-500 bg-pink-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-pink-200'
                      }`}
                    >
                      <p className="text-sm font-black text-pink-800">🎀 أسبوع سرطان الثدي</p>
                      <p className="text-[11px] text-pink-700/80 mt-1 leading-relaxed">خلفية وردية، الزر يفتح دراسة الحالة، والتصميم يأخذ الواجهة.</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBannerTheme('club')}
                      className={`rounded-2xl border-2 p-4 text-right transition-all cursor-pointer ${
                        bannerTheme === 'club'
                          ? 'border-[#630517] bg-rose-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-rose-200'
                      }`}
                    >
                      <p className="text-sm font-black text-[#630517]">نادي التمريض</p>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">الهوية البورغندي والذهبي الاعتيادية للترحيب العام.</p>
                    </button>
                  </div>
                </div>

                <label className="sm:col-span-2 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bannerCinematic}
                    onChange={(e) => setBannerCinematic(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[#9d174d]"
                  />
                  <span>
                    <span className="block text-xs font-black text-slate-800">عرض بانورامي يملأ الشاشة</span>
                    <span className="block text-[11px] text-slate-500 mt-0.5 leading-relaxed">موصى به لتصاميمك الجاهزة: الصورة هي البطلة، بدون عنوان ضخم فوقها يكرر النص.</span>
                  </span>
                </label>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-600">نص تحت البانر (اختياري)</label>
                  <textarea
                    rows={2}
                    placeholder="مثال: الكشف المبكر ينقذ الأرواح — انضمي لتحدي دراسة الحالة الوردي"
                    value={bannerDescription}
                    onChange={(e) => setBannerDescription(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#630517] resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">نص الزر (اختياري)</label>
                  <input
                    type="text"
                    placeholder={bannerTheme === 'pink-october' ? 'ابدئي التحدي الوردي' : 'اكتشف النادي'}
                    value={bannerButtonText}
                    onChange={(e) => setBannerButtonText(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#630517]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">رابط الزر (اختياري)</label>
                  <input
                    type="text"
                    placeholder={bannerTheme === 'pink-october' ? '/case-study' : '/discover'}
                    value={bannerButtonLink}
                    onChange={(e) => setBannerButtonLink(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#630517]"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-600">اختر صورة أو فيديو البانر (الحد 8 ميغابايت)</label>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      const file = e.target.files?.[0] || null;
                      if (file && isOverUploadLimit(file)) {
                        setBannerFile(null);
                        setModalMessage(uploadLimitMessage());
                        setModalType('success');
                        e.target.value = '';
                        return;
                      }
                      setBannerFile(file);
                    }}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white file:mr-4 file:py-1 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#630517] file:text-[#F5D061] cursor-pointer"
                  />
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={bannerUploading}
                    className="bg-[#630517] text-[#F5D061] px-8 py-3 rounded-xl font-bold text-xs shadow hover:brightness-110 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {uploadingLabel(bannerUploading, bannerUploadProgress, '+ إضافة وتفعيل البانر سحابياً')}
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
                      <th className="pb-3">الهوية</th>
                      <th className="pb-3 text-left pl-2">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {banners.map((ban) => (
                      <tr key={ban.id} className="hover:bg-slate-50">
                        <td className="py-4 pr-2 font-bold text-[#630517]">{ban.tag}</td>
                        <td className="py-4 text-slate-900 font-extrabold">{ban.title}</td>
                        <td className="py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                            ban.theme === 'pink-october' ? 'bg-pink-100 text-pink-800' : 'bg-rose-50 text-[#630517]'
                          }`}>
                            {ban.theme === 'pink-october' ? 'وردي' : 'النادي'}
                            {ban.cinematic !== false ? ' · بانوراما' : ''}
                          </span>
                        </td>
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
              <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    {editingPartnerId ? '✏️ تعديل بيانات شريك النجاح أو الراعي' : '🤝 إضافة شريك نجاح أو راعي جديد (سحابي)'}
                  </h3>
                  <p className="text-xs text-slate-500">قم بتعديل التصنيف، الروابط، أو شعار الشريك بكل مرونة في أي وقت.</p>
                </div>
                {editingPartnerId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPartnerId(null);
                      setPartnerName('');
                      setPartnerCategory('شريك إستراتيجي');
                      setPartnerLogo('/logo.png');
                      setPartnerWebsiteUrl('');
                      setPartnerOfferType('');
                      setPartnerOfferCode('');
                    }}
                    className="text-xs text-red-600 font-bold bg-red-50 px-3 py-1.5 rounded-xl hover:bg-red-100"
                  >
                    إلغاء التعديل ✕
                  </button>
                )}
              </div>
              
              <form onSubmit={handleSavePartner} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <option value="شريك إستراتيجي">شريك إستراتيجي 🌟</option>
                    <option value="راعي ذهبي">راعي ذهبي 🥇</option>
                    <option value="راعي فضي">راعي فضي 🥈</option>
                    <option value="راعي برونزي">راعي برونزي 🥉</option>
                    <option value="جهة داعمة">جهة داعمة 💎</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">نوع الخصم أو العرض</label>
                  <input
                    type="text"
                    placeholder="مثال: خصم 20% لطلاب النادي"
                    value={partnerOfferType}
                    onChange={(e) => setPartnerOfferType(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#630517]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">كود الخصم (اختياري)</label>
                  <input
                    type="text"
                    placeholder="مثال: NURS20"
                    value={partnerOfferCode}
                    onChange={(e) => setPartnerOfferCode(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 font-mono focus:outline-none focus:border-[#630517]"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-600">رابط الموقع أو السوشيال ميديا</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={partnerWebsiteUrl}
                    onChange={(e) => setPartnerWebsiteUrl(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 font-mono focus:outline-none focus:border-[#630517]"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-600">اختر شعار أو فيديو الشريك (الحد 8 ميغابايت)</label>
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
                    {editingPartnerId ? '💾 حفظ التعديلات وتحديث الشريك سحابياً' : '+ حفظ ونشر الشريك سحابياً'}
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xl font-black text-slate-900">الشركاء والرعاة الحاليون بالسحابة ({partners.length})</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {partners.map((p) => {
                  const isVideo = p.logo.startsWith('data:video') || p.logo.includes('.mp4');
                  return (
                    <div key={p.id} className="p-4 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-3 bg-slate-50 relative group">
                      <div className="flex items-center gap-3">
                        {isVideo ? (
                          <video src={p.logo} className="w-14 h-14 object-contain rounded-xl bg-white p-1 shadow-sm" />
                        ) : (
                          <img src={p.logo} alt={p.name} className="w-14 h-14 object-contain rounded-xl bg-white p-1 shadow-sm" />
                        )}
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-xs">{p.name}</h4>
                          <span className="text-[10px] text-[#630517] font-bold bg-[#630517]/10 px-2 py-0.5 rounded-md mt-1 inline-block">{p.category}</span>
                        </div>
                      </div>

                      {(p.offerType || p.offerCode) && (
                        <div className="text-[10px] space-y-1 bg-white rounded-xl p-2 border border-[#630517]/10">
                          {p.offerType && <p className="font-bold text-[#630517]">{p.offerType}</p>}
                          {p.offerCode && <p className="font-mono text-slate-700" dir="ltr">كود: {p.offerCode}</p>}
                        </div>
                      )}

                      {p.websiteUrl && (
                        <a 
                          href={p.websiteUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block text-[10px] text-sky-600 hover:underline font-mono truncate"
                          dir="ltr"
                        >
                          🔗 {p.websiteUrl}
                        </a>
                      )}

                      <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-xs">
                        <button
                          type="button"
                          onClick={() => handleEditPartnerClick(p)}
                          className="px-3 py-1 rounded-lg bg-sky-50 text-sky-700 font-bold hover:bg-sky-100 cursor-pointer"
                        >
                          تعديل ✏️
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePartner(p.id)}
                          className="px-3 py-1 rounded-lg bg-red-50 text-red-600 font-bold hover:bg-red-100 cursor-pointer"
                        >
                          حذف ✕
                        </button>
                      </div>
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
              <h3 className="text-base font-extrabold text-slate-900">اختر اللجنة لتعديل قادتها ورابط قروب الواتساب الخاص بها والأعضاء المنضمين</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'design', name: 'لجنة التصميم' },
                  { id: 'media', name: 'لجنة الإعلام' },
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
                <h3 className="text-xl font-black text-slate-900">إدارة قادة ورابط واتساب {currentCommittee.name}</h3>
                <span className="text-xs bg-[#630517]/10 text-[#630517] font-bold px-3 py-1 rounded-full">
                  {((currentCommittee.members || []).length + requests.filter(r => r.status === 'مقبول' && matchesCommittee(r.acceptedCommittee, currentCommittee.name)).length)} أعضاء
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

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-emerald-700">🔗 رابط قروب الواتساب التلقائي لهذه اللجنة</label>
                  <input
                    type="text"
                    placeholder="https://chat.whatsapp.com/..."
                    value={currentCommittee.whatsappLink || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCommittees(committees.map((c) => c.id === selectedCommitteeId ? { ...c, whatsappLink: val } : c));
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50/30 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 font-mono"
                    dir="ltr"
                  />
                  <span className="block text-[11px] text-slate-500">عند قبول أي طالب في هذه اللجنة، سيتم وضع هذا الرابط تلقائياً في رسالة القبول والإشعار! ✨</span>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="bg-[#630517] text-[#F5D061] px-6 py-3 rounded-xl font-black text-xs shadow hover:brightness-110 transition-all cursor-pointer"
                >
                  💾 حفظ وتحديث بيانات ورابط اللجنة
                </button>
              </div>
            </form>

            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
              <h4 className="font-extrabold text-slate-900 text-sm">قائمة الأعضاء المنضمين للجنة</h4>
              
              {(() => {
                const manualMembers = currentCommittee.members || [];
                const acceptedFromRequests = requests
                  .filter(r => r.status === 'مقبول' && matchesCommittee(r.acceptedCommittee, currentCommittee.name))
                  .map(r => ({
                    name: r.fullName,
                    role: r.major || 'عضو منضم',
                    status: 'نشط (مقبول رسمي)',
                    phone: r.phone || ''
                  }));

                const allCombinedMembers = [...manualMembers];
                acceptedFromRequests.forEach(acc => {
                  if (!allCombinedMembers.some(m => m.name === acc.name)) {
                    allCombinedMembers.push(acc);
                  }
                });

                if (allCombinedMembers.length === 0) {
                  return <p className="text-xs text-slate-400 py-4 text-center bg-slate-50 rounded-2xl">لا يوجد أعضاء في هذه اللجنة حتى الآن.</p>;
                }

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 font-bold">
                          <th className="pb-2 pr-2">اسم العضو</th>
                          <th className="pb-2">الدور أو التخصص</th>
                          <th className="pb-2">رقم الجوال</th>
                          <th className="pb-2 text-left pl-2">إجراء</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {allCombinedMembers.map((m, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-3 pr-2 font-bold text-slate-900">👤 {m.name}</td>
                            <td className="py-3 text-slate-600">{m.role}</td>
                            <td className="py-3 text-slate-500 font-mono" dir="ltr">{m.phone || 'غير متوفر'}</td>
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
                );
              })()}

              <form onSubmit={handleAddMemberSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100">
                <input
                  type="text"
                  placeholder="اسم العضو الجديد يدوياً"
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
                  + إضافة عضو يدوياً وحفظه
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
                <p className="text-xs text-emerald-700">ارفع ملف الردود لجلب جميع الطلاب الجدد وتاريخ التقديم الأصلي تماماً كما ورد في الأكسل!</p>
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
                  ✅ المقبولون ({requests.filter(r => r.status === 'مقبول').length})
                </button>
                <button
                  type="button"
                  onClick={() => setRequestSubTab('pending')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${requestSubTab === 'pending' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  ⏳ المعلقون ({requests.filter(r => r.status === 'معلق' || !r.status || r.status === 'قيد المراجعة').length})
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

              <div className="flex items-center gap-3 flex-wrap">
                <input
                  type="text"
                  placeholder="🔍 ابحث بالاسم أو رقم الجوال..."
                  value={requestSearchQuery}
                  onChange={(e) => setRequestSearchQuery(e.target.value)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50 focus:outline-none focus:border-[#630517] w-60"
                />

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
            </div>

            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-xl font-black text-slate-900">
                طلبات انضمام الأعضاء ({filteredRequests.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold">
                      <th className="pb-3 pr-2">اسم المتقدم</th>
                      <th className="pb-3">الرقم الجامعي / المستوى</th>
                      <th className="pb-3">وقت وتاريخ التقديم (من الأكسل)</th>
                      <th className="pb-3">الرغبات الثلاث</th>
                      <th className="pb-3">الحالة واللجنة</th>
                      <th className="pb-3 text-left pl-2">الإجراءات والتحويل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRequests.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">لا توجد طلبات تطابق هذا البحث أو الفرز حالياً.</td>
                      </tr>
                    ) : (
                      filteredRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50">
                          <td className="py-4 pr-2 font-bold text-slate-900">
                            👤 {req.fullName}
                            <span className="block text-[10px] text-slate-500 font-mono mt-0.5">📞 {req.phone || 'غير متوفر'}</span>
                          </td>
                          <td className="py-4 text-slate-600 font-mono" dir="ltr">
                            {req.universityId || 'غير متوفر'}
                            <span className="block text-[10px] text-slate-500 font-sans">{req.major || 'تمريض'}</span>
                          </td>
                          <td className="py-4 text-slate-500 font-mono text-[11px]">
                            {req.submittedAt || 'غير محدد'}
                          </td>
                          <td className="py-4 text-slate-700 font-medium">
                            <div className="space-y-0.5 text-[11px]">
                              <p className="font-bold text-slate-900">1️⃣ {req.firstChoice || 'غير محدد'}</p>
                              <p className="text-slate-500">2️⃣ {req.secondChoice || 'غير محدد'}</p>
                              <p className="text-slate-400">3️⃣ {req.thirdChoice || 'غير محدد'}</p>
                            </div>
                          </td>
                          <td className="py-4">
                            <span className={`px-2.5 py-1 rounded-full font-bold text-[11px] ${
                              req.status === 'مقبول' ? 'bg-emerald-100 text-emerald-800' :
                              req.status === 'مرفوض' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {req.status || 'معلق'}
                            </span>
                            {req.acceptedCommittee && (
                              <span className="block text-[10px] font-bold text-emerald-700 mt-1">
                                📍 {req.acceptedCommittee}
                              </span>
                            )}
                          </td>
                          <td className="py-4 text-left pl-2 flex items-center justify-end gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => openAcceptModal(req.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 cursor-pointer text-[11px]"
                            >
                              قبول ✅
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectRequest(req.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 font-bold hover:bg-red-100 cursor-pointer text-[11px]"
                            >
                              رفض ✕
                            </button>
                            <button
                              type="button"
                              onClick={() => openManualShiftModal(req)}
                              className="px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100 cursor-pointer text-[11px]"
                            >
                              تحويل 🔄
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRequest(req.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-red-600 font-bold hover:bg-slate-200 cursor-pointer text-[11px]"
                            >
                              حذف 🗑️
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

      {/* Modal القبول والتسجيل باللجنة */}
      {showAcceptModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-black text-slate-900">تأكيد قبول الطالب وتحديد اللجان ورابط الواتساب</h3>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 block">اختر اللجنة النهائية المقبول بها:</label>
              <select
                value={acceptedCommittee}
                onChange={(e) => handleCommitteeSelectChange(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:border-[#630517]"
              >
                {committeeNamesList.map((c, i) => (
                  <option key={i} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 block">رابط قروب الواتساب للجنة (يُجلب تلقائياً):</label>
              <input
                type="text"
                placeholder="https://chat.whatsapp.com/..."
                value={whatsappLink}
                onChange={(e) => setWhatsappLink(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white font-mono focus:outline-none focus:border-[#630517]"
                dir="ltr"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setShowAcceptModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs hover:bg-slate-200 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmAcceptRequest}
                className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-black text-xs shadow hover:bg-emerald-700 cursor-pointer"
              >
                تأكيد القبول 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal التحويل اليدوي للرغبة الأولى */}
      {showShiftModal && selectedReqForShift && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-black text-slate-900">تحويل رغبة الطالب إلى لجنة أخرى 🔄</h3>
            <p className="text-xs text-slate-500">الطالب: <strong className="text-slate-800">{selectedReqForShift.fullName}</strong></p>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 block">اختر اللجنة الجديدة (لتصبح الرغبة الأولى):</label>
              <select
                value={targetShiftCommittee}
                onChange={(e) => setTargetShiftCommittee(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:border-[#630517]"
              >
                {committeeNamesList.map((c, i) => (
                  <option key={i} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setShowShiftModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs hover:bg-slate-200 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmManualShift}
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-black text-xs shadow hover:bg-indigo-700 cursor-pointer"
              >
                تأكيد التحويل 🔄
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal إرسال الإنذار للقادة */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-black text-amber-900">⚠️ صياغة وإرسال إنذار لقادة لجنة {warningTargetCommittee}</h3>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 block">نص الرسالة التحذيرية:</label>
              <textarea
                rows={4}
                value={warningMessageText}
                onChange={(e) => setWarningMessageText(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:border-amber-600 leading-relaxed"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setShowWarningModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs hover:bg-slate-200 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSendWarningToLeaders}
                className="px-5 py-2 rounded-xl bg-amber-600 text-white font-black text-xs shadow hover:bg-amber-700 cursor-pointer"
              >
                إرسال الإنذار الآن 📨
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals الإدخال، التنبيهات، والتأكيد العامة */}
      {modalType === 'password' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={submitUpdatePassword} className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-black text-slate-900">تعديل كلمة المرور للمستخدم</h3>
            <p className="text-xs text-slate-500 font-mono">رقم الجوال: {activeUserPhoneForAction}</p>
            <input
              type="text"
              placeholder="كلمة المرور الجديدة..."
              value={modalInputVal}
              onChange={(e) => setModalInputVal(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50 focus:outline-none focus:border-[#630517] font-mono"
              required
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalType('none')}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs hover:bg-slate-200 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#630517] text-[#F5D061] font-black text-xs shadow hover:brightness-110 cursor-pointer"
              >
                حفظ كلمة المرور 🔒
              </button>
            </div>
          </form>
        </div>
      )}

      {modalType === 'name' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={submitUpdateName} className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-black text-slate-900">تعديل الاسم الكامل للمستخدم</h3>
            <p className="text-xs text-slate-500 font-mono">رقم الجوال: {activeUserPhoneForAction}</p>
            <input
              type="text"
              placeholder="الاسم الكامل الثلاثي/الرباعي..."
              value={modalInputVal}
              onChange={(e) => setModalInputVal(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50 focus:outline-none focus:border-[#630517]"
              required
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalType('none')}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs hover:bg-slate-200 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#630517] text-[#F5D061] font-black text-xs shadow hover:brightness-110 cursor-pointer"
              >
                حفظ الاسم 👤
              </button>
            </div>
          </form>
        </div>
      )}

      {modalType === 'phone' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={submitUpdatePhone} className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-black text-slate-900">تعديل رقم الجوال للمستخدم</h3>
            <p className="text-xs text-slate-500 font-mono">الرقم الحالي: {activeUserPhoneForAction}</p>
            <input
              type="text"
              placeholder="رقم الجوال الجديد..."
              value={modalInputVal}
              onChange={(e) => setModalInputVal(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50 focus:outline-none focus:border-[#630517] font-mono"
              required
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalType('none')}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs hover:bg-slate-200 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#630517] text-[#F5D061] font-black text-xs shadow hover:brightness-110 cursor-pointer"
              >
                حفظ رقم الجوال 📱
              </button>
            </div>
          </form>
        </div>
      )}

      {modalType === 'success' && (
        <ClubNoticeDialog
          kind={inferNoticeKind(modalMessage)}
          message={modalMessage}
          onClose={() => setModalType('none')}
        />
      )}

      {modalType === 'confirm' && (
        <ClubNoticeDialog
          kind="confirm"
          message={modalMessage}
          onClose={() => setModalType('none')}
          onConfirm={() => {
            if (confirmActionCallback) confirmActionCallback();
            setModalType('none');
          }}
        />
      )}

    </main>
  );
}