'use client';

import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, getDoc, addDoc, deleteDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';

export default function CommitteeDashboard() {
  const router = useRouter();
  const [userPhone, setUserPhone] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [whatsappLink, setWhatsappLink] = useState('');
  const [allUsersList, setAllUsersList] = useState<any[]>([]);

  // هل المستخدم من لجنة الجودة والتطوير؟
  const [isQualityTeam, setIsQualityTeam] = useState(false);
  // هل المستخدم قائد للجنة أم عضو عادي؟ (لتحديد مستوى العرض والخصوصية)
  const [isCommitteeLeader, setIsCommitteeLeader] = useState(false);

  const [allCommitteesList] = useState<string[]>([
    'لجنة التصميم',
    'لجنة الاعلام',
    'لجنة تنظيم الفعاليات',
    'لجنة الموارد البشرية',
    'لجنة العلاقات العامة',
    'لجنة المحتوى العلمي',
    'لجنة الجودة والتطوير'
  ]);
  const [selectedMonitoredCommittee, setSelectedMonitoredCommittee] = useState<string>('لجنة التصميم');
  const [selectedManagedCommittee, setSelectedManagedCommittee] = useState<string>('لجنة تنظيم الفعاليات');
  const [preferenceFilterTab, setPreferenceFilterTab] = useState<'pref-1' | 'pref-2' | 'pref-3'>('pref-1');

  // الإشعارات والتعاميم
  const [announcementText, setAnnouncementText] = useState('');
  const [leaderCustomAlert, setLeaderCustomAlert] = useState('⚠️ تنبيه غرفة العمليات: يُرجى إنجاز كافة المهام المعلقة بالفعاليات بدقة ومراعاة المواعيد النهائية.');
  
  // نظام المهام المتعددة (Checklist)
  const [eventTitle, setEventTitle] = useState(''); 
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskInputText, setTaskInputText] = useState('');
  const [tasksListBuffer, setTasksListBuffer] = useState<string[]>([]);
  const [committeeTasks, setCommitteeTasks] = useState<any[]>([]);
  const [targetCommitteeForTask, setTargetCommitteeForTask] = useState<string>('لجنة التصميم');

  // نافذة التقارير والإنذارات
  const [escalatedReports, setEscalatedReports] = useState<any[]>([]);
  const [showReportsModal, setShowReportsModal] = useState(false);

  // أرشيف التقارير التاريخية
  const [qualityArchives, setQualityArchives] = useState<any[]>([]);
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  // نظام الإنذار المتدرج
  const [warningReason, setWarningReason] = useState('');
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [targetCommitteeForWarning, setTargetCommitteeForWarning] = useState('');
  const [warningStepType, setWarningStepType] = useState<'warn-leaders' | 'escalate-presidents'>('warn-leaders');

  // حالات الرد والتبرير الخاصة بالقائد المنذَر
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [activeReportToReply, setActiveReportToReply] = useState<any>(null);
  const [leaderDefenseReply, setLeaderDefenseReply] = useState('');

  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);

  // حالة إخفاء الإنذار محلياً وسحابياً لضمان عدم ظهوره بعد حذفه
  const [warningHidden, setWarningHidden] = useState(false);

  // حالات خاصة بلجنة الإعلام (رفع الصور ومقاطع الفيديو فقط)
  const [mediaTitle, setMediaTitle] = useState('');
  const [mediaCategory, setMediaCategory] = useState('تغطية فعالية');
  const [mediaBase64, setMediaBase64] = useState('/header-banner.png');
  const [mediaGallery, setMediaGallery] = useState<any[]>([]);

  // حالات خاصة بلجنة المحتوى العلمي (بنك صياغة النصوص الطبية والبنرات)
  const [textBannerTitle, setTextBannerTitle] = useState('');
  const [textBannerContent, setTextBannerContent] = useState('');
  const [scientificTextsList, setScientificTextsList] = useState<any[]>([]);

  // نظام الاعتذارات المباشر (بدون موافقة معقدة - إرسال فوري للموارد البشرية)
  const [eventExcuses, setEventExcuses] = useState<any[]>([]);
  const [showExcuseForm, setShowExcuseForm] = useState(false);
  const [excuseEventName, setExcuseEventName] = useState('');
  const [excuseEventDate, setExcuseEventDate] = useState('');
  const [excuseReason, setExcuseReason] = useState('');

  useEffect(() => {
    const phone = localStorage.getItem('userPhone');
    if (!phone) {
      alert('الرجاء تسجيل الدخول أولاً.');
      router.push('/login');
      return;
    }
    setUserPhone(phone);
    fetchLeaderData(phone);
    fetchEscalatedReports();
    fetchCommitteeTasks();
    fetchAllUsers();
    fetchQualityArchives();
    fetchMediaGallery();
    fetchScientificTexts();
    fetchEventExcuses();

    const isHiddenLocally = localStorage.getItem(`warning_hidden_${phone}`);
    if (isHiddenLocally === 'true') {
      setWarningHidden(true);
    }
  }, [router]);

  const fetchLeaderData = async (phone: string) => {
    try {
      const userRef = doc(db, 'users', phone);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        router.push('/login');
        return;
      }

      const uData = userSnap.data();
      setUserData(uData);
      
      if (uData.warningHidden) {
        setWarningHidden(true);
      }

      if (uData.latestNotification && !uData.warningHidden) {
        setLeaderCustomAlert(uData.latestNotification);
      }

      if (phone === '0553731265' || uData.role === 'System Admin' || uData.role === 'General Supervisor') {
        router.push('/admin');
        return;
      }

      const assigned = uData.assignedCommittee || uData.committee || '';
      const roleStr = uData.role || '';

      // التحقق هل المستخدم قائد للجنة أم عضو عادي
      if (roleStr.includes('رئيس') || roleStr.includes('مشرف') || roleStr.includes('قائد')) {
        setIsCommitteeLeader(true);
      } else {
        setIsCommitteeLeader(false);
      }

      if (roleStr.includes('جودة') || assigned.includes('جودة') || assigned.includes('الجودة')) {
        setIsQualityTeam(true);
        setIsCommitteeLeader(true);
      } else {
        setIsQualityTeam(false);
        setSelectedManagedCommittee(assigned || 'لجنة تنظيم الفعاليات');
        setSelectedMonitoredCommittee(assigned || 'لجنة تنظيم الفعاليات');
        setTargetCommitteeForTask(assigned || 'لجنة تنظيم الفعاليات');
      }

      const reqSnap = await getDocs(collection(db, 'applications'));
      const allReqs = reqSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRequests(allReqs);

      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllUsersList(users);
    } catch (e) { console.error(e); }
  };

  const fetchEscalatedReports = async () => {
    try {
      const snap = await getDocs(collection(db, 'escalated_reports'));
      setEscalatedReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
  };

  const fetchCommitteeTasks = async () => {
    try {
      const snap = await getDocs(collection(db, 'committee_tasks'));
      setCommitteeTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
  };

  const fetchQualityArchives = async () => {
    try {
      const snap = await getDocs(collection(db, 'quality_reports_archive'));
      setQualityArchives(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
  };

  const fetchMediaGallery = async () => {
    try {
      const snap = await getDocs(collection(db, 'media_committee_gallery'));
      setMediaGallery(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
  };

  const fetchScientificTexts = async () => {
    try {
      const snap = await getDocs(collection(db, 'scientific_committee_texts'));
      setScientificTextsList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
  };

  const fetchEventExcuses = async () => {
    try {
      const snap = await getDocs(collection(db, 'event_excuses'));
      setEventExcuses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleUploadMediaSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!mediaTitle.trim()) return;
    const mediaId = `media_${Date.now()}`;
    const newObj = {
      id: mediaId,
      title: mediaTitle.trim(),
      category: mediaCategory,
      imageUrl: mediaBase64,
      createdAt: new Date().toLocaleDateString('ar-SA')
    };
    try {
      await addDoc(collection(db, 'media_committee_gallery'), newObj);
      setMediaGallery([newObj, ...mediaGallery]);
      setMediaTitle('');
      setMediaBase64('/header-banner.png');

      for (const usr of allUsersList) {
        const cStr = usr.assignedCommittee || usr.committee || '';
        if (cStr.includes('التصميم') || cStr.includes('الاعلام') || usr.role?.includes('رئيس') || usr.role === 'System Admin') {
          try {
            await updateDoc(doc(db, 'users', usr.id), {
              latestNotification: `📸 [تحديث إعلامي جديد]: أضافت لجنة الإعلام مادة جديدة (${mediaTitle})`
            });
          } catch (er) { console.error(er); }
        }
      }

      alert('تم رفع ونشر المادة الإعلامية سحابياً لتصل للأدمن والرؤساء بنجاح! 📸🚀');
    } catch (err) { console.error(err); }
  };

  const handleDeleteMedia = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذه المادة؟')) {
      await deleteDoc(doc(db, 'media_committee_gallery', id));
      setMediaGallery(mediaGallery.filter(m => m.id !== id));
    }
  };

  const handleAddScientificTextSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!textBannerTitle.trim() || !textBannerContent.trim()) return;
    const textId = `txt_${Date.now()}`;
    const newTextObj = {
      id: textId,
      title: textBannerTitle.trim(),
      content: textBannerContent.trim(),
      author: userData?.fullName || 'لجنة المحتوى العلمي',
      createdAt: new Date().toLocaleDateString('ar-SA')
    };
    try {
      await addDoc(collection(db, 'scientific_committee_texts'), newTextObj);
      setScientificTextsList([newTextObj, ...scientificTextsList]);

      for (const usr of allUsersList) {
        const cStr = usr.assignedCommittee || usr.committee || '';
        if (cStr.includes('التصميم') || usr.role?.includes('رئيس') || usr.role === 'System Admin') {
          try {
            await updateDoc(doc(db, 'users', usr.id), {
              latestNotification: `🔬 [محتوى علمي جديد موجه للبنرات والتصميم]: "${textBannerTitle}" - النص: ${textBannerContent}`
            });
          } catch (er) { console.error(er); }
        }
      }

      setTextBannerTitle('');
      setTextBannerContent('');
      alert('تم اعتماد ونشر النص وعرضه مباشرة للجنة التصميم وإرساله لمكتب الرؤساء والأدمن بنجاح! 🔬✨');
    } catch (err) { console.error(err); }
  };

  const handleDeleteScientificText = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا النص؟')) {
      await deleteDoc(doc(db, 'scientific_committee_texts', id));
      setScientificTextsList(scientificTextsList.filter(t => t.id !== id));
    }
  };

  // إرسال الاعتذار بشكل مباشر للموارد البشرية كإشعار إفادة بعدم المشاركة (بدون موافقة رسمية مقيدة)
  const handleSubmitExcuse = async (e: FormEvent) => {
    e.preventDefault();
    if (!excuseEventName.trim() || !excuseReason.trim()) return;

    const currentComm = userData?.assignedCommittee || userData?.committee || 'اللجنة الخاصة';
    const newExcuseObj = {
      memberName: userData?.fullName || 'عضو اللجنة',
      committee: currentComm,
      eventName: excuseEventName.trim(),
      eventDate: excuseEventDate || 'غير محدد',
      reason: excuseReason.trim(),
      status: 'تم إفادة الموارد البشرية (اعتذار عدم مشاركة)',
      createdAt: Date.now()
    };

    try {
      const docRef = await addDoc(collection(db, 'event_excuses'), newExcuseObj);
      setEventExcuses([{ id: docRef.id, ...newExcuseObj }, ...eventExcuses]);

      for (const usr of allUsersList) {
        const cStr = usr.assignedCommittee || usr.committee || '';
        if (cStr.includes('الموارد البشرية') || usr.role?.includes('رئيس') || usr.role === 'System Admin') {
          try {
            await updateDoc(doc(db, 'users', usr.id), {
              latestNotification: `ℹ️ [إفادة اعتذار عدم مشاركة]: أفاد الزميل (${userData?.fullName || 'عضو'}) بعدم مشاركته في فعالية (${excuseEventName}).`
            });
          } catch (er) { console.error(er); }
        }
      }

      setExcuseEventName('');
      setExcuseEventDate('');
      setExcuseReason('');
      setShowExcuseForm(false);
      alert('تم إرسال إفادة الاعتذار وعدم المشاركة للموارد البشرية وسجلت بنجاح بدون تعقيد! 👍');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء إرسال الاعتذار.');
    }
  };

  const matchesTargetCommittee = (choiceStr: string, targetComm: string) => {
    if (!choiceStr) return false;
    const cleanChoice = choiceStr.replace(/الـ/g, '').replace(/إ/g, 'ا').replace(/أ/g, 'ا').replace(/آ/g, 'ا').trim();
    const cleanTarget = targetComm.replace(/الـ/g, '').replace(/إ/g, 'ا').replace(/أ/g, 'ا').replace(/آ/g, 'ا').trim();
    
    if (cleanChoice.includes('اعلام') && cleanTarget.includes('اعلام')) return true;
    if (cleanChoice.includes('تصميم') && cleanTarget.includes('تصميم')) return true;
    if (cleanChoice.includes('فعاليات') && cleanTarget.includes('فعاليات')) return true;
    if (cleanChoice.includes('موارد') && cleanTarget.includes('موارد')) return true;
    if (cleanChoice.includes('علاقات') && cleanTarget.includes('علاقات')) return true;
    if (cleanChoice.includes('علمي') && cleanTarget.includes('علمي')) return true;
    if (cleanChoice.includes('جودة') && cleanTarget.includes('جودة')) return true;

    return choiceStr.includes(targetComm) || targetComm.includes(choiceStr);
  };

  const currentActiveComm = isQualityTeam ? selectedMonitoredCommittee : selectedManagedCommittee;
  const filteredRequests = (requests || []).filter(req => {
    const targetKey = preferenceFilterTab === 'pref-1' ? 'firstChoice' : preferenceFilterTab === 'pref-2' ? 'secondChoice' : 'thirdChoice';
    const choiceValue = req[targetKey] || '';
    return matchesTargetCommittee(choiceValue, currentActiveComm) || req.acceptedCommittee === currentActiveComm;
  });

  const transferredRequestsList = (requests || []).filter(req => req.transferredToHR === true || req.status === 'محول للموارد البشرية');

  const totalApplicantsCount = requests.filter(r => matchesTargetCommittee(r.firstChoice, currentActiveComm) || matchesTargetCommittee(r.secondChoice, currentActiveComm) || matchesTargetCommittee(r.thirdChoice, currentActiveComm)).length;
  const acceptedMembersCount = requests.filter(r => r.acceptedCommittee === currentActiveComm || r.status === 'مقبول').length;

  const handleAcceptSubmit = async () => {
    if (!selectedReqId) return;
    try {
      const targetReq = requests.find(r => r.id === selectedReqId);
      const docRef = doc(db, 'applications', selectedReqId);
      await updateDoc(docRef, {
        status: 'مقبول',
        acceptedCommittee: currentActiveComm,
        whatsappLink: whatsappLink,
        latestNotification: `مبروك! تم قبولك رسمياً في (${currentActiveComm}) 🎉. انضم لقروب الواتساب: ${whatsappLink}`
      });

      if (targetReq?.phone) {
        try {
          const userDocRef = doc(db, 'users', targetReq.phone);
          await updateDoc(userDocRef, {
            latestNotification: `🎉 مبارك القبول النهائي في (${currentActiveComm})!`
          });
        } catch (e) { console.error(e); }
      }

      setRequests((requests || []).map(r => r.id === selectedReqId ? { ...r, status: 'مقبول', acceptedCommittee: currentActiveComm, whatsappLink } : r));
      setShowAcceptModal(false);
      setWhatsappLink('');
      alert(`تم قبول المتقدم في (${currentActiveComm}) بنجاح! 🎉`);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء قبول الطلب.');
    }
  };

  const handleReject = async (id: string) => {
    if (confirm('هل أنت متأكد من رفض الطلب؟')) {
      try {
        const docRef = doc(db, 'applications', id);
        await updateDoc(docRef, { status: 'مرفوض' });
        setRequests((requests || []).map(r => r.id === id ? { ...r, status: 'مرفوض' } : r));
      } catch (err) { console.error(err); }
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
      thirdChoice: f1 || f2 || f3,
      transferredToHR: true,
      status: 'محول للموارد البشرية'
    };

    try {
      const docRef = doc(db, 'applications', req.id);
      await updateDoc(docRef, {
        firstChoice: updatedObj.firstChoice,
        secondChoice: updatedObj.secondChoice,
        thirdChoice: updatedObj.thirdChoice,
        transferredToHR: true,
        status: 'محول للموارد البشرية'
      });
      setRequests((requests || []).map(r => r.id === req.id ? updatedObj : r));
      alert('تم تحويل الطالب إلى لجنة الموارد البشرية لمراجعة قبوله على الرغبة الثانية أو الثالثة بنجاح! 🔄');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء تحويل رغبة الطالب.');
    }
  };

  const handleSendBroadcastAnnouncement = async (e: FormEvent) => {
    e.preventDefault();
    if (!announcementText.trim()) return;

    try {
      const targetComm = currentActiveComm;
      const acceptedList = requests.filter(r => r.acceptedCommittee === targetComm || r.status === 'مقبول');
      for (const mem of acceptedList) {
        if (mem.phone) {
          const uRef = doc(db, 'users', mem.phone);
          await updateDoc(uRef, {
            latestNotification: `📢 تعميم من رئيس ${targetComm}: ${announcementText}`
          });
        }
      }
      alert('تم إرسال التعميم والإشعار لجميع أعضاء اللجنة بنجاح! 🚀');
      setAnnouncementText('');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء إرسال التعميم.');
    }
  };

  const handleAddTaskToBuffer = () => {
    if (!taskInputText.trim()) return;
    setTasksListBuffer([...tasksListBuffer, taskInputText.trim()]);
    setTaskInputText('');
  };

  const handleRemoveTaskFromBuffer = (index: number) => {
    setTasksListBuffer(tasksListBuffer.filter((_, idx) => idx !== index));
  };

  const handlePublishTasksList = async (e: FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim() || tasksListBuffer.length === 0) {
      alert('الرجاء إدخال عنوان الفعالية وإضافة مهمة واحدة على الأقل في القائمة.');
      return;
    }

    try {
      const targetComm = isQualityTeam ? targetCommitteeForTask : currentActiveComm;
      const formattedSubTasks = tasksListBuffer.map(taskText => ({
        text: taskText,
        completed: false,
        completedBy: ''
      }));

      const newTaskObj = {
        committee: targetComm,
        eventTitle: eventTitle,
        subTasks: formattedSubTasks,
        dueDate: taskDueDate || 'محدد قريباً',
        createdAt: Date.now()
      };

      const docRef = await addDoc(collection(db, 'committee_tasks'), newTaskObj);
      setCommitteeTasks([{ id: docRef.id, ...newTaskObj }, ...committeeTasks]);

      const acceptedList = requests.filter(r => r.acceptedCommittee === targetComm || r.status === 'مقبول');
      for (const mem of acceptedList) {
        if (mem.phone) {
          const uRef = doc(db, 'users', mem.phone);
          await updateDoc(uRef, {
            latestNotification: `⚡ [مهام جديدة لفعالية: ${eventTitle}] تم إسناد ${tasksListBuffer.length} مهام جديدة للجنة (${targetComm}).`
          });
        }
      }

      alert(`تم نشر قائمة المهام المتعددة للجنة (${targetComm}) بنجاح تام! 🎯`);
      setEventTitle('');
      setTaskDueDate('');
      setTasksListBuffer([]);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء رفع القائمة.');
    }
  };

  const handleToggleSubTask = async (taskId: string, subTaskIdx: number) => {
    try {
      const taskItem = committeeTasks.find(t => t.id === taskId);
      if (!taskItem) return;

      const updatedSubTasks = [...taskItem.subTasks];
      const isNowCompleted = !updatedSubTasks[subTaskIdx].completed;
      updatedSubTasks[subTaskIdx].completed = isNowCompleted;
      updatedSubTasks[subTaskIdx].completedBy = isNowCompleted ? (userData?.fullName || 'عضو نشط') : '';

      const taskRef = doc(db, 'committee_tasks', taskId);
      await updateDoc(taskRef, { subTasks: updatedSubTasks });

      setCommitteeTasks(committeeTasks.map(t => t.id === taskId ? { ...t, subTasks: updatedSubTasks } : t));
    } catch (e) { console.error(e); }
  };

  const handleDeleteTaskGroup = async (taskId: string) => {
    if (confirm('هل أنت متأكد من حذف قائمة المهام هذه نهائياً؟')) {
      try {
        await deleteDoc(doc(db, 'committee_tasks', taskId));
        setCommitteeTasks(committeeTasks.filter(t => t.id !== taskId));
      } catch (e) { console.error(e); }
    }
  };

  const handleExecuteWarningOrEscalation = async () => {
    if (!warningReason.trim()) {
      alert('الرجاء كتابة تفاصيل الإنذار أو التقصير بوضوح.');
      return;
    }

    try {
      const alertMsg = warningStepType === 'warn-leaders' 
        ? `⚠️ [إنذار رسمي من الجودة للجنة ${targetCommitteeForWarning}]: ${warningReason} (يُرجى إرسال الرد والتبرير خلال 24 ساعة)`
        : `🚨 [تصعيد عاجل للرؤساء ضد لجنة ${targetCommitteeForWarning}]: ${warningReason}`;

      for (const usr of allUsersList) {
        const commStr = usr.assignedCommittee || usr.committee || '';
        if (matchesTargetCommittee(commStr, targetCommitteeForWarning) || usr.role?.includes('رئيس')) {
          try {
            await updateDoc(doc(db, 'users', usr.id), {
              latestNotification: alertMsg,
              warningHidden: false
            });
          } catch (er) { console.error(er); }
        }
      }

      if (warningStepType === 'warn-leaders') {
        await addDoc(collection(db, 'escalated_reports'), {
          targetCommittee: targetCommitteeForWarning,
          reporter: userData?.fullName || 'لجنة الجودة والتطوير',
          reason: warningReason,
          status: '⚠️ تم إرسال إنذار للقادة (بانتظار الرد خلال 24 ساعة)',
          leaderDefenseReply: '',
          warningSentAt: Date.now(),
          createdAt: Date.now()
        });
        alert(`📨 [تم إرسال الإنذار وتنبيه اللجنة]: تم توجيه إنذار تحذيري رسمي لقائد وقائدة (${targetCommitteeForWarning}) وإرسال الإشعار لحساباتهم.`);
      } else {
        await addDoc(collection(db, 'escalated_reports'), {
          targetCommittee: targetCommitteeForWarning,
          reporter: userData?.fullName || 'لجنة الجودة والتطوير',
          reason: `[عدم تجاوب مع الإنذار السابق]: ${warningReason}`,
          status: '🚨 مُحال رسمياً للرئيس ورئيسة النادي (لعدم التجاوب والتأديب)',
          leaderDefenseReply: '',
          escalatedAt: Date.now(),
          createdAt: Date.now()
        });
        alert(`⚖️ [تم التصعيد النهائي للرؤساء وتنبيههم]: تم إحالة البلاغ رسمياً لمكتب رئيس ورئيسة النادي.`);
      }

      setShowWarningModal(false);
      setWarningReason('');
      setWarningHidden(false);
      fetchEscalatedReports();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء إرسال البلاغ.');
    }
  };

  const handleSubmitLeaderReply = async () => {
    if (!leaderDefenseReply.trim() || !activeReportToReply) {
      alert('الرجاء كتابة نص التبرير أو الرد أولاً.');
      return;
    }

    try {
      const reportRef = doc(db, 'escalated_reports', activeReportToReply.id);
      await updateDoc(reportRef, {
        leaderDefenseReply: leaderDefenseReply,
        status: `💬 تم استلام رد وتبرير اللجنة (بانتظار اعتماد الجودة)`
      });

      alert('تم إرسال ردك وتبريرك لجنتة الجودة بنجاح! 🎯');
      setShowReplyModal(false);
      setLeaderDefenseReply('');
      setActiveReportToReply(null);
      fetchEscalatedReports();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء إرسال الرد.');
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (confirm('هل أنت متأكد من حذف هذا البلاغ التجريبي؟')) {
      try {
        await deleteDoc(doc(db, 'escalated_reports', reportId));
        setEscalatedReports(escalatedReports.filter(r => r.id !== reportId));
        alert('تم حذف البلاغ بنجاح 🗑️');
      } catch (e) { console.error(e); }
    }
  };

  const handleExportCommitteeExcel = () => {
    const targetComm = currentActiveComm;
    const acceptedList = requests.filter(r => r.acceptedCommittee === targetComm || r.status === 'مقبول');
    if (acceptedList.length === 0) {
      alert('لا توجد بيانات لأعضاء مقبولين للتصدير حالياً.');
      return;
    }

    const excelData = acceptedList.map((m, index) => ({
      'م': index + 1,
      'اسم العضو': m.fullName,
      'رقم الجوال': m.phone,
      'الرقم الجامعي': m.universityId || '-',
      'التخصص': m.major || 'تمريض',
      'اللجنة المقبول بها': m.acceptedCommittee || targetComm
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'أعضاء اللجنة');
    XLSX.writeFile(workbook, `Committee_${targetComm}_Members.xlsx`);
    alert('تم تصدير ملف الأكسل بنجاح وجاهز لرفعه للآدمن! 📊');
  };

  const handleApproveAndSubmitToPresidents = async () => {
    if (!confirm('هل أنت متأكد من اعتماد التقرير الختامي لمحفظة الجودة وحفظه في الأرشيف التاريخي وإرساله رسمياً لمكتب الرؤساء والأدمن؟')) return;

    try {
      const reportTitle = `تقرير محفظة أدلة الجودة الختامي (${new Date().toLocaleDateString('ar-SA')})`;
      const reportSummaryText = `🏆 [اعتماد تقرير محفظة الجودة الختامي]: تمت مراجعة إنجازات اللجان السبع، وحفظ الأرشيف، ورفع التقرير بنجاح تام.`;

      await addDoc(collection(db, 'quality_reports_archive'), {
        title: reportTitle,
        createdAt: Date.now(),
        dateStr: new Date().toLocaleDateString('ar-SA'),
        status: 'معتمد ومؤرشف رسمياً',
        author: userData?.fullName || 'لجنة الجودة والتطوير'
      });

      for (const usr of allUsersList) {
        if (usr.role?.includes('رئيس') || usr.role === 'System Admin' || usr.role === 'General Supervisor' || usr.phone === '0553731265') {
          try {
            await updateDoc(doc(db, 'users', usr.id), {
              latestNotification: reportSummaryText
            });
          } catch (er) { console.error(er); }
        }
      }

      await addDoc(collection(db, 'escalated_reports'), {
        targetCommittee: 'جميع اللجان السبع',
        reporter: userData?.fullName || 'لجنة الجودة والتطوير',
        reason: 'تم إعداد واعتماد تقرير محفظة أدلة الجودة الختامي وأرشفته ورفعه رسمياً لمكتب الرؤساء.',
        status: '✅ معتمد ومنجز ومؤرشف ومرفوع للرؤساء',
        leaderDefenseReply: 'تم الإنجاز والاعتماد والأرشفة بنجاح',
        createdAt: Date.now()
      });

      alert('🎉 تم اعتماد التقرير، حفظه في الأرشيف التاريخي، وترحيله بنجاح تام لمكتب الرؤساء والأدمن!');
      fetchEscalatedReports();
      fetchQualityArchives();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء اعتماد ورفع التقرير.');
    }
  };

  const handleExportQualityPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('الرجاء السماح بفتح النوافذ المنبثقة (Pop-ups) لتحميل تقرير الـ PDF.');
      return;
    }

    const totalAcceptedAll = requests.filter(r => r.status === 'مقبول' || r.acceptedCommittee).length;
    let topCommName = 'لجنة التصميم';
    let maxMembers = -1;
    allCommitteesList.forEach(c => {
      const cnt = requests.filter(r => r.acceptedCommittee === c || r.status === 'مقبول').length;
      if (cnt > maxMembers) {
        maxMembers = cnt;
        topCommName = c;
      }
    });

    let htmlContent = `
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>التقرير الاستشاري الختامي لمحفظة الجودة - نادي التمريض</title>
        <style>
          body { font-family: Tahoma, Arial, sans-serif; padding: 35px; color: #1e293b; background: #fff; direction: rtl; line-height: 1.6; }
          .header { text-align: center; border-bottom: 3px solid #630517; padding-bottom: 20px; margin-bottom: 25px; }
          .header h1 { color: #630517; font-size: 20px; margin: 0 0 5px 0; font-weight: 900; }
          .header p { color: #64748b; font-size: 11px; margin: 0; }
          .executive-box { background: #f8fafc; border-right: 4px solid #630517; padding: 15px; border-radius: 8px; margin-bottom: 25px; font-size: 12px; color: #334155; }
          .executive-box strong { color: #630517; }
          .section-title { font-size: 14px; font-weight: bold; color: #630517; margin-top: 25px; margin-bottom: 10px; border-right: 4px solid #F5D061; padding-right: 8px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right; }
          th { background-color: #f1f5f9; color: #334155; font-weight: bold; }
          .badge-ok { color: #047857; font-weight: bold; }
          .badge-warn { color: #b45309; font-weight: bold; }
          .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>نادي كلية التمريض - جامعة حفر الباطن</h1>
          <p>غرفة عمليات لجنة الجودة والتطوير • التقرير الاستشاري لمحفظة أدلة الجودة الشاملة</p>
          <p>تاريخ الإصدار: ${new Date().toLocaleDateString('ar-SA')} | مرجع رقم: QMS-${Math.floor(Math.random() * 89999 + 10000)}</p>
        </div>

        <div class="executive-box">
          <strong>📝 الملخص التحليلي التنفيذي (Executive Summary):</strong>
          يُوثق هذا التقرير حالة الأداء الميداني والإداري لكافة اللجان السبع بنادي التمريض. يُظهر التحليل المباشر للبيانات استقراراً هيكلياً عالياً بوجود <strong>${totalAcceptedAll}</strong> عضواً مقبولاً وفاعلاً عبر مختلف الأقسام، مع تصدر <strong>${topCommName}</strong> لمؤشرات الاستقطاب والانضمام. تؤكد لجنة الجودة والتطوير أن كافة مسارات العمل والمهام تسير وفق المعايير المعتمدة والمخطط لها لضمان مخرجات استثنائية أمام إدارة الجامعة وعمادة الكلية.
        </div>

        <div class="section-title">أولاً: جدول مؤشرات الأداء والأعضاء المقبولين باللجان السبع</div>
        <table>
          <thead>
            <tr>
              <th>اللجنة التنظيمية</th>
              <th>الأعضاء المقبولون فعلياً</th>
              <th>حالة الجودة والالتزام</th>
            </tr>
          </thead>
          <tbody>
    `;

    allCommitteesList.forEach(comm => {
      const commMembers = requests.filter(r => r.acceptedCommittee === comm || r.status === 'مقبول').length;
      htmlContent += `
        <tr>
          <td><strong>${comm}</strong></td>
          <td>${commMembers} أعضاء</td>
          <td><span class="badge-ok">معتمد وفق المعايير ✓</span></td>
        </tr>
      `;
    });

    htmlContent += `
          </tbody>
        </table>

        <div class="section-title">ثانياً: سجل البلاغات والإنذارات والمتابعة الرقابية</div>
        <table>
          <thead>
            <tr>
              <th>اللجنة المعنية</th>
              <th>سبب الإنذار أو التقصير المرصود</th>
              <th>الحالة التنظيمية</th>
              <th>تبرير ورد القائد</th>
            </tr>
          </thead>
          <tbody>
    `;

    if (escalatedReports.length === 0) {
      htmlContent += `<tr><td colspan="4" style="text-align: center; color: #64748b;">لا توجد أي بلاغات تقصير مسجلة؛ الأداء التشغيلي يسير بلا عوائق.</td></tr>`;
    } else {
      escalatedReports.forEach(rep => {
        htmlContent += `
          <tr>
            <td><strong>${rep.targetCommittee}</strong></td>
            <td>${rep.reason}</td>
            <td><span class="badge-warn">${rep.status}</span></td>
            <td>${rep.leaderDefenseReply || 'قيد المتابعة أو بانتظار التبرير'}</td>
          </tr>
        `;
      });
    }

    htmlContent += `
          </tbody>
        </table>

        <div class="footer">
          <p>هذا التقرير معتمد إلكترونياً من لجنة الجودة والتطوير • نادي التمريض جامعة حفر الباطن 2026</p>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center font-bold text-slate-600 bg-slate-50">جاري تحميل لوحة تحكم اللجنة التفاعلية...</div>;
  }

  const displayedTasks = committeeTasks.filter(t => t.committee === currentActiveComm);
  const committeeExcusesFiltered = eventExcuses.filter(ex => matchesTargetCommittee(ex.committee, currentActiveComm));

  const memberScoresMap: { [memberName: string]: number } = {};
  committeeTasks
    .filter(t => t.committee === currentActiveComm)
    .forEach(taskGroup => {
      (taskGroup.subTasks || []).forEach((st: any) => {
        if (st.completed && st.completedBy) {
          memberScoresMap[st.completedBy] = (memberScoresMap[st.completedBy] || 0) + 10;
        }
      });
    });

  const rankedMembers = Object.entries(memberScoresMap)
    .map(([name, score]) => ({ name, score }))
    .sort((a, b) => b.score - a.score);

  const committeeReports = Array.from(
    new Map(
      escalatedReports
        .filter(r => matchesTargetCommittee(r.targetCommittee, currentActiveComm))
        .map(item => [item.reason + '-' + item.status, item])
    ).values()
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-10 selection:bg-[#630517] selection:text-[#F5D061]" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* الشريط العلوي */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-black text-slate-900">
              {isQualityTeam ? '⚡ غرفة عمليات لجنة الجودة والتطوير (العقل المدبر والمركز المرعب)' : isCommitteeLeader ? `لوحة تحكم رئيس لجنة (${currentActiveComm}) 🛡️` : `بوابة العضو المنضم في (${userData?.assignedCommittee || userData?.committee || 'اللجنة'}) 🩺`}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              أهلاً بك، {userData?.fullName} • {isQualityTeam ? 'صلاحية مراقبة ورصد وإنذار وإحالة اللجان السبع برتبة عسكرية صارمة' : isCommitteeLeader ? 'إدارة شؤون وأعضاء ومهام اللجنة المعينة لك' : 'متابعة المهام الخاصة بلجنتك وإرسال إفادات عدم المشاركة بخصوصية تامة'}
            </p>
          </div>
          
          <div className="flex gap-2 items-center flex-wrap">
            {isQualityTeam && (
              <>
                <button type="button" onClick={handleExportQualityPDF} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black shadow hover:bg-emerald-700 flex items-center gap-1.5 cursor-pointer">
                  <span>📄</span><span>التقرير الاستشاري (PDF)</span>
                </button>
                <button type="button" onClick={() => setShowArchiveModal(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black shadow hover:bg-indigo-700 flex items-center gap-1.5 cursor-pointer">
                  <span>📂</span><span>الأرشيف التاريخي ({qualityArchives.length})</span>
                </button>
                <button type="button" onClick={handleApproveAndSubmitToPresidents} className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-black shadow hover:bg-amber-700 flex items-center gap-1.5 cursor-pointer animate-pulse">
                  <span>🚀</span><span>اعتماد الرفع للإدارة العليا</span>
                </button>
                <button type="button" onClick={() => setShowReportsModal(true)} className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-black shadow hover:bg-red-700 flex items-center gap-1.5 cursor-pointer">
                  <span>🚨</span><span>مركز الشكاوى ({escalatedReports.length})</span>
                </button>
              </>
            )}
            <Link href="/" className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-200">
              الرئيسية ←
            </Link>
          </div>
        </div>

        {/* شريط التنبيهات القيادي */}
        {!warningHidden && (
          <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white p-5 rounded-3xl shadow-lg flex items-center justify-between flex-wrap gap-4 border border-amber-400">
            <div className="flex items-center gap-3">
              <span className="text-3xl animate-pulse">🚨</span>
              <div>
                <h4 className="font-black text-sm text-yellow-100">شريط التنبيهات والبلاغات القيادية العاجلة:</h4>
                <p className="text-xs font-bold mt-0.5">{leaderCustomAlert}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={async () => {
                setWarningHidden(true);
                localStorage.setItem(`warning_hidden_${userPhone}`, 'true');
                if (userPhone) {
                  try { await updateDoc(doc(db, 'users', userPhone), { warningHidden: true }); } catch (e) { console.error(e); }
                }
              }}
              className="px-3 py-1.5 bg-black/25 hover:bg-black/45 text-white rounded-xl text-xs font-bold transition-all border border-white/20 cursor-pointer flex items-center gap-1"
            >
              <span>✕</span><span>إخفاء الإنذار</span>
            </button>
          </div>
        )}

        {/* تنبيهات وإنذارات اللجنة الحالية */}
        {!isQualityTeam && isCommitteeLeader && committeeReports.length > 0 && (
          <div className="bg-amber-50 border-2 border-amber-400 rounded-3xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-black text-amber-900 text-sm">تنبيهات وإنذارات رسمية مسجلة بحق لجنتك (مطلوبة الرد):</h3>
                <p className="text-xs text-amber-700">لديك مهلة 24 ساعة لتقديم الرد أو التبرير لتفادي تصعيد البلاغ لمكتب الرؤساء.</p>
              </div>
            </div>

            <div className="space-y-3">
              {committeeReports.map((rep: any) => (
                <div key={rep.id} className="bg-white border border-amber-200 rounded-2xl p-4 space-y-3 shadow-sm">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-500">المرسل: {rep.reporter}</span>
                    <span className="font-black text-amber-800">{rep.status}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800">سبب الإنذار والتقصير المرصود: {rep.reason}</p>

                  {rep.leaderDefenseReply ? (
                    <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs space-y-1">
                      <span className="font-bold text-emerald-800 block">💬 ردك وتبريرك المرسل:</span>
                      <p className="text-slate-700">{rep.leaderDefenseReply}</p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setActiveReportToReply(rep); setShowReplyModal(true); }}
                      className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 cursor-pointer transition-all flex items-center gap-1.5"
                    >
                      <span>✍️</span><span>إرسال الرد والتبرير الرسمي (خلال 24 ساعة)</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* نظام إفادة عدم المشاركة والاعتذار المباشر (متاح للأعضاء والقادة) */}
        {/* ======================================================== */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-900">📝 إفادة عدم المشاركة والاعتذار للفعاليات (خصوصية تامة للأعضاء)</h3>
              <p className="text-xs text-slate-500">أبلغ الموارد البشرية فوراً بعدم مشاركتك في الفعالية بدون موافقة أو إظهار القوائم الخاصة للآخرين:</p>
            </div>
            <button
              type="button"
              onClick={() => setShowExcuseForm(!showExcuseForm)}
              className="px-4 py-2 bg-[#630517] text-[#F5D061] rounded-xl text-xs font-black shadow hover:brightness-110 cursor-pointer"
            >
              {showExcuseForm ? 'إلغاء' : '+ رفع إفادة اعتذار عدم مشاركة'}
            </button>
          </div>

          {showExcuseForm && (
            <form onSubmit={handleSubmitExcuse} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
              <h4 className="font-extrabold text-sm text-[#630517]">نموذج إفادة عدم المشاركة للموارد البشرية</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">اسم الفعالية</label>
                  <input
                    type="text"
                    placeholder="مثال: ورشة عمل الإسعافات الأولية"
                    value={excuseEventName}
                    onChange={(e) => setExcuseEventName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-900"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">تاريخ الفعالية</label>
                  <input
                    type="date"
                    value={excuseEventDate}
                    onChange={(e) => setExcuseEventDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-900"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">سبب عدم المشاركة (مختصر)</label>
                <textarea
                  rows={2}
                  placeholder="سبب الاعتذار أو عدم التفرغ..."
                  value={excuseReason}
                  onChange={(e) => setExcuseReason(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-900"
                  required
                />
              </div>
              <div className="flex justify-end">
                <button type="submit" className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow hover:bg-emerald-700 cursor-pointer">
                  إرسال الإفادة للموارد البشرية مباشرة 🚀
                </button>
              </div>
            </form>
          )}

          {isCommitteeLeader && (
            <div className="space-y-3">
              <h4 className="font-extrabold text-sm text-slate-800">سجل الإفادات والاعتذارات المسجلة بلجنتك:</h4>
              {committeeExcusesFiltered.length === 0 ? (
                <p className="text-center py-8 text-slate-400 font-bold text-xs bg-slate-50 rounded-2xl">لا توجد إفادات اعتذار مسجلة لهذه اللجنة حتى الآن.</p>
              ) : (
                committeeExcusesFiltered.map((ex) => (
                  <div key={ex.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-xs">العضو: {ex.memberName}</span>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800">
                          {ex.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-semibold">الفعالية: <span className="text-[#630517]">{ex.eventName}</span> (تاريخ: {ex.eventDate})</p>
                      <p className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-100"><strong className="text-slate-800">السبب:</strong> {ex.reason}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* 1. أداة لجنة الموارد البشرية (للقادة فقط) */}
        {isCommitteeLeader && currentActiveComm === 'لجنة الموارد البشرية' && (
          <div className="bg-white rounded-3xl p-8 border border-sky-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4 flex justify-between items-center flex-wrap gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">👥 قائمة الطلبة المحولين وإفادات عدم المشاركة</h3>
                <p className="text-xs text-slate-500">متابعة الطلاب المحولين وإفادات الاعتذار المباشرة من الأعضاء بعدم المشاركة.</p>
              </div>
              <span className="px-3.5 py-1.5 rounded-xl bg-sky-100 text-sky-800 font-bold text-xs">
                إجمالي المحولين: {transferredRequestsList.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold">
                    <th className="pb-3 pr-2">اسم الطالب / الطالبة</th>
                    <th className="pb-3">رقم الجوال</th>
                    <th className="pb-3">الرغبة الأولى (التي اكتفت)</th>
                    <th className="pb-3">الرغبات المسجلة الأخرى</th>
                    <th className="pb-3 text-left pl-2">تواصل واتساب</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transferredRequestsList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 font-bold">لا توجد طلبات محولة حالياً. القائمة فارغة في انتظار تحويل اللجان للطلاب.</td>
                    </tr>
                  ) : (
                    transferredRequestsList.map((req, idx) => (
                      <tr key={idx} className="hover:bg-sky-50/20">
                        <td className="py-3.5 pr-2 font-bold text-slate-900">{req.fullName}</td>
                        <td className="py-3.5 font-mono text-slate-700" dir="ltr">{req.phone}</td>
                        <td className="py-3.5 text-red-600 font-semibold">{req.firstChoice || 'غير متوفر'}</td>
                        <td className="py-3.5 text-slate-600">{req.secondChoice || '-'} / {req.thirdChoice || '-'}</td>
                        <td className="py-3.5 text-left pl-2">
                          <a
                            href={`https://wa.me/${req.phone?.startsWith('0') ? '966' + req.phone.substring(1) : req.phone}?text=مرحباً بك ${req.fullName}، تم تحويلك للجنة الموارد البشرية لنتمكن من مراجعة قبولك على رغبتك الثانية أو الثالثة بنادي التمريض. 🚀`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-emerald-600 text-white font-bold rounded-xl shadow hover:bg-emerald-700 transition-all inline-flex items-center gap-1"
                          >
                            💬 تواصل واتساب
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. أداة لجنة الإعلام (للقادة والأعضاء المخصصين) */}
        {currentActiveComm === 'لجنة الاعلام' && isCommitteeLeader && (
          <div className="bg-white rounded-3xl p-8 border border-purple-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4 flex justify-between items-center flex-wrap gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">📸 مركز رفع ونشر الصور ومقاطع الفيديو (لجنة الإعلام)</h3>
                <p className="text-xs text-slate-500">ارفع صور وتغطيات الفعاليات والمقاطع لتغذية لوحة تحكم الأدمن ومكتب الرؤساء والمعرض والموقع مباشرة.</p>
              </div>
              <span className="px-3.5 py-1.5 rounded-xl bg-purple-100 text-purple-800 font-bold text-xs">
                إجمالي المواد المرفوعة: {mediaGallery.length}
              </span>
            </div>

            <form onSubmit={handleUploadMediaSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-purple-50/40 p-6 rounded-2xl border border-purple-200">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">عنوان الصورة أو المقطع</label>
                <input
                  type="text"
                  placeholder="مثال: تغطية ملتقى التمريض التوعوي"
                  value={mediaTitle}
                  onChange={(e) => setMediaTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-900"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">التصنيف الإعلامي</label>
                <select
                  value={mediaCategory}
                  onChange={(e) => setMediaCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-900 font-bold"
                >
                  <option value="تغطية فعالية">تغطية فعالية</option>
                  <option value="صور ومقاطع">صور ومقاطع أرشيفية</option>
                </select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700">اختر ملف الصورة أو الفيديو من جهازك</label>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                    if (e.target.files && e.target.files[0]) {
                      setMediaBase64(await convertFileToBase64(e.target.files[0]));
                    }
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-purple-600 file:text-white cursor-pointer"
                  required
                />
              </div>

              <div className="sm:col-span-2 pt-2">
                <button type="submit" className="bg-purple-600 text-white px-8 py-3 rounded-xl font-black text-xs shadow hover:bg-purple-700 cursor-pointer">
                  + رفع ونشر المواد سحابياً (تصل للأدمن) 🎬
                </button>
              </div>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
              {mediaGallery.map((item) => (
                <div key={item.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <span className="text-[10px] bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full font-bold">{item.category}</span>
                    <h5 className="font-extrabold text-slate-900 text-xs">{item.title}</h5>
                    <p className="text-[10px] text-slate-400">تاريخ الرفع: {item.createdAt}</p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <a href={item.imageUrl} target="_blank" rel="noopener noreferrer" className="flex-1 py-1.5 bg-sky-50 text-sky-700 text-center font-bold text-xs rounded-lg">عرض 👁️</a>
                    <button type="button" onClick={() => handleDeleteMedia(item.id)} className="px-3 py-1.5 bg-red-50 text-red-600 font-bold text-xs rounded-lg">حذف ✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. أداة لجنة المحتوى العلمي */}
        {currentActiveComm === 'لجنة المحتوى العلمي' && isCommitteeLeader && (
          <div className="bg-white rounded-3xl p-8 border border-emerald-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4 flex justify-between items-center flex-wrap gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">🔬 بنك صياغة النصوص الطبية والعبارات (مربوط بلجنة التصميم ومكتب الرؤساء والأدمن)</h3>
                <p className="text-xs text-slate-500">هنا تكتبون النصوص والعبارات التوعوية التي تستخدمها لجان التصميم والإعلام، وتصل مباشرة للأدمن والرؤساء.</p>
              </div>
              <span className="px-3.5 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs">
                إجمالي النصوص المعتمدة: {scientificTextsList.length}
              </span>
            </div>

            <form onSubmit={handleAddScientificTextSubmit} className="grid grid-cols-1 gap-4 bg-emerald-50/40 p-6 rounded-2xl border border-emerald-200">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">عنوان البانر أو التصميم المستهدف</label>
                <input
                  type="text"
                  placeholder="مثال: عبارات بوستر اليوم العالمي للتمريض"
                  value={textBannerTitle}
                  onChange={(e) => setTextBannerTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-900"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">النصوص والعبارات الدقيقة المعتمدة (تصل للجنة التصميم والرؤساء)</label>
                <textarea
                  rows={3}
                  placeholder="اكتب النص العلمي أو العبارة الإبداعية هنا لتكون مرجعاً للبنرات والتصاميم..."
                  value={textBannerContent}
                  onChange={(e) => setTextBannerContent(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-900"
                  required
                />
              </div>

              <div>
                <button type="submit" className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-black text-xs shadow hover:bg-emerald-700 cursor-pointer">
                  + اعتماد ونشر النص للبنرات والتصاميم وللأدمن والرؤساء 📝✨
                </button>
              </div>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              {scientificTextsList.map((txt) => (
                <div key={txt.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">موصول بلجنة التصميم والرؤساء ✓</span>
                      <span className="text-[10px] text-slate-400">{txt.createdAt}</span>
                    </div>
                    <h5 className="font-black text-slate-900 text-sm">{txt.title}</h5>
                    <p className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-100 leading-relaxed font-semibold">"{txt.content}"</p>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button type="button" onClick={() => handleDeleteScientificText(txt.id)} className="px-3 py-1.5 bg-red-50 text-red-600 font-bold text-xs rounded-lg">حذف ✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* رادار الجودة السبع (للقادة فقط) */}
        {isQualityTeam && (
          <div className="space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <h3 className="font-black text-slate-900 text-sm">رادار مراقبة ورصد إنجازات اللجان السبع (إنذار القادة أولاً ثم التصعيد):</h3>
              <span className="text-[11px] bg-red-100 text-red-700 font-bold px-3 py-1 rounded-xl">
                ⚠️ النظام النظامي: إنذار القادة بمهلة 24 ساعة للرد، وإذا لم يتجاوبوا يتم رفع البلاغ للرؤساء
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {allCommitteesList.map((commName, idx) => {
                const count = requests.filter(r => r.acceptedCommittee === commName).length;
                return (
                  <div 
                    key={idx} 
                    onClick={() => {
                      setSelectedMonitoredCommittee(commName);
                      setSelectedManagedCommittee(commName);
                    }}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-sm flex flex-col justify-between space-y-3 relative overflow-hidden ${
                      selectedManagedCommittee === commName ? 'bg-[#630517] text-white border-[#630517] shadow-lg scale-[1.02]' : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${selectedManagedCommittee === commName ? 'bg-white/20 text-[#F5D061]' : 'bg-slate-100 text-slate-600'}`}>
                        مراقبة عليا
                      </span>
                      <span className="text-lg font-black">{count} أعضاء</span>
                    </div>
                    <h4 className="font-extrabold text-sm">{commName}</h4>

                    <div className="pt-2 flex flex-col gap-1.5 border-t border-white/10 mt-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTargetCommitteeForWarning(commName);
                          setWarningStepType('warn-leaders');
                          setShowWarningModal(true);
                        }}
                        className={`w-full py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                          selectedManagedCommittee === commName ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        ⚠️ إنذار قائد وقائدة اللجنة
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTargetCommitteeForWarning(commName);
                          setWarningStepType('escalate-presidents');
                          setShowWarningModal(true);
                        }}
                        className={`w-full py-1.5 rounded-xl text-[10px] font-black transition-all ${
                          selectedManagedCommittee === commName ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                        }`}
                      >
                        🚨 تصعيد البلاغ للرئيس ورئيسة النادي
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* إحصائيات فورية (للقادة فقط) */}
        {isCommitteeLeader && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-[#630517] to-[#80071D] text-white p-6 rounded-3xl shadow-xl space-y-2">
              <span className="text-[11px] font-bold text-[#F5D061] uppercase tracking-wider">إجمالي المتقدمين للجنة ({currentActiveComm})</span>
              <div className="text-3xl font-black">{totalApplicantsCount}</div>
              <p className="text-xs text-white/80">المتقدمون برغباتهم</p>
            </div>

            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-2">
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">عدد الأعضاء المقبولين</span>
              <div className="text-3xl font-black text-slate-900">{acceptedMembersCount}</div>
              <p className="text-xs text-slate-500">تم قبولهم وانضمامهم</p>
            </div>

            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-2">
              <span className="text-[11px] font-bold text-sky-600 uppercase tracking-wider">نسبة الإنجاز واستيعاب اللجنة</span>
              <div className="text-3xl font-black text-slate-900">
                {totalApplicantsCount > 0 ? Math.round((acceptedMembersCount / totalApplicantsCount) * 100) : 0}%
              </div>
              <p className="text-xs text-slate-500">معدل قبول المتقدمين</p>
            </div>
          </div>
        )}

        {/* الأدوات القيادية (للقادة فقط) */}
        {isCommitteeLeader && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <h3 className="text-sm font-black text-slate-900">📢 إرسال إشعار جماعي لأعضاء اللجنة</h3>
                <p className="text-[11px] text-slate-500">اكتب رسالة ستصل كإشعار فوري داخل لوحة تحكم كل عضو مقبول بـ ({currentActiveComm}).</p>
              </div>
              <form onSubmit={handleSendBroadcastAnnouncement} className="space-y-3 pt-2">
                <textarea
                  rows={2}
                  placeholder="اكتب نص التعميم أو التنبيه هنا..."
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#630517]"
                />
                <button type="submit" className="w-full py-2.5 rounded-xl bg-[#630517] text-[#F5D061] font-bold text-xs shadow hover:brightness-110 cursor-pointer">
                  إرسال الإشعار الفوري 🚀
                </button>
              </form>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <h3 className="text-sm font-black text-slate-900">🎯 رفع مهام (قائمة متعددة Checklist)</h3>
                <p className="text-[11px] text-slate-500">أضف عدة مهام تحت فعالية واحدة، وتابع نسبة إنجازها بدقة.</p>
              </div>

              <form onSubmit={handlePublishTasksList} className="space-y-3 pt-1">
                {isQualityTeam && (
                  <select
                    value={targetCommitteeForTask}
                    onChange={(e) => setTargetCommitteeForTask(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-900"
                  >
                    {allCommitteesList.map((c, i) => (<option key={i} value={c}>{c}</option>))}
                  </select>
                )}

                <input
                  type="text"
                  placeholder="عنوان الفعالية المرتبطة..."
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#630517]"
                />

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="أكتب مهمة فرعية واضغط إضافة..."
                    value={taskInputText}
                    onChange={(e) => setTaskInputText(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#630517]"
                  />
                  <button type="button" onClick={handleAddTaskToBuffer} className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 cursor-pointer">+</button>
                </div>

                {tasksListBuffer.length > 0 && (
                  <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 space-y-1 max-h-24 overflow-y-auto">
                    {tasksListBuffer.map((t, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[11px] bg-white px-2.5 py-1 rounded-lg border border-slate-100">
                        <span>• {t}</span>
                        <button type="button" onClick={() => handleRemoveTaskFromBuffer(idx)} className="text-red-600 font-bold">✕</button>
                      </div>
                    ))}
                  </div>
                )}

                <input
                  type="text"
                  placeholder="الموعد النهائي"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#630517]"
                />

                <button type="submit" className="w-full py-2.5 rounded-xl bg-[#630517] text-[#F5D061] font-bold text-xs shadow hover:brightness-110 cursor-pointer">
                  نشر قائمة المهام للجنة ⚡
                </button>
              </form>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <h3 className="text-sm font-black text-slate-900">📊 تصدير أعضاء اللجنة (Excel)</h3>
                <p className="text-[11px] text-slate-500">تصدير قائمة الأعضاء المقبولين بملف أكسل.</p>
              </div>
              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleExportCommitteeExcel}
                  className="w-full py-3.5 rounded-xl bg-emerald-600 text-white font-black text-xs shadow-lg hover:bg-emerald-700 cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>📥 تحميل ملف Excel للأعضاء</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* قائمة المهام المتعددة ولوحة الشرف (متاحة للجميع مع الحفاظ على الخصوصية) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">📋 قائمة مهام اللجان وإنجاز العداد الديناميكي ({currentActiveComm})</h3>
                <p className="text-xs text-slate-500">اضغط على (صح) على أي مهمة لإنجازها وتسجيل نقاطك الفردية:</p>
              </div>
            </div>

            {displayedTasks.length === 0 ? (
              <p className="text-center py-12 text-slate-400 font-bold text-xs bg-slate-50 rounded-2xl">لا توجد قوائم مهام مسجلة لهذه اللجنة حالياً.</p>
            ) : (
              <div className="space-y-6">
                {displayedTasks.map((taskGroup) => {
                  const subTasks = taskGroup.subTasks || [];
                  const completedCount = subTasks.filter((st: any) => st.completed).length;
                  const totalCount = subTasks.length;
                  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                  const isFinished = progressPercent === 100;

                  return (
                    <div key={taskGroup.id} className="p-6 rounded-3xl border border-slate-200 bg-slate-50/50 shadow-sm space-y-4 relative">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] bg-[#630517]/10 text-[#630517] font-bold px-2.5 py-1 rounded-md">فعالية: {taskGroup.eventTitle}</span>
                          <h4 className="font-extrabold text-slate-900 text-sm mt-2">الموعد: {taskGroup.dueDate}</h4>
                        </div>
                        {isCommitteeLeader && (
                          <button type="button" onClick={() => handleDeleteTaskGroup(taskGroup.id)} className="text-red-500 text-xs font-bold hover:text-red-700">حذف القائمة ✕</button>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-black">
                          <span className={isFinished ? 'text-emerald-600' : 'text-slate-700'}>{isFinished ? '🎉 تم إنجاز كافة المهام بنجاح!' : `متبقي ${totalCount - completedCount} مهام لإتمام الكل`}</span>
                          <span className="text-[#630517]">{progressPercent}%</span>
                        </div>
                        <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-300 ${isFinished ? 'bg-emerald-500' : 'bg-[#630517]'}`} style={{ width: `${progressPercent}%` }} />
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-200">
                        {subTasks.map((st: any, idx: number) => (
                          <div
                            key={idx}
                            onClick={() => handleToggleSubTask(taskGroup.id, idx)}
                            className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                              st.completed ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900 opacity-90' : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
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
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-slate-900">🏆 لوحة الشرف ونقاط العضو الفردي</h3>
              <p className="text-[11px] text-slate-500">الأعضاء الأكثر تفاعلاً وإنجازاً للمهام في ({currentActiveComm}):</p>
            </div>

            <div className="space-y-2.5 overflow-y-auto max-h-[380px] pt-2">
              {rankedMembers.length === 0 ? (
                <p className="text-center py-12 text-slate-400 font-bold text-xs bg-slate-50 rounded-2xl">لم يتم تسجيل إنجازات مهام للأعضاء بعد.</p>
              ) : (
                rankedMembers.map((member, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] ${
                        idx === 0 ? 'bg-amber-400 text-slate-900 shadow' : idx === 1 ? 'bg-slate-300 text-slate-900' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-800">{member.name}</span>
                    </div>
                    <span className="font-black text-[#630517] bg-[#630517]/10 px-2.5 py-1 rounded-lg">{member.score} نقطة</span>
                  </div>
                ))
              )}
            </div>
            <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 text-center">* تحسب 10 نقاط لكل مهمة ينجزها العضو.</div>
          </div>
        </div>

        {/* الجدول الخاص بالمرشحين (يظهر للقادة فقط للحفاظ على الخصوصية التامة للأعضاء العاديين) */}
        {isCommitteeLeader && (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">المتقدمون ({currentActiveComm})</h3>
                <p className="text-xs text-slate-500">اختر الرغبة لعرض المتقدمين بدقة وقبولهم برابط قروب الواتساب:</p>
              </div>
              
              <div className="flex gap-2">
                <button type="button" onClick={() => setPreferenceFilterTab('pref-1')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${preferenceFilterTab === 'pref-1' ? 'bg-[#630517] text-[#F5D061]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                  🎯 الرغبة الأولى ({requests.filter(r => matchesTargetCommittee(r.firstChoice, currentActiveComm)).length})
                </button>
                <button type="button" onClick={() => setPreferenceFilterTab('pref-2')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${preferenceFilterTab === 'pref-2' ? 'bg-[#630517] text-[#F5D061]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                  🥈 الرغبة الثانية ({requests.filter(r => matchesTargetCommittee(r.secondChoice, currentActiveComm)).length})
                </button>
                <button type="button" onClick={() => setPreferenceFilterTab('pref-3')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${preferenceFilterTab === 'pref-3' ? 'bg-[#630517] text-[#F5D061]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                  🥉 الرغبة الثالثة ({requests.filter(r => matchesTargetCommittee(r.thirdChoice, currentActiveComm)).length})
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold">
                    <th className="pb-3 pr-2">اسم المتقدم</th>
                    <th className="pb-3">الرقم الجامعي</th>
                    <th className="pb-3">الرغبات</th>
                    <th className="pb-3">الحالة</th>
                    <th className="pb-3 text-left pl-2">إجراءات وصلاحيات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRequests.length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center text-slate-400 font-bold">لا توجد طلبات متقدمين مطابقة لهذه الرغبة في "{currentActiveComm}" حالياً.</td></tr>
                  ) : (
                    filteredRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50">
                        <td className="py-3 pr-2 font-bold text-slate-900">{req.fullName}<div className="text-[10px] text-slate-400 font-normal">📞 {req.phone}</div></td>
                        <td className="py-3 text-slate-600 font-mono">{req.universityId || '-'}</td>
                        <td className="py-3 text-slate-600 text-[11px] space-y-0.5">
                          <p><strong className="text-[#630517]">1:</strong> {req.firstChoice}</p>
                          <p><strong className="text-slate-400">2:</strong> {req.secondChoice}</p>
                          <p><strong className="text-slate-400">3:</strong> {req.thirdChoice}</p>
                        </td>
                        <td className="py-3">
                          <span className={`px-2.5 py-1 rounded-full font-bold border ${
                            req.status === 'مقبول' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : req.status === 'مرفوض' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {req.status || 'معلق'}
                          </span>
                          {req.acceptedCommittee && (<div className="text-[10px] text-[#630517] font-bold mt-1">مقبول في: {req.acceptedCommittee}</div>)}
                        </td>
                        <td className="py-3 text-left pl-2 flex gap-1.5 justify-end flex-wrap">
                          <button type="button" onClick={() => handleShiftPreference(req)} className="px-2.5 py-1.5 rounded-lg bg-sky-50 text-sky-700 font-bold hover:bg-sky-100 cursor-pointer text-xs" title="تحويل الطالب لرغبته التالية وتحويله للموارد البشرية">🔄 تحويل للموارد البشرية</button>
                          <button type="button" onClick={() => { setSelectedReqId(req.id); setShowAcceptModal(true); }} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 cursor-pointer text-xs">قبول ✅</button>
                          <button type="button" onClick={() => handleReject(req.id)} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 font-bold hover:bg-red-100 cursor-pointer text-xs">رفض ✕</button>
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

      {/* النوافذ التفاعلية */}
      {showArchiveModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" dir="rtl">
          <div className="bg-white rounded-[32px] p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-6 max-h-[85vh] overflow-y-auto border-2 border-indigo-500">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="text-lg font-black text-slate-900">📂 الأرشيف التاريخي لتقارير الجودة المعتمدة</h3>
              <button onClick={() => setShowArchiveModal(false)} className="text-slate-400 hover:text-slate-700 font-bold">✕ إغلاق</button>
            </div>
            <div className="space-y-3">
              {qualityArchives.length === 0 ? (
                <p className="text-center py-8 text-slate-400 font-bold text-xs">لا توجد تقارير مؤرشفة حتى الآن.</p>
              ) : (
                qualityArchives.map((arch) => (
                  <div key={arch.id} className="bg-indigo-50/50 border border-indigo-200 rounded-2xl p-4 flex justify-between items-center">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-xs">{arch.title}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">تاريخ الاعتماد: {arch.dateStr} • بواسطة: {arch.author}</p>
                    </div>
                    <span className="text-[10px] bg-indigo-600 text-white font-bold px-3 py-1 rounded-xl">{arch.status}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showAcceptModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6">
            <h3 className="text-xl font-black text-slate-900 border-b border-slate-100 pb-3">تأكيد القبول في {currentActiveComm}</h3>
            <div className="space-y-4">
              <p className="text-xs text-slate-600">سيتم قبول الطالب رسمياً في هذه اللجنة وربطه برابط قروب الواتساب.</p>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">رابط قروب الواتساب:</label>
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
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowAcceptModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs">إلغاء</button>
              <button type="button" onClick={handleAcceptSubmit} className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-black text-xs shadow hover:bg-emerald-700 cursor-pointer">تأكيد القبول وإرسال الرابط ✅</button>
            </div>
          </div>
        </div>
      )}

      {showReplyModal && activeReportToReply && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" dir="rtl">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl space-y-6 border-2 border-amber-500">
            <div className="w-16 h-16 rounded-2xl bg-amber-500 mx-auto flex items-center justify-center text-3xl font-bold text-white">✍️</div>
            <div className="text-center space-y-1">
              <h3 className="text-xl font-black text-slate-900">تقديم الرد والتبرير الرسمي</h3>
              <p className="text-xs text-slate-500">الرد على الإنذار الوارد من لجنة الجودة والتطوير</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl text-xs space-y-1 border border-slate-200">
              <span className="font-bold text-slate-700 block">سبب الإنذار المرصود:</span>
              <p className="text-slate-600">{activeReportToReply.reason}</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">اكتب تفاصيل التبرير أو خطة المعالجة:</label>
              <textarea
                rows={3}
                placeholder="اكتب التبرير..."
                value={leaderDefenseReply}
                onChange={(e) => setLeaderDefenseReply(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowReplyModal(false)} className="w-1/2 py-3 rounded-2xl bg-slate-100 text-slate-600 font-bold text-xs">إلغاء</button>
              <button type="button" onClick={handleSubmitLeaderReply} className="w-1/2 py-3 rounded-2xl bg-amber-600 text-white font-black text-xs shadow-lg hover:bg-amber-700 cursor-pointer">إرسال التبرير للجودة 📨</button>
            </div>
          </div>
        </div>
      )}

      {showReportsModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" dir="rtl">
          <div className="bg-white rounded-[32px] p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-6 max-h-[85vh] overflow-y-auto border-2 border-red-500">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="text-lg font-black text-slate-900">🚨 مركز التقارير والشكاوى ومتابعة ردود القادة</h3>
              <button onClick={() => setShowReportsModal(false)} className="text-slate-400 hover:text-slate-700 font-bold">✕ إغلاق</button>
            </div>
            <div className="space-y-4">
              {escalatedReports.length === 0 ? (
                <p className="text-center py-8 text-slate-400 font-bold text-xs">لا توجد تقارير تقصير أو شكاوى مرفوعة حتى الآن.</p>
              ) : (
                escalatedReports.map((rep) => (
                  <div key={rep.id} className="bg-red-50/60 border border-red-200 rounded-2xl p-4 space-y-3 relative">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-red-700">اللجنة المعنية: {rep.targetCommittee}</span>
                      <button type="button" onClick={() => handleDeleteReport(rep.id)} className="px-2 py-0.5 bg-red-600 text-white rounded-md text-[10px] font-black hover:bg-red-700 cursor-pointer">حذف البلاغ 🗑️</button>
                    </div>
                    <p className="text-xs text-slate-800 font-semibold">السبب والتقصير المرصود: {rep.reason}</p>
                    {rep.leaderDefenseReply && (
                      <div className="bg-white border border-emerald-300 p-3 rounded-xl text-xs space-y-1 shadow-inner">
                        <span className="font-bold text-emerald-800 block">💬 رد وتبرير قائد اللجنة:</span>
                        <p className="text-slate-700">{rep.leaderDefenseReply}</p>
                      </div>
                    )}
                    <div className="text-[10px] text-slate-500 flex justify-between pt-2 border-t border-red-200/50">
                      <span>الرافع: {rep.reporter}</span>
                      <span className="font-bold text-red-800">{rep.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showWarningModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" dir="rtl">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl space-y-6 border-2 border-amber-500">
            <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-3xl font-bold text-white ${warningStepType === 'warn-leaders' ? 'bg-amber-500' : 'bg-red-600'}`}>
              {warningStepType === 'warn-leaders' ? '⚠️' : '🚨'}
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-xl font-black text-slate-900">
                {warningStepType === 'warn-leaders' ? 'إنذار داخلي لقائد وقائدة اللجنة' : 'تصعيد وإحالة البلاغ للرئيس ورئيسة النادي'}
              </h3>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">التفاصيل أو التقصير المرصود:</label>
              <textarea
                rows={3}
                placeholder="اكتب التفاصيل..."
                value={warningReason}
                onChange={(e) => setWarningReason(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowWarningModal(false)} className="w-1/2 py-3 rounded-2xl bg-slate-100 text-slate-600 font-bold text-xs">إلغاء</button>
              <button
                type="button"
                onClick={handleExecuteWarningOrEscalation}
                className={`w-1/2 py-3 rounded-2xl text-white font-black text-xs shadow-lg cursor-pointer ${
                  warningStepType === 'warn-leaders' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {warningStepType === 'warn-leaders' ? 'إرسال الإنذار 📨' : 'تصعيد البلاغ ⚖️'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}