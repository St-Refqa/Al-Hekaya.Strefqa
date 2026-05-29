import React from 'react';
import { 
  Home, 
  Scroll, 
  Trophy, 
  Medal, 
  Ticket, 
  TrendingUp,
  LogOut,
  X,
  ChevronRight,
  User,
  Globe,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import { SmartImage } from './ui/SmartImage';
import { useTranslation } from 'react-i18next';
import { calculateLevel } from '../lib/gamification';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProfile?: () => void;
}

export function StudentSidebar({ isOpen, onClose, onOpenProfile }: SidebarProps) {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const isRTL = i18n.language === 'ar';

  const menuItems = [
    { icon: Home, label: t('sidebar.dashboard'), path: '/student' },
    { icon: Scroll, label: t('sidebar.assessments'), path: '/student/assessments' },
    { icon: Calendar, label: 'جدول المناهج والاجتماعات', path: '/student/meetings' },
    { icon: Ticket, label: t('sidebar.store'), path: '/student/store' },
    { icon: Trophy, label: t('sidebar.leaderboard'), path: '/student/leaderboard' },
    { icon: Medal, label: t('sidebar.achievements'), path: '/student/achievements' },
    { icon: TrendingUp, label: t('sidebar.analytics'), path: '/student/analytics' },
  ];

  if (user?.isExamCreator === true) {
    menuItems.push({ icon: Globe, label: 'بوابة إعداد الاختبارات', path: '/admin/create' });
  }

  if (user?.isAttendanceScanner === true) {
    menuItems.push({ icon: Globe, label: 'تسجيل الحضور والغياب', path: '/admin/attendance' });
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const sidebarColor = user?.sidebarColor || '#9E0000';

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-brand-text/60 backdrop-blur-md z-[100] lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Content */}
      <aside 
        className={cn(
          "fixed top-0 bottom-0 w-80 bg-white z-[101] shadow-2xl transition-all duration-500 lg:sticky lg:translate-x-0 lg:z-40",
          isRTL ? "right-0 border-l border-brand-beige/10" : "left-0 border-r border-brand-beige/10",
          isOpen 
            ? "translate-x-0" 
            : isRTL ? "max-lg:translate-x-full" : "max-lg:-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header Area */}
          <div className="p-8 pb-4">
            <div className="flex items-center justify-between mb-8">
              <Link to="/student" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="w-12 h-12 bg-brand-cream rounded-2xl flex items-center justify-center shadow-inner">
                  <SmartImage src="/assets/logo-red.png" className="w-7 h-7 object-contain" alt="" fallback={<User className="text-brand-red w-6 h-6" />} />
                </div>
                <div className={cn("flex flex-col", isRTL ? "text-right" : "text-left")}>
                  <h3 className="text-xl font-black text-brand-text tracking-tight uppercase">{t('sidebar.story_title')}</h3>
                  <span className="text-[10px] font-black text-brand-red tracking-[0.2em] uppercase leading-none">{t('sidebar.student_portal')}</span>
                </div>
              </Link>
              <button 
                onClick={onClose} 
                className="lg:hidden p-2.5 bg-brand-cream/50 text-brand-beige hover:text-brand-red hover:bg-brand-red/5 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Section */}
            {user && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 bg-brand-cream/40 rounded-[32px] border border-brand-beige/10 relative overflow-hidden group mb-6"
              >
                <div 
                  className={cn("absolute top-0 bottom-0 w-1 transition-colors", isRTL ? "right-0" : "left-0")} 
                  style={{ backgroundColor: sidebarColor }} 
                />
                <div className="flex items-center gap-4">
                  <button 
                    onClick={onOpenProfile}
                    className="w-14 h-14 rounded-2xl bg-white p-1 shadow-sm border border-brand-beige/10 overflow-hidden shrink-0 group-hover:scale-105 transition-transform cursor-pointer"
                  >
                    {user.photoUrl ? (
                      <img src={user.photoUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-brand-red/5">
                        <span className="font-black text-xl text-brand-red">{user.fullName.charAt(0)}</span>
                      </div>
                    )}
                  </button>
                  <div className={cn("flex-1 min-w-0", isRTL ? "text-right" : "text-left")}>
                    <h4 className="font-black text-brand-text text-sm truncate leading-tight mb-0.5">{user.fullName.split(' ')[0]}</h4>
                    <div className="flex flex-col space-y-0.5">
                      <p className={cn(
                        "text-[9px] font-black uppercase tracking-widest",
                        user.code?.toUpperCase().startsWith('S') ? "text-brand-red" : "text-brand-beige"
                      )}>
                        {user.code?.toUpperCase().startsWith('S') ? "خادم" : "طالب"}
                      </p>
                      <p className="text-[10px] font-bold text-brand-beige/70 font-mono">#{user.code}</p>
                    </div>
                    {/* XP Progress Bar */}
                    <div className="mt-2 w-full h-1.5 bg-brand-cream rounded-full overflow-hidden shadow-inner">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${calculateLevel(user.xp || 0).progress}%` }}
                         className="h-full bg-gradient-to-r from-brand-red to-rose-400 rounded-full"
                         transition={{ duration: 1, ease: "easeOut" }}
                       />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Navigation */}
          <motion.nav 
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.05
                }
              }
            }}
            initial="hidden"
            animate="show"
            className="flex-1 px-4 py-2 space-y-2 overflow-y-auto custom-scrollbar"
          >
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path ||
                (item.path === '/student/assessments' && location.pathname.startsWith('/student/review/'));
              return (
                <motion.div
                  key={item.path}
                  variants={{
                    hidden: { opacity: 0, x: isRTL ? 20 : -20 },
                    show: { opacity: 1, x: 0 }
                  }}
                  whileHover={{ scale: 1.02, x: isRTL ? -6 : 6 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  onMouseEnter={() => {
                    import('../lib/audio').then(m => m.playHoverSound()).catch(console.error);
                  }}
                  onClick={() => {
                    import('../lib/audio').then(m => m.playClickSound()).catch(console.error);
                  }}
                >
                  <Link
                    to={item.path}
                    onClick={() => {
                      if (window.innerWidth < 1024) onClose();
                    }}
                    className={cn(
                      "flex items-center justify-between px-5 py-4 rounded-[24px] transition-all duration-500 group relative overflow-hidden",
                      isActive 
                        ? "text-white" 
                        : "text-brand-beige hover:text-brand-text hover:bg-brand-cream/50"
                    )}
                    style={{ 
                      backgroundColor: isActive ? sidebarColor : undefined,
                      boxShadow: isActive ? `0 20px 40px -12px ${sidebarColor}40, inset 0 0 20px rgba(255,255,255,0.1)` : undefined
                    }}
                  >
                    {/* Decorative Active Background Accent */}
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-accent"
                        className={cn(
                          "absolute top-0 bottom-0 w-1.5 bg-white/40",
                          isRTL ? "right-0" : "left-0"
                        )}
                        initial={{ height: 0 }}
                        animate={{ height: "100%" }}
                        transition={{ duration: 0.4 }}
                      />
                    )}

                    <div className="flex items-center gap-3 relative z-10">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 shrink-0",
                        isActive ? "bg-white/20 scale-110 shadow-[0_0_15px_rgba(255,255,255,0.2)]" : "bg-transparent group-hover:bg-brand-red/10"
                      )}>
                        <item.icon className={cn("w-5 h-5 transition-transform duration-500", isActive ? "rotate-0" : "group-hover:scale-110 group-hover:rotate-6")} />
                      </div>
                      <div className={cn("flex flex-col", isRTL ? "text-right" : "text-left")}>
                        <span className={cn(
                          "text-[13px] font-black tracking-tight leading-tight transition-colors duration-300",
                          isActive ? "text-white" : "text-brand-beige group-hover:text-brand-text"
                        )}>
                          {item.label}
                        </span>
                        {isActive && (
                          <motion.span 
                            initial={{ opacity: 0, x: isRTL ? 10 : -10 }}
                            animate={{ opacity: 0.6, x: 0 }}
                            className="text-[8px] font-black uppercase tracking-[0.2em] mt-0.5"
                          >
                            {t('sidebar.active_now')}
                          </motion.span>
                        )}
                      </div>
                    </div>
                    
                    {isActive && (
                      <div className="relative z-10 flex items-center gap-2">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="w-1.5 h-1.5 rounded-full bg-white"
                        />
                        <ChevronRight className={cn("w-4 h-4 text-white/50", isRTL ? "rotate-180" : "rotate-0")} />
                      </div>
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </motion.nav>

          {/* Bottom Actions */}
          <div className="p-6 mt-auto space-y-3 bg-brand-cream/20 border-t border-brand-beige/5">
            <div className="flex items-center gap-2 w-full">
              <button
                onClick={handleLogout}
                className="flex-1 flex items-center justify-center gap-2.5 p-3 rounded-2xl bg-white border border-brand-beige/10 text-brand-beige hover:text-rose-600 hover:bg-rose-50 transition-all font-black text-[11px] uppercase tracking-wider group cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-brand-red shrink-0" />
                <span>{t('sidebar.logout') || "تسجيل الخروج"}</span>
              </button>
            </div>

            <div className="text-center pt-1.5 flex flex-col items-center gap-2">
              <div className="flex items-center justify-center gap-2 select-none">
                <span className="text-[9px] font-black text-emerald-600">التحديث تلقائي </span>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="flex items-center justify-center gap-1.5 opacity-20">
                <div className="h-[1px] w-3 bg-brand-beige" />
                <p className="text-[8px] font-black text-brand-beige uppercase tracking-[0.3em] font-mono">v2.1.0</p>
                <div className="h-[1px] w-3 bg-brand-beige" />
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
