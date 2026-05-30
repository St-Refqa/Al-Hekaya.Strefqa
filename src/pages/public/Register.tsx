import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  UserPlus, 
  User, 
  Lock, 
  ChevronLeft, 
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Hash,
  Phone,
  Church,
  Calendar,
  MapPin,
  Camera,
  X
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { compressImage, cn } from "../../lib/utils";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";

import { useTranslation } from "react-i18next";

export default function Register() {
  const navigate = useNavigate();
  const { register, isAuthenticated, isStudent } = useAuth();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dir = 'rtl';
  
  const [fullName, setFullName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [church, setChurch] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [address, setAddress] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<"OT" | "NT" | "K" | "">("");

  const generateNextCode = async (group: "OT" | "NT" | "K") => {
    setSelectedGroup(group);
    let prefix = "";
    if (group === "OT") prefix = "H";
    else if (group === "NT") prefix = "N";
    else if (group === "K") prefix = "S";

    try {
      const q = query(
        collection(db, "users"),
        where("role", "==", "student"),
        orderBy("code", "desc")
      );
      const snapshot = await getDocs(q);
      const existingCodes = snapshot.docs
        .map(doc => doc.data().code as string)
        .filter(code => code && code.startsWith(prefix))
        .map(code => {
           const numPart = code.substring(1);
           return parseInt(numPart);
        })
        .filter(num => !isNaN(num));

      const nextNum = existingCodes.length > 0 ? Math.max(...existingCodes) + 1 : 1;
      const formattedCode = `${prefix}${nextNum.toString().padStart(3, '0')}`;
      setCode(formattedCode);
    } catch (err) {
      console.error("Error generating code:", err);
      const fallback = `${prefix}${Math.floor(Math.random() * 899 + 100)}`;
      setCode(fallback);
    }
  };
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      if (isStudent) navigate("/student");
      else navigate("/");
    }
  }, [isAuthenticated, isStudent, navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string);
        setPhotoUrl(compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!fullName || !code || !password || !confirmPassword || !whatsappNumber || !church || !birthDate || !address) {
      setError("من فضلك املأ جميع الخانات");
      import("../../lib/audio").then(m => m.playErrorSound());
      return;
    }

    if (password.length < 6) {
      setError("كلمة المرور يجب أن تكون ٦ أحرف على الأقل");
      import("../../lib/audio").then(m => m.playErrorSound());
      return;
    }

    if (password !== confirmPassword) {
      setError("كلمات المرور غير متطابقة");
      import("../../lib/audio").then(m => m.playErrorSound());
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const cleanCode = code.trim().toUpperCase();
      const result = await register(
        fullName, 
        cleanCode, 
        password, 
        whatsappNumber,
        church,
        birthDate,
        photoUrl,
        address
      );
      if (!result.success) {
        setError(result.error || "حدث خطأ أثناء التسجيل");
        import("../../lib/audio").then(m => m.playErrorSound());
        setIsLoading(false);
      } else {
        // Show success state
        import("../../lib/confetti").then(m => m.triggerSuccessConfetti());
        setSuccess(true);
        setTimeout(() => {
          navigate("/student");
        }, 2000);
      }
    } catch (err) {
      setError("حدث خطأ غير متوقع");
      import("../../lib/audio").then(m => m.playErrorSound());
      setIsLoading(false);
    }
  };

  const [isSuccess, setSuccess] = useState(false);

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-brand-cream flex items-center justify-center p-6 relative overflow-hidden" dir={dir}>
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-[48px] p-12 shadow-2xl border border-brand-beige/10 text-center space-y-6 max-w-md w-full"
        >
          <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-12 h-12 text-emerald-500" />
          </div>
          <h2 className="text-3xl font-black text-brand-text">تم إنشاء الحساب بنجاح</h2>
          <p className="text-brand-beige font-bold">جاري تحويلك للصفحة الرئيسية الخاصة بك...</p>
          <div className="flex justify-center">
             <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream flex items-center justify-center p-6 relative overflow-hidden" dir={dir}>
      {/* Decorative Background */}
      <div className="absolute inset-0 bg-textured opacity-30 pointer-events-none" />
      <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] bg-brand-red/5 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-brand-beige/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl w-full relative z-10"
      >
        {/* Back Link */}
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-brand-beige hover:text-brand-red font-bold transition-colors mb-8 group"
        >
          <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          <span>الرجوع للرئيسية</span>
        </Link>

        <div className="bg-white rounded-[48px] p-8 lg:p-12 shadow-2xl shadow-brand-red/5 border border-brand-beige/10 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "url('/coptic_pattern.png')", backgroundSize: '150px' }} />
          
          <div className="relative z-10">
            <div className="flex flex-col items-center mb-10">
              <div className="w-16 h-16 bg-brand-cream rounded-[24px] flex items-center justify-center mb-6 shadow-sm">
                <UserPlus className="w-8 h-8 text-brand-red" />
              </div>
              <h1 className="text-3xl font-black text-brand-text tracking-tight">إنشاء حساب جديد</h1>
              <p className="text-brand-beige font-bold mt-2">انضم لمنصة الحكاية ومافيها دلوقتي</p>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Photo Upload Section */}
              <div className="md:col-span-2 flex flex-col items-center mb-4">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="relative group cursor-pointer"
                >
                  <div className="w-24 h-24 rounded-full bg-brand-cream border-2 border-dashed border-brand-red/30 flex items-center justify-center overflow-hidden transition-all group-hover:border-brand-red">
                    {photoUrl ? (
                      <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-8 h-8 text-brand-red/40" />
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-brand-red text-white rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  {photoUrl && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setPhotoUrl(""); }}
                      className="absolute -top-1 -right-1 w-6 h-6 bg-white text-red-500 rounded-full flex items-center justify-center border border-red-100 shadow-sm hover:bg-red-50 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
                <p className="text-[10px] font-black text-brand-beige uppercase tracking-widest mt-2">ارفاق صورة شخصية</p>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-brand-beige uppercase tracking-[0.2em] mr-1">الاسم بالكامل</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 right-0 pr-5 flex items-center pointer-events-none text-brand-beige group-focus-within:text-brand-red transition-colors">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={fullName || ''}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-brand-cream border-2 border-transparent focus:border-brand-red/20 focus:bg-white rounded-[24px] py-4 pr-14 pl-6 outline-none transition-all font-bold text-brand-text"
                    placeholder="كيرلس صموئيل"
                    required
                  />
                </div>
              </div>

              <div className="md:col-span-1 space-y-2">
                <label className="text-[10px] font-black text-brand-beige uppercase tracking-[0.2em] mr-1">الكنيسة</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 right-0 pr-5 flex items-center pointer-events-none text-brand-beige group-focus-within:text-brand-red transition-colors">
                    <Church className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={church || ''}
                    onChange={(e) => setChurch(e.target.value)}
                    className="w-full bg-brand-cream border-2 border-transparent focus:border-brand-red/20 focus:bg-white rounded-[24px] py-4 pr-14 pl-6 outline-none transition-all font-bold text-brand-text"
                    placeholder="اسم الكنيسة"
                    required
                  />
                </div>
              </div>

              <div className="md:col-span-1 space-y-2">
                <label className="text-[10px] font-black text-brand-beige uppercase tracking-[0.2em] mr-1">تاريخ الميلاد</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 right-0 pr-5 flex items-center pointer-events-none text-brand-beige group-focus-within:text-brand-red transition-colors">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <input
                    type="date"
                    value={birthDate || ''}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full bg-brand-cream border-2 border-transparent focus:border-brand-red/20 focus:bg-white rounded-[24px] py-4 pr-14 pl-6 outline-none transition-all font-bold text-brand-text"
                    required
                  />
                </div>
              </div>

              <div className="md:col-span-1 space-y-2">
                <label className="text-[10px] font-black text-brand-beige uppercase tracking-[0.2em] mr-1">رقم الواتساب</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 right-0 pr-5 flex items-center pointer-events-none text-brand-beige group-focus-within:text-brand-red transition-colors">
                    <Phone className="w-5 h-5" />
                  </div>
                  <input
                    type="tel"
                    value={whatsappNumber || ''}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    className="w-full bg-brand-cream border-2 border-transparent focus:border-brand-red/20 focus:bg-white rounded-[24px] py-4 pr-14 pl-6 outline-none transition-all font-bold text-brand-text"
                    placeholder="010xxxxxxx"
                    required
                  />
                </div>
              </div>

              <div className="md:col-span-2 space-y-4">
                <label className="text-[10px] font-black text-brand-beige uppercase tracking-[0.2em] mr-1 block text-right">اختيار الفئة (لتوليد كود الطالب)</label>
                <div className="grid grid-cols-3 gap-4">
                  <button 
                    type="button"
                    onClick={() => generateNextCode("OT")}
                    className={cn(
                      "py-4 rounded-2xl font-black text-[10px] transition-all border-2",
                      selectedGroup === "OT" ? "bg-brand-red text-white border-brand-red shadow-lg shadow-brand-red/20" : "bg-brand-cream text-brand-beige border-transparent hover:border-brand-red/20"
                    )}
                  >
                    عهد قديم (H)
                  </button>
                  <button 
                    type="button"
                    onClick={() => generateNextCode("NT")}
                    className={cn(
                      "py-4 rounded-2xl font-black text-[10px] transition-all border-2",
                      selectedGroup === "NT" ? "bg-brand-red text-white border-brand-red shadow-lg shadow-brand-red/20" : "bg-brand-cream text-brand-beige border-transparent hover:border-brand-red/20"
                    )}
                  >
                    عهد جديد (N)
                  </button>
                  <button 
                    type="button"
                    onClick={() => generateNextCode("K")}
                    className={cn(
                      "py-4 rounded-2xl font-black text-[10px] transition-all border-2",
                      selectedGroup === "K" ? "bg-brand-red text-white border-brand-red shadow-lg shadow-brand-red/20" : "bg-brand-cream text-brand-beige border-transparent hover:border-brand-red/20"
                    )}
                  >
                    خادم (S)
                  </button>
                </div>
              </div>

              <div className="md:col-span-1 space-y-2">
                <label className="text-[10px] font-black text-brand-beige uppercase tracking-[0.2em] mr-1">كود الطالب (تلقائي)</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 right-0 pr-5 flex items-center pointer-events-none text-brand-beige">
                    <Hash className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={code || ''}
                    readOnly
                    className="w-full bg-brand-cream/50 border-2 border-transparent rounded-[24px] py-4 pr-14 pl-6 outline-none transition-all font-black text-brand-text uppercase cursor-not-allowed"
                    placeholder="اختر العهد"
                    required
                  />
                  {code && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-brand-red/10 text-brand-red px-2 py-1 rounded-lg text-[8px] font-black uppercase">
                       جاهز
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-brand-beige uppercase tracking-[0.2em] mr-1">العنوان</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 right-0 pr-5 flex items-center pointer-events-none text-brand-beige group-focus-within:text-brand-red transition-colors">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={address || ''}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-brand-cream border-2 border-transparent focus:border-brand-red/20 focus:bg-white rounded-[24px] py-4 pr-14 pl-6 outline-none transition-all font-bold text-brand-text"
                    placeholder="العنوان بالتفصيل"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-brand-beige uppercase tracking-[0.2em] mr-1">كلمة المرور</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 right-0 pr-5 flex items-center pointer-events-none text-brand-beige group-focus-within:text-brand-red transition-colors">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type="password"
                    value={password || ''}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-brand-cream border-2 border-transparent focus:border-brand-red/20 focus:bg-white rounded-[24px] py-4 pr-14 pl-6 outline-none transition-all font-bold text-brand-text"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-brand-beige uppercase tracking-[0.2em] mr-1">تأكيد كلمة المرور</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 right-0 pr-5 flex items-center pointer-events-none text-brand-beige group-focus-within:text-brand-red transition-colors">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <input
                    type="password"
                    value={confirmPassword || ''}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-brand-cream border-2 border-transparent focus:border-brand-red/20 focus:bg-white rounded-[24px] py-4 pr-14 pl-6 outline-none transition-all font-bold text-brand-text"
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
                    className="md:col-span-2 flex items-center gap-3 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100"
                  >
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p className="text-sm font-bold">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={isLoading}
                className="md:col-span-2 py-5 bg-brand-red text-white text-xl font-black rounded-[28px] shadow-2xl shadow-brand-red/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3 group mt-4"
              >
                {isLoading ? (
                   <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>إنشاء الحساب</span>
                    <ChevronLeft className="w-6 h-6 group-hover:translate-x-[-4px] transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-8 border-t border-brand-cream flex flex-col items-center gap-4">
              <p className="text-brand-beige font-bold">عندك حساب فعلاً؟</p>
              <Link 
                to="/login" 
                className="text-brand-red font-black hover:underline transition-all underline-offset-8"
              >
                سجل دخول من هنا
              </Link>
            </div>
          </div>
        </div>

        <p className="text-center mt-8 text-brand-beige/60 font-bold text-[10px] lg:text-xs uppercase tracking-[0.2em]">
          كنيسة القديسة رفقة وأولادها الخمسة &copy; ٢٠٢٤ الحكاية ومافيها
        </p>
      </motion.div>
    </div>
  );
}
