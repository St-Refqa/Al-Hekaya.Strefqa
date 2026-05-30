import { useState, useEffect, useMemo } from "react";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot 
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { useAuth } from "../../hooks/useAuth";
import { Assessment, Submission } from "../../types";
import { 
  BookOpen, 
  Clock, 
  Calendar, 
  ChevronLeft,
  Search,
  LayoutGrid,
  List as ListIcon,
  ArrowRight,
  Users,
  Timer as TimerIcon,
  Copy,
  Check,
  Lock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { formatDate, cn } from "../../lib/utils";

import { useTranslation } from "react-i18next";

// Helper component for live countdown
function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const calculate = () => {
      const diff = new Date(expiresAt).getTime() - new Date().getTime();
      if (diff <= 0) {
        setTimeLeft(t('dashboard.ended') || "انتهى");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) setTimeLeft(`${days} ${t('dashboard.day')} و ${hours} ${t('dashboard.hour')}`);
      else if (hours > 0) setTimeLeft(`${hours} ${t('dashboard.hour')} و ${mins} ${t('dashboard.minute')}`);
      else setTimeLeft(`${mins} ${t('dashboard.minute')}`);
    };

    calculate();
    const interval = setInterval(calculate, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [expiresAt]);

  return <span>{timeLeft}</span>;
}

