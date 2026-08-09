import React, { useState, useEffect, useMemo } from "react";
import { collection, query, onSnapshot, where } from "firebase/firestore";
import { parseISO, differenceInDays } from "date-fns";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { User } from "../../types";
import { Flame, ArrowLeft, Search, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/useAuth";

export default function StreakLeaderboard() {
  const [usersList, setUsersList] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "online" | "workshop" | "servants">("all");
  const { i18n } = useTranslation();
  const { user } = useAuth();
  
  const userRole = (user?.role || "").toLowerCase();
  const isServantView = userRole === "admin" || userRole === "servant" || user?.isExamCreator || user?.isAttendanceScanner || user?.code?.toUpperCase().startsWith("S");

  useEffect(() => {
    const q = query(
      collection(db, "users"),
      where("role", "in", ["student", "servant", "admin"])
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({ uid: doc.id, ...doc.data() } as User));
        setUsersList(data);
        setIsLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "users");
      }
    );

    return () => unsubscribe();
  }, []);

  const leaderboardData = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
    const today = parseISO(todayStr);

    return usersList
      .filter((u) => {
        const code = u.code?.toUpperCase() || "";
        
        // Hide servants from non-servants
        if (!isServantView && code.startsWith("S")) return false;

        if (categoryFilter === "all") return true;
        if (categoryFilter === "online" && code.startsWith("H")) return true;
        if (categoryFilter === "workshop" && code.startsWith("N")) return true;
        if (categoryFilter === "servants" && code.startsWith("S")) return true;
        return false;
      })
      .map((u) => {
        let trueStreak = u.streak || 0;
        if (trueStreak > 0 && u.lastActive) {
           const lastActiveDate = parseISO(u.lastActive);
           if (differenceInDays(today, lastActiveDate) > 1) {
             trueStreak = 0;
           }
        } else if (trueStreak > 0 && !u.lastActive) {
           // Fallback for old users without lastActive, assume 0 to be safe or keep it? 
           // If they have no lastActive, their streak hasn't been updated with the new system.
           // We'll keep it for now but it will reset once they play.
        }

        return {
          id: u.uid,
          name: u.fullName || "بدون اسم",
          streak: trueStreak,
          photoUrl: u.photoUrl,
        };
      })
      .filter((p) => p.streak > 0) // Only show users with an active streak
      .filter((p) => !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => b.streak - a.streak);
  }, [usersList, searchTerm, categoryFilter, isServantView]);

  const top5 = leaderboardData.slice(0, 5);
  const remaining = leaderboardData.slice(5);

  const categories = [
    { id: "all", label: "الكل" },
    { id: "online", label: "طلاب أونلاين" },
    { id: "workshop", label: "طلاب ورشة" },
    ...(isServantView ? [{ id: "servants", label: "خدام" }] : []),
  ] as const;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className={cn("max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-12", i18n.language === "ar" ? "text-right" : "text-left")} dir={i18n.language === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8 mb-8">
        <div className="flex items-center gap-4 md:gap-6">
          <Link
            to="/student"
            className="p-3 md:p-4 bg-white border border-brand-beige/20 rounded-xl md:rounded-2xl hover:bg-brand-cream transition-all shadow-sm group"
          >
            <ArrowLeft className="w-5 h-5 text-brand-beige group-hover:text-orange-500 group-hover:-translate-x-1 transition-all" />
          </Link>
          <div>
            <h1 className="text-2xl md:text-5xl font-black tracking-tight text-brand-text mb-1 md:mb-2 flex items-center gap-2">
              لوحة الـ Streak <Flame className="w-8 h-8 text-orange-500 inline-block" />
            </h1>
            <p className="text-sm md:text-lg text-brand-beige font-medium">أكثر الملتزمين بالدخول يومياً</p>
          </div>
        </div>

        <div className="w-full md:w-auto relative group">
          <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-brand-beige/50 group-focus-within:text-orange-500 transition-colors" />
          </div>
          <input
            type="text"
            placeholder="ابحث عن اسم..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-80 bg-white border-2 border-brand-beige/20 text-brand-text text-sm rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 block p-4 pr-12 transition-all font-medium placeholder:text-brand-beige/50"
          />
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex overflow-x-auto pb-4 mb-8 gap-3 custom-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.id as any)}
            className={cn(
              "px-6 py-3 rounded-2xl font-black whitespace-nowrap transition-all shadow-sm",
              categoryFilter === cat.id
                ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white transform scale-105"
                : "bg-white text-brand-text border-2 border-brand-beige/10 hover:border-orange-500/50 hover:bg-orange-50"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {leaderboardData.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-brand-beige/20 shadow-sm">
          <div className="w-24 h-24 bg-brand-cream rounded-full flex items-center justify-center mx-auto mb-6">
            <Target className="w-10 h-10 text-brand-beige opacity-50" />
          </div>
          <h3 className="text-xl font-black text-brand-text mb-2">لا يوجد متصدرين هنا</h3>
          <p className="text-brand-beige font-bold">كل المتسابقين الـ Streak بتاعهم صفر في هذا القسم حالياً.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-12 gap-8">
          {/* Top 5 Podium */}
          {top5.length > 0 && (
            <div className="lg:col-span-12 flex flex-col items-center justify-end mb-12 min-h-[350px]">
              <div className="flex items-end justify-center gap-1 md:gap-4 w-full max-w-5xl mx-auto px-1 md:px-4 relative">
                
                {/* 4th Place */}
                {top5[3] && (
                  <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                    className="flex flex-col items-center w-[18%] md:w-1/5 z-0">
                    <div className="relative mb-2">
                      <div className="w-10 h-10 md:w-16 md:h-16 rounded-full border-[3px] border-emerald-400 overflow-hidden bg-white shadow-lg">
                        {top5[3].photoUrl ? <img src={top5[3].photoUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-emerald-50 flex items-center justify-center text-emerald-500 font-bold text-lg">{top5[3].name[0]}</div>}
                      </div>
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 md:w-6 md:h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white font-black text-[10px] md:text-xs border-2 border-white shadow-md">4</div>
                    </div>
                    <div className="w-full bg-gradient-to-t from-emerald-100 to-emerald-50 rounded-t-xl flex flex-col items-center pt-3 md:pt-5 pb-2 px-1 h-16 md:h-24 border border-emerald-200 shadow-sm">
                      <p className="font-black text-emerald-900 text-[9px] md:text-xs text-center line-clamp-1 mb-1 w-full truncate">{top5[3].name}</p>
                      <div className="mt-auto bg-white/60 px-1 md:px-2 py-0.5 md:py-1 rounded-lg border border-emerald-200">
                        <span className="font-black text-emerald-800 text-xs md:text-sm flex items-center gap-0.5"><Flame className="w-3 h-3 text-orange-500" />{top5[3].streak}</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 2nd Place */}
                {top5[1] && (
                  <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="flex flex-col items-center w-[22%] md:w-1/5 z-10">
                    <div className="relative mb-4">
                      <div className="w-14 h-14 md:w-24 md:h-24 rounded-full border-[3px] border-slate-300 overflow-hidden bg-white shadow-xl">
                        {top5[1].photoUrl ? <img src={top5[1].photoUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xl md:text-2xl">{top5[1].name[0]}</div>}
                      </div>
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 md:w-8 md:h-8 bg-slate-300 rounded-full flex items-center justify-center text-white font-black text-xs md:text-sm border-2 border-white shadow-md">2</div>
                    </div>
                    <div className="w-full bg-gradient-to-t from-slate-200 to-slate-100 rounded-t-2xl flex flex-col items-center pt-4 md:pt-6 pb-2 md:pb-4 px-1 md:px-2 h-24 md:h-40 border border-slate-300 shadow-lg">
                      <p className="font-black text-slate-800 text-[10px] md:text-sm text-center line-clamp-1 mb-1 w-full truncate">{top5[1].name}</p>
                      <div className="mt-auto bg-white/60 px-2 md:px-3 py-1 md:py-1.5 rounded-xl border border-slate-300/50">
                        <span className="font-black text-slate-700 text-sm md:text-xl flex items-center gap-1"><Flame className="w-3 h-3 md:w-4 md:h-4 text-orange-500" />{top5[1].streak}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
                
                {/* 1st Place */}
                {top5[0] && (
                  <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="flex flex-col items-center w-[26%] md:w-[22%] z-20">
                    <div className="relative mb-5 md:mb-6">
                      <div className="absolute -top-6 md:-top-8 left-1/2 -translate-x-1/2 w-8 h-8 md:w-12 md:h-12 bg-amber-400 rounded-full flex items-center justify-center shadow-lg shadow-amber-400/50 animate-bounce">
                        <span className="text-sm md:text-2xl">👑</span>
                      </div>
                      <div className="w-16 h-16 md:w-32 md:h-32 rounded-full border-4 border-amber-400 overflow-hidden bg-white shadow-2xl">
                        {top5[0].photoUrl ? <img src={top5[0].photoUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-amber-50 flex items-center justify-center text-amber-500 font-bold text-2xl md:text-4xl">{top5[0].name[0]}</div>}
                      </div>
                      <div className="absolute -bottom-3 md:-bottom-4 left-1/2 -translate-x-1/2 w-8 h-8 md:w-10 md:h-10 bg-amber-400 rounded-full flex items-center justify-center text-white font-black text-sm md:text-lg border-2 md:border-4 border-white shadow-md">1</div>
                    </div>
                    <div className="w-full bg-gradient-to-t from-amber-300 to-amber-100 rounded-t-3xl flex flex-col items-center pt-6 md:pt-8 pb-3 md:pb-6 px-1 md:px-2 h-36 md:h-56 border-2 border-amber-200 shadow-2xl transform md:scale-105">
                      <p className="font-black text-amber-900 text-[11px] md:text-lg text-center line-clamp-2 leading-tight px-1 w-full truncate">{top5[0].name}</p>
                      <div className="mt-auto bg-white/80 px-2 md:px-4 py-1 md:py-2 rounded-xl md:rounded-2xl border border-amber-300 shadow-inner">
                        <span className="font-black text-amber-600 text-base md:text-3xl flex items-center gap-1 md:gap-1.5"><Flame className="w-4 h-4 md:w-6 md:h-6 text-orange-500" />{top5[0].streak}</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 3rd Place */}
                {top5[2] && (
                  <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="flex flex-col items-center w-[22%] md:w-1/5 z-10">
                    <div className="relative mb-3">
                      <div className="w-12 h-12 md:w-24 md:h-24 rounded-full border-[3px] border-amber-700/60 overflow-hidden bg-white shadow-lg">
                        {top5[2].photoUrl ? <img src={top5[2].photoUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-amber-50 flex items-center justify-center text-amber-700 font-bold text-lg md:text-2xl">{top5[2].name[0]}</div>}
                      </div>
                      <div className="absolute -bottom-2 md:-bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 md:w-8 md:h-8 bg-amber-700/80 rounded-full flex items-center justify-center text-white font-black text-[10px] md:text-sm border-2 border-white shadow-md">3</div>
                    </div>
                    <div className="w-full bg-gradient-to-t from-amber-100 to-amber-50 rounded-t-2xl flex flex-col items-center pt-4 md:pt-5 pb-2 md:pb-3 px-1 md:px-2 h-20 md:h-32 border border-amber-700/20 shadow-md">
                      <p className="font-black text-amber-900 text-[10px] md:text-sm text-center line-clamp-1 mb-1 w-full truncate">{top5[2].name}</p>
                      <div className="mt-auto bg-white/60 px-2 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl border border-amber-700/20">
                        <span className="font-black text-amber-800 text-xs md:text-xl flex items-center gap-0.5 md:gap-1"><Flame className="w-3 h-3 md:w-4 md:h-4 text-orange-500" />{top5[2].streak}</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 5th Place */}
                {top5[4] && (
                  <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                    className="flex flex-col items-center w-[18%] md:w-1/5 z-0">
                    <div className="relative mb-2">
                      <div className="w-9 h-9 md:w-16 md:h-16 rounded-full border-2 border-blue-400 overflow-hidden bg-white shadow-md">
                        {top5[4].photoUrl ? <img src={top5[4].photoUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-blue-50 flex items-center justify-center text-blue-500 font-bold text-base md:text-lg">{top5[4].name[0]}</div>}
                      </div>
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 md:w-6 md:h-6 bg-blue-500 rounded-full flex items-center justify-center text-white font-black text-[9px] md:text-xs border-2 border-white shadow-sm">5</div>
                    </div>
                    <div className="w-full bg-gradient-to-t from-blue-100 to-blue-50 rounded-t-lg flex flex-col items-center pt-3 md:pt-4 pb-1 md:pb-2 px-1 h-12 md:h-20 border border-blue-200 shadow-sm">
                      <p className="font-black text-blue-900 text-[8px] md:text-xs text-center line-clamp-1 mb-0.5 md:mb-1 w-full truncate">{top5[4].name}</p>
                      <div className="mt-auto bg-white/60 px-1 md:px-2 py-0.5 md:py-1 rounded-md border border-blue-200">
                        <span className="font-black text-blue-800 text-[10px] md:text-sm flex items-center gap-0.5"><Flame className="w-2 h-2 md:w-3 md:h-3 text-orange-500" />{top5[4].streak}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          )}

          {/* Remaining List */}
          {remaining.length > 0 && (
            <div className="lg:col-span-12">
              <div className="bg-white rounded-3xl border border-brand-beige/20 shadow-xl overflow-hidden">
                <div className="divide-y divide-brand-beige/10">
                  {remaining.map((user, index) => (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * Math.min(index, 10) }}
                      className="p-4 md:p-5 flex items-center gap-4 md:gap-6 hover:bg-orange-50/50 transition-colors group"
                    >
                      <div className="w-10 md:w-12 text-center">
                        <span className="text-lg md:text-xl font-black text-brand-beige/50 group-hover:text-orange-500 transition-colors">
                          {index + 6}
                        </span>
                      </div>
                      
                      <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl overflow-hidden bg-brand-cream shrink-0 ring-4 ring-white shadow-sm border border-brand-beige/10">
                        {user.photoUrl ? (
                          <img src={user.photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-brand-beige font-black text-xl">
                            {user.name[0]}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-base md:text-lg font-black text-brand-text truncate mb-1">
                          {user.name}
                        </h3>
                      </div>

                      <div className="shrink-0 flex items-center justify-center min-w-[80px] md:min-w-[120px]">
                        <div className="bg-orange-100 text-orange-600 px-4 py-2 rounded-2xl flex items-center gap-2 border border-orange-200">
                          <Flame className="w-5 h-5 text-orange-500" />
                          <span className="font-black text-xl">{user.streak}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
