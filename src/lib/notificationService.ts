import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc, runTransaction } from "firebase/firestore";
import { db } from "./firebase";
import { saturdaySchedules } from "../data/fixedSchedules";

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
      const sessCheckKey = `ref_rem_chk_sess_${todayStr}`;
      
      // Avoid querying/writing if checked already in local or session storage
      if (localStorage.getItem(localCheckKey) || sessionStorage.getItem(sessCheckKey)) return;

      // Mark as checked in session immediately to avoid dual queries
      sessionStorage.setItem(sessCheckKey, "true");

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

      if (day === 6) { // Saturday -> Weekly meeting
        targetGroup = "OT"; // Set dummy OT to pass truthy check
        title = "تذكير بالاجتماع الأسبوعي اليوم! ⛪";
        message = "مستنيينك النهاردة الساعة 7:00 مساءً في الاجتماع الأسبوعي العام. متنساش كارت الحضور الرقمي (QR) بتاعك لتسجيل نقاط حضورك اليوم! 🌟";
        tag = `OT_MEET_${weekId}`;
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
            targetGroups: ["OT", "NT"], // Target both student groups
            weeklyMeetingTag: tag,
            createdAt: serverTimestamp(),
            isRead: false,
            readBy: [],
            hiddenFrom: []
          });
          console.log(`Weekly reminder notification generated for Saturday`);
        }
      }

      localStorage.setItem(localCheckKey, "true");
    } catch (err) {
      console.error("Error checking/injecting weekly reminders:", err);
    }
  },

  async checkAndInjectPrepMeetingReminders(force = false) {
    try {
      const now = Date.now();
      const localCheckKey = "ref_prep_meetings_chk_sess";
      
      // 1. Client-side Session Debounce/Throttling:
      // Skip if checked within last 15 minutes to avoid concurrent client runs and duplicate queries.
      if (!force) {
        const lastCheck = sessionStorage.getItem(localCheckKey);
        if (lastCheck && now - parseInt(lastCheck, 10) < 15 * 60 * 1000) {
          return;
        }
      }
      
      // Set key before performing query to prevent concurrent local runs
      sessionStorage.setItem(localCheckKey, now.toString());

      const snap = await getDocs(query(collection(db, "preparationMeetings")));
      
      let servantsCache: any[] | null = null;
      const getServantPhones = async (): Promise<string[]> => {
        if (servantsCache === null) {
          try {
            const usersSnap = await getDocs(collection(db, "users"));
            servantsCache = usersSnap.docs
              .map(doc => doc.data())
              .filter(u => u.role === "servant" || (u.code && u.code.toUpperCase().startsWith("S")));
          } catch (e) {
            console.error("Error loading servants list for WhatsApp reminders:", e);
            servantsCache = [];
          }
        }
        return servantsCache
          .map(s => s.whatsappNumber)
          .filter((phone): phone is string => typeof phone === "string" && phone.trim() !== "");
      };
      
      for (const d of snap.docs) {
        const meeting = d.data();
        if (!meeting.dateTime) continue;
        
        const meetingTime = new Date(meeting.dateTime).getTime();
        const diffHours = (meetingTime - now) / (1000 * 60 * 60);
        const meetingDocRef = doc(db, "preparationMeetings", d.id);
        
        // 1. Send immediate notification on meeting scheduling (if not sent yet)
        if (meetingTime > now && !meeting.immediateSent) {
          // Attempt atomic database write lock using transaction
          let acquiredImmediateLock = false;
          try {
            await runTransaction(db, async (transaction) => {
              const mSnap = await transaction.get(meetingDocRef);
              if (!mSnap.exists()) return;
              const currentMeeting = mSnap.data();
              if (!currentMeeting.immediateSent) {
                transaction.update(meetingDocRef, { immediateSent: true });
                acquiredImmediateLock = true;
              }
            });
          } catch (tError) {
            console.error(`Failed to acquire immediate lock for meeting ${d.id}:`, tError);
          }

          if (acquiredImmediateLock) {
            const dateFormatted = new Date(meeting.dateTime).toLocaleString('ar-EG', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            });

            await addDoc(collection(db, "notifications"), {
              title: `📅 اجتماع تحضيري جديد للخدمة`,
              message: `تمت جدولة اجتماع تحضيري رئيسي جديد بعنوان "${meeting.title}" يوم (${dateFormatted}). يرجى من جميع الخدام الاستعداد وتجهيز الفقرات للخدمة! ⛪📿`,
              type: "info",
              category: "announcements",
              targetId: null,
              targetGroups: ["servant"],
              createdAt: serverTimestamp(),
              isRead: false,
              readBy: [],
              hiddenFrom: []
            });

            console.log(`Automatic immediate scheduling reminder sent to database for: ${meeting.title}`);

            try {
              const phones = await getServantPhones();
              if (phones.length > 0) {
                const waMessage = `🔔 اجتماع تحضيري جديد للخدام:
📍 العنوان: ${meeting.title}
📅 الموعد: ${dateFormatted}
📝 الأجندة:
${meeting.description}

يرجى من جميع الخدام الاستعداد وتجهيز فقرات الخدمة للتحضير واليوم! ⛪📿`;
                await this.sendWhatsAppReminders(phones, waMessage);
              }
            } catch (err) {
              console.error("Failed to run immediate WhatsApp reminders:", err);
            }
          }
        }

        // 2. Send 12 hours before meeting notification
        if (diffHours >= 0 && diffHours <= 12 && !meeting.reminderSent12h) {
          // Attempt atomic database write lock using transaction
          let acquired12hLock = false;
          try {
            await runTransaction(db, async (transaction) => {
              const mSnap = await transaction.get(meetingDocRef);
              if (!mSnap.exists()) return;
              const currentMeeting = mSnap.data();
              if (!currentMeeting.reminderSent12h) {
                transaction.update(meetingDocRef, { reminderSent12h: true });
                acquired12hLock = true;
              }
            });
          } catch (tError) {
            console.error(`Failed to acquire 12h pre-meeting lock for meeting ${d.id}:`, tError);
          }

          if (acquired12hLock) {
            const dateFormatted = new Date(meeting.dateTime).toLocaleString('ar-EG', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            });
            
            await addDoc(collection(db, "notifications"), {
              title: `تذكير بموعد: اجتماع تحضيري للم شمل الخدام ⏰`,
              message: `الاجتماع التحضيري الرئيسي "${meeting.title}" سيبدأ بعد أقل من 12 ساعة في تمام الساعة (${dateFormatted.split('،')[1] || dateFormatted}). رجاء الحضور والاستعداد لتجهيز فقرات الخدمة واليوم! ⛪💫`,
              type: "warning",
              category: "announcements",
              targetId: null,
              targetGroups: ["servant"],
              createdAt: serverTimestamp(),
              isRead: false,
              readBy: [],
              hiddenFrom: []
            });
            
            console.log(`Automatic 12-hour pre-meeting reminder sent to database for: ${meeting.title}`);

            try {
              const phones = await getServantPhones();
              if (phones.length > 0) {
                const waMessage = `⏰ تذكير: اجتماع تحضيري هام للخدام بعد ساعات قليلة!
📍 العنوان: ${meeting.title}
📅 سيبدأ اللقاء بإذن ربنا في تمام الساعة: (${dateFormatted.split('،')[1] || dateFormatted})

رجاء من جميع الخدام الاستعداد لتجهيز فقرات لقاء النهضة وتحضير الخدمة والحرص على حضوركم الموقر! ⛪💫`;
                await this.sendWhatsAppReminders(phones, waMessage);
              }
            } catch (err) {
              console.error("Failed to run 12-hour WhatsApp reminders:", err);
            }
          }
        }
      }
    } catch (err) {
      console.error("Error running prep meeting checks:", err);
    }
  },

  async sendWhatsAppReminders(phones: string[], message: string) {
    if (phones.length === 0) return;
    try {
      const response = await fetch("/api/system/dispatch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          recipients: phones,
          message
        })
      });
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const data = await response.json();
      console.log("WhatsApp bulk send trigger result:", data);
    } catch (err) {
      console.error("Failed to trigger backend WhatsApp reminders:", err);
    }
  },

  async checkAndInjectFixedMeetings12hReminders() {
    try {
      const today = new Date();
      const todayStr = today.toDateString();
      const localCheckKey = `ref_fixed_12h_chk_${todayStr}`;
      const sessCheckKey = `ref_fixed_12h_chk_sess_${todayStr}`;

      // Avoid dual checks on the same session/local instance
      if (localStorage.getItem(localCheckKey) || sessionStorage.getItem(sessCheckKey)) return;

      sessionStorage.setItem(sessCheckKey, "true");

      const now = Date.now();
      const year = 2026;

      const checkScheduleList = async (schedule: any[], type: "OT" | "NT") => {
        for (const item of schedule) {
          if (!item.date) continue;
          
          const parts = item.date.split('/');
          const dayVal = parseInt(parts[0]?.trim());
          const monthVal = parseInt(parts[1]?.trim()) - 1; // 0-indexed month

          if (isNaN(dayVal) || isNaN(monthVal)) continue;

          // Fixed meetings are at 7:00 PM (19:00:00) on the respective days
          const meetingDate = new Date(year, monthVal, dayVal, 19, 0, 0);
          const meetingTime = meetingDate.getTime();
          const diffHours = (meetingTime - now) / (1000 * 60 * 60);

          // If the meeting starts in 12 hours or less and has not started yet
          if (diffHours >= 0 && diffHours <= 12) {
            const tag = `${type}_MEET_12H_${year}_${monthVal + 1}_${dayVal}`;
            
            // Check if reminder was already generated in Firestore
            const qRef = query(
              collection(db, "notifications"), 
              where("weeklyMeetingTag", "==", tag)
            );
            const snap = await getDocs(qRef);

            if (snap.empty) {
              const isSpecial = item.isSpecialEvent;
              let title: string;
              let message: string;

              if (type === "OT") {
                title = `⏰ تذكير: اجتماع العهد القديم بعد 12 ساعة!`;
                if (isSpecial) {
                  message = `نود تذكيركم بالاجتماع الاستثنائي للعهد القديم اليوم في تمام الساعة 7:00 مساءً. الحدث: "${item.topic1}". حضوركم يبهج قلوبنا جميعاً! ⛪🌸`;
                } else {
                  message = `مستنيينك النهاردة الساعة 7:00 مساءً في اجتماع العهد القديم. موضوعات اليوم الشائقة هي - الفقرة الأولى: "${item.topic1}"${item.topic2 ? ` | والفقرة الثانية: "${item.topic2}"` : ""}. متنساش كارت الحضور الرقمي (QR) لتسجيل نقاط حضورك الفوري! ⛪✨`;
                }
              } else {
                title = `⏰ تذكير: اجتماع العهد الجديد بعد 12 ساعة!`;
                if (isSpecial) {
                  message = `نود تذكيركم بالاجتماع الاستثنائي للعهد الجديد اليوم في تمام الساعة 7:00 مساءً. الحدث: "${item.topic1}". حضوركم يبهج قلوبنا جميعاً! ⛪✨`;
                } else {
                  message = `مستنيينك النهاردة الساعة 7:00 مساءً في اجتماع العهد الجديد. موضوعات اليوم الشائقة هي - الفقرة الأولى: "${item.topic1}"${item.topic2 ? ` | والفقرة الثانية: "${item.topic2}"` : ""}. متنساش كارت الحضور الرقمي (QR) لتسجيل نقاط حضورك الفوري! ⛪✨`;
                }
              }

              // Add notification targeted to students of that group + all servants
              await addDoc(collection(db, "notifications"), {
                title,
                message,
                type: "warning",
                category: "announcements",
                targetId: null,
                targetRole: "student",
                targetGroups: [type, "servant"], // Targets the testament group students + also notify the servants!
                weeklyMeetingTag: tag,
                createdAt: serverTimestamp(),
                isRead: false,
                readBy: [],
                hiddenFrom: []
              });

              console.log(`Successfully generated and broadcasted 12h fixed meeting reminder for tag: ${tag}`);
            }
          }
        }
      };

      await checkScheduleList(saturdaySchedules, "OT");

      localStorage.setItem(localCheckKey, "true");
    } catch (err) {
      console.error("Error executing checkAndInjectFixedMeetings12hReminders:", err);
    }
  },

  async checkAndInjectFavorites12hReminders(userId: string) {
    try {
      if (!userId) return;

      const now = Date.now();
      const year = 2026;

      const favQuery = query(
        collection(db, "favorites"),
        where("userId", "==", userId)
      );
      const favsSnap = await getDocs(favQuery);
      if (favsSnap.empty) return;

      const userFavs = favsSnap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as any[];

      for (const fav of userFavs) {
        if (!fav.date) continue;

        const parts = fav.date.split('/');
        const dayVal = parseInt(parts[0]?.trim());
        const monthVal = parseInt(parts[1]?.trim()) - 1; // 0-indexed month

        if (isNaN(dayVal) || isNaN(monthVal)) continue;

        const lectureDate = new Date(year, monthVal, dayVal, 19, 0, 0);
        const lectureTime = lectureDate.getTime();
        const diffHours = (lectureTime - now) / (1000 * 60 * 60);

        if (diffHours >= 0 && diffHours <= 12) {
          const tag = `FAV_REMT_${userId}_${fav.type}_${dayVal}_${monthVal + 1}`;

          const qRef = query(
            collection(db, "notifications"),
            where("weeklyMeetingTag", "==", tag)
          );
          const snap = await getDocs(qRef);

          if (snap.empty) {
            const dayName = "السبت";
            const typeLabel = fav.type === "saturday" ? "العهد القديم" : "العهد الجديد";

            await addDoc(collection(db, "notifications"), {
              title: `⭐ تنبيه لمحاضرتك المفضلة: ${fav.topic1}`,
              message: `نود تذكيرك بمحاضرتك المفضلة: "${fav.topic1}" المقررة اليوم ${dayName} في تمام الساعة 7:00 مساءً ضمن منهج ${typeLabel}. نتمنى لك وقتاً روحياً نافعاً! 📚⛪✨`,
              type: "success",
              category: "announcements",
              targetId: userId,
              weeklyMeetingTag: tag,
              createdAt: serverTimestamp(),
              isRead: false,
              readBy: [],
              hiddenFrom: []
            });

            console.log(`Successfully generated private favorite syllabus reminder for tag: ${tag}`);
          }
        }
      }
    } catch (err) {
      console.error("Error executing checkAndInjectFavorites12hReminders:", err);
    }
  }
};
