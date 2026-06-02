import React, { useState, useEffect } from "react";
import { Bell, Camera, ShieldAlert, CheckCircle2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

export function PermissionPrompt() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"prompt" | "success">("prompt");

  useEffect(() => {
    // Check if we should prompt the user
    const hasPrompted = localStorage.getItem("has_prompted_permissions");
    const notificationsSupported = "Notification" in window;
    
    // If not prompted yet, and at least notifications aren't already granted
    if (!hasPrompted && notificationsSupported && Notification.permission !== "granted") {
      // Delay showing the modal slightly for premium UX flow
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleRequestPermissions = async () => {
    // 1. Request Notifications Permission
    let notifGranted = false;
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await LocalNotifications.requestPermissions();
        if (result.display === "granted") {
          notifGranted = true;
        }
      } catch (err) {
        console.error("Capacitor local notifications permission failed:", err);
      }
    } else if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        notifGranted = true;
      }
    }

    // 2. Request Camera Permission (graceful direct access trigger)
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        // Stop the tracks immediately to release the camera light
        stream.getTracks().forEach(track => track.stop());
      }
    } catch (err) {
      console.warn("Camera permission request declined or dismissed:", err);
    }

    // Mark as prompted
    localStorage.setItem("has_prompted_permissions", "true");

    // Play premium native success notification if granted
    if (notifGranted) {
      try {
        if (Capacitor.isNativePlatform()) {
          await LocalNotifications.schedule({
            notifications: [
              {
                title: "تم تفعيل التنبيهات بنجاح! 🎉",
                body: "ستصلك إشعارات فورية بالاختبارات والاجتماعات الجديدة لتظل متميزاً.",
                id: 10001,
                schedule: { at: new Date(Date.now() + 50) }
              }
            ]
          });
        } else {
          new Notification("تم تفعيل التنبيهات بنجاح! 🎉", {
            body: "ستصلك إشعارات فورية بالاختبارات والاجتماعات الجديدة لتظل متميزاً.",
            icon: "/assets/logo-red.png",
            badge: "/assets/logo-red.png",
            dir: "rtl"
          });
        }
      } catch (e) {
        console.error("Test notification failed:", e);
      }
      
      setStep("success");
      setTimeout(() => {
        setIsOpen(false);
      }, 2500);
    } else {
      setIsOpen(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem("has_prompted_permissions", "true");
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 md:p-6 font-sans select-none" dir="rtl">
          {/* Backdrop Blur overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#1C0606]/40 backdrop-blur-xl pointer-events-auto"
            onClick={handleSkip}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-full max-w-lg bg-white rounded-[40px] border border-brand-beige/25 shadow-2xl p-6 md:p-8 relative overflow-hidden text-center z-10"
          >
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-red/5 rounded-full blur-3xl -translate-y-12 translate-x-12 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand-cream/50 rounded-full blur-3xl translate-y-12 -translate-x-12 pointer-events-none" />

            {step === "prompt" ? (
              <div className="space-y-6">
                {/* Header Icon Set */}
                <div className="flex items-center justify-center gap-4 mb-2">
                  <div className="w-16 h-16 rounded-[24px] bg-brand-red/10 text-brand-red flex items-center justify-center shadow-inner relative animate-bounce-slow">
                    <Bell className="w-8 h-8" />
                    <Sparkles className="absolute -top-1 -left-1 w-4 h-4 text-amber-500 animate-pulse" />
                  </div>
                  <div className="w-16 h-16 rounded-[24px] bg-brand-cream text-brand-text flex items-center justify-center shadow-inner relative animate-bounce-slow delay-100">
                    <Camera className="w-8 h-8 text-brand-red" />
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <h3 className="text-2xl md:text-3xl font-black text-brand-text tracking-tight">
                    تفعيل التنبيهات المباشرة 🔔
                  </h3>
                  <p className="text-sm font-semibold text-brand-beige leading-relaxed max-w-sm mx-auto">
                    احصل على إشعارات فورية على هاتفك لتظل على علم بالاختبارات والاجتماعات فور نزولها!
                  </p>
                </div>

                {/* Permission Cards */}
                <div className="grid grid-cols-1 gap-3 text-right">
                  <div className="p-4 bg-brand-cream/20 border border-brand-beige/10 rounded-2xl flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-red text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Bell className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-brand-text text-sm leading-tight">إشعارات فورية على الموبايل</h4>
                      <p className="text-xs font-semibold text-brand-beige mt-1">تنبيهات فورية بالمسابقات والنتائج لتظل متفاعلاً.</p>
                    </div>
                  </div>

                  <div className="p-4 bg-brand-cream/20 border border-brand-beige/10 rounded-2xl flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-red text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-brand-text text-sm leading-tight">صلاحية الكاميرا لرصد الحضور</h4>
                      <p className="text-xs font-semibold text-brand-beige mt-1">لتسجيل الحضور الذاتي والمسح الفوري للباركود والـ QR بنقرة واحدة.</p>
                    </div>
                  </div>
                </div>

                {/* Footnote */}
                <div className="flex items-center justify-center gap-2 text-[10px] text-amber-600 font-extrabold px-4 py-2 bg-amber-50 rounded-xl border border-amber-100/50">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>تُطلب هذه الصلاحيات لمرة واحدة فقط وتُحفظ بأمان تام في متصفحك.</span>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={handleRequestPermissions}
                    className="flex-1 py-4 bg-brand-red hover:bg-[#850000] text-white font-black text-sm rounded-2xl transition-all shadow-lg shadow-brand-red/20 active:scale-95 flex items-center justify-center gap-2"
                  >
                    <span>سماح وتفعيل الآن</span>
                  </button>
                  <button
                    onClick={handleSkip}
                    className="flex-1 py-4 bg-brand-cream hover:bg-brand-cream/80 text-brand-beige font-black text-sm rounded-2xl transition-all border border-brand-beige/10"
                  >
                    ربما لاحقاً
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 space-y-6 flex flex-col items-center">
                {/* Success Animation */}
                <motion.div
                  initial={{ scale: 0.5, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center shadow-lg"
                >
                  <CheckCircle2 className="w-12 h-12" />
                </motion.div>

                {/* Title */}
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-brand-text">
                    تم التفعيل بنجاح! 🎉
                  </h3>
                  <p className="text-sm font-semibold text-brand-beige leading-relaxed max-w-xs">
                    مستعدون لإرسال التنبيهات المباشرة لهاتفك بأمان وسرعة!
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
