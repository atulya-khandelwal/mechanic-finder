import { useCallback, useEffect, useState } from 'react';
import { push } from '../api';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Wait for the SW that main.jsx registers via virtual:pwa-register (Workbox).
 */
async function waitForActiveWorker(maxMs = 12000) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg?.active) return reg;
    await sleep(200);
  }
  return null;
}

/**
 * Ensure an active service worker for push. In dev, vite-plugin-pwa serves the worker at
 * dev-sw.js?dev-sw (not /sw.js — that only exists after build).
 */
async function ensurePushServiceWorkerRegistration() {
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing?.active) {
    return existing;
  }

  const fromMain = await waitForActiveWorker(12000);
  if (fromMain?.active) {
    return fromMain;
  }

  const base = import.meta.env.BASE_URL || '/';
  const scope = base.endsWith('/') ? base : `${base}/`;

  const devUrls = import.meta.env.DEV
    ? [
        new URL('dev-sw.js?dev-sw', window.location.origin + scope).href,
        '/dev-sw.js?dev-sw',
      ]
    : [new URL('sw.js', window.location.origin + scope).href, '/sw.js'];

  // Dev worker is a Workbox classic bundle; "module" would fail to parse it.
  const types = import.meta.env.DEV ? ['classic'] : ['classic', 'module'];
  let lastErr = null;

  for (const swUrl of devUrls) {
    for (const type of types) {
      try {
        await navigator.serviceWorker.register(swUrl, {
          scope,
          type,
        });
        await withTimeout(
          navigator.serviceWorker.ready,
          45000,
          'Service worker did not become active. Try a hard refresh (clear site data if needed).'
        );
        const finalReg = await navigator.serviceWorker.getRegistration();
        if (finalReg?.active) {
          return finalReg;
        }
      } catch (err) {
        lastErr = err;
        console.warn('[push] register attempt failed', swUrl, type, err);
      }
    }
  }

  const detail = lastErr?.message || lastErr?.name || 'unknown error';
  const hint =
    window.location.hostname.includes('ngrok') || window.location.hostname.includes('localhost')
      ? ' If you use ngrok, load the app in a normal tab first and pass the ngrok warning page so scripts are not blocked.'
      : '';
  throw new Error(
    `Could not register the service worker (${detail}).${hint} Confirm \`npm run dev\` is running for the frontend, then hard-refresh.`
  );
}

export function usePushSubscription() {
  const [status, setStatus] = useState('idle'); // idle | subscribing | subscribed | unsupported | denied | error
  const [errorMessage, setErrorMessage] = useState('');

  const subscribe = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }
    setErrorMessage('');
    setStatus('subscribing');
    try {
      const { publicKey } = await withTimeout(
        push.getVapidPublicKey(),
        15000,
        'Could not reach server for push setup. Is the API running?'
      );
      if (!publicKey) {
        setStatus('unsupported');
        setErrorMessage('Push is not configured on the server (missing VAPID keys).');
        return;
      }
      const reg = await ensurePushServiceWorkerRegistration();
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus('denied');
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = sub.toJSON();
      await withTimeout(
        push.subscribe({
          endpoint: json.endpoint,
          keys: json.keys,
        }),
        15000,
        'Could not save subscription on the server.'
      );
      setStatus('subscribed');
    } catch (err) {
      console.error('[push]', err);
      setErrorMessage(err.message || 'Could not enable notifications.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }
    let cancelled = false;
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        if (!cancelled) setStatus(sub ? 'subscribed' : 'idle');
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { status, errorMessage, subscribe };
}
