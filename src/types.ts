export interface User {
  uid: string;
  role: 'admin' | 'student';
  fullName: string;
  whatsappNumber?: string;
  church?: string;
  birthDate?: string;
  photoUrl?: string;
  address?: string;
  normalizedName?: string;
  code?: string;
  password?: string;
  registrationDate: string;
  isActive: boolean;
  status: 'active' | 'disabled';
  lastLoginAt?: string;
  loginCount?: number;
  streak: number;
  totalExams: number;
  totalPoints: number;
  cumulativePoints?: number;
  averageScore: number;
  xp: number;
  level: string;
  achievements: string[];
  badges: string[];
  sidebarColor?: string;
  sidebarSettings?: {
    showLatestResult?: boolean;
    showLocation?: boolean;
  };
  isExamCreator?: boolean;
  isAttendanceScanner?: boolean;
  isStoreManager?: boolean;
}

export interface LoginLog {
  id?: string;
  userId?: string;
  name?: string;
  code?: string;
  role: string;
  status: 'ناجح' | 'فشل';
  loginTime: string;
  loginAt: string;
  deviceInfo: string;
}

export interface Assessment {
  id?: string;
  title: string;
  text: string;
  language: string;
  readingDuration: number; // minutes
  answerDuration: number; // minutes
  availableFrom?: string;
  expiresAt: string;
  hideTextDuringQuestions: boolean;
  allowReturnToText: boolean;
  fullscreenMode: boolean;
  antiCopyMode: boolean;
  questions: {
    easy: Question[];
    medium: Question[];
    hard: Question[];
  };
  version?: number;
  parentId?: string;
  editHistory?: { date: string; changes: string }[];
  createdAt: string;
  status: 'active' | 'draft' | 'archived';
  isReviewed?: boolean;
  targetGroup?: 'OT' | 'NT' | 'servant' | 'admin' | 'all';
  assessmentType?: 'reading-questions' | 'questions-only';
}

export interface Question {
  id: string;
  text: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer';
  options?: string[]; // For MCQ: includes all choices
  correctAnswer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  explanation?: string;
  modelAnswer?: string; // For short answer
  aiRubric?: string; // Grading criteria for AI
  category?: string; // e.g., 'عهد قديم', 'عهد جديد', 'طقوس', 'عقيدة', etc.
  reference?: string; // Biblical or study reference, e.g., 'لوقا ١: ٥' or 'ملوك الأول ٢'
  isLocked?: boolean;
  isReviewed?: boolean;
}

export interface Submission {
  id?: string;
  participantId: string;
  assessmentId: string;
  participantName: string;
  participantPhoneOrId: string;
  assessmentTitle: string;
  assessmentVersion?: number;
  date: string;
  readingTimeSeconds: number;
  answeringTimeSeconds: number;
  answers: UserAnswer[];
  baseScore: number;
  maxScore: number;
  bonusPoints: number;
  finalScore: number;
  streakCount: number;
  status: 'completed' | 'incomplete' | 'expired' | 'duplicate-blocked';
  submittedManually?: boolean;
  unansweredCount?: number;
  isManuallyAdjusted?: boolean;
  isReviewed?: boolean;
  adminReviewNotes?: string;
  adminAdjustment?: number;
  adjustmentAudit?: {
    timestamp: string;
    adminId: string;
    previousScore: number;
    newScore: number;
    reason: string;
  }[];
  aiFeedback?: string;
  participantPhotoUrl?: string;
  difficultyStats?: {
    easy: number;
    medium: number;
    hard: number;
  };
}

export interface UserAnswer {
  questionId: string;
  difficulty: 'easy' | 'medium' | 'hard';
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  score: number;
  originalAiScore?: number;
  maxPoints: number;
  feedback?: string;
  explanation?: string;
  adminNote?: string;
  lastAdjustedAt?: string;
}

export interface Participant {
  id: string; // phoneOrId
  name: string;
  streakCount: number;
  lastCompletedDate: string; // YYYY-MM-DD
  totalBonusPoints: number;
}

export interface StoreItem {
  id?: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  category: 'gift' | 'workshop';
  stock: number;
  status: 'active' | 'archived';
  createdAt: string;
}

export interface Purchase {
  id?: string;
  userId: string;
  itemId: string;
  itemTitle: string;
  pricePaid: number;
  purchaseDate: string;
}
