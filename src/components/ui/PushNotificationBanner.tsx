import React, { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { motion, AnimatePresence } from 'motion/react';

export function PushNotificationBanner() {
  const { isSubscribed, permission, requestPermission } = usePushNotifications();
  const [isVisible, setIsVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Show banner if permission is not granted and not explicitly dismissed
    if (permission === 'default' && !dismissed) {
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [permission, dismissed]);

  // Try to automatically request on first user interaction if they haven't decided yet
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (permission === 'default') {
        requestPermission();
      }
      document.removeEventListener('click', handleFirstInteraction);
    };
    
    if (permission === 'default') {
      document.addEventListener('click', handleFirstInteraction, { once: true });
    }
    
    return () => {
      document.removeEventListener('click', handleFirstInteraction);
    };
  }, [permission, requestPermission]);

  if (!isVisible || isSubscribed || permission !== 'default') return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className="fixed top-0 left-0 right-0 z-[100] px-4 py-3 bg-brand-red text-white shadow-lg flex items-center justify-between gap-4"
        dir="rtl"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
            <Bell className="w-4 h-4" />
          </div>
          <p className="text-xs md:text-sm font-bold leading-tight">
            عشان يوصلك كل جديد ومواعيد الاختبارات فوراً، فعل الإشعارات دلوقتي!
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              requestPermission();
              setIsVisible(false);
            }}
            className="whitespace-nowrap px-4 py-1.5 bg-white text-brand-red text-xs font-black rounded-full shadow-sm hover:scale-105 transition-transform"
          >
            تفعيل الآن
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
