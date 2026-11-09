const CACHE = 'praxis-10.14.1-v39';
const SDK = ["https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js", "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js", "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js", "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage-compat.js", "https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js"];
const CORE = ['./', './index.html', './qrcode.js', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE.map(x => new Request(x, { cache: 'reload' })).concat(SDK))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET') return;
  if (u.origin === location.origin) {
    // Primero la red (para recibir mejoras); sin internet, la copia guardada
    // cache: 'no-cache' pregunta siempre al servidor si hay versión nueva (no usa la copia de 10 min del navegador)
    e.respondWith(fetch(r, { cache: 'no-cache' }).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); return res; }).catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || caches.match('./index.html'))));
  } else if (u.hostname === 'www.gstatic.com' && u.pathname.startsWith('/firebasejs/')) {
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); return res; })));
  }
});
// Al tocar un aviso: abre (o enfoca) Praxis Pro en la pantalla indicada
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const go = (e.notification.data || {}).go || 'home';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const c = list.find(w => w.url.startsWith(self.registration.scope));
    if (c) { c.postMessage({ go }); return c.focus(); }
    return self.clients.openWindow('./#go=' + encodeURIComponent(go));
  }));
});
// Avisos con Praxis Pro cerrado (Firebase Cloud Messaging): mensajes de tus estudiantes
self.addEventListener('push', e => {
  let p = {}; try { p = e.data ? e.data.json() : {}; } catch (x) { }
  const d = p.data || p, n = p.notification || {};
  const title = d.t || n.title || 'Praxis Pro', body = d.b || n.body || '', go = d.go || 'home', tag = d.tag || d.id || 'praxis';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    const vis = cs.find(c => c.visibilityState === 'visible' && c.url.startsWith(self.registration.scope));
    if (vis) return; // Praxis Pro abierto: ya avisa dentro
    return self.registration.showNotification(title, { body, tag, renotify: true, icon: 'icon-192.png', badge: 'icon-192.png', data: { go } });
  }));
});
