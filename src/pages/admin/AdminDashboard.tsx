import { useState, useEffect, useMemo } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  addDoc,
  getDocs,
  where,
  writeBatch,
  updateDoc,
  limit,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { Assessment, Submission, User } from "../../types";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { 
  Plus, 
  Users, 
  Trash2, 
  Edit, 
  ExternalLink, 
  Copy, 
  CheckCircle, 
  Search, 
  Archive, 
  Power, 
  AlertTriangle, 
  CopyCheck, 
  Church, 
  Loader2, 
  Bell, 
  Send,
  BookOpen,
  History,
  ArrowRight,
  ClipboardCheck,
  Star,
  X,
  Award
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { formatDate, cn } from "../../lib/utils";
import { useAuth } from "../../hooks/useAuth";
import { SmartImage } from "../../components/ui/SmartImage";
import NotificationBell from "../../components/ui/NotificationBell";
import { notificationService } from "../../lib/notificationService";
import { useTranslation } from "react-i18next";

export default function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  
  const isAuthorizedCreator = isAdmin || user?.isExamCreator === true;
  const isListView = location.pathname === "/admin/assessments";
  
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<Submission[]>([]);
  const [userPhotos, setUserPhotos] = useState<Record<string, string>>({});
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSubmissions: 0,
    activeAssessments: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastData, setBroadcastData] = useState({ 
    title: "", 
    message: "", 
    type: "info" as any,
    targetGroups: [] as string[]
  });
  const [isSending, setIsSending] = useState(false);

  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "draft" | "archived"
  >("all");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    title: string;
    hasSubmissions: boolean;
  } | null>(null);
  const [deleteVerification, setDeleteVerification] = useState("");
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([]);
  const [allAttendances, setAllAttendances] = useState<any[]>([]);
  const [allPurchases, setAllPurchases] = useState<any[]>([]);
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [isPointsDataLoading, setIsPointsDataLoading] = useState(false);

  const openReminder = (assessment: Assessment) => {
    setBroadcastData({
      title: t('adminDashboard.reminder_title', { title: assessment.title }),
      message: t('adminDashboard.reminder_msg'),
      type: "warning",
      targetGroups: assessment.targetGroup ? [assessment.targetGroup] : ["all"]
    });
    setShowBroadcast(true);
  };

  useEffect(() => {
    if (!isAuthorizedCreator) return;

    // Load Assessments
    const q = query(
      collection(db, "assessments"),
      orderBy("createdAt", "desc"),
    );
    const unsubscribeAssessments = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Assessment,
        );
        setAssessments(data);
        setStats(prev => ({
          ...prev,
          activeAssessments: data.filter(a => a.status === 'active').length
        }));
        setIsLoading(false);
      },
      (error) => {
        console.error("Failed to load assessments:", error);
        setIsLoading(false);
      }
    );

    // Load Stats if not in list view (Overview mode)
    if (!isListView) {
      // Total Users (Students only)
      const usersQ = query(collection(db, "users"), where("role", "==", "student"));
      const unsubscribeUsers = onSnapshot(
        usersQ,
        (snap) => {
          const students = snap.docs.map(d => ({ uid: d.id, ...d.data() } as User));
          setAllStudents(students);
          
          const photoMap: Record<string, string> = {};
          snap.forEach(doc => {
            const data = doc.data() as any;
            if (data.photoUrl) photoMap[doc.id] = data.photoUrl;
          });
          setUserPhotos(photoMap);

          setStats(prev => ({ ...prev, totalUsers: snap.size }));
        },
        (error) => {
          console.warn("Failed to load users:", error);
        }
      );

      // Fetch submissions for points and stats
      const unsubscribeSubs = onSnapshot(
        query(collection(db, "submissions"), orderBy("date", "desc")),
        (snap) => {
          const subs = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Submission);
          setAllSubmissions(subs); 
          setRecentSubmissions(subs.slice(0, 5));
          setStats(prev => ({ ...prev, totalSubmissions: snap.size }));
        },
        (error) => {
          console.warn("Failed to load submissions:", error);
        }
      );

      const unsubscribeAtt = onSnapshot(
        query(collection(db, "attendance")),
        (snap) => {
          const atts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setAllAttendances(atts);
        },
        (error) => {
          console.warn("Failed to load attendance:", error);
        }
      );

      const unsubscribePur = onSnapshot(
        query(collection(db, "purchases")),
        (snap) => {
          const purs = snap.docs.map(d => ({ id: d.id, ...d.data() }) as any);
          setAllPurchases(purs);
        },
        (error) => {
          console.warn("Failed to load purchases:", error);
        }
      );

      const unsubscribeLogs = onSnapshot(
        query(collection(db, "pointLogs")),
        (snap) => {
          const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setAllLogs(logs);
        },
        (error) => {
          console.warn("Failed to load point logs:", error);
        }
      );

      return () => {
        unsubscribeAssessments();
        unsubscribeUsers();
        unsubscribeSubs();
        unsubscribeAtt();
        unsubscribePur();
        unsubscribeLogs();
      };
    }

    return () => unsubscribeAssessments();
  }, [isAuthorizedCreator, isListView]);

  const computedPoints = useMemo(() => {
    const examPoints = allSubmissions.reduce((acc, curr) => acc + (curr.finalScore ?? (curr as any).score ?? curr.baseScore ?? 0), 0);
    const attPoints = allAttendances.reduce((acc, curr) => acc + (curr.points || 0), 0);
    const purPoints = allPurchases.reduce((acc, curr) => acc + (curr.pricePaid ?? curr.price ?? curr.totalPrice ?? 0), 0);
    return Math.max(0, examPoints + attPoints - purPoints);
  }, [allSubmissions, allAttendances, allPurchases]);

  const handleDeleteInitial = async (assessment: Assessment) => {
    // Check if it has submissions
    const subQ = query(
      collection(db, "submissions"),
      where("assessmentId", "==", assessment.id),
    );
    const subSnap = await getDocs(subQ);
    setDeleteConfirm({
      id: assessment.id!,
      title: assessment.title,
      hasSubmissions: !subSnap.empty,
    });
  };

  const executeDelete = async (withId: string, clearSubmissions: boolean) => {
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, "assessments", withId));

      if (clearSubmissions) {
        const subQ = query(
          collection(db, "submissions"),
          where("assessmentId", "==", withId),
        );
        const subSnap = await getDocs(subQ);
        subSnap.docs.forEach((d) => batch.delete(d.ref));
      }

      await batch.commit();
      setDeleteConfirm(null);
      setDeleteVerification("");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `assessments/${withId}`);
    }
  };

  const handleDuplicate = async (original: Assessment) => {
    try {
      const { id, ...data } = original;
      const newData: any = {
        ...data,
        title: `${data.title} (Copy)`,
        createdAt: new Date().toISOString(),
        status: "draft",
        version: 1,
      };
      await addDoc(collection(db, "assessments"), newData);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "assessments");
    }
  };

  const toggleStatus = async (
    assessment: Assessment,
    newStatus: "active" | "archived" | "draft",
  ) => {
    try {
      await updateDoc(doc(db, "assessments", assessment.id!), {
        status: newStatus,
      });
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.WRITE,
        `assessments/${assessment.id}`,
      );
    }
  };

  const copyLink = (id: string) => {
    const baseUrl = import.meta.env.VITE_APP_BASE_URL || window.location.origin;
    const url = `${baseUrl}/assessment/${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleBroadcast = async () => {
    if (!broadcastData.title || !broadcastData.message) return;
    setIsSending(true);
    try {
      await notificationService.sendNotification({
        title: broadcastData.title,
        message: broadcastData.message,
        type: broadcastData.type,
        category: "announcements",
        targetGroups: broadcastData.targetGroups.length > 0 ? broadcastData.targetGroups : ["all"]
      });
      setShowBroadcast(false);
      setBroadcastData({ title: "", message: "", type: "info", targetGroups: [] });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const filteredAssessments = useMemo(() => {
    return assessments.filter((a) => {
      const matchesSearch = a.title
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || a.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [assessments, searchTerm, statusFilter]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredAssessments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAssessments.map(a => a.id!)));
    }
  };

  const handleBulkArchive = async () => {
    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        batch.update(doc(db, "assessments", id), { status: "archived" });
      });
      await batch.commit();
      setSelectedIds(new Set());
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "bulk/archive");
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`هل أنت متأكد من مسح ${selectedIds.size} اختبار؟ لا يمكن التراجع عن هذا الفعل.`)) return;
    
    setIsDeletingBulk(true);
    try {
      const batch = writeBatch(db);
      for (const id of Array.from(selectedIds)) {
        batch.delete(doc(db, "assessments", id));
        // Also delete submissions if they exist (heavy operation if many, but batch is safe for 500)
        const subSnap = await getDocs(query(collection(db, "submissions"), where("assessmentId", "==", id)));
        subSnap.docs.forEach(d => batch.delete(d.ref));
      }
      await batch.commit();
      setSelectedIds(new Set());
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, "bulk/delete");
    } finally {
      setIsDeletingBulk(false);
    }
  };

  return (
    <div className={cn("max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-12", i18n.language === 'ar' ? 'text-right' : 'text-left')} dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Modals remain the same */}
      <AnimatePresence>
        {showBroadcast && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-brand-text/40 backdrop-blur-sm z-[200] flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[32px] p-10 max-w-lg w-full shadow-2xl border border-brand-beige/20 text-right"
            >
              <div className="flex items-center justify-between mb-8">
                <button onClick={() => setShowBroadcast(false)} className="p-2 hover:bg-brand-cream rounded-full transition-colors">
                   <Plus className="w-5 h-5 rotate-45 text-brand-beige" />
                </button>
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-black text-brand-text">{t('admin_dashboard.broadcast_title')}</h3>
                  <div className="w-10 h-10 bg-brand-red/5 text-brand-red rounded-xl flex items-center justify-center">
                    <Bell className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-brand-beige uppercase tracking-widest block mb-2">{t('admin_dashboard.broadcast_placeholder_title')}</label>
                  <input
                    type="text"
                    value={broadcastData.title || ''}
                    onChange={e => setBroadcastData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder={t('admin_dashboard.broadcast_placeholder_title')}
                    className={cn(
                      "w-full px-5 py-3 bg-brand-cream/50 border border-brand-beige/10 rounded-xl outline-none focus:ring-2 focus:ring-brand-red/20 font-bold",
                      i18n.language === 'ar' ? 'text-right' : 'text-left'
                    )}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-brand-beige uppercase tracking-widest block mb-2">{t('admin_dashboard.broadcast_placeholder_msg')}</label>
                  <textarea
                    value={broadcastData.message || ''}
                    onChange={e => setBroadcastData(prev => ({ ...prev, message: e.target.value }))}
                    placeholder={t('admin_dashboard.broadcast_placeholder_msg')}
                    rows={4}
                    className={cn(
                      "w-full px-5 py-3 bg-brand-cream/50 border border-brand-beige/10 rounded-xl outline-none focus:ring-2 focus:ring-brand-red/20 font-bold resize-none",
                      i18n.language === 'ar' ? 'text-right' : 'text-left'
                    )}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-brand-beige uppercase tracking-widest block mb-2">إرسال إلى الفئات</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {[
                      { id: 'OT', label: 'عهود قديم' },
                      { id: 'NT', label: 'عهود جديد' },
                      { id: 'servant', label: 'خدام' },
                      { id: 'admin', label: 'الآدمن' },
                      { id: 'all', label: 'الكل' }
                    ].map(group => (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => {
                          setBroadcastData(prev => {
                            const current = prev.targetGroups;
                            if (group.id === 'all') {
                                return { ...prev, targetGroups: ['all'] };
                            }
                            const filtered = current.filter(g => g !== 'all');
                            if (filtered.includes(group.id)) {
                              return { ...prev, targetGroups: filtered.filter(g => g !== group.id) };
                            } else {
                              return { ...prev, targetGroups: [...filtered, group.id] };
                            }
                          });
                        }}
                        className={cn(
                          "py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-between",
                          broadcastData.targetGroups.includes(group.id)
                            ? "bg-brand-red text-white border-brand-red shadow-lg shadow-brand-red/10" 
                            : "bg-white text-brand-beige border-brand-beige/20 hover:border-brand-beige/40"
                        )}
                      >
                        <span>{group.label}</span>
                        {broadcastData.targetGroups.includes(group.id) && <CheckCircle className="w-3 h-3" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-brand-beige uppercase tracking-widest block mb-2">نوع التنبيه</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["info", "success", "warning"].map(type => (
                      <button
                        key={type}
                        onClick={() => setBroadcastData(prev => ({ ...prev, type: type as any }))}
                        className={cn(
                          "py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                          broadcastData.type === type 
                            ? "bg-brand-red text-white border-brand-red" 
                            : "bg-white text-brand-beige border-brand-beige/20 hover:border-brand-beige/40"
                        )}
                      >
                        {type === 'info' ? 'عام' : type === 'success' ? 'نجاح' : 'تحذير'}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleBroadcast}
                  disabled={isSending || !broadcastData.title || !broadcastData.message}
                  className="w-full py-5 bg-brand-red text-white rounded-2xl font-black flex items-center justify-center gap-3 disabled:opacity-30 hover:bg-brand-red/90 transition-all shadow-xl shadow-brand-red/20"
                >
                  {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  {t('admin_dashboard.send_broadcast')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-brand-text/40 backdrop-blur-sm z-[200] flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[32px] p-10 max-w-md w-full shadow-2xl border border-brand-beige/20 text-right"
            >
              <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-brand-red mb-6 mx-auto">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-brand-text mb-2">
                مسح الاختبار؟
              </h3>
              <p className="text-brand-beige mb-8 leading-relaxed font-bold">
                أنت على وشك مسح اختبار{" "}
                <span className="font-black text-brand-red">
                  {deleteConfirm.title}
                </span>
                .
                {deleteConfirm.hasSubmissions && (
                  <span className="block mt-2 font-black text-brand-red bg-rose-50 p-3 rounded-xl">
                    تنبيه: الاختبار ده فيه إجابات من الطلاب، لو مسحته كل الإجابات هتتمسح معاه.
                  </span>
                )}
              </p>

              {deleteConfirm.hasSubmissions ? (
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-brand-beige uppercase tracking-widest block mb-2">
                      أكد المسح بكتابة كلمة "مسح"
                    </label>
                    <input
                      type="text"
                      value={deleteVerification || ''}
                      onChange={(e) => setDeleteVerification(e.target.value)}
                      placeholder='اكتب "مسح" للتأكيد'
                      className="w-full px-4 py-3 bg-brand-cream border border-brand-beige/10 rounded-xl outline-none focus:ring-2 focus:ring-brand-red/20 font-bold text-brand-text text-center"
                    />
                  </div>
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => executeDelete(deleteConfirm.id, true)}
                      disabled={deleteVerification !== "مسح"}
                      className="w-full py-4 bg-brand-red text-white rounded-2xl font-black disabled:opacity-30 shadow-lg shadow-brand-red/10"
                    >
                      مسح الاختبار وكل الإجابات
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="w-full py-4 bg-brand-cream text-brand-beige rounded-2xl font-black hover:bg-brand-beige/10 transition-colors"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-4">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 py-4 bg-brand-cream text-brand-beige rounded-2xl font-black transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={() => executeDelete(deleteConfirm.id, false)}
                    className="flex-1 py-4 bg-brand-red text-white rounded-2xl font-black shadow-lg shadow-brand-red/10 animate-pulse-subtle"
                  >
                    تأكيد المسح
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-12">
        <div className="space-y-2">
          <div className="flex items-center gap-6">
            <div className="flex items-center -space-x-4">
              <div className="w-16 h-16 rounded-full bg-white border-2 border-brand-beige/20 shadow-xl flex items-center justify-center overflow-hidden z-10">
                <SmartImage
                  src="/assets/logo-red.png"
                  alt="Church"
                  className="w-full h-full object-cover"
                  fallback={<div className="w-full h-full flex items-center justify-center bg-brand-red/5 text-brand-red"><Church className="w-8 h-8" /></div>}
                />
              </div>
            </div>
            <div className={cn("text-right", i18n.language === 'en' ? 'text-left' : 'text-right')}>
              <h1 className="text-4xl font-black tracking-tighter text-brand-text">
                {isListView ? "إدارة الاختبارات" : t('admin_dashboard.title')}
              </h1>
              <p className="text-brand-beige font-bold mt-1">
                {isListView ? "تحكم كامل في الاختبارات والأسئلة" : t('admin_dashboard.subtitle')}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          <div className="hidden lg:block">
            <NotificationBell userId={user?.uid} userRole={user?.role} />
          </div>
          <Link
            to="/admin/announcements"
            className="px-6 py-4 bg-brand-cream/50 border border-brand-beige/20 rounded-2xl hover:bg-brand-red hover:text-white transition-all flex items-center gap-2 font-black text-brand-text text-[10px] uppercase tracking-widest shadow-sm"
          >
            <Bell className={cn("w-4 h-4", i18n.language === 'ar' ? 'ml-2' : 'mr-2')} />
            الإشعارات
          </Link>
          <Link
            to="/admin/create"
            className="px-8 py-4 bg-brand-red text-white rounded-2xl hover:bg-brand-red/90 shadow-xl shadow-brand-red/20 transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest"
          >
            <Plus className={cn("w-4 h-4", i18n.language === 'ar' ? 'ml-2' : 'mr-2')} />
            {t('admin_dashboard.new_test')}
          </Link>
        </div>
      </div>

      {!isListView ? (
        <div className="space-y-12">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Users, label: "إجمالي الطلاب", value: stats.totalUsers, color: "text-blue-600", bg: "bg-blue-50", action: () => navigate('/admin/users') },
              { icon: ClipboardCheck, label: "إجمالي التسليمات", value: stats.totalSubmissions, color: "text-emerald-600", bg: "bg-emerald-50", action: () => navigate('/admin/results') },
              { icon: BookOpen, label: "الاختبارات النشطة", value: stats.activeAssessments, color: "text-amber-600", bg: "bg-amber-50", action: () => navigate('/admin/assessments') },
              { icon: Star, label: "إجمالي النقاط", value: computedPoints, color: "text-brand-red", bg: "bg-rose-50", action: () => setShowPointsModal(true) }
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={stat.action}
                className="bg-white p-8 rounded-[40px] border border-brand-beige/10 shadow-sm flex flex-col items-center text-center group hover:shadow-xl hover:shadow-brand-red/5 transition-all cursor-pointer"
              >
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110", stat.bg, stat.color)}>
                  <stat.icon className="w-7 h-7" />
                </div>
                <p className="text-[10px] font-black text-brand-beige uppercase tracking-widest mb-1">{stat.label}</p>
                <h4 className="text-3xl font-black text-brand-text tracking-tighter">{stat.value}</h4>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-12">
            {/* Recent Activity */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-red/5 rounded-xl flex items-center justify-center text-brand-red">
                    <History className="w-5 h-5" />
                  </div>
                  <h3 className="font-black text-2xl text-brand-text">أحدث النشاطات</h3>
                </div>
                <Link to="/admin/results" className="text-[10px] font-black text-brand-red uppercase tracking-widest flex items-center gap-2 hover:translate-x-[-4px] transition-transform">
                  عرض الكل
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </Link>
              </div>

              <div className="bg-white rounded-[40px] border border-brand-beige/10 overflow-hidden shadow-sm">
                <div className="divide-y divide-brand-beige/5">
                  {recentSubmissions.length === 0 ? (
                    <div className="p-12 text-center text-brand-beige font-black">لا توجد تسليمات بعد</div>
                  ) : (
                    recentSubmissions.map((sub) => (
                      <div key={sub.id} className="p-6 flex items-center justify-between hover:bg-brand-cream/10 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-brand-cream border-2 border-white shadow-sm flex items-center justify-center font-black text-brand-red text-xs overflow-hidden">
                            {(userPhotos[sub.participantId || ""] || sub.participantPhotoUrl) ? (
                              <img src={userPhotos[sub.participantId || ""] || sub.participantPhotoUrl} alt={sub.participantName} className="w-full h-full object-cover" />
                            ) : sub.participantName[0]}
                          </div>
                          <div>
                            <h5 className="font-black text-brand-text leading-none flex items-center gap-2">
                              {sub.participantName}
                              {(() => {
                                const st = allStudents.find(s => s.uid === sub.participantId);
                                return st ? <span className="text-brand-red text-xs">({st.code})</span> : null;
                              })()}
                            </h5>
                            <p className="text-[10px] text-brand-beige font-bold mt-1 uppercase tracking-tight">
                              {sub.assessmentTitle}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-black text-emerald-600">%{sub.maxScore ? ((sub.finalScore / sub.maxScore) * 100).toFixed(0) : 0} دقة</div>
                          <div className="text-[10px] text-brand-beige font-bold mt-1 uppercase">
                            {formatDate(sub.date)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10 bg-white p-6 rounded-[32px] border border-brand-beige/10 shadow-sm">
            <div className="flex flex-1 w-full gap-4">
              {filteredAssessments.length > 0 && (
                <button
                  onClick={selectAll}
                  className={cn(
                    "px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all flex items-center gap-2",
                    selectedIds.size === filteredAssessments.length && filteredAssessments.length > 0
                      ? "bg-brand-text text-white border-brand-text"
                      : "bg-brand-cream/50 text-brand-beige border-brand-beige/10 hover:border-brand-beige/30"
                  )}
                >
                  {selectedIds.size === filteredAssessments.length ? "إلغاء الكل" : "تحديد الكل"}
                </button>
              )}
              <div className="relative flex-1">
                <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-brand-beige", i18n.language === 'ar' ? 'right-4' : 'left-4')} />
                <input
                  type="text"
                  placeholder={t('userManager.search_placeholder')}
                  value={searchTerm || ''}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={cn(
                    "w-full py-4 bg-brand-cream/20 border-none rounded-2xl focus:ring-2 focus:ring-brand-red/20 outline-none font-bold text-sm text-brand-text",
                    i18n.language === 'ar' ? 'pr-12 pl-6 text-right' : 'pl-12 pr-6 text-left'
                  )}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 bg-brand-cream/30 p-1.5 rounded-2xl">
              {[
                { id: 'all', label: t('admin_dashboard.all') },
                { id: 'active', label: t('admin_dashboard.active') },
                { id: 'draft', label: t('admin_dashboard.draft') },
                { id: 'archived', label: t('admin_dashboard.archived') }
              ].map((status) => (
                <button
                  key={status.id}
                  onClick={() => setStatusFilter(status.id as any)}
                  className={cn(
                    "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    statusFilter === status.id
                      ? "bg-white text-brand-red shadow-sm"
                      : "text-brand-beige hover:text-brand-text",
                  )}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-72 bg-slate-50 animate-pulse rounded-[40px]"
                />
              ))}
            </div>
          ) : filteredAssessments.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-[40px] border-2 border-dashed border-slate-100">
              <BookOpen className="w-20 h-20 text-slate-100 mx-auto mb-6" />
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                مفيش اختبارات
              </h3>
              <p className="text-slate-400 font-medium mt-2">
                مفيش اختبارات موجودة دلوقتي.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredAssessments.map((assessment) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={assessment.id}
                  onClick={(e) => {
                    if (e.ctrlKey || e.metaKey) toggleSelection(assessment.id!);
                  }}
                  className={cn(
                    "group bg-white p-1 rounded-[40px] border transition-all relative overflow-hidden",
                    selectedIds.has(assessment.id!) 
                      ? "border-brand-red ring-4 ring-brand-red/5 shadow-2xl" 
                      : "border-brand-beige/10 hover:border-brand-red/20 hover:shadow-2xl hover:shadow-brand-red/5"
                  )}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-red/[0.02] via-transparent to-brand-cream/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  
                  {/* Selection Checkbox */}
                  <div className="absolute top-8 right-8 z-20">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelection(assessment.id!);
                      }}
                      className={cn(
                        "w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center",
                        selectedIds.has(assessment.id!)
                          ? "bg-brand-red border-brand-red text-white"
                          : "bg-white border-brand-beige/20 group-hover:border-brand-red/40"
                      )}
                    >
                      {selectedIds.has(assessment.id!) && <CheckCircle className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="p-8 relative z-10">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-2">
                        {(() => {
                          const isScheduled = assessment.status === "active" && assessment.availableFrom && new Date(assessment.availableFrom) > new Date();
                          if (isScheduled) {
                            return (
                              <span className="px-3 py-1 text-[8px] font-black uppercase rounded-lg tracking-[0.1em] bg-blue-50 text-blue-600 border border-blue-100/50 shadow-sm">
                                مجدول ({new Date(assessment.availableFrom!).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })})
                              </span>
                            );
                          }
                          return (
                            <span
                              className={cn(
                                "px-3 py-1 text-[8px] font-black uppercase rounded-lg tracking-[0.1em] border shadow-sm",
                                assessment.status === "active"
                                  ? "bg-emerald-50 text-emerald-600 border-emerald-100/50"
                                  : assessment.status === "draft"
                                    ? "bg-amber-50 text-amber-600 border-amber-100/50"
                                    : "bg-rose-50 text-brand-red border-rose-100/50",
                              )}
                            >
                              {assessment.status === "active" ? "نشط" : assessment.status === "draft" ? "مسودة" : "مؤرشف"}
                            </span>
                          );
                        })()}
                        {assessment.targetGroup && (
                          <span className={cn(
                            "px-3 py-1.5 text-[8px] font-black uppercase rounded-full tracking-[0.2em]",
                            assessment.targetGroup === 'OT' ? "bg-blue-50 text-blue-600" :
                            assessment.targetGroup === 'NT' ? "bg-purple-50 text-purple-600" :
                            assessment.targetGroup === 'servant' ? "bg-amber-50 text-amber-600" :
                            assessment.targetGroup === 'admin' ? "bg-brand-red/10 text-brand-red" : "bg-brand-cream text-brand-beige"
                          )}>
                            {assessment.targetGroup === 'OT' ? "طلاب اونلاين" :
                             assessment.targetGroup === 'NT' ? "طلاب الورشة" :
                             assessment.targetGroup === 'servant' ? "خدام" :
                             assessment.targetGroup === 'admin' ? "مديرين" : "الكل"}
                          </span>
                        )}
                      </div>
                      <div className={cn(
                        "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0",
                        selectedIds.size > 0 && "hidden"
                      )}>
                        <button
                          onClick={(e) => { e.stopPropagation(); openReminder(assessment); }}
                          className="p-2.5 hover:bg-amber-50 rounded-xl text-brand-beige hover:text-amber-600 transition-colors"
                          title="Send Reminder"
                        >
                          <Bell className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDuplicate(assessment); }}
                          className="p-2.5 hover:bg-brand-cream rounded-xl text-brand-beige hover:text-brand-red transition-colors"
                          title="Duplicate"
                        >
                          <CopyCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/admin/edit/${assessment.id}`); }}
                          className="p-2.5 hover:bg-brand-cream rounded-xl text-brand-beige hover:text-brand-red transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteInitial(assessment); }}
                          className="p-2.5 hover:bg-rose-50 rounded-xl text-brand-beige hover:text-brand-red transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mb-10">
                      <h2 className="text-2xl font-black text-brand-text leading-tight line-clamp-2 min-h-[4rem]">
                        {assessment.title}
                      </h2>
                      <p className="text-[10px] font-bold text-brand-beige uppercase tracking-widest mt-2">
                        إصدار {assessment.version || "1.0"}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="bg-brand-cream/20 p-4 rounded-3xl border border-brand-beige/5">
                        <p className="text-[9px] uppercase font-black text-brand-beige tracking-widest mb-1 leading-none text-right">
                          الوقت
                        </p>
                        <p className="text-xl font-black text-brand-text tracking-tighter text-right">
                          {assessment.readingDuration + assessment.answerDuration}د
                        </p>
                      </div>
                      <div className="bg-brand-cream/20 p-4 rounded-3xl border border-brand-beige/5">
                        <p className="text-[9px] uppercase font-black text-brand-beige tracking-widest mb-1 leading-none text-right">
                          الأسئلة
                        </p>
                        <p className="text-xl font-black text-brand-text tracking-tighter text-right">
                          {Object.values(assessment.questions).flat().length}
                        </p>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-brand-beige/10 flex items-center justify-between">
                      {assessment.status === "active" ? (
                        <button
                          onClick={() => toggleStatus(assessment, "archived")}
                          className="flex items-center gap-2 text-[9px] font-black uppercase text-brand-beige hover:text-brand-red transition-colors"
                        >
                          <Archive className="w-4 h-4" />
                          أرشفة
                        </button>
                      ) : (
                        <button
                          onClick={() => toggleStatus(assessment, "active")}
                          className="flex items-center gap-2 text-[9px] font-black uppercase text-brand-beige hover:text-emerald-600 transition-colors"
                        >
                          <Power className="w-4 h-4" />
                          نشر
                        </button>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => copyLink(assessment.id!)}
                          className={cn(
                            "p-3 rounded-2xl transition-all shadow-lg",
                            copiedId === assessment.id
                              ? "bg-emerald-500 text-white shadow-emerald-200"
                              : "bg-brand-text text-white shadow-brand-text/10 hover:bg-brand-red",
                          )}
                        >
                          {copiedId === assessment.id ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <Link
                          to={`/assessment/${assessment.id}`}
                          target="_blank"
                          className="p-3 bg-brand-cream text-brand-beige rounded-2xl hover:bg-brand-beige/20 hover:text-brand-text transition-all font-bold"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] w-full max-w-2xl px-6"
          >
            <div className="bg-brand-text rounded-[32px] p-4 shadow-2xl flex items-center justify-between border border-white/10 backdrop-blur-xl">
              <div className="flex items-center gap-6 px-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-brand-beige uppercase tracking-widest">محدد</span>
                  <span className="text-xl font-black text-white leading-none">{selectedIds.size} اختبار</span>
                </div>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-brand-beige hover:text-white transition-all"
                >
                  <Plus className="w-4 h-4 rotate-45" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleBulkArchive}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all"
                >
                  <Archive className="w-4 h-4" />
                  أرشفة
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={isDeletingBulk}
                  className="px-8 py-3 bg-brand-red text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-brand-red/90 transition-all shadow-lg shadow-brand-red/20 disabled:opacity-50"
                >
                  {isDeletingBulk ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  حذف نهائي
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {showPointsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 text-right" dir="rtl">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-brand-cream rounded-[40px] max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
          >
            <div className="p-8 pb-6 border-b border-brand-beige/10 flex justify-between items-start bg-white">
              <div className="text-right">
                <h2 className="text-3xl font-black text-brand-text flex items-center gap-3">
                  <Star className="w-8 h-8 text-brand-red" />
                  تفاصيل النقاط للطلاب
                </h2>
                <p className="text-brand-beige font-bold mt-2">
                  يوضح نقاط الشراء للمتجر والنقاط التراكمية لكل طالب مع إمكانية عرض باقي التفاصيل بالملف الشخصي.
                </p>
              </div>
              <button
                onClick={() => setShowPointsModal(false)}
                className="p-3 bg-brand-cream text-brand-text rounded-2xl hover:bg-brand-red hover:text-white transition-all shadow-sm"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto flex-1 custom-scrollbar bg-brand-cream space-y-4">
              {isPointsDataLoading ? (
                <div className="py-20 flex flex-col items-center justify-center text-brand-beige">
                  <Loader2 className="w-12 h-12 animate-spin mb-4 text-brand-red" />
                  <p className="font-bold text-lg">جاري تحميل البيانات...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {allStudents.sort((a, b) => {
                    return (b.totalPoints || 0) - (a.totalPoints || 0);
                  }).map(student => {
                    const myExams = allSubmissions.filter(s => s.participantId === student.uid || s.participantName === student.normalizedName);
                    const examPoints = myExams.reduce((acc, curr) => acc + (curr.finalScore ?? (curr as any).score ?? curr.baseScore ?? 0), 0);
                    
                    const myAttendance = allAttendances.filter(a => a.studentId === student.uid);
                    const attPoints = myAttendance.reduce((acc, curr) => acc + (curr.points || 0), 0);
                    
                    const myPurchases = allPurchases.filter(p => p.userId === student.uid);
                    const purPoints = myPurchases.reduce((sum, curr) => sum + (curr.pricePaid ?? curr.price ?? curr.totalPrice ?? 0), 0);

                    const myLogs = allLogs.filter(l => l.userId === student.uid);
                    const manualPoints = myLogs.reduce((acc, curr) => {
                       if (curr.type === 'add') return acc + (curr.amount || 0);
                       if (curr.type === 'remove') return acc - (curr.amount || 0);
                       return acc;
                    }, 0);
                    
                    const calculatedTotal = Math.max(0, examPoints + attPoints + manualPoints - purPoints);
                    const calculatedCumulative = Math.max(0, examPoints + attPoints + manualPoints);
                    const displayTotal = student.totalPoints ?? calculatedTotal;
                    const displayCumulative = student.cumulativePoints ?? calculatedCumulative;
                    
                    return (
                      <div key={student.uid} className="bg-white p-5 rounded-[24px] border border-brand-beige/20 shadow-sm flex flex-col md:flex-row items-center gap-6 justify-between">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                          <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center flex-shrink-0 border border-brand-red/10">
                            <Award className="w-6 h-6 text-brand-red" />
                          </div>
                          <div>
                            <h3 className="font-black text-brand-text text-lg">{student.fullName} <span className="text-brand-red">({student.code})</span></h3>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 w-full md:w-auto">
                          <div className="text-center bg-emerald-50 px-4 py-2 rounded-xl flex-1 md:flex-none border border-emerald-100/50 min-w-[100px]">
                             <p className="text-[10px] text-emerald-600/70 font-black uppercase mb-0.5">نقاط الشراء 🎁</p>
                             <p className="font-black text-emerald-600 text-base md:text-lg">{displayTotal}</p>
                          </div>
                          
                          <div className="text-center bg-amber-50 px-4 py-2 rounded-xl flex-1 md:flex-none border border-amber-100/50 min-w-[100px]">
                             <p className="text-[10px] text-amber-600/70 font-black uppercase mb-0.5">النقاط التراكمية 🏆</p>
                             <p className="font-black text-amber-600 text-base md:text-lg">{displayCumulative}</p>
                          </div>

                          <Link
                            to={`/admin/students/${student.uid}`}
                            className="bg-brand-text hover:bg-brand-red text-white py-2 px-4 rounded-xl font-bold text-xs transition-colors shrink-0 flex items-center gap-1"
                            onClick={() => setShowPointsModal(false)}
                          >
                            <span>عرض التفاصيل</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
