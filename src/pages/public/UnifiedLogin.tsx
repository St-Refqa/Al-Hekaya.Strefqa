import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  LogIn, 
  User, 
  Lock, 
  ChevronLeft, 
  AlertCircle,
  ArrowRight,
  ShieldCheck
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { cn } from "../../lib/utils";
import { useTranslation } from "react-i18next";

export default function UnifiedLogin() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isAdmin, isStudent, user } = useAuth();
  const { t } = useTranslation();
  const dir = 'rtl';
  
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      const userRole = (user?.role || '').toLowerCase();
      if (isAdmin || userRole === 'admin') {
        navigate("/admin");
      } else if (user?.isExamCreator || userRole === 'creator') {
        navigate("/admin/create");
      } else if (user?.isAttendanceScanner || userRole === 'attendance') {
        navigate("/admin/attendance");
      } else if (user?.isStoreManager || userRole === 'store') {
        navigate("/admin/store");
      } else if (isStudent || userRole === 'student' || !userRole) {
        navigate("/student");
      } else {
        navigate("/");
      }
    }
  }, [isAuthenticated, isAdmin, isStudent, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError(t('login.error_missing') || "من فضلك ادخل البيانات كاملة");
      import("../../lib/audio").then(m => m.playErrorSound());
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const result = await login(identifier, password);
      if (!result.success) {
        if (result.error?.includes("تفعيل")) {
          setError("Firebase Error: Email/Password must be enabled.");
        } else {
          setError(result.error || t('login.error'));
        }
        import("../../lib/audio").then(m => m.playErrorSound());
      } else {
        import("../../lib/confetti").then(m => m.triggerSuccessConfetti());
      }
    } catch (err) {
      setError(t('common.error_unexpected') || "حدث خطأ غير متوقع");
      import("../../lib/audio").then(m => m.playErrorSound());
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-cream flex items-center justify-center p-6 relative overflow-hidden" dir={dir}>

      {/* Decorative Background */}
      <div className="absolute inset-0 bg-textured opacity-30 pointer-events-none" />
      <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] bg-brand-red/5 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-brand-beige/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full relative z-10"
      >
        {/* Back Link */}
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-brand-beige hover:text-brand-red font-bold transition-colors mb-8 group"
        >
          <ArrowRight className={cn("w-5 h-5 transition-transform", i18n.language === 'ar' ? "group-hover:translate-x-1" : "rotate-180 group-hover:-translate-x-1")} />
          <span>{t('login.back_to_home')}</span>
        </Link>

        <div className="bg-white rounded-[48px] p-10 lg:p-12 shadow-2xl shadow-brand-red/5 border border-brand-beige/10 relative overflow-hidden">
          {/* Subtle pattern within card */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "url('/coptic_pattern.png')", backgroundSize: '150px' }} />
          
          <div className="relative z-10">
            <div className="flex flex-col items-center mb-12">
              <div className="w-20 h-20 bg-brand-cream rounded-[28px] flex items-center justify-center mb-6 shadow-sm group hover:scale-110 transition-transform duration-500">
                <LogIn className="w-10 h-10 text-brand-red" />
              </div>
              <h1 className="text-4xl font-black text-brand-text tracking-tight">{t('login.title')}</h1>
              <p className="text-brand-beige font-bold mt-2">{t('sidebar.story_title')} - {t('login.welcome_back')}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-brand-beige uppercase tracking-[0.2em] mr-1">{t('login.student_code')}</label>
                <div className="relative group">
                  <div className={cn("absolute inset-y-0 pr-5 flex items-center pointer-events-none text-brand-beige group-focus-within:text-brand-red transition-colors", i18n.language === 'ar' ? "right-0" : "left-0 pl-5")}>
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={identifier || ''}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className={cn("w-full bg-brand-cream border-2 border-transparent focus:border-brand-red/20 focus:bg-white rounded-[24px] py-5 outline-none transition-all font-bold text-brand-text", i18n.language === 'ar' ? "pr-14 pl-6" : "pl-14 pr-6")}
                    placeholder={t('login.placeholder_id') || ""}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-brand-beige uppercase tracking-[0.2em] mr-1">{t('login.password')}</label>
                <div className="relative group">
                  <div className={cn("absolute inset-y-0 pr-5 flex items-center pointer-events-none text-brand-beige group-focus-within:text-brand-red transition-colors", i18n.language === 'ar' ? "right-0" : "left-0 pl-5")}>
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type="password"
                    value={password || ''}
                    onChange={(e) => setPassword(e.target.value)}
                    className={cn("w-full bg-brand-cream border-2 border-transparent focus:border-brand-red/20 focus:bg-white rounded-[24px] py-5 outline-none transition-all font-bold text-brand-text", i18n.language === 'ar' ? "pr-14 pl-6" : "pl-14 pr-6")}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-3 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100"
                  >
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p className="text-sm font-bold">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-5 bg-brand-red text-white text-xl font-black rounded-[28px] shadow-2xl shadow-brand-red/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3 group"
              >
                {isLoading ? (
                   <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{t('login.submit')}</span>
                    <ChevronLeft className={cn("w-6 h-6 transition-transform", i18n.language === 'ar' ? "group-hover:translate-x-[-4px]" : "rotate-180 group-hover:translate-x-[4px]")} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-10 pt-8 border-t border-brand-cream flex flex-col items-center gap-4">
              <p className="text-brand-beige font-bold">معندكش حساب؟</p>
              <Link 
                to="/register" 
                className="text-brand-red font-black hover:underline transition-all underline-offset-8"
              >
                أنشئ حسابك دلوقتي
              </Link>
            </div>
          </div>
        </div>

        {/* Admin Note if needed? No, user wants unified. */}
        <p className="text-center mt-12 text-brand-beige/60 font-bold text-[10px] lg:text-xs uppercase tracking-[0.2em]">
          كنيسة القديسة رفقة وأولادها الخمسة &copy; ٢٠٢٤ الحكاية ومافيها
        </p>
      </motion.div>
    </div>
  );
}
