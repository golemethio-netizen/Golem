/* Wana Dating service worker: shows phone/browser push notifications.
 * Served from /dating/sw.js, so its scope is /dating/. It does NOT cache pages or
 * intercept requests, so it can never serve stale site files. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = {}; }
  const title = String(data.title || "Wana Dating").slice(0, 80);
  const options = {
    body: String(data.body || "You have a new notification").slice(0, 160),
    icon: "/logo.png",
    badge: "/logo.png",
    tag: data.tag || "wana",          // same tag = newer replaces older, so a chat doesn't pile up
    renotify: true,
    data: { url: data.url || "/dating/index.html" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  // only ever open pages on this site
  let target = "/dating/index.html";
  try {
    const u = new URL((event.notification.data && event.notification.data.url) || target, self.location.origin);
    if (u.origin === self.location.origin) target = u.href;
  } catch (e) {}
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of all) {
      if (c.url.indexOf("/dating/") !== -1 && "focus" in c) return c.focus();
    }
    return self.clients.openWindow(target);
  })());
});
