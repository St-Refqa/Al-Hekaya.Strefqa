import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { 
  BookOpen, 
  Church, 
  Sparkles, 
  Users, 
  Gift, 
  QrCode, 
  ArrowRight,
  Target,
  Compass,
  Heart
} from "lucide-react";
import { 
  FaFacebookF, 
  FaInstagram, 
  FaTiktok, 
  FaWhatsapp 
} from "react-icons/fa";
import { SmartImage } from "../../components/ui/SmartImage";
import { useTranslation } from "react-i18next";

export default function About() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const dir = i18n.language === 'ar' ? 'rtl' : 'ltr';

  const socialLinks = [
    { name: "فيسبوك", icon: FaFacebookF, href: "https://www.facebook.com/share/1Cqc7Fuhi3/?mibextid=wwXIfr", color: "bg-[#1877F2]" },
    { name: "إنستجرام", icon: FaInstagram, href: "https://www.instagram.com/elhkaya0?igsh=MTQ5eGE3eHl4Mm5q&utm_source=qr", color: "bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]" },
    { name: "تيك توك", icon: FaTiktok, href: "https://www.tiktok.com/@elhkaya1?_r=1&_t=ZS-96KJ9nxg4bC", color: "bg-black" },
    { name: "واتساب", icon: FaWhatsapp, href: "https://wa.me/201055082964", color: "bg-[#25D366]" },
  ];

  const features = [
    {
      title: "ورشة تفاعلية للكتاب المقدس",
      description: "دراسة وتأمل في كلمة الله بطرق شيقة وعملية، تجمع بين الفهم العميق والمسابقات التفاعلية.",
      icon: BookOpen,
      iconColor: "text-brand-red bg-brand-red/10"
    },
    {
      title: "نظام نقاط تشجيعي",
      description: "كل سؤال تجاوب عليه وكل اجتماع تحضره بيكسبك نقاط بتساعدك تترقى في المستويات وتبقى دايماً في لوحة الصدارة.",
      icon: Target,
      iconColor: "text-amber-600 bg-amber-50"
    },
    {
      title: "متجر الهدايا التفاعلي",
      description: "النقاط اللي بتجمعها مش مجرد أرقام! تقدر تستبدلها بهدايا قيمة وحقيقية من متجر الورشة تشجيعاً لمجهودك.",
      icon: Gift,
      iconColor: "text-emerald-600 bg-emerald-50"
    },
    {
      title: "سجل حضور ذكي بالـ QR",
      description: "حضورك في الاجتماعات بيتسجل في ثواني بمسح كود الـ QR الخاص بيك، وبتاخد عليه نقاط فورية.",
      icon: QrCode,
      iconColor: "text-indigo-600 bg-indigo-50"
    }
  ];

  const groups = [
    {
      name: "مجموعة الأونلاين (العهد القديم - H)",
      description: "مخصصة للمتابعة ودراسة العهد القديم عن بُعد، بتتيح ليك حل الاختبارات الأسبوعية وتجميع النقاط أينما كنت.",
      badge: "أونلاين"
    },
    {
      name: "مجموعة الورشة (العهد الجديد - N)",
      description: "مخصصة للحضور الفعلي وورش العمل التفاعلية داخل الكنيسة، لدراسة العهد الجديد والتفاعل المباشر مع الخدام والزملاء.",
      badge: "حضور كنيسة"
    },
    {
      name: "الخدام والمنظمين (S)",
      description: "فريق الخدمة المسؤول عن كتابة الاختبارات، تقييم الإجابات، تحضير الهدايا في المتجر، ومتابعة حضور وغياب الطلاب لتسهيل وتنسيق الورشة.",
      badge: "الخدمة والتنظيم"
    }
  ];

  return (
    <div className="min-h-screen bg-brand-cream relative overflow-x-hidden text-right" dir={dir}>
      {/* Dynamic Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
        <motion.div 
          animate={{ y: [0, -30, 0], opacity: [0.1, 0.4, 0.1], scale: [1, 1.1, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-brand-red rounded-full blur-[120px]"
        />
        <motion.div 
          animate={{ x: [0, 40, 0], opacity: [0.08, 0.2, 0.08], scale: [1, 1.2, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-500 rounded-full blur-[150px]"
        />
      </div>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-6 py-12 md:py-20 relative z-10">
        {/* Header Navigation */}
        <div className="flex items-center justify-between mb-16">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-brand-cream border border-brand-beige/25 hover:border-brand-beige/40 text-brand-text rounded-full shadow-sm active:scale-95 transition-all text-sm font-black cursor-pointer"
          >
            <ArrowRight className="w-4 h-4 ml-1 rotate-180" />
            الرجوع للرئيسية
          </button>
          
          <div className="flex items-center gap-3">
            <SmartImage src="/assets/logo-red.png" className="w-10 h-10 object-contain" alt="" />
            <div className="w-px h-6 bg-brand-text/20" />
            <SmartImage src="/assets/logo-beige.png" className="w-10 h-10 object-contain" alt="" />
          </div>
        </div>

        {/* Hero Section */}
        <div className="text-center md:text-right flex flex-col md:flex-row items-center justify-between gap-12 mb-24">
          <div className="md:w-3/5 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="inline-flex items-center gap-2 bg-brand-red/5 px-4 py-1.5 rounded-full">
                <Sparkles className="w-4 h-4 text-brand-red" />
                <span className="text-xs font-black text-brand-red">قصص تنور طريقك</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-brand-text tracking-tight leading-tight">
                ورشة <span className="text-brand-red">الحكاية ومافيها</span>
              </h1>
              <p className="text-brand-text/80 font-bold text-lg md:text-xl leading-relaxed">
                المنصة التعليمية والتفاعلية الرسمية لورشة دراسة الكتاب المقدس بكنيسة القديسة رفقة وأولادها الخمسة الأطهار بالقناطر الخيرية.
              </p>
            </motion.div>
          </div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 100 }}
            className="md:w-2/5 flex justify-center"
          >
            <div className="relative group p-4 bg-white/40 backdrop-blur-md border border-white/60 rounded-[40px] shadow-2xl">
              <div className="absolute inset-0 bg-brand-red/10 blur-2xl rounded-full scale-75 group-hover:scale-90 transition-transform duration-500" />
              <div className="flex gap-4 relative z-10">
                <SmartImage 
                  src="/assets/logo-red.png" 
                  alt="كنيسة القديسة رفقة" 
                  className="w-24 h-24 md:w-36 md:h-36 object-contain drop-shadow-2xl animate-float"
                  fallback={<div className="w-24 h-24 md:w-36 md:h-36 bg-brand-red/10 flex items-center justify-center text-brand-red rounded-3xl"><Church className="w-12 h-12" /></div>}
                />
                <SmartImage 
                  src="/assets/logo-beige.png" 
                  alt="الحكاية ومافيها" 
                  className="w-24 h-24 md:w-36 md:h-36 object-contain drop-shadow-2xl animate-float [animation-delay:0.5s]"
                  fallback={<div className="w-24 h-24 md:w-36 md:h-36 bg-brand-beige/10 flex items-center justify-center text-brand-beige rounded-3xl text-3xl font-black">H</div>}
                />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Our Vision & Story */}
        <div className="bg-white rounded-[40px] p-8 md:p-12 border border-brand-beige/10 shadow-xl mb-24 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-red/5 rounded-bl-[100px]" />
          
          <div className="max-w-4xl space-y-8 relative z-10">
            <div className="space-y-3">
              <h2 className="text-3xl font-black text-brand-text flex items-center gap-3">
                <Compass className="w-8 h-8 text-brand-red" />
                رؤيتنا وقصتنا
              </h2>
              <div className="h-1 w-20 bg-brand-red rounded-full" />
            </div>
            
            <div className="space-y-6 text-brand-text/80 font-bold text-base md:text-lg leading-relaxed">
              <p>
                بدأت ورشة **"الحكاية ومافيها"** برؤية واحدة: تبسيط وتعميق دراسة وفهم الكتاب المقدس، ليصبح كلمة حية تنور طريقنا اليومي وتثري معرفتنا الروحية. إيماناً منا بأن دراسة الإنجيل لا يجب أن تكون تقليدية، بل تفاعلية تنبض بالحياة والمشاركة.
              </p>
              <p>
                ومن هنا، صممنا هذه المنصة الرقمية لتكون رفيقاً تفاعلياً لكل طالب وخادم. تتيح المنصة للطلاب تطبيق ما تعلموه في المحاضرات وورش العمل من خلال حل الاختبارات المتنوعة، ومتابعة حضورهم الفعلي، والحصول على تشجيع مستمر عبر نظام ذكي يربط المجهود الدراسي بمكافآت وهدايا قيمة ومحفزة.
              </p>
            </div>
          </div>
        </div>

        {/* Features / How it works */}
        <div className="space-y-12 mb-24">
          <div className="text-center md:text-right space-y-3">
            <h2 className="text-3xl font-black text-brand-text">كيف تعمل المنصة؟</h2>
            <p className="text-brand-beige font-bold">كل التفاعلات مجمعة في مكان واحد لتجربة تعليمية فريدة</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feat, index) => (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-3xl p-8 border border-brand-beige/5 hover:border-brand-beige/20 shadow-sm hover:shadow-xl transition-all flex flex-col md:flex-row gap-6 text-right items-start"
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${feat.iconColor}`}>
                  <feat.icon className="w-7 h-7" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-black text-brand-text">{feat.title}</h3>
                  <p className="text-brand-text/70 font-semibold text-sm leading-relaxed">{feat.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Workshop Groups */}
        <div className="bg-brand-text text-white rounded-[40px] p-8 md:p-12 border border-brand-text/10 shadow-2xl mb-24 relative overflow-hidden">
          <div className="absolute bottom-[-10%] right-[-10%] w-[300px] h-[300px] bg-brand-red/20 rounded-full blur-[100px]" />
          
          <div className="space-y-12 relative z-10">
            <div className="space-y-3">
              <h2 className="text-3xl font-black flex items-center gap-3">
                <Users className="w-8 h-8 text-brand-red" />
                مجموعات الورشة
              </h2>
              <p className="text-brand-beige/70 font-bold">الورشة مقسمة لتناسب كل الفئات في الدراسة والمتابعة</p>
              <div className="h-1 w-20 bg-brand-red rounded-full" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {groups.map((group, index) => (
                <div 
                  key={group.name} 
                  className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col justify-between hover:bg-white/10 transition-colors"
                >
                  <div className="space-y-4">
                    <span className="inline-block text-[10px] font-black text-brand-red bg-brand-red/10 px-3 py-1 rounded-full border border-brand-red/20">
                      {group.badge}
                    </span>
                    <h3 className="text-lg font-black text-white">{group.name}</h3>
                    <p className="text-white/70 font-semibold text-sm leading-relaxed">
                      {group.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Call to action & Socials */}
        <div className="flex flex-col items-center text-center space-y-10">
          <div className="space-y-3">
            <h2 className="text-3xl font-black text-brand-text flex items-center gap-2 justify-center">
              <Heart className="w-8 h-8 text-brand-red fill-brand-red" />
              خليك دايماً على تواصل
            </h2>
            <p className="text-brand-beige font-bold text-lg">تابع أخبارنا وحكاياتنا وحل الاختبارات أول بأول</p>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            {socialLinks.map((social) => (
              <a
                key={social.name}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-6 py-3.5 bg-white border border-brand-beige/10 hover:border-transparent rounded-2xl shadow-sm hover:shadow-xl transition-all group font-black text-brand-text hover:text-brand-red text-sm"
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white transition-transform group-hover:scale-110 group-hover:rotate-6 ${social.color}`}>
                  <social.icon className="w-4 h-4" />
                </div>
                <span>{social.name}</span>
              </a>
            ))}
          </div>

          <button
            onClick={() => navigate("/")}
            className="mt-8 px-10 py-5 bg-brand-red text-white hover:bg-brand-red/90 rounded-3xl font-black shadow-lg shadow-brand-red/20 active:scale-95 transition-all text-base cursor-pointer"
          >
            سجل دخول وابدأ رحلتك الآن
          </button>
        </div>
      </div>
    </div>
  );
}
