import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { User, UserAnswer } from "../../types";
import {
  ArrowRight,
  User as UserIcon,
  Clock,
  ShoppingBag,
  Award,
  FileText,
  Activity,
  Phone,
  Hash,
  Calendar,
  Lock,
  ChevronLeft,
  Mail,
  Smartphone,
  Wallet,
  Zap,
  MapPin,
  Church,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { formatDate, cn } from "../../lib/utils";
import { FaWhatsapp } from "react-icons/fa";

interface Purchase {
  id: string;
  itemId: string;
  itemTitle: string;
  price: number;
  quantity: number;
  status: string;
  createdAt: any;
}

interface PointLog {
  id: string;
  amount: number;
  reason: string;
  type: "add" | "remove";
  createdAt: any;
}

interface Submission {
  id: string;
  assessmentId: string;
  assessmentTitle: string;
  score: number;
  totalPoints: number;
  percentage: number;
  duration: number;
  createdAt: any;
}

interface LoginLog {
  id: string;
  timestamp: any;
  deviceInfo?: string;
  ip?: string;
}

const StudentDetail: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const [student, setStudent] = useState<User | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [pointLogs, setPointLogs] = useState<PointLog[]>([]);
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "exams" | "store" | "points" | "logins"
  >("overview");

  useEffect(() => {
    if (!studentId) return;

    // Fetch Student Info
    const unsubscribeStudent = onSnapshot(doc(db, "users", studentId), (docSnap) => {
      if (docSnap.exists()) {
        setStudent({ uid: docSnap.id, ...docSnap.data() } as User);
      }
      setTimeout(() => setIsLoading(false), 0); // Can stop loading after main user is fetched
    }, (error) => {
      console.error("Error fetching student:", error);
      setTimeout(() => setIsLoading(false), 0);
    });

    // Fetch Submissions
    const subQuery = query(
      collection(db, "submissions"),
      where("participantId", "==", studentId),
      orderBy("date", "desc")
    );
    const unsubscribeSubs = onSnapshot(subQuery, (snap) => {
      setSubmissions(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            score: data.finalScore || data.baseScore || 0,
            totalPoints: data.maxScore || 0,
            percentage: data.maxScore > 0 ? Math.round(((data.finalScore || data.baseScore) / data.maxScore) * 100) : 0,
            duration: (data.readingTimeSeconds || 0) + (data.answeringTimeSeconds || 0),
            createdAt: data.date,
          } as Submission;
        })
      );
    });

    // Fetch Attendance Logs
    const attQuery = query(
      collection(db, "attendance"),
      where("studentId", "==", studentId)
    );
    const unsubscribeAtt = onSnapshot(attQuery, (snap) => {
      setAttendanceLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    // Fetch Purchases
    const purchaseQuery = query(
      collection(db, "purchases"),
      where("userId", "==", studentId),
      orderBy("purchaseDate", "desc")
    );
    const unsubscribePurchases = onSnapshot(purchaseQuery, (snap) => {
      setPurchases(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            price: data.pricePaid || 0,
            createdAt: data.purchaseDate,
          } as Purchase;
        })
      );
    });

    // Fetch Point Logs
    const pointsQuery = query(
      collection(db, "pointLogs"),
      where("userId", "==", studentId),
      orderBy("createdAt", "desc")
    );
    const unsubscribePoints = onSnapshot(pointsQuery, (snap) => {
      setPointLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PointLog));
    }, (e) => {
      console.warn("Point logs not available or no permissions", e);
      setPointLogs([]);
    });

    // Fetch Login Logs
    const loginQuery = query(
      collection(db, "loginLogs"),
      where("userId", "==", studentId),
      orderBy("loginAt", "desc"),
      limit(50)
    );
    const unsubscribeLogins = onSnapshot(loginQuery, (snap) => {
      setLoginLogs(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          timestamp: d.data().loginAt,
        }) as LoginLog)
      );
    });

    return () => {
      unsubscribeStudent();
      unsubscribeSubs();
      unsubscribeAtt();
      unsubscribePurchases();
      unsubscribePoints();
      unsubscribeLogins();
    };
  }, [studentId]);

  const unifiedPointLogs = useMemo(() => {
    const logs: Array<{ id: string, amount: number, reason: string, type: "add" | "remove", createdAt: any, source: string }> = [];

    // Manual logs
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

    // Attendance
    attendanceLogs.forEach(log => {
      logs.push({
        id: log.id,
        amount: log.points || 0,
        reason: "حضور يوم " + formatDate(log.timestamp),
        type: "add",
        createdAt: log.timestamp,
        source: 'attendance'
      });
    });

    // Exams
    submissions.forEach(sub => {
      logs.push({
        id: sub.id,
        amount: sub.score || 0,
        reason: "أداء امتحان " + sub.assessmentTitle,
        type: "add",
        createdAt: sub.createdAt,
        source: 'exam'
      });
    });

    // Purchases
    purchases.forEach(pur => {
      logs.push({
        id: pur.id,
        amount: pur.price || 0,
        reason: "شراء من المتجر: " + pur.itemTitle,
        type: "remove",
        createdAt: pur.createdAt,
        source: 'purchase'
      });
    });

    return logs.sort((a, b) => {
      const aTime = a.createdAt?.seconds ? a.createdAt.seconds : new Date(a.createdAt).getTime() / 1000;
      const bTime = b.createdAt?.seconds ? b.createdAt.seconds : new Date(b.createdAt).getTime() / 1000;
      return bTime - aTime;
    });
  }, [pointLogs, attendanceLogs, submissions, purchases]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-cream flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-red border-t-transparent rounded-full animate-spin" />
          <p className="font-bold text-brand-beige">
            جاري تحميل بيانات الطالب...
          </p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-brand-cream p-8 text-center flex flex-col items-center justify-center gap-6">
        <h2 className="text-3xl font-black text-brand-text">
          الطالب غير موجود
        </h2>
        <Link
          to="/admin/users"
          className="px-8 py-4 bg-brand-red text-white rounded-2xl font-bold hover:scale-105 transition-transform"
        >
          العودة لإدارة الطلاب
        </Link>
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "نظرة عامة", icon: Activity },
    { id: "exams", label: "الاختبارات", icon: FileText },
    { id: "store", label: "المتجر", icon: ShoppingBag },
    { id: "points", label: "سجل النقاط", icon: Award },
    { id: "logins", label: "سجل الدخول", icon: Clock },
  ];

  return (
    <div className="min-h-screen bg-brand-cream pb-20" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-brand-beige/10 px-4 md:px-8 py-4 md:py-6 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
          <div className="flex items-center gap-4 md:gap-6">
            <Link
              to="/admin/users"
              className="p-2.5 md:p-3 bg-brand-cream border border-brand-beige/20 rounded-xl hover:bg-brand-red/10 transition-colors shrink-0"
            >
              <ArrowRight className="w-5 h-5 text-brand-red" />
            </Link>
            <div className="flex items-center gap-3 md:gap-4 min-w-0">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-brand-red/10 overflow-hidden flex items-center justify-center text-brand-red shrink-0">
                {student.photoUrl ? (
                  <img
                    src={student.photoUrl}
                    alt={student.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-6 h-6 md:w-8 md:h-8" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 md:gap-3">
                  <h1 className="text-xl md:text-2xl font-black text-brand-text truncate max-w-xs md:max-w-none">
                    {student.fullName}
                  </h1>
                  {student.code?.toUpperCase().startsWith("H") && (
                    <span className="px-2 md:px-3 py-0.5 md:py-1 bg-blue-50 text-blue-600 rounded-full text-[9px] md:text-[10px] font-black uppercase whitespace-nowrap">
                      طلاب اونلاين
                    </span>
                  )}
                  {student.code?.toUpperCase().startsWith("N") && (
                    <span className="px-2 md:px-3 py-0.5 md:py-1 bg-purple-50 text-purple-600 rounded-full text-[9px] md:text-[10px] font-black uppercase whitespace-nowrap">
                      طلاب الورشة
                    </span>
                  )}
                  {student.code?.toUpperCase().startsWith("S") && (
                    <span className="px-2 md:px-3 py-0.5 md:py-1 bg-amber-50 text-amber-600 rounded-full text-[9px] md:text-[10px] font-black uppercase whitespace-nowrap">
                      خادم
                    </span>
                  )}
                  {student.code?.toUpperCase().startsWith("P") && (
                    <span className="px-2 md:px-3 py-0.5 md:py-1 bg-rose-50 text-rose-600 rounded-full text-[9px] md:text-[10px] font-black uppercase whitespace-nowrap">
                      معلق
                    </span>
                  )}
                </div>
                <p className="text-brand-beige font-bold text-xs md:text-sm mt-0.5">
                  كود الطالب: {student.code}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto justify-end">
            <div className="flex-1 md:flex-initial px-4 md:px-6 py-2.5 md:py-3 bg-brand-cream border border-brand-beige/20 rounded-xl flex items-center justify-center gap-2 md:gap-3">
              <span className="text-[9px] md:text-[10px] font-black text-brand-beige uppercase">
                النقاط
              </span>
              <span className="text-lg md:text-xl font-black text-brand-red">
                {student.totalPoints || 0}
              </span>
            </div>
            {student.whatsappNumber && (
              <a
                href={`https://wa.me/${student.whatsappNumber.startsWith("01") ? "2" + student.whatsappNumber : student.whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 md:gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-[#25D366] text-white rounded-xl font-black shadow-lg shadow-[#25D366]/20 transition-transform text-xs md:text-sm whitespace-nowrap"
              >
                <FaWhatsapp className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
                <span>واتساب</span>
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10">
        {/* Tabs Navigation */}
        <div className="flex items-center gap-1.5 md:gap-2 bg-white/50 p-1.5 md:p-2 rounded-2xl md:rounded-[24px] border border-brand-beige/10 mb-6 md:mb-10 overflow-x-auto hide-scrollbar scroll-smooth">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 md:gap-3 px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-[18px] font-black text-xs md:text-sm transition-all whitespace-nowrap scroll-mx-4",
                activeTab === tab.id
                  ? "bg-white text-brand-red shadow-md shadow-brand-red/5 border border-brand-red/10 scale-[1.02]"
                  : "text-brand-beige hover:bg-brand-cream/50",
              )}
            >
              <tab.icon
                className={cn(
                  "w-4 h-4 md:w-5 md:h-5 shrink-0",
                  activeTab === tab.id ? "text-brand-red" : "text-brand-beige",
                )}
              />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 gap-10">
          <AnimatePresence mode="wait">
            {activeTab === "overview" && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 md:grid-cols-4 gap-8"
              >
                {/* Profile Card */}
                <div className="md:col-span-2 bg-white rounded-[40px] p-8 border border-brand-beige/10 shadow-sm space-y-8">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-brand-text">
                      بيانات الطالب الشخصية
                    </h3>
                    {student.photoUrl && (
                      <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-brand-cream">
                        <img
                          src={student.photoUrl}
                          alt={student.fullName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-brand-cream flex items-center justify-center text-brand-beige">
                        <UserIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-brand-beige uppercase">
                          الاسم بالكامل
                        </p>
                        <p className="font-bold text-brand-text">
                          {student.fullName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-brand-cream flex items-center justify-center text-brand-beige">
                        <Church className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-brand-beige uppercase">
                          الكنيسة
                        </p>
                        <p className="font-bold text-brand-text">
                          {student.church || "غير مسجل"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-brand-cream flex items-center justify-center text-brand-beige">
                        <Smartphone className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-brand-beige uppercase">
                          رقم الواتساب
                        </p>
                        <p className="font-bold text-brand-text">
                          {student.whatsappNumber || "غير متوفر"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-brand-cream flex items-center justify-center text-brand-beige">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-brand-beige uppercase">
                          تاريخ الميلاد
                        </p>
                        <p className="font-bold text-brand-text">
                          {student.birthDate
                            ? formatDate(student.birthDate)
                            : "غير مسجل"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-brand-cream flex items-center justify-center text-brand-beige">
                        <Hash className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-brand-beige uppercase">
                          كود الطالب
                        </p>
                        <p className="font-bold text-brand-text">
                          {student.code}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-brand-cream flex items-center justify-center text-brand-beige">
                        <Lock className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-brand-beige uppercase">
                          كلمة المرور
                        </p>
                        <p className="font-bold text-brand-text">
                          {student.password}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 sm:col-span-2">
                      <div className="w-12 h-12 rounded-xl bg-brand-cream flex items-center justify-center text-brand-beige">
                        <MapPin className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-brand-beige uppercase">
                          العنوان
                        </p>
                        <p className="font-bold text-brand-text">
                          {student.address || "غير مسجل"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 sm:col-span-2">
                      <div className="w-12 h-12 rounded-xl bg-brand-cream flex items-center justify-center text-brand-beige">
                        <Clock className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-brand-beige uppercase">
                          تاريخ التسجيل
                        </p>
                        <p className="font-bold text-brand-text">
                          {student.registrationDate
                            ? formatDate(student.registrationDate)
                            : "غير متوفر"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6 content-start">
                  <div className="bg-white rounded-[32px] p-8 border border-brand-beige/10 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-brand-red/10 flex items-center justify-center text-brand-red">
                      <Zap className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-4xl font-black text-brand-text">
                        {submissions.length}
                      </p>
                      <p className="font-bold text-brand-beige">اختبار مكتمل</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-[32px] p-8 border border-brand-beige/10 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                      <Award className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-4xl font-black text-brand-text">
                        {submissions.length > 0
                          ? Math.round(
                              submissions.reduce(
                                (acc, s) => acc + (s.percentage || 0),
                                0,
                              ) / submissions.length,
                            )
                          : 0}
                        %
                      </p>
                      <p className="font-bold text-brand-beige">
                        متوسط التقييم
                      </p>
                    </div>
                  </div>
                  <div className="bg-white rounded-[32px] p-6 md:p-8 border border-brand-beige/10 flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                      <Wallet className="w-8 h-8" />
                    </div>
                    <div className="w-full">
                      <p className="text-4xl font-black text-brand-text mb-2">
                        {Math.max(0, submissions.reduce((acc, sub) => acc + (sub.score || 0), 0) + attendanceLogs.reduce((acc, log) => acc + (log.points || 0), 0) - purchases.reduce((acc, pur) => acc + (pur.price || 0), 0))}
                      </p>
                      <p className="font-bold text-brand-beige mb-6">
                        إجمالي النقاط الحالي
                      </p>
                      
                      <div className="w-full bg-brand-cream/50 rounded-2xl p-4 border border-brand-beige/5">
                        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 w-full">
                          <div className="text-center bg-amber-50 px-3 py-2 rounded-2xl flex-1 border border-amber-100/50 min-w-[70px]">
                             <p className="text-[9px] text-amber-600/70 font-black uppercase mb-1">الحضور</p>
                             <p className="font-black text-amber-600 text-base">{attendanceLogs.reduce((acc, log) => acc + (log.points || 0), 0)}</p>
                          </div>
                          
                          <span className="text-brand-beige font-black text-lg">+</span>
                          
                          <div className="text-center bg-emerald-50 px-3 py-2 rounded-2xl flex-1 border border-emerald-100/50 min-w-[70px]">
                             <p className="text-[9px] text-emerald-600/70 font-black uppercase mb-1">الاختبارات</p>
                             <p className="font-black text-emerald-600 text-base">{submissions.reduce((acc, sub) => acc + (sub.score || 0), 0)}</p>
                          </div>

                          <span className="text-brand-beige font-black text-lg">-</span>
                          
                          <div className="text-center bg-brand-red/5 px-3 py-2 rounded-2xl flex-1 border border-brand-red/10 min-w-[70px]">
                             <p className="text-[9px] text-brand-red/70 font-black uppercase mb-1">المشتريات</p>
                             <p className="font-black text-brand-red text-base">{purchases.reduce((acc, pur) => acc + (pur.price || 0), 0)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-[32px] p-8 border border-brand-beige/10 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                      <ShoppingBag className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-4xl font-black text-brand-text">
                        {purchases.length}
                      </p>
                      <p className="font-bold text-brand-beige">
                        طلب من المتجر
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "exams" && (
              <motion.div
                key="exams"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-[32px] overflow-hidden overflow-x-auto border border-brand-beige/10">
                  <table className="w-full text-right min-w-[600px]">
                    <thead className="bg-brand-cream/50 text-brand-beige text-[10px] font-black uppercase tracking-widest border-b border-brand-beige/10">
                      <tr>
                        <th className="px-8 py-6">اسم الاختبار</th>
                        <th className="px-8 py-6">التاريخ</th>
                        <th className="px-8 py-6">النقاط</th>
                        <th className="px-8 py-6">النسبة المئوية</th>
                        <th className="px-8 py-6">المدة (دقائق)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-beige/10">
                      {submissions.map((sub) => (
                        <tr
                          key={sub.id}
                          className="hover:bg-brand-cream/30 transition-colors"
                        >
                          <td className="px-8 py-6">
                            <p className="font-black text-brand-text">
                              {sub.assessmentTitle}
                            </p>
                          </td>
                          <td className="px-8 py-6 text-brand-beige font-bold text-sm">
                            {formatDate(sub.createdAt)}
                          </td>
                          <td className="px-8 py-6">
                            <span className="font-black text-brand-red">
                              {sub.score}
                            </span>
                            <span className="text-brand-beige font-bold text-xs">
                              {" "}
                              / {sub.totalPoints}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-2 bg-brand-cream rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full",
                                    sub.percentage >= 80
                                      ? "bg-green-500"
                                      : sub.percentage >= 50
                                        ? "bg-yellow-500"
                                        : "bg-red-500",
                                  )}
                                  style={{ width: `${sub.percentage}%` }}
                                />
                              </div>
                              <span className="font-black text-brand-text">
                                {sub.percentage}%
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-6 font-bold text-brand-beige">
                            {Math.round(sub.duration / 60)}
                          </td>
                        </tr>
                      ))}
                      {submissions.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-8 py-20 text-center text-brand-beige font-bold"
                          >
                            لا يوجد اختبارات مكتملة لهذا الطالب
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === "store" && (
              <motion.div
                key="store"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-[32px] overflow-hidden overflow-x-auto border border-brand-beige/10">
                  <table className="w-full text-right min-w-[600px]">
                    <thead className="bg-brand-cream/50 text-brand-beige text-[10px] font-black uppercase tracking-widest border-b border-brand-beige/10">
                      <tr>
                        <th className="px-8 py-6">المنتج</th>
                        <th className="px-8 py-6">الكمية</th>
                        <th className="px-8 py-6">السعر الإجمالي</th>
                        <th className="px-8 py-6">التاريخ</th>
                        <th className="px-8 py-6">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-beige/10">
                      {purchases.map((order) => (
                        <tr
                          key={order.id}
                          className="hover:bg-brand-cream/30 transition-colors"
                        >
                          <td className="px-8 py-6">
                            <p className="font-black text-brand-text">
                              {order.itemTitle}
                            </p>
                          </td>
                          <td className="px-8 py-6 font-bold text-brand-text">
                            {order.quantity}
                          </td>
                          <td className="px-8 py-6">
                            <span className="font-black text-brand-red">
                              {order.price}
                            </span>
                            <span className="text-brand-beige font-bold text-xs mr-1">
                              نقطة
                            </span>
                          </td>
                          <td className="px-8 py-6 text-brand-beige font-bold text-sm">
                            {formatDate(order.createdAt)}
                          </td>
                          <td className="px-8 py-6">
                            <span
                              className={cn(
                                "px-4 py-1 rounded-full text-xs font-black",
                                order.status === "completed"
                                  ? "bg-green-100 text-green-700"
                                  : order.status === "rejected"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-yellow-100 text-yellow-700",
                              )}
                            >
                              {order.status === "pending"
                                ? "قيد الانتظار"
                                : order.status === "completed"
                                  ? "تم التسليم"
                                  : "مرفوض"}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {purchases.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-8 py-20 text-center text-brand-beige font-bold"
                          >
                            لم يقم الطالب بأي عمليات شراء
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === "points" && (
              <motion.div
                key="points"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-4xl mx-auto space-y-6"
              >
                <div className="bg-white rounded-[32px] overflow-hidden border border-brand-beige/10">
                  <div className="p-8 border-b border-brand-beige/10 flex items-center justify-between">
                    <h3 className="text-xl font-black text-brand-text">
                      سجل حركات النقاط
                    </h3>
                    <div className="px-6 py-2 bg-brand-cream rounded-xl text-brand-red font-black">
                      الرصيد: {student.totalPoints || 0}
                    </div>
                  </div>
                  <div className="divide-y divide-brand-beige/10">
                    {unifiedPointLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-6 flex items-center justify-between hover:bg-brand-cream/30 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                              log.type === "add"
                                ? "bg-green-50 text-green-600"
                                : "bg-red-50 text-brand-red",
                            )}
                          >
                            {log.type === "add" ? "+" : "-"}
                          </div>
                          <div>
                            <p className="font-bold text-brand-text">
                              {log.reason}
                            </p>
                            <p className="text-xs text-brand-beige font-bold">
                              {formatDate(log.createdAt)} {log.source !== 'manual' && <span className="opacity-60">| {log.source === 'exam' ? 'اختبار' : log.source === 'attendance' ? 'حضور' : 'متجر'}</span>}
                            </p>
                          </div>
                        </div>
                        <div
                          className={cn(
                            "text-lg font-black",
                            log.type === "add"
                              ? "text-green-600"
                              : "text-brand-red",
                          )}
                        >
                          {log.type === "add" ? "+" : "-"}
                          {log.amount}
                        </div>
                      </div>
                    ))}
                    {unifiedPointLogs.length === 0 && (
                      <div className="py-20 text-center text-brand-beige font-bold">
                        لا يوجد عمليات مسجلة في سجل النقاط
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "logins" && (
              <motion.div
                key="logins"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-4xl mx-auto space-y-6"
              >
                <div className="bg-white rounded-[32px] overflow-hidden overflow-x-auto border border-brand-beige/10">
                  <table className="w-full text-right min-w-[600px]">
                    <thead className="bg-brand-cream/50 text-brand-beige text-[10px] font-black uppercase tracking-widest border-b border-brand-beige/10">
                      <tr>
                        <th className="px-8 py-6">الوقت والتاريخ</th>
                        <th className="px-8 py-6">الجهاز</th>
                        <th className="px-8 py-6">عنوان IP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-beige/10">
                      {loginLogs.map((log) => (
                        <tr
                          key={log.id}
                          className="hover:bg-brand-cream/30 transition-colors text-sm"
                        >
                          <td className="px-8 py-6 font-bold text-brand-text">
                            {formatDate(log.timestamp)}
                          </td>
                          <td className="px-8 py-6 text-brand-beige font-bold">
                            {log.deviceInfo || "غير متوفر"}
                          </td>
                          <td className="px-8 py-6 text-brand-beige font-bold font-mono">
                            {log.ip || "غير متوفر"}
                          </td>
                        </tr>
                      ))}
                      {loginLogs.length === 0 && (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-8 py-20 text-center text-brand-beige font-bold"
                          >
                            لا يوجد سجلات دخول متاحة
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default StudentDetail;
