import React, { useState, useEffect } from 'react';
import { 
  connectGoogleWorkspace, 
  disconnectGoogleWorkspace, 
  getCachedToken, 
  getGoogleEmail,
  fetchTasks,
  createTask,
  updateTaskStatus,
  deleteTask,
  exportToGoogleSheets,
  fetchEmails,
  sendEmail,
  createGoogleMeetCode,
  fetchGoogleContacts,
  GoogleTask,
  GmailMessageHeader,
  ContactInfo
} from '../lib/googleWorkspace';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { Submission } from '../types';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  FolderOpen, 
  Mail, 
  Users, 
  FileText, 
  Video, 
  LogOut, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Send,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
  Notebook,
  Grid,
  Search,
  Check,
  CheckSquare,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';

// In-Memory Key backup list
interface StickyNote {
  id: string;
  title: string;
  content: string;
  color: string;
  createdAt: string;
}

const STICKY_COLORS = [
  { name: 'yellow', bg: 'bg-amber-100 border-amber-200 text-amber-900', hover: 'hover:bg-amber-200' },
  { name: 'blue', bg: 'bg-sky-100 border-sky-200 text-sky-900', hover: 'hover:bg-sky-200' },
  { name: 'green', bg: 'bg-emerald-100 border-emerald-200 text-emerald-900', hover: 'hover:bg-emerald-200' },
  { name: 'pink', bg: 'bg-rose-100 border-rose-200 text-rose-900', hover: 'hover:bg-rose-200' },
  { name: 'cream', bg: 'bg-orange-50 border-orange-200 text-orange-900', hover: 'hover:bg-orange-100' }
];

