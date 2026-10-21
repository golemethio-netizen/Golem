// netlify/functions/dating-notify.js
//
// Sends a phone push (and, if the member opted in, an email) when a new row is created in
// dating_notifications. Called by the database (dating-migration-v49) with a shared secret.
//
// Netlify environment variables (Site settings > Environment variables):
//   NOTIFY_SECRET              long random text, same value as in dating_notify_settings
  SUPABASE_URL               https:https://ryeylhawdmykbbmnfrrh.supabase.co
// SUPABASE_SERVICE_ROLE_KEY  Supabase > Project Settings > API > service_role (SECRET: never put it in the website code)
//   VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY   from:  npx web-push generate-vapid-keys
 VAPID_SUBJECT              mailto:wanagebya@gmail.com
  SITE_URL                   https://www.wanagebya.com
// Optional, for email:
  RESEND_API_KEY, EMAIL_FROM  (e.g. "Wana Dating <notify@wanagebya.com>", domain verified in Resend)
//
// Privacy: the notification never contains the message text, only who it is from.

const webpush = require("web-push");

const EMAIL_MIN_GAP_MIN = 60;          // at most one email per member per type per hour
const PHONE_EMAIL_DOMAIN = "@phone.wanagebya.com"; // phone sign-ups have no real inbox

const TYPE_TO_PREF = { message: "notify_messages", like: "notify_likes", match: "notify_matches", date: "notify_dates", gift: "notify_matches" };

function sb(path, opts = {}) {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return fetch(`${base}${path}`, {
    ...opts,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(opts.headers || {}) },
  });
}

async function getJson(path) {
  const r = await sb(path);
  if (!r.ok) throw new Error(`Supabase ${r.status} for ${path.split("?")[0]}`);
  return r.json();
}

function buildText(type, name) {
  const who = name || "Someone";
  switch (type) {
    case "message": return { title: "New message", body: `💬 ${who} sent you a message`, tag: "wana-msg" };
    case "like":    return { title: "New like", body: `💛 ${who} liked your profile`, tag: "wana-like" };
    case "match":   return { title: "It's a match!", body: `🎉 You and ${who} liked each other`, tag: "wana-match" };
    case "date":    return { title: "Date invitation", body: `📅 ${who} sent you a date update`, tag: "wana-date" };
    case "gift":    return { title: "You got a gift", body: `🎁 ${who} sent you a gift`, tag: "wana-gift" };
    default:        return { title: "Wana Dating", body: "You have a new notification", tag: "wana-other" };
  }
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "POST only" };
  const secret = process.env.NOTIFY_SECRET;
  const given = event.headers["x-notify-secret"] || event.headers["X-Notify-Secret"];
  if (!secret || given !== secret) return { statusCode: 401, body: "Unauthorized" };

  let rec;
  try { rec = JSON.parse(event.body || "{}").record; } catch (e) { return { statusCode: 400, body: "Bad JSON" }; }
  if (!rec || !rec.user_id || !rec.type) return { statusCode: 400, body: "Missing record" };

  const uid = encodeURIComponent(rec.user_id);
  const siteUrl = (process.env.SITE_URL || "https://www.wanagebya.com").replace(/\/$/, "");
  const result = { push: 0, email: 0, skipped: null };

  try {
    // 1. preferences (no row = push allowed, email off)
    const prefs = (await getJson(`/rest/v1/dating_notification_prefs?user_id=eq.${uid}&select=*`))[0] || {};
    const prefKey = TYPE_TO_PREF[rec.type];
    const typeOn = prefKey ? prefs[prefKey] !== false : true;
    if (!typeOn) { result.skipped = "type off"; return { statusCode: 200, body: JSON.stringify(result) }; }
    const pushOn = prefs.push_enabled !== false;
    const emailOn = prefs.email_enabled === true && (rec.type === "message" || rec.type === "match" || rec.type === "date");

    // 2. who is it from
    let name = null;
    if (rec.actor_id) {
      const p = (await getJson(`/rest/v1/dating_profiles?user_id=eq.${encodeURIComponent(rec.actor_id)}&select=display_name`))[0];
      name = p && p.display_name;
    }
    const text = buildText(rec.type, name);
    const openUrl = `${siteUrl}/dating/index.html`;

    // 3. push
    if (pushOn && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@wanagebya.com", process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
      const subs = await getJson(`/rest/v1/dating_push_subscriptions?user_id=eq.${uid}&select=id,endpoint,p256dh,auth`);
      const payload = JSON.stringify({ title: text.title, body: text.body, tag: text.tag, url: openUrl, type: rec.type });
      await Promise.all(subs.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 24 });
          result.push++;
        } catch (err) {
          // 404/410 = the device unsubscribed or the browser data was cleared: forget it
          if (err && (err.statusCode === 404 || err.statusCode === 410)) {
            await sb(`/rest/v1/dating_push_subscriptions?id=eq.${encodeURIComponent(s.id)}`, { method: "DELETE" });
          } else {
            console.warn("push failed", err && err.statusCode, err && err.body);
          }
        }
      }));
      if (result.push) {
        await sb(`/rest/v1/dating_notify_log`, { method: "POST", headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ user_id: rec.user_id, channel: "push", kind: rec.type }) });
      }
    }

    // 4. email (opt-in, real addresses only, throttled)
    if (emailOn && process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
      const since = new Date(Date.now() - EMAIL_MIN_GAP_MIN * 60000).toISOString();
      const recent = await getJson(`/rest/v1/dating_notify_log?user_id=eq.${uid}&channel=eq.email&kind=eq.${encodeURIComponent(rec.type)}&sent_at=gte.${encodeURIComponent(since)}&select=id&limit=1`);
      if (!recent.length) {
        const ur = await sb(`/auth/v1/admin/users/${uid}`);
        const user = ur.ok ? await ur.json() : null;
        const to = user && user.email;
        if (to && !to.toLowerCase().endsWith(PHONE_EMAIL_DOMAIN)) {
          const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
            <h2 style="color:#b8294f">${esc(text.title)}</h2><p style="font-size:16px">${esc(text.body)}</p>
            <p><a href="${esc(openUrl)}" style="background:#e0426f;color:#fff;padding:10px 20px;border-radius:20px;text-decoration:none">Open Wana Dating</a></p>
            <p style="color:#888;font-size:12px">You can turn these emails off in Settings &gt; Notifications.</p></div>`;
          const er = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject: text.title, html }),
          });
          if (er.ok) {
            result.email++;
            await sb(`/rest/v1/dating_notify_log`, { method: "POST", headers: { Prefer: "return=minimal" },
              body: JSON.stringify({ user_id: rec.user_id, channel: "email", kind: rec.type }) });
          } else {
            console.warn("email failed", er.status);
          }
        }
      }
    }
  } catch (err) {
    console.error("dating-notify error:", err && err.message);
    return { statusCode: 500, body: "error" };
  }
  return { statusCode: 200, body: JSON.stringify(result) };
};
