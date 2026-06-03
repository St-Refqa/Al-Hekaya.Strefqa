import { User } from "../types";

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  criteria: (user: User) => boolean;
}

export const BADGES: Badge[] = [
  {
    id: 'first-exam',
    name: 'أول اختبار',
    description: 'أكملت أول اختبار لك بنجاح! بداية الطريق نحو التميز.',
    icon: '🎯',
    criteria: (user) => user.totalExams >= 1
  },
  {
    id: 'perfect-score',
    name: 'أول درجة كاملة',
    description: 'حصلت على الدرجة النهائية في أحد الاختبارات. أنت عبقري!',
    icon: '💯',
    criteria: (user) => (user.averageScore || 0) >= 100 && user.totalExams >= 1
  },
  {
    id: 'streak-3',
    name: '3 أيام متتالية',
    description: 'حافظت على سلسلة حضورك لمدة 3 أيام متتالية. بداية موفقة!',
    icon: '✨',
    criteria: (user) => (user.streak || 0) >= 3
  },
  {
    id: 'streak-7',
    name: '7 أيام متتالية',
    description: 'حافظت على سلسلة دخولك لمدة أسبوع كامل. استمر في التألق!',
    icon: '🔥',
    criteria: (user) => (user.streak || 0) >= 7
  },
  {
    id: 'streak-14',
    name: 'أسبوعين من الالتزام',
    description: '14 يوماً من الحضور والاجتهاد المتواصل. فخورون بك!',
    icon: '💥',
    criteria: (user) => (user.streak || 0) >= 14
  },
  {
    id: 'active-30',
    name: '30 يوم نشاط',
    description: 'وصلت إلى شهر كامل من النشاط المتواصل. أنت قدوة للجميع!',
    icon: '⚡',
    criteria: (user) => (user.streak || 0) >= 30
  },
  {
    id: 'streak-60',
    name: 'شهرين من الإصرار',
    description: 'ستون يوماً متتالياً! التزامك استثنائي وغير مسبوق.',
    icon: '🌋',
    criteria: (user) => (user.streak || 0) >= 60
  },
  {
    id: 'streak-90',
    name: 'أسطورة الالتزام',
    description: 'ثلاثة أشهر من التحدي والنشاط المتواصل! إنجاز أسطوري.',
    icon: '🐉',
    criteria: (user) => (user.streak || 0) >= 90
  },
  {
    id: 'points-100',
    name: '100 نقطة',
    description: 'جمعت أول 100 نقطة في رصيدك. القادم أجمل!',
    icon: '💎',
    criteria: (user) => (user.totalPoints || 0) >= 100
  },
  {
    id: 'points-500',
    name: '500 نقطة',
    description: 'جمعت 500 نقطة متميزة. أنت الآن في مستوى متقدم.',
    icon: '👑',
    criteria: (user) => (user.totalPoints || 0) >= 500
  },
  {
    id: 'pro-solver',
    name: 'محترف الأسئلة',
    description: 'تخطيت حاجز الـ 1000 نقطة واقتربت من القمة.',
    icon: '🧠',
    criteria: (user) => (user.totalPoints || 0) >= 1000
  },
  {
    id: 'grand-master',
    name: 'الأستاذ الكبير',
    description: 'جمعت أكثر من 2500 نقطة. أنت الآن من نخبة المتميزين.',
    icon: '🔱',
    criteria: (user) => (user.totalPoints || 0) >= 2500
  },
  {
    id: 'epic-points',
    name: 'مليونير النقاط',
    description: '5000 نقطة! رقم قياسي يثبت مدى اجتهادك وعملك المتواصل.',
    icon: '🏦',
    criteria: (user) => (user.totalPoints || 0) >= 5000
  },
  {
    id: 'knowledge-seeker',
    name: 'باحث المعرفة',
    description: 'أكملت 10 اختبارات متنوعة. حب الاستطلاع هو سر النجاح.',
    icon: '📚',
    criteria: (user) => (user.totalExams || 0) >= 10
  },
  {
    id: 'exam-veteran',
    name: 'خبير الاختبارات',
    description: 'أتممت 50 اختباراً بنجاح وتميز.',
    icon: '🎓',
    criteria: (user) => (user.totalExams || 0) >= 50
  },
  {
    id: 'accuracy-champion',
    name: 'بطل الدقة',
    description: 'حافظت على متوسط درجات أعلى من 90% في 5 اختبارات على الأقل.',
    icon: '⭐',
    criteria: (user) => (user.averageScore || 0) >= 90 && (user.totalExams || 0) >= 5
  },
  {
    id: 'flawless-accuracy',
    name: 'دقة لا متناهية',
    description: 'حافظت على متوسط درجات 95% وأنت تتمتع بخبرة أكثر من 20 اختباراً.',
    icon: '🎯',
    criteria: (user) => (user.averageScore || 0) >= 95 && (user.totalExams || 0) >= 20
  },
  {
    id: 'social-star',
    name: 'النجم الصاعد',
    description: 'حصلت على 5 أوسمة مختلفة. أنت تحقق إنجازات مذهلة!',
    icon: '🌟',
    criteria: (user) => (user.badges || []).length >= 5
  },
  {
    id: 'badge-collector',
    name: 'جامع الأوسمة',
    description: 'جمعت 15 وساماً مختلفاً. خزانتك تمتليء بالجوائز!',
    icon: '🏆',
    criteria: (user) => (user.badges || []).length >= 15
  },
  {
    id: 'early-bird',
    name: 'المبادر النشيط',
    description: 'قمت بتسجيل الدخول أكثر من 20 مرة. نشاطك ملحوظ!',
    icon: '🌅',
    criteria: (user) => (user.loginCount || 0) >= 20
  },
  {
    id: 'the-loyal',
    name: 'الطالب المخلص',
    description: 'حافظت على حسابك نشطاً لمدة شهر من تاريخ التسجيل.',
    icon: '🤝',
    criteria: (user) => {
      if (!user.registrationDate) return false;
      const regDate = new Date(user.registrationDate);
      const diff = Date.now() - regDate.getTime();
      return diff >= 30 * 24 * 60 * 60 * 1000;
    }
  },
  {
    id: 'level-pro',
    name: 'خادم متميز',
    description: 'وصلت للمستوى المتقدم في رحلتك التعليمية.',
    icon: '🧗',
    criteria: (user) => (user.xp || 0) >= 1500
  }
];

