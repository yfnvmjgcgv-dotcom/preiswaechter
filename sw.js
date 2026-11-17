const V = "pw-872f925f25";
const DATA = "pw-daten";
const FONTS_C = "pw-fonts";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];
const FONTS = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;
const FONT_CSS = "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Fraunces:opsz,wght@9..144,600&display=swap";
async function cacheFonts() {
  try {
    const c = await caches.open(FONTS_C);
    if (await c.match(FONT_CSS)) return;
    const res = await fetch(FONT_CSS);
    if (!res.ok) return;
    await c.put(FONT_CSS, res.clone());
    const urls = [...(await res.text()).matchAll(/url\((https:[^)]+)\)/g)].map(m => m[1]);
    await Promise.all(urls.map(u => fetch(u, {mode: "cors"}).then(r => r.ok && c.put(u, r)).catch(() => {})));
  } catch (e) {}
}
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(cacheFonts).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== FONTS_C && k !== DATA).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;
  if (FONTS.test(r.url)) {
    e.respondWith(caches.open(FONTS_C).then(c => c.match(r).then(m => m || fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; }))));
    return;
  }
  const u = new URL(r.url);
  if (u.origin !== location.origin) return;
  if (u.pathname.endsWith("/daten.enc.json")) {
    e.respondWith(fetch(r, {cache: "no-store"}).then(res => { if (res.ok) { const cp = res.clone(); caches.open(DATA).then(c => c.put("daten.enc.json", cp)); } return res; })
      .catch(() => caches.open(DATA).then(c => c.match("daten.enc.json")).then(m => m || Response.error())));
    return;
  }
  if (r.mode === "navigate") {
    e.respondWith(fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put("index.html", cp)); } return res; })
      .catch(() => caches.match("index.html")));
    return;
  }
  e.respondWith(caches.match(r, {ignoreSearch: true}).then(m => m || fetch(r)));
});
