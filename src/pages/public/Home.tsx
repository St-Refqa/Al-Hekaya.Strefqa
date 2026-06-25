import { useNavigate } from "react-router-dom";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen,
  Trophy,
  Users,
  Star,
  CheckCircle,
  GraduationCap,
  Heart,
  Church,
  ChevronDown,
  LogIn,
  Lock,
  User,
  ChevronLeft,
  Globe,
  Sparkles,
  ShoppingBag,
  BarChart3,
  Bell,
  Map,
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
    handle: "الحكاية ومافيها",
    stat: "8.9K",
    statLabel: "متابع",
  },
  {
    name: "Instagram",
    icon: FaInstagram,
    href: "https://www.instagram.com/elhkaya0?igsh=MTQ5eGE3eHl4Mm5q&utm_source=qr",
    color: "bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]",
    handle: "@elhkaya0",
    stat: "2.2K",
    statLabel: "متابع",
  },
  {
    name: "TikTok",
    icon: FaTiktok,
    href: "https://www.tiktok.com/@elhkaya1?_r=1&_t=ZS-96KJ9nxg4bC",
    color: "bg-black",
    handle: "@elhkaya1",
    stat: "3.4K",
    statLabel: "متابع • 10.8K لايك",
  },
  {
    name: "WhatsApp",
    icon: FaWhatsapp,
    href: "https://wa.me/201055082964",
    color: "bg-[#25D366]",
    handle: "تواصل مباشر",
    stat: "💬",
    statLabel: "كلمنا دلوقتي",
  },
];

const platformFeatures = [
  {
    icon: BookOpen,
    title: "اختبارات على كل إصحاح",
    desc: "أسئلة متنوعة على كل إصحاح من الكتاب المقدس — سهلة ومتوسطة وصعبة — تساعدك تفهم وتحفظ بشكل ممتع",
    color: "text-brand-red",
    bg: "bg-brand-red/5",
  },
  {
    icon: Trophy,
    title: "نظام نقاط وترتيبات",
    desc: "كل إجابة صح بتكسبك نقاط، وتقدر تتنافس مع زملائك على قائمة الشرف والمراكز الأولى",
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    icon: Star,
    title: "شارات وإنجازات",
    desc: "احصل على شارات مميزة لكل خطوة في رحلتك — إنجازاتك بتتسجل وبتفرح قلبك",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    icon: ShoppingBag,
    title: "متجر المكافآت",
    desc: "استبدل النقاط اللي جمعتها بمكافآت حقيقية ومميزة من متجر الحكاية",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    icon: BarChart3,
    title: "تحليل أداؤك",
    desc: "شوف تقدمك بشكل مفصل — أقوى نقاطك واللي محتاج تراجعها، كل ده في تقارير واضحة",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: Bell,
    title: "إشعارات فورية",
    desc: "هنعلمك فور ما يبقى في اختبار جديد أو حاجة مهمة — عشان ماتفوتكش أي حاجة",
    color: "text-rose-600",
    bg: "bg-rose-50",
  },
];

const timeline = [
  { year: "٢٠٢٥", text: "بدأت الورشة بشعلة صغيرة — حب حقيقي لتعليم أولادنا كلام ربنا بطريقة تلمس قلبهم" },
  { year: "", text: "خرجنا لكنايس كتير، شرحنا وتعلمنا، وأخدنا بركة الآباء والشمامسة في كل مكان" },
  { year: "+١٠٠", text: "ورشة موزعة في أكتر من مية كنيسة داخل مصر وخارجها — وكل ورشة بتحمل نفس الرسالة" },
  { year: "∞", text: "قررنا نفتح المنصة للجميع — لأن كلام ربنا مش لحد بعينه، هو لكل اللي عنده قلب يسمع" },
];

