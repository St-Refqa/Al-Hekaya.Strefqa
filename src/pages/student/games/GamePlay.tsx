import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { doc, setDoc, updateDoc, increment, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import {
  GameType, GameQuestion, MatchPair, OrderItem,
  fillQuestions, whereQuestions, whoQuestions,
  speedQuestions, matchQuestions, orderQuestions,
  GAME_CONFIG, GAME_META,
} from '../../../data/markQuestions';
import { cn } from '../../../lib/utils';
import { ArrowRight, Clock, CheckCircle2, XCircle, Zap, Trophy, Home } from 'lucide-react';

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function getQuestionsForType(type: GameType): GameQuestion[] {
  const map: Record<GameType, GameQuestion[]> = {
    fill: fillQuestions,
    where: whereQuestions,
    who: whoQuestions,
    speed: speedQuestions,
    match: matchQuestions,
    order: orderQuestions,
  };
  return shuffle(map[type]).slice(0, GAME_CONFIG.questionsPerRound);
}

// ────────────────────────────────────────────────────────────
// Sub-components for each game type
// ────────────────────────────────────────────────────────────

// MCQ (fill / where / who / speed)
function MCQGame({ question, onAnswer, timeLeft, maxTime }: {
  question: GameQuestion; onAnswer: (ans: string) => void;
  timeLeft: number; maxTime: number;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const opts = useMemo(() => shuffle(question.options!), [question.id]);

  function pick(opt: string) {
    if (selected) return;
    setSelected(opt);
    setTimeout(() => onAnswer(opt), 700);
  }

  const pct = (timeLeft / maxTime) * 100;
  const timerColor = pct > 50 ? 'bg-emerald-500' : pct > 25 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="flex flex-col gap-4">
      {/* Timer bar */}
      <div className="h-2 bg-brand-beige/20 rounded-full overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full transition-colors', timerColor)}
          style={{ width: `${pct}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      <div className="flex items-center justify-between text-xs font-bold text-brand-beige">
        <span>{question.hint && `💡 ${question.hint}`}</span>
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeLeft}s</span>
      </div>

      {/* Question */}
      <div className="bg-white rounded-3xl p-5 border border-brand-beige/10 shadow-sm">
        <p className="font-black text-brand-text text-base leading-relaxed text-center" dir="rtl">
          {question.question}
        </p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 gap-3">
        {opts.map((opt, i) => {
          const isCorrect = opt === question.answer;
          const isSelected = opt === selected;
          let cls = 'bg-white border-2 border-brand-beige/20 text-brand-text';
          if (selected) {
            if (isCorrect) cls = 'bg-emerald-500 border-emerald-500 text-white';
            else if (isSelected) cls = 'bg-red-500 border-red-500 text-white';
            else cls = 'bg-white border-brand-beige/10 text-brand-beige/50';
          }
          return (
            <motion.button
              key={i}
              whileTap={{ scale: 0.97 }}
              onClick={() => pick(opt)}
              className={cn('w-full p-4 rounded-2xl font-black text-right transition-all flex items-center gap-3', cls)}
            >
              <span className="w-7 h-7 rounded-xl bg-black/5 flex items-center justify-center text-xs shrink-0">
                {['أ','ب','ج','د'][i]}
              </span>
              <span className="flex-1">{opt}</span>
              {selected && isCorrect && <CheckCircle2 className="w-5 h-5 shrink-0" />}
              {selected && isSelected && !isCorrect && <XCircle className="w-5 h-5 shrink-0" />}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// Match game
function MatchGame({ question, onAnswer, timeLeft, maxTime }: {
  question: GameQuestion; onAnswer: (correct: boolean) => void;
  timeLeft: number; maxTime: number;
}) {
  const pairs = question.pairs!;
  const rights = useMemo(() => shuffle(pairs.map(p => p.right)), [question.id]);
  const lefts  = useMemo(() => shuffle(pairs.map(p => p.left)),  [question.id]);
  const [selectedLeft,  setSelectedLeft]  = useState<string | null>(null);
  const [matched, setMatched] = useState<Record<string, string>>({});
  const [wrong,   setWrong]   = useState<string | null>(null);
  const done = useMemo(() => Object.keys(matched).length === pairs.length, [matched, pairs]);

  useEffect(() => {
    if (done) setTimeout(() => onAnswer(true), 600);
  }, [done]);

  function pickRight(right: string) {
    if (!selectedLeft) return;
    const correctRight = pairs.find(p => p.left === selectedLeft)?.right;
    if (right === correctRight) {
      setMatched(m => ({ ...m, [selectedLeft]: right }));
      setSelectedLeft(null);
    } else {
      setWrong(right);
      setTimeout(() => setWrong(null), 500);
      setSelectedLeft(null);
    }
  }

  const pct = (timeLeft / maxTime) * 100;
  const isLeftMatched  = (l: string) => l in matched;
  const isRightMatched = (r: string) => Object.values(matched).includes(r);

  return (
    <div className="flex flex-col gap-4">
      <div className="h-2 bg-brand-beige/20 rounded-full overflow-hidden">
        <motion.div className="h-full rounded-full bg-violet-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs font-bold text-brand-beige text-center flex items-center justify-center gap-1">
        <Clock className="w-3 h-3" />{timeLeft}s — اضغط من اليمين ثم طابقه من اليسار
      </p>
      <div className="grid grid-cols-2 gap-3">
        {/* Left col */}
        <div className="flex flex-col gap-2">
          {lefts.map(l => (
            <motion.button key={l} whileTap={{ scale: 0.96 }} onClick={() => !isLeftMatched(l) && setSelectedLeft(l)}
              className={cn('p-3 rounded-2xl text-right text-sm font-black border-2 transition-all',
                isLeftMatched(l) ? 'bg-emerald-100 border-emerald-300 text-emerald-700 opacity-50'
                : selectedLeft === l ? 'bg-violet-100 border-violet-400 text-violet-700'
                : 'bg-white border-brand-beige/20 text-brand-text')}>
              {l}
            </motion.button>
          ))}
        </div>
        {/* Right col */}
        <div className="flex flex-col gap-2">
          {rights.map(r => (
            <motion.button key={r} whileTap={{ scale: 0.96 }} onClick={() => !isRightMatched(r) && pickRight(r)}
              className={cn('p-3 rounded-2xl text-right text-sm font-black border-2 transition-all',
                isRightMatched(r) ? 'bg-emerald-100 border-emerald-300 text-emerald-700 opacity-50'
                : wrong === r ? 'bg-red-100 border-red-400 text-red-700'
                : 'bg-white border-brand-beige/20 text-brand-text')}>
              {r}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Order game
function OrderGame({ question, onAnswer, timeLeft, maxTime }: {
  question: GameQuestion; onAnswer: (correct: boolean) => void;
  timeLeft: number; maxTime: number;
}) {
  const items = question.items!;
  const [arr, setArr] = useState<OrderItem[]>(() => shuffle(items));
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState(false);

  function move(i: number, dir: -1 | 1) {
    if (submitted) return;
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    const next = [...arr];
    [next[i], next[j]] = [next[j], next[i]];
    setArr(next);
  }

  function submit() {
    const ok = arr.every((it, i) => it.order === i + 1);
    setCorrect(ok);
    setSubmitted(true);
    setTimeout(() => onAnswer(ok), 1000);
  }

  const pct = (timeLeft / maxTime) * 100;

  return (
    <div className="flex flex-col gap-4">
      <div className="h-2 bg-brand-beige/20 rounded-full overflow-hidden">
        <motion.div className="h-full rounded-full bg-rose-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs font-bold text-brand-beige text-center">{question.question}</p>
      <div className="flex flex-col gap-2">
        {arr.map((item, i) => (
          <div key={item.text}
            className={cn('flex items-center gap-2 p-3 rounded-2xl border-2 bg-white',
              submitted ? (item.order === i + 1 ? 'border-emerald-400' : 'border-red-400') : 'border-brand-beige/20')}>
            <span className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 font-black text-sm flex items-center justify-center shrink-0">{i + 1}</span>
            <span className="flex-1 font-bold text-brand-text text-sm">{item.text}</span>
            {!submitted && (
              <div className="flex flex-col gap-1">
                <button onClick={() => move(i, -1)} className="w-6 h-6 bg-brand-cream rounded-lg text-brand-beige font-black text-xs flex items-center justify-center hover:bg-rose-100 hover:text-rose-600">↑</button>
                <button onClick={() => move(i, 1)}  className="w-6 h-6 bg-brand-cream rounded-lg text-brand-beige font-black text-xs flex items-center justify-center hover:bg-rose-100 hover:text-rose-600">↓</button>
              </div>
            )}
          </div>
        ))}
      </div>
      {!submitted && (
        <motion.button whileTap={{ scale: 0.96 }} onClick={submit}
          className="w-full py-4 bg-rose-500 text-white font-black rounded-2xl shadow-lg shadow-rose-500/20">
          تأكيد الترتيب ✓
        </motion.button>
      )}
      {submitted && (
        <div className={cn('p-4 rounded-2xl text-center font-black',
          correct ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
          {correct ? '🎉 ترتيب صحيح!' : '❌ الترتيب الصحيح موضح بالألوان'}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Main GamePlay Page
// ────────────────────────────────────────────────────────────
export default function GamePlay() {
  const { type } = useParams<{ type: string }>();
  const gameType = type as GameType;
  const navigate = useNavigate();
  const { user } = useAuth();
  const meta = GAME_META[gameType];

  const [questions]  = useState<GameQuestion[]>(() => getQuestionsForType(gameType));
  const [qIndex, setQIndex]  = useState(0);
  const [score, setScore]    = useState(0);
  const [correct, setCorrect] = useState(0);
  const [phase, setPhase]    = useState<'playing' | 'done'>('playing');
  const [timeLeft, setTimeLeft] = useState(GAME_CONFIG.secondsPerQuestion[gameType]);
  const maxTime = GAME_CONFIG.secondsPerQuestion[gameType];
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentQ = questions[qIndex];

  // Timer
  useEffect(() => {
    if (phase !== 'playing') return;
    
    timerRef.current = setInterval(() => {
      setTimeLeft(t => Math.max(0, t - 1));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [qIndex, phase]);

  useEffect(() => {
    if (phase === 'playing' && timeLeft === 0) {
      handleAnswer(null);
    }
  }, [timeLeft, phase]);

  useEffect(() => {
    if (phase === 'playing') {
      setTimeLeft(maxTime);
    }
  }, [qIndex, phase, maxTime]);

  const handleAnswer = useCallback((ans: string | boolean | null) => {
    if (timerRef.current) clearInterval(timerRef.current);

    let isCorrect = false;
    if (typeof ans === 'boolean') {
      isCorrect = ans;
    } else if (ans !== null && currentQ.answer) {
      isCorrect = ans === currentQ.answer;
    }

    if (isCorrect) {
      const base = GAME_CONFIG.pointsPerCorrect[gameType];
      const bonus = Math.floor(timeLeft * GAME_CONFIG.bonusSpeedFactor);
      setScore(s => s + base + bonus);
      setCorrect(c => c + 1);
    }

    setTimeout(() => {
      if (qIndex + 1 >= questions.length) {
        setPhase('done');
      } else {
        setQIndex(i => i + 1);
      }
    }, gameType === 'match' || gameType === 'order' ? 0 : 800);
  }, [timeLeft, qIndex, questions.length, gameType, currentQ]);

  // Save score when done
  useEffect(() => {
    if (phase !== 'done' || !user) return;
    const ref = doc(db, 'gameScores', user.uid);
    getDoc(ref).then(snap => {
      const data = snap.exists() ? snap.data() : {};
      return setDoc(ref, {
        uid: user.uid,
        fullName: user.fullName,
        photoUrl: user.photoUrl || null,
        totalScore: (data.totalScore || 0) + score,
        gamesPlayed: (data.gamesPlayed || 0) + 1,
        dailyCompleted: data.dailyCompleted || 0,
        lastGame: new Date().toISOString(),
      });
    }).catch(() => {});
  }, [phase]);

  if (phase === 'done') {
    const pct = Math.round((correct / questions.length) * 100);
    return (
      <div className="min-h-screen bg-brand-cream flex flex-col items-center justify-center p-6 text-center" dir="rtl">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}
          className="text-8xl mb-4">{pct >= 80 ? '🏆' : pct >= 50 ? '🎯' : '📖'}</motion.div>
        <h2 className="text-3xl font-black text-brand-text mb-1">انتهت اللعبة!</h2>
        <p className="text-brand-beige font-bold mb-6">{meta.label} — {meta.emoji}</p>
        <div className="bg-white rounded-3xl p-6 border border-brand-beige/10 shadow-xl w-full max-w-xs mb-6 space-y-4">
          <div className="text-center">
            <p className="text-5xl font-black text-violet-600 mb-1">{score}</p>
            <p className="text-sm font-bold text-brand-beige">نقطة كسبتها</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 rounded-2xl p-3 text-center">
              <p className="font-black text-emerald-700 text-xl">{correct}</p>
              <p className="text-[10px] font-bold text-emerald-600">إجابة صح</p>
            </div>
            <div className="bg-red-50 rounded-2xl p-3 text-center">
              <p className="font-black text-red-600 text-xl">{questions.length - correct}</p>
              <p className="text-[10px] font-bold text-red-500">إجابة غلط</p>
            </div>
          </div>
          <div className="h-3 bg-brand-cream rounded-full overflow-hidden">
            <motion.div className="h-full bg-violet-500 rounded-full" initial={{ width: 0 }}
              animate={{ width: `${pct}%` }} transition={{ duration: 1, delay: 0.5 }} />
          </div>
          <p className="text-xs font-bold text-brand-beige">{pct}% إجابات صحيحة</p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button onClick={() => { setQIndex(0); setScore(0); setCorrect(0); setPhase('playing'); }}
            className="w-full py-4 bg-violet-600 text-white font-black rounded-2xl shadow-lg shadow-violet-500/20">
            🔄 العب مرة ثانية
          </button>
          <Link to="/student/games"
            className="w-full py-4 bg-white border-2 border-brand-beige/20 text-brand-text font-black rounded-2xl text-center flex items-center justify-center gap-2">
            <Home className="w-4 h-4" /> القائمة الرئيسية
          </Link>
        </div>
      </div>
    );
  }

  if (phase === 'playing' && !currentQ) {
    return <div className="min-h-screen bg-brand-cream flex items-center justify-center font-black">جاري التحميل...</div>;
  }

  return (
    <div className="min-h-screen bg-brand-cream pb-24" dir="rtl">
      {/* Header */}
      <div className={cn('px-5 pt-8 pb-6 text-white', {
        fill:  'bg-gradient-to-br from-blue-500 to-blue-700',
        where: 'bg-gradient-to-br from-emerald-500 to-emerald-700',
        who:   'bg-gradient-to-br from-amber-500 to-amber-700',
        match: 'bg-gradient-to-br from-violet-500 to-violet-700',
        order: 'bg-gradient-to-br from-rose-500 to-rose-700',
        speed: 'bg-gradient-to-br from-orange-500 to-orange-700',
      }[gameType])}>
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <Link to="/student/games" className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <ArrowRight className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-white/80 text-sm font-bold">{qIndex + 1}/{questions.length}</span>
              <div className="flex items-center gap-1 bg-white/20 px-3 py-1.5 rounded-full">
                <Zap className="w-3 h-3" />
                <span className="font-black text-sm">{score}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{meta.emoji}</span>
            <div>
              <h1 className="font-black text-xl">{meta.label}</h1>
              <p className="text-white/70 text-xs font-bold">إنجيل مارقس</p>
            </div>
          </div>
          {/* Progress dots */}
          <div className="flex gap-1.5 mt-4">
            {questions.map((_, i) => (
              <div key={i} className={cn('h-1.5 flex-1 rounded-full transition-all',
                i < qIndex ? 'bg-white' : i === qIndex ? 'bg-white/70' : 'bg-white/20')} />
            ))}
          </div>
        </div>
      </div>

      {/* Game Area */}
      <div className="max-w-lg mx-auto px-4 pt-6">
        <AnimatePresence mode="wait">
          <motion.div key={qIndex}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }}>
            {(gameType === 'fill' || gameType === 'where' || gameType === 'who' || gameType === 'speed') && (
              <MCQGame question={currentQ} onAnswer={handleAnswer} timeLeft={timeLeft} maxTime={maxTime} />
            )}
            {gameType === 'match' && (
              <MatchGame question={currentQ} onAnswer={handleAnswer} timeLeft={timeLeft} maxTime={maxTime} />
            )}
            {gameType === 'order' && (
              <OrderGame question={currentQ} onAnswer={handleAnswer} timeLeft={timeLeft} maxTime={maxTime} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
