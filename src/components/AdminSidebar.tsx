import React from 'react';
import { 
  Plus,
  Trophy,
  Users, 
  BookOpen, 
  LayoutDashboard, 
  TrendingUp, 
  ShoppingBag, 
  LogOut, 
  X,
  ChevronRight,
  Shield,
  History,
  Settings,
  Globe,
  Cloud,
  Calendar
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import { SmartImage } from './ui/SmartImage';
import { useTranslation } from 'react-i18next';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminSidebar({ isOpen, onClose }: SidebarProps) {
  const { logout, user } = useAuth();
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const isRTL = i18n.language === 'ar';

  const isExamCreator = user?.isExamCreator === true;
  const isAttendanceScanner = user?.isAttendanceScanner === true;
  const isAdmin = user?.role === 'admin';

  const menuItems = [];

  if (isAdmin) {
    menuItems.push(
      { icon: LayoutDashboard, label: t('sidebar.dashboard'), path: '/admin' },
      { icon: BookOpen, label: t('sidebar.assessments') || 'الاختبارات', path: '/admin/assessments' },
      { icon: Plus, label: "إنشاء اختبار", path: '/admin/create' },
      { icon: Users, label: t('sidebar.users'), path: '/admin/users' },
      { icon: Calendar, label: "الحضور والغياب", path: '/admin/attendance' },
    );
  } else {
    if (isExamCreator) {
      menuItems.push(
        { icon: Plus, label: "إضافة اختبار جديد", path: '/admin/create' },
        { icon: Globe, label: t('sidebar.student_portal') || 'بوابة الطلاب للرجوع ↩️', path: '/student' },
      );
    } else if (isAttendanceScanner) {
      menuItems.push(
        { icon: Calendar, label: "الحضور والغياب", path: '/admin/attendance' },
        { icon: Globe, label: t('sidebar.student_portal') || 'بوابة الطلاب للرجوع ↩️', path: '/student' },
      );
    }
  }

  if (isAdmin) {
    menuItems.push(
      { icon: History, label: t('sidebar.submissions'), path: '/admin/results' },
      { icon: Trophy, label: t('sidebar.leaderboard') || 'لوحة المتصدرين', path: '/admin/leaderboard' },
      { icon: TrendingUp, label: t('sidebar.platform_analytics'), path: '/admin/analytics' },
      { icon: ShoppingBag, label: t('sidebar.store_manager'), path: '/admin/store' },
      { icon: Cloud, label: 'بوابة Google', path: '/admin/workspace' },
      { icon: Settings, label: t('sidebar.settings'), path: '/admin/settings' },
    );
  }

  const handleLogout = () => {
    logout();
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
          "fixed top-0 bottom-0 w-80 bg-brand-text border-white/5 z-[101] shadow-2xl transition-all duration-500 lg:sticky lg:translate-x-0 lg:z-40",
          isRTL ? "right-0 border-l" : "left-0 border-r",
          isOpen 
            ? "translate-x-0" 
            : isRTL ? "translate-x-full" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header Area */}
          <div className="p-8 pb-4">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
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
              </div>
              <button 
                onClick={onClose} 
                className="lg:hidden p-2.5 bg-white/5 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-2 space-y-2 overflow-y-auto custom-scrollbar">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => {
                    if (window.innerWidth < 1024) onClose();
                  }}
                  className={cn(
                    "flex items-center justify-between px-5 py-4 rounded-[24px] transition-all duration-500 group relative overflow-hidden",
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
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 shrink-0",
                      isActive ? "bg-white/20 scale-110 rotate-3 shadow-lg" : "bg-white/5 group-hover:bg-white/10"
                    )}>
                      <item.icon className={cn("w-5 h-5 transition-transform duration-500", isActive ? "scale-100" : "group-hover:scale-110 group-hover:rotate-6")} />
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
              );
            })}
          </nav>

          {/* Bottom Actions */}
          <div className="p-6 mt-auto space-y-3 bg-black/20 border-t border-white/5">
            <div className="flex items-center gap-2 w-full">
              <button
                onClick={handleLogout}
                className="flex-1 flex items-center justify-center gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/5 text-white/60 hover:text-white hover:bg-brand-red/20 transition-all font-black text-[12px] uppercase tracking-wider"
              >
                <LogOut className="w-4 h-4 text-brand-red" />
                <span>{t('sidebar.logout') || "تسجيل الخروج"}</span>
              </button>
            </div>

            <div className="flex justify-between items-center px-4 pt-2 opacity-20">
               <span className="text-[8px] font-black text-white uppercase tracking-[0.3em] font-mono">v2.1.0</span>
               <div className="flex gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
               </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
