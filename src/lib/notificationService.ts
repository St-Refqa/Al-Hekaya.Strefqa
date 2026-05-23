import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebase";

export type NotificationType = "info" | "warning" | "success";
export type NotificationCategory = "assessments" | "achievements" | "announcements" | "system";

interface CreateNotificationParams {
  title: string;
  message: string;
  type?: NotificationType;
  category?: NotificationCategory;
  targetId?: string; // Optional specific user ID
  targetRole?: "admin" | "student"; // Optional role target
  targetGroups?: string[]; // Multiple groups
  actionUrl?: string;
}

export const notificationService = {
  async sendNotification({
    title,
    message,
    type = "info",
    category = "system",
    targetId,
    targetRole,
    targetGroups,
  }: CreateNotificationParams) {
    try {
      await addDoc(collection(db, "notifications"), {
        title,
        message,
        type,
        category,
        targetId: targetId || null,
        targetRole: targetRole || null,
        targetGroups: targetGroups || [],
        createdAt: serverTimestamp(),
        isRead: false,
        readBy: [],
        hiddenFrom: []
      });
      return { success: true };
    } catch (error) {
      console.error("Error sending notification:", error);
      return { success: false, error };
    }
  },

  async checkAndInjectWeeklyReminders() {
    try {
      const today = new Date();
      const day = today.getDay(); // 0 is Sunday, 4 is Thursday, 6 is Saturday
      const hour = today.getHours();
      
      // We only execute at 9 AM or later
      if (hour < 9) return;

      const todayStr = today.toDateString();
      const localCheckKey = `ref_rem_chk_${todayStr}`;
      if (localStorage.getItem(localCheckKey)) return;

      // Calculate the ISO year and week tag (e.g. 2026-W21)
      const d = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
      const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      const weekId = `${d.getUTCFullYear()}-W${weekNo}`;

      let targetGroup: "OT" | "NT" | null = null;
      let title = "";
      let message = "";
      let tag = "";

      if (day === 6) { // Saturday -> OT meeting
        targetGroup = "OT";
        title = "تذكير باجتماع العهد القديم اليوم! ⛪";
        message = "مستنيينك النهاردة الساعة 7:00 مساءً في اجتماع العهد القديم. متنساش كارت الحضور الرقمي (QR) بتاعك لتسجيل نقاط حضورك اليوم! 🌟";
        tag = `OT_MEET_${weekId}`;
      } else if (day === 4) { // Thursday -> NT meeting
        targetGroup = "NT";
        title = "تذكير باجتماع العهد الجديد اليوم! ⛪";
        message = "مستنيينك النهاردة الساعة 7:00 مساءً في اجتماع العهد الجديد. متنساش كارت الحضور الرقمي (QR) بتاعك لتسجيل نقاط حضورك اليوم! 🌟";
        tag = `NT_MEET_${weekId}`;
      }

      if (targetGroup && tag) {
        const qRef = query(
          collection(db, "notifications"), 
          where("weeklyMeetingTag", "==", tag)
        );
        const snap = await getDocs(qRef);

        if (snap.empty) {
          await addDoc(collection(db, "notifications"), {
            title,
            message,
            type: "info",
            category: "announcements",
            targetId: null,
            targetRole: "student",
            targetGroups: [targetGroup],
            weeklyMeetingTag: tag,
            createdAt: serverTimestamp(),
            isRead: false,
            readBy: [],
            hiddenFrom: []
          });
          console.log(`Weekly reminder notification generated for group ${targetGroup}`);
        }
      }

      localStorage.setItem(localCheckKey, "true");
    } catch (err) {
      console.error("Error checking/injecting weekly reminders:", err);
    }
  }
};
