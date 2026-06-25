import { useNavigate } from "react-router-dom";
import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "motion/react";
import {
  BookOpen,
  Trophy,
  Users,
  Star,
  CheckCircle,
  ArrowLeft,
  Play,
  Sparkles,
  GraduationCap,
  Heart,
  Church,
  ChevronDown,
  MessageCircle,
  LogIn,
  Lock,
  User,
  ChevronLeft,
} from "lucide-react";
import {
  FaFacebookF,
  FaInstagram,
  FaTiktok,
  FaWhatsapp,
} from "react-icons/fa";
import { useAuth } from "../../hooks/useAuth";
import { SmartImage } from "../../components/ui/SmartImage";
import { cn } from "../../lib/utils";

const socialLinks = [
  {
    name: "Facebook",
    icon: FaFacebookF,
    href: "https://www.facebook.com/share/1Cqc7Fuhi3/?mibextid=wwXIfr",
    color: "bg-[#1877F2]",
    followers: "٢١٣٨+",
    label: "متابع",
  },
  {
    name: "Instagram",
    icon: FaInstagram,
    href: "https://www.instagram.com/elhkaya0?igsh=MTQ5eGE3eHl4Mm5q&utm_source=qr",
    color: "bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]",
    followers: "٢١٣٨",
    label: "متابع",
  },
  {
    name: "TikTok",
    icon: FaTiktok,
    href: "https://www.tiktok.com/@elhkaya1?_r=1&_t=ZS-96KJ9nxg4bC",
    color: "bg-black",
    followers: "تابعنا",
    label: "على تيكتوك",
  },
  {
    name: "WhatsApp",
    icon: FaWhatsapp,
    href: "https://wa.me/201055082964",
    color: "bg-[#25D366]",
    followers: "تواصل",
    label: "معنا مباشرة",
  },
];

const features = [
  {
    icon: BookOpen,
    title: "اختبارات تفاعلية",
    desc: "اختبارات على الكتاب المقدس بأسلوب عصري وممتع مع أسئلة متنوعة",
    color: "from-red-500 to-rose-600",
    bg: "bg-red-50",
    iconColor: "text-red-500",
  },
  {
    icon: Trophy,
    title: "نظام نقاط وترتيبات",
    desc: "اكسب نقاط لكل اختبار وتنافس مع زملائك على المراكز الأولى",
    color: "from-amber-500 to-orange-600",
    bg: "bg-amber-50",
    iconColor: "text-amber-500",
  },
  {
    icon: GraduationCap,
    title: "تتبع تقدمك",
    desc: "شوف تقدمك الأكاديمي وتحليل أدائك بشكل مفصل وواضح",
    color: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-50",
    iconColor: "text-emerald-500",
  },
  {
    icon: Star,
    title: "شارات وإنجازات",
    desc: "احصل على شارات مميزة لكل إنجاز تحققه في رحلتك التعليمية",
    color: "from-purple-500 to-violet-600",
    bg: "bg-purple-50",
    iconColor: "text-purple-500",
  },
  {
    icon: Heart,
    title: "مجتمع متحد",
    desc: "انضم لمجتمع من المؤمنين المتعلمين من كنيسة القديسة رفقة",
    color: "from-pink-500 to-rose-600",
    bg: "bg-pink-50",
    iconColor: "text-pink-500",
  },
  {
    icon: CheckCircle,
    title: "متجر مكافآت",
    desc: "استبدل نقاطك بمكافآت حقيقية ومميزة من متجر الحكاية",
    color: "from-blue-500 to-cyan-600",
    bg: "bg-blue-50",
    iconColor: "text-blue-500",
  },
];

const stats = [
  { label: "طالب نشط", value: "+١٠٠", icon: Users },
  { label: "اختبار أُنجز", value: "+٥٠٠", icon: BookOpen },
  { label: "نقطة مكتسبة", value: "+٥٠٠٠", icon: Trophy },
  { label: "متابع على السوشيال", value: "+٢١٣٨", icon: Heart },
];

