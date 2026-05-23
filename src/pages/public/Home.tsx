import { useNavigate } from "react-router-dom";
import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { 
  BookOpen, 
  Clock, 
  GraduationCap,
  LogIn,
  Calendar,
  ChevronLeft,
  MessageCircle,
  User,
  Lock,
  Church,
} from "lucide-react";
import { 
  FaFacebookF, 
  FaInstagram, 
  FaTiktok, 
  FaWhatsapp, 
} from "react-icons/fa";
import { useAuth } from "../../hooks/useAuth";
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { Assessment } from "../../types";
import { formatDate, cn } from "../../lib/utils";
import { SmartImage } from "../../components/ui/SmartImage";
import { Users, Timer as TimerIcon } from "lucide-react";

// Helper component for live countdown
function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const calculate = () => {
      const diff = new Date(expiresAt).getTime() - new Date().getTime();
      if (diff <= 0) {
        setTimeLeft("انتهى");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) setTimeLeft(`${days} يوم و ${hours} ساعة`);
      else if (hours > 0) setTimeLeft(`${hours} ساعة و ${mins} دقيقة`);
      else setTimeLeft(`${mins} دقيقة`);
    };

    calculate();
    const interval = setInterval(calculate, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [expiresAt]);

  return <span>{timeLeft}</span>;
}

