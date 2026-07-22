import { config } from "dotenv";
config();
import { sendWebPushNotification } from "../server/webPush";

async function main() {
  console.log("Sending broadcast...");
  await sendWebPushNotification(
    "بشرى سارة! 📖", 
    "خلصنا إنجيل متى وهنبدأ في إنجيل معلمنا مار مرقس.. ادخل ابدأ معانا دلوقتي!"
  );
  console.log("Broadcast sent!");
  process.exit(0);
}

main().catch(console.error);
