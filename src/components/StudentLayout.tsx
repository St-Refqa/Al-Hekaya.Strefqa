import React, { useState } from 'react';
import { StudentSidebar } from './StudentSidebar';
import { Menu, User, Bell } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import NotificationBell from './ui/NotificationBell';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import { ProfileModal } from './profile/ProfileModal';

export function StudentLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const { user } = useAuth();
  const { i18n } = useTranslation();

  if (!user) return <>{children}</>;

  return (
    <div className="min-h-screen bg-brand-cream flex" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
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

        <main className="flex-1">
          {children}
        </main>
      </div>

      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />
    </div>
  );
}
