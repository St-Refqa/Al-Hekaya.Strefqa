import { useState, useEffect, useRef } from "react";
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc, where } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { Bell, X, Info, CheckCircle2, AlertTriangle, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "../../lib/utils";
import { useAuth } from "../../hooks/useAuth";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "purchase" | string;
  category?: string;
  createdAt: any;
  isRead: boolean;
  targetId?: string;
  readBy?: string[];
}

const getNotifStyles = (type: string) => {
  switch (type) {
    case "success":
      return {
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
        bg: "bg-emerald-50",
        border: "border-emerald-100",
        dot: "bg-emerald-500"
      };
    case "warning":
      return {
        icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
        bg: "bg-amber-50",
        border: "border-amber-100",
        dot: "bg-amber-500"
      };
    default:
      return {
        icon: <Info className="w-4 h-4 text-blue-500" />,
        bg: "bg-blue-50",
        border: "border-blue-100",
        dot: "bg-blue-500"
      };
  }
};

export default function NotificationBell({ userId, userRole, notificationPrefs }: { userId?: string, userRole?: string, notificationPrefs?: Record<string, boolean> }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth(); // Add useAuth to get user details for code check
  const isInitialLoad = useRef(true);
  const seenNotifications = useRef<Set<string>>(new Set());
  const prevUserId = useRef<string | null>(null);

  useEffect(() => {
    if (userId !== prevUserId.current) {
      isInitialLoad.current = true;
      seenNotifications.current.clear();
      prevUserId.current = userId || null;
    }
    // Determine which notifications to show
    const q = query(
      collection(db, "notifications"),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AppNotification)).filter(n => {
        // Preference check
        if (notificationPrefs && n.category && notificationPrefs[n.category] === false) {
          return false;
        }

        const targetRole = (n as any).targetRole;
        const targetId = (n as any).targetId;
        const targetGroups = (n as any).targetGroups as string[] || [];
        
        // If it's targeted to a specific user, only show to them
        if (targetId) {
            if (targetId !== userId) return false;
            return true; // if targetId matches, it's definitely for this user
        }

        // Target group logic
        if (targetGroups.length > 0) {
            const upperCode = user?.code?.toUpperCase() || "";
            const isServantUser = userRole === 'servant' || upperCode.startsWith('S');
            const matchesAny = targetGroups.some(group => {
                if (group === 'admin' && userRole === 'admin') return true;
                if (group === 'servant' && isServantUser) return true;
                if (group === 'OT' && userRole === 'student' && upperCode.startsWith('H')) return true;
                if (group === 'NT' && userRole === 'student' && upperCode.startsWith('N')) return true;
                if (group === 'all') return true;
                if (userRole === 'admin') return true; // Admins should see broadcasts targeted to any group
                return false;
            });
            if (!matchesAny) return false;
        }

        // Check if there are no specific targets (Public)
        if (!targetRole && !targetId && targetGroups.length === 0) return true;

        if (targetRole) {
          if (targetRole === 'admin') {
            if (userRole === 'admin') return true;
            if (n.type === 'purchase' && user?.isStoreManager) return true;
            return false;
          }
          if (targetRole !== userRole) return false;
        }

        return true; // Passed all restrictions
      });
      
      setNotifications(data);
      
      // Count unread - if userId is provided, check if it's in readBy
      const unread = data.filter(n => {
        if (!userId) return !n.isRead;
        return !(n.readBy || []).includes(userId);
      });
      setUnreadCount(unread.length);

      // Trigger native browser/mobile notification for new arrivals (not in initial load)
      if (isInitialLoad.current) {
        snapshot.docs.forEach(doc => seenNotifications.current.add(doc.id));
        isInitialLoad.current = false;
      } else {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === "added") {
            const notifId = change.doc.id;
            if (!seenNotifications.current.has(notifId)) {
              seenNotifications.current.add(notifId);
              const matchesFiltered = data.find(n => n.id === notifId);
              if (matchesFiltered) {
                if (Capacitor.isNativePlatform()) {
                  try {
                  await LocalNotifications.schedule({
                    notifications: [
                      {
                        title: matchesFiltered.title,
                        body: matchesFiltered.message,
                        id: Math.floor(Math.random() * 1000000),
                        schedule: { at: new Date(Date.now() + 50) }
                      }
                    ]
                  });
                } catch (e) {
                  console.error("Failed to trigger Capacitor local notification:", e);
                }
              } else if (Notification.permission === "granted") {
                try {
                  new Notification(matchesFiltered.title, {
                    body: matchesFiltered.message,
                    icon: "/assets/logo-red.png",
                    badge: "/assets/logo-red.png",
                    dir: "rtl"
                  });
                } catch (e) {
                  console.error("Failed to trigger native browser notification:", e);
                }
              }
            }
          }
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "notifications");
    });

    return () => unsubscribe();
  }, [userId, userRole, notificationPrefs, user]);

  const markAsRead = async (notifId: string) => {
    if (!userId) return;
    try {
      const notifRef = doc(db, "notifications", notifId);
      const notif = notifications.find(n => n.id === notifId);
      if (notif) {
        const readBy = [...(notif.readBy || []), userId];
        await updateDoc(notifRef, {
          readBy: Array.from(new Set(readBy))
        });
      }
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    try {
      const unread = notifications.filter(n => !(n.readBy || []).includes(userId));
      await Promise.all(unread.map(n => markAsRead(n.id)));
      setIsOpen(false);
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  const deleteNotification = async (notifId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) return;
    try {
      const notifRef = doc(db, "notifications", notifId);
      const notif = notifications.find(n => n.id === notifId);
      if (notif) {
        // We don't actually delete for everyone, we just hide for this user
        // Or if it's targeted directly to them, we might delete it
        const hiddenFrom = [...((notif as any).hiddenFrom || []), userId];
        await updateDoc(notifRef, {
          hiddenFrom: Array.from(new Set(hiddenFrom))
        });
      }
    } catch (err) {
      console.error("Error hiding notification:", err);
    }
  };

  const visibleNotifications = notifications.filter(n => 
    !((n as any).hiddenFrom || []).includes(userId)
  );

  return (
    <div className="relative z-[200]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-3 bg-white rounded-2xl shadow-sm hover:scale-110 transition-transform group"
        aria-label="Notifications"
      >
        <Bell className={cn("w-6 h-6 text-brand-beige group-hover:text-brand-red transition-colors", unreadCount > 0 && "animate-tada")} />
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 w-5 h-5 bg-brand-red text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-brand-text/10 backdrop-blur-sm z-[200]"
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="fixed left-4 right-4 top-20 sm:absolute sm:left-0 sm:right-auto sm:top-full sm:mt-4 w-auto sm:w-[400px] bg-white rounded-3xl shadow-2xl border border-brand-beige/10 overflow-hidden z-[210] origin-top font-sans"
              dir="rtl"
            >
              <div className="p-6 border-b border-brand-cream/50 flex items-center justify-between bg-brand-cream/10">
                <div className="flex items-center gap-3 text-right">
                   <div className="w-10 h-10 bg-brand-red/10 rounded-xl flex items-center justify-center">
                     <Bell className="w-5 h-5 text-brand-red" />
                   </div>
                   <div>
                     <h3 className="font-black text-brand-text">الإشعارات</h3>
                     <p className="text-xs text-brand-beige mt-1">آخر التحديثات</p>
                   </div>
                </div>
                <button 
                  onClick={markAllAsRead}
                  className="text-xs font-black text-brand-red hover:underline"
                >
                  تحديد الكل كمقروء
                </button>
              </div>

              <div className="max-h-[32rem] overflow-y-auto custom-scrollbar">
                {visibleNotifications.length === 0 ? (
                  <div className="p-12 text-center flex flex-col items-center gap-4">
                     <div className="w-16 h-16 bg-brand-cream/30 rounded-full flex items-center justify-center">
                        <Info className="w-8 h-8 text-brand-beige" />
                     </div>
                     <p className="text-brand-beige font-bold text-sm">لا توجد إشعارات حالياً</p>
                  </div>
                ) : (
                  <div className="divide-y divide-brand-cream/30">
                    {visibleNotifications.map((notif) => {
                      const isRead = userId ? (notif.readBy || []).includes(userId) : notif.isRead;
                      const styles = getNotifStyles(notif.type);
                      return (
                        <div 
                          key={notif.id}
                          className={cn(
                            "p-5 hover:bg-brand-cream/20 transition-all cursor-pointer group relative",
                            !isRead && "bg-brand-red/[0.01]"
                          )}
                          onClick={() => markAsRead(notif.id)}
                        >
                          <div className="flex gap-4">
                            <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center border border-brand-red/10 bg-brand-cream overflow-hidden">
                              <img 
                                src={notif.logoType === 'church' ? "/assets/logo-red.png" : "/assets/logo-beige.png"} 
                                alt="Logo" 
                                className="w-full h-full object-contain p-1" 
                                onError={(e) => {
                                  (e.target as any).style.display = 'none';
                                  (e.target as any).nextSibling.style.display = 'block';
                                }}
                              />
                              <div style={{ display: 'none' }} className={cn(
                                "w-full h-full flex items-center justify-center",
                                styles.bg
                              )}>
                                {styles.icon}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0 pr-4">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="font-black text-brand-text text-sm truncate">{notif.title}</h4>
                                <div className="flex items-center gap-2">
                                  {notif.createdAt && (
                                    <span className="text-[10px] sm:text-xs font-bold text-brand-beige whitespace-nowrap">
                                      {(() => {
                                        try {
                                          const date = typeof notif.createdAt.toDate === 'function' 
                                            ? notif.createdAt.toDate() 
                                            : new Date(notif.createdAt);
                                          return format(date, "d MMM", { locale: ar });
                                        } catch (e) {
                                          return "";
                                        }
                                      })()}
                                    </span>
                                  )}
                                  <button 
                                    onClick={(e) => deleteNotification(notif.id, e)}
                                    className="p-1 text-brand-beige hover:text-brand-red opacity-60 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              <p className="text-xs sm:text-sm text-brand-text/80 leading-relaxed font-medium pr-1 mt-1">{notif.message}</p>
                            </div>
                          </div>
                          {!isRead && (
                             <div className={cn("absolute top-6 right-2 w-1.5 h-1.5 rounded-full", styles.dot)} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
