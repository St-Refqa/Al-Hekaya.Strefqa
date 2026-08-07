import React from 'react';
import { 
  Plus,
  Trophy,
  Users, 
  BookOpen, 
  Home, 
  TrendingUp, 
  ShoppingBag, 
  LogOut, 
  X,
  ChevronRight,
  Shield,
  History,
  Settings,
  Globe,
  Calendar,
  RefreshCw,
  Gamepad2,
  Flame
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import { SmartImage } from './ui/SmartImage';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminSidebar({ isOpen, onClose }: SidebarProps) {
  const { logout, user } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const isRTL = true;

  const userRole = (user?.role as string || '').toLowerCase();
  const isAdmin = userRole === 'admin';
  const isExamCreator = user?.isExamCreator === true || userRole === 'creator';
  const isAttendanceScanner = user?.isAttendanceScanner === true || userRole === 'attendance';
  const isStoreManager = user?.isStoreManager === true || userRole === 'store';
  const headerPath = isAdmin ? '/admin' : isExamCreator ? '/admin/create' : isStoreManager ? '/admin/store' : isAttendanceScanner ? '/admin/attendance' : '/admin';

  const menuItems = [];

  if (isAdmin) {
    menuItems.push(
      { icon: Home, label: t('sidebar.dashboard'), path: '/admin' },
      { icon: Calendar, label: "الحضور والغياب", path: '/admin/attendance' },
      { icon: Users, label: t('sidebar.users') || 'إدارة الطلاب', path: '/admin/users' },
      { icon: BookOpen, label: t('sidebar.assessments') || 'إدارة الاختبارات', path: '/admin/assessments' },
      { icon: Plus, label: "إنشاء اختبار", path: '/admin/create' },
      { icon: BookOpen, label: "بنك الأسئلة", path: '/admin/question-bank' },
      { icon: History, label: t('sidebar.submissions') || "نتائج الإجابات", path: '/admin/results' },
      { icon: ShoppingBag, label: t('sidebar.store_manager') || "متجر الهدايا والطلبات", path: '/admin/store' },
      { icon: Trophy, label: t('sidebar.leaderboard') || 'لوحة المتصدرين', path: '/admin/leaderboard' },
      { icon: Star, label: 'بوسترات الأوائل', path: '/admin/posters' },
      { icon: Gamepad2, label: 'تقارير الألعاب 📊', path: '/admin/games' },
      { icon: Trophy, label: 'مسابقة إنجيل مارمرقس', path: '/admin/jeopardy' },
      { icon: Gamepad2, label: 'ألعاب الكتاب المقدس 🎮', path: '/student/games' },
      { icon: Flame, label: 'لوحة الـ Streak 🔥', path: '/student/streak' },
      { icon: BookOpen, label: 'المكتبة الكنسية', path: '/admin/library' },
      { icon: Calendar, label: 'مواعيد الاجتماعات', path: '/admin/meetings' },
      { icon: TrendingUp, label: t('sidebar.platform_analytics') || "تحليل المنصة", path: '/admin/analytics' },
      { icon: Settings, label: t('sidebar.settings') || "الإعدادات العامة", path: '/admin/settings' }
    );
  } else {
    const isMeetingScheduler = user?.isMeetingScheduler === true || user?.isMeetingManager === true || userRole === 'scheduler';
    const isLibraryManager = user?.isLibraryManager === true || userRole === 'library';
    const isStoreManager = user?.isStoreManager === true || userRole === 'store';
    const hasAnyPermission = isExamCreator || isAttendanceScanner || isStoreManager || isLibraryManager || isMeetingScheduler || userRole === 'servant';

    if (isExamCreator) {
      menuItems.push(
        { icon: BookOpen, label: t('sidebar.assessments') || 'إدارة الاختبارات', path: '/admin/assessments' },
        { icon: Plus, label: "إضافة اختبار جديد", path: '/admin/create' },
        { icon: BookOpen, label: "بنك الأسئلة", path: '/admin/question-bank' },
      );
    }
    if (isAttendanceScanner) {
      menuItems.push(
        { icon: Calendar, label: "الحضور والغياب", path: '/admin/attendance' },
      );
    }
    if (isStoreManager) {
      menuItems.push(
        { icon: ShoppingBag, label: t('sidebar.store_manager') || "متجر الهدايا والطلبات", path: '/admin/store' },
      );
    }
    if (isLibraryManager || isExamCreator || isAttendanceScanner || isStoreManager || userRole === 'servant') {
      menuItems.push(
        { icon: Trophy, label: t('sidebar.leaderboard') || 'لوحة المتصدرين', path: '/admin/leaderboard' },
        { icon: BookOpen, label: 'المكتبة الكنسية', path: '/admin/library' },
        { icon: Gamepad2, label: 'تقارير الألعاب 📊', path: '/admin/games' },
        { icon: Trophy, label: 'مسابقة إنجيل مارمرقس', path: '/admin/jeopardy' },
        { icon: Gamepad2, label: 'ألعاب الكتاب المقدس 🎮', path: '/student/games' },
        { icon: Flame, label: 'لوحة الـ Streak 🔥', path: '/student/streak' },
      );
    }
    if (isMeetingScheduler || isExamCreator || isAttendanceScanner || isStoreManager) {
      menuItems.push(
        { icon: Calendar, label: 'مواعيد الاجتماعات', path: '/admin/meetings' },
      );
    }
  }

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Content */}
      <aside 
        className={cn(
          "fixed top-0 bottom-0 w-[280px] sm:w-80 bg-brand-text border-white/5 z-[101] shadow-2xl transition-all duration-500 lg:sticky lg:h-screen lg:top-0 lg:z-40",
          isRTL 
            ? "border-l lg:right-0" 
            : "border-r lg:left-0",
          isOpen 
            ? "opacity-100 " + (isRTL ? "right-0" : "left-0")
            : "max-lg:opacity-0 max-lg:invisible max-lg:pointer-events-none " + (isRTL ? "max-lg:-right-80" : "max-lg:-left-80")
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header Area */}
          <div className="p-8 pb-4">
            <div className="flex items-center justify-between mb-8">
              <Link to={headerPath} className="flex items-center gap-3 hover:opacity-85 transition-opacity">
                <div className="w-12 h-12 bg-brand-red rounded-2xl flex items-center justify-center shadow-lg shadow-brand-red/20">
                  <Shield className="text-white w-6 h-6" />
                </div>
                <div className={cn("flex flex-col", isRTL ? "text-right" : "text-left")}>
                  <h3 className="text-xl font-black text-white tracking-tight uppercase">
                    {isAdmin ? (t('sidebar.admin_panel') || 'لوحة الإدارة') : isExamCreator ? "بوابة الخادم" : "بوابة الرصد"}
                  </h3>
                  <span className="text-[10px] font-black text-brand-red tracking-[0.2em] uppercase leading-none opacity-80">
                    {isAdmin ? (t('sidebar.central_control') || 'التحكم المركزي') : isExamCreator ? "إعداد المناهج" : "رصد حضور الطلاب"}
                  </span>
                </div>
              </Link>
              <button 
                onClick={onClose} 
                className="lg:hidden p-2.5 bg-white/5 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
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
                (item.path === '/admin/create' && location.pathname.startsWith('/admin/edit/')) ||
                (item.path === '/admin/users' && location.pathname.startsWith('/admin/students/'));
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
                      "flex items-center justify-between px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl sm:rounded-[24px] transition-all duration-500 group relative overflow-hidden",
                      isActive 
                        ? "text-white bg-brand-red shadow-2xl shadow-brand-red/30" 
                        : "text-white/40 hover:text-white hover:bg-white/5"
                    )}
                  >
                    {/* Technical Glow Backlight for Active Items */}
                    {isActive && (
                      <div className="absolute inset-x-0 bottom-0 top-0 bg-gradient-to-r from-white/10 to-transparent pointer-events-none" />
                    )}

                    <div className="flex items-center gap-3 relative z-10">
                      <div className={cn(
                        "w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all duration-500 shrink-0",
                        isActive ? "bg-white/20 scale-110 rotate-3 shadow-lg" : "bg-white/5 group-hover:bg-white/10"
                      )}>
                        <item.icon className={cn("w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform duration-500", isActive ? "scale-100" : "group-hover:scale-110 group-hover:rotate-6")} />
                      </div>
                      <div className={cn("flex flex-col", isRTL ? "text-right" : "text-left")}>
                        <span className={cn(
                          "text-[13px] font-black tracking-tight uppercase leading-tight transition-colors duration-300",
                          isActive ? "text-white" : "text-white/40 group-hover:text-white"
                        )}>
                          {item.label}
                        </span>
                        {isActive && (
                          <motion.span 
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 0.6, scale: 1 }}
                            className="text-[8px] font-black tracking-[0.2em] mt-0.5 text-white/60"
                          >
                            SYSTEM ACTIVE
                          </motion.span>
                        )}
                      </div>
                    </div>
                    
                    {isActive && (
                      <motion.div
                        layoutId="admin-sidebar-accent"
                        className={cn(
                          "absolute top-0 bottom-0 w-1 bg-white",
                          isRTL ? "left-0" : "right-0"
                        )}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}

                    {isActive && (
                      <ChevronRight className={cn("w-4 h-4 relative z-10 text-white/40", isRTL ? "rotate-180" : "rotate-0")} />
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </motion.nav>

          {/* Bottom Actions */}
          <div className="p-6 mt-auto space-y-3 bg-black/20 border-t border-white/5">
            <div className="flex flex-col items-center gap-2 w-full">
              <button
                onClick={() => navigate('/student')}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-white/5 border border-brand-red/30 text-white hover:bg-brand-red/20 transition-all font-black text-[11px] uppercase tracking-wider cursor-pointer"
              >
                <Users className="w-3.5 h-3.5 text-brand-red" />
                <span>العودة لصفحة الطلاب</span>
              </button>
              
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-white/5 border border-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all font-black text-[11px] uppercase tracking-wider cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-white/50" />
                <span>{t('sidebar.logout') || "تسجيل الخروج"}</span>
              </button>
            </div>

            <div className="flex justify-between items-center px-4 pt-1.5">
               <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.3em] font-mono">v2.1.0</span>
               <div className="flex items-center gap-1.5 select-none">
                  <span className="text-[9px] font-black text-emerald-500">التحديث تلقائي </span>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
               </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
