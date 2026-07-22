import { config } from "dotenv";
config();
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://nssuihqftjpojeakupfj.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS";
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Injecting in-app notification...");
  
  const tag = `announce_mark_${Date.now()}`;
  
  const { error } = await supabase.from("notifications").insert({
    id: tag,
    title: "بشرى سارة! 📖",
    message: "خلصنا إنجيل متى وهنبدأ في إنجيل معلمنا مار مرقس.. ادخل ابدأ معانا دلوقتي!",
    type: "info",
    category: "announcements",
    targetId: null,
    targetGroups: ["all"],
    weeklyMeetingTag: tag,
    createdAt: new Date().toISOString(),
    isRead: false,
    readBy: [],
    hiddenFrom: []
  });

  if (error) {
    console.error("Failed to insert notification:", error);
  } else {
    console.log("In-app notification sent successfully!");
  }
}

main().catch(console.error);
