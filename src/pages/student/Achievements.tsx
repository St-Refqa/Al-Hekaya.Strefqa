import React from "react";
import { useAuth } from "../../hooks/useAuth";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { 
  Award, 
  Lock, 
  CheckCircle2, 
  Sparkles,
  Trophy,
  Zap,
  Target,
  Flame,
} from "lucide-react";
import { motion } from "motion/react";
import { BADGES, calculateLevel } from "../../lib/gamification";
import { cn } from "../../lib/utils";

export default function Achievements() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  
  if (!user) return null;

  const unlockedBadges = user.badges || [];
  const levelInfo = calculateLevel(user.xp || 0);

  return (
    <div className="min-h-screen bg-brand-cream p-4 md:p-6 lg:p-12 font-bold" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-12 py-4 md:py-8 lg:py-0">
        
        {/* Header - Minimal version for layout */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-11 h-11 md:w-14 md:h-14 bg-brand-red text-white rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg transform -rotate-6 shrink-0">
              <Award className="w-5 h-5 md:w-8 md:h-8" />
            </div>
            <div>
              <h1 className="text-xl md:text-4xl font-black text-brand-text tracking-tighter">{t('achievements.title')}</h1>
              <p className="text-brand-beige text-xs md:text-sm mt-0.5 md:mt-1">{t('achievements.subtitle')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-4 bg-white px-4 md:px-8 py-3 md:py-4 rounded-xl md:rounded-[28px] border border-brand-beige/10 shadow-sm relative overflow-hidden group w-fit">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:scale-150 transition-transform">
              <Sparkles className="w-16 h-16" />
            </div>
            <div className={cn("relative z-10 flex items-center gap-3 md:gap-4", i18n.language === 'en' ? 'flex-row-reverse' : '')}>
              <div className="w-10 h-10 md:w-14 md:h-14 bg-brand-cream rounded-xl md:rounded-2xl flex items-center justify-center text-xl md:text-3xl shrink-0">
                {levelInfo.icon}
              </div>
              <div className={cn("flex flex-col", i18n.language === 'en' ? 'text-left' : 'text-right')}>
                <span className="text-[10px] md:text-xs text-brand-beige uppercase tracking-widest leading-normal">{t('achievements.current_level')}</span>
                <span className="text-base md:text-2xl font-black text-brand-red leading-none mt-0.5">{levelInfo.name}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Level Progress Card */}
        <div className="bg-brand-text rounded-3xl md:rounded-[40px] p-5 md:p-10 text-white relative overflow-hidden shadow-2xl shadow-brand-text/20">
          <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
            <Award className="w-48 h-48" />
          </div>
          
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 items-center">
            <div className="space-y-4 md:space-y-6">
              <h2 className="text-lg md:text-3xl font-black">{t('achievements.excellence_road')}</h2>
              <p className="text-white/60 text-xs md:text-sm leading-relaxed">
                {t('achievements.road_desc')}
              </p>
              
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-white font-black text-sm md:text-base">{user.xp || 0} XP</span>
                  <span className={cn("text-white/40 text-[10px] md:text-xs uppercase tracking-widest", i18n.language === 'en' ? 'text-right' : 'text-left')}>
                    {t('achievements.next_level_at', { xp: (levelInfo as any).nextXP || levelInfo.nextLevelXp })}
                  </span>
                </div>
                <div className="h-3 md:h-4 bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(levelInfo as any).progress || 0}%` }}
                    className="h-full bg-brand-red rounded-full"
                  />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 md:gap-4 animate-fade-in">
              <StatCard icon={<Trophy className="w-4 h-4 md:w-5 md:h-5" />} label={t('dashboard.points_label_short')} value={user.totalPoints || 0} />
              <StatCard icon={<Zap className="w-4 h-4 md:w-5 md:h-5" />} label={t('leaderboard.exams')} value={user.totalExams || 0} />
              <StatCard icon={<Flame className="w-4 h-4 md:w-5 md:h-5" />} label={t('dashboard.streak')} value={user.streak || 0} />
              <StatCard icon={<Target className="w-4 h-4 md:w-5 md:h-5" />} label={t('dashboard.performance')} value={`${Math.round((user as any).averageScore || user.avgScore || 0)}%`} />
            </div>
          </div>
        </div>

        {/* Badges Grid */}
        <div className="space-y-4 md:space-y-8">
          <div className="flex items-center gap-2 md:gap-3">
            <Award className="w-5 h-5 md:w-6 md:h-6 text-brand-red" />
            <h3 className="text-lg md:text-2xl font-black text-brand-text">{t('achievements.badges_title')}</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {BADGES.map((badge) => {
              const isUnlocked = unlockedBadges.includes(badge.id);
              return (
                <motion.div
                  key={badge.id}
                  whileHover={isUnlocked ? { y: -5 } : {}}
                  className={cn(
                    "bg-white p-5 md:p-8 rounded-3xl md:rounded-[38px] border border-brand-beige/10 relative group h-full flex flex-col items-center text-center transition-all",
                    isUnlocked ? "shadow-xl shadow-brand-red/5" : "grayscale opacity-60"
                  )}
                >
                  <div className={cn(
                    "w-14 h-14 md:w-24 md:h-24 rounded-xl md:rounded-[32px] flex items-center justify-center text-2xl md:text-5xl mb-3 md:mb-6 relative shrink-0",
                    isUnlocked ? "bg-brand-cream" : "bg-brand-cream/50"
                  )}>
                    {badge.icon}
                    {isUnlocked && (
                      <div className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white p-1 md:p-1.5 rounded-full shadow-lg border-2 md:border-4 border-white">
                        <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4" />
                      </div>
                    )}
                  </div>
                  
                  <h4 className="text-base md:text-xl font-black text-brand-text mb-1.5 md:mb-2">{badge.name}</h4>
                  <p className="text-xs md:text-sm text-brand-beige font-medium leading-relaxed mb-4 flex-grow">
                    {badge.description}
                  </p>
                  
                  {!isUnlocked && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-cream/50 rounded-full text-brand-beige text-[9px] md:text-[10px] font-black uppercase tracking-widest mt-auto">
                      <Lock className="w-3 h-3" />
                      <span>{t('achievements.locked')}</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) {
  return (
    <div className="bg-white/5 border border-white/10 p-3 md:p-5 rounded-2xl md:rounded-3xl flex flex-col items-center gap-1.5 md:gap-2 hover:bg-white/10 transition-colors">
      <div className="p-1.5 md:p-2 bg-white/10 rounded-lg text-brand-red">{icon}</div>
      <div className="text-[9px] md:text-[10px] text-white/40 uppercase tracking-widest text-center">{label}</div>
      <div className="text-sm md:text-xl font-black">{value}</div>
    </div>
  );
}
