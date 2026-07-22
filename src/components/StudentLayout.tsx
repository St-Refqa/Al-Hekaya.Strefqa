import React, { useState } from 'react';
import { StudentSidebar } from './StudentSidebar';
import { Menu, User, Bell, Home, Scroll, BookOpen, Trophy } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import NotificationBell from './ui/NotificationBell';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import { ProfileModal } from './profile/ProfileModal';
import { PermissionPrompt } from './ui/PermissionPrompt';

export function StudentLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    const handler = () => setIsProfileModalOpen(true);
    window.addEventListener('open-profile', handler);
    return () => window.removeEventListener('open-profile', handler);
  }, []);

  const mobileNavItems = [
    { icon: Home, label: 'الرئيسية', path: '/student' },
    { icon: Scroll, label: 'الامتحانات', path: '/student/assessments' },
    { icon: BookOpen, label: 'المكتبة', path: '/student/library' },
    { icon: Trophy, label: 'الصدارة', path: '/student/leaderboard' },
  ];

  if (!user) return <>{children}</>;

  return (
    <div className="min-h-screen bg-brand-cream flex overflow-x-hidden max-w-full relative" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      <PermissionPrompt />
      {/* Sidebar - Desktop Sticky, Mobile Fixed */}
      <StudentSidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        onOpenProfile={() => setIsProfileModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Nav Top Bar */}
        <header className="lg:hidden sticky top-0 bg-white/80 backdrop-blur-md border-b border-brand-beige/10 px-6 py-4 flex items-center justify-between z-50">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -mr-2 text-brand-beige hover:text-brand-text transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-3">
            <NotificationBell userId={user.uid} userRole={user.role} notificationPrefs={user.notificationPrefs} />
            <div className={cn(i18n.language === 'ar' ? 'text-right' : 'text-left')}>
              <h1 className="text-sm font-black text-brand-text truncate max-w-[150px]">{user.fullName.split(' ')[0]}</h1>
              <p className={cn(
                "text-[8px] font-bold uppercase tracking-widest leading-none mt-0.5",
                user.code?.toUpperCase().startsWith('S') ? "text-brand-red" : "text-brand-beige"
              )}>
                {user.code?.toUpperCase().startsWith('S') ? "خادم" : "طالب"}
              </p>
            </div>
            <button 
              onClick={() => setIsProfileModalOpen(true)}
              className="w-10 h-10 rounded-xl bg-brand-cream flex items-center justify-center border border-white shadow-sm overflow-hidden hover:opacity-80 transition-opacity"
            >
               {user.photoUrl ? (
                 <img src={user.photoUrl} alt="" className="w-full h-full object-cover" />
               ) : (
                 <User className="w-5 h-5 text-brand-red" />
               )}
            </button>
          </div>
        </header>

        <main className="flex-1 pb-24 lg:pb-0">
          {children}
        </main>

        {/* Bottom Navigation for Mobile */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-brand-beige/10 z-[60] px-2 pb-4 pt-2 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-center h-14">
            {mobileNavItems.map(item => {
              const isActive = location.pathname === item.path || (item.path === '/student/assessments' && location.pathname.startsWith('/student/review/'));
              return (
                <Link 
                  key={item.path} 
                  to={item.path} 
                  className={cn(
                    "flex flex-col items-center justify-center w-full h-full gap-1 transition-all",
                    isActive ? "text-brand-red" : "text-brand-beige hover:text-brand-text"
                  )}
                  onClick={() => {
                     import('../lib/audio').then(m => m.playClickSound()).catch(console.error);
                  }}
                >
                  <div className={cn(
                    "relative p-1.5 rounded-xl transition-all duration-300",
                    isActive ? "bg-brand-red/10 scale-110" : "bg-transparent"
                  )}>
                    <item.icon className={cn("w-5 h-5", isActive ? "fill-brand-red/10" : "")} />
                  </div>
                  <span className={cn(
                    "text-[9px] font-black tracking-wider",
                    isActive ? "text-brand-red" : ""
                  )}>{item.label}</span>
                </Link>
              );
            })}
            
            <button 
              onClick={() => {
                import('../lib/audio').then(m => m.playClickSound()).catch(console.error);
                setIsSidebarOpen(true);
              }}
              className="flex flex-col items-center justify-center w-full h-full gap-1 text-brand-beige hover:text-brand-text transition-all"
            >
              <div className="relative p-1.5 rounded-xl transition-all duration-300 bg-transparent">
                <Menu className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-black tracking-wider">المزيد</span>
            </button>
          </div>
        </nav>
      </div>

      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />
    </div>
  );
}
