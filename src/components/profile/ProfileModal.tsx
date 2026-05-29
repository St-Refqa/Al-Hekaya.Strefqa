import React, { useState, useRef, useEffect } from "react";
import { X, Edit, Camera, Plus, MapPin, Church, Smartphone, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../../hooks/useAuth";
import { compressImage } from "../../lib/utils";
import { useTranslation } from "react-i18next";

export function ProfileModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user, updateProfile } = useAuth();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editChurch, setEditChurch] = useState("");
  const [editWhatsApp, setEditWhatsApp] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editPhotoUrl, setEditPhotoUrl] = useState("");
  const [showLatestResult, setShowLatestResult] = useState(true);
  const [showLocationInSidebar, setShowLocationInSidebar] = useState(true);
  const [notifAssessments, setNotifAssessments] = useState(true);
  const [notifAchievements, setNotifAchievements] = useState(true);
  const [notifAnnouncements, setNotifAnnouncements] = useState(true);
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const displayDate = (() => {
    try {
      return new Date(user?.registrationDate || "2024-01-01").toLocaleDateString('ar');
    } catch {
      return "";
    }
  })();

  useEffect(() => {
    if (isOpen && user) {
      const timer = setTimeout(() => {
        setEditChurch(user.church || "");
        setEditWhatsApp(user.whatsappNumber || "");
        setEditBirthDate(user.birthDate || "");
        setEditAddress(user.address || "");
        setEditPhotoUrl(user.photoUrl || "");
        setShowLatestResult(user.sidebarSettings?.showLatestResult !== false);
        setShowLocationInSidebar(user.sidebarSettings?.showLocation !== false);
        setNotifAssessments(user.notificationPrefs?.assessments !== false);
        setNotifAchievements(user.notificationPrefs?.achievements !== false);
        setNotifAnnouncements(user.notificationPrefs?.announcements !== false);
        setError("");
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, user]);

  if (!user) return null;

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
        sidebarColor: user.sidebarColor,
        sidebarSettings: {
          showLatestResult,
          showLocation: showLocationInSidebar,
        },
        notificationPrefs: {
          assessments: notifAssessments,
          achievements: notifAchievements,
          announcements: notifAnnouncements,
        },
      });

      if (result.success) {
        onClose();
      } else {
        setError(result.error || "حدث خطأ أثناء التحديث");
      }
    } catch {
      setError("حدث خطأ غير متوقع");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6" dir="rtl">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-brand-text/40 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-[40px] p-6 md:p-10 max-w-2xl w-full shadow-2xl relative z-10 overflow-hidden"
          >
            <button
              onClick={onClose}
              className="absolute top-6 left-6 p-2 hover:bg-brand-cream rounded-xl text-brand-beige transition-colors z-20"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center mb-8 relative z-10">
              <h2 className="text-2xl font-black text-brand-text mb-1">
                الملف الشخصي
              </h2>
              <p className="text-brand-beige text-xs font-bold uppercase tracking-widest">
                عرض وتعديل بياناتك الشخصية
              </p>
            </div>

            <form
              onSubmit={handleSaveProfile}
              className="space-y-8 max-h-[60vh] overflow-y-auto px-2 custom-scrollbar font-sans"
            >
              <div className="flex flex-col md:flex-row gap-8 items-start">
                
                {/* Photo Edit */}
                <div className="flex flex-col items-center shrink-0">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="relative group cursor-pointer"
                  >
                    <div className="w-28 h-28 rounded-[32px] bg-brand-cream border-2 border-dashed border-brand-red/30 flex items-center justify-center overflow-hidden transition-all group-hover:border-brand-red">
                      {editPhotoUrl ? (
                        <img
                          src={editPhotoUrl}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Camera className="w-8 h-8 text-brand-red/40" />
                      )}
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-brand-red text-white rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                      <Edit className="w-4 h-4" />
                    </div>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <div className="text-center mt-3">
                     <h3 className="font-black text-brand-text text-sm mb-1">{user.fullName}</h3>
                     <p className="text-[10px] font-black text-brand-beige uppercase tracking-widest bg-brand-cream px-3 py-1 rounded-full mb-2">
                       كود: {user.code}
                     </p>
                     <p className="text-[10px] font-bold text-brand-beige/80 uppercase tracking-widest mt-2 block">
                       تاريخ الانضمام: {displayDate}
                     </p>
                  </div>
                </div>

                {/* Main Fields */}
                <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-beige uppercase tracking-widest flex items-center gap-1.5 focus-within:text-brand-red font-sans">
                      <Church className="w-3.5 h-3.5" />
                      الكنيسة
                    </label>
                    <input
                      type="text"
                      className="w-full bg-brand-cream/50 rounded-2xl px-4 py-3 font-bold text-brand-text border-2 border-transparent focus:border-brand-red/20 focus:bg-white transition-all outline-none text-sm placeholder:text-brand-beige/50"
                      value={editChurch}
                      onChange={(e) => setEditChurch(e.target.value)}
                      placeholder="الكنيسة أو المنطقة"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-beige uppercase tracking-widest flex items-center gap-1.5 focus-within:text-brand-red">
                      <Smartphone className="w-3.5 h-3.5" />
                      رقم الهاتف / واتس آب
                    </label>
                    <input
                      type="tel"
                      className="w-full bg-brand-cream/50 rounded-2xl px-4 py-3 font-bold text-brand-text border-2 border-transparent focus:border-brand-red/20 focus:bg-white transition-all outline-none text-sm"
                      value={editWhatsApp}
                      onChange={(e) => setEditWhatsApp(e.target.value)}
                      placeholder="رقم الهاتف"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-beige uppercase tracking-widest flex items-center gap-1.5 focus-within:text-brand-red">
                      <Calendar className="w-3.5 h-3.5" />
                      تاريخ الميلاد
                    </label>
                    <input
                      type="date"
                      className="w-full bg-brand-cream/50 rounded-2xl px-4 py-3 font-bold text-brand-text border-2 border-transparent focus:border-brand-red/20 focus:bg-white transition-all outline-none text-sm"
                      value={editBirthDate}
                      onChange={(e) => setEditBirthDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-beige uppercase tracking-widest flex items-center gap-1.5 focus-within:text-brand-red">
                      <MapPin className="w-3.5 h-3.5" />
                      العنوان
                    </label>
                    <input
                      type="text"
                      className="w-full bg-brand-cream/50 rounded-2xl px-4 py-3 font-bold text-brand-text border-2 border-transparent focus:border-brand-red/20 focus:bg-white transition-all outline-none text-sm"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      placeholder="المنطقة أو المحافظة"
                    />
                  </div>

                </div>
              </div>

              {error && (
                <div className="p-4 bg-brand-red/10 text-brand-red rounded-xl text-sm font-bold border border-brand-red/20">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-4 bg-brand-red text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-brand-red/20 hover:bg-brand-red/90 transition-all flex items-center justify-center gap-2 group text-sm"
              >
                {isSaving ? "جاري الحفظ..." : "حفظ التغييرات"}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
