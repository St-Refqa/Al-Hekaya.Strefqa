import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminGames from './pages/admin/AdminGames';
import AssessmentCreator from './pages/admin/AssessmentCreator';
import ResultsDashboard from './pages/admin/ResultsDashboard';
import AdminLeaderboard from './pages/admin/Leaderboard';
import StudentLeaderboard from './pages/student/Leaderboard';
import UserManager from './pages/admin/UserManager';
import LoginLogs from './pages/admin/LoginLogs';
import StudentDetail from './pages/admin/StudentDetail';
import PublicAssessment from './pages/public/PublicAssessment';
import Home from './pages/public/Home';
import About from './pages/public/About';
import UnifiedLogin from './pages/public/UnifiedLogin';
import Register from './pages/public/Register';
import PublicMap from './pages/public/PublicMap';
import ResourcesHub from './pages/public/ResourcesHub';
import StudentDashboard from './pages/student/StudentDashboard';
import AvailableAssessments from './pages/student/AvailableAssessments';
import StudentAchievements from './pages/student/Achievements';
import StudentAnalytics from './pages/student/StudentAnalytics';
import PostExamReview from './pages/student/PostExamReview';
import Store from './pages/student/Store';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import StoreManager from './pages/admin/StoreManager';
import AdminSettings from './pages/admin/AdminSettings';
import AdminAttendance from './pages/admin/AdminAttendance';
import QuestionBank from './pages/admin/QuestionBank';
import Announcements from './pages/admin/Announcements';
import PreparationMeetings from './pages/admin/PreparationMeetings';
import Library from './pages/Library';
import { useAuth } from './hooks/useAuth';
import NetworkStatus from './components/ui/NetworkStatus';
import { AntiCheatGuard } from './components/AntiCheatGuard';
import { AutoRefreshHandler } from './components/AutoRefreshHandler';
import { StudentLayout } from './components/StudentLayout';
import { AdminLayout } from './components/AdminLayout';
import { useTranslation } from 'react-i18next';
import { useSoundEffects } from './hooks/useSoundEffects';
import { usePushNotifications } from './hooks/usePushNotifications';
import { PushNotificationBanner } from './components/ui/PushNotificationBanner';
import Settings from './pages/admin/Settings';
import AssessmentDetails from './pages/admin/AssessmentDetails';
import PreparationMeetingsAdmin from './pages/admin/PreparationMeetings';
import Posters from './pages/admin/Posters';
import GamesHub from './pages/student/Games';
import GamePlay from './pages/student/games/GamePlay';
import DailyChallenge from './pages/student/games/DailyChallenge';
import GamesLeaderboard from './pages/student/games/GamesLeaderboard';
import StreakLeaderboard from './pages/student/StreakLeaderboard';
import MultiplayerCreate from './pages/student/games/MultiplayerCreate';
import MultiplayerJoin from './pages/student/games/MultiplayerJoin';
import MultiplayerLobby from './pages/student/games/MultiplayerLobby';
import MultiplayerPlay from './pages/student/games/MultiplayerPlay';
import Jeopardy from './pages/admin/Jeopardy';
import Mark4Jeopardy from './pages/admin/Mark4Jeopardy';

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: 'admin' | 'student' | 'creator' | 'attendance' | 'servant' | 'store' }) {
  const { isAuthenticated, isLoading, isAdmin, isStudent, user } = useAuth();
  const { t } = useTranslation();

  if (isLoading) return <div className="flex items-center justify-center min-h-screen font-black text-brand-beige">{t('common.loading')}</div>;
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  const userRole = (user?.role || '').toLowerCase();
  const isExamCreator = user?.isExamCreator === true || userRole === 'creator';
  const isAttendanceScanner = user?.isAttendanceScanner === true || userRole === 'attendance';
  const isStoreManager = user?.isStoreManager === true || userRole === 'store';
  const isLibraryManager = user?.isLibraryManager === true || userRole === 'library';
  const isMeetingScheduler = user?.isMeetingScheduler === true || user?.isMeetingManager === true || userRole === 'scheduler';
  const isServant = isExamCreator || isAttendanceScanner || isStoreManager || isLibraryManager || isMeetingScheduler || userRole === 'servant';

  if (role === 'admin' && !isAdmin) return <Navigate to="/" />;
  if (role === 'student' && !isStudent && !isAdmin && !isServant) return <Navigate to="/" />;
  if (role === 'creator' && !isAdmin && !isExamCreator) return <Navigate to="/" />;
  if (role === 'attendance' && !isAdmin && !isAttendanceScanner) return <Navigate to="/" />;
  if (role === 'store' && !isAdmin && !isStoreManager) return <Navigate to="/" />;
  if (role === 'servant' && !isAdmin && !isServant) return <Navigate to="/" />;

  if (role === 'student') {
    return <StudentLayout>{children}</StudentLayout>;
  }

  if (role === 'admin' || role === 'creator' || role === 'attendance' || role === 'store' || role === 'servant') {
    return <AdminLayout>{children}</AdminLayout>;
  }

  return <>{children}</>;
}