export default function Home() {
  const navigate = useNavigate();
  const { login, user, isAuthenticated, isAdmin } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoggingIn && isAuthenticated && user) {
      const userRole = (user.role || "").toLowerCase();
      if (
        isAdmin ||
        ["creator", "attendance", "store", "servant", "admin"].includes(userRole)
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
    } catch {
      setLoginError("حدث خطأ غير متوقع");
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen bg-brand-cream flex flex-col items-center justify-center" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6 p-10 bg-white/70 backdrop-blur-md rounded-[40px] shadow-2xl border border-white/60"
        >
          <div className="w-20 h-20 bg-brand-red text-white rounded-full flex items-center justify-center shadow-lg animate-pulse">
            <Sparkles className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-brand-text">يا مرحباً بك يا {user.fullName}</h2>
          <p className="text-brand-beige font-bold">جاري دخولك للمنصة...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB] overflow-x-hidden" dir="rtl">

      {/* ═══════════════════════════════ NAVBAR ═══════════════════════════════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-2xl px-5 py-2.5 shadow-lg shadow-black/5 flex items-center justify-between">
            {/* Logo & Name */}
            <div className="flex items-center gap-2.5">
              <SmartImage
                src="/assets/logo-beige.png"
                alt=""
                className="w-7 h-7 object-contain"
                fallback={<Church className="w-7 h-7 text-brand-red" />}
              />
              <SmartImage
                src="/assets/logo-red.png"
                alt=""
                className="w-7 h-7 object-contain"
                fallback={<div />}
              />
              <span className="font-black text-brand-text text-sm hidden sm:block tracking-tight">الحكاية ومافيها</span>
            </div>

            {/* Nav Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setShowLogin(true); }}
                className="px-4 py-2 text-brand-text font-black text-xs rounded-xl hover:bg-brand-cream transition-colors hidden sm:flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                دخول
              </button>
              <button
                onClick={() => navigate("/register")}
                className="px-4 py-2 bg-brand-red text-white font-black text-xs rounded-xl shadow-sm shadow-brand-red/20 hover:bg-red-700 transition-all flex items-center gap-1.5"
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">تسجيل مجاني</span>
                <span className="sm:hidden">انضم</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════ HERO ═══════════════════════════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-28 pb-16 overflow-hidden">
        {/* BG blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [0.15, 0.3, 0.15] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[-15%] right-[-10%] w-[600px] h-[600px] bg-brand-red rounded-full blur-[130px]"
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.08, 0.15, 0.08], x: [0, -30, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 4 }}
            className="absolute bottom-[-20%] left-[-10%] w-[700px] h-[700px] bg-amber-400 rounded-full blur-[160px]"
          />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          {/* Logos */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex items-center justify-center gap-5 mb-8"
          >
            <motion.div whileHover={{ scale: 1.1, rotate: -5 }} className="relative">
              <div className="absolute inset-0 bg-brand-red/30 blur-2xl rounded-full scale-110" />
              <SmartImage
                src="/assets/logo-red.png"
                alt="كنيسة القديسة رفقة"
                className="w-20 h-20 sm:w-28 sm:h-28 object-contain drop-shadow-2xl relative z-10 animate-float"
                fallback={<Church className="w-20 h-20 text-brand-red" />}
              />
            </motion.div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-px h-10 bg-gradient-to-b from-transparent via-brand-beige/30 to-transparent" />
              <div className="w-1.5 h-1.5 bg-brand-red rounded-full animate-pulse" />
              <div className="w-px h-10 bg-gradient-to-b from-transparent via-brand-beige/30 to-transparent" />
            </div>
            <motion.div whileHover={{ scale: 1.1, rotate: 5 }} className="relative">
              <div className="absolute inset-0 bg-brand-beige/30 blur-2xl rounded-full scale-110" />
              <SmartImage
                src="/assets/logo-beige.png"
                alt="الحكاية ومافيها"
                className="w-20 h-20 sm:w-28 sm:h-28 object-contain drop-shadow-2xl relative z-10 animate-float [animation-delay:0.6s]"
                fallback={<div className="w-20 h-20 text-4xl font-black text-brand-beige flex items-center justify-center">H</div>}
              />
            </motion.div>
          </motion.div>

          {/* Tag */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-2 bg-brand-red/8 text-brand-red px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-widest mb-5 border border-brand-red/10"
          >
            <div className="w-1.5 h-1.5 bg-brand-red rounded-full animate-pulse" />
            من كنيسة القديسة رفقة بالقناطر — منذ ٢٠٢٥
          </motion.div>

          {/* Main Title */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, type: "spring", bounce: 0.3 }}
            className="text-6xl sm:text-7xl lg:text-8xl font-black text-brand-text tracking-tighter leading-none mb-5"
          >
            الحكاية{" "}
            <span className="text-brand-red relative inline-block">
              ومافيها
              <motion.span
                initial={{ scaleX: 0, originX: 1 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 1.2, duration: 0.5 }}
                className="absolute -bottom-1 left-0 right-0 h-1 bg-brand-red/25 rounded-full"
              />
            </span>
          </motion.h1>

          {/* Sub */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-brand-text/55 text-lg sm:text-xl font-bold max-w-2xl mx-auto leading-relaxed mb-2"
          >
            قصص تنور طريقك ❤️
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-brand-text/40 text-sm sm:text-base font-bold max-w-xl mx-auto leading-relaxed mb-4"
          >
            ورشة تفاعلية للكتاب المقدس بكنيسة القديسة رفقة وأولادها بالقناطر الخيرية
          </motion.p>

          {/* Bible Quote */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="bg-white/60 backdrop-blur-sm border border-brand-beige/15 rounded-2xl px-6 py-4 max-w-xl mx-auto mb-10 shadow-sm"
          >
            <p className="text-brand-text/70 font-bold text-sm sm:text-base leading-relaxed italic">
              "رَبِّ الْوَلَدَ فِي طَرِيقِهِ، فَمَتَى شَاخَ أَيْضًا لَا يَحِيدُ عَنْهُ."
            </p>
            <p className="text-brand-red text-xs font-black uppercase tracking-widest mt-2">أمثال ٢٢ : ٦</p>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
          >
            <motion.button
              whileHover={{ scale: 1.04, y: -3 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/register")}
              className="w-full sm:w-auto px-8 py-4 bg-brand-red text-white font-black text-base rounded-2xl shadow-xl shadow-brand-red/25 hover:shadow-brand-red/40 transition-all flex items-center justify-center gap-3"
            >
              <GraduationCap className="w-5 h-5" />
              انضم لينا دلوقتي — مجاناً
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04, y: -3 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowLogin(true)}
              className="w-full sm:w-auto px-8 py-4 bg-white text-brand-text font-black text-base rounded-2xl shadow-lg border border-brand-beige/20 hover:border-brand-red/20 hover:shadow-brand-red/5 transition-all flex items-center justify-center gap-3"
            >
              <LogIn className="w-5 h-5 text-brand-red" />
              دخول لحسابي
            </motion.button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="flex flex-wrap items-center justify-center gap-6 text-center"
          >
            {[
              { val: "+١٠٠", label: "كنيسة بتستخدم ورشنا" },
              { val: "+١٤K", label: "متابع على السوشيال" },
              { val: "٢٠٢٥", label: "بداية الرحلة" },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.3 + i * 0.15 }}
                className="flex flex-col items-center"
              >
                <span className="text-2xl font-black text-brand-text">{s.val}</span>
                <span className="text-[11px] font-black text-brand-beige uppercase tracking-wider">{s.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Scroll hint */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-brand-beige/40"
        >
          <span className="text-[10px] font-black uppercase tracking-widest">اعرف أكتر</span>
          <ChevronDown className="w-5 h-5" />
        </motion.div>
      </section>

      {/* ═══════════════════════════════ WHO WE ARE ═══════════════════════════════ */}
      <section className="py-28 px-6 bg-white relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-beige/20 to-transparent" />

        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <span className="text-[10px] font-black text-brand-red uppercase tracking-[0.3em] bg-brand-red/5 px-4 py-1.5 rounded-full inline-block mb-5 border border-brand-red/10">
              حكايتنا مع ربنا
            </span>
            <h2 className="text-4xl sm:text-5xl font-black text-brand-text leading-tight">
              من أين بدأت{" "}
              <span className="text-brand-red">الحكاية؟</span>
            </h2>
          </motion.div>

          {/* Story paragraphs */}
          <div className="max-w-3xl mx-auto space-y-12 mb-20">
            {[
              {
                icon: Heart,
                iconBg: "bg-rose-50",
                iconColor: "text-rose-500",
                title: "شعلة صغيرة من قلب الكنيسة",
                text: "في سنة ٢٠٢٥، بدأت الحكاية بحلم بسيط — إننا نعلّم أولادنا كلام ربنا مش بس بالحفظ، لكن بالفهم والفرح والمشاركة. بدأنا في كنيستنا \"القديسة رفقة وأولادها الخمسة بالقناطر\"، وكان الهدف إننا نستغل كل طريقة ممكنة عشان نقرّب الكتاب المقدس من قلوب أولادنا.",
              },
              {
                icon: Globe,
                iconBg: "bg-blue-50",
                iconColor: "text-blue-500",
                title: "خرجنا للكنايس وأخدنا البركة",
                text: "ما لبثنا إننا نبقى في كنيسة واحدة — فتحنا قلوبنا وخرجنا لكنايس كتير، شرحنا الفكرة، وتعلمنا من كل مكان. أخدنا بركة الآباء والخدام في كل كنيسة زرناها، وكانت كل بركة بتزيد في يقيننا إن ده اللي ربنا عايزه منا.",
              },
              {
                icon: ShoppingBag,
                iconBg: "bg-amber-50",
                iconColor: "text-amber-600",
                title: "ورش وصلت لأكتر من ١٠٠ كنيسة",
                text: "عملنا ورش تعليمية احترافية وحملنا براند \"الحكاية ومافيها\" لكل مكان — ووزعنا الورش دي في أكتر من مية كنيسة جوا وبرا مصر. كل ورشة بتحمل نفس الرسالة: إن الكلمة لازم توصل لكل قلب يريد.",
              },
              {
                icon: Users,
                iconBg: "bg-emerald-50",
                iconColor: "text-emerald-600",
                title: "فتحنا الباب للجميع",
                text: "لما شفنا حجم المحبة اللي الناس عندها للكتاب المقدس، قررنا إننا نعمل المنصة دي ونفتحها للجميع — مش بس أبناء كنيستنا. لأن كلام ربنا مش لحد بعينه، هو لكل اللي عنده قلب يريد أن يسمع ويتعلم ويكبر روحياً.",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-5 sm:gap-8 items-start"
              >
                <div className={cn("w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-white", item.iconBg)}>
                  <item.icon className={cn("w-6 h-6 sm:w-7 sm:h-7", item.iconColor)} />
                </div>
                <div className="text-right flex-1">
                  <h3 className="text-lg sm:text-xl font-black text-brand-text mb-2">{item.title}</h3>
                  <p className="text-brand-text/55 font-bold leading-relaxed sm:text-base text-sm">{item.text}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Timeline strip */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-4"
          >
            {timeline.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-brand-cream/50 rounded-2xl p-5 text-center border border-brand-beige/10"
              >
                {t.year && <div className="text-2xl font-black text-brand-red mb-2">{t.year}</div>}
                <p className="text-xs font-bold text-brand-text/60 leading-relaxed">{t.text}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════ PLATFORM FEATURES ═══════════════════════════════ */}
      <section className="py-28 px-6 bg-[#FDFCFB] relative">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-[10px] font-black text-brand-red uppercase tracking-[0.3em] bg-brand-red/5 px-4 py-1.5 rounded-full inline-block mb-5 border border-brand-red/10">
              المنصة بتقدم إيه؟
            </span>
            <h2 className="text-4xl sm:text-5xl font-black text-brand-text leading-tight mb-4">
              رحلة التعلم{" "}
              <span className="text-brand-red">من البداية للنهاية</span>
            </h2>
            <p className="text-brand-text/50 font-bold text-base max-w-xl mx-auto">
              مش مجرد موقع — ده رفيق إيمانك اليومي. كل حاجة ممكن تحتاجها في رحلتك مع الكتاب المقدس موجودة هنا
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {platformFeatures.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -6, scale: 1.01 }}
                className="bg-white rounded-[24px] p-7 border border-brand-beige/10 shadow-sm hover:shadow-lg hover:shadow-brand-beige/10 transition-all group cursor-default"
              >
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-3 transition-all", f.bg)}>
                  <f.icon className={cn("w-6 h-6", f.color)} />
                </div>
                <h3 className="text-base font-black text-brand-text mb-2">{f.title}</h3>
                <p className="text-brand-text/50 font-bold text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════ SOCIAL ═══════════════════════════════ */}
      <section className="py-28 px-6 bg-white relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-beige/20 to-transparent" />

        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-[10px] font-black text-brand-red uppercase tracking-[0.3em] bg-brand-red/5 px-4 py-1.5 rounded-full inline-block mb-5 border border-brand-red/10">
              تابعنا وانضم لمجتمعنا
            </span>
            <h2 className="text-4xl sm:text-5xl font-black text-brand-text leading-tight mb-4">
              الحكاية{" "}
              <span className="text-brand-beige">بتوصل لكل مكان</span>
            </h2>
            <p className="text-brand-text/50 font-bold text-base max-w-lg mx-auto">
              تابعنا على السوشيال ميديا وكن جزء من مجتمع يحب ربنا ويريد يتعلم كلامه كل يوم
            </p>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {socialLinks.map((s, i) => (
              <motion.a
                key={i}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -8, scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex flex-col items-center gap-3 py-8 px-4 bg-white rounded-[24px] border border-brand-beige/10 shadow-sm hover:shadow-xl hover:shadow-black/5 hover:border-transparent transition-all group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-brand-cream/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className={cn("relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300", s.color)}>
                  <s.icon className="w-7 h-7" />
                </div>
                <div className="relative z-10 text-center">
                  <p className="font-black text-brand-text text-sm group-hover:text-brand-red transition-colors">{s.name}</p>
                  <p className="text-2xl font-black text-brand-text mt-1">{s.stat}</p>
                  <p className="text-brand-beige text-[10px] font-black tracking-wide">{s.statLabel}</p>
                  <p className="text-brand-beige/60 text-[9px] font-bold mt-0.5">{s.handle}</p>
                </div>
              </motion.a>
            ))}
          </div>

          {/* Contact CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center bg-brand-cream/50 rounded-3xl p-8 border border-brand-beige/10"
          >
            <p className="text-brand-text/60 font-bold mb-2">عندك سؤال أو استفسار؟</p>
            <a
              href="https://wa.me/201055082964"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[#25D366] font-black text-sm hover:underline"
            >
              <FaWhatsapp className="w-4 h-4" />
              تواصل معنا على واتساب مباشرة
            </a>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════ FINAL CTA ═══════════════════════════════ */}
      <section className="py-28 px-6 relative overflow-hidden bg-[#FDFCFB]">
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [0.08, 0.15, 0.08] }}
            transition={{ duration: 10, repeat: Infinity }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-red rounded-full blur-[180px]"
          />
        </div>

        <div className="max-w-2xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            {/* Logos */}
            <div className="flex items-center justify-center gap-5 mb-4">
              <motion.div whileHover={{ rotate: -10, scale: 1.1 }}>
                <SmartImage src="/assets/logo-red.png" alt="" className="w-16 h-16 object-contain drop-shadow-xl" fallback={<Church className="w-16 h-16 text-brand-red" />} />
              </motion.div>
              <motion.div whileHover={{ rotate: 10, scale: 1.1 }}>
                <SmartImage src="/assets/logo-beige.png" alt="" className="w-16 h-16 object-contain drop-shadow-xl" fallback={<div className="w-16 h-16 text-2xl font-black text-brand-beige flex items-center justify-center">H</div>} />
              </motion.div>
            </div>

            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-brand-text leading-tight">
              رحلتك مع{" "}
              <span className="text-brand-red">الكتاب المقدس</span>{" "}
              بتبدأ هنا
            </h2>

            <p className="text-brand-text/55 text-lg font-bold leading-relaxed">
              انضم لآلاف اللي بيتعلموا ويتنافسوا ويكبروا معانا روحياً — الباب مفتوح لك أنت كمان
            </p>

            {/* Quote */}
            <div className="bg-white/70 backdrop-blur-sm border border-brand-beige/15 rounded-2xl px-6 py-4 shadow-sm mx-auto max-w-lg">
              <p className="text-brand-text/65 font-bold text-sm italic leading-relaxed">
                "رَبِّ الْوَلَدَ فِي طَرِيقِهِ، فَمَتَى شَاخَ أَيْضًا لَا يَحِيدُ عَنْهُ."
              </p>
              <p className="text-brand-red text-xs font-black uppercase tracking-widest mt-2">أمثال ٢٢ : ٦</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/register")}
                className="w-full sm:w-auto px-10 py-5 bg-brand-red text-white font-black text-base rounded-2xl shadow-2xl shadow-brand-red/30 hover:shadow-brand-red/50 transition-all flex items-center justify-center gap-3"
              >
                <GraduationCap className="w-6 h-6" />
                انضم مجاناً دلوقتي
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowLogin(true)}
                className="w-full sm:w-auto px-10 py-5 bg-white text-brand-text font-black text-base rounded-2xl shadow-lg border border-brand-beige/20 hover:border-brand-red/20 transition-all flex items-center justify-center gap-3"
              >
                <LogIn className="w-6 h-6 text-brand-red" />
                عندي حساب — ادخل
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════ FOOTER ═══════════════════════════════ */}
      <footer className="bg-white border-t border-brand-beige/10 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2.5">
            <SmartImage src="/assets/logo-red.png" alt="" className="w-8 h-8 object-contain" fallback={<Church className="w-8 h-8 text-brand-red" />} />
            <SmartImage src="/assets/logo-beige.png" alt="" className="w-8 h-8 object-contain" fallback={<div />} />
            <span className="text-xs font-black text-brand-text hidden sm:block">الحكاية ومافيها</span>
          </div>
          <p className="text-brand-beige font-black text-[10px] uppercase tracking-[0.2em] text-center">
            كنيسة القديسة رفقة وأولادها الخمسة &copy; ٢٠٢٥ الحكاية ومافيها
          </p>
          <div className="flex items-center gap-2">
            {socialLinks.map((s, i) => (
              <a key={i} href={s.href} target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-xl bg-brand-cream flex items-center justify-center text-brand-beige hover:text-brand-red hover:bg-brand-red/5 transition-colors">
                <s.icon className="w-3.5 h-3.5" />
              </a>
            ))}
          </div>
        </div>
      </footer>

      {/* ═══════════════════════════════ LOGIN MODAL ═══════════════════════════════ */}
      <AnimatePresence>
        {showLogin && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogin(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: "spring", bounce: 0.35 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 sm:inset-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[420px] z-[110] bg-white rounded-[36px] shadow-2xl border border-brand-beige/10 overflow-hidden"
            >
              <div className="p-8 sm:p-10 relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-red/5 rounded-full -translate-y-16 translate-x-16 blur-2xl pointer-events-none" />
                <div className="relative z-10 space-y-6">
                  {/* Header */}
                  <div className="text-center">
                    <div className="w-14 h-14 bg-brand-cream rounded-2xl flex items-center justify-center mx-auto mb-4 text-brand-red border border-brand-red/10">
                      <LogIn className="w-7 h-7" />
                    </div>
                    <h2 className="text-xl font-black text-brand-text">تسجيل الدخول</h2>
                    <p className="text-brand-beige font-bold text-xs mt-1">ادخل بياناتك عشان تتابع رحلتك</p>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <div className="space-y-1 text-right">
                      <label className="text-[10px] font-black text-brand-beige uppercase tracking-[0.2em] mr-1">كود الطالب أو الاسم</label>
                      <div className="relative">
                        <User className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-beige" />
                        <input
                          type="text"
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          className="w-full bg-brand-cream/40 border-2 border-brand-cream focus:border-brand-red rounded-xl py-3.5 pr-11 pl-4 outline-none transition-all font-bold text-brand-text text-sm"
                          placeholder="مثال: Kirolos أو G001"
                          autoFocus
                        />
                      </div>
                    </div>

                    <div className="space-y-1 text-right">
                      <label className="text-[10px] font-black text-brand-beige uppercase tracking-[0.2em] mr-1">كلمة المرور</label>
                      <div className="relative">
                        <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-beige" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-brand-cream/40 border-2 border-brand-cream focus:border-brand-red rounded-xl py-3.5 pr-11 pl-4 outline-none transition-all font-bold text-brand-text text-sm"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    <AnimatePresence>
                      {loginError && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="bg-rose-50 text-brand-red p-3 rounded-xl text-xs font-bold border border-brand-red/10 flex items-center gap-2"
                        >
                          <div className="w-1.5 h-1.5 bg-brand-red rounded-full animate-ping shrink-0" />
                          {loginError}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={isLoggingIn}
                      className="w-full py-4 bg-brand-red text-white font-black rounded-xl shadow-lg shadow-brand-red/25 hover:shadow-brand-red/40 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                    >
                      {isLoggingIn ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <><span>دخول لحسابي</span><ChevronLeft className="w-4 h-4" /></>
                      )}
                    </motion.button>
                  </form>

                  <div className="text-center pt-3 border-t border-brand-beige/10">
                    <p className="text-brand-beige font-bold text-xs mb-2">ليس لديك حساب؟</p>
                    <button
                      onClick={() => { setShowLogin(false); navigate("/register"); }}
                      className="text-brand-red font-black text-sm bg-brand-red/5 px-5 py-2 rounded-full hover:bg-brand-red/10 transition-colors"
                    >
                      سجل حساب جديد مجاناً
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
