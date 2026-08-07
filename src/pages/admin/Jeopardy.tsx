import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Play, X, Check, ArrowRight, RefreshCw, ChevronLeft } from 'lucide-react';
import { questions, levels, Question } from '../../data/markCompetition';
import { cn } from '../../lib/utils';
import { Link } from 'react-router-dom';

interface Team {
  id: string;
  name: string;
  score: number;
  color: string;
  correctAnswers: number;
  wrongAnswers: number;
}

const TEAM_COLORS = [
  'from-blue-500 to-blue-700',
  'from-purple-500 to-purple-700',
  'from-pink-500 to-pink-700',
  'from-teal-500 to-teal-700',
  'from-orange-500 to-orange-700',
  'from-cyan-500 to-cyan-700',
  'from-lime-600 to-green-700',
  'from-rose-500 to-rose-700',
  'from-indigo-500 to-indigo-700',
  'from-amber-500 to-amber-700',
];

const BORDER_COLORS = [
  'border-blue-500/40',
  'border-purple-500/40',
  'border-pink-500/40',
  'border-teal-500/40',
  'border-orange-500/40',
  'border-cyan-500/40',
  'border-lime-500/40',
  'border-rose-500/40',
  'border-indigo-500/40',
  'border-amber-500/40',
];

export default function Jeopardy() {
  const [setupMode, setSetupMode] = useState(true);
  const [numTeams, setNumTeams] = useState(2);
  const [teams, setTeams] = useState<Team[]>([
    { id: '1', name: 'فريق 1', score: 0, color: TEAM_COLORS[0], correctAnswers: 0, wrongAnswers: 0 },
    { id: '2', name: 'فريق 2', score: 0, color: TEAM_COLORS[1], correctAnswers: 0, wrongAnswers: 0 },
  ]);

  // Game state
  const [usedQuestionIds, setUsedQuestionIds] = useState<Set<number>>(new Set());
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);

  // Answer state
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false); // true once choice clicked
  const [resultMessage, setResultMessage] = useState<'correct' | 'wrong' | null>(null);

  // Setup handlers
  const handleNumTeamsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const num = parseInt(e.target.value);
    setNumTeams(num);
    const newTeams = Array.from({ length: num }, (_, i) => ({
      id: (i + 1).toString(),
      name: teams[i]?.name || `فريق ${i + 1}`,
      score: 0,
      color: TEAM_COLORS[i % TEAM_COLORS.length],
      correctAnswers: 0,
      wrongAnswers: 0,
    }));
    setTeams(newTeams);
  };

  const handleTeamNameChange = (index: number, name: string) => {
    const newTeams = [...teams];
    newTeams[index].name = name;
    setTeams(newTeams);
  };

  const startGame = () => setSetupMode(false);

  // Randomly pick a question from a level for current team
  const pickQuestion = useCallback((levelId: number) => {
    const available = questions.filter(q => q.levelId === levelId && !usedQuestionIds.has(q.id));
    if (available.length === 0) return;
    const randomIdx = Math.floor(Math.random() * available.length);
    setActiveQuestion(available[randomIdx]);
    setSelectedChoice(null);
    setAnswered(false);
    setResultMessage(null);
  }, [usedQuestionIds]);

  // When team picks an answer
  const handleChoiceClick = (choice: string) => {
    if (answered) return;
    setSelectedChoice(choice);
    setAnswered(true);

    const isCorrect = choice === activeQuestion?.answer;
    setResultMessage(isCorrect ? 'correct' : 'wrong');

    if (isCorrect) {
      setTeams(prev => prev.map((t, idx) =>
        idx === currentTeamIndex
          ? { ...t, score: t.score + (activeQuestion?.points ?? 0), correctAnswers: t.correctAnswers + 1 }
          : t
      ));
    } else {
      setTeams(prev => prev.map((t, idx) =>
        idx === currentTeamIndex
          ? { ...t, wrongAnswers: t.wrongAnswers + 1 }
          : t
      ));
    }
  };

  const closeQuestion = () => {
    if (activeQuestion) {
      setUsedQuestionIds(prev => new Set(prev).add(activeQuestion.id));
    }
    setActiveQuestion(null);
    setSelectedChoice(null);
    setAnswered(false);
    setResultMessage(null);
    // Move to next team
    setCurrentTeamIndex(prev => (prev + 1) % teams.length);
  };

  const resetGame = () => {
    setUsedQuestionIds(new Set());
    setTeams(prev => prev.map(t => ({ ...t, score: 0, correctAnswers: 0, wrongAnswers: 0 })));
    setActiveQuestion(null);
    setSelectedChoice(null);
    setAnswered(false);
    setResultMessage(null);
    setCurrentTeamIndex(0);
  };

  const availableByLevel = (levelId: number) =>
    questions.filter(q => q.levelId === levelId && !usedQuestionIds.has(q.id)).length;

  const totalUsed = usedQuestionIds.size;
  const totalQuestions = questions.length;
  const sortedTeams = [...teams].sort((a, b) => b.score - a.score);
  const currentTeam = teams[currentTeamIndex];

  // ── SETUP SCREEN ──────────────────────────────────────────────────
  if (setupMode) {
    return (
      <div className="min-h-screen bg-brand-text flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-brand-red/10 blur-[100px]" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-blue-500/10 blur-[100px]" />
        </div>

        <div className="max-w-lg w-full bg-black/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl relative z-10">
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-red to-rose-700 flex items-center justify-center shadow-2xl shadow-brand-red/30 mb-4">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-black text-white text-center tracking-tight">مسابقة إنجيل مارمرقس</h1>
            <p className="text-white/40 text-sm font-black tracking-widest mt-1 text-center">الأصحاح الأول حتى الرابع</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-white/60 text-xs font-black mb-2 tracking-widest uppercase">عدد الفرق</label>
              <select
                value={numTeams}
                onChange={handleNumTeamsChange}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-brand-red outline-none transition-all font-black text-base cursor-pointer"
              >
                {[...Array(9)].map((_, i) => (
                  <option key={i + 2} value={i + 2} className="bg-gray-900">{i + 2} فرق</option>
                ))}
              </select>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              <label className="block text-white/60 text-xs font-black mb-2 tracking-widest uppercase">أسماء الفرق</label>
              {teams.map((team, idx) => (
                <div key={team.id} className="flex items-center gap-3">
                  <div className={cn("w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-black text-sm shrink-0", team.color)}>
                    {idx + 1}
                  </div>
                  <input
                    type="text"
                    value={team.name}
                    onChange={(e) => handleTeamNameChange(idx, e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-3.5 text-white focus:border-brand-red outline-none transition-all font-black placeholder:text-white/20"
                    placeholder={`اسم فريق ${idx + 1}`}
                  />
                </div>
              ))}
            </div>

            <button
              onClick={startGame}
              className="w-full py-5 bg-gradient-to-r from-brand-red to-rose-600 hover:from-rose-600 hover:to-brand-red text-white rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-brand-red/30 mt-4"
            >
              <Play className="w-6 h-6" />
              ابدأ المسابقة!
            </button>

            <Link to="/admin" className="w-full py-3 flex items-center justify-center gap-2 text-white/30 hover:text-white font-black text-sm transition-colors">
              <ArrowRight className="w-4 h-4" />
              رجوع للقائمة الرئيسية
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── GAME SCREEN ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0d0d0f] flex flex-col relative overflow-hidden" dir="rtl">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-0 right-0 h-[300px] bg-gradient-to-b from-brand-red/5 to-transparent" />
        <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      {/* Header */}
      <header className="relative z-20 bg-black/60 backdrop-blur-xl border-b border-white/10 px-4 py-3 shadow-2xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-red flex items-center justify-center shadow-lg shadow-brand-red/30">
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-black text-white leading-none">مسابقة مارمرقس</h1>
              <p className="text-[10px] text-white/40 font-black tracking-widest mt-0.5">{totalUsed}/{totalQuestions} سؤال</p>
            </div>
          </div>

          {/* Progress */}
          <div className="hidden sm:flex flex-1 max-w-xs mx-4 items-center gap-3">
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-brand-red to-rose-400 rounded-full"
                animate={{ width: `${(totalUsed / totalQuestions) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <span className="text-white/30 text-xs font-black shrink-0">{Math.round((totalUsed / totalQuestions) * 100)}%</span>
          </div>

          <button
            onClick={resetGame}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white rounded-xl font-black text-xs transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            إعادة
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col xl:flex-row gap-0 relative z-10">
        {/* ── MAIN AREA ── */}
        <main className="flex-1 p-5 flex flex-col gap-5">

          {/* Current turn banner */}
          <motion.div
            key={currentTeamIndex}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "rounded-2xl border p-4 flex items-center gap-4",
              BORDER_COLORS[currentTeamIndex % BORDER_COLORS.length],
              "bg-black/40 backdrop-blur-sm"
            )}
          >
            <div className={cn("w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white font-black text-lg shadow-lg shrink-0", currentTeam?.color)}>
              {currentTeamIndex + 1}
            </div>
            <div>
              <p className="text-white/50 text-xs font-black tracking-widest uppercase">دور</p>
              <p className="text-white font-black text-2xl leading-none">{currentTeam?.name}</p>
            </div>
            <div className="mr-auto flex items-center gap-2 text-white/40 font-black text-sm">
              <span className="text-white font-black text-xl">{currentTeam?.score}</span>
              <span>نقطة</span>
            </div>
          </motion.div>

          {/* Level buttons */}
          <div>
            <p className="text-white/30 font-black text-xs tracking-widest uppercase mb-3 text-center">اختر مستوى السؤال لـ {currentTeam?.name}</p>
            <div className="grid grid-cols-3 gap-4">
              {levels.map((level) => {
                const available = availableByLevel(level.id);
                const total = questions.filter(q => q.levelId === level.id).length;
                return (
                  <motion.button
                    key={level.id}
                    onClick={() => pickQuestion(level.id)}
                    disabled={available === 0}
                    whileHover={available > 0 ? { scale: 1.04, y: -3 } : {}}
                    whileTap={available > 0 ? { scale: 0.96 } : {}}
                    className={cn(
                      "relative group rounded-2xl p-5 sm:p-7 flex flex-col items-center justify-center gap-3 border transition-all duration-300 overflow-hidden",
                      available === 0
                        ? "bg-white/3 border-white/5 cursor-not-allowed opacity-30"
                        : "border-white/10 cursor-pointer bg-black/50 hover:border-white/20"
                    )}
                    style={available > 0 ? {
                      boxShadow: `0 0 40px -20px ${level.id === 1 ? '#10b981' : level.id === 2 ? '#f59e0b' : '#ef4444'}50`
                    } : {}}
                  >
                    {/* Top color bar */}
                    <div className={cn("absolute top-0 left-0 right-0 h-1 bg-gradient-to-r", level.color)} />
                    {/* Hover glow */}
                    {available > 0 && (
                      <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br", level.color)} />
                    )}

                    <span className="text-4xl sm:text-5xl">{level.emoji}</span>
                    <div className="text-center">
                      <p className="text-xl sm:text-2xl font-black text-white">{level.title}</p>
                      <p className="text-brand-red font-black text-base mt-0.5">{level.points} نقطة</p>
                    </div>

                    {/* Remaining bar */}
                    <div className="w-full">
                      <div className="flex justify-between text-[10px] text-white/30 font-black mb-1">
                        <span>متبقي</span>
                        <span>{available}/{total}</span>
                      </div>
                      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full bg-gradient-to-r transition-all", level.color)}
                          style={{ width: `${(available / total) * 100}%` }}
                        />
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Teams turn order (mini) */}
          <div className="flex gap-2 flex-wrap">
            <span className="text-white/20 text-xs font-black self-center">ترتيب الأدوار:</span>
            {teams.map((team, idx) => (
              <div key={team.id} className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-black border transition-all",
                idx === currentTeamIndex
                  ? `bg-gradient-to-r ${team.color} text-white border-transparent shadow-lg`
                  : "bg-white/5 border-white/10 text-white/40"
              )}>
                {team.name}
              </div>
            ))}
          </div>
        </main>

        {/* ── SCOREBOARD ── */}
        <aside className="xl:w-72 bg-black/50 backdrop-blur-xl border-t xl:border-t-0 xl:border-r border-white/10 p-4 flex flex-col gap-3">
          <h3 className="text-white/40 font-black text-xs tracking-[0.3em] uppercase text-center pt-1">النتيجة</h3>

          <div className="flex flex-col gap-2.5 flex-1">
            {sortedTeams.map((team, idx) => {
              const originalIdx = teams.findIndex(t => t.id === team.id);
              return (
                <motion.div
                  key={team.id}
                  layout
                  className={cn(
                    "relative rounded-2xl p-4 border transition-all",
                    originalIdx === currentTeamIndex
                      ? `${BORDER_COLORS[originalIdx % BORDER_COLORS.length]} bg-white/8`
                      : "border-white/5 bg-white/4"
                  )}
                >
                  {/* Active team pulse indicator */}
                  {originalIdx === currentTeamIndex && (
                    <div className="absolute top-2.5 left-2.5 w-2 h-2 rounded-full bg-white animate-pulse" />
                  )}

                  <div className="flex items-center gap-3">
                    <div className={cn("w-9 h-9 rounded-xl bg-gradient-to-br shrink-0 flex items-center justify-center text-white font-black text-sm shadow-md", team.color)}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm text-white truncate">{team.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-emerald-400 text-[10px] font-black">✓{team.correctAnswers}</span>
                        <span className="text-red-400 text-[10px] font-black">✗{team.wrongAnswers}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <motion.p
                        key={team.score}
                        initial={{ scale: 1.4, color: '#fbbf24' }}
                        animate={{ scale: 1, color: '#ffffff' }}
                        transition={{ duration: 0.5 }}
                        className="font-black text-2xl text-white leading-none"
                      >
                        {team.score}
                      </motion.p>
                      {idx === 0 && <span className="text-yellow-400 text-[10px]">🏆 متصدر</span>}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <button
            onClick={() => setSetupMode(true)}
            className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 hover:text-white rounded-xl font-black text-xs transition-all"
          >
            ← تعديل الفرق
          </button>
        </aside>
      </div>

      {/* ── QUESTION MODAL ── */}
      <AnimatePresence>
        {activeQuestion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              className="w-full max-w-3xl bg-[#111113] border border-white/10 rounded-[2rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] overflow-hidden max-h-[95vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-7 py-4 border-b border-white/10 bg-black/30 shrink-0">
                <div className="flex items-center gap-3">
                  {/* Level badge */}
                  {(() => {
                    const lvl = levels.find(l => l.id === activeQuestion.levelId);
                    return (
                      <>
                        <span className="text-xl">{lvl?.emoji}</span>
                        <span className={cn("font-black text-sm bg-gradient-to-r bg-clip-text text-transparent", lvl?.color)}>
                          {lvl?.title}
                        </span>
                        <span className="text-white/20">•</span>
                        <span className="text-white/50 font-black text-sm">{activeQuestion.points} نقطة</span>
                      </>
                    );
                  })()}
                  <span className="text-white/20">•</span>
                  {/* Current team */}
                  <div className="flex items-center gap-2">
                    <div className={cn("w-6 h-6 rounded-lg bg-gradient-to-br flex items-center justify-center text-white text-[10px] font-black", currentTeam?.color)}>
                      {currentTeamIndex + 1}
                    </div>
                    <span className="text-white font-black text-sm">{currentTeam?.name}</span>
                  </div>
                </div>
                <button
                  onClick={closeQuestion}
                  className="p-2 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Question body */}
              <div className="px-7 pt-9 pb-7 overflow-y-auto flex-1 flex flex-col">
                <h2 className="text-3xl sm:text-4xl font-black text-white text-center leading-snug mb-9 flex-1 flex items-center justify-center">
                  {activeQuestion.question}
                </h2>

                {/* 4 Choices */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  {activeQuestion.choices.map((choice, idx) => {
                    const isCorrect = choice === activeQuestion.answer;
                    const isSelected = selectedChoice === choice;
                    const letters = ['أ', 'ب', 'ج', 'د'];

                    let btnCls = 'border-white/10 bg-white/5 text-white hover:bg-white/10 hover:border-white/25 cursor-pointer';
                    let badgeCls = 'bg-white/10 text-white/50';

                    if (answered) {
                      if (isCorrect) {
                        btnCls = 'border-emerald-500/70 bg-emerald-500/15 text-emerald-200 cursor-default';
                        badgeCls = 'bg-emerald-500/30 text-emerald-300';
                      } else if (isSelected) {
                        btnCls = 'border-red-500/70 bg-red-500/15 text-red-300 cursor-default';
                        badgeCls = 'bg-red-500/30 text-red-300';
                      } else {
                        btnCls = 'border-white/5 bg-white/3 text-white/25 cursor-default opacity-50';
                        badgeCls = 'bg-white/5 text-white/20';
                      }
                    } else if (isSelected) {
                      btnCls = 'border-brand-red/60 bg-brand-red/15 text-white cursor-pointer';
                      badgeCls = 'bg-brand-red/30 text-white';
                    }

                    return (
                      <motion.button
                        key={idx}
                        onClick={() => handleChoiceClick(choice)}
                        disabled={answered}
                        whileHover={!answered ? { scale: 1.02 } : {}}
                        whileTap={!answered ? { scale: 0.97 } : {}}
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-2xl border text-right transition-all duration-300 text-base font-black",
                          btnCls
                        )}
                      >
                        <span className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-black text-sm transition-all", badgeCls)}>
                          {answered && isCorrect ? <Check className="w-4 h-4" /> :
                           answered && isSelected ? <X className="w-4 h-4" /> : letters[idx]}
                        </span>
                        <span className="flex-1">{choice}</span>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Result banner */}
                <AnimatePresence>
                  {resultMessage && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      className={cn(
                        "rounded-2xl p-5 text-center font-black text-xl mb-4 border",
                        resultMessage === 'correct'
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                          : 'bg-red-500/10 border-red-500/30 text-red-300'
                      )}
                    >
                      {resultMessage === 'correct' ? (
                        <div className="flex items-center justify-center gap-3">
                          <span className="text-3xl">🎉</span>
                          <div>
                            <p className="text-2xl">إجابة صحيحة!</p>
                            <p className="text-emerald-400 text-base font-black">+{activeQuestion.points} نقطة لـ {currentTeam?.name}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-3">
                          <span className="text-3xl">❌</span>
                          <div>
                            <p className="text-2xl">إجابة خاطئة</p>
                            <p className="text-red-400 text-base font-black">
                              الإجابة الصحيحة: {activeQuestion.answer}
                            </p>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Close / Next button */}
                {answered && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={closeQuestion}
                    className="w-full py-4 bg-brand-red hover:bg-brand-red/90 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-95 shadow-lg shadow-brand-red/20"
                  >
                    <ChevronLeft className="w-5 h-5" />
                    التالي: دور {teams[(currentTeamIndex + 1) % teams.length]?.name}
                  </motion.button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