export default function Home() {
  const navigate = useNavigate();
  const { login, user, isAuthenticated, isAdmin } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoggingIn && isAuthenticated && user) {
      const userRole = (user.role || "").toLowerCase();
      if (
        isAdmin ||
        ["creator", "attendance", "store", "servant", "admin"].includes(
          userRole,
        )
      ) {
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
      }
    } catch (err) {
      setLoginError("حدث خطأ غير متوقع");
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (isAuthenticated && user) {
    return (
      <div
        className="min-h-screen bg-brand-cream flex flex-col items-center justify-center relative overflow-hidden"
        dir="rtl"
      >
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
          <h2 className="text-3xl font-black text-brand-text mb-2">
            جاري دخولك للمنصة...
          </h2>
          <p className="text-brand-beige font-bold animate-pulse">
            يا مرحباً بك يا {user.fullName}
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB] relative overflow-x-hidden" dir="rtl">

      {/* ====== NAV BAR ====== */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl px-6 py-3 shadow-lg shadow-black/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SmartImage
                src="/assets/logo-beige.png"
                alt="الحكاية ومافيها"
                className="w-8 h-8 object-contain"
                fallback={<Church className="w-8 h-8 text-brand-red" />}
              />
              <span className="font-black text-brand-text text-sm hidden sm:block">الحكاية ومافيها</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowLogin(true)}
                className="px-5 py-2.5 bg-brand-red text-white font-black text-sm rounded-xl hover:bg-red-700 transition-all shadow-md shadow-brand-red/20 flex items-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>تسجيل الدخول</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ====== HERO SECTION ====== */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center px-6 pt-28 pb-20 overflow-hidden"
      >
        {/* Animated BG blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3], x: [0, 30, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-brand-red rounded-full blur-[120px] opacity-20"
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2], x: [0, -40, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 3 }}
            className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-amber-400 rounded-full blur-[150px] opacity-10"
          />
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Logos */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
            className="flex items-center justify-center gap-6 mb-10"
          >
            <motion.div whileHover={{ scale: 1.1, rotate: -5 }} className="relative">
              <div className="absolute inset-0 bg-brand-red/20 blur-xl rounded-full" />
              <SmartImage
                src="/assets/logo-red.png"
                alt="كنيسة القديسة رفقة"
                className="w-24 h-24 sm:w-32 sm:h-32 object-contain drop-shadow-2xl relative z-10 animate-float"
                fallback={
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-brand-red/10 flex items-center justify-center text-brand-red border border-brand-red/20">
                    <Church className="w-12 h-12" />
                  </div>
                }
              />
            </motion.div>
            <div className="w-px h-16 bg-gradient-to-b from-transparent via-brand-beige/40 to-transparent" />
            <motion.div whileHover={{ scale: 1.1, rotate: 5 }} className="relative">
              <div className="absolute inset-0 bg-brand-beige/20 blur-xl rounded-full" />
              <SmartImage
                src="/assets/logo-beige.png"
                alt="الحكاية ومافيها"
                className="w-24 h-24 sm:w-32 sm:h-32 object-contain drop-shadow-2xl relative z-10 animate-float [animation-delay:0.5s]"
                fallback={
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-brand-beige/10 flex items-center justify-center text-brand-beige border border-brand-beige/20 text-4xl font-black">
                    H
                  </div>
                }
              />
            </motion.div>
          </motion.div>

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-2 bg-brand-red/10 text-brand-red px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest mb-6"
          >
            <div className="w-2 h-2 bg-brand-red rounded-full animate-pulse" />
            المنصة التعليمية الرسمية • كنيسة القديسة رفقة بالقناطر
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, type: "spring", bounce: 0.3 }}
            className="text-5xl sm:text-7xl lg:text-8xl font-black text-brand-text tracking-tighter leading-none mb-6"
          >
            الحكاية{" "}
            <span className="text-brand-red relative">
              ومافيها
              <motion.span
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 1, duration: 0.6 }}
                className="absolute bottom-0 left-0 right-0 h-1 bg-brand-red/30 rounded-full origin-right"
              />
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-brand-text/60 text-lg sm:text-xl lg:text-2xl font-bold max-w-2xl mx-auto leading-relaxed mb-12"
          >
            منصة تعليمية تفاعلية لأبناء كنيسة القديسة رفقة تجمع التعلم والمتعة والإيمان في مكان واحد
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="flex flex-wrap items-center justify-center gap-4 mb-16"
          >
            <motion.button
              whileHover={{ scale: 1.05, y: -3 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowLogin(true)}
              className="px-8 py-4 bg-brand-red text-white font-black text-base rounded-2xl shadow-xl shadow-brand-red/30 hover:shadow-brand-red/50 transition-all flex items-center gap-3"
            >
              <LogIn className="w-5 h-5" />
              دخول للمنصة
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05, y: -3 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/register")}
              className="px-8 py-4 bg-white text-brand-text font-black text-base rounded-2xl shadow-xl border border-brand-beige/20 hover:border-brand-red/30 hover:shadow-brand-red/10 transition-all flex items-center gap-3"
            >
              <GraduationCap className="w-5 h-5" />
              تسجيل حساب جديد
            </motion.button>
          </motion.div>

          {/* Stats Row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto"
          >
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 + i * 0.1 }}
                whileHover={{ y: -4, scale: 1.02 }}
                className="bg-white rounded-2xl p-4 shadow-sm border border-brand-beige/10 text-center"
              >
                <stat.icon className="w-5 h-5 text-brand-red mx-auto mb-2" />
                <div className="text-xl font-black text-brand-text">{stat.value}</div>
                <div className="text-[10px] font-black text-brand-beige uppercase tracking-wide">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>

          {/* Scroll Hint */}
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="mt-16 flex flex-col items-center gap-2 text-brand-beige/40"
          >
            <span className="text-[10px] font-black uppercase tracking-widest">اكتشف أكتر</span>
            <ChevronDown className="w-5 h-5" />
          </motion.div>
        </div>
      </section>

      {/* ====== WHO WE ARE SECTION ====== */}
      <section className="py-24 px-6 bg-white relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-beige/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-beige/20 to-transparent" />

        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            {/* Left visual */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="lg:w-1/2 relative"
            >
              <div className="relative w-full max-w-md mx-auto">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-red/20 to-brand-beige/20 rounded-[40px] blur-3xl transform scale-110" />
                <div className="relative bg-gradient-to-br from-brand-cream to-white rounded-[40px] p-10 border border-brand-beige/10 shadow-2xl">
                  <div className="flex items-center justify-center gap-6 mb-8">
                    <SmartImage
                      src="/assets/logo-red.png"
                      alt="كنيسة القديسة رفقة"
                      className="w-20 h-20 object-contain drop-shadow-xl"
                      fallback={<Church className="w-20 h-20 text-brand-red" />}
                    />
                    <SmartImage
                      src="/assets/logo-beige.png"
                      alt="الحكاية ومافيها"
                      className="w-20 h-20 object-contain drop-shadow-xl"
                      fallback={<div className="w-20 h-20 text-4xl font-black text-brand-beige flex items-center justify-center">H</div>}
                    />
                  </div>
                  {/* Decorative quote */}
                  <blockquote className="text-center text-brand-text/70 font-bold text-lg italic leading-relaxed">
                    "درّس الصبي في طريق يستحق أن يسلكه، فحتى إذا شاخ لا يحيد عنه"
                  </blockquote>
                  <p className="text-center text-brand-beige text-xs font-black uppercase tracking-widest mt-4">أمثال ٢٢ : ٦</p>
                </div>
              </div>
            </motion.div>

            {/* Right text */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="lg:w-1/2 space-y-6 text-right"
            >
              <span className="text-[10px] font-black text-brand-red uppercase tracking-[0.3em] bg-brand-red/5 px-4 py-1.5 rounded-full inline-block">
                مين إحنا؟
              </span>
              <h2 className="text-4xl lg:text-5xl font-black text-brand-text leading-tight">
                منصة تعليمية{" "}
                <span className="text-brand-red">من قلب الكنيسة</span>
              </h2>
              <p className="text-brand-text/60 text-lg font-bold leading-relaxed">
                الحكاية ومافيها هي المنصة التعليمية الرسمية لورشة كنيسة القديسة رفقة وأولادها الخمسة بالقناطر الخيرية، صُممت بهدف تشجيع أبناء الكنيسة على دراسة الكتاب المقدس بطريقة تفاعلية وممتعة.
              </p>
              <p className="text-brand-text/60 text-lg font-bold leading-relaxed">
                بنقدم اختبارات على الأناجيل والرسائل، نظام نقاط ومكافآت، متجر خاص، وكل ده في بيئة آمنة ومتحدة تجمع الطلاب والخدام معاً.
              </p>
              <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { icon: Church, text: "تابعة لكنيسة القديسة رفقة" },
                  { icon: BookOpen, text: "محتوى مبني على الكتاب المقدس" },
                  { icon: Users, text: "مجتمع من المؤمنين الشباب" },
                  { icon: Trophy, text: "نظام مكافآت وتحفيز" },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3 bg-brand-cream/50 rounded-2xl p-3"
                  >
                    <div className="w-8 h-8 bg-brand-red/10 rounded-xl flex items-center justify-center shrink-0">
                      <item.icon className="w-4 h-4 text-brand-red" />
                    </div>
                    <span className="text-sm font-bold text-brand-text">{item.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ====== FEATURES SECTION ====== */}
      <section className="py-24 px-6 bg-[#FDFCFB] relative">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-[10px] font-black text-brand-red uppercase tracking-[0.3em] bg-brand-red/5 px-4 py-1.5 rounded-full inline-block mb-4">
              المنصة بتقدم ايه؟
            </span>
            <h2 className="text-4xl lg:text-5xl font-black text-brand-text leading-tight">
              كل حاجة{" "}
              <span className="text-brand-red">في مكان واحد</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -8, scale: 1.01 }}
                className="bg-white rounded-[28px] p-8 border border-brand-beige/10 shadow-sm hover:shadow-xl hover:shadow-brand-beige/10 transition-all group cursor-default"
              >
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 group-hover:rotate-3", feature.bg)}>
                  <feature.icon className={cn("w-7 h-7", feature.iconColor)} />
                </div>
                <h3 className="text-xl font-black text-brand-text mb-3">{feature.title}</h3>
                <p className="text-brand-text/50 font-bold leading-relaxed text-sm">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== SOCIAL MEDIA SECTION ====== */}
      <section className="py-24 px-6 bg-white relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-beige/20 to-transparent" />

        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-[10px] font-black text-brand-red uppercase tracking-[0.3em] bg-brand-red/5 px-4 py-1.5 rounded-full inline-block mb-4">
              تابعنا على السوشيال ميديا
            </span>
            <h2 className="text-4xl lg:text-5xl font-black text-brand-text leading-tight mb-4">
              الحكاية{" "}
              <span className="text-brand-beige">في كل مكان</span>
            </h2>
            <p className="text-brand-text/50 font-bold text-lg max-w-xl mx-auto">
              تابعنا على وسائل التواصل الاجتماعي وكن أول من يعرف بكل الأخبار والمحتوى الجديد
            </p>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {socialLinks.map((social, i) => (
              <motion.a
                key={i}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -6, scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex flex-col items-center justify-center gap-4 p-6 sm:p-8 bg-white rounded-[28px] border border-brand-beige/10 shadow-sm hover:shadow-2xl hover:border-transparent transition-all group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-brand-cream/30 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                <div className={cn("w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-white shadow-xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 relative z-10", social.color)}>
                  <social.icon className="w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <div className="text-center relative z-10">
                  <p className="font-black text-brand-text text-sm sm:text-base group-hover:text-brand-red transition-colors">{social.name}</p>
                  <p className="text-brand-red font-black text-base sm:text-lg">{social.followers}</p>
                  <p className="text-brand-beige text-[10px] font-black uppercase tracking-wider">{social.label}</p>
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* ====== FINAL CTA SECTION ====== */}
      <section className="py-24 px-6 bg-brand-cream relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 8, repeat: Infinity }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-red rounded-full blur-[150px] opacity-10"
          />
        </div>

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div className="flex items-center justify-center gap-4 mb-6">
              <SmartImage src="/assets/logo-red.png" alt="" className="w-16 h-16 object-contain drop-shadow-xl" fallback={<Church className="w-16 h-16 text-brand-red" />} />
              <SmartImage src="/assets/logo-beige.png" alt="" className="w-16 h-16 object-contain drop-shadow-xl" fallback={<div className="w-16 h-16 text-2xl font-black text-brand-beige flex items-center justify-center">H</div>} />
            </div>
            <h2 className="text-4xl lg:text-6xl font-black text-brand-text leading-tight">
              ابدأ رحلتك{" "}
              <span className="text-brand-red">دلوقتي</span>
            </h2>
            <p className="text-brand-text/60 text-xl font-bold leading-relaxed">
              انضم لمجتمع أبناء كنيسة القديسة رفقة وابدأ رحلتك في تعلم الكتاب المقدس بطريقة ممتعة ومميزة
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowLogin(true)}
                className="px-10 py-5 bg-brand-red text-white font-black text-lg rounded-2xl shadow-2xl shadow-brand-red/30 hover:shadow-brand-red/50 transition-all flex items-center gap-3"
              >
                <LogIn className="w-6 h-6" />
                ادخل لحسابك
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/register")}
                className="px-10 py-5 bg-white text-brand-text font-black text-lg rounded-2xl shadow-xl border border-brand-beige/20 hover:border-brand-red/30 transition-all flex items-center gap-3"
              >
                <GraduationCap className="w-6 h-6" />
                سجل حساب جديد
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ====== FOOTER ====== */}
      <footer className="bg-white border-t border-brand-beige/10 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <SmartImage src="/assets/logo-red.png" alt="" className="w-8 h-8 object-contain" fallback={<Church className="w-8 h-8 text-brand-red" />} />
            <SmartImage src="/assets/logo-beige.png" alt="" className="w-8 h-8 object-contain" fallback={<div className="text-brand-beige font-black">H</div>} />
          </div>
          <p className="text-brand-beige font-black text-xs uppercase tracking-[0.2em] text-center">
            كنيسة القديسة رفقة وأولادها الخمسة © ٢٠٢٥ الحكاية ومافيها
          </p>
          <div className="flex items-center gap-3">
            {socialLinks.slice(0, 3).map((s, i) => (
              <a key={i} href={s.href} target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-xl bg-brand-cream flex items-center justify-center text-brand-beige hover:text-brand-red transition-colors">
                <s.icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>
      </footer>

      {/* ====== LOGIN MODAL ====== */}
      <AnimatePresence>
        {showLogin && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogin(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", bounce: 0.4 }}
              className="fixed left-4 right-4 top-1/2 -translate-y-1/2 sm:left-auto sm:right-auto sm:w-[440px] mx-auto z-[110] bg-white rounded-[40px] shadow-2xl border border-white/80 overflow-hidden"
            >
              <div className="p-8 sm:p-10 relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-red/5 rounded-full -translate-y-16 translate-x-16 blur-2xl" />
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-brand-beige/5 rounded-full translate-y-16 -translate-x-16 blur-2xl" />

                <div className="relative z-10 space-y-6">
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-brand-cream rounded-[20px] flex items-center justify-center mx-auto mb-4 text-brand-red shadow-sm border border-brand-red/10">
                      <LogIn className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black text-brand-text">تسجيل الدخول</h2>
                    <p className="text-brand-beige font-bold text-sm">ادخل بياناتك عشان تتابع رحلتك</p>
                  </div>

                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <div className="space-y-1.5 text-right">
                      <label className="text-[10px] font-black text-brand-beige uppercase tracking-[0.2em] mr-2">كود الطالب أو الاسم</label>
                      <div className="relative">
                        <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-beige" />
                        <input
                          type="text"
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          className="w-full bg-brand-cream/50 border-2 border-brand-cream focus:border-brand-red rounded-2xl py-4 pr-12 pl-4 outline-none transition-all font-bold text-brand-text"
                          placeholder="مثال: Kirolos أو G001"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 text-right">
                      <label className="text-[10px] font-black text-brand-beige uppercase tracking-[0.2em] mr-2">كلمة المرور</label>
                      <div className="relative">
                        <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-beige" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-brand-cream/50 border-2 border-brand-cream focus:border-brand-red rounded-2xl py-4 pr-12 pl-4 outline-none transition-all font-bold text-brand-text"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    <AnimatePresence>
                      {loginError && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="bg-rose-50 text-brand-red p-3 rounded-2xl text-xs font-bold border border-brand-red/10 flex items-center gap-2"
                        >
                          <div className="w-1.5 h-1.5 bg-brand-red rounded-full animate-ping shrink-0" />
                          {loginError}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={isLoggingIn}
                      className="w-full py-4 bg-brand-red text-white font-black rounded-2xl shadow-lg shadow-brand-red/30 hover:shadow-brand-red/50 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                      {isLoggingIn ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>دخول إلى حسابي <ChevronLeft className="w-5 h-5" /></>
                      )}
                    </motion.button>
                  </form>

                  <div className="text-center pt-4 border-t border-brand-beige/10">
                    <p className="text-brand-beige font-bold text-xs mb-3">ليس لديك حساب؟</p>
                    <button
                      onClick={() => { setShowLogin(false); navigate("/register"); }}
                      className="text-brand-red font-black text-sm bg-brand-red/5 px-6 py-2.5 rounded-full hover:bg-brand-red/10 transition-colors"
                    >
                      تسجيل حساب جديد الآن
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
