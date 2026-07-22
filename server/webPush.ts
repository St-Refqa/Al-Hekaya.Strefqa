import webpush from 'web-push';
import { supabase } from './notificationWorker';

const publicVapidKey = process.env.VITE_VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || 'mailto:admin@al-hekaya.com';

if (publicVapidKey && privateVapidKey) {
  webpush.setVapidDetails(subject, publicVapidKey, privateVapidKey);
} else {
  console.warn("VAPID keys not configured. Web Push will not work.");
}

export async function sendWebPushNotification(title: string, message: string, targetId: string | null = null, targetGroups: string[] = []) {
  if (!publicVapidKey || !privateVapidKey) return;

  try {
    let query = supabase.from('push_subscriptions').select('*');
    
    const { data: subscriptions, error } = await query;

    if (error || !subscriptions) {
      console.error('Error fetching push subscriptions:', error);
      return;
    }

    const payload = JSON.stringify({
      title: title,
      message: message,
      actionUrl: "/"
    });

    const sendPromises = subscriptions.map(async (sub) => {
      try {
        const pushSub = typeof sub.subscription === 'string' ? JSON.parse(sub.subscription) : sub.subscription;
        await webpush.sendNotification(pushSub, payload);
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        } else {
          console.error('Error sending push notification:', err);
        }
      }
    });

    await Promise.all(sendPromises);
    console.log(`[Web Push] Dispatched to ${subscriptions.length} devices.`);
  } catch (error) {
    console.error('Error in sendWebPushNotification:', error);
  }
}
