import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nssuihqftjpojeakupfj.supabase.co';
const supabaseKey = 'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS';
const supabase = createClient(supabaseUrl, supabaseKey);

const publicVapidKey = 'BiSHBdT2JZ4sEKUz0EtIwZtvCc4yb7QeJfPWkU2PX4Kfq5tDutoU8G9IJXxBPPDstDjPC2WjBOf5-NoNykPGn3k';
const privateVapidKey = 'yRkrY5PMudaCygG9V0GuaSvcHLSJG14KPFWBXMO_QhU';
const subject = 'mailto:admin@al-hekaya.com';

webpush.setVapidDetails(subject, publicVapidKey, privateVapidKey);

async function send() {
  const { data: subscriptions } = await supabase.from('push_subscriptions').select('*');
  if (!subscriptions) return;

  const payload = JSON.stringify({
    title: 'تحديث جديد! 📸',
    message: 'دلوقتي تقدر تغير أو تعدل صورتك الشخصية بسهولة من الواجهة الرئيسية. جرب تدوس على صورتك دلوقتي!',
    actionUrl: '/'
  });

  let sent = 0;
  for (const sub of subscriptions) {
    try {
      const pushSub = typeof sub.subscription === 'string' ? JSON.parse(sub.subscription) : sub.subscription;
      await webpush.sendNotification(pushSub, payload);
      sent++;
    } catch (e) {
      console.error(e);
      if (e.statusCode === 410 || e.statusCode === 404) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id);
      }
    }
  }
  console.log(`Sent successfully to ${sent} devices.`);
}

send();
