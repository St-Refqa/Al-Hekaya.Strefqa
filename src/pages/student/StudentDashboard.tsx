import React, { useState, useEffect, useMemo } from "react";
import QRCode from "qrcode";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType, supabase } from "../../lib/firebase";
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
  Download,
  ShoppingBag,
  Crown,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Link, useNavigate } from "react-router-dom";
import {
  formatDate,
  cn,
  calculatePercentage,
  compressImage,
} from "../../lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { parseISO, differenceInDays } from "date-fns";
import { calculateLevel, checkNewBadges, BADGES, calculateTestStreaks } from "../../lib/gamification";
import { SmartImage } from "../../components/ui/SmartImage";
import NotificationBell from "../../components/ui/NotificationBell";
import { notificationService } from "../../lib/notificationService";
import { useTranslation } from "react-i18next";
import { safeLocalStorage, safeSessionStorage } from "../../lib/storage";
import { usePushNotifications } from "../../hooks/usePushNotifications";

// Helper component for live countdown
function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState("");
  const { t } = useTranslation();

  useEffect(() => {
    const calculate = () => {
      const diff = new Date(expiresAt).getTime() - new Date().getTime();
      if (diff <= 0) {
        setTimeLeft(t("dashboard.ended") || "انتهى");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
      );
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0)
        setTimeLeft(
          `${days} ${t("dashboard.day")} و ${hours} ${t("dashboard.hour")}`,
        );
      else if (hours > 0)
        setTimeLeft(
          `${hours} ${t("dashboard.hour")} و ${mins} ${t("dashboard.minute")}`,
        );
      else setTimeLeft(`${mins} ${t("dashboard.minute")}`);
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
  const [allActiveAssessments, setAllActiveAssessments] = useState<Assessment[]>([]);
  const [participantCounts, setParticipantCounts] = useState<
    Record<string, number>
  >({});
  const navigate = useNavigate();
  const [qrUrl, setQrUrl] = useState<string>("");
  const [userAttendanceList, setUserAttendanceList] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [pointLogs, setPointLogs] = useState<any[]>([]);
  const [showPointsLedger, setShowPointsLedger] = useState(false);
  const [streakLeaderboard, setStreakLeaderboard] = useState<{ uid: string; fullName: string; photoUrl?: string; streak: number; code?: string }[]>([]);
  const { isSubscribed, permission, requestPermission } = usePushNotifications();

  // Generate local QR Code for Attendance scanning
  useEffect(() => {
    if (user && user.code) {
      const payload = `alhekaya:presence:${user.uid}:${user.code.toUpperCase()}`;
      QRCode.toDataURL(payload, {
        margin: 2,
        width: 256,
        color: {
          dark: "#1C0606",
          light: "#FFFDF6",
        },
      })
        .then(setQrUrl)
        .catch((err) => {
          console.error("Failed to generate user attendance QR code:", err);
        });
    }
  }, [user]);

  // Profile Settings Read
  const [showLatestResult, setShowLatestResult] = useState(
    user?.sidebarSettings?.showLatestResult !== false,
  );
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  const isInitialAttendanceLoadCompleted = React.useRef(false);

  useEffect(() => {
    if (!user) return;

    // 1. User Submissions
    const q = query(
      collection(db, "submissions"),
      where("participantId", "==", user.uid),
      orderBy("date", "desc"),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Submission,
        );
        setSubmissions(data);
      },
      (error) => {
        handleFirestoreError(
          error,
          OperationType.LIST,
          `submissions (participant: ${user.uid})`,
        );
      },
    );

    // 2. Active Assessments
    const assQ = query(
      collection(db, "assessments"),
      orderBy("createdAt", "desc"),
    );
    const unsubscribeAss = onSnapshot(assQ, (snapshot) => {
      const data = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() }) as Assessment,
      );
      let allActive = data.filter((a) => a.status === "active" && new Date(a.expiresAt) > new Date());
      
      // Filter based on target group or target student code for dashboard widget
      if (user) {
        allActive = allActive.filter(a => {
          if (user.role === 'admin') return true;
          
          const targetCode = a.targetStudentCode?.trim().toUpperCase();
          const studentCode = user.code?.trim().toUpperCase() || "";

          if (targetCode) {
            return studentCode === targetCode;
          }

          if (!a.targetGroup || a.targetGroup === 'all') return true;
          if (a.targetGroup === 'servant' && user.role === 'student' && studentCode.startsWith('S')) return true;
          if (a.targetGroup === 'OT' && user.role === 'student' && studentCode.startsWith('H')) return true;
          if (a.targetGroup === 'NT' && user.role === 'student' && studentCode.startsWith('N')) return true;
          return false;
        });
      }

      setAllActiveAssessments(allActive);
      setActiveAssessments(allActive.slice(0, 3));
    });

    // 3. Participant Counts
    const fetchParticipantCounts = async () => {
      try {
        const { data, error } = await supabase.from('submissions').select('assessmentId');
        if (!error && data) {
          const counts: Record<string, number> = {};
          data.forEach(sub => {
            counts[sub.assessmentId] = (counts[sub.assessmentId] || 0) + 1;
          });
          setParticipantCounts(counts);
        }
      } catch (err) {
        console.error("Failed to fetch participant counts", err);
      }
    };
    fetchParticipantCounts();

    // 4. User Attendance Logs
    const attendanceQ = query(
      collection(db, "attendance"),
      where("studentId", "==", user.uid),
      orderBy("timestamp", "desc"),
    );
    const unsubscribeAttendance = onSnapshot(
      attendanceQ,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUserAttendanceList(data);
        setTimeout(() => {
          isInitialAttendanceLoadCompleted.current = true;
        }, 500);
      },
      (err) => {
        console.error("Error loading user attendance logs:", err);
      },
    );

    // 5. Purchases
    const purchasesQ = query(
      collection(db, "purchases"),
      where("userId", "==", user.uid),
      orderBy("purchaseDate", "desc"),
    );
    const unsubscribePurchases = onSnapshot(purchasesQ, (snap) => {
      setPurchases(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
       console.error("Error loading purchases:", err);
    });

    // 6. Point Logs
    const pointLogsQ = query(
      collection(db, "pointLogs"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
    );
    const unsubscribePointLogs = onSnapshot(pointLogsQ, (snap) => {
      setPointLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.warn("Error loading point logs (might be permission):", err);
    });

    return () => {
      unsubscribe();
      unsubscribeAss();
      unsubscribeAttendance();
      unsubscribePurchases();
      unsubscribePointLogs();
    };
  }, [user?.uid]);

  // Streak Leaderboard: fetch top 10 users by streak
  useEffect(() => {
    const userPrefix = user?.code ? user.code.substring(0, 1).toUpperCase() : '';
    const q = query(collection(db, 'users'), where('role', '==', 'student'));
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map(d => ({ uid: d.id, ...d.data() } as any));
      const filtered = all
        .filter((u: any) => {
          const code = (u.code || '').toUpperCase();
          if (userPrefix === 'H' && code.startsWith('H')) return true;
          if (userPrefix === 'N' && code.startsWith('N')) return true;
          if (userPrefix === 'S' && code.startsWith('S')) return true;
          if (!['H', 'N', 'S'].includes(userPrefix)) return true;
          return false;
        })
        .map((u: any) => {
          let trueStreak = u.streak || 0;
          if (trueStreak > 0 && u.lastActive) {
            const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
            const today = parseISO(todayStr);
            const lastActiveDate = parseISO(u.lastActive);
            if (differenceInDays(today, lastActiveDate) > 1) {
              trueStreak = 0;
            }
          }
          return { ...u, streak: trueStreak };
        })
        .filter((u: any) => (u.streak || 0) > 0)
        .sort((a: any, b: any) => (b.streak || 0) - (a.streak || 0))
        .slice(0, 10)
        .map((u: any) => ({
          uid: u.uid,
          fullName: u.fullName || 'بدون اسم',
          photoUrl: u.photoUrl,
          streak: u.streak || 0,
          code: u.code,
        }));
      setStreakLeaderboard(filtered);
    });
    return () => unsub();
  }, [user?.code]);

  // Check for new badges on mount
  useEffect(() => {
    if (!user) return;
    const newBadges = checkNewBadges(user);
    if (newBadges.length > 0) {
      // Keep track of attempted badges in this browser tab session to avoid infinite update loops if the write fails (e.g. Quota Exceeded)
      const attemptKey = `attempted_badges_${user.uid}`;
      const alreadyAttemptedStr = safeSessionStorage.getItem(attemptKey) || "";
      const alreadyAttempted = alreadyAttemptedStr.split(",").filter(Boolean);
      
      const unattemptedNewBadges = newBadges.filter(b => !alreadyAttempted.includes(b));
      if (unattemptedNewBadges.length === 0) return;

      const updatedBadges = [...(user.badges || []), ...unattemptedNewBadges];
      
      // Save attempt immediately to prevent concurrent attempts
      const nextAttempted = [...alreadyAttempted, ...unattemptedNewBadges];
      safeSessionStorage.setItem(attemptKey, nextAttempted.join(","));

      updateProfile({ badges: updatedBadges }).then((res) => {
        if (res && res.success) {
          // Notify
          unattemptedNewBadges.forEach((badgeName) => {
            notificationService.sendNotification({
              title: "مبروك وسام جديد! 🎖️",
              message: `لقد حصلت على وسام جديد لتفوقك! تفقد صفحة الأوسمة.`,
              type: "success",
              category: "achievements",
              targetId: user.uid,
              weeklyMeetingTag: `badge_notif_${user.uid}_${badgeName}`,
            });
          });
        } else {
          console.warn("Badge profile update failed, recorded attempt to avoid loop.");
        }
      }).catch(err => {
        console.error("Badge award failed:", err);
      });
    }
  }, [user, updateProfile]);

  const todayStr = useMemo(() => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60 * 1000);
    return local.toISOString().split("T")[0];
  }, []);

  const todayAttendance = useMemo(() => {
    return userAttendanceList.find((a: any) => a.date === todayStr);
  }, [userAttendanceList, todayStr]);

  const [showCelebration, setShowCelebration] = useState(false);
  const prevTodayAttendanceRef = React.useRef(todayAttendance);

  useEffect(() => {
    if (
      !prevTodayAttendanceRef.current &&
      todayAttendance &&
      isInitialAttendanceLoadCompleted.current
    ) {
      // Transitioned from un-attended to attended
      import("../../lib/confetti").then((module) => {
        module.triggerSuccessConfetti();
      });
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 6000);
    }
    prevTodayAttendanceRef.current = todayAttendance;
  }, [todayAttendance]);

  const completedAssessmentIds = useMemo(() => {
    return new Set(submissions.map((s) => s.assessmentId));
  }, [submissions]);

  const unsolvedAssessments = useMemo(() => {
    return allActiveAssessments.filter((ass) => !completedAssessmentIds.has(ass.id!));
  }, [allActiveAssessments, completedAssessmentIds]);

  // Instant Notification for New Unsolved Assessments when they first appear
  useEffect(() => {
    if (!user?.uid || allActiveAssessments.length === 0) return;

    const notifyNewAssessments = async () => {
      for (const ass of allActiveAssessments) {
        const hasCompleted = completedAssessmentIds.has(ass.id!);
        if (!hasCompleted) {
          const lKey = `new_assess_notif_${user.uid}_${ass.id}`;
          if (!safeLocalStorage.getItem(lKey)) {
            await notificationService.sendNotification({
              title: "اختبار جديد متاح! 📝",
              message: `تم نشر اختبار جديد: "${ass.title}". بادر بحله الآن للحفاظ على نقاطك وصدارتك!`,
              type: "info",
              category: "assessments",
              targetId: user.uid,
              weeklyMeetingTag: lKey,
            });
            safeLocalStorage.setItem(lKey, "sent");
          }
        }
      }
    };

    notifyNewAssessments();
  }, [user?.uid, allActiveAssessments, completedAssessmentIds]);

  // Deadline Notification Logic
  useEffect(() => {
    if (!user?.uid || activeAssessments.length === 0) return;

    const checkDeadlines = async () => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      for (const ass of activeAssessments) {
        const expiryDate = new Date(ass.expiresAt);
        const isNear = expiryDate > now && expiryDate < tomorrow;
        const hasCompleted = completedAssessmentIds.has(ass.id!);

        if (isNear && !hasCompleted) {
          const lKey = `deadline_notif_${user.uid}_${ass.id}_${now.toDateString()}`;
          if (!safeLocalStorage.getItem(lKey)) {
            await notificationService.sendNotification({
              title: "قربنا نخلص! ⏳",
              message: `باقي أقل من ٢٤ ساعة على انتهاء اختبار: ${ass.title}. الحق حله دلوقتي!`,
              type: "warning",
              category: "assessments",
              targetId: user.uid,
              weeklyMeetingTag: lKey,
            });
            safeLocalStorage.setItem(lKey, "sent");
          }
        }
      }
    };

    checkDeadlines();
  }, [user?.uid, activeAssessments, completedAssessmentIds]);

  const unifiedPointLogs = useMemo(() => {
    const logs: Array<{ id: string, amount: number, reason: string, type: "add" | "remove", createdAt: any, source: string }> = [];

    pointLogs.forEach(log => {
      logs.push({
        id: log.id,
        amount: log.amount || 0,
        reason: log.reason,
        type: log.type,
        createdAt: log.createdAt,
        source: 'manual'
      });
    });

    userAttendanceList.forEach(log => {
      logs.push({
        id: log.id,
        amount: log.points || 0,
        reason: "حضور يوم " + formatDate(log.timestamp),
        type: "add",
        createdAt: log.timestamp,
        source: 'attendance'
      });
    });

    submissions.forEach(sub => {
      logs.push({
        id: sub.id,
        amount: sub.finalScore || sub.baseScore || 0,
        reason: "أداء امتحان " + sub.assessmentTitle,
        type: "add",
        createdAt: sub.date,
        source: 'exam'
      });
    });

    purchases.forEach(pur => {
      logs.push({
        id: pur.id,
        amount: pur.pricePaid || 0,
        reason: "شراء من المتجر: " + pur.itemTitle,
        type: "remove",
        createdAt: pur.purchaseDate,
        source: 'purchase'
      });
    });

    return logs.sort((a, b) => {
      const aTime = a.createdAt?.seconds ? a.createdAt.seconds : new Date(a.createdAt).getTime() / 1000;
      const bTime = b.createdAt?.seconds ? b.createdAt.seconds : new Date(b.createdAt).getTime() / 1000;
      return bTime - aTime;
    });
  }, [pointLogs, userAttendanceList, submissions, purchases]);

  if (!user) return null;

  const latestSubmission = submissions[0];
  const chartData = [...submissions].reverse().map((s) => ({
    date: formatDate(s.date),
    score: calculatePercentage(s.finalScore, s.maxScore),
  }));

  const levelInfo = calculateLevel(user.xp || 0);

  const attendancePointsTotal = userAttendanceList.reduce(
    (acc: number, curr: any) => acc + (curr.points || 0),
    0,
  );
  const assessmentsPointsTotal = submissions.reduce(
    (acc: number, curr: any) => acc + (curr.finalScore ?? curr.score ?? curr.baseScore ?? 0),
    0,
  );
  const purchasesTotal = purchases.reduce(
    (acc: number, curr: any) => acc + (curr.pricePaid ?? curr.price ?? curr.totalPrice ?? 0),
    0,
  );
  const manualPointsTotal = pointLogs.reduce(
    (acc: number, curr: any) => curr.type === "add" ? acc + (curr.amount || 0) : acc - (curr.amount || 0),
    0
  );

  const calculatedTotalPoints = Math.max(0, attendancePointsTotal + assessmentsPointsTotal + manualPointsTotal - purchasesTotal);
  const calculatedCumulativePoints = Math.max(0, attendancePointsTotal + assessmentsPointsTotal + manualPointsTotal);

  const finalTotalPoints = typeof user.storePoints === "number" ? user.storePoints : (typeof user.totalPoints === "number" ? user.totalPoints : calculatedTotalPoints);
  const finalCumulativePoints = typeof user.totalPoints === "number" ? user.totalPoints : calculatedCumulativePoints;

  const { maxStreak } = calculateTestStreaks(submissions.map(s => s.date));
  
  let currentStreak = user.streak || 0;
  if (currentStreak > 0 && user.lastActive) {
    const todayStrDashboard = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
    const today = parseISO(todayStrDashboard);
    const lastActiveDate = parseISO(user.lastActive);
    if (differenceInDays(today, lastActiveDate) > 1) {
      currentStreak = 0;
    }
  }

  const stats = [
    {
      label: t("dashboard.streak"),
      value: currentStreak,
      suffix: t("dashboard.day"),
      icon: Flame,
      color: "text-orange-600 bg-orange-50",
      animate: true,
      path: "/student/analytics",
      description:
        currentStreak > 0
          ? `سلسلة ممتازة! 🔥 | أعلى سلسلة: ${maxStreak} يوم`
          : `ابدأ سلسلة دخولك النهاردة! | أعلى سلسلة: ${maxStreak} يوم`,
    },
    {
      label: "نقاط المتجر للشراء 🎁",
      value: finalTotalPoints,
      icon: ShoppingBag,
      color: "text-emerald-600 bg-emerald-50",
      path: "/student/store",
      description: `رصيدك القابل للاستخدام: ${finalTotalPoints} نقطة (يقل عند الشراء)`,
    },
    {
      label: "نقاط المرحلة الثانية 🏆",
      value: finalCumulativePoints,
      icon: Trophy,
      color: "text-amber-600 bg-amber-50",
      path: "/student/achievements",
      description: `مجموع نقاطك في المرحلة الثانية: ${finalCumulativePoints} (مستواك للترتيب)`,
    },
    {
      label: "نقاط المرحلة الأولى 📅",
      value: user.sidebarSettings?.round1Points || 0,
      icon: Trophy,
      color: "text-gray-600 bg-gray-100",
      description: `درجات المرحلة الأولى محفوظة بأمان 🔒`,
    },
    {
      label: t("dashboard.level"),

      value: levelInfo.name,
      icon: Award,
      color: "text-brand-red bg-brand-cream",
      progress: levelInfo.progress,
      path: "/student/achievements",
      description: `باقي ${(levelInfo as any).nextXP - (user.xp || 0)} XP للمستوى الجاي`,
    },
    {
      label: t("dashboard.avg_score"),
      value: `${user.averageScore ? Math.round(user.averageScore) : 0}%`,
      icon: Target,
      color: "text-blue-600 bg-blue-50",
      path: "/student/analytics",
    },
  ];

  return (
    <div className="min-h-screen bg-brand-cream pb-20 overflow-x-hidden">
      {/* Header - Hidden on mobile, as Layout handles it */}
      <header className="hidden lg:block bg-white border-b border-brand-beige/10 px-6 py-6 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <NotificationBell
              userId={user.uid}
              userRole={user.role}
              notificationPrefs={user.notificationPrefs}
            />

            <div className="text-right">
              <h2 className="text-xl font-black text-brand-text">
                {t("dashboard.welcome")} {user.fullName.split(" ")[0]}!
              </h2>
              <p
                className={cn(
                  "text-[10px] font-bold uppercase tracking-widest",
                  user.code?.toUpperCase().startsWith("S")
                    ? "text-brand-red"
                    : "text-brand-beige",
                )}
              >
                {user.code?.toUpperCase().startsWith("S") ? "خادم" : "طالب"} -{" "}
                {t("sidebar.story_title")}
              </p>
              {permission !== 'granted' && !isSubscribed && (
                <button
                  onClick={requestPermission}
                  className="mt-2 text-[10px] bg-brand-red/10 text-brand-red px-3 py-1 rounded-full font-bold hover:bg-brand-red/20 transition-colors flex items-center gap-1 ml-auto"
                >
                  <Bell className="w-3 h-3" />
                  تفعيل الإشعارات
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center -space-x-4">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-[3px] border-white bg-brand-cream flex items-center justify-center font-black text-brand-text shadow-sm overflow-hidden z-20">
                <SmartImage
                  src="/assets/logo-beige.png"
                  className="w-full h-full object-cover"
                  alt=""
                  fallback={<div className="text-sm md:text-base">H</div>}
                />
              </div>
              <div className="relative">
                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('open-profile'))}
                  className="w-16 h-16 md:w-20 md:h-20 rounded-full border-[3px] border-white bg-brand-red flex items-center justify-center font-black text-white shadow-sm overflow-hidden relative group cursor-pointer hover:opacity-90 transition-opacity"
                >
                  {user.photoUrl ? (
                    <img
                      src={user.photoUrl}
                      alt={user.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    user.fullName.charAt(0)
                  )}
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                </button>
                <div 
                  className="absolute -bottom-1 -right-1 md:hidden w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md border border-slate-100 pointer-events-none"
                >
                  <Camera className="w-4 h-4 text-brand-red" />
                </div>
              </div>
            </div>
            <SmartImage
              src="/assets/logo-red.png"
              className="w-16 h-16 md:w-20 md:h-20 object-contain"
              alt="Logo"
              fallback={
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-brand-red/10 flex items-center justify-center text-brand-red shadow-inner border border-brand-red/20">
                  <Church className="w-8 h-8" />
                </div>
              }
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-12">
        {/* Unsolved Assessments Instant Notification Banner */}
        {unsolvedAssessments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="mb-8 p-6 md:p-8 bg-gradient-to-r from-brand-red/[0.08] via-brand-cream/80 to-brand-red/[0.03] rounded-3xl md:rounded-[36px] border border-brand-red/10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md relative overflow-hidden"
            dir="rtl"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-brand-red/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            
            <div className="flex items-center gap-4 text-right flex-col md:flex-row relative z-10 w-full md:w-auto">
              <div className="w-14 h-14 rounded-2xl bg-brand-red/10 text-brand-red flex items-center justify-center shrink-0 shadow-inner">
                <Bell className="w-7 h-7 " />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-brand-text text-lg md:text-xl flex items-center gap-2 justify-center md:justify-start">
                  إشعار فوري: اختبارات جديدة بانتظارك! 📝
                </h4>
                <p className="text-sm text-brand-beige font-semibold leading-relaxed">
                  لديك <span className="text-brand-red font-black text-base">{unsolvedAssessments.length}</span> {unsolvedAssessments.length === 1 ? 'اختبار متاح' : 'اختبارات متاحة'} لم تقم بحلها بعد. بادر بحلها الآن للحصول على النقاط والارتقاء في لوحة الصدارة!
                </p>
              </div>
            </div>
            
            <div className="relative z-10 shrink-0 w-full md:w-auto flex justify-center">
              <button
                onClick={() => navigate(`/assessment/${unsolvedAssessments[0].id}`)}
                className="w-full md:w-auto bg-brand-red hover:bg-[#850000] text-white font-black text-sm px-8 py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-brand-red/20 active:scale-95 group"
              >
                <span>ابدأ حل "{unsolvedAssessments[0].title}" الآن</span>
                <ArrowRight className="w-5 h-5 rotate-180 transform group-hover:-translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Active Assessments Section */}
        {activeAssessments.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-4 md:mb-6 px-2">
              <h3 className="text-lg md:text-2xl font-black text-brand-text">
                {t("dashboard.active_assessments")}
              </h3>
              <Link
                to="/student/assessments"
                className="text-brand-red text-xs font-black uppercase tracking-widest hover:underline"
              >
                {t("dashboard.see_all")}
              </Link>
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
                      new Date().getTime() -
                        new Date(assessment.createdAt).getTime() <
                        24 * 60 * 60 * 1000 && (
                        <div className="absolute top-6 left-0 -rotate-45 -translate-x-8 bg-brand-red text-white py-1 px-10 text-[9px] font-black uppercase tracking-widest shadow-lg z-20">
                          {t("dashboard.new")}
                        </div>
                      )}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-red/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />

                    <div className="relative z-10 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 bg-brand-cream text-brand-red rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 group-hover:bg-brand-red group-hover:text-white shadow-sm overflow-hidden relative">
                          <motion.div
                            animate={{
                              scale: [1, 1.2, 1],
                              opacity: [0.3, 0.6, 0.3],
                            }}
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
                            <span>
                              {participantCounts[assessment.id!] || 0}{" "}
                              {t("dashboard.participants")}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-base md:text-xl font-black text-brand-text leading-tight group-hover:text-brand-red transition-colors">
                          {assessment.title}
                        </h4>
                      </div>

                      <div className="pt-4 flex items-center justify-between border-t border-brand-beige/5">
                        <div className="flex items-center gap-2 text-brand-beige">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold">
                            {assessment.readingDuration +
                              assessment.answerDuration}{" "}
                            {t("dashboard.minutes")}
                          </span>
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
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-6 md:mb-10">
          {stats.map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              onClick={() => {
                if (
                  stat.label === t("dashboard.points") ||
                  stat.label.includes("نقاط") ||
                  stat.label.includes("النقاط") ||
                  stat.label.includes("Points")
                ) {
                  setShowPointsLedger(true);
                } else if (stat.path) {
                  navigate(stat.path);
                }
              }}
              className={cn(
                "bg-white p-3 md:p-4.5 rounded-xl md:rounded-[24px] border border-brand-beige/10 shadow-sm flex flex-col items-center text-center group hover:border-brand-red/20 hover:shadow-md transition-all relative overflow-hidden",
                "cursor-pointer",
                idx === 0 ? "col-span-2 md:col-span-1" : ""
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-brand-red/[0.02] via-transparent to-brand-cream/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              <div
                className={`w-9 h-9 md:w-11 md:h-11 ${stat.color} rounded-lg md:rounded-xl flex items-center justify-center mb-1.5 md:mb-2.5 transition-transform group-hover:scale-105 relative z-10 shadow-sm`}
              >
                <stat.icon
                  className={cn(
                    "w-4.5 h-4.5 md:w-5.5 md:h-5.5",
                    stat.animate && "animate-bounce mt-1",
                  )}
                />
                {stat.animate && (
                  <motion.div
                    animate={{ scale: [1, 1.4, 1], opacity: [0, 0.3, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 bg-current rounded-xl opacity-20 pointer-events-none"
                  />
                )}
              </div>
              <p className="text-[9px] md:text-[10px] font-black text-brand-beige uppercase tracking-wider mb-0.5 relative z-10">
                {stat.label}
              </p>

              <div className="flex items-baseline gap-0.5 relative z-10">
                {stat.animate ? (
                  <div className="relative">
                    <motion.p
                      initial={{ scale: 1 }}
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="text-lg md:text-2xl font-black text-brand-text tracking-tight"
                    >
                      {stat.value}
                    </motion.p>
                    {Number(stat.value) > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 0 }}
                        animate={{ opacity: [0, 1, 0], y: [-8, -20, -28] }}
                        transition={{ repeat: Infinity, duration: 3, delay: 1 }}
                        className="absolute -top-5 left-1/2 -translate-x-1/2 text-orange-500 font-black text-[10px] pointer-events-none"
                      >
                        🔥
                      </motion.div>
                    )}
                  </div>
                ) : (
                  <p className="text-lg md:text-2xl font-black text-brand-text tracking-tight">
                    {stat.value}
                  </p>
                )}
                {stat.suffix && (
                  <span className="text-[9px] font-bold text-brand-beige">
                    {stat.suffix}
                  </span>
                )}
              </div>

              {(stat as any).description && (
                <p className="text-[8px] font-medium text-brand-beige mt-1 md:mt-1.5 opacity-60 leading-tight">
                  {(stat as any).description}
                </p>
              )}

              {stat.progress !== undefined && (
                <div className="w-full mt-2.5 space-y-1 relative z-10">
                  <div className="flex justify-between items-center text-[8px] font-black tracking-wider text-brand-beige px-0.5">
                    <span>XP</span>
                    <span>{Math.round(stat.progress)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-brand-cream rounded-full overflow-hidden shadow-inner">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${stat.progress}%` }}
                      className="h-full bg-gradient-to-r from-brand-red to-rose-450 rounded-full"
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
              <h3 className="text-lg md:text-2xl font-black text-brand-text">
                تطور مستواك
              </h3>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-brand-red rounded-full" />
                <span className="text-[10px] font-black text-brand-beige uppercase tracking-widest">
                  الدرجة المئوية
                </span>
              </div>
            </div>
            <div className="bg-white p-4 md:p-8 rounded-3xl md:rounded-[40px] border border-brand-beige/10 shadow-sm h-[280px] md:h-[400px]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient
                        id="colorScore"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#9E0000"
                          stopOpacity={0.1}
                        />
                        <stop
                          offset="95%"
                          stopColor="#9E0000"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#F7F1E7"
                    />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#DFC69D", fontSize: 10, fontWeight: 900 }}
                      dy={10}
                    />
                    <YAxis
                      domain={[0, 100]}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#DFC69D", fontSize: 10, fontWeight: 900 }}
                      dx={-10}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "20px",
                        border: "none",
                        boxShadow: "0 20px 40px rgba(0,0,0,0.05)",
                        fontWeight: 900,
                      }}
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
              <h3 className="text-lg md:text-2xl font-black text-brand-text">
                تاريخ اختباراتك
              </h3>
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
                        <h4 className="font-black text-brand-text leading-tight text-sm md:text-base">
                          {sub.assessmentTitle}
                        </h4>
                        <p className="text-[10px] text-brand-beige font-bold">
                          {formatDate(sub.date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 md:gap-10 relative z-10">
                      <div className="text-center hidden md:block">
                        <p className="text-[9px] font-black text-brand-beige uppercase mb-1">
                          الدرجة
                        </p>
                        <p className="font-black text-brand-text">
                          {sub.finalScore}/{sub.maxScore}
                        </p>
                        <div className="w-12 h-1 bg-brand-cream rounded-full mt-1 overflow-hidden">
                          <div
                            className="h-full bg-brand-red"
                            style={{
                              width: `${calculatePercentage(sub.finalScore, sub.maxScore)}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div
                        className={cn(
                          "px-3 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-2xl font-black text-[10px] uppercase tracking-widest min-w-[54px] md:min-w-[64px] text-center",
                          sub.finalScore / (sub.maxScore || 1) >= 0.8
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-amber-50 text-amber-600",
                        )}
                      >
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

              {/* QR Code Image or Online student info */}
              {!user.code?.toUpperCase().startsWith("H") ? (
                <div
                  onClick={() => qrUrl && setIsQrModalOpen(true)}
                  className="bg-[#FFFDF6] p-3 md:p-4 rounded-2xl md:rounded-[28px] shadow-lg border-2 border-[#DFC69D] relative z-10 transition-transform hover:scale-[1.05] cursor-pointer group"
                  title="اضغط لتكبير كارت الحضور"
                >
                  {qrUrl ? (
                    <>
                      <img
                        src={qrUrl}
                        alt="رابط كود الحضور"
                        className="w-[110px] h-[110px] md:w-[140px] md:h-[140px] object-contain rounded-lg group-hover:opacity-80 transition-opacity"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <div className="bg-black/60 p-2 rounded-full text-white backdrop-blur-sm">
                          <QrCode className="w-6 h-6" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="w-[110px] h-[110px] md:w-[140px] md:h-[140px] flex items-center justify-center text-brand-text font-bold text-xs">
                      جاري التحميل...
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl relative z-10 flex flex-col items-center text-center max-w-[200px] w-full">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400 mb-3 shadow-inner">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <p className="text-[11px] font-black text-white leading-tight">حساب أونلاين 🌐</p>
                  <p className="text-[9px] text-[#DFC69D] mt-1 font-bold leading-normal">غير مطالب برمز حضور QR الميداني</p>
                </div>
              )}

              {/* Student Details */}
              <div className="text-center mt-5 w-full relative z-10 space-y-1.5 pb-4 border-b border-white/10">
                <h4 className="text-sm font-black text-white leading-tight tracking-wide">
                  {user.fullName}
                </h4>
                <div className="flex items-center justify-center gap-2">
                  <span className="px-3 py-1 bg-brand-red text-white border border-brand-red/10 rounded-md text-[9px] font-black tracking-widest font-mono">
                    {user.code}
                  </span>
                  <span className="px-3 py-1 bg-white/10 text-[#DFC69D] rounded-md text-[9px] font-black tracking-widest leading-none">
                    {user.code?.toUpperCase().startsWith("H")
                      ? "طلاب اونلاين"
                      : user.code?.toUpperCase().startsWith("N")
                        ? "طلاب الورشة"
                        : user.code?.toUpperCase().startsWith("S")
                          ? "خدام"
                          : "مشارك عام"}
                  </span>
                </div>
                {!user.code?.toUpperCase().startsWith("H") && (
                  <>
                    <p className="text-[8px] text-brand-beige/60 font-medium tracking-wide leading-relaxed pt-2 pb-1">
                      وجه هذا الرمز للمسؤول لتسجيل حضورك ونقاطك اليوم
                    </p>
                    <button
                      onClick={() => {
                        if (qrUrl) {
                          const link = document.createElement("a");
                          link.href = qrUrl;
                          link.download = `QR_${user.code || "code"}_${user.fullName}.png`;
                          link.click();
                        }
                      }}
                      className="mt-3.5 w-full py-2 bg-white/5 hover:bg-white/10 text-white hover:text-brand-red rounded-xl font-black text-[10px] transition-all border border-white/5 flex items-center justify-center gap-1.5 cursor-pointer"
                      title="تحميل كارت الحضور QR للجهاز"
                    >
                      <Download className="w-3.5 h-3.5 text-brand-red" />
                      تحميل كارت الحضور الخاص بك
                    </button>
                  </>
                )}
              </div>

              {/* Live Attendance Status Badge/Panel */}
              {!user.code?.toUpperCase().startsWith("H") && (
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
                        {todayAttendance.lectureName ||
                          (todayAttendance.meetingType === "OT"
                            ? "طلاب اونلاين"
                            : "طلاب الورشة")}
                      </p>
                      <div className="flex justify-between items-center text-[10px] text-white/50 pt-0.5 border-t border-white/5 mt-1 font-semibold">
                        <span>وقت التسجيل:</span>
                        <span className="font-sans font-extrabold text-white">
                          {todayAttendance.scanTime || "غير محدد"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-brand-red/10 border border-brand-red/20 p-3.5 rounded-2xl space-y-1.5 animate-fade-in">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-amber-400 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          بانتظار مسح كود الكارت...
                        </span>
                        <span className="text-[9px] font-black text-white/30">
                          لم يسجل اليوم 🕒
                        </span>
                      </div>
                      <p className="text-[10px] text-brand-beige font-semibold leading-relaxed pt-1">
                        اعرض الباركود الرقمي بالأعلى على أجهزة الخدام لرصد تواجدك
                        بالمحاضرة الحالية تلقائياً.
                      </p>
                    </div>
                  )}

                  {/* Attendance Stats Summary */}
                  {userAttendanceList.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 text-center pt-1 animate-fade-in">
                      <div className="bg-white/5 border border-white/5 p-2 rounded-xl">
                        <span className="text-[8px] text-brand-beige font-black block uppercase">
                          إجمالي الحضور
                        </span>
                        <span className="text-xs font-black text-white font-sans">
                          {userAttendanceList.length} محاضرات
                        </span>
                      </div>
                      <div className="bg-white/5 border border-white/5 p-2 rounded-xl">
                        <span className="text-[8px] text-brand-beige font-black block uppercase">
                          الدرجات المكتسبة
                        </span>
                        <span className="text-xs font-black text-[#DFC69D] font-sans">
                          {userAttendanceList.reduce(
                            (acc: number, curr: any) => acc + (curr.points || 0),
                            0,
                          )}{" "}
                          درجة
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Recent Achievements Panel */}
            <div className="bg-white p-5 md:p-8 rounded-3xl md:rounded-[40px] border border-brand-beige/10 shadow-sm space-y-4 md:space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base md:text-xl font-black text-brand-text flex items-center gap-2 md:gap-3">
                  <Medal className="w-5 h-5 text-brand-red" />
                  أوسمتك الأخيرة
                </h3>
                <Link
                  to="/student/achievements"
                  className="text-[10px] font-black text-brand-red uppercase tracking-widest hover:underline"
                >
                  شاهد الكل
                </Link>
              </div>

              <div className="flex flex-wrap gap-2.5 md:gap-3">
                {user.badges && user.badges.length > 0 ? (
                  user.badges
                    .slice(-4)
                    .reverse()
                    .map((bId) => {
                      const badge = BADGES.find((b) => b.id === bId);
                      if (!badge) return null;
                      return (
                        <div
                          key={bId}
                          className="w-12 h-12 md:w-14 md:h-14 bg-brand-cream rounded-[18px] md:rounded-2xl flex items-center justify-center text-xl md:text-2xl shadow-sm relative group"
                          title={badge.name}
                        >
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
                    <p className="text-[10px] font-bold">
                      ابدأ رحلتك للحصول على الأوسمة
                    </p>
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
                  {
                    id: "streak-7",
                    name: "7 أيام متتالية",
                    icon: "🔥",
                    current: currentStreak,
                    target: 7,
                    label: "أيام",
                  },
                  {
                    id: "points-500",
                    name: "500 نقطة",
                    icon: "👑",
                    current: finalCumulativePoints,
                    target: 500,
                    label: "نقطة",
                  },
                  {
                    id: "pro-solver",
                    name: "خبير الأسئلة",
                    icon: "🧠",
                    current: finalCumulativePoints,
                    target: 1000,
                    label: "نقطة",
                  },
                ]
                  .filter(
                    (b) =>
                      b.current < b.target &&
                      !(user.badges || []).includes(b.id),
                  )
                  .slice(0, 2)
                  .map((badge) => (
                    <div key={badge.id} className="space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-brand-cream rounded-xl flex items-center justify-center text-xl shadow-sm">
                            {badge.icon}
                          </div>
                          <div>
                            <p className="text-xs font-black text-brand-text">
                              {badge.name}
                            </p>
                            <p className="text-[10px] text-brand-beige font-bold">
                              {badge.target - badge.current} {badge.label} متبقي
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-black text-brand-red">
                          {Math.round((badge.current / badge.target) * 100)}%
                        </span>
                      </div>
                      <div className="h-2 bg-brand-cream rounded-full overflow-hidden shadow-inner">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width: `${Math.min(100, (badge.current / badge.target) * 100)}%`,
                          }}
                          className="h-full bg-brand-red rounded-full"
                          transition={{ duration: 1, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  ))}

                {(!user.badges || user.badges.length < 3) && (
                  <div className="pt-2">
                    <Link
                      to="/student/achievements"
                      className="flex items-center justify-center gap-2 w-full py-3 bg-brand-cream/50 rounded-2xl text-brand-beige text-[10px] font-black uppercase tracking-widest hover:bg-brand-red hover:text-white transition-all group"
                    >
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
                <h4 className="text-sm font-black text-brand-beige uppercase tracking-[0.2em] mb-4">
                  {t("dashboard.latest_test")}
                </h4>
                {latestSubmission ? (
                  <div className="neo-card p-5 md:p-8 bg-white border-brand-beige/10 rounded-3xl md:rounded-[40px] relative overflow-hidden group/card shadow-sm hover:shadow-md transition-shadow">
                    <div
                      className="absolute -top-4 -right-4 w-24 h-24 rounded-full blur-2xl group-hover/card:bg-brand-red/10 transition-all duration-500"
                      style={{
                        backgroundColor: `${user.sidebarColor || "#9E0000"}1a`,
                      }}
                    />
                    <div className="relative z-10 space-y-4 md:space-y-6">
                      <div className="flex items-center justify-between">
                        <div
                          className="w-10 h-10 bg-brand-red text-white rounded-xl flex items-center justify-center shadow-lg transform group-hover/card:rotate-12 transition-all"
                          style={{ backgroundColor: user.sidebarColor }}
                        >
                          <Calendar className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black text-brand-beige italic group-hover/card:text-brand-text transition-colors">
                          {formatDate(latestSubmission.date)}
                        </span>
                      </div>
                      <div>
                        <h4
                          className="text-base md:text-xl font-black text-brand-text line-clamp-2 transition-colors"
                          style={{ color: user.sidebarColor }}
                        >
                          {latestSubmission.assessmentTitle}
                        </h4>
                        <div className="mt-4 flex items-center gap-3">
                          <div className="flex-1 h-3 bg-brand-cream rounded-full overflow-hidden shadow-inner">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: `${calculatePercentage(latestSubmission.finalScore, latestSubmission.maxScore)}%`,
                              }}
                              className="h-full bg-brand-red rounded-full"
                              style={{ backgroundColor: user.sidebarColor }}
                            />
                          </div>
                          <span
                            className="font-black text-brand-red text-sm transition-transform group-hover/card:scale-110"
                            style={{ color: user.sidebarColor }}
                          >
                            {calculatePercentage(
                              latestSubmission.finalScore,
                              latestSubmission.maxScore,
                            )}
                            %
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 md:gap-4">
                        <div className="bg-brand-cream/30 p-3 md:p-4 rounded-xl md:rounded-2xl text-center hover:bg-brand-cream/50 transition-colors">
                          <Clock className="w-4 h-4 mx-auto mb-2 text-brand-beige" />
                          <p className="text-[10px] font-black text-brand-beige uppercase mb-1">
                            {t("dashboard.time_taken")}
                          </p>
                          <p className="font-black text-brand-text text-xs md:text-sm">
                            {Math.floor(
                              latestSubmission.answeringTimeSeconds / 60,
                            )}
                            {t("dashboard.minute")}
                          </p>
                        </div>
                        <div className="bg-brand-cream/30 p-3 md:p-4 rounded-xl md:rounded-2xl text-center hover:bg-brand-cream/50 transition-colors">
                          <Trophy className="w-4 h-4 mx-auto mb-2 text-brand-beige" />
                          <p className="text-[10px] font-black text-brand-beige uppercase mb-1">
                            الدرجة النهائية
                          </p>
                          <p className="font-sans font-black text-brand-text text-xs md:text-sm">
                            {latestSubmission.finalScore} / {latestSubmission.maxScore}
                          </p>
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
                    <p className="font-bold">{t("dashboard.no_tests_yet")}</p>
                  </div>
                )}
              </div>
            )}

          </aside>
        </div>
      </main>

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
                <h3 className="font-black text-xl text-brand-text mb-1">
                  كارت الدخول
                </h3>
                <p className="text-[10px] text-brand-beige font-black uppercase tracking-widest">
                  {user?.fullName}
                </p>
              </div>

              <div className="w-full aspect-square relative bg-white p-4 rounded-2xl border-4 border-brand-red/10 shadow-inner">
                {qrUrl ? (
                  <img
                    src={qrUrl}
                    alt="QR Code"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-brand-beige">
                    جاري التحميل...
                  </div>
                )}

                {/* Decorative scanning line effect */}
                <motion.div
                  initial={{ top: 0, opacity: 0 }}
                  animate={{ top: "100%", opacity: [0, 1, 1, 0] }}
                  transition={{
                    repeat: Infinity,
                    duration: 2.5,
                    ease: "linear",
                  }}
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
                      link.download = `QR_${user?.code || "code"}_${user?.fullName}.png`;
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

      {/* Points Ledger Modal */}
      <AnimatePresence>
        {showPointsLedger && (
          <div className="fixed inset-0 min-h-[100dvh] flex items-center justify-center p-4 z-[9999] bg-[#1C0606]/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl flex flex-col overflow-hidden max-h-[85vh] border border-brand-beige/10"
            >
              <div className="p-6 md:p-8 bg-brand-cream border-b border-brand-beige/10 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="font-black text-xl text-brand-text mb-1">
                    سجل حركات النقاط
                  </h3>
                  <p className="text-[10px] text-brand-beige font-black uppercase tracking-widest">
                    تفاصيل حسابك
                  </p>
                </div>
                <button
                  onClick={() => setShowPointsLedger(false)}
                  className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-brand-text hover:text-brand-red hover:bg-red-50 transition-all shadow-sm border border-brand-beige/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar bg-white max-h-[60vh]">
                <div className="p-4 md:p-6 bg-brand-cream/30 border-b border-brand-beige/5">
                  <div className="text-center mb-4">
                    <p className="text-xs font-black text-brand-beige uppercase">النقاط التراكمية للسيزون: <span className="text-brand-red text-sm">{finalCumulativePoints}</span></p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 w-full">
                    <div className="text-center bg-amber-50 px-3 py-2 rounded-2xl flex-1 border border-amber-100/50 min-w-[60px]">
                        <p className="text-[9px] text-amber-600/70 font-black uppercase mb-1">الحضور</p>
                        <p className="font-black text-amber-600 text-sm">{attendancePointsTotal}</p>
                    </div>
                    
                    <span className="text-brand-beige font-black text-sm">+</span>
                    
                    <div className="text-center bg-emerald-50 px-3 py-2 rounded-2xl flex-1 border border-emerald-100/50 min-w-[60px]">
                        <p className="text-[9px] text-emerald-600/70 font-black uppercase mb-1">الاختبارات</p>
                        <p className="font-black text-emerald-600 text-sm">{assessmentsPointsTotal}</p>
                    </div>

                    {manualPointsTotal !== 0 && (
                      <>
                        <span className="text-brand-beige font-black text-sm">{manualPointsTotal > 0 ? "+" : ""}</span>
                        <div className="text-center bg-blue-50 px-3 py-2 rounded-2xl flex-1 border border-blue-100/50 min-w-[60px]">
                            <p className="text-[9px] text-blue-600/70 font-black uppercase mb-1">الإضافات والخصومات</p>
                            <p className="font-black text-blue-600 text-sm">{manualPointsTotal}</p>
                        </div>
                      </>
                    )}

                    <span className="text-brand-beige font-black text-sm">-</span>
                    
                    <div className="text-center bg-brand-red/5 px-3 py-2 rounded-2xl flex-1 border border-brand-red/10 min-w-[60px]">
                        <p className="text-[9px] text-brand-red/70 font-black uppercase mb-1">المشتريات</p>
                        <p className="font-black text-brand-red text-sm">{purchasesTotal}</p>
                    </div>
                  </div>
                  <div className="text-center mt-4 pt-3 border-t border-brand-beige/10">
                    <p className="text-xs font-black text-emerald-600">رصيد المتجر القابل للاستخدام الحالي: {finalTotalPoints} نقطة 🛍️</p>
                  </div>
                </div>
                <div className="p-6 md:p-8 space-y-4">
                  {unifiedPointLogs.length === 0 ? (
                    <div className="py-12 text-center text-brand-beige font-bold flex flex-col items-center gap-3">
                      <Trophy className="w-12 h-12 opacity-20" />
                      <p>لم يتم تسجيل أي نقاط بعد</p>
                    </div>
                  ) : (
                    unifiedPointLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-5 rounded-[24px] bg-brand-cream/30 border border-brand-beige/5 hover:border-brand-beige/20 transition-all flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={cn(
                              "w-12 h-12 rounded-[18px] flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105",
                              log.type === "add"
                                ? "bg-green-50 text-green-600 border border-green-100"
                                : "bg-red-50 text-brand-red border border-red-100",
                            )}
                          >
                            {log.type === "add" ? "+" : "-"}
                          </div>
                          <div>
                            <p className="font-black text-brand-text text-sm md:text-base leading-tight">
                              {log.reason}
                            </p>
                            <p className="text-[10px] md:text-xs text-brand-beige font-bold mt-1">
                              {formatDate(log.createdAt)}{" "}
                              {log.source !== 'manual' && (
                                <span className="opacity-60">
                                  | {log.source === 'exam' ? 'اختبار' : log.source === 'attendance' ? 'حضور' : 'متجر'}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div
                          className={cn(
                            "text-lg md:text-xl font-black bg-white px-4 py-2 rounded-[14px] shadow-sm whitespace-nowrap",
                            log.type === "add"
                              ? "text-green-600"
                              : "text-brand-red",
                          )}
                        >
                          {log.type === "add" ? "+" : "-"}
                          {log.amount}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              <div className="p-6 md:p-8 bg-brand-cream border-t border-brand-beige/10 shrink-0">
                 <button
                    onClick={() => {
                       setShowPointsLedger(false);
                       navigate("/student/store");
                    }}
                    className="w-full bg-brand-text text-white p-4 rounded-2xl font-black shadow-sm transition-all flex items-center justify-center gap-3 hover:bg-brand-red"
                 >
                    <ShoppingBag className="w-5 h-5" />
                    استبدل نقاطك في المتجر
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
                <h3 className="font-black text-2xl text-brand-text mb-2">
                  حضور موفق!
                </h3>
                <p className="text-sm text-brand-beige font-semibold leading-relaxed">
                  تم تسجيل حضورك بنجاح. استمر في الانضباط وجمع النقاط! 🌟
                </p>
              </div>

              {todayAttendance?.points > 0 && (
                <div className="px-5 py-3 bg-brand-cream border border-brand-beige/20 rounded-2xl flex items-center gap-3">
                  <span className="text-[10px] font-black uppercase text-brand-beige">
                    النقاط المكتسبة
                  </span>
                  <span className="text-xl font-black text-brand-red">
                    +{todayAttendance.points}
                  </span>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
  className,
  themeColor,
}: {
  icon: React.ReactElement;
  label: string;
  value?: string | number;
  className?: string;
  themeColor?: string;
}) {
  if (value === undefined || value === null || value === "") return null;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 p-3 bg-brand-cream/30 rounded-2xl border border-brand-beige/5 group/info transition-all hover:bg-white hover:shadow-sm",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-brand-beige transition-all shadow-sm group-hover/info:text-brand-red"
          style={{ color: undefined }}
          onMouseEnter={(e) => {
            if (themeColor) {
              (e.currentTarget as HTMLElement).style.color = themeColor;
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "";
          }}
        >
          {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: "w-3.5 h-3.5" })}
        </div>
        <span className="text-[8px] font-black text-brand-beige uppercase tracking-widest">
          {label}
        </span>
      </div>
      <span className="text-xs font-black text-brand-text leading-relaxed text-right">
        {value}
      </span>
    </div>
  );
}
