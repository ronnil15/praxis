// Mi aula: guarda la página para abrirla rápido y sin conexión (los datos vienen de la nube).
const V = 'miaula-10.14.1-v39';
const SHELL = ['./', './manifest.webmanifest', './icon-192.png', './icon-512.png', "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js", "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js", "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js", "https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js"];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).catch(() => { })); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('miaula-') && k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  const mine = u.origin === location.origin || u.hostname === 'www.gstatic.com';
  if (!mine) return; // la nube (Firestore, inicio de sesión) va directo
  e.respondWith(fetch(r).then(res => { if (res && res.ok && (r.mode === 'navigate' || SHELL.some(s => u.href.endsWith(s.replace('./', ''))) || u.hostname === 'www.gstatic.com')) { const c = res.clone(); caches.open(V).then(x => x.put(r.mode === 'navigate' ? './' : r, c)); } return res; })
    .catch(() => caches.match(r.mode === 'navigate' ? './' : r).then(x => x || caches.match('./'))));
});
// Al tocar una notificación: abre (o enfoca) Mi aula en la sección que corresponde
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const go = (e.notification.data && e.notification.data.go) || 'inicio', url = new URL('./#' + go, self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    const c = cs.find(x => x.url.startsWith(self.registration.scope));
    if (c) { c.postMessage({ go }); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
// Avisos con Mi aula cerrada: llegan por Firebase Cloud Messaging (data: t, b, go, id)
self.addEventListener('push', e => {
  let p = {}; try { p = e.data ? e.data.json() : {}; } catch (x) { try { p = { data: { b: e.data.text() } }; } catch (y) { } }
  const d = p.data || p, n = p.notification || {};
  const title = d.t || n.title || 'Mi aula', body = d.b || n.body || '', id = d.id || '', go = d.go || 'inicio';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    // Si Mi aula está a la vista, la propia página ya muestra el aviso dentro
    const vis = cs.find(c => c.visibilityState === 'visible' && c.url.startsWith(self.registration.scope));
    if (vis) { vis.postMessage({ push: d }); return; }
    return self.registration.showNotification(title, { body, tag: id ? 'mi-' + id : 'miaula-' + go, renotify: true, icon: 'icon-192.png', badge: 'icon-192.png', vibrate: [90, 50, 90], data: { go, id } });
  }));
});