export default function Home() {
  const navigate = useNavigate();
  const { login, user, isAuthenticated, isAdmin, isStudent } = useAuth();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Login Form State
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      if (isAdmin) navigate("/admin");
      else if (isStudent) navigate("/student");
    }
  }, [isAuthenticated, isAdmin, isStudent, navigate]);

  useEffect(() => {
    const q = query(
      collection(db, "assessments"),
      where("status", "==", "active"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assessment));
      const active = data.filter(a => new Date(a.expiresAt) > new Date()).slice(0, 3); // Just show top 3
      setAssessments(active);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "assessments");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setLoginError("من فضلك ادخل البيانات كاملة");
      return;
    }

    setLoginError("");
    setIsLoggingIn(true);

    try {
      const result = await login(identifier, password);
      if (!result.success) {
        setLoginError(result.error || "بيانات الدخول غير صحيحة");
      }
    } catch (err) {
      setLoginError("حدث خطأ غير متوقع");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Notification Reminder Logic
  useEffect(() => {
    // Only run this check for authenticated users (preferably admins but any can work with idempotent checks)
    if (!isAuthenticated) return;

    const checkReminders = async () => {
      try {
        const now = new Date();
        
        for (const assessment of assessments) {
          if (!assessment.id) continue;
          
          const expiresAt = new Date(assessment.expiresAt);
          const diffInMs = expiresAt.getTime() - now.getTime();
          const diffInHours = diffInMs / (1000 * 60 * 60);

          // 1. 24h Reminder (between 23h and 24h before expiry)
          if (diffInHours <= 24 && diffInHours > 23) {
            await createReminderIfNotExists(assessment.id, "24h", assessment.title);
          }

          // 2. 1h Reminder (between 0.5h and 1h before expiry)
          if (diffInHours <= 1 && diffInHours > 0.5) {
            await createReminderIfNotExists(assessment.id, "1h", assessment.title);
          }
        }
      } catch (err) {
        console.error("Error checking reminders:", err);
      }
    };

    const createReminderIfNotExists = async (assessmentId: string, timeframe: string, title: string) => {
      const reminderId = `reminder_${assessmentId}_${timeframe}`;
      
      // Check if this specific reminder already exists
      const q = query(
        collection(db, "notifications"),
        where("targetId", "==", reminderId)
      );
      const snap = await getDocs(q);
      
      if (snap.empty) {
        const message = timeframe === "24h" 
          ? `ينتهي الاختبار "${title}" خلال 24 ساعة. سارع بالمشاركة!` 
          : `تنبيه: الاختبار "${title}" ينتهي خلال ساعة واحدة فقط!`;

        await addDoc(collection(db, "notifications"), {
          title: "تنبيه اقتراب انتهاء الاختبار",
          message,
          type: "warning",
          createdAt: serverTimestamp(),
          isRead: false,
          targetId: reminderId,
          readBy: []
        });
      }
    };

    checkReminders();
    const interval = setInterval(checkReminders, 15 * 60 * 1000); // Check every 15 mins
    return () => clearInterval(interval);
  }, [assessments, isAuthenticated]);

  const socialLinks = [
    { name: "Facebook", icon: FaFacebookF, href: "https://www.facebook.com/share/1Cqc7Fuhi3/?mibextid=wwXIfr", color: "bg-[#1877F2]" },
    { name: "Instagram", icon: FaInstagram, href: "https://www.instagram.com/elhkaya0?igsh=MTQ5eGE3eHl4Mm5q&utm_source=qr", color: "bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]" },
    { name: "TikTok", icon: FaTiktok, href: "https://www.tiktok.com/@elhkaya1?_r=1&_t=ZS-96KJ9nxg4bC", color: "bg-black" },
    { name: "WhatsApp", icon: FaWhatsapp, href: "https://wa.me/201055082964", color: "bg-[#25D366]" },
  ];

  return (
    <div className="min-h-screen bg-brand-cream relative overflow-x-hidden" dir="rtl">
      {/* Hero / Login Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center pt-24 pb-20 px-6 lg:px-24 bg-brand-cream bg-curved-lines overflow-hidden">
        {/* Coptic Background Ornament */}
        <div className="absolute top-0 right-0 w-full h-full pointer-events-none opacity-[0.03] select-none scale-150 rotate-12">
          <SmartImage src="/assets/coptic-pattern.png" alt="" className="w-full h-full object-cover" />
        </div>

        <div className="max-w-7xl mx-auto w-full relative z-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-20">
            
            {/* Branding & Welcome */}
            <div className="lg:w-1/2 space-y-12 text-center lg:text-right">
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="space-y-6"
              >
                <div className="flex flex-col lg:flex-row items-center lg:items-end gap-6 justify-start">
                  <div className="flex gap-4">
                    <SmartImage 
                      src="/assets/logo-red.png" 
                      alt="كنيسة القديسة رفقة" 
                      className="w-20 h-20 sm:w-28 sm:h-28 lg:w-40 lg:h-40 object-contain animate-float"
                      fallback={<div className="w-20 h-20 sm:w-28 sm:h-28 lg:w-40 lg:h-40 rounded-2xl sm:rounded-[32px] lg:rounded-[40px] bg-brand-red/10 flex items-center justify-center text-brand-red shadow-xl border border-brand-red/20"><Church className="w-10 h-10 sm:w-16 sm:h-16 lg:w-20 lg:h-20" /></div>}
                    />
                    <SmartImage 
                      src="/assets/logo-beige.png" 
                      alt="الحكاية ومافيها" 
                      className="w-20 h-20 sm:w-28 sm:h-28 lg:w-40 lg:h-40 object-contain animate-float [animation-delay:0.5s]"
                      fallback={<div className="w-20 h-20 sm:w-28 sm:h-28 lg:w-40 lg:h-40 rounded-2xl sm:rounded-[32px] lg:rounded-[40px] bg-brand-beige/10 flex items-center justify-center text-brand-beige shadow-xl border border-brand-beige/20 text-2xl sm:text-4xl lg:text-5xl font-black">H</div>}
                    />
                  </div>
                  <div className="space-y-2 text-center lg:text-right">
                    <span className="text-brand-red font-black tracking-[0.2em] uppercase text-sm block">أهلاً بك في منصة</span>
                    <h1 className="text-6xl lg:text-7xl font-black text-brand-text tracking-tighter leading-tight">
                      الحكاية <span className="text-brand-red">ومافيها</span>
                    </h1>
                  </div>
                </div>
                <p className="text-brand-text/70 text-xl lg:text-2xl font-bold max-w-2xl leading-relaxed">
                  المنصة التعليمية الرسمية لكنيسة القديسة رفقة وأولادها الخمسة بالقناطر.
                </p>
                
                {/* Stats or trust factors */}
                <div className="pt-8 flex flex-wrap justify-center lg:justify-start gap-8">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-brand-red/10 flex items-center justify-center text-brand-red">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-black text-brand-text text-xl">+١٠٠٠</div>
                      <div className="text-brand-beige text-[10px] font-black uppercase">طالب نشط</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-brand-red/10 flex items-center justify-center text-brand-red">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-black text-brand-text text-xl">+٥٠٠</div>
                      <div className="text-brand-beige text-[10px] font-black uppercase">اختبار شامل</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Login Form Card */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="lg:w-[450px] w-full"
            >
              <div className="bg-white rounded-[48px] p-10 lg:p-12 shadow-2xl shadow-brand-red/5 border border-brand-beige/10 relative overflow-hidden group">
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-red/5 rounded-full -translate-y-16 translate-x-16 blur-3xl group-hover:bg-brand-red/10 transition-colors" />

                <div className="relative z-10 space-y-8">
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-brand-cream rounded-2xl flex items-center justify-center mx-auto mb-4 text-brand-red">
                      <LogIn className="w-8 h-8" />
                    </div>
                    <h2 className="text-3xl font-black text-brand-text">تسجيل الدخول</h2>
                    <p className="text-brand-beige font-bold text-sm">ادخل بياناتك عشان تتابع رحلتك</p>
                  </div>

                  <form onSubmit={handleLoginSubmit} className="space-y-6">
                    <div className="space-y-2 text-right">
                      <label className="text-[10px] font-black text-brand-beige uppercase tracking-[0.2em] mr-1">كود الطالب أو الاسم</label>
                      <div className="relative">
                        <User className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-beige" />
                        <input
                          type="text"
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          className="w-full bg-brand-cream border-2 border-transparent focus:border-brand-red/20 focus:bg-white rounded-[24px] py-4 pr-14 pl-6 outline-none transition-all font-bold text-brand-text"
                          placeholder="مثال: Kirolos أو G001"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 text-right">
                      <label className="text-[10px] font-black text-brand-beige uppercase tracking-[0.2em] mr-1">كلمة المرور</label>
                      <div className="relative">
                        <Lock className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-beige" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-brand-cream border-2 border-transparent focus:border-brand-red/20 focus:bg-white rounded-[24px] py-4 pr-14 pl-6 outline-none transition-all font-bold text-brand-text"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    {loginError && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-rose-50 text-brand-red p-4 rounded-2xl text-xs font-bold border border-brand-red/10 flex items-center gap-2"
                      >
                        <div className="w-1 h-1 bg-brand-red rounded-full animate-ping" />
                        {loginError}
                      </motion.div>
                    )}

                    <button
                      type="submit"
                      disabled={isLoggingIn}
                      className="w-full py-5 bg-brand-red text-white text-xl font-black rounded-[28px] shadow-2xl shadow-brand-red/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3 group"
                    >
                      {isLoggingIn ? (
                        <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>دخول</span>
                          <ChevronLeft className="w-6 h-6 group-hover:translate-x-[-4px] transition-transform" />
                        </>
                      )}
                    </button>
                  </form>

                  <div className="text-center pt-4 border-t border-brand-cream flex flex-col gap-3">
                    <p className="text-brand-beige font-bold text-xs underline underline-offset-4 decoration-brand-red/20 cursor-pointer hover:text-brand-red transition-colors">
                      نسيت كلمة المرور؟
                    </p>
                    <div className="pt-4 flex flex-col items-center gap-2">
                       <p className="text-brand-beige font-bold text-[10px] uppercase tracking-widest">معندكش حساب؟</p>
                       <button 
                        type="button"
                        onClick={() => navigate("/register")}
                        className="text-brand-red font-black text-sm hover:underline"
                       >
                        سجل حساب جديد دلوقتي
                       </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Social & Contact Section */}
      <section className="py-24 bg-white border-y border-brand-beige/10 relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-brand-red/5 rounded-full blur-3xl opacity-50" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-brand-red/5 rounded-full blur-3xl opacity-50" />

        <div className="max-w-7xl mx-auto px-6 lg:px-24 relative z-10">
          <div className="flex flex-col items-center text-center space-y-16">
            
            {/* Header */}
            <div className="space-y-4 max-w-2xl">
              <span className="text-[10px] font-black text-brand-red uppercase tracking-[0.3em]">خلينا قريبين</span>
              <h2 className="text-4xl lg:text-5xl font-black text-brand-text leading-tight italic">
                عندك أي سؤال؟ إحنا دايماً جنبك وبنحب نسمع منك!
              </h2>
              <p className="text-brand-beige font-bold text-lg">
                سواء عندك سؤال عن المنصة أو عايز تقولنا رأيك، فريق "الحكاية ومافيها" معاك ومستني يسمع منك في أي وقت.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 w-full">
              
              {/* Social Links List */}
              <div className="lg:col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 h-full">
                {socialLinks.map((social) => (
                  <motion.a
                    key={social.name}
                    whileHover={{ x: -10 }}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-6 rounded-[32px] bg-white border border-brand-beige/5 hover:border-brand-red/10 transition-all shadow-sm group"
                  >
                     <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white transition-all group-hover:scale-110 shadow-lg", social.color)}>
                        <social.icon className="w-7 h-7" />
                     </div>
                     <div className="text-right">
                        <span className="font-black text-brand-text text-xl block">{social.name}</span>
                        <span className="text-[10px] font-black text-brand-beige uppercase">تابع حكاياتنا هناك</span>
                     </div>
                  </motion.a>
                ))}
              </div>

            </div>

            {/* Sub-footer friendly mark */}
            <div className="pt-12 border-t border-brand-cream w-full flex flex-col items-center gap-6">
               <div className="flex items-center gap-4">
                  <div className="w-1.5 h-1.5 bg-brand-red rounded-full" />
                  <p className="text-brand-beige font-black text-[10px] lg:text-xs uppercase tracking-[0.2em] text-center">
                    كنيسة القديسة رفقة وأولادها الخمسة &copy; ٢٠٢٤ الحكاية ومافيها
                  </p>
                  <div className="w-1.5 h-1.5 bg-brand-red rounded-full" />
               </div>
               <div className="flex items-center gap-4">
                  <SmartImage src="/assets/logo-red.png" className="w-10 h-10 object-contain opacity-50 grayscale hover:grayscale-0 transition-all" alt="" />
                  <SmartImage src="/assets/logo-beige.png" className="w-10 h-10 object-contain opacity-50 grayscale hover:grayscale-0 transition-all" alt="" />
               </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