export default function WorkspacePortal() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  // OAuth State
  const [isConnected, setIsConnected] = useState<boolean>(!!getCachedToken());
  const [googleEmail, setGoogleEmail] = useState<string | null>(getGoogleEmail());
  const [isConnecting, setIsConnecting] = useState(false);

  // Active Tab: tasks, sheets, gmail, meet, contacts, keep
  const [activeTab, setActiveTab] = useState<'tasks' | 'sheets' | 'gmail' | 'meet' | 'contacts' | 'keep'>('tasks');

  // Feedback notifications
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Custom Confirmation Dialog state (for safety & security principles)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);

  // 1. Google Tasks State
  const [tasks, setTasks] = useState<GoogleTask[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskNotes, setNewTaskNotes] = useState('');

  // 2. Google Sheets State
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportedSheet, setExportedSheet] = useState<{ title: string; url: string } | null>(null);

  // 3. Gmail State
  const [emails, setEmails] = useState<GmailMessageHeader[]>([]);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);
  const [sendToEmail, setSendToEmail] = useState('');
  const [sendSubject, setSendSubject] = useState('');
  const [sendBodyText, setSendBodyText] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // 4. Google Meet State
  const [meetTitle, setMeetTitle] = useState('حلقة نقاشية - برنامج الحكاية ومافيها');
  const [createdMeet, setCreatedMeet] = useState<{ url: string; code: string } | null>(null);
  const [isCreatingMeet, setIsCreatingMeet] = useState(false);

  // 5. Google Contacts State
  const [contacts, setContacts] = useState<ContactInfo[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [contactsSearchTerm, setContactsSearchTerm] = useState('');

  // 6. Local Google Keep notebook state (enterprise bypass)
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>(() => {
    const saved = localStorage.getItem('alhekaya_workspace_notes');
    return saved ? JSON.parse(saved) : [];
  });
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteColor, setNewNoteColor] = useState('yellow');
  const [searchNotesQuery, setSearchNotesQuery] = useState('');

  // Persist Local Notes
  useEffect(() => {
    localStorage.setItem('alhekaya_workspace_notes', JSON.stringify(stickyNotes));
  }, [stickyNotes]);

  // Protect route strictly for Admin or Servant students

  // Load submissions on mount
  useEffect(() => {
    // Check for any pending redirect results (for popup blocked fallback)
    import('firebase/auth').then(({ getRedirectResult, GoogleAuthProvider }) => {
      import('../lib/firebase').then(({ auth }) => {
        getRedirectResult(auth).then((result) => {
          if (result) {
            const credential = GoogleAuthProvider.credentialFromResult(result);
            if (credential?.accessToken) {
              import('../lib/googleWorkspace').then(({ setCachedToken }) => {
                setCachedToken(credential.accessToken);
                setIsConnected(true);
                setGoogleEmail(result.user.email || '');
              });
            }
          }
        }).catch(err => {
          console.error("Redirect auth error:", err);
        });
      });
    });

    if (!user) return;
    const fetchSubmissionsAndCheckGoogle = async () => {
      try {
        const qSub = query(
          collection(db, 'submissions'),
          where('participantId', '==', user.uid),
          orderBy('date', 'desc'),
          limit(20)
        );
        const snap = await getDocs(qSub);
        const list: Submission[] = [];
        snap.forEach(doc => {
          list.push({ id: doc.id, ...doc.data() } as Submission);
        });
        setSubmissions(list);
      } catch (err) {
        console.error('Error fetching submissions for sheet export:', err);
      }
    };
    fetchSubmissionsAndCheckGoogle();
  }, [user]);

  // Load API data on active tab change
  useEffect(() => {
    if (isConnected) {
      if (activeTab === 'tasks') {
        loadTasks();
      } else if (activeTab === 'gmail') {
        loadEmails();
      } else if (activeTab === 'contacts') {
        loadContacts();
      }
    }
  }, [isConnected, activeTab]);

  const triggerFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  const showConfirmation = (title: string, description: string, onConfirm: () => void) => {
    setConfirmDialog({
      isOpen: true,
      title,
      description,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog(null);
      }
    });
  };

  const handleConnect = async () => {
    // Start popup connection FIRST so browser trusts the event
    const connectPromise = connectGoogleWorkspace();
    setIsConnecting(true);
    try {
      const authInfo = await connectPromise;
      setIsConnected(true);
      setGoogleEmail(authInfo.email);
      triggerFeedback('success', 'تم ربط حساب Google بنجاح وتمكنت المنصة من إدماج خدمات Google Workspace!');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-closed-by-user' || err.message?.includes('closed_by_user')) {
        triggerFeedback('error', 'تم إغلاق نافذة تسجيل الدخول من قِبلك قبل إتمام العملية.');
      } else if (err.code === 'auth/cancelled-popup-request' || err.message?.includes('cancelled-popup-request')) {
        triggerFeedback('error', 'تم إلغاء طلب تسجيل الدخول (نافذة منبثقة متداخلة). يرجى المحاولة مرة أخرى.');
      } else if (err.code === 'auth/popup-blocked' || err.message?.includes('popup-blocked')) {
        triggerFeedback('error', 'تم حظر النافذة المنبثقة من قبل متصفحك. يرجى السماح بالنوافذ المنبثقة أو فتح التطبيق في علامة تبويب جديدة.');
      } else if (err.code === 'auth/network-request-failed' || err.message?.includes('network-request-failed')) {
        triggerFeedback('error', 'فشل الاتصال بالشبكة. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.');
      } else {
        triggerFeedback('error', err.message || 'فشل تكوين الاتصال بحساب Google.');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    showConfirmation(
      'إلغاء ربط حساب Google؟',
      'سيتم إيقاف تشغيل الأدوات ورموز الوصول المخزنة مؤقتاً في الذاكرة لفصل اتصال Google Workspace بالكامل.',
      () => {
        disconnectGoogleWorkspace();
        setIsConnected(false);
        setGoogleEmail(null);
        setTasks([]);
        setEmails([]);
        setContacts([]);
        setExportedSheet(null);
        setCreatedMeet(null);
        triggerFeedback('success', 'تم إلغاء الاتصال وفصل صلاحيات الحساب بنجاح.');
      }
    );
  };

  // 1. Google Tasks Operations
  async function loadTasks() {
    setIsLoadingTasks(true);
    try {
      const data = await fetchTasks();
      setTasks(data);
    } catch (err: any) {
      triggerFeedback('error', err.message);
    } finally {
      setIsLoadingTasks(false);
    }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    try {
      const newlyCreated = await createTask(newTaskTitle, newTaskNotes);
      setTasks(prev => [newlyCreated, ...prev]);
      setNewTaskTitle('');
      setNewTaskNotes('');
      triggerFeedback('success', 'تم إنشاء المهمة بنجاح في حسابك بـ Google Tasks!');
    } catch (err: any) {
      triggerFeedback('error', err.message);
    }
  };

  const handleToggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const nextCompleted = currentStatus !== 'completed';
    // Optimistic Update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: nextCompleted ? 'completed' : 'needsAction' } : t));
    try {
      await updateTaskStatus(taskId, nextCompleted);
    } catch (err: any) {
      // Revert in case of API error
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: currentStatus as any } : t));
      triggerFeedback('error', err.message);
    }
  };

  const handleDeleteTaskItem = async (taskId: string, taskTitle: string) => {
    showConfirmation(
      'حذف هذه المهمة نهائياً؟',
      `هل تريد حذف المهمة "${taskTitle}" من حساب Google Tasks الخاص بك؟ لا يمكن التراجع عن هذا الإجراء.`,
      async () => {
        try {
          await deleteTask(taskId);
          setTasks(prev => prev.filter(t => t.id !== taskId));
          triggerFeedback('success', 'تم حذف المهمة المحددة من جدول Google Tasks بنجاح.');
        } catch (err: any) {
          triggerFeedback('error', err.message);
        }
      }
    );
  };

  // 2. Google Sheets Operations
  const handleExportGrades = async () => {
    if (submissions.length === 0) {
      triggerFeedback('error', 'لا توجد درجات أو نتائج اختبارات لتصديرها حالياً.');
      return;
    }

    setIsExporting(true);
    try {
      const title = `سجل درجات الطالب - ${user?.fullName || 'الحكاية'} (${new Date().toLocaleDateString('ar-EG')})`;
      const headers = ['تاريخ الاختبار', 'عنوان الاختبار', 'درجة الطالب', 'الدرجة الكلية', 'حالة التصحيح'];
      const rows = submissions.map(s => [
        new Date(s.date).toLocaleDateString('ar-EG'),
        s.assessmentTitle || '',
        s.finalScore.toString(),
        s.maxScore.toString(),
        s.status === 'completed' ? 'تَم التصحيح' : 'غير مكتمل'
      ]);

      const result = await exportToGoogleSheets(title, headers, rows);
      setExportedSheet({ title: result.title, url: result.spreadsheetUrl });
      triggerFeedback('success', 'رائع! تم إنشاء جدول البيانات وكتابة سجل الدرجات كاملاً بنجاح.');
    } catch (err: any) {
      triggerFeedback('error', err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // 3. Gmail Operations
  async function loadEmails() {
    setIsLoadingEmails(true);
    try {
      const list = await fetchEmails();
      setEmails(list);
    } catch (err: any) {
      triggerFeedback('error', err.message);
    } finally {
      setIsLoadingEmails(false);
    }
  }

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendToEmail.trim() || !sendSubject.trim() || !sendBodyText.trim()) {
      triggerFeedback('error', 'يرجى ملء جميع الحقول المطلوبة لإرسال الرسالة.');
      return;
    }

    showConfirmation(
      'تأكيد إرسال البريد الإلكتروني',
      `هل أنت متأكد من رغبتك في إرسال هذا البريد إلى "${sendToEmail}" باسمك عبر Gmail المصرح؟`,
      async () => {
        setIsSendingEmail(true);
        try {
          await sendEmail(sendToEmail, sendSubject, sendBodyText);
          setSendToEmail('');
          setSendSubject('');
          setSendBodyText('');
          triggerFeedback('success', 'تهانينا! تم إرسال البريد الإلكتروني بنجاح من صندوق Gmail المتصل.');
        } catch (err: any) {
          triggerFeedback('error', err.message);
        } finally {
          setIsSendingEmail(false);
        }
      }
    );
  };

  // 4. Google Meet Operations
  const handleCreateMeet = async () => {
    setIsCreatingMeet(true);
    try {
      const meet = await createGoogleMeetCode(meetTitle);
      setCreatedMeet({ url: meet.meetingUrl, code: meet.meetingCode });
      triggerFeedback('success', 'تم توليد رابط لقاء مرئي ومزامنته بـ Google Calendar بنجاح!');
    } catch (err: any) {
      triggerFeedback('error', err.message);
    } finally {
      setIsCreatingMeet(false);
    }
  };

  // 5. Contacts Operations
  async function loadContacts() {
    setIsLoadingContacts(true);
    try {
      const data = await fetchGoogleContacts();
      setContacts(data);
    } catch (err: any) {
      triggerFeedback('error', err.message);
    } finally {
      setIsLoadingContacts(false);
    }
  }

  // 6. Local Keep Note Pad Operations
  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim()) return;

    const added: StickyNote = {
      id: `local-note-${Date.now()}`,
      title: newNoteTitle,
      content: newNoteContent,
      color: newNoteColor,
      createdAt: new Date().toISOString()
    };

    setStickyNotes(prev => [added, ...prev]);
    setNewNoteTitle('');
    setNewNoteContent('');
    triggerFeedback('success', 'تم حفظ الملاحظة الجديدة في مذكرتك الكرتونية المحلية!');
  };

  const handleDeleteNote = (noteId: string, noteTitle: string) => {
    showConfirmation(
      'أنت على وشك حذف ملاحظتك الكرتونية',
      `هل تود حذف المذكرى "${noteTitle}"؟ الإجراء محلي تماماً وسيحذفها من متصفحك.`,
      () => {
        setStickyNotes(prev => prev.filter(n => n.id !== noteId));
        triggerFeedback('success', 'تم إقصاء الملاحظة بنجاح.');
      }
    );
  };

  const handleBackupNotesToTasks = async () => {
    if (stickyNotes.length === 0) {
      triggerFeedback('error', 'لا تتوفر أي ملاحظات محلية لنسخها احتياطياً.');
      return;
    }

    showConfirmation(
      'تصدير الملاحظات لـ Google Tasks',
      `سيتم إضافتها كـ ${stickyNotes.length} مهمة غير منجزة في حسابك بـ Google Tasks لعدم ضياعها. موافق؟`,
      async () => {
        for (const note of stickyNotes) {
          try {
            await createTask(`[ملاحظة] - ${note.title}`, note.content);
          } catch (err) {
            console.error('Notes backup err on note: ', note.title, err);
          }
        }
        triggerFeedback('success', 'اكتمل النسخ الاحتياطي! تم تصدير كافة الملاحظات الكرتونية بنجاح كمهام عمل.');
      }
    );
  };

  const filteredNotes = stickyNotes.filter(n => {
    const qLower = searchNotesQuery.toLowerCase();
    return n.title.toLowerCase().includes(qLower) || n.content.toLowerCase().includes(qLower);
  });

  if (user && user.role === 'student' && !user.code?.toUpperCase().startsWith('S')) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-brand-cream/30">
        <div className="bg-white p-8 rounded-[32px] shadow-xl text-center max-w-sm">
          <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-black text-brand-text mb-2">غير مصرح لك بالدخول</h2>
          <p className="text-sm font-bold text-brand-text/60 mb-6">هذه الصفحة متاحة فقط للخدام والمسؤولين.</p>
          <a href="/student" className="inline-flex py-3 px-6 bg-brand-red text-white text-sm font-black rounded-xl hover:bg-brand-red/90 transition-all">
            عودة للصفحة الرئيسية
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-10 space-y-8 bg-brand-cream/10 min-h-screen text-right" dir="rtl">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-brand-red to-orange-600 rounded-[35px] text-white p-8 lg:p-12 shadow-xl shadow-brand-red/10 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <span className="bg-white/20 text-white rounded-full px-4 py-1 text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5" />
              أدوات Google Workspace المتكاملة
            </span>
            <h1 className="text-3xl lg:text-4xl font-black tracking-tight leading-normal">
              بوابة إنجاز العمل والدراسة الرقمية
            </h1>
            <p className="text-white/80 max-w-xl font-medium text-sm lg:text-base">
              هنا تجتمع كفاءة Google Workspace بجمال المنصة التعليمية لـ «الحكاية ومافيها» لتنعم ببيئة دراسية احترافية وتنظيم مثالي لمهام الخدمة والدراسة اليومية.
            </p>
          </div>
          
          <div className="shrink-0">
            {isConnected ? (
              <div className="flex flex-col items-stretch gap-2 bg-black/20 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-xs truncate font-bold text-white max-w-[200px]" title={googleEmail || ''}>
                    {googleEmail ? `متصل: ${googleEmail}` : 'متصل بنجاح'}
                  </p>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="mt-2 text-[10px] w-full bg-white/20 hover:bg-rose-600 hover:text-white transition-all text-white font-black py-2 rounded-xl flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-3 h-3" />
                  إلغاء ربط الحساب
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="gsi-material-button shadow-lg shadow-black/5 hover:translate-y-[-1px] transition-all duration-300"
              >
                <div className="gsi-material-button-state"></div>
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents font-black text-xs text-slate-800">
                    {isConnecting ? 'جاري ربط حسابك بـ Google...' : 'ربط حساب Google'}
                  </span>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Real-time Toast feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`p-4 rounded-2xl flex items-center gap-3 shadow-md border ${
              feedback.type === 'success' 
              ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
              : 'bg-rose-50 border-rose-100 text-rose-800'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <p className="text-sm font-bold">{feedback.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs list */}
      <div className="flex flex-wrap gap-2.5 border-b border-brand-beige/10 pb-4">
        {[
          { id: 'tasks', name: 'Google Tasks (المهام)', icon: CheckSquare },
          { id: 'sheets', name: 'Google Sheets (الدرجات)', icon: FileText },
          { id: 'gmail', name: 'Gmail (البريد الدراسي)', icon: Mail },
          { id: 'meet', name: 'Google Meet (اللقاءات المرئية)', icon: Video },
          { id: 'contacts', name: 'Contacts (جهات الاتصال)', icon: Users },
          { id: 'keep', name: 'Keep Notes (مفكرة كرتونية)', icon: Notebook }
        ].map(tab => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3.5 rounded-2xl text-[13px] font-black tracking-tight leading-none transition-all duration-300 ${
                isSelected 
                ? 'bg-brand-red text-white shadow-xl shadow-brand-red/10'
                : 'bg-white border border-brand-beige/10 text-brand-beige hover:bg-brand-cream/50 hover:text-brand-text'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="bg-white p-6 lg:p-8 rounded-[40px] border border-brand-beige/10 shadow-sm min-h-[400px]">
        
        {/* If Google is disconnected (except for keep section which works offline/local) */}
        {!isConnected && activeTab !== 'keep' ? (
          <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center border border-amber-200 text-amber-600">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-brand-text">يتطلب الاتصال بـ Google</h3>
            <p className="text-brand-beige font-medium text-sm max-w-md">
              للوصول لقائمتك الخاصة بالمهام وتصدير الدرجات لجدول البيانات وقراءة Gmail وتوليد روابط Meet، يرجى النقر على زر "ربط حساب Google" بالأعلى وتصريح الأوامر.
            </p>
            <button
              onClick={handleConnect}
              className="px-6 py-3 bg-brand-red text-white rounded-2xl font-black text-xs hover:bg-brand-red/90 transition-all flex items-center gap-2 mt-2"
            >
              <Sparkles className="w-4 h-4" />
              ربط حساب Google الآن
            </button>
          </div>
        ) : (
          <div>
            
            {/* TAB 1: Google Tasks */}
            {activeTab === 'tasks' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-beige/5 pb-4">
                  <div>
                    <h2 className="text-2xl font-black text-brand-text">قائمة المهام الدراسية (Google Tasks)</h2>
                    <p className="text-[11px] font-bold text-brand-beige mt-1">تزامن حي ومباشر مع تطبيق Google Tasks في جهازك الشخصي لتتبع فروض برنامج الحكاية ومافيها.</p>
                  </div>
                  <button 
                    onClick={loadTasks} 
                    disabled={isLoadingTasks}
                    className="flex items-center gap-2 bg-brand-cream text-brand-text hover:bg-brand-cream/80 px-4 py-2 rounded-xl text-xs font-black transition-all"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTasks ? 'animate-spin' : ''}`} />
                    تحديث القائمة
                  </button>
                </div>

                {/* Add New Task Form */}
                <form onSubmit={handleCreateTask} className="bg-brand-cream/20 p-5 rounded-3xl border border-brand-beige/10 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="space-y-2 md:col-span-1">
                    <label className="text-xs font-black text-brand-text">عنوان المهمة</label>
                    <input
                      type="text"
                      required
                      value={newTaskTitle}
                      onChange={e => setNewTaskTitle(e.target.value)}
                      placeholder="مثال: مراجعة اختبار كنيسة عهد قديم"
                      className="w-full bg-white border border-brand-beige/10 rounded-xl px-4 py-2.5 text-xs font-medium text-right outline-none focus:border-brand-red transition-all"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-1">
                    <label className="text-xs font-black text-brand-text">ملاحظات إضافية (اختياري)</label>
                    <input
                      type="text"
                      value={newTaskNotes}
                      onChange={e => setNewTaskNotes(e.target.value)}
                      placeholder="تفاصيل حول مراجع الدراسة والفصول..."
                      className="w-full bg-white border border-brand-beige/10 rounded-xl px-4 py-2.5 text-xs font-medium text-right outline-none focus:border-brand-red transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-brand-red text-white py-3 px-6 rounded-xl font-black text-xs hover:bg-brand-red/90 transition-all flex items-center justify-center gap-2 shrink-0 md:col-span-1"
                  >
                    <Plus className="w-4 h-4" />
                    إضافة المهمة للحساب
                  </button>
                </form>

                {/* Tasks List */}
                {isLoadingTasks ? (
                  <div className="text-center py-12 text-brand-beige font-black animate-pulse">جاري سحب مهامك الدراسية من خوادم Google...</div>
                ) : tasks.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-[30px] border border-dashed border-slate-200">
                    <CheckSquare className="w-12 h-12 text-brand-beige mx-auto mb-2 opacity-40" />
                    <p className="text-slate-600 font-bold text-sm">لا تتوفر أي مهام نشطة حالياً.</p>
                    <p className="text-slate-400 font-medium text-[11px] mt-1">ابدأ يومك بنشاط وأضف مهامك لتسوية جدول دراستك مع الخدمة!</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {tasks.map(task => {
                      const isCompleted = task.status === 'completed';
                      return (
                        <div
                          key={task.id}
                          className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                            isCompleted 
                            ? 'bg-slate-50 border-slate-100 opacity-60' 
                            : 'bg-white border-brand-beige/10 shadow-sm hover:border-brand-beige/30'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleToggleTaskStatus(task.id, task.status)}
                              className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                                isCompleted 
                                ? 'bg-emerald-500 border-emerald-600 text-white' 
                                : 'bg-white border-brand-beige hover:border-brand-red text-transparent'
                              }`}
                            >
                              <Check className="w-4 h-4 stroke-[3]" />
                            </button>
                            <div className="text-right">
                              <p className={`text-xs font-black ${isCompleted ? 'line-through text-slate-400' : 'text-brand-text'}`}>
                                {task.title}
                              </p>
                              {task.notes && (
                                <p className="text-[10px] text-brand-beige mt-0.5 font-medium">{task.notes}</p>
                              )}
                            </div>
                          </div>
                          
                          <button
                            onClick={() => handleDeleteTaskItem(task.id, task.title)}
                            className="p-2 text-brand-beige hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            title="حذف المهمة نهائياً"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Google Sheets */}
            {activeTab === 'sheets' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-brand-text">تصدير سجل الدرجات إلى Google Sheets</h2>
                  <p className="text-[11px] font-bold text-brand-beige mt-1">يمكنك تصدير إنجازاتك الدراسية وسجلات ونتائج اختباراتك التاريخية في غضون ثوانٍ لمستند Google Sheets لحفظ تفوقك!</p>
                </div>

                <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <h3 className="font-black text-emerald-900 text-sm">عدد تقارير الاختبارات الجاهزة للتصدير حالياً: {submissions.length} تقارير</h3>
                    <p className="text-emerald-700/80 font-medium text-xs leading-relaxed max-w-xl">
                      سيقوم هذا الإكسبرت ببرمجة وبناء جدول بيانات Sheets حديث في الحفصة السحابية خاصتك وتوزيع جدول مفصل للأعمدة (عنوان الاختبار، تاريخ التسليم، الدرجة، حالة المراجعة) بشكل منسق واحترافي.
                    </p>
                  </div>
                  
                  <button
                    onClick={handleExportGrades}
                    disabled={isExporting || submissions.length === 0}
                    className="shrink-0 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/10"
                  >
                    <RefreshCw className={`w-4 h-4 ${isExporting ? 'animate-spin' : ''}`} />
                    تصدير سجل الدرجات كجدول بيانات
                  </button>
                </div>

                {exportedSheet && (
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="p-5 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-3xl shadow-lg shadow-emerald-500/10 flex flex-col sm:flex-row items-center justify-between gap-4"
                  >
                    <div className="space-y-1 text-center sm:text-right">
                      <h4 className="font-black text-sm">تم إنشاء جدول البيانات السحابي بنجاح! 🎉</h4>
                      <p className="text-white/80 font-medium text-xs leading-none">{exportedSheet.title}</p>
                    </div>
                    <a
                      href={exportedSheet.url}
                      target="_blank"
                      referrerPolicy="no-referrer"
                      rel="noopener noreferrer"
                      className="px-5 py-2.5 bg-white text-emerald-600 font-black text-xs rounded-xl flex items-center gap-1.5 hover:bg-emerald-50 transition-all shadow-md"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      فتح ومراجعة المستند في نافذة جديدة
                    </a>
                  </motion.div>
                )}

                <div className="border border-brand-beige/10 rounded-[30px] overflow-hidden">
                  <div className="bg-brand-cream/40 p-4 border-b border-brand-beige/5">
                    <p className="font-black text-xs text-brand-text">معاينة النتائج الحالية القابلة للتصدير</p>
                  </div>
                  <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                    {submissions.length === 0 ? (
                      <div className="text-center py-8 text-brand-beige font-bold text-xs">لا تتوفر نتائج اختبارات مسجلة لك بالأرشيف حالياً للتصدير.</div>
                    ) : (
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className="bg-brand-cream/20 text-brand-beige border-b border-brand-beige/5">
                            <th className="p-3 font-black">الاختبار</th>
                            <th className="p-3 font-black text-center">التاريخ</th>
                            <th className="p-3 font-black text-center">الدرجة</th>
                            <th className="p-3 font-black text-center">الحالة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {submissions.map(s => (
                            <tr key={s.id} className="border-b border-brand-beige/5 hover:bg-brand-cream/10">
                              <td className="p-3 font-black text-brand-text">{s.assessmentTitle}</td>
                              <td className="p-3 font-medium text-brand-beige text-center">{new Date(s.date).toLocaleDateString('ar-EG')}</td>
                              <td className="p-3 font-mono font-bold text-brand-red text-center">{s.finalScore} / {s.maxScore}</td>
                              <td className="p-3 text-center">
                                <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-black ${s.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                  {s.status === 'completed' ? 'تم التصحيح' : 'قيد المراجعة'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Gmail */}
            {activeTab === 'gmail' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-brand-text">صندوق البريد الدراسي (Gmail API)</h2>
                  <p className="text-[11px] font-bold text-brand-beige mt-1">تزامن لإرسال رسائل أو قراءة مستجدات البريد الإلكتروني المتصل لتلقي المراسلات والدعم الفني.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  
                  {/* Read Emails Panel */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-brand-beige/5 pb-2">
                      <p className="font-black text-sm text-brand-text">أحدث الرسائل الواردة</p>
                      <button onClick={loadEmails} disabled={isLoadingEmails} className="p-1 px-2.5 bg-brand-cream text-brand-text text-[10px] rounded-lg font-black leading-none hover:bg-brand-cream/80 transition-all">
                        تحديث
                      </button>
                    </div>

                    {isLoadingEmails ? (
                      <div className="text-center py-12 text-brand-beige font-black animate-pulse">جاري سحب أحدث الرسائل...</div>
                    ) : emails.length === 0 ? (
                      <div className="text-center py-12 bg-slate-50 rounded-3xl text-sm font-bold text-slate-500">لا تتوفر رسائل واردة حديثة.</div>
                    ) : (
                      <div className="space-y-2.5 max-h-[350px] overflow-y-auto custom-scrollbar">
                        {emails.map(email => (
                          <div key={email.id} className="p-4 rounded-2xl bg-brand-cream/10 border border-brand-beige/5 space-y-1.5 hover:border-brand-beige/20 transition-all">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-black text-xs text-brand-text truncate max-w-[150px]" title={email.from}>{email.from}</p>
                              <p className="text-[9px] font-bold text-brand-beige font-mono shrink-0">{email.date}</p>
                            </div>
                            <h4 className="font-black text-xs text-brand-red truncate">{email.subject}</h4>
                            <p className="text-[10px] text-zinc-500 line-clamp-2 leading-relaxed" title={email.snippet}>{email.snippet}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Send Email Panel */}
                  <form onSubmit={handleSendEmail} className="bg-brand-cream/20 p-5 rounded-3xl border border-brand-beige/10 space-y-4">
                    <p className="font-black text-sm text-brand-text border-b border-brand-beige/5 pb-2">إرسال بريد إلكتروني فوري</p>
                    
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-brand-text">البريد المرسل إليه (الراسل)</label>
                      <input
                        type="email"
                        required
                        value={sendToEmail}
                        onChange={e => setSendToEmail(e.target.value)}
                        placeholder="example@gmail.com"
                        className="w-full bg-white border border-brand-beige/10 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-left outline-none focus:border-brand-red transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-brand-text">موضوع الرسالة</label>
                      <input
                        type="text"
                        required
                        value={sendSubject}
                        onChange={e => setSendSubject(e.target.value)}
                        placeholder="مثل: استفسار حول نتيجة اختبار العهد الجديد"
                        className="w-full bg-white border border-brand-beige/10 rounded-xl px-4 py-2.5 text-xs font-semibold outline-none focus:border-brand-red transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-brand-text">محتوى البريد</label>
                      <textarea
                        required
                        rows={4}
                        value={sendBodyText}
                        onChange={e => setSendBodyText(e.target.value)}
                        placeholder="اكتب هنا كافة التفاصيل والأسئلة الخاصة بك وسيقوم النظام بتوجيهها من صندوق بريدك المصرح به..."
                        className="w-full bg-white border border-brand-beige/10 rounded-2xl p-4 text-xs font-medium outline-none focus:border-brand-red transition-all leading-normal text-right resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSendingEmail}
                      className="w-full py-3 bg-brand-red hover:bg-brand-red/90 disabled:opacity-50 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-red/10 animate-pulse-once"
                    >
                      <Send className="w-3.5 h-3.5" />
                      إرسال الرسالة الآن عبر Gmail
                    </button>
                  </form>

                </div>
              </div>
            )}

            {/* TAB 4: Google Meet */}
            {activeTab === 'meet' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-brand-text">اللقاءات المرئية الحية (Google Meet API)</h2>
                  <p className="text-[11px] font-bold text-brand-beige mt-1">توليد وانضمام سريع للقاء المرئي الافتراضي ومزامنته بـ Calendar لمناقشة مراجعة الأسئلة الصعبة أو المحاضرات والدروس.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  
                  {/* Setup Panel */}
                  <div className="bg-brand-cream/20 p-6 rounded-3xl border border-brand-beige/10 space-y-4">
                    <p className="font-black text-sm text-brand-text border-b border-brand-beige/5 pb-2">تجهيز ومزامنة لقاء مرئي</p>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-black text-zinc-700">عنوان اللقاء أو الدرس</label>
                      <input
                        type="text"
                        required
                        value={meetTitle}
                        onChange={e => setMeetTitle(e.target.value)}
                        className="w-full bg-white border border-brand-beige/10 rounded-xl px-4 py-3 text-xs font-semibold outline-none focus:border-brand-red transition-all text-right"
                      />
                    </div>

                    <p className="text-[10px] text-brand-beige leading-relaxed font-bold">
                      عند النقر على إطلاق، سيقوم التطبيق بإنشاء حدث رسمي في تقويمك وإدماج رباط فيديو «Google Meet» ديناميكي وحي، لتتمكن من مشاركته مع أصدقائك أو معلمك.
                    </p>

                    <button
                      onClick={handleCreateMeet}
                      disabled={isCreatingMeet}
                      className="w-full py-3 bg-brand-red px-6 rounded-xl text-white font-black text-xs hover:bg-brand-red/90 transition-all flex items-center justify-center gap-2"
                    >
                      <RefreshCw className={`w-4 h-4 ${isCreatingMeet ? 'animate-spin' : ''}`} />
                      إطلاق لقاء مرئي فوري
                    </button>
                  </div>

                  {/* Results Panel */}
                  <div className="flex flex-col items-center justify-center border border-dashed border-brand-beige/30 p-12 rounded-[35px] min-h-[250px] text-center">
                    {createdMeet ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-4"
                      >
                        <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                          <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <h3 className="font-black text-brand-text text-lg">جاهز للانضمام! 🎥</h3>
                        <p className="text-zinc-500 font-bold text-xs">{meetTitle}</p>
                        
                        <div className="bg-brand-cream p-3 rounded-xl font-mono text-xs font-black select-all inline-block border border-brand-beige/10 text-brand-text">
                          رمز اللقاء: {createdMeet.code}
                        </div>
                        
                        <div className="flex gap-2 justify-center">
                          <a
                            href={createdMeet.url}
                            target="_blank"
                            referrerPolicy="no-referrer"
                            rel="noopener noreferrer"
                            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-600/10"
                          >
                            <ExternalLink className="w-4 h-4" />
                            دخول الغرفة الصوتية مرئي والدخول
                          </a>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="text-zinc-400 space-y-2">
                        <Video className="w-12 h-12 stroke-[1.5] mx-auto opacity-30 text-brand-red mb-1" />
                        <h4 className="font-black text-brand-text text-sm">لم يتم تكوين اجتماع بعد</h4>
                        <p className="text-[10px] text-brand-beige font-medium max-w-xs">اضبط عنوان المحاضرة بالنظام المالي وانقر "إطلاق" لتفعيل مؤتمر Google Meet السحابي.</p>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}

            {/* TAB 5: Contacts */}
            {activeTab === 'contacts' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-beige/5 pb-4">
                  <div>
                    <h2 className="text-2xl font-black text-brand-text">دليل جهات اتصال الخدمة والفصل (Contacts API)</h2>
                    <p className="text-[11px] font-bold text-brand-beige mt-1">تصفح جهات اتصال Google المسجلة لاستكشاف زملاء الفصل أو مدرسي برنامج الحكاية للتواصل معهم في أي وقت بمرونة.</p>
                  </div>
                  <button 
                    onClick={loadContacts} 
                    disabled={isLoadingContacts}
                    className="flex items-center gap-2 bg-brand-cream text-brand-text hover:bg-brand-cream/80 px-4 py-2 rounded-xl text-xs font-black transition-all"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingContacts ? 'animate-spin' : ''}`} />
                    تحديث الدليل
                  </button>
                </div>

                <div className="relative">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-beige" />
                  <input
                    type="text"
                    value={contactsSearchTerm}
                    onChange={(e) => setContactsSearchTerm(e.target.value)}
                    placeholder="ابحث بالاسم أو البريد الإلكتروني أو رقم الهاتف..."
                    className="w-full bg-white border border-brand-beige/20 focus:border-brand-red rounded-xl py-3 pr-12 pl-4 outline-none transition-all font-bold text-sm text-brand-text"
                  />
                </div>

                {isLoadingContacts ? (
                  <div className="text-center py-12 text-brand-beige font-black animate-pulse">جاري جلب قائمة جهات الاتصال الخاصة بك...</div>
                ) : contacts.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-[30px] border border-dashed border-slate-200">
                    <Users className="w-12 h-12 text-zinc-300 mx-auto mb-2" />
                    <p className="text-slate-600 font-bold text-sm">الدليل فارغ حالياً.</p>
                    <p className="text-slate-400 font-medium text-[10px] mt-1">لم نعثر على جهات اتصال مسجلة بحساب Google المرتبط، أو يرجى منح إذن القراءة المناسب.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto custom-scrollbar p-1">
                    {contacts.filter(c => 
                      c.name.toLowerCase().includes(contactsSearchTerm.toLowerCase()) || 
                      (c.email && c.email.toLowerCase().includes(contactsSearchTerm.toLowerCase())) || 
                      (c.phone && c.phone.includes(contactsSearchTerm))
                    ).map((c, idx) => (
                      <div key={idx} className="p-4 rounded-2xl bg-white border border-brand-beige/10 hover:border-brand-beige/30 hover:shadow-md transition-all flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 font-black text-sm flex items-center justify-center shrink-0">
                          {c.name.charAt(0)}
                        </div>
                        <div className="text-right min-w-0 flex-1">
                          <h4 className="font-black text-xs text-brand-text truncate">{c.name}</h4>
                          {c.email && (
                            <p className="text-[10px] text-brand-beige truncate font-mono">{c.email}</p>
                          )}
                          {c.phone && (
                            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{c.phone}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* TAB 6: Keep Sticky Notebook (Enterprise-bypass which works always) */}
        {activeTab === 'keep' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-beige/5 pb-4">
              <div>
                <h2 className="text-2xl font-black text-brand-text">المفكرة التعليمية الكرتونية (Keep Notes)</h2>
                <p className="text-[11px] font-bold text-brand-beige mt-1">
                  اكتب ملاحظاتك الدراسية السريعة والملخصة في مذكرات ملونة تفاعلية. نحن نوفر حلاً بديلاً ذكياً يدعم التصدير والنسخ الاحتياطي السحابي لربطه بـ Google Tasks بسهولة لحماية أفكارك!
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleBackupNotesToTasks}
                  disabled={!isConnected || stickyNotes.length === 0}
                  className="flex items-center gap-1.5 bg-brand-red text-white hover:bg-brand-red/90 disabled:opacity-50 px-4 py-2.5 rounded-xl text-xs font-black transition-all shadow-md shadow-brand-red/5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  نسخ الملاحظات لـ Google Tasks
                </button>
              </div>
            </div>

            {/* Note Creation Bar */}
            <form onSubmit={handleCreateNote} className="bg-brand-cream/10 p-5 rounded-3xl border border-brand-beige/10 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-1.5 md:col-span-1">
                <label className="text-[11px] font-black text-brand-text">عنوان الملاحظة</label>
                <input
                  type="text"
                  required
                  value={newNoteTitle}
                  onChange={e => setNewNoteTitle(e.target.value)}
                  placeholder="مثال: آية معينة للحفظ ومراجعتها"
                  className="w-full bg-white border border-brand-beige/10 rounded-xl px-4 py-2.5 text-xs font-bold text-right outline-none focus:border-brand-red transition-all"
                />
              </div>

              <div className="space-y-1.5 md:col-span-1">
                <label className="text-[11px] font-black text-brand-text">المضمون والشرح</label>
                <input
                  type="text"
                  value={newNoteContent}
                  onChange={e => setNewNoteContent(e.target.value)}
                  placeholder="الفكرة الرئيسية..."
                  className="w-full bg-white border border-brand-beige/10 rounded-xl px-4 py-2.5 text-xs font-medium text-right outline-none focus:border-brand-red transition-all"
                />
              </div>

              {/* Color Selector */}
              <div className="space-y-1.5 md:col-span-1">
                <label className="text-[11px] font-black text-brand-text">لون الورقة اللاصقة</label>
                <div className="flex gap-1.5">
                  {STICKY_COLORS.map(color => (
                    <button
                      key={color.name}
                      type="button"
                      onClick={() => setNewNoteColor(color.name)}
                      className={`w-7 h-7 rounded-lg border-2 shadow-sm transition-all ${color.bg.split(' ')[0]} ${
                        newNoteColor === color.name ? 'border-brand-red scale-110' : 'border-transparent'
                      }`}
                      title={`${color.name}`}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-brand-text text-white rounded-xl font-black text-xs hover:bg-brand-text/90 transition-all flex items-center justify-center gap-1.5 md:col-span-1"
              >
                <Plus className="w-4 h-4" />
                تعليق الورقة اللاصقة
              </button>
            </form>

            {/* Notes Visual Board */}
            <div className="space-y-4">
              <div className="relative max-w-sm ml-auto mr-0">
                <input
                  type="text"
                  value={searchNotesQuery}
                  onChange={e => setSearchNotesQuery(e.target.value)}
                  placeholder="ابحث في ملاحظاتك الكرتونية..."
                  className="w-full bg-slate-50 border border-brand-beige/10 rounded-xl pr-9 pl-4 py-2 text-xs text-right outline-none focus:bg-white"
                />
                <Search className="w-4 h-4 text-brand-beige absolute right-3 top-2.5" />
              </div>

              {filteredNotes.length === 0 ? (
                <div className="text-center py-16 bg-brand-cream/5 rounded-[40px] border border-dashed border-brand-beige/15 text-zinc-400">
                  <Notebook className="w-12 h-12 text-brand-beige/30 mx-auto mb-2" />
                  <p className="font-bold text-sm">مفكرتك الشخصية فارغة للتو.</p>
                  <p className="text-[10px] text-brand-beige font-medium mt-1">املأ النموذج ورتب أوراقك اللاصقة بالأهداف الدينية والخدماتية!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  <AnimatePresence>
                    {filteredNotes.map(note => {
                      const colorObj = STICKY_COLORS.find(c => c.name === note.color) || STICKY_COLORS[0];
                      return (
                        <motion.div
                          key={note.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className={`p-5 rounded-2xl border aspect-square flex flex-col justify-between shadow-sm relative overflow-hidden group hover:shadow-md transition-all ${colorObj.bg}`}
                        >
                          <div className="space-y-2 text-right">
                            <h4 className="font-black text-sm tracking-tight border-b border-black/5 pb-1 select-all">{note.title}</h4>
                            <p className="text-xs font-medium leading-relaxed select-all line-clamp-4">{note.content}</p>
                          </div>
                          
                          <div className="flex justify-between items-center border-t border-black/5 pt-2 mt-4">
                            <span className="text-[8px] font-bold text-black/40 font-mono">
                              {new Date(note.createdAt).toLocaleDateString('ar-EG')}
                            </span>
                            <button
                              onClick={() => handleDeleteNote(note.id, note.title)}
                              className="p-1.5 rounded-lg text-black/40 hover:text-rose-600 hover:bg-black/5 transition-all"
                              title="حذف الورقة اللاصقة"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Confirmation modal dialog (satisfied custom confirm) */}
      <AnimatePresence>
        {confirmDialog && confirmDialog.isOpen && (
          <div className="fixed inset-0 bg-brand-text/70 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-6 rounded-[35px] border border-brand-beige/10 max-w-md w-full text-right shadow-2xl space-y-5"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0 border border-amber-200">
                  <AlertTriangle className="w-5 h-5 animate-pulse" />
                </div>
                <h3 className="font-black text-brand-text text-base">{confirmDialog.title}</h3>
              </div>
              
              <p className="text-brand-beige font-medium text-xs leading-relaxed">
                {confirmDialog.description}
              </p>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="px-5 py-2.5 bg-brand-cream/50 text-zinc-700 hover:bg-brand-cream text-xs font-black rounded-xl transition-all"
                >
                  إلغاء التراجع
                </button>
                <button
                  onClick={confirmDialog.onConfirm}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-rose-600/10"
                >
                  نعم، موافق
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
