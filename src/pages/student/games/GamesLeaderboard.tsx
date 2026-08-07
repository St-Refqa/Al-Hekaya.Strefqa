import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import { cn } from '../../../lib/utils';
import { Trophy, Star, ArrowRight, Medal } from 'lucide-react';

export default function GamesLeaderboard() {
  const { user } = useAuth();
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'gameScores'));
    const unsub = onSnapshot(q, snap => {
      const all = snap.docs.map(d => ({ uid: d.id, ...d.data() })) as any[];
      setPlayers(all.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const top3 = players.slice(0, 3);
  const rest = players.slice(3);
  const myRank = players.findIndex(p => p.uid === user?.uid) + 1;

  return (
    <div className="min-h-screen bg-brand-cream pb-24" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-600 to-purple-800 text-white px-5 pt-10 pb-16">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Link to="/student/games" className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <ArrowRight className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="font-black text-2xl">أبطال الألعاب 🏆</h1>
              <p className="text-violet-200 text-xs font-bold">إنجيل مارقس — السيزون الأول</p>
            </div>
          </div>
          {myRank > 0 && (
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-3 flex items-center gap-3">
              <Star className="w-5 h-5 text-amber-300 shrink-0" />
              <p className="font-bold text-sm">ترتيبك: <span className="font-black text-xl">#{myRank}</span></p>
              <div className="flex-1" />
              <p className="font-black">{players.find(p => p.uid === user?.uid)?.totalScore || 0} نقطة</p>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-8 space-y-5">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-4 border-violet-400 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : players.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-brand-beige/10">
            <p className="text-5xl mb-4">🎮</p>
            <p className="font-black text-brand-text">لا يوجد لاعبين حتى الآن</p>
            <p className="text-sm text-brand-beige mt-1">كن أول من يلعب!</p>
          </div>
        ) : (
          <>
            {/* Podium */}
            {top3.length > 0 && (
              <div className="bg-white rounded-3xl border border-brand-beige/10 shadow-sm overflow-hidden p-6">
                <div className="flex items-end justify-center gap-4">
                  {/* 2nd */}
                  {top3[1] && (
                    <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}
                      className="flex flex-col items-center gap-2 mb-2">
                      <div className={cn('w-16 h-16 rounded-2xl border-4 bg-slate-100 flex items-center justify-center font-black text-xl overflow-hidden',
                        top3[1].uid === user?.uid ? 'border-violet-400' : 'border-slate-300')}>
                        {top3[1].photoUrl
                          ? <img src={top3[1].photoUrl} className="w-full h-full object-cover" alt="" />
                          : <span className="text-slate-500">{(top3[1].fullName || '؟')[0]}</span>}
                      </div>
                      <div className="w-6 h-6 bg-slate-400 text-white rounded-lg flex items-center justify-center font-black text-xs">2</div>
                      <p className="font-black text-brand-text text-xs text-center max-w-[70px] truncate">
                        {top3[1].uid === user?.uid ? 'أنت' : (top3[1].fullName || '').split(' ')[0]}
                      </p>
                      <div className="bg-slate-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Star className="w-3 h-3 text-slate-500" />
                        <span className="font-black text-slate-600 text-xs">{top3[1].totalScore || 0}</span>
                      </div>
                    </motion.div>
                  )}
                  {/* 1st */}
                  {top3[0] && (
                    <motion.div initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }}
                      className="flex flex-col items-center gap-2">
                      <motion.div animate={{ y:[0,-6,0] }} transition={{ duration:2.5, repeat:Infinity }}
                        className="text-3xl">👑</motion.div>
                      <div className={cn('w-24 h-24 rounded-3xl border-4 bg-amber-50 flex items-center justify-center font-black text-2xl overflow-hidden shadow-xl',
                        top3[0].uid === user?.uid ? 'border-violet-500' : 'border-amber-400')}>
                        {top3[0].photoUrl
                          ? <img src={top3[0].photoUrl} className="w-full h-full object-cover" alt="" />
                          : <span className="text-amber-600">{(top3[0].fullName || '؟')[0]}</span>}
                      </div>
                      <p className="font-black text-brand-text text-sm text-center max-w-[90px] truncate">
                        {top3[0].uid === user?.uid ? 'أنت 🏆' : (top3[0].fullName || '').split(' ')[0]}
                      </p>
                      <div className="bg-amber-100 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-amber-600" />
                        <span className="font-black text-amber-700 text-sm">{top3[0].totalScore || 0}</span>
                      </div>
                    </motion.div>
                  )}
                  {/* 3rd */}
                  {top3[2] && (
                    <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }}
                      className="flex flex-col items-center gap-2 mb-2">
                      <div className={cn('w-14 h-14 rounded-2xl border-4 bg-amber-50 flex items-center justify-center font-black text-lg overflow-hidden',
                        top3[2].uid === user?.uid ? 'border-violet-400' : 'border-amber-300')}>
                        {top3[2].photoUrl
                          ? <img src={top3[2].photoUrl} className="w-full h-full object-cover" alt="" />
                          : <span className="text-amber-600">{(top3[2].fullName || '؟')[0]}</span>}
                      </div>
                      <div className="w-6 h-6 bg-amber-600 text-white rounded-lg flex items-center justify-center font-black text-xs">3</div>
                      <p className="font-black text-brand-text text-xs text-center max-w-[65px] truncate">
                        {top3[2].uid === user?.uid ? 'أنت' : (top3[2].fullName || '').split(' ')[0]}
                      </p>
                      <div className="bg-amber-50 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-500" />
                        <span className="font-black text-amber-700 text-xs">{top3[2].totalScore || 0}</span>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            )}

            {/* List */}
            {rest.length > 0 && (
              <div className="bg-white rounded-3xl border border-brand-beige/10 overflow-hidden shadow-sm">
                {rest.map((p, i) => (
                  <motion.div key={p.uid}
                    initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay: i * 0.04 }}
                    className={cn('flex items-center gap-3 px-4 py-4 border-b border-brand-beige/5 last:border-0',
                      p.uid === user?.uid && 'bg-violet-50')}>
                    <div className="w-8 text-center font-black text-brand-beige text-sm">{i + 4}</div>
                    <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center font-black text-violet-600 text-sm overflow-hidden shrink-0">
                      {p.photoUrl
                        ? <img src={p.photoUrl} className="w-full h-full object-cover" alt="" />
                        : (p.fullName || '؟')[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-brand-text text-sm truncate">
                        {p.fullName || 'لاعب'}
                        {p.uid === user?.uid && <span className="mr-1 text-[9px] bg-violet-500 text-white px-1.5 py-0.5 rounded-full">أنت</span>}
                      </p>
                      <p className="text-[10px] text-brand-beige font-bold">{p.gamesPlayed || 0} لعبة</p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-violet-50 border border-violet-100 px-3 py-1.5 rounded-xl shrink-0">
                      <Star className="w-3.5 h-3.5 text-violet-500" />
                      <span className="font-black text-violet-700 text-sm">{p.totalScore || 0}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
