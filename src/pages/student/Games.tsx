import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { collection, query, where, onSnapshot, doc, getDoc, getDocs } from 'firebase/firestore';
import { db, supabase } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { GAME_META, GameType } from '../../data/markQuestions';
import {
  Gamepad2, Flame, Trophy, Clock, Users, ChevronRight,
  Star, Zap, BookOpen, Calendar, Globe, UserCircle
} from 'lucide-react';
import { cn } from '../../lib/utils';

const GAME_TYPES: GameType[] = ['random', 'fill', 'where', 'who', 'match', 'order', 'speed'];

function getEgyptDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
}

export default function GamesHub() {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  
  useEffect(() => {
    const channel = supabase.channel('global-online-users');
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const users = Object.values(state).map((pArr: any) => pArr[0]);
      setOnlineUsers(users);
    });
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const [dailyDone, setDailyDone] = useState(false);
  const [dailyCompletedCount, setDailyCompletedCount] = useState(0);
  const [gameScores, setGameScores] = useState<any>(null);
  const [topPlayers, setTopPlayers] = useState<any[]>([]);
  const today = useMemo(() => getEgyptDate(), []);

  // Temporary fix for S001's stats
  useEffect(() => {
    if (user?.uid === 's001' && !localStorage.getItem('games_hub_fix_s001')) {
      import('firebase/firestore').then(async ({ doc, updateDoc, setDoc, getDoc, increment }) => {
        try {
          await updateDoc(doc(db, 'users', 's001'), { streak: increment(1) });
          
          const scoreRef = doc(db, 'gameScores', 's001');
          const snap = await getDoc(scoreRef);
          const data = snap.exists() ? snap.data() : {};
          await setDoc(scoreRef, {
            uid: 's001',
            fullName: user.fullName || 'Admin',
            photoUrl: user.photoUrl || null,
            totalScore: (data.totalScore || 0) + 5,
            gamesPlayed: (data.gamesPlayed || 0) + 1,
            // dailyCompleted is tracked via dailyChallenges table
          });

          localStorage.setItem('games_hub_fix_s001', 'done');
          window.location.reload();
        } catch (e) {
          console.error(e);
        }
      });
    }
  }, [user]);

  // Check if user already completed today's daily challenge and get total count
  useEffect(() => {
    if (!user) return;
    
    // Check today
    const id = `${user.uid}_${today}`;
    const ref = doc(db, 'dailyChallenges', id);
    getDoc(ref).then(snap => {
      if (snap.exists() && snap.data().completed) setDailyDone(true);
    }).catch(() => {});

    // Get total completed challenges
    const q = query(collection(db, 'dailyChallenges'), where('uid', '==', user.uid));
    getDocs(q).then(snap => {
      const count = snap.docs.filter(d => d.data().completed === true).length;
      setDailyCompletedCount(count);
    }).catch(e => console.error("Challenges query error:", e));
  }, [user, today]);

  // Load user game scores
  useEffect(() => {
    if (!user) return;
    const ref = doc(db, 'gameScores', user.uid);
    getDoc(ref).then(snap => {
      if (snap.exists()) setGameScores(snap.data());
    });
  }, [user]);

  useEffect(() => {
    const q = query(collection(db, 'gameScores'));
    getDocs(q).then(snap => {
      const all = snap.docs.map(d => ({ uid: d.id, ...d.data() })) as any[];
      const sorted = all.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0)).slice(0, 5);
      setTopPlayers(sorted);
    }).catch(error => {
      console.error("Error fetching gameScores:", error);
    });
  }, []);

  const hoursLeft = useMemo(() => {
    const now = new Date();
    const cairo = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Cairo' }));
    return 24 - cairo.getHours();
  }, []);

  return (
    <div className="min-h-screen bg-brand-cream pb-24 overflow-x-hidden" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-600 via-violet-700 to-purple-800 text-white px-5 pt-10 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {['✝️','📖','🎮','⚡','🔥','🏆','✨'].map((e,i) => (
            <motion.span
              key={i}
              className="absolute text-4xl select-none"
              style={{ top: `${10 + i*12}%`, right: `${5 + i*13}%` }}
              animate={{ y: [0,-10,0], rotate: [0,5,-5,0] }}
              transition={{ duration: 3+i, repeat: Infinity, delay: i*0.4 }}
            >{e}</motion.span>
          ))}
        </div>
        <div className="relative z-10 max-w-lg mx-auto text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}
            className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/30">
            <Gamepad2 className="w-10 h-10" />
          </motion.div>
          <motion.h1 initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
            className="text-3xl font-black mb-1">ألعاب الكتاب المقدس 🎮</motion.h1>
          <p className="text-violet-200 font-bold text-sm">إنجيل مارقس — السيزون الأول</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-8 space-y-5">

        {/* Daily Challenge Banner */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}>
          <Link to={dailyDone ? "#" : "/student/games/daily"}
            onClick={(e) => dailyDone && e.preventDefault()}
            className={cn(
              'block rounded-3xl p-5 border-2 shadow-xl relative overflow-hidden',
              dailyDone
                ? 'bg-emerald-50 border-emerald-200 cursor-default'
                : 'bg-gradient-to-br from-amber-400 to-orange-500 border-amber-300 text-white hover:scale-[1.02] transition-transform'
            )}>
            {!dailyDone && (
              <motion.div
                animate={{ x: ['-100%','100%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
              />
            )}
            <div className="flex items-center gap-4">
              <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0',
                dailyDone ? 'bg-emerald-100' : 'bg-white/20')}>
                {dailyDone ? '✅' : '⏰'}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('font-black text-lg', dailyDone ? 'text-emerald-800' : 'text-white')}>
                  {dailyDone ? 'أديت التحدي اليومي! 🎉' : 'التحدي اليومي'}
                </p>
                <p className={cn('text-sm font-bold', dailyDone ? 'text-emerald-600' : 'text-amber-100')}>
                  {dailyDone
                    ? 'عود غداً لتحدي جديد'
                    : `باقي ${hoursLeft} ساعة — ٥ أسئلة متنوعة`}
                </p>
              </div>
              {!dailyDone && <ChevronRight className="w-6 h-6 text-white shrink-0 rotate-180" />}
            </div>
            {!dailyDone && (
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 h-2 bg-white/30 rounded-full" />
                <span className="text-xs font-black text-amber-100">+5 نقط</span>
              </div>
            )}
          </Link>
        </motion.div>

        {/* My Stats */}
        {gameScores && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.1 }}
            className="bg-white rounded-3xl border border-brand-beige/10 p-4 shadow-sm">
            <h3 className="font-black text-brand-text mb-3 flex items-center gap-2 text-sm">
              <Star className="w-4 h-4 text-amber-500" /> إحصائياتك
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'النقاط', value: gameScores.totalScore || 0, icon: '🏆' },
                { label: 'ألعاب', value: gameScores.gamesPlayed || 0, icon: '🎮' },
                { label: 'تحديات', value: Math.max(dailyCompletedCount, gameScores?.dailyCompleted || 0), icon: '⚡' },
              ].map((s, i) => (
                <div key={i} className="bg-brand-cream/60 rounded-2xl p-3 text-center">
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <p className="font-black text-brand-text text-lg">{s.value}</p>
                  <p className="text-[10px] font-bold text-brand-beige">{s.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Game Types Grid */}
        <div>
          <h3 className="font-black text-brand-text mb-3 flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-violet-600" /> اختار لعبة
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {GAME_TYPES.map((type, i) => {
              const meta = GAME_META[type];
              
              let playCount = 0;
              try {
                const logs = JSON.parse(localStorage.getItem('gamePlays') || '{}');
                playCount = logs[`${today}_${type}`] || 0;
              } catch (e) {}
              const maxReached = playCount >= 3;

              return (
                <motion.div
                  key={type}
                  initial={{ opacity:0, scale:0.9 }}
                  animate={{ opacity:1, scale:1 }}
                  transition={{ delay: i * 0.06 }}
                  className={type === 'random' ? 'col-span-2' : ''}
                >
                  <Link to={maxReached ? "#" : `/student/games/play/${type}`}
                    onClick={(e) => maxReached && e.preventDefault()}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-3xl border-2 text-center transition-all block w-full h-full',
                      maxReached ? 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed' : cn('active:scale-95', meta.bg)
                    )}>
                    <span className={cn("text-4xl", maxReached && "grayscale")}>{meta.emoji}</span>
                    <span className={cn('font-black text-sm', maxReached ? 'text-gray-500' : meta.color)}>
                      {meta.label}
                    </span>
                    <span className="text-[10px] text-brand-beige font-bold leading-tight">
                      {maxReached ? 'انتهت المحاولات (3/3)' : `${playCount}/3 مرات اليوم`}
                    </span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Multiplayer */}
        <div>
          <h3 className="font-black text-brand-text mb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-red" /> العب مع أصحابك
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/student/games/create"
              className="flex flex-col items-center gap-2 p-5 bg-brand-red text-white rounded-3xl active:scale-95 transition-all shadow-lg shadow-brand-red/20">
              <Zap className="w-8 h-8" />
              <span className="font-black text-sm">إنشاء غرفة</span>
              <span className="text-[10px] text-red-200">حتى ٤ لاعبين</span>
            </Link>
            <Link to="/student/games/join"
              className="flex flex-col items-center gap-2 p-5 bg-white border-2 border-brand-red/20 text-brand-red rounded-3xl active:scale-95 transition-all">
              <Users className="w-8 h-8" />
              <span className="font-black text-sm">انضم بكود</span>
              <span className="text-[10px] text-brand-beige">ادخل كود الغرفة</span>
            </Link>
          </div>
        </div>

        {/* Online Users */}
        <div className="bg-emerald-50 rounded-3xl p-5 border border-emerald-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-emerald-800 flex items-center gap-2">
              <Globe className="w-5 h-5 text-emerald-500" /> متواجدون الآن
            </h3>
            <span className="bg-emerald-200 text-emerald-800 px-3 py-1 rounded-full text-xs font-black">
              {onlineUsers.filter(u => u.uid !== user?.uid).length} أصدقاء
            </span>
          </div>
          
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
            {onlineUsers.filter(u => u.uid !== user?.uid).map(u => (
              <div key={u.uid} className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-emerald-100 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-brand-cream overflow-hidden flex items-center justify-center shrink-0">
                  {u.photoUrl ? (
                    <img src={u.photoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle className="w-6 h-6 text-brand-beige" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-black text-brand-text text-sm">{u.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-emerald-600">أونلاين في الموقع</span>
                  </div>
                </div>
              </div>
            ))}
            {onlineUsers.filter(u => u.uid !== user?.uid).length === 0 && (
              <p className="text-center text-sm font-bold text-emerald-600 py-4 opacity-70">
                مفيش حد أونلاين دلوقتي غيرك
              </p>
            )}
          </div>
        </div>

        {/* Mini Leaderboard */}
        {topPlayers.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-brand-text flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" /> أبطال الألعاب
              </h3>
              <Link to="/student/games/leaderboard" className="text-xs font-black text-brand-red">الكل</Link>
            </div>
            <div className="bg-white rounded-3xl border border-brand-beige/10 overflow-hidden shadow-sm">
              {topPlayers.map((p, i) => (
                <div key={p.uid}
                  className={cn('flex items-center gap-3 px-4 py-3 border-b border-brand-beige/5 last:border-0',
                    p.uid === user?.uid && 'bg-violet-50')}>
                  <div className="w-7 font-black text-brand-beige text-center text-sm">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center font-black text-violet-600 text-sm shrink-0">
                    {(p.fullName || p.uid)?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-brand-text text-sm truncate">
                      {p.fullName || 'لاعب'}
                      {p.uid === user?.uid && <span className="mr-1 text-[9px] bg-violet-500 text-white px-1.5 py-0.5 rounded-full">أنت</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-xl">
                    <Star className="w-3 h-3 text-amber-500" />
                    <span className="font-black text-amber-700 text-sm">{p.totalScore || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tip */}
        <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4 flex gap-3">
          <BookOpen className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
          <p className="text-xs font-bold text-violet-700 leading-relaxed">
            الأسئلة كلها من إنجيل مارقس. كل إجابة صحيحة بنقطة واحدة. التحدي اليومي يُحسب في الـ Streak! 🔥
          </p>
        </div>
      </div>
    </div>
  );
}
