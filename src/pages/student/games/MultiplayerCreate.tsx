import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import { ArrowLeft, Zap, Users, Dices, Brain, CheckCircle2 } from 'lucide-react';
import { 
  GameType, GAME_META, 
  fillQuestions, whereQuestions, whoQuestions, speedQuestions 
} from '../../../data/markQuestions';
import { cn } from '../../../lib/utils';

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function generateRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const MODES = [
  { id: 'mixed', label: 'مختلط (تحدي متنوع)', icon: Dices, color: 'text-violet-500', bg: 'bg-violet-100', border: 'border-violet-500' },
  ...GAME_META.map(m => ({
    id: m.id, label: m.label, icon: Brain, color: m.color, bg: m.bg, border: 'border-brand-red' // Simplified for UI
  }))
];

export default function MultiplayerCreate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedMode, setSelectedMode] = useState<string>('mixed');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!user) return;
    setIsCreating(true);

    try {
      const roomId = generateRoomId();
      
      // Select questions
      let selectedQuestions: any[] = [];
      if (selectedMode === 'mixed') {
        const pool = shuffle([...fillQuestions, ...whereQuestions, ...whoQuestions, ...speedQuestions]);
        selectedQuestions = pool.slice(0, 5);
      } else {
        let pool: any[] = [];
        if (selectedMode === 'fill') pool = fillQuestions;
        if (selectedMode === 'where') pool = whereQuestions;
        if (selectedMode === 'who') pool = whoQuestions;
        if (selectedMode === 'speed') pool = speedQuestions;
        // matching and order might need special handling, but for now fallback to speed if empty
        if (pool.length === 0) pool = speedQuestions;
        
        selectedQuestions = shuffle(pool).slice(0, 5);
      }

      const roomRef = doc(db, 'gameRooms', roomId);
      await setDoc(roomRef, {
        roomId,
        hostId: user.uid,
        hostName: user.fullName || 'بدون اسم',
        gameType: selectedMode,
        status: 'waiting',
        createdAt: serverTimestamp(),
        questions: selectedQuestions,
        players: {
          [user.uid]: {
            uid: user.uid,
            name: user.fullName || 'بدون اسم',
            photoUrl: user.photoUrl || null,
            score: 0,
            completed: false
          }
        }
      });

      navigate(`/student/games/lobby/${roomId}`);
    } catch (error) {
      console.error("Error creating room:", error);
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-cream py-8 px-4" dir="rtl">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/student/games"
            className="p-3 bg-white rounded-2xl shadow-sm border border-brand-beige/20 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-brand-text" />
          </Link>
          <h1 className="text-2xl font-black text-brand-text flex items-center gap-2">
            <Zap className="w-6 h-6 text-brand-red" />
            إنشاء غرفة
          </h1>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-xl border border-brand-beige/20 mb-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-brand-red/10 text-brand-red rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-brand-text">اختر نظام اللعب</h2>
            <p className="text-sm text-brand-beige mt-1 font-bold">كل الألعاب مكونة من 5 أسئلة.</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-8">
            {MODES.map((mode) => {
              const Icon = mode.icon;
              const isSelected = selectedMode === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => setSelectedMode(mode.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all relative overflow-hidden",
                    isSelected 
                      ? "border-brand-red bg-brand-red/5 scale-95 shadow-inner" 
                      : "border-brand-beige/10 bg-white hover:border-brand-red/30 hover:bg-brand-red/5"
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle2 className="w-4 h-4 text-brand-red" />
                    </div>
                  )}
                  <Icon className={cn("w-6 h-6", isSelected ? "text-brand-red" : "text-brand-beige")} />
                  <span className={cn("font-black text-xs text-center", isSelected ? "text-brand-text" : "text-brand-beige")}>
                    {mode.label}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            onClick={handleCreate}
            disabled={isCreating}
            className="w-full bg-brand-red text-white py-4 rounded-2xl font-black text-lg hover:bg-red-700 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2 shadow-lg shadow-brand-red/30"
          >
            {isCreating ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Zap className="w-5 h-5" />
                يلا نبدأ
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
