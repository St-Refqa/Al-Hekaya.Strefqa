import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  doc, getDoc, setDoc, updateDoc, increment, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import {
  allQuestions, GameQuestion, GAME_CONFIG, GAME_META,
  fillQuestions, whereQuestions, whoQuestions, speedQuestions,
} from '../../../data/markQuestions';
import { cn } from '../../../lib/utils';
import { Clock, ArrowRight, CheckCircle2, XCircle, Zap, Star } from 'lucide-react';

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function getEgyptDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
}

function getDailyQuestions(): GameQuestion[] {
  const pool = shuffle([...fillQuestions, ...whereQuestions, ...whoQuestions, ...speedQuestions]);
  return pool.slice(0, 5);
}

export default function DailyChallenge() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = useMemo(() => getEgyptDate(), []);

  const [phase, setPhase] = useState<'loading' | 'already' | 'intro' | 'playing' | 'done'>('loading');
  const [questions] = useState<GameQuestion[]>(() => getDailyQuestions());
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [selected, setSelected] = useState<string | null>(null);
  const [prevScore, setPrevScore] = useState<number | null>(null);

  const currentQ = questions[qIndex];
  const maxTime = 20;

  useEffect(() => {
    if (!user?.uid) return;
    let isMounted = true;

    const ref = doc(db, 'dailyChallenges', today);
    getDoc(ref).then(snap => {
      if (!isMounted) return;
      setPhase(p => {
        if (p !== 'loading') return p; // Don't interrupt if already past loading phase
        
        if (snap.exists() && snap.data()?.completedBy?.[user.uid]) {
          setPrevScore(snap.data().completedBy[user.uid].score || 0);
          return 'already';
        }
        return 'intro';
      });
    }).catch(() => {
      if (isMounted) setPhase(p => p === 'loading' ? 'intro' : p);
    });

    return () => { isMounted = false; };
  }, [user?.uid, today]);

  // Timer
  useEffect(() => {
    if (phase !== 'playing') return;
    if (selected) return; // Stop timer if an answer is selected

    const interval = setInterval(() => {
      setTimeLeft(t => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [qIndex, phase, selected]);

  useEffect(() => {
    if (phase === 'playing' && timeLeft === 0 && !selected) {
      handleTimeout();
    }
  }, [timeLeft, phase, selected]);

  useEffect(() => {
    if (phase === 'playing') {
      setTimeLeft(maxTime);
    }
  }, [qIndex, phase]);

  function handleTimeout() {
    setSelected('__timeout__');
    setTimeout(nextQuestion, 800);
  }

  function pick(opt: string) {
    if (selected) return;
    setSelected(opt);
    const isCorrect = opt === currentQ.answer;
    if (isCorrect) {
      setScore(s => s + 1);
      setCorrect(c => c + 1);
    }
    setTimeout(nextQuestion, 800);
  }

  function nextQuestion() {
    if (qIndex + 1 >= questions.length) {
      finishGame();
    } else {
      setSelected(null);
      setQIndex(i => i + 1);
    }
  }

  function finishGame() {
    setPhase('done');
    if (!user) return;
    const id = `${user.uid}_${today}`;
    const dailyRef = doc(db, 'dailyChallenges', id);
    const scoreRef = doc(db, 'gameScores', user.uid);

    setDoc(dailyRef, {
      id,
      uid: user.uid,
      challengeDate: today,
      completed: true,
      score: score
    }).catch(() => {});

    getDoc(scoreRef).then(snap => {
      const data = snap.exists() ? snap.data() : {};
      return setDoc(scoreRef, {
        uid: user.uid,
        fullName: user.fullName,
        photoUrl: user.photoUrl || null,
        totalScore: (data.totalScore || 0) + score,
        gamesPlayed: (data.gamesPlayed || 0) + 1,
        dailyCompleted: (data.dailyCompleted || 0) + 1,
      });
    }).catch(() => {});
  }

  const pct = (timeLeft / maxTime) * 100;
  const timerColor = pct > 60 ? 'bg-emerald-500' : pct > 30 ? 'bg-amber-500' : 'bg-red-500';
  const opts = useMemo(() => shuffle(currentQ?.options || []), [qIndex]);

  // ── Screens ──────────────────────────────────────────────
  if (phase === 'loading') return (
    <div className="min-h-screen bg-brand-cream flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (phase === 'already') return (
    <div className="min-h-screen bg-brand-cream flex flex-col items-center justify-center p-6 text-center" dir="rtl">
      <div className="text-7xl mb-4">✅</div>
      <h2 className="text-2xl font-black text-brand-text mb-2">أديت التحدي اليومي!</h2>
      <p className="text-brand-beige font-bold mb-2">نقاطك النهارده: <span className="text-amber-600 font-black text-xl">{prevScore}</span></p>
      <p className="text-sm text-brand-beige mb-8">عود غداً لتحدي جديد 🌅</p>
      <Link to="/student/games" className="px-8 py-4 bg-amber-400 text-white font-black rounded-2xl shadow-lg shadow-amber-400/20">
        رجوع للألعاب
      </Link>
    </div>
  );

  if (phase === 'intro') return (
    <div className="min-h-screen bg-gradient-to-br from-amber-400 to-orange-500 flex flex-col items-center justify-center p-6 text-center text-white" dir="rtl">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}
        className="text-8xl mb-6">⏰</motion.div>
      <h2 className="text-3xl font-black mb-2">التحدي اليومي</h2>
      <p className="text-amber-100 font-bold text-lg mb-2">إنجيل مارقس</p>
      <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-5 mb-8 w-full max-w-xs space-y-3">
        <div className="flex items-center gap-3 text-right">
          <span className="text-2xl">❓</span>
          <span className="font-bold text-sm">٥ أسئلة متنوعة كل يوم</span>
        </div>
        <div className="flex items-center gap-3 text-right">
          <span className="text-2xl">⏱️</span>
          <span className="font-bold text-sm">٢٠ ثانية لكل سؤال</span>
        </div>
        <div className="flex items-center gap-3 text-right">
          <span className="text-2xl">⭐</span>
          <span className="font-bold text-sm">نقطة واحدة لكل إجابة صحيحة</span>
        </div>
        <div className="flex items-center gap-3 text-right">
          <span className="text-2xl">🔥</span>
          <span className="font-bold text-sm">يُحسب في Streak يومي</span>
        </div>
      </div>
      <motion.button whileTap={{ scale: 0.96 }} onClick={() => setPhase('playing')}
        className="w-full max-w-xs py-5 bg-white text-amber-600 font-black text-xl rounded-3xl shadow-2xl shadow-amber-600/20">
        ابدأ التحدي! 🚀
      </motion.button>
    </div>
  );

  if (phase === 'done') {
    const accuracy = Math.round((correct / questions.length) * 100);
    return (
      <div className="min-h-screen bg-brand-cream flex flex-col items-center justify-center p-6 text-center" dir="rtl">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}
          className="text-8xl mb-4">{accuracy >= 80 ? '🏆' : accuracy >= 60 ? '🎯' : '📖'}</motion.div>
        <h2 className="text-3xl font-black text-brand-text mb-1">أحسنت!</h2>
        <p className="text-brand-beige font-bold mb-6">اكتمل التحدي اليومي ✅</p>
        <div className="bg-white rounded-3xl p-6 border border-brand-beige/10 shadow-xl w-full max-w-xs mb-6 space-y-4">
          <p className="text-5xl font-black text-amber-500">{score}</p>
          <p className="text-sm font-bold text-brand-beige">نقطة كسبتها اليوم</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 rounded-2xl p-3">
              <p className="font-black text-emerald-700 text-2xl">{correct}</p>
              <p className="text-[10px] font-bold text-emerald-600">إجابة صح</p>
            </div>
            <div className="bg-red-50 rounded-2xl p-3">
              <p className="font-black text-red-600 text-2xl">{questions.length - correct}</p>
              <p className="text-[10px] font-bold text-red-500">إجابة غلط</p>
            </div>
          </div>
          <div className="h-3 bg-brand-cream rounded-full overflow-hidden">
            <motion.div className="h-full bg-amber-400 rounded-full" initial={{ width: 0 }}
              animate={{ width: `${accuracy}%` }} transition={{ duration: 1, delay: 0.5 }} />
          </div>
        </div>
        <Link to="/student/games"
          className="w-full max-w-xs py-4 bg-amber-400 text-white font-black rounded-2xl shadow-lg text-center block">
          رجوع للألعاب 🎮
        </Link>
      </div>
    );
  }

  // Playing
  if (phase === 'playing' && !currentQ) {
    return <div className="min-h-screen bg-brand-cream flex items-center justify-center font-black">جاري التحميل...</div>;
  }

  return (
    <div className="min-h-screen bg-brand-cream pb-10" dir="rtl">
      <div className="bg-gradient-to-br from-amber-400 to-orange-500 text-white px-5 pt-8 pb-8">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <Link to="/student/games" className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <ArrowRight className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full">
              <Zap className="w-3 h-3" />
              <span className="font-black">{score}</span>
            </div>
          </div>
          <p className="font-black text-amber-100 text-sm mb-2">التحدي اليومي — سؤال {qIndex + 1} من {questions.length}</p>
          <div className="flex gap-2">
            {questions.map((_, i) => (
              <div key={i} className={cn('h-2 flex-1 rounded-full',
                i < qIndex ? 'bg-white' : i === qIndex ? 'bg-white/70' : 'bg-white/30')} />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-2 pt-6 space-y-4">
        {/* Timer */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-3 bg-brand-beige/20 rounded-full overflow-hidden">
            <motion.div className={cn('h-full rounded-full transition-colors', timerColor)}
              style={{ width: `${pct}%` }} />
          </div>
          <div className="flex items-center gap-1 text-brand-beige font-black text-sm shrink-0">
            <Clock className="w-4 h-4" />{timeLeft}
          </div>
        </div>

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div key={qIndex} initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-20 }}>
            <div className="bg-white rounded-3xl p-5 border border-brand-beige/10 shadow-sm mb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{GAME_META[currentQ.type].emoji}</span>
                <span className="text-xs font-black text-brand-beige uppercase tracking-widest">
                  {GAME_META[currentQ.type].label}
                </span>
              </div>
              <p className="font-black text-brand-text text-base leading-relaxed">{currentQ.question}</p>
              {currentQ.hint && <p className="text-xs text-brand-beige mt-2 font-bold">💡 {currentQ.hint}</p>}
            </div>

            <div className="flex flex-col gap-3">
              {opts.map((opt, i) => {
                const isCorrect = opt === currentQ.answer;
                const isSelected = opt === selected;
                let cls = 'bg-white border-2 border-brand-beige/20 text-brand-text';
                if (selected && selected !== '__timeout__') {
                  if (isCorrect) cls = 'bg-emerald-500 border-emerald-500 text-white';
                  else if (isSelected) cls = 'bg-red-500 border-red-500 text-white';
                  else cls = 'bg-white border-brand-beige/10 text-brand-beige/40';
                }
                return (
                  <motion.button key={i} whileTap={{ scale: 0.97 }} onClick={() => pick(opt)}
                    className={cn('w-full p-4 rounded-2xl font-black text-right flex items-center gap-3 transition-all', cls)}>
                    <span className="w-7 h-7 rounded-xl bg-black/5 flex items-center justify-center text-xs shrink-0">
                      {['أ','ب','ج','د'][i]}
                    </span>
                    <span className="flex-1">{opt}</span>
                    {selected && selected !== '__timeout__' && isCorrect && <CheckCircle2 className="w-5 h-5 shrink-0" />}
                    {selected && isSelected && !isCorrect && <XCircle className="w-5 h-5 shrink-0" />}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
