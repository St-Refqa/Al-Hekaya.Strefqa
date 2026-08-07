import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Play, X, Check, ArrowRight, RefreshCw } from 'lucide-react';
import { questions, levels, Question } from '../../data/markCompetition';
import { cn } from '../../lib/utils';
import { Link } from 'react-router-dom';

interface Team {
  id: string;
  name: string;
  score: number;
  color: string;
}

const TEAM_COLORS = [
  'from-blue-500 to-blue-700',
  'from-purple-500 to-purple-700',
  'from-pink-500 to-pink-700',
  'from-teal-500 to-teal-700',
  'from-orange-500 to-orange-700',
  'from-cyan-500 to-cyan-700',
  'from-lime-500 to-lime-700',
  'from-rose-500 to-rose-700',
  'from-indigo-500 to-indigo-700',
  'from-amber-500 to-amber-700',
];

export default function Jeopardy() {
  const [setupMode, setSetupMode] = useState(true);
  const [numTeams, setNumTeams] = useState(2);
  const [teams, setTeams] = useState<Team[]>([
    { id: '1', name: 'فريق 1', score: 0, color: TEAM_COLORS[0] },
    { id: '2', name: 'فريق 2', score: 0, color: TEAM_COLORS[1] },
  ]);

  // Game state
  const [usedQuestionIds, setUsedQuestionIds] = useState<Set<number>>(new Set());
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState(false);

  // Setup handlers
  const handleNumTeamsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const num = parseInt(e.target.value);
    setNumTeams(num);
    const newTeams = Array.from({ length: num }, (_, i) => ({
      id: (i + 1).toString(),
      name: teams[i]?.name || `فريق ${i + 1}`,
      score: teams[i]?.score || 0,
      color: TEAM_COLORS[i % TEAM_COLORS.length]
    }));
    setTeams(newTeams);
  };

  const handleTeamNameChange = (index: number, name: string) => {
    const newTeams = [...teams];
    newTeams[index].name = name;
    setTeams(newTeams);
  };

  const startGame = () => setSetupMode(false);

  // Randomly pick a question from a level
  const pickQuestion = useCallback((levelId: number) => {
    const available = questions.filter(q => q.levelId === levelId && !usedQuestionIds.has(q.id));
    if (available.length === 0) return;
    const randomIdx = Math.floor(Math.random() * available.length);
    setActiveQuestion(available[randomIdx]);
    setShowAnswer(false);
    setSelectedChoice(null);
  }, [usedQuestionIds]);

  const assignPoints = (teamId: string) => {
    if (!activeQuestion) return;
    setTeams(prev => prev.map(t =>
      t.id === teamId ? { ...t, score: t.score + activeQuestion.points } : t
    ));
    closeQuestion();
  };

  const closeQuestion = () => {
    if (activeQuestion) {
      setUsedQuestionIds(prev => new Set(prev).add(activeQuestion.id));
    }
    setActiveQuestion(null);
    setShowAnswer(false);
    setSelectedChoice(null);
  };

  const resetGame = () => {
    setUsedQuestionIds(new Set());
    setTeams(prev => prev.map(t => ({ ...t, score: 0 })));
    setActiveQuestion(null);
    setShowAnswer(false);
    setSelectedChoice(null);
    setGameOver(false);
  };

  const availableByLevel = (levelId: number) =>
    questions.filter(q => q.levelId === levelId && !usedQuestionIds.has(q.id)).length;

  const totalUsed = usedQuestionIds.size;
  const totalQuestions = questions.length;

  const sortedTeams = [...teams].sort((a, b) => b.score - a.score);

  if (setupMode) {
    return (
      <div className="min-h-screen bg-brand-text flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-brand-red/10 blur-[100px]" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-blue-500/10 blur-[100px]" />
        </div>

        <div className="max-w-lg w-full bg-black/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl relative z-10">
          {/* Header */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-red to-rose-700 flex items-center justify-center shadow-2xl shadow-brand-red/30 mb-4">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-black text-white text-center tracking-tight">مسابقة إنجيل مارمرقس</h1>
            <p className="text-white/40 text-sm font-black tracking-widest mt-1 text-center">الأصحاح الأول حتى الرابع</p>
          </div>

          <div className="space-y-6">
            {/* Number of teams */}
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

            {/* Team names */}
            <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-1">
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
              <span>ابدأ المسابقة!</span>
            </button>

            <Link to="/admin" className="w-full py-3 flex items-center justify-center gap-2 text-white/30 hover:text-white font-black text-sm transition-colors">
              <ArrowRight className="w-4 h-4" />
              <span>رجوع للقائمة الرئيسية</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d0f] flex flex-col relative overflow-hidden" dir="rtl">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-0 right-0 h-[300px] bg-gradient-to-b from-brand-red/5 to-transparent" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      {/* Top Header */}
      <header className="relative z-20 bg-black/60 backdrop-blur-xl border-b border-white/10 px-4 py-4 shadow-2xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-red flex items-center justify-center shadow-lg shadow-brand-red/30">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white leading-none">مسابقة مارمرقس</h1>
              <p className="text-[10px] text-white/40 font-black tracking-widest mt-0.5">{totalUsed}/{totalQuestions} سؤال</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="hidden sm:block flex-1 max-w-xs mx-6">
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-brand-red to-rose-400 rounded-full"
                animate={{ width: `${(totalUsed / totalQuestions) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          <button
            onClick={resetGame}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white rounded-xl font-black text-xs transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>إعادة</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-0 relative z-10">
        {/* Main game area */}
        <main className="flex-1 p-6 flex flex-col items-center justify-center">
          <div className="w-full max-w-2xl">
            {/* Level buttons */}
            <h2 className="text-center text-white/40 font-black tracking-widest text-xs uppercase mb-8">اختر مستوى السؤال</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {levels.map((level) => {
                const available = availableByLevel(level.id);
                const total = questions.filter(q => q.levelId === level.id).length;
                const pct = ((total - available) / total) * 100;
                return (
                  <motion.button
                    key={level.id}
                    onClick={() => pickQuestion(level.id)}
                    disabled={available === 0}
                    whileHover={available > 0 ? { scale: 1.04, y: -4 } : {}}
                    whileTap={available > 0 ? { scale: 0.96 } : {}}
                    className={cn(
                      "relative group rounded-3xl p-8 flex flex-col items-center justify-center gap-4 border transition-all duration-300 overflow-hidden",
                      available === 0
                        ? "bg-white/3 border-white/5 cursor-not-allowed opacity-40"
                        : "border-white/10 cursor-pointer bg-black/40 hover:border-white/20 shadow-2xl hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]"
                    )}
                    style={available > 0 ? {
                      boxShadow: `0 0 40px -20px ${level.id === 1 ? '#10b981' : level.id === 2 ? '#f59e0b' : '#ef4444'}40`
                    } : {}}
                  >
                    {/* Gradient top accent */}
                    <div className={cn("absolute top-0 left-0 right-0 h-1 bg-gradient-to-r", level.color)} />

                    {/* Background glow */}
                    {available > 0 && (
                      <div className={cn(
                        "absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br",
                        level.color
                      )} />
                    )}

                    <span className="text-5xl">{level.emoji}</span>
                    <div className="text-center">
                      <p className="text-2xl font-black text-white">{level.title}</p>
                      <p className="text-brand-red font-black text-lg mt-1">{level.points} نقطة</p>
                    </div>

                    {/* Remaining */}
                    <div className="w-full">
                      <div className="flex justify-between text-xs text-white/40 font-black mb-1.5">
                        <span>متبقي</span>
                        <span>{available}/{total}</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full bg-gradient-to-r transition-all", level.color)}
                          style={{ width: `${100 - pct}%` }}
                        />
                      </div>
                    </div>

                    {available === 0 && (
                      <span className="text-white/30 font-black text-xs">انتهت الأسئلة</span>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Used questions indicator */}
            <p className="text-center text-white/20 font-black text-xs mt-8 tracking-widest">
              تم استخدام {totalUsed} من {totalQuestions} سؤال
            </p>
          </div>
        </main>

        {/* Scoreboard Sidebar */}
        <aside className="lg:w-72 bg-black/40 backdrop-blur-xl border-t lg:border-t-0 lg:border-r border-white/10 p-5 flex flex-col gap-4">
          <h3 className="text-white/50 font-black text-xs tracking-[0.3em] uppercase text-center">نتيجة الفرق</h3>
          <div className="flex flex-col gap-3 flex-1">
            {sortedTeams.map((team, idx) => (
              <motion.div
                key={team.id}
                layout
                className={cn(
                  "relative rounded-2xl p-4 border overflow-hidden",
                  idx === 0 ? "border-yellow-500/30 bg-yellow-500/5" : "border-white/5 bg-white/5"
                )}
              >
                {/* rank */}
                <div className="flex items-center gap-3">
                  <div className={cn("w-9 h-9 rounded-xl bg-gradient-to-br shrink-0 flex items-center justify-center text-white font-black text-sm shadow-lg", team.color)}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("font-black text-sm truncate", idx === 0 ? "text-yellow-300" : "text-white")}>{team.name}</p>
                    <p className={cn("font-black text-2xl leading-none", idx === 0 ? "text-yellow-400" : "text-white")}>{team.score}</p>
                  </div>
                  {idx === 0 && <span className="text-xl">🏆</span>}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Go to setup */}
          <button
            onClick={() => setSetupMode(true)}
            className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white rounded-2xl font-black text-xs transition-all"
          >
            ← تعديل الفرق
          </button>
        </aside>
      </div>

      {/* Question Modal */}
      <AnimatePresence>
        {activeQuestion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              className="w-full max-w-3xl bg-[#111113] border border-white/10 rounded-[2rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] overflow-hidden max-h-[95vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-8 py-5 border-b border-white/10 bg-black/30 shrink-0">
                <div className="flex items-center gap-3">
                  {(() => {
                    const lvl = levels.find(l => l.id === activeQuestion.levelId);
                    return (
                      <>
                        <span className="text-2xl">{lvl?.emoji}</span>
                        <span className={cn("font-black text-base bg-gradient-to-r bg-clip-text text-transparent", lvl?.color)}>
                          {lvl?.title}
                        </span>
                        <span className="text-white/20 text-sm">•</span>
                        <span className="text-white/60 font-black text-sm">{activeQuestion.points} نقطة</span>
                      </>
                    );
                  })()}
                </div>
                <button onClick={closeQuestion} className="p-2.5 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-xl transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Question */}
              <div className="px-8 pt-10 pb-6 overflow-y-auto flex-1">
                <h2 className="text-3xl sm:text-4xl font-black text-white text-center leading-snug mb-10">
                  {activeQuestion.question}
                </h2>

                {/* Choices */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                  {activeQuestion.choices.map((choice, idx) => {
                    const isCorrect = choice === activeQuestion.answer;
                    const isSelected = selectedChoice === choice;
                    const revealed = showAnswer;
                    
                    let choiceCls = "border-white/10 bg-white/5 text-white hover:bg-white/10 hover:border-white/20 cursor-pointer";
                    if (revealed) {
                      if (isCorrect) choiceCls = "border-emerald-500/60 bg-emerald-500/15 text-emerald-300";
                      else if (isSelected) choiceCls = "border-red-500/60 bg-red-500/15 text-red-300";
                      else choiceCls = "border-white/5 bg-white/3 text-white/30 cursor-default";
                    } else if (isSelected) {
                      choiceCls = "border-brand-red/60 bg-brand-red/15 text-white cursor-pointer";
                    }
                    
                    const letters = ['أ', 'ب', 'ج', 'د'];

                    return (
                      <motion.button
                        key={idx}
                        onClick={() => !revealed && setSelectedChoice(choice)}
                        whileHover={!revealed ? { scale: 1.02 } : {}}
                        whileTap={!revealed ? { scale: 0.98 } : {}}
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-2xl border text-right transition-all duration-300 text-base font-black",
                          choiceCls
                        )}
                      >
                        <span className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-black text-sm",
                          revealed && isCorrect ? "bg-emerald-500/30 text-emerald-300" :
                          revealed && isSelected ? "bg-red-500/30 text-red-300" :
                          isSelected ? "bg-brand-red/30 text-white" : "bg-white/10 text-white/50"
                        )}>
                          {revealed && isCorrect ? <Check className="w-4 h-4" /> : revealed && isSelected ? <X className="w-4 h-4" /> : letters[idx]}
                        </span>
                        <span className="flex-1">{choice}</span>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Reveal / Award buttons */}
                <AnimatePresence mode="wait">
                  {!showAnswer ? (
                    <motion.button
                      key="reveal"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      onClick={() => setShowAnswer(true)}
                      className="w-full py-4 bg-gradient-to-r from-brand-red to-rose-600 hover:from-rose-500 hover:to-brand-red text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-95 shadow-lg shadow-brand-red/20"
                    >
                      <Check className="w-5 h-5" />
                      <span>إظهار الإجابة الصحيحة</span>
                    </motion.button>
                  ) : (
                    <motion.div
                      key="award"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4"
                    >
                      <p className="text-center text-white/40 font-black text-xs tracking-widest uppercase">منح النقاط للفريق المجاوب</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {teams.map(team => (
                          <button
                            key={team.id}
                            onClick={() => assignPoints(team.id)}
                            className={cn(
                              "py-4 px-3 rounded-2xl font-black flex flex-col items-center gap-1 border border-white/10 bg-white/5 hover:border-white/20 transition-all hover:scale-105 active:scale-95 group"
                            )}
                          >
                            <div className={cn("w-8 h-8 rounded-xl bg-gradient-to-br flex items-center justify-center text-white text-xs font-black", team.color)}>
                              +
                            </div>
                            <span className="text-white/70 text-xs group-hover:text-white">{team.name}</span>
                            <span className="text-brand-red font-black">+{activeQuestion.points}</span>
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={closeQuestion}
                        className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white rounded-2xl font-black text-sm transition-all"
                      >
                        لا أحد أجاب / إغلاق
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
