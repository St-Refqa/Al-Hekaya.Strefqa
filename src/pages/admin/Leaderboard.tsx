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

export default function Leaderboard() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [userMap, setUserMap] = useState<Record<string, User>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "OT" | "NT" | "K">("all");
  const { isAdmin } = useAuth();
  const { i18n } = useTranslation();

  useEffect(() => {
    if (!isAdmin) return;

    const unsubscribeUsers = onSnapshot(query(collection(db, "users"), where("role", "==", "student")), (usersSnap) => {
      const uMap: Record<string, User> = {};
      usersSnap.forEach(doc => {
        const data = doc.data() as User;
        uMap[doc.id] = data;
      });
      setUserMap(uMap);
    }, (err) => {
      console.error("Error fetching users:", err);
    });

    const q = query(collection(db, "submissions"), orderBy("date", "desc"));
    const unsubscribeSubmissions = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Submission,
        );
        setSubmissions(data);
        setIsLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "submissions");
      },
    );

    return () => {
      unsubscribeUsers();
      unsubscribeSubmissions();
    };
  }, [isAdmin]);

  const leaderboardData = useMemo(() => {
    const participants: Record<string, { 
      name: string; 
      id: string; 
      totalScore: number; 
      maxPossibleScore: number; 
      actualScoreSum: number;
      count: number;
      avgAccuracy: number;
      streak: number;
      photoUrl?: string;
      code?: string;
    }> = {};

    // 1. Pre-populate all active students so they appear in the leaderboard even without submissions
    Object.entries(userMap).forEach(([uid, u]) => {
      participants[uid] = {
        name: u.fullName || "بدون اسم",
        id: uid,
        totalScore: u.cumulativePoints ?? u.totalPoints ?? 0,
        maxPossibleScore: 0,
        actualScoreSum: 0,
        count: 0,
        avgAccuracy: 0,
        streak: u.streak || 0,
        photoUrl: u.photoUrl,
        code: u.code
      };
    });

    // 2. Aggregate statistics from submissions (but keep Leaderboard points retrieved directly from user profile to respect admin manual edits)
    submissions.forEach(s => {
      const pId = s.participantId || s.participantPhoneOrId;
      if (participants[pId]) {
        participants[pId].maxPossibleScore += (s.maxScore || 1);
        participants[pId].actualScoreSum += (s.finalScore || 0);
        participants[pId].count += 1;
        participants[pId].streak = Math.max(participants[pId].streak, s.streakCount || 0);
      } else {
        // Fallback for participants who have submissions but might not be in userMap
        participants[pId] = {
          name: s.participantName,
          id: pId,
          totalScore: s.finalScore,
          maxPossibleScore: s.maxScore || 1,
          actualScoreSum: s.finalScore || 0,
          count: 1,
          avgAccuracy: 0,
          streak: s.streakCount || 0,
          photoUrl: s.participantPhotoUrl,
          code: undefined
        };
      }
    });

    return Object.values(participants)
      .map(p => ({
        ...p,
        avgAccuracy: p.maxPossibleScore > 0 ? Math.min(p.actualScoreSum / p.maxPossibleScore, 1) : 0,
        photoUrl: userMap[p.id]?.photoUrl || p.photoUrl
      }))
      .filter(p => !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.id.toLowerCase().includes(searchTerm.toLowerCase()))
      .filter(p => {
        if (categoryFilter === "all") return true;
        const code = p.code?.toUpperCase() || "";
        if (categoryFilter === "OT" && code.startsWith("H")) return true;
        if (categoryFilter === "NT" && code.startsWith("N")) return true;
        if (categoryFilter === "K" && code.startsWith("S")) return true;
        return false;
      })
      .sort((a, b) => b.totalScore - a.totalScore || b.avgAccuracy - a.avgAccuracy);
  }, [submissions, searchTerm, userMap, categoryFilter]);

  const top5 = leaderboardData.slice(0, 5);
  const remaining = leaderboardData.slice(5);

  return (
    <div className={cn("max-w-7xl mx-auto px-4 sm:px-6 py-12", i18n.language === 'ar' ? 'text-right' : 'text-left')} dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-8">
        <div className="flex items-center gap-6">
          <Link
            to="/admin"
            className="p-4 bg-white border border-brand-beige/20 rounded-2xl hover:bg-brand-cream transition-all shadow-sm group"
          >
            <ArrowLeft className="w-5 h-5 text-brand-beige group-hover:text-brand-red group-hover:-translate-x-1 transition-all" />
          </Link>
          <div>
            <h1 className="text-5xl font-black tracking-tight text-brand-text mb-2">
              لوحة المتصدرين
            </h1>
            <p className="text-brand-beige font-bold text-lg">
              ترتيب الأبطال بناءً على إجمالي النقاط ودقة الإجابات.
            </p>
          </div>
        </div>

        <div className="relative w-full md:max-w-md">
          <Search className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-beige" />
          <input
            type="text"
            placeholder="ابحث عن بطل..."
            value={searchTerm || ''}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-14 pl-6 py-5 bg-white border-2 border-brand-beige/10 rounded-[24px] focus:ring-4 focus:ring-brand-red/5 focus:border-brand-red/20 outline-none transition-all font-bold text-brand-text shadow-sm"
          />
        </div>
      </div>
      
      <div className="flex gap-2 overflow-x-auto pb-4 custom-scrollbar mb-8">
          {[
            { id: 'all', label: 'الجميع' },
            { id: 'OT', label: 'طلاب اونلاين (H)' },
            { id: 'NT', label: 'طلاب الورشة (N)' },
            { id: 'K', label: 'الخدام (S)' }
          ].map(cat => (
             <button 
               key={cat.id} 
               onClick={() => setCategoryFilter(cat.id as any)}
               className={cn("px-6 py-3 rounded-2xl font-bold whitespace-nowrap transition-all", categoryFilter === cat.id ? 'bg-brand-red text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50')}
             >
               {cat.label}
             </button>
          ))}
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
                <div className="relative mb-6">
                  <div className="w-12 h-12 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-2xl sm:rounded-[28px] bg-white shadow-2xl flex items-center justify-center text-brand-beige font-black text-3xl border-4 border-slate-200 group-hover:scale-105 transition-transform duration-500 overflow-hidden">
                    {top5[3].photoUrl ? (
                      <img src={top5[3].photoUrl} alt={top5[3].name} className="w-full h-full object-cover" />
                    ) : top5[3].name[0]}
                  </div>
                  <div className="absolute -top-3 -right-3 w-10 h-10 bg-slate-400 text-white rounded-xl flex items-center justify-center font-black text-lg shadow-xl border-4 border-white rotate-12 group-hover:rotate-0 transition-all">4</div>
                </div>
                <div className="text-center mb-6">
                  <h4 className="font-black text-brand-text text-[9px] sm:text-sm lg:text-lg mb-1 truncate max-w-[48px] sm:max-w-none">{top5[3].name}</h4>
                  <div className="flex items-center justify-center gap-2">
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-widest">{top5[3].totalScore} نقطة</span>
                    <span className="text-[10px] font-black text-brand-beige">{(top5[3].avgAccuracy * 100).toFixed(0)}% دقة</span>
                  </div>
                </div>
                <div className="w-full h-20 bg-gradient-to-b from-slate-100/30 to-transparent rounded-t-[30px] border-x-2 border-t-2 border-slate-200/20" />
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
                <div className="relative mb-6">
                  <div className="w-14 h-14 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-2xl sm:rounded-[32px] bg-white shadow-2xl flex items-center justify-center text-brand-beige font-black text-4xl border-4 border-slate-200 group-hover:scale-105 transition-transform duration-500 overflow-hidden">
                    {top5[1].photoUrl ? (
                      <img src={top5[1].photoUrl} alt={top5[1].name} className="w-full h-full object-cover" />
                    ) : top5[1].name[0]}
                  </div>
                  <div className="absolute -top-4 -right-4 w-12 h-12 bg-slate-200 text-slate-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-xl border-4 border-white rotate-12 group-hover:rotate-0 transition-all">2</div>
                  <Medal className="absolute -bottom-4 -left-4 w-10 h-10 text-slate-300 drop-shadow-lg" />
                </div>
                <div className="text-center mb-8">
                  <h4 className="font-black text-brand-text text-[10px] sm:text-base lg:text-xl mb-1 truncate max-w-[56px] sm:max-w-none">{top5[1].name}</h4>
                  <div className="flex items-center justify-center gap-2">
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-widest">{top5[1].totalScore} نقطة</span>
                    <span className="text-[10px] font-black text-brand-beige">{(top5[1].avgAccuracy * 100).toFixed(0)}% دقة</span>
                  </div>
                </div>
                <div className="w-full h-32 bg-gradient-to-b from-slate-100/50 to-transparent rounded-t-[40px] border-x-2 border-t-2 border-slate-200/30" />
              </motion.div>
            )}

            {/* 1st Place */}
            {top5[0] && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1.1 }}
                className="order-1 shrink-0 flex flex-col items-center relative z-10"
              >
                <div className="relative mb-8">
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="absolute -top-16 left-1/2 -translate-x-1/2"
                  >
                    <Crown className="w-16 h-16 text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.5)]" />
                  </motion.div>
                  
                  <div className="w-16 h-16 sm:w-32 sm:h-32 lg:w-36 lg:h-36 rounded-[32px] sm:rounded-[40px] bg-white shadow-[0_20px_50px_rgba(251,191,36,0.15)] flex items-center justify-center text-brand-red font-black text-5xl border-4 border-amber-400 overflow-hidden ring-8 ring-amber-400/5 relative">
                     {top5[0].photoUrl ? (
                      <img src={top5[0].photoUrl} alt={top5[0].name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="relative z-10">{top5[0].name[0]}</span>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-amber-400/20 to-transparent" />
                  </div>
                  
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-brand-text text-white px-6 py-2 rounded-2xl font-black text-xs shadow-2xl border-2 border-white/10 uppercase tracking-widest">البطل المنتظر</div>
                </div>
                
                <div className="text-center mb-10">
                  <h4 className="font-black text-brand-text text-xs sm:text-2xl lg:text-3xl mb-1 lg:mb-2 tracking-tight truncate max-w-[64px] sm:max-w-none">{top5[0].name}</h4>
                  <div className="flex items-center justify-center gap-3">
                    <div className="px-4 py-1.5 bg-amber-400 text-white rounded-full text-xs font-black shadow-lg shadow-amber-400/20">{top5[0].totalScore} نقطة</div>
                    <div className="flex items-center gap-1 text-sm font-black text-amber-600">
                      <Target className="w-4 h-4" />
                      {(top5[0].avgAccuracy * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
                <div className="w-full h-48 bg-gradient-to-b from-amber-50 to-transparent rounded-t-[50px] border-x-2 border-t-2 border-amber-200/30 shadow-[0_-20px_50px_rgba(251,191,36,0.1)]" />
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
                <div className="relative mb-6">
                  <div className="w-28 h-28 rounded-[32px] bg-white shadow-2xl flex items-center justify-center text-brand-beige font-black text-4xl border-4 border-amber-100 group-hover:scale-105 transition-transform duration-500 overflow-hidden">
                    {top5[2].photoUrl ? (
                      <img src={top5[2].photoUrl} alt={top5[2].name} className="w-full h-full object-cover" />
                    ) : top5[2].name[0]}
                  </div>
                  <div className="absolute -top-4 -right-4 w-12 h-12 bg-amber-600 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-xl border-4 border-white rotate-12 group-hover:rotate-0 transition-all">3</div>
                  <Medal className="absolute -bottom-4 -left-4 w-10 h-10 text-amber-700 drop-shadow-lg" />
                </div>
                <div className="text-center mb-8">
                  <h4 className="font-black text-brand-text text-[10px] sm:text-base lg:text-xl mb-1 truncate max-w-[56px] sm:max-w-none">{top5[2].name}</h4>
                  <div className="flex items-center justify-center gap-2">
                    <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-widest">{top5[2].totalScore} نقطة</span>
                    <span className="text-[10px] font-black text-brand-beige">{(top5[2].avgAccuracy * 100).toFixed(0)}% دقة</span>
                  </div>
                </div>
                <div className="w-full h-24 bg-gradient-to-b from-amber-50/50 to-transparent rounded-t-[40px] border-x-2 border-t-2 border-amber-200/20" />
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
                <div className="relative mb-6">
                  <div className="w-10 h-10 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-2xl sm:rounded-[24px] bg-white shadow-2xl flex items-center justify-center text-brand-beige font-black text-2xl border-4 border-slate-200 group-hover:scale-105 transition-transform duration-500 overflow-hidden">
                    {top5[4].photoUrl ? (
                      <img src={top5[4].photoUrl} alt={top5[4].name} className="w-full h-full object-cover" />
                    ) : top5[4].name[0]}
                  </div>
                  <div className="absolute -top-3 -right-3 w-8 h-8 bg-slate-500 text-white rounded-lg flex items-center justify-center font-black text-base shadow-xl border-4 border-white rotate-12 group-hover:rotate-0 transition-all">5</div>
                </div>
                <div className="text-center mb-6">
                  <h4 className="font-black text-brand-text text-[8px] sm:text-xs lg:text-base mb-1 truncate max-w-[40px] sm:max-w-none">{top5[4].name}</h4>
                  <div className="flex items-center justify-center gap-2">
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-widest">{top5[4].totalScore} نقطة</span>
                    <span className="text-[10px] font-black text-brand-beige">{(top5[4].avgAccuracy * 100).toFixed(0)}%</span>
                  </div>
                </div>
                <div className="w-full h-16 bg-gradient-to-b from-slate-100/20 to-transparent rounded-t-[20px] border-x-2 border-t-2 border-slate-200/10" />
              </motion.div>
            )}
          </div>

          {/* List Section */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-[40px] border border-brand-beige/10 shadow-2xl shadow-brand-red/5 overflow-hidden">
              <div className="p-8 border-b border-brand-beige/5 bg-brand-cream/10 flex items-center justify-between">
                <h3 className="font-black text-brand-text flex items-center gap-3">
                  <Users className="w-5 h-5 text-brand-red" />
                  باقي الترتيب
                </h3>
                <span className="text-[10px] font-black text-brand-beige uppercase tracking-widest">{remaining.length} بطل إضافي</span>
              </div>
              <div className="divide-y divide-brand-beige/5">
                {remaining.map((p, idx) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    className="p-6 flex items-center gap-6 hover:bg-brand-cream/10 transition-colors"
                  >
                    <div className="w-12 text-center font-black text-brand-beige text-xl">
                      {idx + 6}
                    </div>
                    
                    <div className="relative">
                      <div className="w-14 h-14 rounded-2xl bg-brand-cream border-2 border-white shadow-sm flex items-center justify-center text-brand-red font-black text-lg overflow-hidden">
                        {p.photoUrl ? (
                          <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" />
                        ) : p.name[0]}
                      </div>
                    </div>

                    <div className="flex-1">
                      <h4 className="font-black text-brand-text text-lg">{p.name}</h4>
                      <p className="text-[10px] text-brand-beige font-bold uppercase tracking-widest">ID: {p.id.slice(0, 8)}</p>
                    </div>

                    <div className="flex items-center gap-8">
                       <div className="text-center group">
                        <p className="text-[9px] font-black text-brand-beige uppercase tracking-widest mb-1 group-hover:text-amber-500 transition-colors">الدقة</p>
                        <p className="font-black text-brand-text text-lg">{(p.avgAccuracy * 100).toFixed(0)}%</p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-[9px] font-black text-brand-beige uppercase tracking-widest mb-1">الاختبارات</p>
                        <p className="font-black text-brand-text text-lg">{p.count}</p>
                      </div>

                      <div className="bg-brand-cream/30 px-6 py-3 rounded-2xl border border-brand-beige/5 text-center min-w-[120px]">
                        <p className="text-[9px] font-black text-brand-beige uppercase tracking-widest mb-1">إجمالي النقاط</p>
                        <p className="font-black text-brand-red text-xl">{p.totalScore}</p>
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