function RedirectToAssessment() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/assessment/${id}`} replace />;
}

const pageTransition = {
  initial: { opacity: 0, y: 15, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -15, scale: 0.98 },
  transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as any }
};

function AnimatedRoutes() {
  const location = useLocation();
  const { user } = useAuth();
  const [quotaExceeded, setQuotaExceeded] = React.useState(false);
  useSoundEffects(); // Attach global sounds inside router context so it works everywhere
  usePushNotifications(); // Attach push notifications initialization

  React.useEffect(() => {
    const handleQuota = () => {
      setQuotaExceeded(true);
    };
    window.addEventListener('firestore-quota-exceeded', handleQuota);
    
    const handleError = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      if (reason && typeof reason === 'object') {
        const msg = String((reason as any).message || '');
        const code = String((reason as any).code || '');
        if (
          code === 'resource-exhausted' || 
          msg.includes('quota') || 
          msg.includes('Quota limit exceeded') ||
          msg.includes('resource-exhausted')
        ) {
          setQuotaExceeded(true);
        }
      }
    };
    window.addEventListener('unhandledrejection', handleError);
    
    return () => {
      window.removeEventListener('firestore-quota-exceeded', handleQuota);
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, []);

  React.useEffect(() => {
    // Play a gentle swish sound on every route change (after First Interaction)
    import('./lib/audio').then(module => {
      module.playTransitionSound();
    }).catch(console.error);
  }, [location.pathname]);

  // Online / Offline Heartbeat
  React.useEffect(() => {
    if (!user || !user.uid || user.uid === "admin-fixed-id") return;
    
    const updateActiveStatus = async () => {
      try {
        const now = Date.now();
        const cacheKey = `last_active_write_${user.uid}`;
        const sessKey = `last_active_write_sess_${user.uid}`;
        
        // Check session storage first (survives tab reloads but guaranteed to avoid duplicate writes in same tab session)
        if (sessionStorage.getItem(sessKey)) {
          return;
        }

        const lastWrite = localStorage.getItem(cacheKey);
        if (lastWrite) {
          const diff = now - parseInt(lastWrite, 10);
          if (diff < 10800000) { // 3-hour cache/cooldown in milliseconds to extremely save write quotas
            sessionStorage.setItem(sessKey, "true");
            return;
          }
        }

        const { doc, updateDoc } = await import('firebase/firestore');
        const { db } = await import('./lib/firebase');
        await updateDoc(doc(db, 'users', user.uid), {
          lastActive: new Date().toISOString()
        });

        localStorage.setItem(cacheKey, now.toString());
        sessionStorage.setItem(sessKey, "true");
      } catch (err: any) {
        console.warn("Heartbeat update failed:", err);
        if (err?.code === 'resource-exhausted' || String(err?.message || '').includes('quota')) {
          setQuotaExceeded(true);
        }
      }
    };

    // Update once on mount/auth change
    updateActiveStatus();

    // Removed pulse heartbeat interval to save Cloud Firestore quota
  }, [user?.uid]);

  return (
    <>
      {quotaExceeded && (
        <div className="bg-amber-600 text-white font-black text-center py-3 px-6 shadow-xl text-sm relative z-[999999] flex items-center justify-center gap-2 animate-pulse" dir="rtl">
          <span>⚠️ تنبيه هام: تم تجاوز حصة الاستخدام اليومية المجانية لقاعدة البيانات (Quota Exceeded). بعض العمليات قد لا تعمل بشكل صحيح الآن حتى يتم إعادة التصفير تلقائياً من جوجل.</span>
          <button 
            onClick={() => setQuotaExceeded(false)} 
            className="bg-white/20 hover:bg-white/30 text-white rounded-full px-3 py-1 text-xs transition-colors cursor-pointer mr-3"
          >
            تجاهل
          </button>
        </div>
      )}
      <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public Routes */}
        <Route path="/" element={<motion.div {...pageTransition} className="w-full min-h-screen"><Home /></motion.div>} />
        <Route path="/about" element={<motion.div {...pageTransition} className="w-full min-h-screen"><About /></motion.div>} />
        <Route path="/login" element={<motion.div {...pageTransition} className="w-full min-h-screen"><UnifiedLogin /></motion.div>} />
        <Route path="/register" element={<motion.div {...pageTransition} className="w-full min-h-screen"><Register /></motion.div>} />
        <Route path="/assessment/:id" element={<motion.div {...pageTransition} className="w-full min-h-screen"><PublicAssessment /></motion.div>} />
        <Route path="/map" element={<PublicMap />} />
        <Route path="/resources" element={<motion.div {...pageTransition} className="w-full min-h-screen"><ResourcesHub /></motion.div>} />
        <Route path="/library" element={<motion.div {...pageTransition} className="w-full min-h-screen"><Library /></motion.div>} />
        {/* Compatibility link */}
        <Route path="/a/:id" element={<RedirectToAssessment />} />
        
        {/* Student Routes */}
        <Route path="/student" element={
          <ProtectedRoute role="student">
            <motion.div {...pageTransition} className="w-full min-h-screen"><StudentDashboard /></motion.div>
          </ProtectedRoute>
        } />
        <Route path="/student/assessments" element={
          <ProtectedRoute role="student">
            <motion.div {...pageTransition} className="w-full min-h-screen"><AvailableAssessments /></motion.div>
          </ProtectedRoute>
        } />
        <Route path="/student/leaderboard" element={
          <ProtectedRoute role="student">
            <motion.div {...pageTransition} className="w-full min-h-screen"><StudentLeaderboard /></motion.div>
          </ProtectedRoute>
        } />
        <Route path="/student/achievements" element={
          <ProtectedRoute role="student">
            <motion.div {...pageTransition} className="w-full min-h-screen"><StudentAchievements /></motion.div>
          </ProtectedRoute>
        } />
        <Route path="/student/library" element={
          <ProtectedRoute role="student">
            <motion.div {...pageTransition} className="w-full min-h-screen"><Library /></motion.div>
          </ProtectedRoute>
        } />
        <Route path="/student/analytics" element={
          <ProtectedRoute role="student">
            <motion.div {...pageTransition} className="w-full min-h-screen"><StudentAnalytics /></motion.div>
          </ProtectedRoute>
        } />
        <Route path="/student/review/:submissionId" element={
          <ProtectedRoute role="student">
            <motion.div {...pageTransition} className="w-full min-h-screen"><PostExamReview /></motion.div>
          </ProtectedRoute>
        } />
        <Route path="/student/store" element={
          <ProtectedRoute role="student">
            <motion.div {...pageTransition} className="w-full min-h-screen"><Store /></motion.div>
          </ProtectedRoute>
        } />
        <Route path="/student/meetings" element={
          <ProtectedRoute role="student">
            {user?.code?.toUpperCase().startsWith('H') ? (
              <Navigate to="/student" replace />
            ) : (
              <motion.div {...pageTransition} className="w-full min-h-screen"><PreparationMeetings /></motion.div>
            )}
          </ProtectedRoute>
        } />

        {/* Games Routes */}
        <Route path="/student/games" element={
          <ProtectedRoute role="student">
            <motion.div {...pageTransition} className="w-full min-h-screen"><GamesHub /></motion.div>
          </ProtectedRoute>
        } />
        <Route path="/student/games/daily" element={
          <ProtectedRoute role="student">
            <motion.div {...pageTransition} className="w-full min-h-screen"><DailyChallenge /></motion.div>
          </ProtectedRoute>
        } />
        <Route path="/student/games/play/:type" element={
          <ProtectedRoute role="student">
            <motion.div {...pageTransition} className="w-full min-h-screen"><GamePlay /></motion.div>
          </ProtectedRoute>
        } />
        {/* Multiplayer Games */}
        <Route path="/student/games/create" element={
          <ProtectedRoute role="student">
            <motion.div {...pageTransition} className="w-full min-h-screen"><MultiplayerCreate /></motion.div>
          </ProtectedRoute>
        } />
        <Route path="/student/games/join" element={
          <ProtectedRoute role="student">
            <motion.div {...pageTransition} className="w-full min-h-screen"><MultiplayerJoin /></motion.div>
          </ProtectedRoute>
        } />
        <Route path="/student/games/lobby/:roomId" element={
          <ProtectedRoute role="student">
            <motion.div {...pageTransition} className="w-full min-h-screen"><MultiplayerLobby /></motion.div>
          </ProtectedRoute>
        } />
        <Route path="/student/games/play-multi/:roomId" element={
          <ProtectedRoute role="student">
            <motion.div {...pageTransition} className="w-full min-h-screen"><MultiplayerPlay /></motion.div>
          </ProtectedRoute>
        } />

        <Route path="/student/games/leaderboard" element={
          <ProtectedRoute role="student">
            <motion.div {...pageTransition} className="w-full min-h-screen"><GamesLeaderboard /></motion.div>
          </ProtectedRoute>
        } />
        {/* Streak Leaderboard */}
        <Route path="/student/streak" element={
          <ProtectedRoute role="student">
            <motion.div {...pageTransition} className="w-full min-h-screen"><StreakLeaderboard /></motion.div>
          </ProtectedRoute>
        } />


        <Route path="/admin/login" element={<Navigate to="/login" replace />} />
        
        <Route path="/admin" element={
          <ProtectedRoute role="servant">
            {user?.role?.toLowerCase() === 'admin' ? (
              <motion.div {...pageTransition} className="w-full min-h-screen"><AdminDashboard /></motion.div>
            ) : (user?.isExamCreator || user?.role?.toLowerCase() === 'creator') ? (
              <Navigate to="/admin/create" replace />
            ) : (user?.isStoreManager || user?.role?.toLowerCase() === 'store') ? (
              <Navigate to="/admin/store" replace />
            ) : (user?.isAttendanceScanner || user?.role?.toLowerCase() === 'attendance') ? (
              <Navigate to="/admin/attendance" replace />
            ) : (
              <Navigate to="/admin/leaderboard" replace />
            )}
          </ProtectedRoute>
        } />
        <Route path="/admin/assessments" element={
          <ProtectedRoute role="creator">
            <motion.div {...pageTransition} className="w-full min-h-screen"><AdminDashboard /></motion.div>
          </ProtectedRoute>
        } />
        <Route path="/admin/create" element={
          <ProtectedRoute role="creator">
            <motion.div {...pageTransition} className="w-full min-h-screen"><AssessmentCreator /></motion.div>
          </ProtectedRoute>
        } />
        <Route path="/admin/edit/:id" element={
          <ProtectedRoute role="creator">
            <motion.div {...pageTransition} className="w-full min-h-screen"><AssessmentCreator /></motion.div>
          </ProtectedRoute>
        } />
        <Route path="/admin/results" element={
          <ProtectedRoute role="admin">
            <motion.div {...pageTransition} className="w-full min-h-screen"><ResultsDashboard /></motion.div>
          </ProtectedRoute>
        } />
        <Route path="/admin/leaderboard" element={
          <ProtectedRoute role="servant">
            <motion.div {...pageTransition} className="w-full min-h-screen"><AdminLeaderboard /></motion.div>
          </ProtectedRoute>
        } />
        <Route path="/admin/posters" element={
          <ProtectedRoute role="admin">
            <motion.div {...pageTransition} className="w-full min-h-screen"><Posters /></motion.div>
          </ProtectedRoute>
        } />
        <Route path="/admin/settings" element={
          <ProtectedRoute role="admin">
            <motion.div {...pageTransition} className="w-full min-h-screen"><AdminSettings /></motion.div>
          </ProtectedRoute>
        } />
        <Route path="/admin/users" element={
          <ProtectedRoute role="admin">
            <motion.div {...pageTransition} className="w-full min-h-screen"><UserManager /></motion.div>
          </ProtectedRoute>
        } />
        <Route path="/admin/students/:studentId" element={
          <ProtectedRoute role="admin">
            <motion.div {...pageTransition} className="w-full min-h-screen"><StudentDetail /></motion.div>
          </ProtectedRoute>
        } />
        <Route path="/admin/logs" element={
          <ProtectedRoute role="admin">
            <motion.div {...pageTransition} className="w-full min-h-screen"><LoginLogs /></motion.div>
          </ProtectedRoute>
        } />
        <Route path="/admin/analytics" element={
          <ProtectedRoute role="admin">
            <motion.div {...pageTransition} className="w-full min-h-screen"><AdminAnalytics /></motion.div>
          </ProtectedRoute>
        } />
        <Route path="/admin/store" element={
          <ProtectedRoute role="store">
            <motion.div {...pageTransition} className="w-full min-h-screen"><StoreManager /></motion.div>
          </ProtectedRoute>
        } />
        <Route path="/admin/attendance" element={
          <ProtectedRoute role="attendance">
            <motion.div {...pageTransition} className="w-full min-h-screen"><AdminAttendance /></motion.div>
          </ProtectedRoute>
        } />
        <Route path="/admin/library" element={
          <ProtectedRoute role="servant">
            <motion.div {...pageTransition} className="w-full min-h-screen"><Library /></motion.div>
          </ProtectedRoute>
        } />
        <Route path="/admin/question-bank" element={
          <ProtectedRoute role="creator">
            <motion.div {...pageTransition} className="w-full min-h-screen"><QuestionBank /></motion.div>
          </ProtectedRoute>
        } />
        <Route path="/admin/announcements" element={
          <ProtectedRoute role="admin">
            <motion.div {...pageTransition} className="w-full min-h-screen"><Announcements /></motion.div>
          </ProtectedRoute>
        } />
        <Route path="/admin/meetings" element={
          <ProtectedRoute role="servant">
            <motion.div {...pageTransition} className="w-full min-h-screen"><PreparationMeetings /></motion.div>
          </ProtectedRoute>
        } />
        <Route path="/admin/games" element={
          <ProtectedRoute role="admin">
            <motion.div {...pageTransition} className="w-full min-h-screen"><AdminGames /></motion.div>
          </ProtectedRoute>
        } />
        <Route path="/admin/jeopardy" element={
          <ProtectedRoute role="servant">
            <motion.div {...pageTransition} className="w-full min-h-screen"><Jeopardy /></motion.div>
          </ProtectedRoute>
        } />
        <Route path="/admin/mark4" element={
          <ProtectedRoute role="servant">
            <motion.div {...pageTransition} className="w-full min-h-screen"><Mark4Jeopardy /></motion.div>
          </ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AnimatePresence>
    </>
  );
}

export default function App() {
  const { i18n } = useTranslation();
  const dir = i18n.language === 'ar' ? 'rtl' : 'ltr';

  return (
    <div className="relative min-h-screen" dir={dir}>
      <NetworkStatus />
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[9999] bg-textured" />
      <BrowserRouter>
        <AntiCheatGuard />
        <AutoRefreshHandler />
        <PushNotificationBanner />
        <AnimatedRoutes />
      </BrowserRouter>
    </div>
  );
}

