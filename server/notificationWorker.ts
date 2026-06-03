import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { saturdaySchedules } from "../src/data/fixedSchedules";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://nssuihqftjpojeakupfj.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS";

export const supabase = createClient(supabaseUrl, supabaseKey);

// WhatsApp dispatch credentials
const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
const token = process.env.ULTRAMSG_TOKEN;

// Clean Egyptian phone numbers
function cleanEgyptianPhone(phone: string): string {
  let cleaned = phone.trim().replace(/[^\d]/g, "");
  if (cleaned.startsWith("01") && cleaned.length === 11) {
    cleaned = "2" + cleaned; // e.g. 010... becomes 2010...
  } else if (cleaned.startsWith("1") && cleaned.length === 10) {
    cleaned = "20" + cleaned;
  } else if (cleaned.startsWith("00201") && cleaned.length === 14) {
    cleaned = cleaned.slice(2);
  }
  return cleaned;
}

// Bulk send WhatsApp helper
async function sendWhatsAppReminders(phones: string[], message: string) {
  if (phones.length === 0) return;
  const cleanedPhones = phones.map(p => cleanEgyptianPhone(p)).filter(p => p !== "");
  
  if (!instanceId || !token) {
    console.log(`[WHATSAPP MOCK LOG] Sent to ${cleanedPhones.length} phones. Message: "${message}"`);
    return;
  }

  for (const phone of cleanedPhones) {
    try {
      const response = await fetch(`https://api.ultramsg.com/${instanceId}/messages/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          token,
          to: phone,
          body: message
        })
      });

      if (!response.ok) {
        throw new Error(`Ultramsg response error status ${response.status}`);
      }
      const data = await response.json();
      console.log(`WhatsApp sent to +${phone} successfully.`, data);
    } catch (err: any) {
      console.error(`Failed to send WhatsApp message to ${phone}:`, err.message || err);
    }
  }
}

// 1. Weekly reminders at 9:00 AM on Saturdays (OT) and Thursdays (NT)
export async function checkAndInjectWeeklyReminders() {
  try {
    const today = new Date();
    const day = today.getDay(); // 0 is Sunday, 4 is Thursday, 6 is Saturday
    const hour = today.getHours();
    
    // Only execute from 9 AM to 10 AM (once a day)
    if (hour !== 9) return;

    // ISO week calculation (e.g. 2026-W21)
    const d = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
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
      // Check if tag already exists to prevent duplicate runs
      const { data: existing, error: errExist } = await supabase
        .from("notifications")
        .select("id")
        .eq("weeklyMeetingTag", tag);

      if (!errExist && (!existing || existing.length === 0)) {
        const { error } = await supabase.from("notifications").insert({
          id: tag,
          title,
          message,
          type: "info",
          category: "announcements",
          targetId: null,
          targetRole: "student",
          targetGroups: ["OT", "NT"],
          weeklyMeetingTag: tag,
          createdAt: new Date().toISOString(),
          isRead: false,
          readBy: [],
          hiddenFrom: []
        });

        if (error && error.code !== "23505") throw error;
        console.log(`[Worker] Generated weekly reminder for target group: ${targetGroup}`);
      }
    }
  } catch (err: any) {
    console.error("[Worker] Error checking/injecting weekly reminders:", err.message || err);
  }
}

// 2. Prep servant meetings (Immediate and 12-hour warnings)
export async function checkAndInjectPrepMeetingReminders() {
  try {
    const now = Date.now();
    const { data: meetings, error } = await supabase.from("preparationMeetings").select("*");
    if (error || !meetings) return;

    let servantsCache: string[] | null = null;
    const getServantPhones = async (): Promise<string[]> => {
      if (servantsCache === null) {
        try {
          const { data: users } = await supabase.from("users").select("*");
          if (users) {
            servantsCache = users
              .filter(u => u.role === "servant" || (u.code && u.code.toUpperCase().startsWith("S")))
              .map(u => u.whatsappNumber)
              .filter((phone): phone is string => typeof phone === "string" && phone.trim() !== "");
          } else {
            servantsCache = [];
          }
        } catch (e) {
          console.error("[Worker] Error getting servants list:", e);
          servantsCache = [];
        }
      }
      return servantsCache;
    };

    for (const meeting of meetings) {
      if (!meeting.dateTime) continue;

      const meetingTime = new Date(meeting.dateTime).getTime();
      const diffHours = (meetingTime - now) / (1000 * 60 * 60);

      // A. Send immediate notification on newly scheduled meetings (Atomic DB Update Lock)
      if (meetingTime > now && !meeting.immediateSent) {
        const { data: updated, error: errUpdate } = await supabase
          .from("preparationMeetings")
          .update({ immediateSent: true })
          .eq("id", meeting.id)
          .eq("immediateSent", false)
          .select();

        if (!errUpdate && updated && updated.length > 0) {
          // Lock acquired! Proceed to send notifications
          const dateFormatted = new Date(meeting.dateTime).toLocaleString('ar-EG', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });

          const tag = `prep_meeting_immediate_${meeting.id}`;
          const { error: errInsert } = await supabase.from("notifications").insert({
            id: tag,
            title: `📅 اجتماع تحضيري جديد للخدمة`,
            message: `تمت جدولة اجتماع تحضيري رئيسي جديد بعنوان "${meeting.title}" يوم (${dateFormatted}). يرجى من جميع الخدام الاستعداد وتجهيز الفقرات للخدمة! ⛪📿`,
            type: "info",
            category: "announcements",
            targetId: null,
            targetGroups: ["servant"],
            weeklyMeetingTag: tag,
            createdAt: new Date().toISOString(),
            isRead: false,
            readBy: [],
            hiddenFrom: []
          });

          if (errInsert && errInsert.code !== "23505") throw errInsert;
          console.log(`[Worker] Sent immediate meeting notification for: ${meeting.title}`);

          const phones = await getServantPhones();
          if (phones.length > 0) {
            const waMessage = `🔔 اجتماع تحضيري جديد للخدام:
📍 العنوان: ${meeting.title}
📅 الموعد: ${dateFormatted}
📝 الأجندة:
${meeting.description}

يرجى من جميع الخدام الاستعداد وتجهيز فقرات الخدمة للتحضير واليوم! ⛪📿`;
            await sendWhatsAppReminders(phones, waMessage);
          }
        }
      }

      // B. Send 12-hour warning (Atomic DB Update Lock)
      if (diffHours >= 0 && diffHours <= 12 && !meeting.reminderSent12h) {
        const { data: updated, error: errUpdate } = await supabase
          .from("preparationMeetings")
          .update({ reminderSent12h: true })
          .eq("id", meeting.id)
          .eq("reminderSent12h", false)
          .select();

        if (!errUpdate && updated && updated.length > 0) {
          // Lock acquired! Proceed to send
          const dateFormatted = new Date(meeting.dateTime).toLocaleString('ar-EG', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });

          const tag = `prep_meeting_12h_${meeting.id}`;
          const { error: errInsert } = await supabase.from("notifications").insert({
            id: tag,
            title: `تذكير بموعد: اجتماع تحضيري للم شمل الخدام ⏰`,
            message: `الاجتماع التحضيري الرئيسي "${meeting.title}" سيبدأ بعد أقل من 12 ساعة في تمام الساعة (${dateFormatted.split('،')[1] || dateFormatted}). رجاء الحضور والاستعداد لتجهيز فقرات الخدمة واليوم! ⛪💫`,
            type: "warning",
            category: "announcements",
            targetId: null,
            targetGroups: ["servant"],
            weeklyMeetingTag: tag,
            createdAt: new Date().toISOString(),
            isRead: false,
            readBy: [],
            hiddenFrom: []
          });

          if (errInsert && errInsert.code !== "23505") throw errInsert;
          console.log(`[Worker] Sent 12h pre-meeting notification for: ${meeting.title}`);

          const phones = await getServantPhones();
          if (phones.length > 0) {
            const waMessage = `⏰ تذكير: اجتماع تحضيري هام للخدام بعد ساعات قليلة!
📍 العنوان: ${meeting.title}
📅 سيبدأ اللقاء بإذن ربنا في تمام الساعة: (${dateFormatted.split('،')[1] || dateFormatted})

رجاء من جميع الخدام الاستعداد لتجهيز فقرات لقاء النهضة وتحضير الخدمة والحرص على حضوركم الموقر! ⛪💫`;
            await sendWhatsAppReminders(phones, waMessage);
          }
        }
      }
    }
  } catch (err: any) {
    console.error("[Worker] Error checking prep meeting reminders:", err.message || err);
  }
}

// 3. Syllabus fixed meetings (12-hour warnings)
export async function checkAndInjectFixedMeetings12hReminders() {
  try {
    const now = Date.now();
    const year = 2026;

    const checkScheduleList = async (schedule: any[], type: "OT" | "NT") => {
      for (const item of schedule) {
        if (!item.date) continue;
        
        const parts = item.date.split('/');
        const dayVal = parseInt(parts[0]?.trim());
        const monthVal = parseInt(parts[1]?.trim()) - 1; // 0-indexed month

        if (isNaN(dayVal) || isNaN(monthVal)) continue;

        // Fixed meeting hours approx 7 PM
        const meetingDate = new Date(year, monthVal, dayVal, 19, 0, 0);
        const meetingTime = meetingDate.getTime();
        const diffHours = (meetingTime - now) / (1000 * 60 * 60);

        if (diffHours >= 0 && diffHours <= 12) {
          const tag = `${type}_MEET_12H_${year}_${monthVal + 1}_${dayVal}`;
          
          // Check if tag already exists
          const { data: existing, error } = await supabase
            .from("notifications")
            .select("id")
            .eq("weeklyMeetingTag", tag);

          if (!error && (!existing || existing.length === 0)) {
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

            const { error: errInsert } = await supabase.from("notifications").insert({
              id: tag,
              title,
              message,
              type: "warning",
              category: "announcements",
              targetId: null,
              targetRole: "student",
              targetGroups: [type, "servant"],
              weeklyMeetingTag: tag,
              createdAt: new Date().toISOString(),
              isRead: false,
              readBy: [],
              hiddenFrom: []
            });

            if (errInsert && errInsert.code !== "23505") throw errInsert;
            console.log(`[Worker] Broadcasted 12h fixed schedule warning for tag: ${tag}`);
          }
        }
      }
    };

    await checkScheduleList(saturdaySchedules, "OT");
  } catch (err: any) {
    console.error("[Worker] Error checking 12h fixed schedules:", err.message || err);
  }
}

// 4. Personalized student favorite syllabus reminders (12-hour warnings)
export async function checkAndInjectFavorites12hReminders() {
  try {
    const now = Date.now();
    const year = 2026;

    // Fetch all user favorites
    const { data: favorites, error } = await supabase.from("favorites").select("*");
    if (error || !favorites) return;

    for (const fav of favorites) {
      if (!fav.userId || !fav.date) continue;

      const parts = fav.date.split('/');
      const dayVal = parseInt(parts[0]?.trim());
      const monthVal = parseInt(parts[1]?.trim()) - 1; // 0-indexed month

      if (isNaN(dayVal) || isNaN(monthVal)) continue;

      const lectureDate = new Date(year, monthVal, dayVal, 19, 0, 0);
      const lectureTime = lectureDate.getTime();
      const diffHours = (lectureTime - now) / (1000 * 60 * 60);

      if (diffHours >= 0 && diffHours <= 12) {
        const tag = `FAV_REMT_${fav.userId}_${fav.type}_${dayVal}_${monthVal + 1}`;

        // Check if favorite tag already exists
        const { data: existing, error: errExist } = await supabase
          .from("notifications")
          .select("id")
          .eq("weeklyMeetingTag", tag);

        if (!errExist && (!existing || existing.length === 0)) {
          const dayName = "السبت";
          const typeLabel = fav.type === "saturday" ? "العهد القديم" : "العهد الجديد";

          const { error: errInsert } = await supabase.from("notifications").insert({
            id: tag,
            title: `⭐ تنبيه لمحاضرتك المفضلة: ${fav.topic1}`,
            message: `نود تذكيرك بمحاضرتك المفضلة: "${fav.topic1}" المقررة اليوم ${dayName} في تمام الساعة 7:00 مساءً ضمن منهج ${typeLabel}. نتمنى لك وقتاً روحياً نافعاً! 📚⛪✨`,
            type: "success",
            category: "announcements",
            targetId: fav.userId,
            weeklyMeetingTag: tag,
            createdAt: new Date().toISOString(),
            isRead: false,
            readBy: [],
            hiddenFrom: []
          });

          if (errInsert && errInsert.code !== "23505") throw errInsert;
          console.log(`[Worker] Injected personalized favorite reminder for user ${fav.userId}: ${fav.topic1}`);
        }
      }
    }
  } catch (err: any) {
    console.error("[Worker] Error checking 12h student favorites:", err.message || err);
  }
}

// Master execution runner loop
export async function runNotificationWorker() {
  console.log("[Worker] Notification Background Service is executing check cycles...");
  
  await checkAndInjectWeeklyReminders();
  await checkAndInjectPrepMeetingReminders();
  await checkAndInjectFixedMeetings12hReminders();
  await checkAndInjectFavorites12hReminders();
  
  console.log("[Worker] Notification Background Service finished cycle.");
}
