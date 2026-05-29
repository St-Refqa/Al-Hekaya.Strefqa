import { useNavigate } from "react-router-dom";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
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
  Sparkles,
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

  // Auto-redirect if already logged in
  useEffect(() => {
    if (!isLoggingIn && isAuthenticated && user) {
      const userRole = (user.role || '').toLowerCase();
      if (isAdmin || ['creator', 'attendance', 'store', 'servant', 'admin'].includes(userRole)) {
        navigate("/admin");
      } else {
        navigate("/student");
      }
    }
  }, [user, isAuthenticated, isAdmin, navigate, isLoggingIn]);

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
      } else {
        // Redirection will happen automatically via the useEffect above!
      }
    } catch (err) {
      setLoginError("حدث خطأ غير متوقع");
    } finally {
      setIsLoggingIn(false);
    }
  };

  useEffect(() => {
    const q = query(
      collection(db, "assessments"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assessment));
      
      let active = data.filter(a => a.status === "active" && new Date(a.expiresAt) > new Date());
      
      // Filter based on target group for home page widget
      active = active.filter(a => {
        if (!user) {
          return !a.targetGroup || a.targetGroup === 'all';
        }
        if (user.role === 'admin') return true;
        if (!a.targetGroup || a.targetGroup === 'all') return true;
        const upperCode = user.code?.toUpperCase() || "";
        if (a.targetGroup === 'servant' && user.role === 'student' && upperCode.startsWith('S')) return true;
        if (a.targetGroup === 'OT' && user.role === 'student' && upperCode.startsWith('H')) return true;
        if (a.targetGroup === 'NT' && user.role === 'student' && upperCode.startsWith('N')) return true;
        return false;
      });

      setAssessments(active.slice(0, 3));
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "assessments");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const socialLinks = [
    { name: "Facebook", icon: FaFacebookF, href: "https://www.facebook.com/share/1Cqc7Fuhi3/?mibextid=wwXIfr", color: "bg-[#1877F2]" },
    { name: "Instagram", icon: FaInstagram, href: "https://www.instagram.com/elhkaya0?igsh=MTQ5eGE3eHl4Mm5q&utm_source=qr", color: "bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]" },
    { name: "TikTok", icon: FaTiktok, href: "https://www.tiktok.com/@elhkaya1?_r=1&_t=ZS-96KJ9nxg4bC", color: "bg-black" },
    { name: "WhatsApp", icon: FaWhatsapp, href: "https://wa.me/201055082964", color: "bg-[#25D366]" },
  ];

  if (isAuthenticated && user) {
    // Show a highly visual transition while redirecting
    return (
      <div className="min-h-screen bg-brand-cream flex flex-col items-center justify-center relative overflow-hidden" dir="rtl">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 bg-brand-red/5 blur-3xl rounded-full"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 flex flex-col items-center justify-center p-10 bg-white/50 backdrop-blur-md rounded-[48px] border border-white/50 shadow-2xl"
        >
          <div className="w-24 h-24 mb-6 rounded-full bg-brand-red text-white flex items-center justify-center shadow-lg animate-pulse">
            <Sparkles className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-black text-brand-text mb-2">جاري دخولك للمنصة بحسابك...</h2>
          <p className="text-brand-beige font-bold animate-pulse">يا مرحباً بك يا {user.fullName}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream relative overflow-x-hidden" dir="rtl">
      {/* Dynamic Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
         <motion.div 
           animate={{ y: [0, -30, 0], opacity: [0.2, 0.6, 0.2], scale: [1, 1.1, 1] }}
           transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
           className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-brand-red rounded-full blur-[120px]"
         />
         <motion.div 
           animate={{ x: [0, 40, 0], opacity: [0.1, 0.3, 0.1], scale: [1, 1.2, 1] }}
           transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
           className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-500 rounded-full blur-[150px]"
         />
         <motion.div 
           animate={{ rotate: 360 }}
           transition={{ duration: 150, repeat: Infinity, ease: "linear" }}
           className="absolute top-[20%] left-[20%] w-[800px] h-[800px] bg-amber-400/5 rounded-full blur-[100px]"
         />
      </div>

      {/* Hero / Login Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center pt-24 pb-20 px-6 lg:px-24 overflow-hidden z-10">
        {/* Coptic Background Ornament */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 0.05, scale: 1.5 }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="absolute top-0 right-0 w-full h-full pointer-events-none select-none rotate-12"
        >
          <SmartImage src="/assets/coptic-pattern.png" alt="" className="w-full h-full object-cover" />
        </motion.div>

        <div className="max-w-7xl mx-auto w-full relative z-20">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-16 lg:gap-20">
            
            {/* Branding & Welcome */}
            <div className="lg:w-1/2 space-y-12 text-center lg:text-right">
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
                className="space-y-6"
              >
                <div className="flex flex-col lg:flex-row items-center lg:items-end gap-6 justify-center lg:justify-start">
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="flex gap-4 relative"
                  >
                    <div className="absolute inset-0 bg-white/20 blur-xl rounded-full" />
                    <SmartImage 
                      src="/assets/logo-red.png" 
                      alt="كنيسة القديسة رفقة" 
                      className="w-20 h-20 sm:w-28 sm:h-28 lg:w-40 lg:h-40 object-contain drop-shadow-2xl animate-float relative z-10"
                      fallback={<div className="w-20 h-20 sm:w-28 sm:h-28 lg:w-40 lg:h-40 rounded-2xl sm:rounded-[32px] lg:rounded-[40px] bg-brand-red/10 flex items-center justify-center text-brand-red shadow-xl border border-brand-red/20"><Church className="w-10 h-10 sm:w-16 sm:h-16 lg:w-20 lg:h-20" /></div>}
                    />
                    <SmartImage 
                      src="/assets/logo-beige.png" 
                      alt="الحكاية ومافيها" 
                      className="w-20 h-20 sm:w-28 sm:h-28 lg:w-40 lg:h-40 object-contain drop-shadow-2xl animate-float [animation-delay:0.5s] relative z-10"
                      fallback={<div className="w-20 h-20 sm:w-28 sm:h-28 lg:w-40 lg:h-40 rounded-2xl sm:rounded-[32px] lg:rounded-[40px] bg-brand-beige/10 flex items-center justify-center text-brand-beige shadow-xl border border-brand-beige/20 text-2xl sm:text-4xl lg:text-5xl font-black">H</div>}
                    />
                  </motion.div>
                  <div className="space-y-2 text-center lg:text-right">
                    <motion.span 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-brand-red font-black tracking-[0.2em] uppercase text-sm block"
                    >
                      أهلاً بك في منصة
                    </motion.span>
                    <motion.h1 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="text-6xl lg:text-7xl font-black text-brand-text tracking-tighter leading-tight"
                    >
                      الحكاية <span className="text-brand-red">ومافيها</span>
                    </motion.h1>
                  </div>
                </div>
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="text-brand-text/70 text-xl lg:text-2xl font-bold max-w-2xl leading-relaxed mx-auto lg:mx-0"
                >
                  المنصة التعليمية الرسمية لكنيسة القديسة رفقة وأولادها الخمسة بالقناطر.
                </motion.p>
                
                {/* Stats or trust factors */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  className="pt-8 flex flex-wrap justify-center lg:justify-start gap-8"
                >
                  <motion.div whileHover={{ scale: 1.05, y: -5 }} className="flex items-center gap-3 bg-white/50 backdrop-blur-sm p-4 rounded-3xl border border-white/60 shadow-lg cursor-default">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-red to-red-600 flex items-center justify-center text-white shadow-inner">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-black text-brand-text text-xl">+١٠٠٠</div>
                      <div className="text-brand-beige text-[10px] font-black uppercase tracking-wider">طالب نشط</div>
                    </div>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05, y: -5 }} className="flex items-center gap-3 bg-white/50 backdrop-blur-sm p-4 rounded-3xl border border-white/60 shadow-lg cursor-default">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-red to-red-600 flex items-center justify-center text-white shadow-inner">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-black text-brand-text text-xl">+٥٠٠</div>
                      <div className="text-brand-beige text-[10px] font-black uppercase tracking-wider">محتوى تفاعلي</div>
                    </div>
                  </motion.div>
                </motion.div>
              </motion.div>
            </div>

            {/* Login Form Card */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, type: "spring", bounce: 0.4 }}
              className="lg:w-[450px] w-full"
            >
              <div className="bg-white/80 backdrop-blur-xl rounded-[48px] p-10 lg:p-12 shadow-[0_30px_60px_rgba(185,28,28,0.1)] border border-white/80 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-red/10 rounded-full -translate-y-16 translate-x-16 blur-2xl group-hover:bg-brand-red/20 transition-colors duration-700" />
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-brand-beige/10 rounded-full translate-y-16 -translate-x-16 blur-2xl group-hover:bg-brand-beige/20 transition-colors duration-700" />

                <div className="relative z-10 space-y-8">
                  <div className="text-center space-y-2">
                    <motion.div 
                      whileHover={{ rotate: 15, scale: 1.1 }}
                      className="w-20 h-20 bg-gradient-to-tr from-brand-cream to-white rounded-[24px] box-border border-2 border-brand-red/10 flex items-center justify-center mx-auto mb-6 text-brand-red shadow-xl"
                    >
                      <LogIn className="w-10 h-10" />
                    </motion.div>
                    <h2 className="text-3xl font-black text-brand-text">تسجيل الدخول</h2>
                    <p className="text-brand-beige font-bold text-sm">ادخل بياناتك عشان تتابع رحلتك</p>
                  </div>

                  <form onSubmit={handleLoginSubmit} className="space-y-6">
                    <div className="space-y-2 text-right">
                      <label className="text-[10px] font-black text-brand-beige uppercase tracking-[0.2em] mr-2">كود الطالب أو الاسم</label>
                      <div className="relative group/input">
                        <User className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-beige group-focus-within/input:text-brand-red transition-colors" />
                        <input
                          type="text"
                          value={identifier || ''}
                          onChange={(e) => setIdentifier(e.target.value)}
                          className="w-full bg-white/60 backdrop-blur-sm border-2 border-white focus:border-brand-red rounded-[24px] py-4 pr-14 pl-6 outline-none transition-all font-bold text-brand-text shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus:shadow-[0_8px_16px_rgba(185,28,28,0.08)]"
                          placeholder="مثال: Kirolos أو G001"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 text-right">
                      <label className="text-[10px] font-black text-brand-beige uppercase tracking-[0.2em] mr-2">كلمة المرور</label>
                      <div className="relative group/input">
                        <Lock className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-beige group-focus-within/input:text-brand-red transition-colors" />
                        <input
                          type="password"
                          value={password || ''}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-white/60 backdrop-blur-sm border-2 border-white focus:border-brand-red rounded-[24px] py-4 pr-14 pl-6 outline-none transition-all font-bold text-brand-text shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus:shadow-[0_8px_16px_rgba(185,28,28,0.08)]"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    <AnimatePresence>
                      {loginError && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          className="bg-rose-50 text-brand-red p-4 rounded-2xl text-xs font-bold border border-brand-red/10 flex items-center gap-2"
                        >
                          <div className="w-1.5 h-1.5 bg-brand-red rounded-full animate-ping" />
                          {loginError}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={isLoggingIn}
                      className="w-full py-5 bg-brand-red text-white text-xl font-black rounded-[28px] shadow-[0_15px_30px_rgba(185,28,28,0.3)] hover:shadow-[0_20px_40px_rgba(185,28,28,0.4)] transition-all disabled:opacity-50 flex items-center justify-center gap-3 relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-white/20 translate-y-full hover:translate-y-0 transition-transform duration-300 rounded-[28px]" />
                      <div className="relative flex items-center gap-3">
                        {isLoggingIn ? (
                          <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <span>دخول إلى حسابي</span>
                            <ChevronLeft className="w-6 h-6" />
                          </>
                        )}
                      </div>
                    </motion.button>
                  </form>

                  <div className="text-center pt-6 border-t border-brand-beige/10">
                     <p className="text-brand-beige font-bold text-[10px] uppercase tracking-widest mb-2">ليس لديك حساب؟</p>
                     <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => navigate("/register")}
                      className="text-brand-red font-black text-sm bg-brand-red/5 px-6 py-3 rounded-full hover:bg-brand-red/10 transition-colors"
                     >
                      تسجيل حساب جديد الآن
                     </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Social & Contact Section */}
      <section className="py-24 bg-white border-y border-brand-beige/10 relative overflow-hidden z-10">
        <div className="absolute top-0 right-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-beige/20 to-transparent" />
        
        <div className="max-w-7xl mx-auto px-6 lg:px-24 relative z-10">
          <div className="flex flex-col items-center text-center space-y-16">
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-4 max-w-3xl"
            >
              <span className="text-[10px] font-black text-brand-red uppercase tracking-[0.3em] bg-brand-red/5 px-4 py-1.5 rounded-full inline-block mb-2">تواصل معنا</span>
              <h2 className="text-4xl lg:text-5xl font-black text-brand-text leading-tight">
                عندك أي استفسار؟ <span className="text-brand-beige">إحنا دايماً معاك</span>
              </h2>
              <p className="text-brand-beige font-bold text-lg leading-relaxed">
                سواء عندك سؤال عن المنصة، أو واجهتك مشكلة، أو حابب تشاركنا رأيك، فريق "الحكاية ومافيها" مستني تواصلك في أي وقت.
              </p>
            </motion.div>

            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={{
                hidden: {},
                visible: {
                  transition: { staggerChildren: 0.1 }
                }
              }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full"
            >
              {socialLinks.map((social) => (
                <motion.a
                  key={social.name}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0 }
                  }}
                  whileHover={{ y: -5, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center p-8 rounded-[40px] bg-white border border-brand-beige/10 hover:border-transparent transition-all shadow-sm hover:shadow-2xl hover:shadow-brand-beige/20 group relative overflow-hidden"
                >
                   <div className="absolute inset-0 bg-gradient-to-b from-transparent to-brand-cream/50 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                   <div className={cn("relative z-10 w-20 h-20 rounded-3xl flex items-center justify-center text-white transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 shadow-xl mb-6", social.color)}>
                      <social.icon className="w-10 h-10" />
                   </div>
                   <div className="relative z-10 text-center">
                      <span className="font-black text-brand-text text-2xl block mb-1 group-hover:text-brand-red transition-colors">{social.name}</span>
                      <span className="text-[10px] font-black text-brand-beige uppercase tracking-wider">تابع حكاياتنا</span>
                   </div>
                </motion.a>
              ))}
            </motion.div>

            <div className="pt-16 border-t border-brand-cream/50 w-full flex flex-col items-center gap-8">
               <div className="flex items-center justify-center gap-6 opacity-30 hover:opacity-100 transition-opacity duration-300">
                  <SmartImage src="/assets/logo-red.png" className="w-12 h-12 object-contain grayscale hover:grayscale-0 transition-all duration-500" alt="" />
                  <div className="w-px h-10 bg-brand-text/20" />
                  <SmartImage src="/assets/logo-beige.png" className="w-12 h-12 object-contain grayscale hover:grayscale-0 transition-all duration-500" alt="" />
               </div>
               <div className="flex items-center gap-4 bg-brand-cream px-6 py-3 rounded-full">
                  <div className="w-2 h-2 bg-brand-red rounded-full animate-pulse" />
                  <p className="text-brand-beige font-black text-xs uppercase tracking-[0.2em] text-center">
                    كنيسة القديسة رفقة وأولادها الخمسة &copy; ٢٠٢٤ الحكاية ومافيها
                  </p>
                  <div className="w-2 h-2 bg-brand-red rounded-full animate-pulse" />
               </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