export const LEVELS = [
  { name: 'مبتدئ', minXP: 0, icon: '🌱' },
  { name: 'متقدم', minXP: 500, icon: '🌿' },
  { name: 'محترف', minXP: 1500, icon: '🌳' },
  { name: 'خادم نشيط', minXP: 3000, icon: '🕊️' },
  { name: 'قارئ متميز', minXP: 5000, icon: '📖' },
  { name: 'عالم الكتاب', minXP: 8000, icon: '📜' },
  { name: 'أسطورة الكنيسة', minXP: 12000, icon: '⛪' }
];

export function calculateLevel(xp: number) {
  const currentLevel = [...LEVELS].reverse().find(l => xp >= l.minXP) || LEVELS[0];
  const nextLevelIndex = LEVELS.indexOf(currentLevel) + 1;
  const nextLevel = LEVELS[nextLevelIndex] || null;
  
  const progress = nextLevel 
    ? ((xp - currentLevel.minXP) / (nextLevel.minXP - currentLevel.minXP)) * 100 
    : 100;
    
  return {
    ...currentLevel,
    nextXP: nextLevel?.minXP || xp,
    progress
  };
}

export function checkNewBadges(user: User): string[] {
  const currentBadges = user.badges || [];
  const newBadges = BADGES
    .filter(b => !currentBadges.includes(b.id) && b.criteria(user))
    .map(b => b.id);
  return newBadges;
}

export function calculateTestStreaks(submissionDates: string[]): { currentStreak: number, maxStreak: number } {
  if (submissionDates.length === 0) {
    return { currentStreak: 0, maxStreak: 0 };
  }

  // Convert to local dates
  const uniqueDatesStr = [...new Set(submissionDates.map(dateStr => {
    const d = new Date(dateStr);
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60 * 1000);
    return local.toISOString().split('T')[0];
  }))].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  if (uniqueDatesStr.length === 0) {
    return { currentStreak: 0, maxStreak: 0 };
  }

  // Calculate Max Streak
  let maxStreak = 1;
  let currentBlock = 1;
  for (let i = 0; i < uniqueDatesStr.length - 1; i++) {
    const d1 = new Date(uniqueDatesStr[i]);
    const d2 = new Date(uniqueDatesStr[i + 1]);
    const diffDays = Math.round((d1.getTime() - d2.getTime()) / (1000 * 3600 * 24));
    
    if (diffDays === 1) {
      currentBlock++;
      if (currentBlock > maxStreak) {
        maxStreak = currentBlock;
      }
    } else {
      currentBlock = 1;
    }
  }

  // Calculate Current Streak
  const today = new Date();
  const todayOffset = today.getTimezoneOffset();
  const localToday = new Date(today.getTime() - todayOffset * 60 * 1000);
  const todayStr = localToday.toISOString().split('T')[0];

  const yesterdayDate = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayOffset = yesterdayDate.getTimezoneOffset();
  const localYesterday = new Date(yesterdayDate.getTime() - yesterdayOffset * 60 * 1000);
  const yesterdayStr = localYesterday.toISOString().split('T')[0];

  let streakCurrent = 0;
  
  if (uniqueDatesStr.includes(todayStr)) {
    streakCurrent = 1;
    let d = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    while (true) {
      const off = d.getTimezoneOffset();
      const ld = new Date(d.getTime() - off * 60 * 1000);
      const ds = ld.toISOString().split('T')[0];
      if (uniqueDatesStr.includes(ds)) {
        streakCurrent++;
        d = new Date(d.getTime() - 24 * 60 * 60 * 1000);
      } else {
        break;
      }
    }
  } else if (uniqueDatesStr.includes(yesterdayStr)) {
    streakCurrent = 1;
    let d = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000); // Day before yesterday
    while (true) {
      const off = d.getTimezoneOffset();
      const ld = new Date(d.getTime() - off * 60 * 1000);
      const ds = ld.toISOString().split('T')[0];
      if (uniqueDatesStr.includes(ds)) {
        streakCurrent++;
        d = new Date(d.getTime() - 24 * 60 * 60 * 1000);
      } else {
        break;
      }
    }
  }

  return { 
    currentStreak: Math.max(streakCurrent, 0), 
    maxStreak: Math.max(maxStreak, streakCurrent) 
  };
}
