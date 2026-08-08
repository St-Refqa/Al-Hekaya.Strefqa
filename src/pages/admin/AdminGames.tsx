import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Gamepad2, Trophy, Flame, Search, Star, Zap, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { useTranslation } from 'react-i18next';

export default function AdminGames() {
  const { t, i18n } = useTranslation();
  const dir = i18n.language === 'ar' ? 'rtl' : 'ltr';

  const [users, setUsers] = useState<any[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'score' | 'games' | 'daily' | 'streak'>('score');

  // Temporary auto-fix for s001 requested by admin
  useEffect(() => {
    const fixS001 = async () => {
      if (localStorage.getItem('fixed_s001_streak')) return;
      try {
        const { doc, updateDoc, setDoc, increment } = await import('firebase/firestore');
        const userRef = doc(db, 'users', 's001');
        await updateDoc(userRef, {
          streak: increment(1),
          lastActive: new Date().toISOString()
        });
        
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
        const challengeRef = doc(db, 'daily_challenges', `s001_${today}`);
        await setDoc(challengeRef, {
          id: `s001_${today}`,
          uid: 's001',
          challengeDate: today,
          completed: true,
          score: 5
        });
        
        localStorage.setItem('fixed_s001_streak', 'done');
        console.log("S001 fixed!");
      } catch (err) {
        console.error("Fix failed", err);
      }
    };
    fixS001();
  }, []);

  // Load all students
  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs
        .map(d => ({ uid: d.id, ...d.data() }))
        .filter((u: any) => u.role === 'student');
      setUsers(data);
    });
    return () => unsub();
  }, []);

  // Load all game scores
  useEffect(() => {
    const q = query(collection(db, 'gameScores'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
      setScores(data);
    });
    return () => unsub();
  }, []);

  // Combine data
  const players = useMemo(() => {
    return users.map(user => {
      const scoreDoc = scores.find(s => s.uid === user.uid) || {};
      return {
        uid: user.uid,
        name: user.fullName || 'بدون اسم',
        code: user.code || '-',
        photoUrl: user.photoUrl,
        streak: user.streak || 0,
        totalScore: scoreDoc.totalScore || 0,
        gamesPlayed: scoreDoc.gamesPlayed || 0,
        dailyCompleted: Math.max(scoreDoc.dailyCompleted || 0, user.streak || 0),
        lastGame: scoreDoc.lastGame || null,
      };
    }).filter(p => p.gamesPlayed > 0 || p.streak > 0 || p.totalScore > 0); // Only show active players
  }, [users, scores]);

  // Sort and filter
  const filteredPlayers = useMemo(() => {
    return players
      .filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.code.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        if (sortBy === 'score') return b.totalScore - a.totalScore;
        if (sortBy === 'games') return b.gamesPlayed - a.gamesPlayed;
        if (sortBy === 'daily') return b.dailyCompleted - a.dailyCompleted;
        if (sortBy === 'streak') return b.streak - a.streak;
        return 0;
      });
  }, [players, searchTerm, sortBy]);

  const stats = useMemo(() => {
    return {
      totalActive: players.length,
      totalGames: players.reduce((acc, p) => acc + p.gamesPlayed, 0),
      totalPoints: players.reduce((acc, p) => acc + p.totalScore, 0),
    };
  }, [players]);

  return (
    <div className="p-4 md:p-8 space-y-8" dir={dir}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center text-violet-600 shadow-sm border border-violet-200">
            <Gamepad2 className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-brand-text">تقارير الألعاب 🎮</h1>
            <p className="text-brand-beige font-bold mt-1">تتبع نشاط ودرجات الطلاب في ألعاب الكتاب المقدس</p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-brand-beige/10 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Trophy className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-black text-brand-beige uppercase">إجمالي النقاط</p>
            <h4 className="text-2xl font-black text-brand-text">{stats.totalPoints}</h4>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-brand-beige/10 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Zap className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-black text-brand-beige uppercase">ألعاب لُعبت</p>
            <h4 className="text-2xl font-black text-brand-text">{stats.totalGames}</h4>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-brand-beige/10 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <Flame className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-black text-brand-beige uppercase">لاعبين نشطين</p>
            <h4 className="text-2xl font-black text-brand-text">{stats.totalActive}</h4>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-brand-beige/10 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-beige" />
          <input
            type="text"
            placeholder="ابحث بالاسم أو الكود..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-brand-cream/50 border border-brand-beige/20 rounded-xl py-3 pr-12 pl-4 outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 transition-all font-bold text-brand-text"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
          {[
            { id: 'score', label: 'الأعلى نقاطاً', icon: Star },
            { id: 'games', label: 'الأكثر لعباً', icon: Gamepad2 },
            { id: 'daily', label: 'التحدي اليومي', icon: Zap },
            { id: 'streak', label: 'أعلى ستريك', icon: Flame },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSortBy(tab.id as any)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-black flex items-center gap-2 whitespace-nowrap transition-all border",
                sortBy === tab.id
                  ? "bg-brand-red text-white border-brand-red shadow-md"
                  : "bg-white text-brand-beige border-brand-beige/20 hover:bg-brand-cream"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[32px] border border-brand-beige/10 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-brand-cream/50 border-b border-brand-beige/10">
              <tr>
                <th className="py-4 px-6 font-black text-brand-beige text-xs uppercase w-16 text-center">#</th>
                <th className="py-4 px-6 font-black text-brand-beige text-xs uppercase">الطالب</th>
                <th className="py-4 px-6 font-black text-brand-beige text-xs uppercase text-center">الكود</th>
                <th className="py-4 px-6 font-black text-brand-beige text-xs uppercase text-center">النقاط 🏆</th>
                <th className="py-4 px-6 font-black text-brand-beige text-xs uppercase text-center">الألعاب 🎮</th>
                <th className="py-4 px-6 font-black text-brand-beige text-xs uppercase text-center">التحديات ⚡</th>
                <th className="py-4 px-6 font-black text-brand-beige text-xs uppercase text-center">ستريك 🔥</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-beige/5">
              {filteredPlayers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-brand-beige font-black">
                    لا يوجد لاعبين يطابقون البحث
                  </td>
                </tr>
              ) : (
                filteredPlayers.map((p, idx) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={p.uid} 
                    className="hover:bg-brand-cream/30 transition-colors"
                  >
                    <td className="py-4 px-6 text-center">
                      <div className={cn(
                        "w-8 h-8 mx-auto rounded-xl flex items-center justify-center font-black text-sm",
                        idx === 0 ? "bg-amber-100 text-amber-600" :
                        idx === 1 ? "bg-slate-100 text-slate-600" :
                        idx === 2 ? "bg-orange-100 text-orange-700" :
                        "bg-brand-cream text-brand-beige"
                      )}>
                        {idx + 1}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center font-black text-violet-600 overflow-hidden shrink-0">
                          {p.photoUrl ? <img src={p.photoUrl} alt="" className="w-full h-full object-cover" /> : p.name[0]}
                        </div>
                        <div>
                          <p className="font-black text-brand-text text-sm">{p.name}</p>
                          {p.lastGame && (
                            <p className="text-[10px] text-brand-beige font-bold flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" />
                              أخر لعبة: {new Date(p.lastGame).toLocaleDateString('ar-EG')}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="bg-brand-cream/50 px-2 py-1 rounded-lg text-xs font-bold text-brand-beige">
                        {p.code}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-full text-sm">
                        {p.totalScore}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center font-black text-brand-text text-sm">
                      {p.gamesPlayed}
                    </td>
                    <td className="py-4 px-6 text-center font-black text-brand-text text-sm">
                      {p.dailyCompleted}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-1 bg-orange-50 text-orange-600 px-3 py-1 rounded-full w-fit mx-auto">
                        <Flame className="w-4 h-4" />
                        <span className="font-black text-sm">{p.streak}</span>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