export default function AvailableAssessments() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyLink = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const url = `${window.location.origin}/assessment/${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  useEffect(() => {
    const q = query(
      collection(db, "assessments"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assessment));
      // Filter out expired (keep scheduled ones to show them as locked)
      let filtered = data.filter(a => {
        return a.status === "active" && new Date(a.expiresAt) > new Date();
      });
      
      // Filter based on target group
      if (user) {
        filtered = filtered.filter(a => {
          if (user.role === 'admin') return true;
          if (!a.targetGroup || a.targetGroup === 'all') return true;
          const upperCode = user.code?.toUpperCase() || "";
          if (a.targetGroup === 'servant' && user.role === 'student' && upperCode.startsWith('S')) return true;
          if (a.targetGroup === 'OT' && user.role === 'student' && upperCode.startsWith('H')) return true;
          if (a.targetGroup === 'NT' && user.role === 'student' && upperCode.startsWith('N')) return true;
          return false;
        });
      }

      setAssessments(filtered);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "assessments");
      setIsLoading(false);
    });

    // Listen to user submissions
    let unsubscribeUserSubs = () => {};
    if (user) {
      const userSubQ = query(
        collection(db, "submissions"),
        where("participantId", "==", user.uid)
      );
      unsubscribeUserSubs = onSnapshot(userSubQ, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission));
        setSubmissions(data);
      });
    }

    return () => {
      unsubscribe();
      unsubscribeUserSubs();
    };
  }, [user]);

  const completedAssessmentIds = useMemo(() => {
    return new Set(submissions.map(s => s.assessmentId));
  }, [submissions]);

  const filteredAssessments = assessments.filter(a => 
    a.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#FDFCFB] pb-24" dir="rtl">
      {/* Navigation Header - Hidden on mobile, global layout handles toggle */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-brand-beige/5 px-6 py-4 hidden lg:block">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="text-right">
            <h1 className="text-xl font-black text-brand-text">{t('assessments.title')}</h1>
            <p className="text-[10px] text-brand-beige font-black uppercase tracking-widest">{t('assessments.subtitle')}</p>
          </div>
          
          <button 
            onClick={() => navigate("/student")}
            className="flex items-center gap-2 text-brand-beige hover:text-brand-red transition-colors font-bold group"
          >
            <span>{t('assessments.back_to_home')}</span>
            <div className="w-8 h-8 rounded-full bg-brand-cream flex items-center justify-center group-hover:bg-brand-red group-hover:text-white transition-all transform rotate-180">
              <ChevronLeft className="w-4 h-4" />
            </div>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 lg:py-12">
        {/* Controls - Minimal & Clean */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
          <div className="relative w-full md:w-96 group">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-beige group-focus-within:text-brand-red transition-colors" />
            <input 
              type="text"
              placeholder={t('assessments.search_placeholder')}
              value={searchQuery || ''}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-12 pl-4 py-3 bg-white border border-brand-beige/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-red/10 focus:border-brand-red/20 transition-all font-bold text-sm"
            />
          </div>

          <div className="flex items-center gap-2 p-1 bg-brand-cream/50 rounded-xl border border-brand-beige/5">
            <button 
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === "grid" ? "bg-white shadow-sm text-brand-red" : "text-brand-beige hover:text-brand-text"
              )}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setViewMode("list")}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === "list" ? "bg-white shadow-sm text-brand-red" : "text-brand-beige hover:text-brand-text"
              )}
            >
              <ListIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Assessments Listing */}
        <motion.div 
          layout
          className={cn(
            "grid gap-8 transition-all duration-700",
            viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-2" : "grid-cols-1"
          )}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {isLoading ? (
              [1, 2, 3, 4].map(i => (
                <motion.div 
                  key={`skeleton-${i}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-48 bg-white animate-pulse rounded-[32px] border border-brand-beige/10 shadow-sm" 
                />
              ))
            ) : filteredAssessments.length === 0 ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="col-span-full py-20 text-center space-y-4"
              >
                <div className="w-14 h-14 md:w-20 md:h-20 bg-brand-cream rounded-full flex items-center justify-center mx-auto text-brand-beige">
                  <BookOpen className="w-7 h-7 md:w-10 md:h-10" />
                </div>
                <h3 className="text-xl font-black text-brand-text">
                  {searchQuery ? t('assessments.no_results') : "مفيش اختبارات متاحة دلوقتي"}
                </h3>
                <p className="text-brand-beige font-bold">
                  {searchQuery ? t('assessments.no_results_subtitle') : "استعد للاختبارات الجاية يا بطل!"}
                </p>
              </motion.div>
            ) : (
              filteredAssessments.map((assessment, idx) => {
                const isCompleted = completedAssessmentIds.has(assessment.id!);
                const isNew = assessment.createdAt && (new Date().getTime() - new Date(assessment.createdAt).getTime() < 24 * 60 * 60 * 1000);
                const isScheduled = assessment.availableFrom && new Date(assessment.availableFrom) > new Date();
                
                return (
                  <motion.div
                    key={assessment.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                    whileHover={!isScheduled ? { y: -8, scale: 1.01 } : {}}
                    transition={{ 
                      type: "spring",
                      stiffness: 300,
                      damping: 30,
                      delay: idx * 0.05 
                    }}
                    onClick={() => { if (!isScheduled) navigate(`/assessment/${assessment.id}`) }}
                    className={cn(
                      "group relative overflow-hidden shadow-sm transition-all duration-500",
                      isScheduled ? "opacity-60 grayscale-[30%] cursor-not-allowed border border-brand-beige/20 bg-brand-cream/10" : "cursor-pointer bg-white border border-brand-beige/10 hover:border-brand-red/30 hover:shadow-2xl hover:shadow-brand-red/10",
                      viewMode === "grid" 
                        ? "p-0 rounded-3xl md:rounded-[48px] flex flex-col h-full" 
                        : "p-4 md:p-6 rounded-2xl md:rounded-[32px] flex items-center justify-between"
                    )}
                  >
                    {/* Copy Link Button - only if not scheduled */}
                    {!isScheduled && (
                      <button
                        onClick={(e) => handleCopyLink(e, assessment.id!)}
                        className={cn(
                          "absolute top-6 left-6 z-10 p-2 rounded-xl transition-all duration-300 border border-brand-beige/10",
                          copiedId === assessment.id 
                            ? "bg-emerald-500 text-white border-emerald-400" 
                            : "bg-white/80 backdrop-blur-sm text-brand-beige hover:text-brand-red hover:bg-white"
                        )}
                        title={t('assessments.copy_link')}
                      >
                        {copiedId === assessment.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    )}

                    {/* Subtle Gradient Overlay on Hover */}
                    {!isScheduled && (
                      <div className="absolute inset-0 bg-gradient-to-br from-brand-red/[0.03] via-transparent to-brand-cream/[0.05] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    )}

                    {/* Decorative Background for grid */}
                    {viewMode === "grid" && !isScheduled && (
                      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-cream/30 rounded-bl-[80px] -mr-10 -mt-10 transition-all duration-700 group-hover:scale-150 group-hover:bg-brand-red/5" />
                    )}

                    <div className={cn(
                      "flex",
                      viewMode === "grid" ? "flex-col p-5 md:p-8 flex-1" : "flex-row items-center flex-1 gap-4 md:gap-6"
                    )}>
                      {/* Icon Section */}
                      <div className={cn(
                        "rounded-3xl flex items-center justify-center transition-all duration-500 shadow-sm shrink-0",
                        viewMode === "grid" 
                          ? `w-14 h-14 md:w-20 md:h-20 mb-4 md:mb-8 ${!isScheduled ? 'bg-brand-cream text-brand-red group-hover:bg-brand-red group-hover:text-white group-hover:rotate-12 group-hover:scale-110' : 'bg-gray-100 text-gray-400'}` 
                          : `w-12 h-12 md:w-16 md:h-16 ${!isScheduled ? 'bg-brand-cream text-brand-red group-hover:bg-brand-red group-hover:text-white' : 'bg-gray-100 text-gray-400'}`
                      )}>
                        {isScheduled ? <Lock className={viewMode === "grid" ? "w-6 h-6 md:w-8 md:h-8" : "w-5.5 h-5.5 md:w-7 md:h-7"} /> : <BookOpen className={viewMode === "grid" ? "w-6 h-6 md:w-8 md:h-8" : "w-5.5 h-5.5 md:w-7 md:h-7"} />}
                      </div>

                      {/* Content Section */}
                      <div className="flex-1 space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {isScheduled ? (
                            <span className="text-[10px] font-black text-gray-500 bg-gray-100 px-3 py-1 rounded-full uppercase tracking-widest border border-gray-200">
                              مجدول
                            </span>
                          ) : (
                            <>
                              {isNew && !isCompleted && (
                                <span className="text-[10px] font-black text-white bg-brand-red px-3 py-1 rounded-full uppercase tracking-widest shadow-md animate-pulse">{t('dashboard.new')}</span>
                              )}
                              {isCompleted ? (
                                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-widest border border-emerald-100 flex items-center gap-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  {t('assessments.completed')}
                                </span>
                              ) : (
                                <span className="text-[10px] font-black text-brand-red bg-brand-red/5 px-3 py-1 rounded-full uppercase tracking-widest border border-brand-red/10">{t('assessments.available')}</span>
                              )}
                              {assessment.assessmentType === 'questions-only' ? (
                                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase border border-blue-100 flex items-center gap-1">
                                  ⏱️ أسئلة فقط
                                </span>
                              ) : (
                                <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-full uppercase border border-amber-100 flex items-center gap-1">
                                  📖 قراءة وأسئلة
                                </span>
                              )}
                              <div className="flex items-center gap-1.5 text-brand-beige text-[10px] font-black uppercase tracking-wider bg-brand-cream/50 px-2.5 py-1 rounded-full">
                                <TimerIcon className="w-3 h-3 text-brand-red" />
                                <CountdownTimer expiresAt={assessment.expiresAt} />
                              </div>
                            </>
                          )}
                        </div>

                        <div className="space-y-1">
                          <h3 className={cn("text-lg md:text-2xl font-black leading-tight transition-colors line-clamp-2", isScheduled ? "text-gray-500" : "text-brand-text group-hover:text-brand-red")}>
                            {assessment.title}
                          </h3>
                        </div>

                        {/* Metadata Grid */}
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 border-t border-brand-beige/5">
                           <div className="flex items-center gap-2 text-brand-beige text-[11px] font-bold">
                            <Users className="w-4 h-4 text-brand-red/40" />
                            <span>{participantCounts[assessment.id!] || 0} {t('dashboard.participants')}</span>
                          </div>
                          <div className="flex items-center gap-2 text-brand-beige text-[11px] font-bold">
                            <BookOpen className="w-4 h-4 text-brand-red/40" />
                            <span>{assessment.questions?.length || 0} {t('admin.questions_count')}</span>
                          </div>
                          {!isScheduled && (
                            <div className="flex items-center gap-2 text-brand-beige text-[11px] font-bold">
                              <Calendar className="w-4 h-4 text-brand-red/40" />
                              <span>{formatDate(assessment.createdAt)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* CTA Section */}
                    <div className={cn(
                      "transition-all duration-500",
                      viewMode === "grid" 
                        ? "p-5 md:p-8 pt-0 mt-auto" 
                        : "pr-4 md:pr-8 border-r border-brand-beige/5"
                    )}>
                      <div className={cn(
                        "flex items-center justify-between group/cta",
                        viewMode === "grid" 
                          ? `rounded-2xl md:rounded-3xl p-3 md:p-4 transition-all duration-300 shadow-inner ${!isScheduled ? 'bg-brand-cream/50 group-hover:bg-brand-red' : 'bg-gray-100'}` 
                          : "gap-4"
                      )}>
                        <span className={cn(
                          "text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] transition-colors",
                          viewMode === "grid" 
                            ? `px-2 md:px-4 ${!isScheduled ? 'text-brand-text group-hover:text-white' : 'text-gray-400'}` 
                            : `${!isScheduled ? 'text-brand-beige group-hover:text-brand-red' : 'text-gray-400'}`
                        )}>
                          {isScheduled 
                            ? `متاح في ${new Date(assessment.availableFrom!).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}` 
                            : (isCompleted ? t('assessments.review') : t('assessments.start'))}
                        </span>
                        {!isScheduled && (
                          <div className={cn(
                            "w-9 h-9 md:w-12 md:h-12 flex items-center justify-center transition-all duration-500 transform rotate-180",
                            viewMode === "grid"
                              ? "bg-white text-brand-red rounded-xl md:rounded-2xl group-hover:bg-white group-hover:scale-90 shadow-sm"
                              : "bg-brand-cream text-brand-text rounded-full group-hover:bg-brand-red group-hover:text-white group-hover:translate-x-[-8px]"
                          )}>
                            <ChevronLeft className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </motion.div>


      </main>
    </div>
  );
}
