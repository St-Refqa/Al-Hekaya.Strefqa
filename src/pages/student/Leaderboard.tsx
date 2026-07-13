import React, { useState, useEffect, useMemo } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  getDocs,
  where,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { Submission, User } from "../../types";
import { useAuth } from "../../hooks/useAuth";
import {
  Trophy,
  Search,
  ArrowLeft,
  Medal,
  Users,
  Target,
  Crown
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";
import { useTranslation } from "react-i18next";

export default function StudentLeaderboard() {
  const [usersList, setUsersList] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useAuth();
  const { i18n } = useTranslation();

  useEffect(() => {
    const q = query(
      collection(db, "users"),
      where("role", "==", "student")
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
    const userPrefix = user?.code ? user.code.substring(0, 1).toUpperCase() : "";

    return usersList
      .filter(u => {
         const code = u.code?.toUpperCase() || "";
         if (userPrefix === "H" && code.startsWith("H")) return true;
         if (userPrefix === "N" && code.startsWith("N")) return true;
         if (userPrefix === "S" && code.startsWith("S")) return true;
         if (!["H", "N", "S"].includes(userPrefix)) return true; // fallback
         return false;
      })
      .map(u => ({
        id: u.uid,
        name: u.fullName || "بدون اسم",
        totalScore: u.cumulativePoints ?? u.totalPoints ?? 0,
        streak: u.streak || 0,
        photoUrl: u.photoUrl,
        badgeCount: u.badges?.length || 0
      }))
      .filter(p => !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => b.totalScore - a.totalScore);
  }, [usersList, searchTerm, user]);

  const top5 = leaderboardData.slice(0, 5);
  const remaining = leaderboardData.slice(5);

  return (
    <div className={cn("max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-12", i18n.language === 'ar' ? 'text-right' : 'text-left')} dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8 mb-8 md:mb-16">
        <div className="flex items-center gap-4 md:gap-6">
          <Link
            to="/student/available"
            className="p-3 md:p-4 bg-white border border-brand-beige/20 rounded-xl md:rounded-2xl hover:bg-brand-cream transition-all shadow-sm group"
          >
            <ArrowLeft className="w-5 h-5 text-brand-beige group-hover:text-brand-red group-hover:-translate-x-1 transition-all" />
          </Link>
          <div>
            <h1 className="text-2xl md:text-5xl font-black tracking-tight text-brand-text mb-1 md:mb-2">
              لوحة المتصدرين
            </h1>
            <p className="text-brand-beige font-bold text-xs md:text-lg">
              ترتيب الأبطال ومنافسة شريفة بين الجميع!
            </p>
          </div>
        </div>

        <div className="relative w-full md:max-w-md">
          <Search className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 w-4 md:w-5 h-4 md:h-5 text-brand-beige" />
          <input
            type="text"
            placeholder="ابحث عن زميل..."
            value={searchTerm || ''}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-11 md:pr-14 pl-5 md:pl-6 py-3.5 md:py-5 bg-white border border-brand-beige/10 rounded-2xl md:rounded-[24px] focus:ring-4 focus:ring-brand-red/5 focus:border-brand-red/20 outline-none transition-all font-bold text-brand-text shadow-sm text-sm md:text-base"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="py-40 text-center">
          <Trophy className="w-16 h-16 animate-pulse text-brand-beige/20 mx-auto mb-6" />
          <p className="text-brand-beige font-black text-xl">جاري حساب الترتيب...</p>
        </div>
      ) : leaderboardData.length === 0 ? (
        <div className="py-40 text-center bg-white rounded-[48px] border-2 border-dashed border-brand-beige/20">
          <Users className="w-16 h-16 text-brand-beige/20 mx-auto mb-6" />
          <p className="text-brand-beige font-black text-xl">لا يوجد متسابقين حالياً</p>
        </div>
      ) : (
        <div className="space-y-20">
          {/* Podium Section */}
          <div className="flex flex-row justify-center items-end gap-1 sm:gap-2 md:gap-6 lg:gap-8 max-w-7xl mx-auto px-2 md:px-4 overflow-x-auto pb-8 pt-8 custom-scrollbar">
            
            {/* 4th Place */}
            {top5[3] && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="order-4 shrink-0 flex flex-col items-center group"
              >
                <div className="relative mb-4 md:mb-6">
                  <div className="w-12 h-12 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-2xl sm:rounded-3xl lg:rounded-[28px] bg-white shadow-2xl flex items-center justify-center text-brand-beige font-black text-xl sm:text-2xl lg:text-3xl border-4 border-slate-200 group-hover:scale-105 transition-transform duration-500 overflow-hidden">
                    {top5[3].photoUrl ? (
                      <img src={top5[3].photoUrl} alt={top5[3].name} className="w-full h-full object-cover" />
                    ) : top5[3].name[0]}
                  </div>
                  <div className="absolute -top-1 -right-1 sm:-top-4 sm:-right-4 w-6 h-6 sm:w-8 lg:w-10 bg-slate-400 text-white rounded-lg sm:rounded-xl flex items-center justify-center font-black text-xs sm:text-sm lg:text-lg shadow-xl border sm:border-4 border-white rotate-12 group-hover:rotate-0 transition-all">4</div>
                </div>
                <div className="text-center mb-4 lg:mb-8">
                  <h4 className="font-black text-brand-text text-sm md:text-[9px] sm:text-sm lg:text-lg mb-1 truncate max-w-[48px] sm:max-w-none">{top5[3].name}</h4>
                  <div className="flex flex-col gap-1 items-center">
                    <div className="px-3 py-1 bg-slate-50 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-widest inline-block">{top5[3].totalScore} نقطة</div>
                    <div className="flex items-center gap-1 text-emerald-600 text-[10px] font-black">
                      <Medal className="w-3 h-3" />
                      <span>{top5[3].badgeCount} أوسمة</span>
                    </div>
                  </div>
                </div>
                <div className="w-full h-8 lg:h-20 bg-gradient-to-b from-slate-100/30 to-transparent rounded-t-[30px] border-x-2 border-t-2 border-slate-200/20" />
              </motion.div>
            )}

            {/* 2nd Place */}
            {top5[1] && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="order-2 shrink-0 flex flex-col items-center group"
              >
                <div className="relative mb-4 md:mb-6">
                  <div className="w-14 h-14 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-2xl sm:rounded-3xl lg:rounded-[32px] bg-white shadow-2xl flex items-center justify-center text-brand-beige font-black text-xl sm:text-3xl lg:text-4xl border-4 border-slate-200 group-hover:scale-105 transition-transform duration-500 overflow-hidden">
                    {top5[1].photoUrl ? (
                      <img src={top5[1].photoUrl} alt={top5[1].name} className="w-full h-full object-cover" />
                    ) : top5[1].name[0]}
                  </div>
                  <div className="absolute -top-1 -right-1 sm:-top-4 sm:-right-4 w-6 h-6 sm:w-10 lg:w-12 bg-slate-200 text-slate-600 rounded-lg sm:rounded-2xl flex items-center justify-center font-black text-xs sm:text-base lg:text-xl shadow-xl border sm:border-4 border-white rotate-12 group-hover:rotate-0 transition-all">2</div>
                </div>
                <div className="text-center mb-4 lg:mb-8">
                  <h4 className="font-black text-brand-text text-base md:text-[10px] sm:text-base lg:text-xl mb-1 truncate max-w-[56px] sm:max-w-none">{top5[1].name}</h4>
                  <div className="flex flex-col gap-1 items-center">
                    <div className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-widest inline-block">{top5[1].totalScore} نقطة</div>
                    <div className="flex items-center gap-1 text-emerald-600 text-[10px] font-black">
                      <Medal className="w-3 h-3" />
                      <span>{top5[1].badgeCount} أوسمة</span>
                    </div>
                  </div>
                </div>
                <div className="w-full h-12 lg:h-32 bg-gradient-to-b from-slate-100/50 to-transparent rounded-t-[40px] border-x-2 border-t-2 border-slate-200/30" />
              </motion.div>
            )}

            {/* 1st Place */}
            {top5[0] && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1.1 }}
                className="order-1 shrink-0 flex flex-col items-center relative z-10"
              >
                <div className="relative mb-6 md:mb-8 pt-4 sm:pt-0">
                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="absolute -top-5 sm:-top-16 left-1/2 -translate-x-1/2"
                  >
                    <Crown className="w-8 h-8 sm:w-16 text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.5)]" />
                  </motion.div>
                  
                  <div className="w-16 h-16 sm:w-32 sm:h-32 lg:w-48 lg:h-48 rounded-2xl sm:rounded-[40px] bg-white shadow-[0_20px_50px_rgba(251,191,36,0.15)] flex items-center justify-center text-brand-red font-black text-2xl sm:text-5xl border-4 border-amber-400 overflow-hidden ring-4 sm:ring-8 ring-amber-400/5 relative">
                     {top5[0].photoUrl ? (
                      <img src={top5[0].photoUrl} alt={top5[0].name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="relative z-10">{top5[0].name[0]}</span>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-amber-400/20 to-transparent" />
                  </div>
                </div>
                
                <div className="text-center mb-6 lg:mb-10">
                  <h4 className="font-black text-brand-text text-xs sm:text-2xl lg:text-3xl mb-1 lg:mb-2 tracking-tight truncate max-w-[64px] sm:max-w-none">{top5[0].name}</h4>
                  <div className="flex flex-col gap-1.5 lg:gap-2 items-center">
                    <div className="px-4 py-1.5 bg-amber-400 text-white rounded-full text-xs font-black shadow-lg shadow-amber-400/20 inline-block">{top5[0].totalScore} نقطة</div>
                    <div className="flex items-center gap-1 text-amber-600 text-[10px] font-black">
                      <Medal className="w-4 h-4" />
                      <span>{top5[0].badgeCount} أوسمة للملك</span>
                    </div>
                  </div>
                </div>
                <div className="w-full h-16 lg:h-48 bg-gradient-to-b from-amber-50 to-transparent rounded-t-[50px] border-x-2 border-t-2 border-amber-200/30 shadow-[0_-20px_50px_rgba(251,191,36,0.1)]" />
              </motion.div>
            )}

            {/* 3rd Place */}
            {top5[2] && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="order-3 shrink-0 flex flex-col items-center group"
              >
                <div className="relative mb-4 md:mb-6">
                  <div className="w-14 h-14 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-2xl sm:rounded-3xl lg:rounded-[32px] bg-white shadow-2xl flex items-center justify-center text-brand-beige font-black text-xl sm:text-3xl lg:text-4xl border-4 border-amber-100 group-hover:scale-105 transition-transform duration-500 overflow-hidden">
                    {top5[2].photoUrl ? (
                      <img src={top5[2].photoUrl} alt={top5[2].name} className="w-full h-full object-cover" />
                    ) : top5[2].name[0]}
                  </div>
                  <div className="absolute -top-1 -right-1 sm:-top-4 sm:-right-4 w-6 h-6 sm:w-10 lg:w-12 bg-amber-600 text-white rounded-lg sm:rounded-2xl flex items-center justify-center font-black text-xs sm:text-base lg:text-xl shadow-xl border sm:border-4 border-white rotate-12 group-hover:rotate-0 transition-all">3</div>
                </div>
                <div className="text-center mb-4 lg:mb-8">
                  <h4 className="font-black text-brand-text text-base md:text-[10px] sm:text-base lg:text-xl mb-1 truncate max-w-[56px] sm:max-w-none">{top5[2].name}</h4>
                  <div className="flex flex-col gap-1 items-center">
                    <div className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-widest inline-block">{top5[2].totalScore} نقطة</div>
                    <div className="flex items-center gap-1 text-emerald-600 text-[10px] font-black">
                      <Medal className="w-3 h-3" />
                      <span>{top5[2].badgeCount} أوسمة</span>
                    </div>
                  </div>
                </div>
                <div className="w-full h-8 lg:h-24 bg-gradient-to-b from-amber-50/50 to-transparent rounded-t-[40px] border-x-2 border-t-2 border-amber-200/20" />
              </motion.div>
            )}

            {/* 5th Place */}
            {top5[4] && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="order-5 shrink-0 flex flex-col items-center group"
              >
                <div className="relative mb-4 md:mb-6">
                  <div className="w-10 h-10 sm:w-16 sm:h-16 lg:w-24 lg:h-24 rounded-2xl sm:rounded-2xl lg:rounded-[24px] bg-white shadow-2xl flex items-center justify-center text-brand-beige font-black text-lg sm:text-xl lg:text-2xl border-4 border-slate-200 group-hover:scale-105 transition-transform duration-500 overflow-hidden">
                    {top5[4].photoUrl ? (
                      <img src={top5[4].photoUrl} alt={top5[4].name} className="w-full h-full object-cover" />
                    ) : top5[4].name[0]}
                  </div>
                  <div className="absolute -top-1 -right-1 sm:-top-3 sm:-right-3 w-6 h-6 sm:w-8 lg:w-8 bg-slate-500 text-white rounded-lg sm:rounded-xl flex items-center justify-center font-black text-xs sm:text-sm lg:text-base shadow-xl border sm:border-4 border-white rotate-12 group-hover:rotate-0 transition-all">5</div>
                </div>
                <div className="text-center mb-4 lg:mb-8">
                  <h4 className="font-black text-brand-text text-[8px] sm:text-[10px] md:text-base mb-1 truncate max-w-[40px] sm:max-w-[60px] md:max-w-none">{top5[4].name}</h4>
                  <div className="flex flex-col gap-1 items-center">
                    <div className="px-2 py-1 bg-slate-50 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-widest inline-block">{top5[4].totalScore} نقطة</div>
                    <div className="flex items-center gap-1 text-emerald-600 text-[10px] font-black">
                      <Medal className="w-3 h-3" />
                      <span>{top5[4].badgeCount} أوسمة</span>
                    </div>
                  </div>
                </div>
                <div className="w-full h-6 lg:h-16 bg-gradient-to-b from-slate-100/20 to-transparent rounded-t-[20px] border-x-2 border-t-2 border-slate-200/10" />
              </motion.div>
            )}
          </div>

          {/* List Section */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl md:rounded-[40px] border border-brand-beige/10 shadow-2xl shadow-brand-red/5 overflow-hidden">
              <div className="p-5 md:p-8 border-b border-brand-beige/5 bg-brand-cream/10 flex items-center justify-between">
                <h3 className="font-black text-brand-text flex items-center gap-2 md:gap-3 text-sm md:text-base">
                  <Users className="w-5 h-5 text-brand-red" />
                  قائمة الأبطال
                </h3>
              </div>
              <div className="divide-y divide-brand-beige/5">
                {remaining.map((p, idx) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    className={cn(
                      "p-4 md:p-6 flex items-center gap-3 md:gap-6 hover:bg-brand-cream/10 transition-colors",
                      p.id === user?.uid && "bg-brand-red/5 border-y border-brand-red/10"
                    )}
                  >
                    <div className="w-6 md:w-12 text-center font-black text-brand-beige text-sm md:text-xl">
                      {idx + 6}
                    </div>
                    
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-brand-cream border-2 border-white shadow-sm flex items-center justify-center text-brand-red font-black text-sm md:text-lg overflow-hidden">
                        {p.photoUrl ? (
                          <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" />
                        ) : p.name[0]}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-brand-text text-xs md:text-lg truncate">
                        {p.name}
                        {p.id === user?.uid && <span className="mr-1.5 md:mr-2 text-[8px] md:text-[10px] px-1.5 py-0.5 bg-brand-red text-white rounded-full">أنت</span>}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 md:gap-8 shrink-0">
                      <div className="flex items-center gap-1.5 md:gap-4 bg-brand-cream/30 px-2 md:px-6 py-1.5 md:py-3 rounded-xl border border-brand-beige/5 min-w-0 md:min-w-[180px]">
                        <div className="text-center flex-1">
                          <p className="text-[7px] md:text-[9px] font-black text-brand-beige uppercase tracking-widest mb-0.5 md:mb-1">الأوسمة</p>
                          <div className="flex items-center justify-center gap-0.5 md:gap-1 text-emerald-600 font-black text-xs md:text-sm">
                            <Medal className="w-2.5 h-2.5 md:w-3 md:h-3" />
                            <span>{p.badgeCount}</span>
                          </div>
                        </div>
                        <div className="w-px h-6 md:h-8 bg-brand-beige/10" />
                        <div className="text-center flex-1">
                          <p className="text-[7px] md:text-[9px] font-black text-brand-beige uppercase tracking-widest mb-0.5 md:mb-1">النقاط</p>
                          <p className="font-black text-brand-red text-xs md:text-xl">{p.totalScore}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
