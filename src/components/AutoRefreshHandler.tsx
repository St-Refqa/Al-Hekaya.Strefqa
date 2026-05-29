import { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { RefreshCw, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function AutoRefreshHandler() {
  const location = useLocation();
  const [lastSyncTime, setLastSyncTime] = useState<number>(() => Date.now());
  const [isSyncing, setIsSyncing] = useState(false);
  const [showNotification, setShowNotification] = useState(false);

  // Critical Safety Guard: Never auto-refresh during an active assessment or exam taker page
  const isProtectedPath =
    location.pathname.includes("/assessment/") ||
    location.pathname.includes("/student/review/") ||
    location.pathname.includes("/post-exam") ||
    location.pathname.includes("/exam");

  useEffect(() => {
    // Disabled automatic page reload on focus/interval to prevent data loss.
    // The user requested to stop the browser from automatically refreshing.
  }, [location.pathname, lastSyncTime, isProtectedPath]);

  // Handle manual force sync trigger (available globally if needed)
  const triggerManualSync = useCallback(() => {
    if (isProtectedPath) {
      alert("عذراً، لا يمكن تحديث الصفحة أثناء تأدية الاختبار لحماية إجاباتك!");
      return;
    }
    setIsSyncing(true);
    setShowNotification(true);
    setLastSyncTime(Date.now());

    import("../lib/audio")
      .then((m) => m.playSuccessSound())
      .catch(() => {});

    setTimeout(() => {
      window.location.reload();
    }, 1200);
  }, [isProtectedPath]);

  // Expose manual trigger to window Object so it can be called cleanly from Sidebar widgets!
  useEffect(() => {
    (window as any).__triggerGlobalDataSync = triggerManualSync;
    return () => {
      delete (window as any).__triggerGlobalDataSync;
    };
  }, [triggerManualSync]);

  if (isProtectedPath) return null;

  return (
    <AnimatePresence>
      {showNotification && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 50 }}
          className="fixed bottom-6 left-6 z-[99999] flex items-center gap-3 bg-brand-text text-white px-5 py-3.5 rounded-[24px] shadow-2xl border border-white/10 select-none pointer-events-none"
          dir="rtl"
        >
          <div className="relative">
            {isSyncing ? (
              <RefreshCw className="w-5 h-5 text-brand-red animate-spin" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                <CheckCircle className="w-3.5 h-3.5 text-white" />
              </div>
            )}
          </div>
          <div className="flex flex-col text-right">
            <span className="text-xs font-black">
              {isSyncing ? "جاري مزامنة وتحديث البيانات..." : "تم تحديث البيانات بنجاح!"}
            </span>
            <span className="text-[9px] font-bold text-white/50 tracking-wide mt-0.5">
              مزامنة الاتصال نشطة 🛡️
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
