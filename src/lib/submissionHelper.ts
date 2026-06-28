import { db } from "./firebase";
import { doc, collection, addDoc } from "firebase/firestore";
import { runTransaction } from "./firebase";
import { User, Submission } from "../types";
import { calculateStreak } from "../utils/streak";
import { calculatePercentage } from "./utils";
import { checkNewBadges } from "./badges";
import { calculateLevel } from "./levels";
import { notificationService } from "../services/notificationService";

export interface ProcessSubmissionPayload {
  submission: Submission;
  participantPhone: string;
  userId: string | null;
  baseScore: number;
}

export async function processSubmissionTransaction(payload: ProcessSubmissionPayload) {
  const { submission, participantPhone, userId, baseScore } = payload;
  
  // 1. Transaction to update user and participant
  await runTransaction(db, async (transaction) => {
    const userRef = userId ? doc(db, "users", userId) : null;
    const participantRef = doc(db, "participants", participantPhone);

    const userSnap = userRef ? await transaction.get(userRef) : null;
    const participantSnap = await transaction.get(participantRef);

    const today = new Date().toISOString().split('T')[0];
    const streakCount = calculateStreak(participantSnap?.exists() ? (participantSnap.data() as any).lastCompletedDate : null);
    submission.streakCount = streakCount; // Ensure it matches

    if (participantSnap?.exists()) {
      await transaction.update(participantRef, {
        name: submission.participantName,
        phoneOrId: participantPhone,
        streakCount,
        lastCompletedDate: today,
      }, { merge: true });
    } else {
      await transaction.set(participantRef, {
        name: submission.participantName,
        phoneOrId: participantPhone,
        streakCount: 1,
        lastCompletedDate: today,
      });
    }

    if (userRef && userSnap?.exists()) {
      const uData = userSnap.data() as User;
      const newTotalExams = (uData.totalExams || 0) + 1;
      const newTotalPoints = (uData.totalPoints || 0) + baseScore;
      const currentPercentage = calculatePercentage(baseScore, submission.maxScore);
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

      await transaction.update(userRef, updatedUser);

      notificationService.sendNotification({
        title: "نتيجة الاختبار 📊",
        message: `لقد أكملت اختبار ${submission.assessmentTitle} بنجاح. درجتك: ${baseScore}`,
        type: "info",
        category: "assessments",
        targetId: uData.uid,
        weeklyMeetingTag: `result_notif_${uData.uid}_${submission.assessmentId}`
      }).catch(console.error);
    }
  });

  // 2. Add submission document
  const docRef = await addDoc(collection(db, "submissions"), submission);
  return { ...submission, id: docRef.id };
}
