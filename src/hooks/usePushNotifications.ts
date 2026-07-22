import { useEffect, useState } from 'react';
import { supabase } from '../lib/firebase';
import { useAuth } from './useAuth';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { user, isAuthenticated } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'default'
  );

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const registerPush = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
          if (!publicVapidKey) {
            console.warn("VITE_VAPID_PUBLIC_KEY is not defined");
            return;
          }
          
          const convertedVapidKey = urlBase64ToUint8Array(publicVapidKey);
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey
          });
        }

        // Save to Supabase
        if (subscription) {
          const subData = JSON.parse(JSON.stringify(subscription));
          
          // Check if it already exists to avoid duplicates
          const { data: existing } = await supabase
            .from('push_subscriptions')
            .select('id')
            .eq('endpoint', subData.endpoint)
            .maybeSingle();

          if (!existing) {
            await supabase.from('push_subscriptions').insert({
              user_id: user.uid || user.id,
              endpoint: subData.endpoint,
              subscription: subData,
              created_at: new Date().toISOString()
            });
          }
          setIsSubscribed(true);
        }
      } catch (err) {
        console.error("Error subscribing to push notifications:", err);
      }
    };

    if (permission === 'granted') {
      registerPush();
    }
  }, [user, isAuthenticated, permission]);

  const requestPermission = async () => {
    if (!('Notification' in window)) return false;
    const result = await Notification.requestPermission();
    setPermission(result);
    return result === 'granted';
  };

  return { isSubscribed, permission, requestPermission };
}
