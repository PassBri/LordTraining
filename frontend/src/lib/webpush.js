const API_URL = process.env.REACT_APP_BACKEND_URL;
const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('train_token')}` });

function urlB64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function pushPermission() {
  return pushSupported() ? Notification.permission : 'unsupported';
}

export async function enablePush() {
  if (!pushSupported()) throw new Error('unsupported');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('denied');
  const reg = await navigator.serviceWorker.register('/push-sw.js');
  await navigator.serviceWorker.ready;
  const { key } = await (await fetch(`${API_URL}/api/notifications/vapid-public-key`)).json();
  if (!key) throw new Error('no-key');
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlB64ToUint8Array(key),
    });
  }
  await fetch(`${API_URL}/api/notifications/subscribe`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({ subscription: sub.toJSON() }),
  });
  return true;
}

export async function disablePush() {
  if (!pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration('/push-sw.js');
    const sub = reg && await reg.pushManager.getSubscription();
    if (sub) {
      await fetch(`${API_URL}/api/notifications/unsubscribe`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      await sub.unsubscribe();
    }
  } catch { /* silent */ }
}
