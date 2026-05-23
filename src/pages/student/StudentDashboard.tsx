import React, { useState, useEffect, useMemo } from "react";
import QRCode from "qrcode";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { useAuth } from "../../hooks/useAuth";
import { Submission, Assessment } from "../../types";
import { 
  Trophy, 
  Flame, 
  BookOpen, 
  Target, 
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Activity,
  Award,
  Medal,
  Users,
  Timer as TimerIcon,
  ArrowRight,
  MapPin,
  Church,
  Smartphone,
  Edit,
  X,
  Save,
  Camera,
  Plus,
  Bell,
  QrCode,
  Download
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Link, useNavigate } from "react-router-dom";
import { formatDate, cn, calculatePercentage, compressImage } from "../../lib/utils";
import { 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
} from "recharts";
import { calculateLevel, checkNewBadges, BADGES } from "../../lib/gamification";
import { SmartImage } from "../../components/ui/SmartImage";
import NotificationBell from "../../components/ui/NotificationBell";
import { notificationService } from "../../lib/notificationService";
import { useTranslation } from "react-i18next";

// Helper component for live countdown
function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState("");
  const { t } = useTranslation();

  useEffect(() => {
    const calculate = () => {
      const diff = new Date(expiresAt).getTime() - new Date().getTime();
      if (diff <= 0) {
        setTimeLeft(t('dashboard.ended') || "انتهى");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) setTimeLeft(`${days} ${t('dashboard.day')} و ${hours} ${t('dashboard.hour')}`);
      else if (hours > 0) setTimeLeft(`${hours} ${t('dashboard.hour')} و ${mins} ${t('dashboard.minute')}`);
      else setTimeLeft(`${mins} ${t('dashboard.minute')}`);
    };

    calculate();
    const interval = setInterval(calculate, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [expiresAt, t]);

  return <span>{timeLeft}</span>;
}

export default function StudentDashboard() {
  const { user, updateProfile } = useAuth();
  const { t } = useTranslation();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [activeAssessments, setActiveAssessments] = useState<Assessment[]>([]);
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({});
  const navigate = useNavigate();
  const [qrUrl, setQrUrl] = useState<string>("");
  const [userAttendanceList, setUserAttendanceList] = useState<any[]>([]);

  // Generate local QR Code for Attendance scanning
  useEffect(() => {
    if (user && user.code) {
      const payload = `alhekaya:presence:${user.uid}:${user.code.toUpperCase()}`;
      QRCode.toDataURL(payload, {
        margin: 2,
        width: 256,
        color: {
          dark: '#1C0606',
          light: '#FFFDF6'
        }
      }).then(setQrUrl).catch(err => {
        console.error("Failed to generate user attendance QR code:", err);
      });
    }
  }, [user]);

  // Profile Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editChurch, setEditChurch] = useState(user?.church || "");
  const [editWhatsApp, setEditWhatsApp] = useState(user?.whatsappNumber || "");
  const [editBirthDate, setEditBirthDate] = useState(user?.birthDate || "");
  const [editAddress, setEditAddress] = useState(user?.address || "");
  const [editPhotoUrl, setEditPhotoUrl] = useState(user?.photoUrl || "");
  const [editSidebarColor, setEditSidebarColor] = useState(user?.sidebarColor || "#9E0000");
  const [showLatestResult, setShowLatestResult] = useState(user?.sidebarSettings?.showLatestResult !== false);
  const [showLocationInSidebar, setShowLocationInSidebar] = useState(user?.sidebarSettings?.showLocation !== false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notifAssessments, setNotifAssessments] = useState(user?.notificationPrefs?.assessments !== false);
  const [notifAchievements, setNotifAchievements] = useState(user?.notificationPrefs?.achievements !== false);
  const [notifAnnouncements, setNotifAnnouncements] = useState(user?.notificationPrefs?.announcements !== false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const openEditModal = () => {
    if (user) {
      setEditChurch(user.church || "");
      setEditWhatsApp(user.whatsappNumber || "");
      setEditBirthDate(user.birthDate || "");
      setEditAddress(user.address || "");
      setEditPhotoUrl(user.photoUrl || "");
      setEditSidebarColor(user.sidebarColor || "#9E0000");
      setShowLatestResult(user.sidebarSettings?.showLatestResult !== false);
      setShowLocationInSidebar(user.sidebarSettings?.showLocation !== false);
      setNotifAssessments(user.notificationPrefs?.assessments !== false);
      setNotifAchievements(user.notificationPrefs?.achievements !== false);
      setNotifAnnouncements(user.notificationPrefs?.announcements !== false);
    }
    setIsEditModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string);
        setEditPhotoUrl(compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      const result = await updateProfile({
        church: editChurch,
        whatsappNumber: editWhatsApp,
        birthDate: editBirthDate,
        address: editAddress,
        photoUrl: editPhotoUrl,
        sidebarColor: editSidebarColor,
        sidebarSettings: {
          showLatestResult,
          showLocation: showLocationInSidebar
        },
        notificationPrefs: {
          assessments: notifAssessments,
          achievements: notifAchievements,
          announcements: notifAnnouncements
        }
      });

      if (result.success) {
        setIsEditModalOpen(false);
      } else {
        setError(result.error || "حدث خطأ أثناء التحديث");
      }
    } catch {
      setError("حدث خطأ غير متوقع");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    // 1. User Submissions
    const q = query(
      collection(db, "submissions"),
      where("participantId", "==", user.uid),
      orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission));
      setSubmissions(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `submissions (participant: ${user.uid})`);
    });

    // 2. Active Assessments
    const assQ = query(
      collection(db, "assessments"),
      where("status", "==", "active"),
      orderBy("createdAt", "desc")
    );
    const unsubscribeAss = onSnapshot(assQ, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assessment));
      const active = data.filter(a => new Date(a.expiresAt) > new Date()).slice(0, 3);
      setActiveAssessments(active);
    });

    // 3. Participant Counts
    const subCountQ = query(collection(db, "submissions"));
    const unsubscribeCounts = onSnapshot(subCountQ, (snapshot) => {
      const counts: Record<string, number> = {};
      snapshot.docs.forEach(doc => {
        const aid = doc.data().assessmentId;
        if (aid) counts[aid] = (counts[aid] || 0) + 1;
      });
      setParticipantCounts(counts);
    });

    // 4. User Attendance Logs
    const attendanceQ = query(
      collection(db, "attendance"),
      where("studentId", "==", user.uid),
      orderBy("timestamp", "desc")
    );
    const unsubscribeAttendance = onSnapshot(attendanceQ, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUserAttendanceList(data);
    }, (err) => {
      console.error("Error loading user attendance logs:", err);
    });

    return () => {
      unsubscribe();
      unsubscribeAss();
      unsubscribeCounts();
      unsubscribeAttendance();
    };
  }, [user]);

  // Check for new badges on mount
  useEffect(() => {
    if (!user) return;
    const newBadges = checkNewBadges(user);
    if (newBadges.length > 0) {
      const updatedBadges = [...(user.badges || []), ...newBadges];
      updateProfile({ badges: updatedBadges }).then(() => {
        // Notify
        newBadges.forEach(() => {
          notificationService.sendNotification({
             title: "مبروك وسام جديد! 🎖️",
             message: `لقد حصلت على وسام جديد لتفوقك! تفقد صفحة الأوسمة.`,
             type: "success",
             category: "achievements",
             targetId: user.uid
          });
        });
      });
    }
  }, [user, updateProfile]);

  const todayStr = useMemo(() => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - (offset * 60 * 1000));
    return local.toISOString().split('T')[0];
  }, []);

  const todayAttendance = useMemo(() => {
    return userAttendanceList.find((a: any) => a.date === todayStr);
  }, [userAttendanceList, todayStr]);

  const [showCelebration, setShowCelebration] = useState(false);
  const prevTodayAttendanceRef = React.useRef(todayAttendance);

  useEffect(() => {
    if (!prevTodayAttendanceRef.current && todayAttendance) {
      // Transitioned from un-attended to attended
      import('../../lib/confetti').then((module) => {
        module.triggerSuccessConfetti();
      });
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 6000); 
    }
    prevTodayAttendanceRef.current = todayAttendance;
  }, [todayAttendance]);

  const completedAssessmentIds = useMemo(() => {
    return new Set(submissions.map(s => s.assessmentId));
  }, [submissions]);

  // Deadline Notification Logic
  useEffect(() => {
    if (!user || activeAssessments.length === 0) return;

    const checkDeadlines = async () => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      for (const ass of activeAssessments) {
        const expiryDate = new Date(ass.expiresAt);
        const isNear = expiryDate > now && expiryDate < tomorrow;
        const hasCompleted = completedAssessmentIds.has(ass.id!);

        if (isNear && !hasCompleted) {
          const lKey = `deadline_notif_${user.uid}_${ass.id}_${now.toDateString()}`;
          if (!localStorage.getItem(lKey)) {
            await notificationService.sendNotification({
              title: "قربنا نخلص! ⏳",
              message: `باقي أقل من ٢٤ ساعة على انتهاء اختبار: ${ass.title}. الحق حله دلوقتي!`,
              type: "warning",
              category: "assessments",
              targetId: user.uid
            });
            localStorage.setItem(lKey, "sent");
          }
        }
      }
    };

    checkDeadlines();
  }, [user, activeAssessments, completedAssessmentIds]);

  if (!user) return null;

  const latestSubmission = submissions[0];
  const chartData = [...submissions].reverse().map(s => ({
    date: formatDate(s.date),
    score: calculatePercentage(s.finalScore, s.maxScore)
  }));

  const levelInfo = calculateLevel(user.xp || 0);

  const stats = [
    { 
      label: t('dashboard.streak'), 
      value: user.streak || 0, 
      suffix: t('dashboard.day'),
      icon: Flame, 
      color: "text-orange-600 bg-orange-50",
      animate: true,
      description: user.streak > 0 ? "سلسلة دخول ممتازة! 🔥" : "ابدأ سلسلة دخولك النهاردة!"
    },
    { label: t('dashboard.points'), value: user.totalPoints || 0, icon: Trophy, color: "text-amber-600 bg-amber-50" },
    { 
      label: t('dashboard.level'), 
      value: levelInfo.name, 
      icon: Award, 
      color: "text-brand-red bg-brand-cream",
      progress: levelInfo.progress,
      description: `باقي ${(levelInfo as any).nextXP - (user.xp || 0)} XP للمستوى الجاي`
    },
    { label: t('dashboard.avg_score'), value: `${user.averageScore ? Math.round(user.averageScore) : 0}%`, icon: Target, color: "text-blue-600 bg-blue-50" },
  ];

  return (
    <div className="min-h-screen bg-brand-cream pb-20 overflow-x-hidden">
      {/* Header - Hidden on mobile, as Layout handles it */}
      <header className="hidden lg:block bg-white border-b border-brand-beige/10 px-6 py-6 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <NotificationBell userId={user.uid} userRole="student" notificationPrefs={user.notificationPrefs} />

            <button 
              onClick={openEditModal}
              className="p-3 bg-brand-cream/50 text-brand-beige hover:text-brand-red rounded-xl transition-all hover:scale-110 shadow-sm"
              title={t('dashboard.edit_profile')}
            >
              <Edit className="w-5 h-5" />
            </button>

            <div className="text-right">
              <h2 className="text-xl font-black text-brand-text">{t('dashboard.welcome')} {user.fullName.split(' ')[0]}!</h2>
              <p className={cn(
                "text-[10px] font-bold uppercase tracking-widest",
                user.code?.toUpperCase().startsWith('S') ? "text-brand-red" : "text-brand-beige"
              )}>
                {user.code?.toUpperCase().startsWith('S') ? "خادم" : "طالب"} - {t('sidebar.story_title')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center -space-x-3">
              <div className="w-12 h-12 rounded-full border-2 border-white bg-brand-cream flex items-center justify-center font-black text-brand-text shadow-sm overflow-hidden z-20">
                <SmartImage src="/assets/logo-beige.png" className="w-full h-full object-cover" alt="" fallback={<div className="text-xs">H</div>} />
              </div>
              <div className="w-12 h-12 rounded-full border-2 border-white bg-brand-red flex items-center justify-center font-black text-white shadow-sm overflow-hidden relative">
                {user.photoUrl ? (
                  <img src={user.photoUrl} alt={user.fullName} className="w-full h-full object-cover" />
                ) : (
                  user.fullName.charAt(0)
                )}
              </div>
            </div>
            <SmartImage src="/assets/logo-red.png" className="w-12 h-12 object-contain" alt="Logo" fallback={<div className="w-12 h-12 rounded-full bg-brand-red/10 flex items-center justify-center text-brand-red shadow-inner border border-brand-red/20"><Church className="w-6 h-6" /></div>} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-12">
        {/* Active Assessments Section */}
        {activeAssessments.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-4 md:mb-6 px-2">
              <h3 className="text-lg md:text-2xl font-black text-brand-text">{t('dashboard.active_assessments')}</h3>
              <Link to="/student/assessments" className="text-brand-red text-xs font-black uppercase tracking-widest hover:underline">{t('dashboard.see_all')}</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              <AnimatePresence>
                {activeAssessments.map((assessment, idx) => (
                  <motion.div
                    key={assessment.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => navigate(`/assessment/${assessment.id}`)}
                    className="bg-white p-5 md:p-8 rounded-3xl md:rounded-[40px] border border-brand-beige/10 hover:border-brand-red/20 transition-all cursor-pointer group shadow-sm hover:shadow-xl relative overflow-hidden"
                  >
                    {/* Subtle Gradient Overlay on Hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-red/[0.03] via-transparent to-brand-cream/[0.05] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    
                    {/* New Badge */}
                    {assessment.createdAt && 
                      !completedAssessmentIds.has(assessment.id) &&
                      (new Date().getTime() - new Date(assessment.createdAt).getTime() < 24 * 60 * 60 * 1000) && (
                      <div className="absolute top-6 left-0 -rotate-45 -translate-x-8 bg-brand-red text-white py-1 px-10 text-[9px] font-black uppercase tracking-widest shadow-lg z-20">
                        {t('dashboard.new')}
                      </div>
                    )}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-red/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
                    
                    <div className="relative z-10 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 bg-brand-cream text-brand-red rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 group-hover:bg-brand-red group-hover:text-white shadow-sm overflow-hidden relative">
                          <motion.div
                            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                            transition={{ repeat: Infinity, duration: 3 }}
                            className="absolute inset-0 bg-brand-red/5"
                          />
                          <BookOpen className="w-6 h-6 relative z-10" />
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1.5 text-orange-600 bg-orange-50 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter">
                            <TimerIcon className="w-3 h-3" />
                            <CountdownTimer expiresAt={assessment.expiresAt} />
                          </div>
                          <div className="flex items-center gap-1.5 text-brand-beige text-[9px] font-black uppercase">
                            <Users className="w-3 h-3" />
                            <span>{participantCounts[assessment.id!] || 0} {t('dashboard.participants')}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-base md:text-xl font-black text-brand-text leading-tight group-hover:text-brand-red transition-colors">{assessment.title}</h4>
                        <p className="text-[10px] text-brand-beige font-bold mt-2">{t('dashboard.click_to_start')}</p>
                      </div>

                      <div className="pt-4 flex items-center justify-between border-t border-brand-beige/5">
                        <div className="flex items-center gap-2 text-brand-beige">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold">{assessment.readingDuration + assessment.answerDuration} {t('dashboard.minutes')}</span>
                        </div>
                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-brand-cream flex items-center justify-center group-hover:bg-brand-red group-hover:text-white transition-all transform group-hover:-translate-x-1 rotate-180">
                          <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>
        )}

        {/* Stats Grid */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-12">
          {stats.map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white p-4 md:p-8 rounded-2xl md:rounded-[32px] border border-brand-beige/10 shadow-sm flex flex-col items-center text-center group hover:border-brand-red/20 transition-all relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-brand-red/[0.02] via-transparent to-brand-cream/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              
              <div className={`w-11 h-11 md:w-14 md:h-14 ${stat.color} rounded-xl md:rounded-2xl flex items-center justify-center mb-3 md:mb-4 transition-transform group-hover:scale-110 relative z-10 shadow-sm`}>
                <stat.icon className={cn("w-5.5 h-5.5 md:w-7 md:h-7", stat.animate && "animate-bounce mt-1")} />
                {stat.animate && (
                  <motion.div
                    animate={{ scale: [1, 1.5, 1], opacity: [0, 0.4, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 bg-current rounded-2xl opacity-20"
                  />
                )}
              </div>
              <p className="text-[10px] font-black text-brand-beige uppercase tracking-widest mb-1 relative z-10">{stat.label}</p>
              
              <div className="flex items-baseline gap-1 relative z-10">
                {stat.animate ? (
                  <div className="relative">
                    <motion.p 
                      initial={{ scale: 1 }}
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="text-2xl md:text-4xl font-black text-brand-text tracking-tighter"
                    >
                      {stat.value}
                    </motion.p>
                    {stat.value > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 0 }}
                        animate={{ opacity: [0, 1, 0], y: [-10, -30, -40] }}
                        transition={{ repeat: Infinity, duration: 3, delay: 1 }}
                        className="absolute -top-6 left-1/2 -translate-x-1/2 text-orange-500 font-black text-xs"
                      >
                        🔥
                      </motion.div>
                    )}
                  </div>
                ) : (
                  <p className="text-2xl md:text-4xl font-black text-brand-text tracking-tighter">{stat.value}</p>
                )}
                {stat.suffix && <span className="text-[10px] font-black text-brand-beige">{stat.suffix}</span>}
              </div>

              {(stat as any).description && (
                <p className="text-[8px] font-bold text-brand-beige mt-2 opacity-60">{(stat as any).description}</p>
              )}

              {stat.progress !== undefined && (
                <div className="w-full mt-4 space-y-1.5 relative z-10">
                  <div className="flex justify-between items-center text-[8px] font-black tracking-widest text-brand-beige px-1">
                    <span>XP</span>
                    <span>{Math.round(stat.progress)}%</span>
                  </div>
                  <div className="w-full h-2 bg-brand-cream rounded-full overflow-hidden shadow-inner">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${stat.progress}%` }}
                      className="h-full bg-gradient-to-r from-brand-red to-rose-400 rounded-full"
                      transition={{ duration: 1.5, ease: "easeOut" }}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
          {/* Progress Chart */}
          <section className="lg:col-span-2 space-y-4 md:space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-lg md:text-2xl font-black text-brand-text">تطور مستواك</h3>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-brand-red rounded-full" />
                <span className="text-[10px] font-black text-brand-beige uppercase tracking-widest">الدرجة المئوية</span>
              </div>
            </div>
            <div className="bg-white p-4 md:p-8 rounded-3xl md:rounded-[40px] border border-brand-beige/10 shadow-sm h-[280px] md:h-[400px]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#9E0000" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#9E0000" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F7F1E7" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#DFC69D', fontSize: 10, fontWeight: 900}}
                      dy={10}
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#DFC69D', fontSize: 10, fontWeight: 900}}
                      dx={-10}
                    />
                    <Tooltip 
                      contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.05)', fontWeight: 900}}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#9E0000" 
                      strokeWidth={4}
                      fillOpacity={1} 
                      fill="url(#colorScore)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-brand-beige opacity-40">
                  <Activity className="w-16 h-16 mb-4" />
                  <p className="font-bold">لسة مفيش درجات كفاية هنا</p>
                </div>
              )}
            </div>

            {/* Assessment History */}
            <div className="space-y-4 md:space-y-6 pt-4 md:pt-6">
              <h3 className="text-lg md:text-2xl font-black text-brand-text">تاريخ اختباراتك</h3>
              <div className="space-y-3 md:space-y-4">
                {submissions.slice(1).map((sub) => (
                  <motion.div 
                    key={sub.id}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[32px] border border-brand-beige/5 shadow-sm hover:border-brand-beige/20 transition-all group flex items-center justify-between relative overflow-hidden"
                  >
                    {/* Subtle Gradient Overlay on Hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-red/[0.01] via-transparent to-brand-cream/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    
                    <div className="flex items-center gap-3 md:gap-4 relative z-10">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-brand-cream rounded-xl md:rounded-2xl flex items-center justify-center text-brand-beige group-hover:bg-brand-red/5 group-hover:text-brand-red transition-all shrink-0">
                        <Calendar className="w-5 h-5 md:w-6 md:h-6" />
                      </div>
                      <div className="text-right">
                        <h4 className="font-black text-brand-text leading-tight text-sm md:text-base">{sub.assessmentTitle}</h4>
                        <p className="text-[10px] text-brand-beige font-bold">{formatDate(sub.date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 md:gap-10 relative z-10">
                      <div className="text-center hidden md:block">
                        <p className="text-[9px] font-black text-brand-beige uppercase mb-1">الدرجة</p>
                        <p className="font-black text-brand-text">{sub.finalScore}/{sub.maxScore}</p>
                        <div className="w-12 h-1 bg-brand-cream rounded-full mt-1 overflow-hidden">
                           <div 
                             className="h-full bg-brand-red" 
                             style={{ width: `${calculatePercentage(sub.finalScore, sub.maxScore)}%` }}
                           />
                        </div>
                      </div>
                      <div className={cn(
                        "px-3 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-2xl font-black text-[10px] uppercase tracking-widest min-w-[54px] md:min-w-[64px] text-center",
                        (sub.finalScore / (sub.maxScore || 1)) >= 0.8 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                      )}>
                        {calculatePercentage(sub.finalScore, sub.maxScore)}%
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Sidebar */}
          <aside className="space-y-6 md:space-y-10">
            {/* QR Attendance Card / Digital Membership */}
            <div className="bg-gradient-to-br from-[#1C0606] via-[#2A0505] to-[#1C0606] p-5 md:p-8 rounded-3xl md:rounded-[40px] border border-brand-beige/15 shadow-xl relative overflow-hidden text-white flex flex-col items-center select-none">
              {/* Decorative background glows */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-red/10 rounded-full blur-2xl animate-pulse" />
              <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-[#DFC69D]/10 rounded-full blur-2xl" />
              
              <div className="flex justify-between items-center w-full mb-4 md:mb-6 relative z-10 font-sans">
                <span className="text-[9px] font-black uppercase tracking-widest text-[#DFC69D] bg-white/5 border border-white/5 px-4 py-1.5 rounded-full">
                  كارت الحضور الحكواتي الرقمي
                </span>
                <Users className="w-4 h-4 text-[#DFC69D]" />
              </div>

              {/* QR Code Image */}
              <div 
                onClick={() => qrUrl && setIsQrModalOpen(true)}
                className="bg-[#FFFDF6] p-3 md:p-4 rounded-2xl md:rounded-[28px] shadow-lg border-2 border-[#DFC69D] relative z-10 transition-transform hover:scale-[1.05] cursor-pointer group"
                title="اضغط لتكبير كارت الحضور"
              >
                {qrUrl ? (
                  <>
                    <img src={qrUrl} alt="رابط كود الحضور" className="w-[110px] h-[110px] md:w-[140px] md:h-[140px] object-contain rounded-lg group-hover:opacity-80 transition-opacity" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <div className="bg-black/60 p-2 rounded-full text-white backdrop-blur-sm">
                        <QrCode className="w-6 h-6" />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="w-[110px] h-[110px] md:w-[140px] md:h-[140px] flex items-center justify-center text-brand-text font-bold text-xs">جاري التحميل...</div>
                )}
              </div>

              {/* Student Details */}
              <div className="text-center mt-5 w-full relative z-10 space-y-1.5 pb-4 border-b border-white/10">
                <h4 className="text-sm font-black text-white leading-tight tracking-wide">{user.fullName}</h4>
                <div className="flex items-center justify-center gap-2">
                  <span className="px-3 py-1 bg-brand-red text-white border border-brand-red/10 rounded-md text-[9px] font-black tracking-widest font-mono">
                    {user.code}
                  </span>
                  <span className="px-3 py-1 bg-white/10 text-[#DFC69D] rounded-md text-[9px] font-black tracking-widest leading-none">
                    {user.code?.toUpperCase().startsWith('H') ? "العهد القديم" : 
                     user.code?.toUpperCase().startsWith('N') ? "العهد الجديد" :
                     user.code?.toUpperCase().startsWith('S') ? "خدام" : "مشارك عام"}
                  </span>
                </div>
                <p className="text-[8px] text-brand-beige/60 font-medium tracking-wide leading-relaxed pt-2 pb-1">
                  وجه هذا الرمز للمسؤول لتسجيل حضورك ونقاطك اليوم
                </p>
                <button
                  onClick={() => {
                    if (qrUrl) {
                      const link = document.createElement("a");
                      link.href = qrUrl;
                      link.download = `QR_${user.code || 'code'}_${user.fullName}.png`;
                      link.click();
                    }
                  }}
                  className="mt-3.5 w-full py-2 bg-white/5 hover:bg-white/10 text-white hover:text-brand-red rounded-xl font-black text-[10px] transition-all border border-white/5 flex items-center justify-center gap-1.5 cursor-pointer"
                  title="تحميل كارت الحضور QR للجهاز"
                >
                  <Download className="w-3.5 h-3.5 text-brand-red" />
                  تحميل كارت الحضور الخاص بك
                </button>
              </div>

              {/* Live Attendance Status Badge/Panel */}
              <div className="pt-4 w-full text-right space-y-3 relative z-10">
                <span className="text-[9px] font-black uppercase tracking-widest text-[#DFC69D] block mb-1">
                  حالة تسجيل الغياب والترتيبات اليوم
                </span>

                {todayAttendance ? (
                  <div className="bg-emerald-950/40 border border-emerald-500/20 p-3.5 rounded-2xl space-y-1.5 animate-fade-in relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl" />
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-emerald-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        تم رصد الحضور بنجاح ✅
                      </span>
                      <span className="font-sans font-black text-xs text-emerald-300">
                        +{todayAttendance.points} درجة
                      </span>
                    </div>
                    <p className="text-white text-xs font-black truncate leading-tight">
                      {todayAttendance.lectureName || (todayAttendance.meetingType === 'OT' ? 'العهد القديم' : 'العهد الجديد')}
                    </p>
                    <div className="flex justify-between items-center text-[10px] text-white/50 pt-0.5 border-t border-white/5 mt-1 font-semibold">
                      <span>وقت التسجيل:</span>
                      <span className="font-sans font-extrabold text-white">{todayAttendance.scanTime || "غير محدد"}</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-brand-red/10 border border-brand-red/20 p-3.5 rounded-2xl space-y-1.5 animate-fade-in">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-amber-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        بانتظار مسح كود الكارت...
                      </span>
                      <span className="text-[9px] font-black text-white/30">لم يسجل اليوم 🕒</span>
                    </div>
                    <p className="text-[10px] text-brand-beige font-semibold leading-relaxed pt-1">
                      اعرض الباركود الرقمي بالأعلى على أجهزة الخدام لرصد تواجدك بالمحاضرة الحالية تلقائياً.
                    </p>
                  </div>
                )}

                {/* Attendance Stats Summary */}
                {userAttendanceList.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 text-center pt-1 animate-fade-in">
                    <div className="bg-white/5 border border-white/5 p-2 rounded-xl">
                      <span className="text-[8px] text-brand-beige font-black block uppercase">إجمالي الحضور</span>
                      <span className="text-xs font-black text-white font-sans">{userAttendanceList.length} محاضرات</span>
                    </div>
                    <div className="bg-white/5 border border-white/5 p-2 rounded-xl">
                      <span className="text-[8px] text-brand-beige font-black block uppercase">الدرجات المكتسبة</span>
                      <span className="text-xs font-black text-[#DFC69D] font-sans">
                        {userAttendanceList.reduce((acc: number, curr: any) => acc + (curr.points || 0), 0)} درجة
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Achievements Panel */}
            <div className="bg-white p-5 md:p-8 rounded-3xl md:rounded-[40px] border border-brand-beige/10 shadow-sm space-y-4 md:space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base md:text-xl font-black text-brand-text flex items-center gap-2 md:gap-3">
                  <Medal className="w-5 h-5 text-brand-red" />
                  أوسمتك الأخيرة
                </h3>
                <Link to="/student/achievements" className="text-[10px] font-black text-brand-red uppercase tracking-widest hover:underline">
                  شاهد الكل
                </Link>
              </div>
              
              <div className="flex flex-wrap gap-2.5 md:gap-3">
                {user.badges && user.badges.length > 0 ? (
                  user.badges.slice(-4).reverse().map((bId) => {
                    const badge = BADGES.find(b => b.id === bId);
                    if (!badge) return null;
                    return (
                      <div key={bId} className="w-12 h-12 md:w-14 md:h-14 bg-brand-cream rounded-[18px] md:rounded-2xl flex items-center justify-center text-xl md:text-2xl shadow-sm relative group" title={badge.name}>
                        {badge.icon}
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center p-1 border-2 border-white shadow-sm">
                          <CheckCircle2 className="w-2 h-2" />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center w-full py-4 text-center opacity-30">
                    <Medal className="w-8 h-8 mb-2" />
                    <p className="text-[10px] font-bold">ابدأ رحلتك للحصول على الأوسمة</p>
                  </div>
                )}
              </div>
            </div>

            {/* Upcoming Badges / Milestones */}
            <div className="bg-white p-5 md:p-8 rounded-3xl md:rounded-[40px] border border-brand-beige/10 shadow-sm space-y-4 md:space-y-6">
              <h3 className="text-base md:text-xl font-black text-brand-text flex items-center gap-2 md:gap-3">
                <Target className="w-5 h-5 text-brand-red" />
                الأوسمة القادمة
              </h3>
              <div className="space-y-6">
                {[
                  { id: 'streak-7', name: '7 أيام متتالية', icon: '🔥', current: user.streak, target: 7, label: 'أيام' },
                  { id: 'points-500', name: '500 نقطة', icon: '👑', current: user.totalPoints, target: 500, label: 'نقطة' },
                  { id: 'pro-solver', name: 'خبير الأسئلة', icon: '🧠', current: user.totalPoints, target: 1000, label: 'نقطة' }
                ].filter(b => b.current < b.target && !(user.badges || []).includes(b.id)).slice(0, 2).map((badge) => (
                  <div key={badge.id} className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-cream rounded-xl flex items-center justify-center text-xl shadow-sm">
                          {badge.icon}
                        </div>
                        <div>
                          <p className="text-xs font-black text-brand-text">{badge.name}</p>
                          <p className="text-[10px] text-brand-beige font-bold">{badge.target - badge.current} {badge.label} متبقي</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-brand-red">{Math.round((badge.current / badge.target) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-brand-cream rounded-full overflow-hidden shadow-inner">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (badge.current / badge.target) * 100)}%` }}
                        className="h-full bg-brand-red rounded-full"
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                ))}
                
                {(!user.badges || user.badges.length < 3) && (
                  <div className="pt-2">
                    <Link to="/student/achievements" className="flex items-center justify-center gap-2 w-full py-3 bg-brand-cream/50 rounded-2xl text-brand-beige text-[10px] font-black uppercase tracking-widest hover:bg-brand-red hover:text-white transition-all group">
                      <span>مشاهدة كل الأوسمة</span>
                      <ArrowRight className="w-4 h-4 transform rotate-180 group-hover:-translate-x-1 transition-transform" />
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Latest Result Card */}
            {showLatestResult && (
              <div>
                <h4 className="text-sm font-black text-brand-beige uppercase tracking-[0.2em] mb-4">{t('dashboard.latest_test')}</h4>
                {latestSubmission ? (
                  <div className="neo-card p-5 md:p-8 bg-white border-brand-beige/10 rounded-3xl md:rounded-[40px] relative overflow-hidden group/card shadow-sm hover:shadow-md transition-shadow">
                    <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full blur-2xl group-hover/card:bg-brand-red/10 transition-all duration-500" style={{ backgroundColor: `${user.sidebarColor || '#9E0000'}1a` }} />
                    <div className="relative z-10 space-y-4 md:space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 bg-brand-red text-white rounded-xl flex items-center justify-center shadow-lg transform group-hover/card:rotate-12 transition-all" style={{ backgroundColor: user.sidebarColor }}>
                          <Calendar className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black text-brand-beige italic group-hover/card:text-brand-text transition-colors">{formatDate(latestSubmission.date)}</span>
                      </div>
                      <div>
                        <h4 className="text-base md:text-xl font-black text-brand-text line-clamp-2 transition-colors" style={{ color: user.sidebarColor }}>{latestSubmission.assessmentTitle}</h4>
                        <div className="mt-4 flex items-center gap-3">
                          <div className="flex-1 h-3 bg-brand-cream rounded-full overflow-hidden shadow-inner">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${calculatePercentage(latestSubmission.finalScore, latestSubmission.maxScore)}%` }}
                              className="h-full bg-brand-red rounded-full"
                              style={{ backgroundColor: user.sidebarColor }}
                            />
                          </div>
                          <span className="font-black text-brand-red text-sm transition-transform group-hover/card:scale-110" style={{ color: user.sidebarColor }}>{calculatePercentage(latestSubmission.finalScore, latestSubmission.maxScore)}%</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 md:gap-4">
                        <div className="bg-brand-cream/30 p-3 md:p-4 rounded-xl md:rounded-2xl text-center hover:bg-brand-cream/50 transition-colors">
                          <Clock className="w-4 h-4 mx-auto mb-2 text-brand-beige" />
                          <p className="text-[10px] font-black text-brand-beige uppercase mb-1">{t('dashboard.time_taken')}</p>
                          <p className="font-black text-brand-text text-xs md:text-sm">{Math.floor(latestSubmission.answeringTimeSeconds / 60)}{t('dashboard.minute')}</p>
                        </div>
                        <div className="bg-brand-cream/30 p-3 md:p-4 rounded-xl md:rounded-2xl text-center hover:bg-brand-cream/50 transition-colors">
                          <Trophy className="w-4 h-4 mx-auto mb-2 text-brand-beige" />
                          <p className="text-[10px] font-black text-brand-beige uppercase mb-1">{t('dashboard.points_label_short')}</p>
                          <p className="font-black text-brand-text">+{latestSubmission.bonusPoints}</p>
                        </div>
                      </div>
                      {latestSubmission.answers[0]?.feedback && (
                        <div className="bg-emerald-50 p-6 rounded-[24px] border border-emerald-100 italic text-emerald-800 text-xs font-bold leading-relaxed shadow-inner">
                          " {latestSubmission.answers[0].feedback} "
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="neo-card p-12 text-center text-brand-beige opacity-50 bg-white">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                    <p className="font-bold">{t('dashboard.no_tests_yet')}</p>
                  </div>
                )}
              </div>
            )}

            {/* Profile Info */}
            <div className="bg-white p-8 rounded-[40px] border border-brand-beige/10 shadow-sm space-y-8 relative overflow-hidden group/profile">
              {/* Theme Highlight */}
              <div 
                className="absolute top-0 right-0 left-0 h-2 bg-brand-red opacity-10 group-hover/profile:opacity-100 transition-opacity" 
                style={{ backgroundColor: user.sidebarColor || '#9E0000' }}
              />
              
              <div className="text-center space-y-4">
                <div className="relative inline-block group/avatar">
                  <div className="w-16 h-16 md:w-24 md:h-24 rounded-[24px] md:rounded-[32px] bg-brand-cream mx-auto flex items-center justify-center font-black text-brand-text text-2xl md:text-3xl shadow-inner overflow-hidden border-2 border-white">
                    {user.photoUrl ? (
                      <img src={user.photoUrl} alt={user.fullName} className="w-full h-full object-cover" />
                    ) : (
                      user.fullName.charAt(0)
                    )}
                  </div>
                  <button 
                    onClick={openEditModal}
                    className="absolute -bottom-1 -right-1 w-8 h-8 bg-brand-red text-white rounded-full flex items-center justify-center border-2 border-white shadow-lg opacity-0 group-hover/avatar:opacity-100 transition-all hover:scale-110"
                    style={{ backgroundColor: user.sidebarColor || '#9E0000' }}
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div>
                  <h4 className="text-2xl font-black text-brand-text group-hover/profile:text-brand-red transition-colors" style={{ color: user.sidebarColor }}>{user.fullName}</h4>
                  <p className="text-brand-beige font-black uppercase text-[10px] tracking-widest mt-1">{t('common.code')}: {user.code}</p>
                </div>
              </div>
              <div className="pt-6 border-t border-brand-beige/5 space-y-4">
                <h5 className="text-[10px] font-black text-brand-beige uppercase tracking-[0.2em] mb-2 px-2">{t('dashboard.personal_info')}</h5>
                <div className="grid grid-cols-2 gap-3">
                  <InfoItem icon={<Church />} label={t('dashboard.church')} value={user.church} className="col-span-2" themeColor={user.sidebarColor} />
                  <InfoItem icon={<Smartphone />} label={t('dashboard.whatsapp')} value={user.whatsappNumber} themeColor={user.sidebarColor} />
                  <InfoItem icon={<Calendar />} label={t('dashboard.birth_date')} value={user.birthDate ? formatDate(user.birthDate) : undefined} themeColor={user.sidebarColor} />
                  {showLocationInSidebar && <InfoItem icon={<MapPin />} label={t('dashboard.address')} value={user.address} className="col-span-2" themeColor={user.sidebarColor} />}
                  <InfoItem icon={<Calendar />} label={t('common.joined')} value={formatDate(user.registrationDate)} themeColor={user.sidebarColor} />
                  <InfoItem icon={<Flame />} label={t('dashboard.streak')} value={`${user.streak} ${t('dashboard.day')}`} themeColor={user.sidebarColor} />
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setIsEditModalOpen(false)}
               className="absolute inset-0 bg-brand-text/40 backdrop-blur-md"
             />
             <motion.div
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="bg-white rounded-[40px] p-8 md:p-10 max-w-lg w-full shadow-2xl relative z-10 overflow-hidden"
             >
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="absolute top-6 left-6 p-2 hover:bg-brand-cream rounded-xl text-brand-beige transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>

                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-brand-cream rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Edit className="w-8 h-8 text-brand-red" />
                  </div>
                  <h2 className="text-2xl font-black text-brand-text">تعديل بياناتي</h2>
                  <p className="text-brand-beige text-xs font-bold mt-1 uppercase tracking-widest">حدث بياناتك الشخصية</p>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-10 max-h-[60vh] overflow-y-auto px-1 custom-scrollbar">
                  {/* Photo Edit */}
                  <div className="flex flex-col items-center mb-6">
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="relative group cursor-pointer"
                    >
                      <div className="w-24 h-24 rounded-[32px] bg-brand-cream border-2 border-dashed border-brand-red/30 flex items-center justify-center overflow-hidden transition-all group-hover:border-brand-red">
                        {editPhotoUrl ? (
                          <img src={editPhotoUrl} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <Camera className="w-8 h-8 text-brand-red/40" />
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-brand-red text-white rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                        <Plus className="w-4 h-4" />
                      </div>
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      accept="image/*" 
                      className="hidden" 
                    />
                    <p className="text-[10px] font-black text-brand-beige uppercase tracking-widest mt-2">تغيير الصورة</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right">
                    <div className="space-y-2 md:col-span-2">
                       <label className="text-[10px] font-black text-brand-beige uppercase tracking-widest mr-1">كود الطالب (غير قابل للتعديل)</label>
                       <div className="w-full bg-brand-cream/50 rounded-2xl px-6 py-4 font-black text-brand-beige border-2 border-transparent">
                          {user.code}
                       </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-brand-beige uppercase tracking-widest mr-1">الكنيسة</label>
                      <input
                        type="text"
                        value={editChurch}
                        onChange={(e) => setEditChurch(e.target.value)}
                        required
                        className="w-full bg-brand-cream rounded-2xl px-6 py-4 outline-none border-2 border-transparent focus:border-brand-red/10 font-bold"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-brand-beige uppercase tracking-widest mr-1">تاريخ الميلاد</label>
                      <input
                        type="date"
                        value={editBirthDate}
                        onChange={(e) => setEditBirthDate(e.target.value)}
                        required
                        className="w-full bg-brand-cream rounded-2xl px-6 py-4 outline-none border-2 border-transparent focus:border-brand-red/10 font-bold"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-black text-brand-beige uppercase tracking-widest mr-1">رقم الواتساب</label>
                      <input
                        type="text"
                        value={editWhatsApp}
                        onChange={(e) => setEditWhatsApp(e.target.value)}
                        required
                        placeholder="01234567890"
                        className="w-full bg-brand-cream rounded-2xl px-6 py-4 outline-none border-2 border-transparent focus:border-brand-red/10 font-bold"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-black text-brand-beige uppercase tracking-widest mr-1">العنوان</label>
                      <input
                        type="text"
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        required
                        className="w-full bg-brand-cream rounded-2xl px-6 py-4 outline-none border-2 border-transparent focus:border-brand-red/10 font-bold"
                      />
                    </div>

                    <div className="space-y-3 md:col-span-2 pt-4 border-t border-brand-beige/10">
                       <label className="text-[10px] font-black text-brand-beige uppercase tracking-[0.2em] mr-1">تخصيص لون المنصة المفضل</label>
                       <div className="flex flex-wrap gap-4 p-6 bg-brand-cream/50 rounded-[32px] border border-brand-beige/10 shadow-inner group/colors">
                          {['#9E0000', '#2563eb', '#16a34a', '#d97706', '#7c3aed', '#db2777', '#0f172a'].map(color => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setEditSidebarColor(color)}
                              className={cn(
                                "w-11 h-11 rounded-2xl border-4 transition-all relative overflow-hidden group/item",
                                editSidebarColor === color 
                                  ? "border-white shadow-xl scale-110 z-10" 
                                  : "border-transparent opacity-60 hover:opacity-100 hover:scale-105"
                              )}
                              style={{ backgroundColor: color }}
                            >
                               {editSidebarColor === color && (
                                 <motion.div 
                                   initial={{ scale: 0 }}
                                   animate={{ scale: 1 }}
                                   className="absolute inset-0 flex items-center justify-center bg-black/10"
                                 >
                                   <CheckCircle2 className="w-5 h-5 text-white" />
                                 </motion.div>
                               )}
                            </button>
                          ))}
                          <div className={cn(
                            "relative w-11 h-11 rounded-2xl border-4 transition-all flex items-center justify-center overflow-hidden bg-white shadow-sm",
                            !['#9E0000', '#2563eb', '#16a34a', '#d97706', '#7c3aed', '#db2777', '#0f172a'].includes(editSidebarColor)
                              ? "border-white scale-110 z-10" 
                              : "border-transparent opacity-60 hover:opacity-100"
                          )}>
                             <input 
                                type="color" 
                                value={editSidebarColor}
                                onChange={(e) => setEditSidebarColor(e.target.value)}
                                className="absolute inset-0 w-full h-full cursor-pointer opacity-0 z-20"
                             />
                             <div 
                                className="absolute inset-0 transition-opacity" 
                                style={{ backgroundColor: editSidebarColor, opacity: !['#9E0000', '#2563eb', '#16a34a', '#d97706', '#7c3aed', '#db2777', '#0f172a'].includes(editSidebarColor) ? 1 : 0 }} 
                             />
                             <Plus className={cn(
                               "w-5 h-5 transition-colors relative z-10",
                               !['#9E0000', '#2563eb', '#16a34a', '#d97706', '#7c3aed', '#db2777', '#0f172a'].includes(editSidebarColor) ? "text-white" : "text-brand-beige"
                             )} />
                          </div>
                       </div>
                    </div>

                    <div className="space-y-4 md:col-span-2 pt-4 border-t border-brand-beige/10">
                       <h3 className="text-sm font-black text-brand-text">عناصر السايد بار</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <label className="flex items-center justify-between p-4 bg-brand-cream rounded-2xl cursor-pointer group">
                             <div className="flex items-center gap-3">
                                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-colors px-2 py-2", showLatestResult ? "bg-brand-red text-white" : "bg-white text-brand-beige")}>
                                   <Trophy className="w-4 h-4" />
                                </div>
                                <span className={cn("text-xs font-bold transition-colors", showLatestResult ? "text-brand-text" : "text-brand-beige")}>إظهار آخر نتيجة</span>
                             </div>
                             <input 
                                type="checkbox" 
                                checked={showLatestResult}
                                onChange={(e) => setShowLatestResult(e.target.checked)}
                                className="w-5 h-5 rounded border-brand-beige text-brand-red focus:ring-brand-red"
                             />
                          </label>

                          <label className="flex items-center justify-between p-4 bg-brand-cream rounded-2xl cursor-pointer group">
                             <div className="flex items-center gap-3">
                                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-colors px-2 py-2", showLocationInSidebar ? "bg-brand-red text-white" : "bg-white text-brand-beige")}>
                                   <MapPin className="w-4 h-4" />
                                </div>
                                <span className={cn("text-xs font-bold transition-colors", showLocationInSidebar ? "text-brand-text" : "text-brand-beige")}>إظهار العنوان</span>
                             </div>
                             <input 
                                type="checkbox" 
                                checked={showLocationInSidebar}
                                onChange={(e) => setShowLocationInSidebar(e.target.checked)}
                                className="w-5 h-5 rounded border-brand-beige text-brand-red focus:ring-brand-red"
                             />
                          </label>
                       </div>
                    </div>

                    <div className="space-y-4 md:col-span-2 pt-4 border-t border-brand-beige/10">
                        <h3 className="text-sm font-black text-brand-text">تخصيص الإشعارات</h3>
                        <div className="grid grid-cols-1 gap-3">
                           {[
                             { label: "تنبيهات الاختبارات والنتائج", id: "assessments", value: notifAssessments, setter: setNotifAssessments, icon: <BookOpen className="w-4 h-4" /> },
                             { label: "الأوسمة والمستويات", id: "achievements", value: notifAchievements, setter: setNotifAchievements, icon: <Medal className="w-4 h-4" /> },
                             { label: "إعلانات الإدارة والمسابقات", id: "announcements", value: notifAnnouncements, setter: setNotifAnnouncements, icon: <Bell className="w-4 h-4" /> }
                           ].map(pref => (
                              <label key={pref.id} className="flex items-center justify-between p-4 bg-brand-cream/50 rounded-2xl cursor-pointer hover:bg-brand-cream transition-colors">
                                 <div className="flex items-center gap-3">
                                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-colors", pref.value ? "bg-brand-red text-white" : "bg-white text-brand-beige")}>
                                       {pref.icon}
                                    </div>
                                    <span className="text-xs font-bold text-brand-text">{pref.label}</span>
                                 </div>
                                 <div className={cn(
                                   "w-10 h-6 rounded-full p-1 transition-colors",
                                   pref.value ? "bg-brand-red" : "bg-brand-beige/20"
                                 )}>
                                   <div className={cn(
                                     "w-4 h-4 bg-white rounded-full transition-transform",
                                     pref.value ? (user?.sidebarColor === '#9E0000' || !user?.sidebarColor ? "-translate-x-4" : "-translate-x-4") : "translate-x-0"
                                   )} />
                                 </div>
                                 <input 
                                    type="checkbox" 
                                    checked={pref.value}
                                    onChange={(e) => pref.setter(e.target.checked)}
                                    className="hidden"
                                  />
                              </label>
                           ))}
                        </div>
                     </div>
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSaving}
                    className={cn(
                      "w-full bg-brand-red text-white py-5 rounded-2xl font-black text-sm shadow-xl shadow-brand-red/20 transition-all flex items-center justify-center gap-3",
                      isSaving ? "opacity-70 cursor-not-allowed" : "hover:scale-[1.02] active:scale-95"
                    )}
                  >
                    {isSaving ? "جاري الحفظ..." : "حفظ التعديلات"}
                    {!isSaving && <Save className="w-5 h-5" />}
                  </button>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QR Code Full Screen Modal */}
      <AnimatePresence>
        {isQrModalOpen && (
          <div className="fixed inset-0 min-h-[100dvh] flex items-center justify-center p-4 z-[9999] bg-[#1C0606]/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative bg-white rounded-[32px] p-6 max-w-sm w-full mx-auto shadow-2xl flex flex-col items-center gap-6"
            >
              <button 
                onClick={() => setIsQrModalOpen(false)}
                className="absolute top-4 right-4 p-2 bg-brand-cream text-brand-text rounded-full hover:bg-brand-red hover:text-white transition-all shadow-sm z-50"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="text-center mt-2">
                <h3 className="font-black text-xl text-brand-text mb-1">كارت الدخول</h3>
                <p className="text-[10px] text-brand-beige font-black uppercase tracking-widest">{user?.fullName}</p>
              </div>

              <div className="w-full aspect-square relative bg-white p-4 rounded-2xl border-4 border-brand-red/10 shadow-inner">
                {qrUrl ? (
                  <img src={qrUrl} alt="QR Code" className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-brand-beige">جاري التحميل...</div>
                )}
                
                {/* Decorative scanning line effect */}
                <motion.div 
                  initial={{ top: 0, opacity: 0 }}
                  animate={{ top: '100%', opacity: [0, 1, 1, 0] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                  className="absolute left-0 right-0 h-1 bg-brand-red/50 shadow-[0_0_15px_rgba(158,0,0,0.5)] z-20 pointer-events-none"
                />
              </div>

              <div className="flex flex-col gap-3 w-full items-center">
                 <span className="px-5 py-2.5 bg-brand-cream text-brand-text border border-brand-beige/20 rounded-xl text-sm font-black tracking-widest font-mono">
                    {user?.code}
                 </span>
                 <button
                   onClick={() => {
                     if (qrUrl) {
                       const link = document.createElement("a");
                       link.href = qrUrl;
                       link.download = `QR_${user?.code || 'code'}_${user?.fullName}.png`;
                       link.click();
                     }
                   }}
                   className="w-full py-3 bg-brand-red text-white hover:bg-brand-red/90 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer hover:scale-[1.02]"
                 >
                   <Download className="w-4 h-4 shrink-0 text-white" />
                   <span>تحميل رمز الاستجابة السريعة (QR)</span>
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Attendance Celebration Modal */}
      <AnimatePresence>
        {showCelebration && (
          <div className="fixed inset-0 min-h-[100dvh] flex items-center justify-center p-4 z-[9999] bg-[#1C0606]/40 backdrop-blur-sm pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className="bg-white rounded-[32px] p-8 max-w-sm w-full mx-auto shadow-2xl flex flex-col items-center gap-6 text-center border-4 border-brand-red/10"
            >
              <div className="w-20 h-20 bg-brand-red/10 rounded-full flex items-center justify-center text-brand-red">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              
              <div>
                <h3 className="font-black text-2xl text-brand-text mb-2">حضور موفق!</h3>
                <p className="text-sm text-brand-beige font-semibold leading-relaxed">
                  تم تسجيل حضورك بنجاح. استمر في الانضباط وجمع النقاط! 🌟
                </p>
              </div>

              {todayAttendance?.points > 0 && (
                <div className="px-5 py-3 bg-brand-cream border border-brand-beige/20 rounded-2xl flex items-center gap-3">
                  <span className="text-[10px] font-black uppercase text-brand-beige">النقاط المكتسبة</span>
                  <span className="text-xl font-black text-brand-red">+{todayAttendance.points}</span>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoItem({ icon, label, value, className, themeColor }: { icon: React.ReactElement, label: string, value?: string | number, className?: string, themeColor?: string }) {
  if (value === undefined || value === null || value === "") return null;
  
  return (
    <div className={cn(
      "flex flex-col gap-2 p-3 bg-brand-cream/30 rounded-2xl border border-brand-beige/5 group/info transition-all hover:bg-white hover:shadow-sm",
      className
    )}>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-brand-beige transition-all shadow-sm group-hover/info:text-brand-red"
             style={{ color: undefined }}
             onMouseEnter={(e) => {
               if (themeColor) {
                 (e.currentTarget as HTMLElement).style.color = themeColor;
               }
             }}
             onMouseLeave={(e) => {
               (e.currentTarget as HTMLElement).style.color = '';
             }}
        >
          {React.cloneElement(icon, { className: "w-3.5 h-3.5" })}
        </div>
        <span className="text-[8px] font-black text-brand-beige uppercase tracking-widest">{label}</span>
      </div>
      <span className="text-xs font-black text-brand-text leading-relaxed text-right">
        {value}
      </span>
    </div>
  );
}
