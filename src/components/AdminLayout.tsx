import React, { useState } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { Menu, Shield, Bell } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import NotificationBell from './ui/NotificationBell';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user } = useAuth();
  const { i18n } = useTranslation();

  const userRole = (user?.role as string || '').toLowerCase();
  const isAdmin = userRole === 'admin';
  const isExamCreator = user?.isExamCreator === true || userRole === 'creator';
  const isAttendanceScanner = user?.isAttendanceScanner === true || userRole === 'attendance';
  const isStoreManager = user?.isStoreManager === true || userRole === 'store';
  const isLibraryManager = user?.isLibraryManager === true || userRole === 'library';
  const isMeetingScheduler = user?.isMeetingScheduler === true || user?.isMeetingManager === true || userRole === 'scheduler';
  const isServant = isExamCreator || isAttendanceScanner || isStoreManager || isLibraryManager || isMeetingScheduler || userRole === 'servant';

  if (!user || (!isAdmin && !isServant)) return <>{children}</>;

  return (
    <div className="min-h-screen bg-brand-cream flex" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Sidebar - Desktop Sticky, Mobile Fixed */}
      <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Nav Top Bar */}
        <header className="lg:hidden sticky top-0 bg-brand-text text-white border-b border-white/5 px-6 py-4 flex items-center justify-between z-50">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -mr-2 text-white/60 hover:text-white transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-4">
            <NotificationBell userId={user.uid} userRole={user.role} />
            <div className={cn(i18n.language === 'ar' ? 'text-right' : 'text-left')}>
              <h1 className="text-sm font-black truncate max-w-[200px]">
                {isAdmin ? "بوابة الإدارة العامة" : 
                 isExamCreator ? "بوابة الخادم لإنشاء الاختبارات" : 
                 isStoreManager ? "بوابة إدارة المتجر" :
                 isLibraryManager ? "بوابة إدارة المكتبة" :
                 isMeetingScheduler ? "بوابة إدارة المواعيد" :
                 "بوابة الخدمة"}
              </h1>
            </div>
            <div className="w-10 h-10 rounded-xl bg-brand-red flex items-center justify-center shadow-lg transform rotate-6 animate-pulse-slow">
               <Shield className="w-5 h-5 text-white" />
            </div>
          </div>
        </header>

        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
