import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { db } from "../../lib/firebase";
import { useAuth } from "../../hooks/useAuth";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  runTransaction,
  query,
  where,
  getDocs,
  limit,
} from "firebase/firestore";
import {
  Assessment,
  Question,
  Submission,
  UserAnswer,
  Participant,
  User,
} from "../../types";
import { evaluateShortAnswer, getAIHint } from "../../lib/gemini";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircle2,
  Trophy,
  Flame,
  ArrowRight,
  Loader2,
  AlertCircle,
  Sparkles,
  Volume2,
  Pause,
  StopCircle,
  EyeOff,
  Eye,
  Church,
  HelpCircle,
  SlidersHorizontal,
  BookOpen
} from "lucide-react";
import Timer from "../../components/ui/Timer";
import ReactMarkdown from "react-markdown";
import { cn, calculatePercentage, normalizeArabicName } from "../../lib/utils";
import { differenceInCalendarDays, parseISO, format } from "date-fns";
import { ar } from "date-fns/locale";
import { checkNewBadges, calculateLevel } from "../../lib/gamification";
import { SmartImage } from "../../components/ui/SmartImage";
import Certificate from "../../components/ui/Certificate";
import { notificationService } from "../../lib/notificationService";

type Phase =
  | "WELCOME"
  | "READING"
  | "QUESTION"
  | "RESULTS";

