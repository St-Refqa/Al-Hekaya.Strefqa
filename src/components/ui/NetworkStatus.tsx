import { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowStatus(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // If offline on mount, show status
    if (!navigator.onLine) {
       // Using requestAnimationFrame to defer the state update and avoid the lint error
       requestAnimationFrame(() => setShowStatus(true));
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {showStatus && (
        <motion.div
           initial={{ y: -100, opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           exit={{ y: -100, opacity: 0 }}
           className="fixed top-6 left-1/2 -translate-x-1/2 z-[10000] pointer-events-none"
        >
          <div className={`px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md border ${
            isOnline 
              ? 'bg-emerald-500/90 text-white border-emerald-400/30' 
              : 'bg-amber-600/90 text-white border-amber-400/30'
          }`}>
            {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            <span className="font-black text-xs uppercase tracking-widest">
              {isOnline ? 'عاد الاتصال بالإنترنت' : 'أنت الآن في وضع عدم الاتصال'}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