export default function PublicAssessment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: authUser, isAuthenticated, isStudent } = useAuth();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [phase, setPhase] = useState<Phase>("WELCOME");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Participant Info
  const [participantName, setParticipantName] = useState("");
  const [participantPhone, setParticipantPhone] = useState("");

  useEffect(() => {
    if (isAuthenticated && isStudent && authUser && !participantName) {
      const t = setTimeout(() => {
        setParticipantName(authUser.fullName || "");
        setParticipantPhone(authUser.code || "");
      }, 0);
      return () => clearTimeout(t);
    }
  }, [isAuthenticated, isStudent, authUser, participantName]);

  // Assessment State
  const allQuestions = React.useMemo(() => {
    if (!assessment) return [];
    return [
      ...(assessment.questions?.easy || []),
      ...(assessment.questions?.medium || []),
      ...(assessment.questions?.hard || [])
    ].filter(Boolean); // Filter out any undefined just in case
  }, [assessment]);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<UserAnswer[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<"easy" | "medium" | "hard" | null>(null);
  const [readingTimeLeft, setReadingTimeLeft] = useState<number | null>(null);
  const [answeringTimeLeft, setAnsweringTimeLeft] = useState<number | null>(null);
  const [totalReadingTime, setTotalReadingTime] = useState(0);
  const [totalAnsweringTime, setTotalAnsweringTime] = useState(0);
  const [isAutoSubmitting, setIsAutoSubmitting] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [finalSubmission, setFinalSubmission] = useState<Submission | null>(null);
  const [answerStatus, setAnswerStatus] = useState<"idle" | "correct" | "incorrect">("idle");
  const [aiHint, setAiHint] = useState<string | null>(null);
  const [lastFeedback, setLastFeedback] = useState<string | null>(null);
  const [isGettingHint, setIsGettingHint] = useState(false);
  const isSubmittingRef = useRef(false);

  const startAnsweringPhase = useCallback(() => {
    setAnsweringTimeLeft(assessment!.answerDuration * 60);
    setCurrentQuestionIndex(0);
    setCurrentQuestion(allQuestions[0] || null);
    setPhase("QUESTION");
  }, [assessment, allQuestions]);

  const finishReading = useCallback(() => {
    setTotalReadingTime(assessment!.readingDuration * 60);
    startAnsweringPhase();
  }, [assessment, startAnsweringPhase]);

  const completeAssessment = useCallback(async (finalAnswers: UserAnswer[], auto: boolean = false) => {
    setIsEvaluating(true);
    const ansTotalTime = assessment!.answerDuration * 60 - (answeringTimeLeft || 0);
    setTotalAnsweringTime(ansTotalTime);

    const baseScore = finalAnswers.reduce((acc, curr) => acc + curr.score, 0);

    // Unanswered count
    const unansweredCount = allQuestions.length - finalAnswers.length;

    // Streak Logic
    let streakCount = 1;
    const today = format(new Date(), "yyyy-MM-dd");

    try {
      await runTransaction(db, async (transaction) => {
        const participantRef = doc(db, "participants", participantPhone);
        const userRef = authUser?.uid ? doc(db, "users", authUser.uid) : null;
        
        const participantSnap = await transaction.get(participantRef);
        const userSnap = userRef ? await transaction.get(userRef) : null;

        if (participantSnap.exists()) {
          const pData = participantSnap.data() as Participant;
          const lastDate = parseISO(pData.lastCompletedDate);
          const diff = differenceInCalendarDays(new Date(), lastDate);

          if (diff === 1) {
            streakCount = pData.streakCount + 1;
          } else if (diff === 0) {
            streakCount = pData.streakCount; 
          } else {
            streakCount = 1;
          }

          transaction.set(participantRef, {
            name: participantName,
            phoneOrId: participantPhone,
            streakCount,
            lastCompletedDate: today,
          }, { merge: true });
        } else {
          transaction.set(participantRef, {
            name: participantName,
            phoneOrId: participantPhone,
            streakCount: 1,
            lastCompletedDate: today,
          });
        }

        if (userRef && userSnap?.exists()) {
          const uData = userSnap.data() as User;
          const newTotalExams = (uData.totalExams || 0) + 1;
          const newTotalPoints = (uData.totalPoints || 0) + baseScore;
          const currentPercentage = calculatePercentage(baseScore, (finalAnswers.reduce((a,c) => a+c.maxPoints, 0)));
          const newAverageScore = uData.averageScore 
            ? (uData.averageScore * (newTotalExams - 1) + currentPercentage) / newTotalExams
            : currentPercentage;
          
          const xpGained = (baseScore * 5) + (streakCount * 5);
          const newXP = (uData.xp || 0) + xpGained;

          const updatedUser: Partial<User> = {
            streak: streakCount,
            totalExams: newTotalExams,
            totalPoints: newTotalPoints,
            cumulativePoints: (uData.cumulativePoints || uData.totalPoints || 0) + baseScore,
            averageScore: newAverageScore,
            xp: newXP
          };

          const tempUser = { ...uData, ...updatedUser } as User;
          const newBadges = checkNewBadges(tempUser);
          if (newBadges.length > 0) {
            updatedUser.badges = [...(uData.badges || []), ...newBadges];
            // Notify for each new badge
            Promise.all(newBadges.map(bId => 
              notificationService.sendNotification({
                title: "مبروك وسام جديد! 🎖️",
                message: `لقد حصلت على وسام جديد لتفوقك!`,
                type: "success",
                category: "achievements",
                targetId: uData.uid,
                weeklyMeetingTag: `badge_notif_${uData.uid}_${bId}`
              })
            )).catch(console.error);
          }

          // Level up check
          const oldLevel = calculateLevel(uData.xp || 0);
          const newLevel = calculateLevel(tempUser.xp || 0);
          if (newLevel.name !== oldLevel.name) {
            notificationService.sendNotification({
              title: "عاش يا بطل! مستوى جديد 🆙",
              message: `لقد وصلت للمستوى: ${newLevel.name}. استمر في التقدم!`,
              type: "success",
              category: "achievements",
              targetId: uData.uid,
              weeklyMeetingTag: `level_up_notif_${uData.uid}_${newLevel.name}`
            }).catch(console.error);
          }

          transaction.update(userRef, updatedUser);

          // General Result Notification
          notificationService.sendNotification({
            title: "نتيجة الاختبار 📊",
            message: `لقد أكملت اختبار ${assessment?.title} بنجاح. درجتك: ${baseScore}`,
            type: "info",
            category: "assessments",
            targetId: uData.uid,
            weeklyMeetingTag: `result_notif_${uData.uid}_${id}`
          }).catch(console.error);
        }
      });

      const submission: Submission = {
        participantId: authUser?.uid || participantPhone,
        assessmentId: id!,
        participantName,
        participantPhoneOrId: participantPhone,
        participantPhotoUrl: authUser?.photoUrl || undefined,
        assessmentTitle: assessment!.title,
        assessmentVersion: assessment!.version || 1,
        date: new Date().toISOString(),
        readingTimeSeconds: totalReadingTime || (assessment!.readingDuration * 60),
        answeringTimeSeconds: ansTotalTime,
        answers: finalAnswers,
        baseScore,
        maxScore: finalAnswers.reduce((a,c) => a+c.maxPoints, 0),
        bonusPoints: 0,
        finalScore: baseScore,
        streakCount,
        status: "completed",
        submittedManually: !auto,
        unansweredCount
      };

      const docRef = await addDoc(collection(db, "submissions"), submission);
      setFinalSubmission({ ...submission, id: docRef.id });
      setPhase("RESULTS");
      import("../../lib/confetti").then(m => m.triggerSuccessConfetti());
    } catch (err) {
      console.error("Finalization failed", err);
      setError("حصل مشكلة في حفظ النتيجة. برجاء تصوير الشاشة والتواصل مع المسؤول.");
    } finally {
      setIsEvaluating(false);
      setIsAutoSubmitting(false);
    }
  }, [assessment, answeringTimeLeft, authUser, participantPhone, participantName, id, totalReadingTime]);

  const autoSubmit = useCallback(async (answers: UserAnswer[]) => {
    if (isAutoSubmitting) return;
    setIsAutoSubmitting(true);
    setPhase("SUBMITTING" as any);
    await completeAssessment(answers, true);
  }, [isAutoSubmitting, completeAssessment]);

  // Persistence Key
  const sessionKey = `exam_session_${id}_${authUser?.uid || 'guest'}`;

  const hasRestored = useRef(false);

  // Restore persistence
  useEffect(() => {
    if (!assessment || hasRestored.current) return;

    const saved = localStorage.getItem(sessionKey);
    if (saved) {
      try {
        const { 
          phase: savedPhase, 
          startTime, 
          answers: savedAnswers,
          qIdx,
          userInput: savedUserInput,
          difficulty: savedDifficulty,
          currentQuestion: savedQuestion,
          pName,
          pPhone
        } = JSON.parse(saved);

        const restore = () => {
          const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
          if (pName) setParticipantName(pName);
          if (pPhone) setParticipantPhone(pPhone);

          if (savedPhase === "READING") {
            const remaining = (assessment.readingDuration * 60) - elapsedSeconds;
            if (remaining > 0) {
              setPhase("READING");
              setReadingTimeLeft(remaining);
            } else {
              setPhase("QUESTION");
              setCurrentQuestionIndex(0);
              setCurrentQuestion(allQuestions[0] || null);
              setReadingTimeLeft(0);
              setAnsweringTimeLeft(assessment.answerDuration * 60);
            }
          } else if (savedPhase === "ANSWERING" || savedPhase === "QUESTION") {
            const totalAnswerDuration = assessment.answerDuration * 60;
            const remaining = totalAnswerDuration - elapsedSeconds;
            
            setSelectedAnswers(savedAnswers || []);
            setCurrentQuestionIndex(qIdx || 0);
            setUserInput(savedUserInput || "");
            
            if (remaining > 0) {
              setAnsweringTimeLeft(remaining);
              if (savedPhase === "QUESTION" && savedQuestion) {
                setSelectedDifficulty(savedDifficulty);
                setCurrentQuestion(savedQuestion);
                setPhase("QUESTION");
              } else {
                setCurrentQuestion(allQuestions[qIdx || 0] || null);
                setPhase("QUESTION");
              }
            } else {
              // Time's up
              autoSubmit(savedAnswers || []);
            }
          }
        };

        const t = setTimeout(restore, 0);
        hasRestored.current = true;
        return () => clearTimeout(t);
      } catch (err) {
        console.error("Error restoring session:", err);
      }
    }
    hasRestored.current = true;
  }, [assessment, sessionKey, autoSubmit]);

  // Save persistence
  useEffect(() => {
    if (phase === "READING" || phase === "QUESTION") {
      if (!assessment) return;
      
      const currentTimeLeft = phase === "READING" ? readingTimeLeft : answeringTimeLeft;
      const totalDuration = phase === "READING" ? assessment.readingDuration * 60 : assessment.answerDuration * 60;
      
      // We store a calculated startTime so the timer "continues" in real-time even if they leave
      const calculatedStartTime = Date.now() - (totalDuration - (currentTimeLeft || 0)) * 1000;

      const sessionData = {
        phase: (phase === "READING") ? "READING" : (phase === "QUESTION" ? "QUESTION" : "ANSWERING"),
        startTime: calculatedStartTime,
        answers: selectedAnswers,
        qIdx: currentQuestionIndex,
        userInput: userInput,
        difficulty: selectedDifficulty,
        currentQuestion: currentQuestion,
        pName: participantName,
        pPhone: participantPhone
      };
      
      localStorage.setItem(sessionKey, JSON.stringify(sessionData));
    }
    
    if (phase === "RESULTS") {
      localStorage.removeItem(sessionKey);
    }
  }, [phase, readingTimeLeft, answeringTimeLeft, selectedAnswers, currentQuestionIndex, userInput, selectedDifficulty, currentQuestion, assessment, sessionKey, participantName, participantPhone]);

  // Timers Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (phase === "READING" && readingTimeLeft !== null && readingTimeLeft > 0) {
      interval = setInterval(() => {
        setReadingTimeLeft(prev => {
          if (prev !== null && prev > 0) return prev - 1;
          return 0;
        });
      }, 1000);
    } else if (phase === "QUESTION" && answeringTimeLeft !== null && answeringTimeLeft > 0) {
      interval = setInterval(() => {
        setAnsweringTimeLeft(prev => {
          if (prev !== null && prev > 0) return prev - 1;
          return 0;
        });
      }, 1000);
    }

    if (readingTimeLeft === 0 && phase === "READING") {
      const transition = () => {
        setTotalReadingTime(assessment!.readingDuration * 60);
        setAnsweringTimeLeft(assessment!.answerDuration * 60);
        setCurrentQuestionIndex(0);
        setCurrentQuestion(allQuestions[0] || null);
        setPhase("QUESTION");
      };
      // Use a timeout to avoid sync setState in effect warning
      const t = setTimeout(transition, 0);
      return () => {
        clearInterval(interval);
        clearTimeout(t);
      };
    }
    
    if (answeringTimeLeft === 0 && phase === "QUESTION") {
      const t = setTimeout(() => autoSubmit(selectedAnswers), 0);
      return () => {
        clearInterval(interval);
        clearTimeout(t);
      };
    }

    return () => clearInterval(interval);
  }, [phase, readingTimeLeft, answeringTimeLeft, assessment, selectedAnswers, autoSubmit, allQuestions]);

  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPriestMode, setIsPriestMode] = useState(true);
  const [speakingProgress, setSpeakingProgress] = useState(0);
  const [speechRate, setSpeechRate] = useState(0.95);
  const [voicePitch, setVoicePitch] = useState(0.85);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [utterance, setUtterance] = useState<SpeechSynthesisUtterance | null>(null);

  const toggleFocusMode = () => {
    setIsFocusMode(!isFocusMode);
    if (!isFocusMode) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const speakText = () => {
    if (!assessment) return;
    
    // Stop any existing speech first
    window.speechSynthesis.cancel();
    
    // Clean text: remove markdown and footnote numbers
    const textToRead = assessment.text
      .replace(/[#*`_]/g, '') // remove markdown
      .replace(/\[\d+\]/g, '') // remove footnote references [1], [2]
      .replace(/\(\d+\)/g, '') // remove parenthesized numbers (1), (2)
      .replace(/\d+:\d+/g, '') // remove bible verse references like 12:3
      .trim();

    if (!textToRead) return;

    const newUtterance = new SpeechSynthesisUtterance(textToRead);
    const voices = window.speechSynthesis.getVoices();
    
    // Voice scoring algorithm to find the absolute best Egyptian male voice
    const getVoiceScore = (v: SpeechSynthesisVoice) => {
      const name = v.name.toLowerCase();
      const lang = v.lang.toLowerCase();
      
      if (!lang.startsWith('ar')) return -1; // Ignore non-Arabic voices
      
      let score = 0;
      
      // Egyptian accent bonus
      const isEgyptian = lang.includes('eg') || name.includes('egypt') || name.includes('مصر');
      if (isEgyptian) score += 100;
      
      // Male voice bonus (heavy priority to satisfy "نبرة راجل")
      const isMale = name.includes('male') || 
                     name.includes('shakir') || 
                     name.includes('maged') || 
                     name.includes('tarik') || 
                     name.includes('naim') || 
                     name.includes('naeem') || 
                     name.includes('hamed') || 
                     name.includes('hamid') || 
                     name.includes('youssef') ||
                     name.includes('chakir');
      if (isMale) {
        score += 200;
      }
      
      // Neural / Natural voice quality bonus (better compression and pronunciation)
      const isNeural = name.includes('neural') || name.includes('natural') || name.includes('online') || name.includes('cloud');
      if (isNeural) score += 50;
      
      return score;
    };
    
    // Sort all Arabic voices
    const sortedArabicVoices = voices
      .map(v => ({ voice: v, score: getVoiceScore(v) }))
      .filter(item => item.score >= 0)
      .sort((a, b) => b.score - a.score);
      
    let selectedVoice = null;
    if (sortedArabicVoices.length > 0) {
      selectedVoice = sortedArabicVoices[0].voice;
    }
    
    if (selectedVoice) {
      newUtterance.voice = selectedVoice;
      newUtterance.lang = selectedVoice.lang;
    } else {
      newUtterance.lang = 'ar-EG'; // Fallback to Egyptian Arabic
    }

    // Set voice properties
    newUtterance.pitch = voicePitch; // Default to 0.85 for a deeper, more solemn male tone
    newUtterance.rate = speechRate; 
    
    newUtterance.onstart = () => setIsSpeaking(true);
    newUtterance.onend = () => {
      setIsSpeaking(false);
      setSpeakingProgress(0);
    };
    newUtterance.onerror = (event) => {
      console.error("Speech error", event);
      setIsSpeaking(false);
    };

    setUtterance(newUtterance);
    window.speechSynthesis.speak(newUtterance);
  };

  const pauseSpeech = () => {
    window.speechSynthesis.pause();
    setIsSpeaking(false);
  };

  const stopSpeech = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setSpeakingProgress(0);
  };

  useEffect(() => {
    // Force voices to load
    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    
    return () => {
      window.speechSynthesis.cancel();
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    const fetchAssessment = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, "assessments", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as Assessment;
          const now = new Date();
          const expiryDate = new Date(data.expiresAt);
          const availableDate = data.availableFrom ? new Date(data.availableFrom) : null;
          if (data.status !== "active") {
            setError("الاختبار ده مش متاح حالياً.");
          } else if (availableDate && availableDate > now) {
            setError(`الاختبار لسه ميعاده مجاش.`);
          } else if (expiryDate < now) {
            setError(`اللينك انتهت صلاحيته يوم ${format(expiryDate, "PPP")}.`);
          } else {
            setAssessment(data);
          }
        } else {
          setError("مش لاقيين الاختبار ده، اتأكد من اللينك.");
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError("مشكلة في الشبكة، جرب تعمل ريفريش.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAssessment();
  }, [id]);

  const startAssessment = async () => {
    if (!participantName || !participantPhone) {
      setDuplicateError("من فضلك اكتب اسمك بالكامل وكود الطالب الخاص بك.");
      return;
    }
    const normalizedPhone = participantPhone.trim().toUpperCase();
    const normalizedName = participantName.trim();
    setParticipantPhone(normalizedPhone);
    setParticipantName(normalizedName);
    setIsLoading(true);
    setDuplicateError(null);
    try {
      const subCollection = collection(db, "submissions");
      const qExact = query(
        subCollection, 
        where("assessmentId", "==", id),
        where("participantPhoneOrId", "==", normalizedPhone),
        limit(1)
      );
      const querySnapshot = await getDocs(qExact);
      const exactMatch = !querySnapshot.empty;
      if (exactMatch) {
        setDuplicateError("أنت سجلت أو جاوبت الاختبار ده قبل كده.");
        setIsLoading(false);
        return;
      }
      const isQuestionsOnly = assessment?.assessmentType === 'questions-only';
      if (isQuestionsOnly) {
        setAnsweringTimeLeft(assessment!.answerDuration * 60);
        setCurrentQuestionIndex(0);
        setCurrentQuestion(allQuestions[0] || null);
        setPhase("QUESTION");
        const sessionData = {
          phase: "QUESTION",
          startTime: Date.now(),
          answers: [],
          qIdx: 0
        };
        localStorage.setItem(sessionKey, JSON.stringify(sessionData));
      } else {
        setReadingTimeLeft(assessment!.readingDuration * 60);
        setPhase("READING");
        const sessionData = {
          phase: "READING",
          startTime: Date.now(),
          answers: [],
          qIdx: 0
        };
        localStorage.setItem(sessionKey, JSON.stringify(sessionData));
      }
      if (assessment?.fullscreenMode) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch (err) {
      console.error("Duplicate check failed", err);
      setError("حصل غلط في التأكيد، جرب تاني.");
    } finally {
      setIsLoading(false);
    }
  };


  const handleGetHint = async () => {
    if (!currentQuestion || !assessment) return;
    setIsGettingHint(true);
    try {
      const hint = await getAIHint(currentQuestion.text, assessment.text);
      setAiHint(hint);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGettingHint(false);
    }
  };

  const handleAnswerSubmit = async () => {
    if (!currentQuestion || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsEvaluating(true);

    try {
      let isCorrect: boolean;
      let score: number;
      let feedback = "";
      const explanation = currentQuestion.explanation || "";

      if (currentQuestion.type === "multiple-choice" || currentQuestion.type === "true-false") {
        if (currentQuestion.type === "true-false") {
          const normalizeTF = (val: string) => {
            const clean = (val || "").trim().toLowerCase();
            if (clean === "true" || clean === "صح" || clean === "صحيح" || clean === "correct") return "true";
            if (clean === "false" || clean === "خطأ" || clean === "غير صحيح" || clean === "wrong") return "false";
            return clean;
          };
          isCorrect = normalizeTF(userInput) === normalizeTF(currentQuestion.correctAnswer);
        } else {
          isCorrect = normalizeArabicName(userInput) === normalizeArabicName(currentQuestion.correctAnswer);
        }
        score = isCorrect ? currentQuestion.points : 0;
      } else {
        // AI Evaluation for short answer
        try {
          const evaluation = await evaluateShortAnswer(
            currentQuestion.text,
            currentQuestion.correctAnswer,
            userInput,
            assessment!.text,
            currentQuestion.aiRubric || "",
          );
          isCorrect = evaluation.score >= 0.8;
          score = Math.round(evaluation.score * currentQuestion.points);
          feedback = evaluation.feedback || "";
        } catch (err) {
          console.error("AI Eval failed", err);
          isCorrect = userInput.trim().length > 10;
          score = isCorrect ? Math.round(currentQuestion.points / 1.5) : 0;
          feedback = "Evaluated via local verification system due to network delay.";
        }
      }

      // Trigger animation status
      setLastFeedback(feedback);
      setAnswerStatus(isCorrect ? "correct" : "incorrect");
      
      // Brief delay to see the result
      const displayTime = feedback ? 3000 : 1200;
      await new Promise(resolve => setTimeout(resolve, displayTime));

      const answer: UserAnswer = {
        questionId: currentQuestion.id,
        difficulty: currentQuestion.difficulty,
        userAnswer: userInput,
        correctAnswer: currentQuestion.correctAnswer,
        isCorrect,
        score,
        maxPoints: currentQuestion.points,
        feedback,
        explanation,
      };

      const newAnswers = [...selectedAnswers, answer];
      setSelectedAnswers(newAnswers);
      setAnswerStatus("idle");
      setLastFeedback(null);
      setIsEvaluating(false);

      if (currentQuestionIndex < allQuestions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
        setCurrentQuestion(allQuestions[currentQuestionIndex + 1]);
        setUserInput("");
        setAiHint(null);
        setPhase("QUESTION");
      } else {
        await completeAssessment(newAnswers);
      }
    } finally {
      isSubmittingRef.current = false;
    }
  };

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-cream">
        <Loader2 className="w-12 h-12 text-brand-red animate-spin" />
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-cream px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-[40px] border border-brand-beige/20 text-center space-y-6 shadow-xl">
          <div className="p-4 bg-rose-50 rounded-2xl inline-block mx-auto">
            <AlertCircle className="w-10 h-10 text-brand-red" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-text">
            عفواً!
          </h1>
          <p className="text-brand-text/60 font-medium">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="w-full py-4 bg-brand-red text-white rounded-2xl font-bold hover:bg-brand-red/90 transition-all shadow-lg shadow-brand-red/10"
          >
            رجوع
          </button>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-brand-cream font-sans">
      <AnimatePresence mode="wait">
        {phase === "WELCOME" && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-xl mx-auto px-6 py-12 md:py-24 relative"
          >
            {/* Back Button */}
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => {
                if (window.history.state && window.history.state.idx > 0) {
                  navigate(-1);
                } else {
                  navigate("/", { replace: true });
                }
              }}
              className="absolute top-4 right-6 md:-right-20 md:top-24 flex flex-col items-center gap-2 group transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-white border border-brand-beige/20 shadow-sm flex items-center justify-center group-hover:bg-brand-red group-hover:text-white transition-all text-brand-beige">
                <ArrowRight className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-beige group-hover:text-brand-red">عودة</span>
            </motion.button>

            <div className="neo-card p-12 space-y-10 border-brand-beige/20 shadow-xl">
              <div className="text-center space-y-8">
                <div className="flex flex-col items-center gap-6">
                  <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-xl border-4 border-brand-beige/10 overflow-hidden">
                    <SmartImage
                      src="/assets/logo-red.png"
                      alt="كنيسة القديسة رفقة"
                      className="w-full h-full object-cover"
                      fallback={<div className="w-full h-full flex items-center justify-center bg-brand-red/5 text-brand-red font-black"><Church className="w-16 h-16" /></div>}
                    />
                  </div>
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-brand-beige/20 overflow-hidden">
                    <SmartImage
                      src="/assets/logo-beige.png"
                      alt="الحكاية ومافيها"
                      className="w-full h-full object-cover"
                      fallback={<div className="w-full h-full flex items-center justify-center bg-brand-beige/5 text-brand-beige font-black">H</div>}
                    />
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-brand-text leading-tight">
                    {assessment?.title}
                  </h1>
                  <p className="text-brand-red text-[11px] mt-4 font-black uppercase tracking-[0.3em]">
                    بوابة الاختبارات التعليمية
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-brand-cream/50 p-4 rounded-3xl border border-brand-beige/20">
                  <p className="text-[10px] font-black uppercase text-brand-beige tracking-widest mb-1">
                    وقت الاختبار
                  </p>
                  <p className="text-lg font-bold text-brand-text/80">
                    {(assessment?.readingDuration || 0) +
                      (assessment?.answerDuration || 0)}
                    :00 دقيقة
                  </p>
                </div>
                <div className="bg-brand-cream/50 p-4 rounded-3xl border border-brand-beige/20">
                  <p className="text-[10px] font-black uppercase text-brand-beige tracking-widest mb-1">
                    نوع الأسئلة
                  </p>
                  <p className="text-lg font-bold text-brand-text/80">
                    مستويات متعددة
                  </p>
                </div>
              </div>

              <div className="space-y-6 text-right">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-brand-beige mb-3 mr-1">
                    الاسم بالكامل
                  </label>
                  <input
                    value={participantName || ''}
                    onChange={(e) => setParticipantName(e.target.value)}
                    className="w-full px-6 py-4 bg-brand-cream/30 border-2 border-brand-beige/10 rounded-2xl focus:border-brand-red focus:ring-4 focus:ring-brand-red/5 outline-none font-bold transition-all text-brand-text text-right"
                    placeholder="اكتب اسمك هنا"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-brand-beige mb-3 mr-1">
                    الكود
                  </label>
                  <input
                    value={participantPhone || ''}
                    onChange={(e) => setParticipantPhone(e.target.value)}
                    className="w-full px-6 py-4 bg-brand-cream/30 border-2 border-brand-beige/10 rounded-2xl focus:border-brand-red focus:ring-4 focus:ring-brand-red/5 outline-none font-bold transition-all text-brand-text text-right uppercase"
                    placeholder="اكتب الكود بتاعك هنا"
                  />
                  {duplicateError && (
                    <p className="mt-2 text-brand-red text-xs font-bold flex items-center gap-1 justify-end">
                      {duplicateError}
                      <AlertCircle className="w-3 h-3" />
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={startAssessment}
                disabled={isLoading}
                className="w-full py-5 bg-brand-red text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-brand-red/90 transition-all disabled:opacity-50 shadow-xl shadow-brand-red/20 active:scale-[0.98]"
              >
                ابدأ الاختبار
                <ArrowRight className="w-5 h-5 scale-x-[-1]" />
              </button>

              <div className="flex items-center justify-center gap-4 text-[10px] font-bold text-brand-beige uppercase tracking-widest">
                <span className="flex items-center gap-1.5 grayscale opacity-60">
                  ذكاء اصطناعي{" "}
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-red" />
                </span>
                <span className="flex items-center gap-1.5 grayscale opacity-60">
                  نظام آمن{" "}
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-red" />
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {phase === "READING" && (
          <motion.div
            key="reading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cn(
              "max-w-4xl mx-auto px-6 py-28 transition-all duration-500",
              isFocusMode ? "max-w-6xl py-12" : ""
            )}
          >
            <div className={cn(
              "fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-brand-beige/20 h-20 transition-transform duration-500",
              isFocusMode ? "-translate-y-full" : "translate-y-0"
            )}>
              <div className="max-w-5xl mx-auto h-full px-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center -space-x-2">
                    <div className="w-10 h-10 rounded-full bg-white border border-brand-beige/20 shadow-sm flex items-center justify-center overflow-hidden z-10">
                      <SmartImage
                        src="/assets/logo-beige.png"
                        alt="Logo"
                        className="w-full h-full object-cover"
                        fallback={<div className="w-full h-full flex items-center justify-center bg-brand-beige/5 text-brand-beige font-black">H</div>}
                      />
                    </div>
                    <div className="w-10 h-10 rounded-full bg-white border border-brand-beige/20 shadow-sm flex items-center justify-center overflow-hidden">
                      <SmartImage
                        src="/assets/logo-red.png"
                        alt="Church"
                        className="w-full h-full object-cover"
                        fallback={<div className="w-full h-full flex items-center justify-center bg-brand-red/5 text-brand-red font-black"><Church className="w-5 h-5" /></div>}
                      />
                    </div>
                  </div>
                  <h3 className="font-bold text-sm truncate max-w-[150px] hidden sm:block text-brand-text">
                    {assessment?.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={isSpeaking ? pauseSpeech : speakText}
                    className={cn(
                      "p-3 rounded-xl transition-all flex items-center justify-center gap-2",
                      isSpeaking ? "bg-brand-red text-white shadow-lg shadow-brand-red/20" : "bg-brand-cream/50 text-brand-beige hover:text-brand-red hover:bg-brand-red/5"
                    )}
                    title={isSpeaking ? "إيقاف مؤقت" : "قراءة النص بصوت عالي"}
                  >
                    {isSpeaking ? <Pause className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    <span className="text-[10px] font-black uppercase hidden sm:block">{isSpeaking ? "توقف" : "قراءة"}</span>
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                      className={cn(
                        "p-3 rounded-xl transition-all flex items-center justify-center gap-2",
                        showVoiceSettings ? "bg-brand-red text-white shadow-lg shadow-brand-red/20" : "bg-brand-cream/50 text-brand-beige hover:text-brand-red hover:bg-brand-red/5"
                      )}
                      title="إعدادات الصوت"
                    >
                      <SlidersHorizontal className="w-5 h-5" />
                    </button>
                    {showVoiceSettings && (
                      <div className="absolute top-14 left-0 w-64 bg-white rounded-3xl border border-brand-beige/20 shadow-2xl p-5 z-50 space-y-4 text-right">
                        <h4 className="font-extrabold text-xs text-brand-text/80 border-b border-brand-beige/10 pb-2 mb-2">إعدادات قراءة النص</h4>
                        
                        {/* Speed range */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold text-brand-beige">
                            <span>{speechRate}x</span>
                            <span>سرعة القراءة</span>
                          </div>
                          <input
                            type="range"
                            min="0.6"
                            max="1.5"
                            step="0.05"
                            value={speechRate}
                            onChange={(e) => {
                              setSpeechRate(parseFloat(e.target.value));
                              if (isSpeaking) {
                                speakText();
                              }
                            }}
                            className="w-full accent-brand-red cursor-pointer"
                          />
                        </div>

                        {/* Pitch range */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold text-brand-beige">
                            <span>{voicePitch === 0.85 ? "وقور جداً" : voicePitch === 1.0 ? "طبيعي" : `${voicePitch}`}</span>
                            <span>نبرة الصوت (الطبقة)</span>
                          </div>
                          <input
                            type="range"
                            min="0.5"
                            max="1.5"
                            step="0.05"
                            value={voicePitch}
                            onChange={(e) => {
                              setVoicePitch(parseFloat(e.target.value));
                              if (isSpeaking) {
                                speakText();
                              }
                            }}
                            className="w-full accent-brand-red cursor-pointer"
                          />
                          <p className="text-[9px] text-brand-beige text-left font-black mt-1">الطبقات الأقل تعطي صوتاً أعمق وأكثر وقاراً.</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={toggleFocusMode}
                    className={cn(
                      "p-3 rounded-xl transition-all flex items-center justify-center gap-2",
                      isFocusMode ? "bg-brand-text text-white" : "bg-brand-cream/50 text-brand-beige hover:text-brand-text hover:bg-brand-text/5"
                    )}
                    title={isFocusMode ? "إغلاق وضع التركيز" : "وضع التركيز"}
                  >
                    {isFocusMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    <span className="text-[10px] font-black uppercase hidden sm:block">{isFocusMode ? "خروج" : "تركيز"}</span>
                  </button>
                  <div className="w-px h-8 bg-brand-beige/10 mx-2" />
                  <div className="relative">
                    <Timer
                      className="w-40"
                      timeLeft={readingTimeLeft || 0}
                      totalTime={assessment!.readingDuration * 60}
                    />
                    {readingTimeLeft !== null && readingTimeLeft <= 30 && readingTimeLeft > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute -top-10 left-0 right-0 text-center"
                      >
                         <span className="bg-rose-500 text-white text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest shadow-lg animate-bounce inline-block">
                           باقي أقل من ٣٠ ثانية!
                         </span>
                      </motion.div>
                    )}
                  </div>
                  <button
                    onClick={finishReading}
                    className="px-6 py-2.5 bg-brand-red text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-red/90 transition-all font-sans shadow-lg shadow-brand-red/10"
                  >
                    انتقل للأسئلة
                  </button>
                </div>
              </div>
            </div>

            <div className="neo-card p-16 md:p-24 shadow-2xl min-h-[70vh] border-brand-beige/10 transition-all text-right relative">


              <article className={cn(
                "prose prose-xl prose-slate max-w-none prose-p:font-sans prose-p:leading-[2] prose-p:text-brand-text/90 prose-headings:text-brand-text font-sans",
                isFocusMode && "prose-2xl"
              )}>
                <ReactMarkdown>{assessment!.text}</ReactMarkdown>
              </article>

              <div className="mt-12 pt-8 border-t border-brand-beige/10 flex justify-center">
                <button
                  onClick={finishReading}
                  className="px-8 py-4 bg-brand-red text-white rounded-2xl text-sm font-black tracking-wider hover:bg-brand-red/90 transition-all shadow-xl shadow-brand-red/10 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <BookOpen className="w-5 h-5" />
                  انتهيت من القراءة، انتقل للأسئلة 📝
                </button>
              </div>
            </div>

            {assessment?.antiCopyMode && (
              <div className="fixed inset-0 pointer-events-none select-none overflow-hidden opacity-[0.03] z-0 flex flex-wrap gap-10 p-10 rotate-12">
                {Array.from({ length: 40 }).map((_, i) => (
                  <span
                    key={i}
                    className="text-lg font-black uppercase tracking-[0.8em]"
                  >
                    {participantName} {participantPhone}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        )}


        {phase === "QUESTION" && currentQuestion && (
          <motion.div
            key="question-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-3xl mx-auto px-6 py-24"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion.id}
                variants={{
                  idle: { x: 0, scale: 1, opacity: 1 },
                  shake: { 
                    x: [0, -10, 10, -10, 10, 0],
                    transition: { duration: 0.4 }
                  },
                  correct: {
                    scale: [1, 1.02, 1],
                    transition: { duration: 0.3 }
                  },
                  exit: { opacity: 0, x: 20 }
                }}
                initial={{ opacity: 0, x: -20 }}
                animate={answerStatus === 'correct' ? 'correct' : answerStatus === 'incorrect' ? 'shake' : 'idle'}
                exit="exit"
                transition={{ duration: 0.3 }}
                className="neo-card p-12 space-y-10 border-brand-beige/20 shadow-2xl relative overflow-hidden"
              >
                {/* Answer Status Overlays */}
                <AnimatePresence>
                  {answerStatus !== 'idle' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={cn(
                        "absolute inset-0 backdrop-blur-[2px] z-[60] flex flex-col items-center justify-center p-8 text-center",
                        answerStatus === 'correct' ? "bg-emerald-500/10" : "bg-brand-red/10"
                      )}
                    >
                      <motion.div
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className="bg-white p-6 rounded-full shadow-2xl mb-6"
                      >
                        {answerStatus === 'correct' ? (
                          <CheckCircle2 className="w-16 h-16 text-emerald-500" />
                        ) : (
                          <AlertCircle className="w-16 h-16 text-brand-red" />
                        )}
                      </motion.div>
                      {lastFeedback && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white/90 p-6 rounded-3xl shadow-xl max-w-sm border border-brand-beige/20"
                        >
                          <p className="text-sm font-bold text-brand-text leading-relaxed">
                            {lastFeedback}
                          </p>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Decorative background element for the question card */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-red/5 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none" />
                
                <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm",
                      currentQuestion.difficulty === "easy"
                        ? "bg-emerald-50 text-emerald-600"
                        : currentQuestion.difficulty === "medium"
                          ? "bg-amber-50 text-amber-600"
                          : "bg-rose-50 text-brand-red",
                    )}
                  >
                    {currentQuestion.difficulty[0].toUpperCase()}
                  </div>
                  <div className="text-right">
                    <h3 className="font-bold text-[10px] uppercase tracking-widest text-brand-beige">
                      سؤال {currentQuestionIndex + 1} من {allQuestions.length}
                    </h3>
                    <p className="text-[11px] font-black text-brand-red uppercase tracking-widest">
                      {currentQuestion.difficulty === "easy" ? "سهل" : currentQuestion.difficulty === "medium" ? "متوسط" : "صعب"} | {currentQuestion.points} درجات
                    </p>
                  </div>
                </div>
                  <div className="relative">
                    <Timer
                      className="w-32"
                      timeLeft={answeringTimeLeft || 0}
                      totalTime={assessment!.answerDuration * 60}
                    />
                    {answeringTimeLeft !== null && answeringTimeLeft <= 30 && answeringTimeLeft > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute -top-10 left-0 right-0 text-center"
                      >
                         <span className="bg-rose-500 text-white text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest shadow-lg animate-bounce inline-block">
                           ٣٠ ثانية!
                         </span>
                      </motion.div>
                    )}
                  </div>
              </div>

              <div className="space-y-8 max-h-[50vh] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-brand-beige/20">
                <h4 className="text-2xl md:text-3xl font-extrabold leading-tight text-brand-text font-sans text-right">
                  {currentQuestion.text}
                </h4>

                {currentQuestion.type === "multiple-choice" ? (
                  <div className="grid grid-cols-1 gap-3">
                    {currentQuestion.options?.map((option, idx) => (
                      <motion.button
                        key={idx}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => setUserInput(option)}
                        className={cn(
                          "w-full p-6 text-right rounded-2xl border-2 transition-all font-bold text-base flex items-center justify-between group",
                          userInput === option
                            ? "border-brand-red bg-brand-red text-white shadow-xl shadow-brand-red/10"
                            : "border-brand-beige/10 bg-brand-cream/30 text-brand-text/60 hover:border-brand-beige/30",
                        )}
                      >
                        <div
                          className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                            userInput === option
                              ? "border-white/40 bg-white/20"
                              : "border-brand-beige/30",
                          )}
                        >
                          {userInput === option && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                            >
                              <CheckCircle2 className="w-3 h-3 text-white" />
                            </motion.div>
                          )}
                        </div>
                        {option}
                      </motion.button>
                    ))}
                  </div>
                ) : currentQuestion.type === "true-false" ? (
                  <div className="grid grid-cols-2 gap-4">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setUserInput("True")}
                      className={cn(
                        "py-8 rounded-[32px] border-2 transition-all font-black text-2xl",
                        userInput === "True"
                          ? "border-brand-red bg-brand-red text-white shadow-xl shadow-brand-red/10"
                          : "border-brand-beige/10 bg-brand-cream/30 text-brand-beige hover:border-brand-beige/30",
                      )}
                    >
                      صح
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setUserInput("False")}
                      className={cn(
                        "py-8 rounded-[32px] border-2 transition-all font-black text-2xl",
                        userInput === "False"
                          ? "border-brand-red bg-brand-red text-white shadow-xl shadow-brand-red/10"
                          : "border-brand-beige/10 bg-brand-cream/30 text-brand-beige hover:border-brand-beige/30",
                      )}
                    >
                      غلط
                    </motion.button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {currentQuestion.type === "short-answer" && (
                      <div className="flex justify-end">
                        <button
                          onClick={handleGetHint}
                          disabled={isGettingHint || !!aiHint}
                          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-beige hover:text-brand-red transition-all group"
                        >
                          {isGettingHint ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <HelpCircle className="w-3 h-3" />
                          )}
                          {aiHint ? "تم عرض التلميح" : "محتاج تلميح؟ (ذكاء اصطناعي)"}
                        </button>
                      </div>
                    )}
                    {aiHint && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-brand-cream/50 border-r-4 border-brand-red rounded-xl text-right"
                      >
                        <p className="text-xs font-bold text-brand-text/80 leading-relaxed italic">
                          💡 {aiHint}
                        </p>
                      </motion.div>
                    )}
                    <textarea
                      value={userInput || ''}
                      onChange={(e) => setUserInput(e.target.value)}
                      className="w-full h-48 px-8 py-8 bg-brand-cream/30 border-2 border-brand-beige/10 rounded-[32px] focus:border-brand-red focus:ring-4 focus:ring-brand-red/5 outline-none font-bold leading-relaxed resize-none text-brand-text text-right"
                      placeholder="اكتب إجابتك هنا بالتفصيل..."
                    />
                    <p className="text-[10px] text-brand-beige font-bold uppercase tracking-widest flex items-center gap-2 justify-end">
                      الذكاء الاصطناعي بيقيم إجابتك دلوقتي{" "}
                      <Sparkles className="w-3 h-3 text-brand-beige" />
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-10 border-t border-brand-beige/10 flex items-center justify-between">
                <div className="text-[10px] font-black text-brand-beige uppercase tracking-[0.4em]">
                  سؤال رقم {currentQuestionIndex + 1}
                </div>
                <button
                  onClick={handleAnswerSubmit}
                  disabled={!userInput || isEvaluating}
                  className="px-10 py-4 bg-brand-red text-white rounded-2xl font-bold flex items-center gap-3 disabled:opacity-50 hover:bg-brand-red/90 transition-all shadow-xl shadow-brand-red/20 active:scale-95"
                >
                  {isEvaluating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "إرسال الإجابة"
                  )}
                  {!isEvaluating && (
                    <ArrowRight className="w-4 h-4 scale-x-[-1]" />
                  )}
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}

        {phase === "RESULTS" && finalSubmission && (
          <motion.div
            key="results"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-4xl mx-auto px-6 py-20"
          >
            <div className="bg-white p-16 rounded-[48px] shadow-2xl space-y-16 border border-brand-beige/20">
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-[32px] flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h1 className="text-4xl font-extrabold tracking-tight text-brand-text">
                    عاش يا {finalSubmission.participantName.split(' ')[0]}!
                  </h1>
                  <p className="text-brand-text/60 text-lg mt-2 font-bold">
                    إجاباتك وصلت بسلامة ونقدر نقول مبروك.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <ResultCircle
                  label="درجتك الكلية"
                  value={finalSubmission.finalScore}
                  subValue={`من مجموع ${finalSubmission.maxScore}`}
                  color="red"
                />
                <ResultCircle
                  label="عدد الأيام المتتالية"
                  value={finalSubmission.streakCount}
                  subValue="أيام الالتزام"
                  icon={<Flame className="w-4 h-4" />}
                  color="gold"
                />
                <ResultCircle
                  label="مستوى الدقة"
                  value={`${calculatePercentage(finalSubmission.baseScore, finalSubmission.maxScore)}%`}
                  subValue="مستوى الاستيعاب"
                  color="green"
                />
              </div>



              <div className="space-y-8 pt-10 border-t border-brand-beige/10 text-right">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-beige text-center">
                  تفاصيل الأسئلة
                </h3>
                <div className="space-y-4">
                  {finalSubmission.answers.map((ans, i) => (
                    <div
                      key={i}
                      className="flex gap-8 p-8 bg-brand-cream/30 rounded-[40px] border border-brand-beige/10 transition-all hover:border-brand-beige/30"
                    >
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center justify-between">
                          <span
                            className={cn(
                              "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                              ans.difficulty === "easy"
                                ? "bg-emerald-100 text-emerald-700"
                                : ans.difficulty === "medium"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-rose-100 text-brand-red",
                            )}
                          >
                            {ans.difficulty === "easy"
                              ? "سهل"
                              : ans.difficulty === "medium"
                                ? "متوسط"
                                : "صعب"}
                          </span>
                          <span className="font-bold text-brand-text text-sm">
                            {ans.score} / {ans.maxPoints} درجة
                          </span>
                        </div>
                        <p className="text-sm font-black text-brand-beige uppercase tracking-tighter">
                          إجابتك:{" "}
                          <span className="text-brand-text">
                            {ans.userAnswer}
                          </span>
                        </p>
                        {!ans.isCorrect && (
                          <p className="text-sm font-black text-emerald-600 uppercase tracking-tighter">
                            الإجابة الصح: <span>{ans.correctAnswer}</span>
                          </p>
                        )}
                        {ans.explanation && (
                          <div className="bg-white/50 p-4 rounded-2xl border border-brand-beige/10">
                            <p className="text-[10px] font-black uppercase text-brand-beige tracking-widest mb-1 text-right">
                              شرح الإجابة
                            </p>
                            <p className="text-xs text-brand-text/80 leading-relaxed font-bold text-right">
                              {ans.explanation}
                            </p>
                          </div>
                        )}
                        {ans.feedback && (
                          <p className="text-sm text-brand-text/60 font-bold leading-relaxed italic border-r-2 border-brand-beige pr-4 text-right">
                            {ans.feedback}
                          </p>
                        )}
                      </div>
                      <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center font-bold text-xs shadow-sm border border-brand-beige/10 flex-shrink-0">
                        {i + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <button
                  onClick={() => navigate(isStudent ? "/student" : "/")}
                  className="w-full py-5 bg-brand-text text-white rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-brand-red transition-all shadow-xl shadow-brand-text/10"
                >
                  {isStudent ? "رجوع للصفحة الرئيسية" : "رجوع لصفحة الاختبارات"}
                </button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Link
                    to={`/student/review/${finalSubmission.id}`}
                    className="flex-1 py-5 bg-white border border-brand-beige/20 text-brand-text font-black rounded-3xl transition-all flex items-center justify-center gap-2 hover:bg-brand-cream"
                  >
                    <Eye className="w-5 h-5" />
                    مراجعة الإجابات
                  </Link>
                  {calculatePercentage(finalSubmission.finalScore, finalSubmission.maxScore) >= 90 && (
                    <Certificate 
                      studentName={finalSubmission.participantName}
                      assessmentTitle={finalSubmission.assessmentTitle}
                      score={finalSubmission.finalScore}
                      maxScore={finalSubmission.maxScore}
                      date={format(new Date(finalSubmission.date), 'PPP', { locale: ar })}
                    />
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="px-4 py-3 bg-slate-50 rounded-2xl flex items-center justify-center gap-3 border border-slate-100">
      <div className="text-slate-400">{icon}</div>
      <span className="text-xs font-bold text-slate-700 tracking-tight">
        {label}
      </span>
    </div>
  );
}

function DifficultyCard({
  level,
  points,
  description,
  color,
  onClick,
}: {
  level: string;
  points: number;
  description: string;
  color: "green" | "gold" | "red";
  onClick: () => void;
}) {
  const colorMap = {
    green:
      "hover:border-emerald-200 hover:bg-emerald-500",
    gold:
      "hover:border-amber-200 hover:bg-amber-500",
    red: "hover:border-brand-red/30 hover:bg-brand-red",
  };

  const badgeMap = {
    green: "bg-emerald-50 text-emerald-600",
    gold: "bg-amber-50 text-amber-600",
    red: "bg-rose-50 text-brand-red",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex items-center justify-between p-8 bg-white border border-brand-beige/20 rounded-[32px] transition-all text-right shadow-sm",
        colorMap[color],
      )}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-4 justify-end">
          <span className="text-[10px] font-black text-brand-beige uppercase tracking-widest group-hover:text-white/60">
            {points} درجة متاحة
          </span>
          <span
            className={cn(
              "px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
              badgeMap[color],
            )}
          >
            {level}
          </span>
        </div>
        <p className="text-xl font-extrabold text-brand-text transition-colors group-hover:text-white leading-tight">
          {description}
        </p>
      </div>
      <div className="p-4 rounded-2xl bg-brand-cream group-hover:bg-white/10 transition-colors">
        <ArrowRight className="w-6 h-6 text-brand-beige group-hover:text-white scale-x-[-1]" />
      </div>
    </button>
  );
}

function ResultCircle({
  label,
  value,
  subValue,
  color,
  icon,
}: {
  label: string;
  value: string | number;
  subValue: string;
  color: string;
  icon?: React.ReactNode;
}) {
  const colorMap: any = {
    red: "text-brand-red bg-white",
    gold: "text-amber-600 bg-white",
    green: "text-emerald-600 bg-white",
  };

  return (
    <div className="space-y-6">
      <div
        className={cn(
          "w-36 h-36 rounded-full mx-auto flex flex-col items-center justify-center border-8 border-brand-cream shadow-xl shadow-brand-beige/10",
          colorMap[color],
        )}
      >
        <div className="text-4xl font-black tracking-tighter">{value}</div>
        {icon && <div className="mt-1">{icon}</div>}
      </div>
      <div>
        <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-beige mb-2">
          {label}
        </h4>
        <p className="text-xs font-bold text-brand-text/40 uppercase tracking-widest">
          {subValue}
        </p>
      </div>
    </div>
  );
}
