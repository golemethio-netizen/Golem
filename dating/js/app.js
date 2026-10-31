/* Original script block 3 */

// ============================================================
// Wana Dating Engine
// ============================================================
// Structure (search by these section markers):
//   1. Storage / signed URLs
//   2. State & presence
//   3. Contact privacy
//   4. Auth gate & modal
//   5. Notifications & realtime
//   6. Home feed (posts, reactions, comments)
//   7. Browse / New Members / profile cards
//   8. Profile modal, likes, matches
//   9. Voice calls (WebRTC)
//  10. Voice messages
//  11. Messages tab & thread UI
//  12. My Profile, verification, Platinum
//  13. Privacy settings & blocks
//  14. Setup-profile form
// ============================================================
// Storage is split into purpose-specific buckets
// (dating-migration-v9-private-storage.sql). Profile photos are public;
// post media, voice messages and verification selfies are private and
// served via short-lived signed URLs.
const BUCKET_PROFILE_PHOTOS = "dating-profile-photos";
const BUCKET_POST_MEDIA = "dating-post-media";
const BUCKET_VOICE_MESSAGES = "dating-voice-messages";
const BUCKET_VERIFICATION = "dating-verification";
const BUCKET_PLATINUM_RECEIPTS = "dating-platinum-receipts";

// Resolves a stored photo/voice/selfie value to something <img>/<audio>
// can load. New rows store a bare object PATH in a private bucket and
// need a signed URL; old rows (from before this split) already hold a
// full "avatars" public URL and are returned unchanged. Signed URLs are
// cached in-memory for their lifetime so re-rendering a feed/thread
// doesn't re-request one per render.
const _signedUrlCache = new Map(); // key: `${bucket}:${path}` -> { url, expiresAt }
async function resolvePrivateUrl(bucket, pathOrUrl, expiresInSeconds = 3600){
  if (!pathOrUrl) return null;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl; // pre-migration full URL
  const key = `${bucket}:${pathOrUrl}`;
  const cached = _signedUrlCache.get(key);
  if (cached && cached.expiresAt > Date.now() + 30000) return cached.url;
  const { data, error } = await _supabase.storage.from(bucket).createSignedUrl(pathOrUrl, expiresInSeconds);
  if (error || !data) { console.warn(`Couldn't sign URL for ${key}:`, error && error.message); return null; }
  _signedUrlCache.set(key, { url: data.signedUrl, expiresAt: Date.now() + expiresInSeconds * 1000 });
  return data.signedUrl;
}

// Ensure _supabase exists before running
if (typeof _supabase === 'undefined') {
    document.body.innerHTML = '<div style="padding:48px 20px;text-align:center;font-family:sans-serif;">' +
      '<h2>Can\'t connect</h2><p>config.js did not load, so Supabase is unavailable.</p></div>';
    throw new Error("config.js is not loaded; _supabase is undefined.");
}

let currentUser = null;
let currentOpenThread = null;
let allBrowseRows = [];
let visibleCount = 0;
const PAGE_SIZE = 6;
let currentLang = "en";
let messageRealtimeChannel = null;
let notifRealtimeChannel = null;
let myProfile = null;       // own dating_profiles row: is_verified, call_privacy, last_seen_privacy
let myMatchedIds = new Set(); // ids of everyone currentUser is matched with
let returnThread = null;      // conversation to go back to after viewing a profile opened from it

// ---------- Presence / last seen ----------
const ONLINE_THRESHOLD_MS = 3 * 60 * 1000; // "online" = active in the last 3 minutes
let presenceTimer = null;

function startPresenceHeartbeat(){
  sendHeartbeat();
  if (presenceTimer) clearInterval(presenceTimer);
  presenceTimer = setInterval(() => {
    if (document.visibilityState === "visible") sendHeartbeat();
  }, 60 * 1000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && currentUser) sendHeartbeat();
  });
}

async function sendHeartbeat(){
  if (!currentUser) return;
  await _supabase.from("dating_profiles")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("user_id", currentUser.id);
}

function presenceInfo(lastSeenAt){
  if (!lastSeenAt) return { online: false, text: "" };
  const diffMs = Date.now() - new Date(lastSeenAt).getTime();
  if (diffMs < ONLINE_THRESHOLD_MS) return { online: true, text: "Online now" };
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return { online: false, text: `Active ${mins}m ago` };
  const hours = Math.floor(mins / 60);
  if (hours < 24) return { online: false, text: `Active ${hours}h ago` };
  const days = Math.floor(hours / 24);
  return { online: false, text: `Active ${days}d ago` };
}

// ---------- Contact privacy (who can call you / see your last seen) ----------
async function fetchMyProfile(){
  if (!currentUser) return null;
  const { data } = await _supabase
    .from("dating_profiles")
    .select("*")
    .eq("user_id", currentUser.id)
    .maybeSingle();
  myProfile = data || null;
  applyProfileGates();
  if (typeof fillPostForm === "function") fillPostForm();
  showSuspensionBanner();
  return myProfile;
}

// Tell a suspended member why nothing works (the database enforces the
// suspension; this just explains it). Requires dating-migration-v43.
async function showSuspensionBanner(){
  let el = document.getElementById("suspensionBanner");
  try {
    const { data } = await _supabase.from("dating_account_status")
      .select("*")
      .eq("user_id", currentUser.id).maybeSingle();
    const active = data && (String(data.status || "").toLowerCase() === "suspended" || data.is_suspended === true) &&
      (!data.suspended_until || new Date(data.suspended_until) > new Date());
    const reasonText = data && (data.reason || data.suspension_reason);
    if (!active){ if (el) el.remove(); return; }
    if (!el){
      el = document.createElement("div");
      el.id = "suspensionBanner";
      el.style.cssText = "background:#b3261e;color:#fff;padding:10px 16px;text-align:center;font-size:.9rem;position:relative;z-index:50;";
      document.body.insertBefore(el, document.body.firstChild);
    }
    el.textContent = "Your account is suspended" + (reasonText ? ": " + reasonText : ".") +
      " You can't message, like or call. Please contact Support.";
  } catch (e) { /* table not available: ignore */ }
}

// Posting and messaging need a dating profile. The database enforces this
// too (posts/comments via RLS, messages via a trigger); these checks just
// give a clear message and a way forward instead of a raw error.
async function requireProfile(action){
  if (!myProfile) await fetchMyProfile();
  if (myProfile) return true;
  if (confirm(`You need to set up your profile before you can ${action}. Set it up now?`)){
    closeModal();
    switchTab("post");
  }
  return false;
}

function applyProfileGates(){
  const notice = document.getElementById("profileGateNotice");
  const hasProfile = !!myProfile;
  if (notice) notice.style.display = hasProfile ? "none" : "block";
  ["postBody", "postImage", "postVisibility", "postSubmitBtn"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = !hasProfile;
  });
}

async function refreshMyMatchedIds(){
  if (!currentUser) return;
  const { data } = await _supabase
    .from("dating_matches")
    .select("user_a, user_b")
    .or(`user_a.eq.${currentUser.id},user_b.eq.${currentUser.id}`);
  myMatchedIds = new Set((data || []).map(r => r.user_a === currentUser.id ? r.user_b : r.user_a));
}

/** Returns a Set of user ids that are blocked (in either direction) relative to currentUser. */
async function fetchBlockedIds(){
  if (!currentUser) return new Set();
  const { data } = await _supabase
    .from("dating_blocks")
    .select("blocker_id, blocked_id")
    .or(`blocker_id.eq.${currentUser.id},blocked_id.eq.${currentUser.id}`);
  const ids = new Set();
  (data || []).forEach(b => ids.add(b.blocker_id === currentUser.id ? b.blocked_id : b.blocker_id));
  return ids;
}

// profile.last_seen_privacy governs whether the CURRENT viewer may see
// profile's online/last-active status. "matches"/"verified" checks look
// at the viewer's own relationship to profile, not profile's own status.
function canSeeLastSeen(profile) {
  if (profile && currentUser && profile.user_id === currentUser.id) return true; // always your own
  if (!profile || !profile.last_seen_privacy) return true;
  const setting = profile.last_seen_privacy;
  if (setting === 'everybody') return true;
  if (setting === 'nobody') return false;
  if (setting === 'matches') return myMatchedIds.has(profile.user_id);
  if (setting === 'verified') return !!(myProfile && myProfile.is_verified);
  return true;
}

// Wrap presenceInfo() with the privacy check — use this everywhere a
// card/modal renders online status instead of calling presenceInfo() directly.
function visiblePresence(profile){
  return canSeeLastSeen(profile) ? presenceInfo(profile.last_seen_at) : { online: false, text: "" };
}

// profile.call_privacy governs whether the CURRENT user (as caller) may
// call profile. This is a friendly pre-check for the UI — the real
// enforcement is the "caller_start_call" RLS policy on dating_calls
// (v22 migration), so this can't be bypassed by skipping the button.
function canCall(profile){
  if (!profile || !currentUser) return false;
  if (profile.user_id === currentUser.id) return false;
  if (!isPlatinumActive(myProfile)) return false; // voice calls are Platinum-only
  const pref = profile.call_privacy || "everybody";
  if (pref === "nobody") return false;
  if (pref === "verified") return !!(myProfile && myProfile.is_verified);
  return true; // "everybody" and "matches" — matching is already required to reach the call button at all
}

async function updateContactPrivacy(){
  const callPrivacy = document.getElementById("setCallPrivacy").value;
  const lastSeenPrivacy = document.getElementById("setLastSeenPrivacy").value;
  const msg = document.getElementById("contactPrivacyMsg");
  msg.innerHTML = `<div class="msg">Saving...</div>`;
  const { error } = await _supabase
    .from("dating_profiles")
    .update({ call_privacy: callPrivacy, last_seen_privacy: lastSeenPrivacy })
    .eq("user_id", currentUser.id);
  if (error){
    msg.innerHTML = `<div class="msg error">Couldn't save: ${esc(error.message)}</div>`;
    return;
  }
  if (myProfile){ myProfile.call_privacy = callPrivacy; myProfile.last_seen_privacy = lastSeenPrivacy; }
  msg.innerHTML = `<div class="msg success">Saved.</div>`;
}


// ---------- Auth gate ----------
async function initAuth(){
  try {
    // Never let a hung/blocked auth call leave the page blank: give up after 8s
    // and fall back to the signed-out gate.
    const res = await Promise.race([
      _supabase.auth.getUser(),
      new Promise((_, rej) => setTimeout(() => rej(new Error("Auth check timed out")), 8000))
    ]);
    currentUser = res && res.data ? res.data.user : null;
  } catch (err) {
    console.error("Auth check failed:", err);
    currentUser = null;
  }
  document.getElementById("gate").style.display = currentUser ? "none" : "flex";
  document.getElementById("homePanel").style.display = currentUser ? "block" : "none";
  updateHeaderAuthUI();
  if (currentUser){
    ensureConsentAndAge();
    maybeShowSafetyNotice();
    fetchMyProfile();
    refreshMyMatchedIds();
    loadFeed();
    setComposerAvatar();
    refreshUnreadBadge();
    refreshLikesBadge();
    refreshVisitorsBadge();
    refreshNotifCount();
    refreshProfileCompleteBadge();
    startPresenceHeartbeat();
    startNotifPolling();
    setupPersonalCallChannel();
    setupRealtimeMessaging();
    setupRealtimeNotifications();
  }
}

function maybeShowSafetyNotice(){
  let seen = false;
  try { seen = localStorage.getItem("wg_dating_safety_seen") === "1"; } catch(e){}
  if (seen) return;
  const root = document.getElementById("modalRoot");
  root.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal">
        <div class="body">
          <h3>Stay Safe While Dating 🛡️</h3>
          <div class="bio" style="margin-bottom:14px; background: #fff9ee; padding: 15px; border-radius: 8px; border: 1px solid #fce3b4;">
            A few basics before you start browsing:
            <ul style="padding-left:18px;margin:10px 0; line-height: 1.6;">
              <li>Meet new people in a <b>public place</b> for the first few times.</li>
              <li><b>Never send money</b>, gifts, or account/card details to someone you haven't met.</li>
              <li>Trust your instincts — if something feels off, use Report or Block.</li>
              <li>Tell a friend or family member where you're going for a first meetup.</li>
            </ul>
          </div>
          <div class="actions">
            <button class="btn-contact" onclick="dismissSafetyNotice()">Got it, continue</button>
          </div>
        </div>
      </div>
    </div>`;
}
function dismissSafetyNotice(){
  try { localStorage.setItem("wg_dating_safety_seen", "1"); } catch(e){}
  closeModal();
}

// ---------- Age (18+), terms acceptance and bot protection ----------
// Bump TERMS_VERSION whenever terms.html / privacy.html change: every member is then
// asked to accept again. Keep it equal to the "Last updated" date on those pages.
const TERMS_VERSION = "2026-10-16";
const UNDERAGE_FLAG = "wg_underage_block";

function ageFromDob(iso){
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
  if (!m) return NaN;
  const y = +m[1], mo = +m[2], d = +m[3];
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return NaN;
  const t = new Date();
  let a = t.getFullYear() - y;
  if (t.getMonth() < mo - 1 || (t.getMonth() === mo - 1 && t.getDate() < d)) a--;
  return a;
}
function latestAdultDob(){
  const t = new Date(); t.setFullYear(t.getFullYear() - 18);
  return t.toLocaleDateString("en-CA"); // YYYY-MM-DD in the member's own timezone
}

// Cloudflare Turnstile. Set GolemConfig.turnstileSiteKey in config.js to switch it on;
// with no key the widget is simply not shown (nothing breaks).
let _tsWidgetId = null, _tsToken = null, _tsScriptPromise = null;
function turnstileSiteKey(){
  return (typeof GolemConfig !== "undefined" && GolemConfig.turnstileSiteKey) || "";
}
function loadTurnstile(){
  if (window.turnstile) return Promise.resolve();
  if (_tsScriptPromise) return _tsScriptPromise;
  _tsScriptPromise = new Promise((resolve, reject) => {
    const el = document.createElement("script");
    el.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    el.async = true; el.defer = true;
    el.onload = resolve;
    el.onerror = () => { _tsScriptPromise = null; reject(new Error("captcha script failed")); };
    document.head.appendChild(el);
  });
  return _tsScriptPromise;
}
function mountTurnstile(){
  try { if (_tsWidgetId !== null && window.turnstile) window.turnstile.remove(_tsWidgetId); } catch (_) {}
  _tsWidgetId = null; _tsToken = null;
  const key = turnstileSiteKey();
  const box = document.getElementById("authCaptcha");
  if (!key || !box) return;
  loadTurnstile().then(() => {
    const target = document.getElementById("authCaptcha");
    if (!target) return; // modal was closed meanwhile
    _tsWidgetId = window.turnstile.render(target, {
      sitekey: key,
      callback: (t) => { _tsToken = t; },
      "expired-callback": () => { _tsToken = null; },
      "error-callback": () => { _tsToken = null; }
    });
  }).catch(() => {
    box.textContent = "Couldn't load the security check. Check your connection and reload the page.";
  });
}
// A Turnstile token works once, so get a fresh one after every attempt.
function resetTurnstile(){
  _tsToken = null;
  try { if (window.turnstile && _tsWidgetId !== null) window.turnstile.reset(_tsWidgetId); } catch (_) {}
}

// What is still missing for the signed-in member? (birth date on file, current terms accepted)
let consentCheckedFor = null, myServerAge = null;

async function getConsentStatus(){
  const { data, error } = await _supabase.rpc("dating_my_consent_status", { p_version: TERMS_VERSION });
  if (error) { console.warn("consent status:", error.message); return null; }
  return data;
}
function applyServerAge(st){
  const el = document.getElementById("fAge");
  if (!el) return;
  el.readOnly = true;                                  // age comes from the date of birth, never typed
  el.title = "Calculated from your date of birth";
  if (st && st.age != null){ myServerAge = st.age; el.value = st.age; }
}
async function ensureConsentAndAge(){
  if (!currentUser || consentCheckedFor === currentUser.id) return;
  consentCheckedFor = currentUser.id;
  let st = await getConsentStatus();
  if (!st) return;                                     // database part not installed yet: never lock members out
  if (st.blocked){ showUnderageNotice(); return; }
  if (st.has_dob && st.terms_accepted){ applyServerAge(st); return; }   // nothing missing: one call per page load
  const meta = currentUser.user_metadata || {};
  try {
    // Values the member entered on the Register form are saved the first time they are signed in.
    if (!st.has_dob && meta.date_of_birth){
      const { data } = await _supabase.rpc("dating_set_dob", { p_dob: meta.date_of_birth });
      if (data && data.ok === false && data.code === "underage"){ showUnderageNotice(); return; }
    }
    if (!st.terms_accepted && meta.terms_version === TERMS_VERSION){
      await _supabase.rpc("dating_accept_terms", { p_version: TERMS_VERSION, p_method: "signup" });
    }
  } catch (e) { console.warn("consent sync:", e); }
  st = await getConsentStatus();
  if (st && (!st.has_dob || !st.terms_accepted)) showConsentModal(st);
  else applyServerAge(st);
}

function showUnderageNotice(){
  const old = document.getElementById("consentGate"); if (old) old.remove();
  try { localStorage.setItem(UNDERAGE_FLAG, "1"); } catch (_) {}
  const el = document.createElement("div");
  el.id = "consentGate";
  el.style.cssText = "position:fixed;inset:0;z-index:100000;background:rgba(20,10,28,.82);display:flex;align-items:center;justify-content:center;padding:16px;";
  el.innerHTML = `<div style="background:#fff;border-radius:16px;max-width:400px;width:100%;padding:24px;text-align:center;">
    <h3 style="margin:0 0 8px;">We can't open this account</h3>
    <p style="margin:0 0 16px;font-size:.9rem;color:#555;line-height:1.5;">Wana Dating is only for people aged 18 and over.</p>
    <button type="button" class="submit-btn" id="cgOk" style="width:100%;">OK</button></div>`;
  document.body.appendChild(el);
  el.querySelector("#cgOk").onclick = () => { el.remove(); signOut(); };
}

function showConsentModal(st){
  const old = document.getElementById("consentGate"); if (old) old.remove();
  const needDob = !st.has_dob, needTerms = !st.terms_accepted;
  const el = document.createElement("div");
  el.id = "consentGate";
  el.style.cssText = "position:fixed;inset:0;z-index:100000;background:rgba(20,10,28,.78);display:flex;align-items:center;justify-content:center;padding:16px;";
  el.innerHTML = `
    <div style="background:#fff;border-radius:16px;max-width:420px;width:100%;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.4);max-height:92vh;overflow:auto;">
      <h3 style="margin:0 0 6px;">Before you continue</h3>
      <p style="margin:0 0 14px;font-size:.88rem;color:#555;line-height:1.5;">Wana Dating is only for adults. Please confirm your age${needTerms ? " and our rules" : ""}.</p>
      ${needDob ? `
        <label for="cgDob" style="display:block;font-size:.85rem;font-weight:600;margin-bottom:4px;">Date of birth</label>
        <input type="date" id="cgDob" min="1900-01-01" max="${latestAdultDob()}" class="modal-input" style="width:100%;">
        <div style="font-size:.75rem;color:#777;margin:4px 0 14px;line-height:1.4;">Others only see your age, never your birth date. It can't be changed later without contacting support.</div>` : ""}
      ${needTerms ? `
        <label style="display:flex;gap:8px;align-items:flex-start;font-size:.85rem;line-height:1.45;margin:6px 0 14px;">
          <input type="checkbox" id="cgTerms" style="margin-top:3px;">
          <span>I am 18 or older and I agree to the <a href="terms.html" target="_blank" rel="noopener">Terms of Use</a> and <a href="privacy.html" target="_blank" rel="noopener">Privacy Policy</a>.</span>
        </label>` : ""}
      <div id="cgMsg"></div>
      <button type="button" id="cgSubmit" class="submit-btn" style="width:100%;">Continue</button>
      <div style="text-align:center;margin-top:10px;"><button type="button" id="cgSignOut" style="background:none;border:none;color:#777;cursor:pointer;font-size:.82rem;text-decoration:underline;">Sign out</button></div>
    </div>`;
  document.body.appendChild(el);
  const msg = el.querySelector("#cgMsg");
  const fail = (t) => { msg.innerHTML = `<div class="msg error">${esc(t)}</div>`; };
  el.querySelector("#cgSignOut").onclick = () => { el.remove(); signOut(); };
  el.querySelector("#cgSubmit").onclick = async (ev) => {
    const btn = ev.currentTarget;
    msg.innerHTML = "";
    let dob = null;
    if (needDob){
      dob = el.querySelector("#cgDob").value;
      if (!Number.isFinite(ageFromDob(dob))) return fail("Enter your date of birth.");
    }
    if (needTerms && !el.querySelector("#cgTerms").checked) return fail("Please tick the box to continue.");
    btn.disabled = true;
    try {
      if (needDob){
        const { data, error } = await _supabase.rpc("dating_set_dob", { p_dob: dob });
        if (data && data.ok === false && data.code === "underage"){ showUnderageNotice(); return; }
        if (error || !data || data.ok === false){
          btn.disabled = false;
          return fail((data && data.message) || (error && error.message) || "Couldn't save your date of birth.");
        }
      }
      if (needTerms){
        const { error } = await _supabase.rpc("dating_accept_terms", { p_version: TERMS_VERSION, p_method: "modal" });
        if (error){ btn.disabled = false; return fail(error.message); }
      }
    } catch (e) { btn.disabled = false; return fail("Something went wrong. Please try again."); }
    el.remove();
    applyServerAge(await getConsentStatus());
  };
}

// ---------- Sign in / Register modal ----------
let authTab = "signin";      
let authMethod = "email";    

function normalizeEthiopianPhone(raw){
  let p = String(raw || "").trim().replace(/[^\d+]/g, "");
  p = p.replace(/^\+/, "");
  if (p.startsWith("0") && p.length === 10) p = "251" + p.slice(1);
  else if (p.length === 9 && /^[79]/.test(p)) p = "251" + p;
  return p; 
}

function isValidEthiopianPhone(p){
  return /^251[79]\d{8}$/.test(p);
}

function phoneToPseudoEmail(p){
  return p + "@phone.wanagebya.com";
}

function openAuthModal(tab){
  authTab = tab || "signin";
  authMethod = "email";
  renderAuthModal();
}

function switchAuthTab(tab){
  authTab = tab;
  renderAuthModal();
}

function switchAuthMethod(method){
  authMethod = method;
  renderAuthModal();
}

function renderAuthModal(){
  const root = document.getElementById("modalRoot");
  const isSignin = authTab === "signin";
  const isPhone = authMethod === "phone";

  const identifierField = isPhone
    ? `<div><label>Phone number</label><input type="tel" id="authPhone" placeholder="09..." required class="modal-input"></div>`
    : `<div><label>Email</label><input type="email" id="authEmail" placeholder="you@email.com" required class="modal-input"></div>`;

  const registerExtraFields = !isSignin ? `
    <div><label>Full name</label><input type="text" id="authFullName" maxlength="60" required class="modal-input"></div>
    <div><label>Address / Location</label><input type="text" id="authLocation" maxlength="80" required class="modal-input"></div>
    ${!isPhone ? `<div><label>Phone number (optional)</label><input type="tel" id="authRegPhone" placeholder="09..." class="modal-input"></div>` : ""}
    <div><label>Date of birth</label><input type="date" id="authDob" min="1900-01-01" max="${latestAdultDob()}" required class="modal-input"><div style="font-size:.75rem;color:#777;margin-top:4px;">You must be 18 or older. Others only see your age.</div></div>
    <label style="display:flex;gap:8px;align-items:flex-start;font-size:.82rem;line-height:1.45;margin:2px 0 0;font-weight:500;"><input type="checkbox" id="authTerms" style="margin-top:3px;" required><span>I am 18 or older and I agree to the <a href="terms.html" target="_blank" rel="noopener" style="color:var(--green);">Terms of Use</a> and <a href="privacy.html" target="_blank" rel="noopener" style="color:var(--green);">Privacy Policy</a>.</span></label>
  ` : "";

  const form = `
    <form class="post-form" id="authForm" style="gap:12px; max-width: 100%;">
      ${identifierField}
      <div><label>Password</label><input type="password" id="authPassword" minlength="6" required class="modal-input"></div>
      ${!isSignin ? `<div><label>Confirm password</label><input type="password" id="authPasswordConfirm" minlength="6" required class="modal-input"></div>` : ""}
      ${registerExtraFields}
      ${turnstileSiteKey() ? '<div id="authCaptcha" style="margin:12px 0 2px;min-height:65px;"></div>' : ""}
      <button type="submit" class="submit-btn" style="width:100%; margin-top: 10px;">${isSignin ? "Sign In" : "Create Account"}</button>
      ${(isSignin && !isPhone) ? `<div style="text-align:right; margin-top: 8px;"><button type="button" onclick="sendPasswordReset()" style="background:none;border:none;color:var(--green);font-size:.85rem;cursor:pointer;padding:0;font-weight:600;">Forgot password?</button></div>` : ""}
      <div id="authMsg"></div>
    </form>`;

  root.innerHTML = `
    <div class="modal-backdrop" onclick="if(event.target===this) closeModal()">
      <div class="modal" style="max-width: 400px;">
        <div class="body">
          <button class="btn-close" onclick="closeModal()">✕</button>
          <div class="auth-tabs">
            <div class="auth-tab ${isSignin ? "active" : ""}" onclick="switchAuthTab('signin')">Sign In</div>
            <div class="auth-tab ${!isSignin ? "active" : ""}" onclick="switchAuthTab('register')">Register</div>
          </div>
          <button class="btn-google" onclick="signInWithGoogle()">
            <svg style="width:18px;height:18px;" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>
          <div class="auth-divider">or</div>
          <div class="auth-method">
            <button class="${authMethod === "email" ? "active" : ""}" onclick="switchAuthMethod('email')">✉️ Email</button>
            <button class="${authMethod === "phone" ? "active" : ""}" onclick="switchAuthMethod('phone')">📱 Phone</button>
          </div>
          ${form}
          <p style="font-size:.78rem;color:#777;margin:12px 0 0;line-height:1.4;">By continuing you confirm you are 18 or older and agree to the <a href="terms.html" target="_blank" rel="noopener" style="color:var(--green);">Terms of Use</a> and <a href="privacy.html" target="_blank" rel="noopener" style="color:var(--green);">Privacy Policy</a>.</p>
        </div>
      </div>
    </div>`;

  document.getElementById("authForm").addEventListener("submit", submitAuthForm);
  mountTurnstile();
}

function signInWithGoogle(){
  // Popup flow. window.open must run synchronously inside the click handler,
  // otherwise browsers block it.
  const w = 500, h = 650;
  const left = Math.max(0, window.screenX + (window.outerWidth - w) / 2);
  const top = Math.max(0, window.screenY + (window.outerHeight - h) / 2);
  const popup = window.open("", "wana-google-auth",
    `width=${w},height=${h},left=${left},top=${top}`);

  // Popup blocked (common on phones / in-app browsers): normal redirect instead
  if (!popup) return signInWithGoogleRedirect();

  try {
    popup.document.write('<p style="font-family:sans-serif;padding:24px">Opening Google…</p>');
  } catch (_) {}

  _supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin + "/dating/auth-callback.html",
      skipBrowserRedirect: true,
      queryParams: { prompt: "select_account" }
    }
  }).then(({ data, error }) => {
    if (error || !data?.url){
      popup.close();
      return alert("Sign-in failed: " + (error ? error.message : "no URL returned"));
    }
    popup.location.href = data.url;
  });
}

async function signInWithGoogleRedirect(){
  const { error } = await _supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin + "/dating/index.html" }
  });
  if (error) alert("Sign-in failed: " + error.message);
}

// The popup (auth-callback.html) sends the finished session back here.
// setSession fires SIGNED_IN, so the existing onAuthStateChange handler
// updates the UI, loads the profile and so on.
window.addEventListener("message", async (e) => {
  if (e.origin !== window.location.origin || e.data?.type !== "wana-auth-done") return;
  const { access_token, refresh_token } = e.data;
  if (!access_token || !refresh_token) return;
  const { error } = await _supabase.auth.setSession({ access_token, refresh_token });
  if (error) return alert("Sign-in failed: " + error.message);
  closeModal();
});

async function submitAuthForm(e){
  e.preventDefault();
  const msg = document.getElementById("authMsg");
  const isPhone = authMethod === "phone";
  const password = document.getElementById("authPassword").value;
  const submitBtn = e.target.querySelector("button[type=submit]");

  let identifier; 
  let realPhone = null;
  if (isPhone){
    const raw = document.getElementById("authPhone").value.trim();
    const normalized = normalizeEthiopianPhone(raw);
    if (!isValidEthiopianPhone(normalized)){
      msg.innerHTML = `<div class="msg error">Enter a valid Ethio Telecom (09...) or Safaricom (07...) number.</div>`;
      return;
    }
    realPhone = "+" + normalized;
    identifier = { email: phoneToPseudoEmail(normalized) };
  } else {
    identifier = { email: document.getElementById("authEmail").value.trim() };
  }

  if (authTab === "register"){
    const confirm = document.getElementById("authPasswordConfirm").value;
    if (password !== confirm){
      msg.innerHTML = `<div class="msg error">Passwords don't match.</div>`;
      return;
    }
  }

  if (turnstileSiteKey() && !_tsToken){
    msg.innerHTML = `<div class="msg error">Please complete the security check first.</div>`;
    return;
  }

  let dobValue = null;
  if (authTab === "register"){
    let blockedBefore = false;
    try { blockedBefore = localStorage.getItem(UNDERAGE_FLAG) === "1"; } catch (_) {}
    dobValue = (document.getElementById("authDob").value || "").trim();
    const a = ageFromDob(dobValue);
    if (blockedBefore || (Number.isFinite(a) && a < 18)){
      try { localStorage.setItem(UNDERAGE_FLAG, "1"); } catch (_) {}
      msg.innerHTML = `<div class="msg error">Wana Dating is only for people aged 18 and over.</div>`;
      return;
    }
    if (!Number.isFinite(a) || a > 120){
      msg.innerHTML = `<div class="msg error">Enter your date of birth.</div>`;
      return;
    }
    if (!document.getElementById("authTerms").checked){
      msg.innerHTML = `<div class="msg error">Please confirm you are 18 or older and accept the Terms and Privacy Policy.</div>`;
      return;
    }
  }

  submitBtn.disabled = true;
  submitBtn.textContent = authTab === "signin" ? "Signing in..." : "Creating account...";

  if (authTab === "signin"){
    const { error } = await _supabase.auth.signInWithPassword({ ...identifier, password, options: { captchaToken: _tsToken || undefined } });
    resetTurnstile();
    submitBtn.disabled = false;
    submitBtn.textContent = "Sign In";
    if (error){
      if (isPhone && /Invalid login credentials/i.test(error.message)){
        msg.innerHTML = `<div class="msg error">No account found with that phone number, or wrong password.</div>`;
      } else {
        msg.innerHTML = `<div class="msg error">${esc(error.message)}</div>`;
      }
      return;
    }
    closeModal();
  } else {
    const fullName = document.getElementById("authFullName").value.trim();
    const location = document.getElementById("authLocation").value.trim();
    const phoneNumber = isPhone ? realPhone : (document.getElementById("authRegPhone")?.value.trim() || null);

    const { data, error } = await _supabase.auth.signUp({
      ...identifier, password,
      options: {
        data: { full_name: fullName, phone_number: phoneNumber, location, date_of_birth: dobValue, terms_version: TERMS_VERSION, terms_accepted_at: new Date().toISOString() },
        captchaToken: _tsToken || undefined,
        ...(isPhone ? {} : { emailRedirectTo: window.location.origin + "/dating/index.html" })
      }
    });
    submitBtn.disabled = false;
    submitBtn.textContent = "Create Account";
    resetTurnstile();
    if (error){ msg.innerHTML = `<div class="msg error">${esc(error.message)}</div>`; return; }
    if (data.user && !data.session){
      msg.innerHTML = isPhone
        ? `<div class="msg success">Account created — sign in with your phone number and password.</div>`
        : `<div class="msg success">Check your email to confirm your account, then sign in.</div>`;
    } else {
      closeModal();
    }
  }
}

async function sendPasswordReset(){
  const email = document.getElementById("authEmail").value.trim();
  const msg = document.getElementById("authMsg");
  if (!email){ msg.innerHTML = `<div class="msg error">Enter your email above first.</div>`; return; }
  if (turnstileSiteKey() && !_tsToken){
    msg.innerHTML = `<div class="msg error">Please complete the security check first.</div>`;
    return;
  }
  const { error } = await _supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + "/dating/index.html",
    captchaToken: _tsToken || undefined
  });
  resetTurnstile();
  msg.innerHTML = error
    ? `<div class="msg error">${esc(error.message)}</div>`
    : `<div class="msg success">Password reset email sent.</div>`;
}

async function signOut(){
  teardownRealtimeChannels();
  closeMoreSheet();
  try { await _supabase.auth.signOut(); } catch (e) { console.warn("signOut:", e); }
  // onAuthStateChange normally refreshes the UI; do it here too so Sign out
  // always visibly works (even if the auth event is delayed or blocked).
  if (currentUser){
    currentUser = null;
    updateHeaderAuthUI();
    switchTab("home");
  }
}

function updateHeaderAuthUI(){
  const pillBtn = document.getElementById("headerAuthBtn");
  const accountBox = document.getElementById("accountBox");
  const notifWrap = document.getElementById("notifWrap");
  const sidebar = document.querySelector(".sidebar");
  const signOutBtn = document.getElementById("headerSignOutBtn");

  // Drives the phone bottom nav / header Sign out (CSS shows them only while signed in)
  document.body.classList.toggle("is-signed-in", !!currentUser);
  if (signOutBtn) signOutBtn.style.display = currentUser ? "" : "none";
  if (!currentUser) closeMoreSheet();

  if (currentUser){
    pillBtn.style.display = "none";
    accountBox.style.display = "block";
    notifWrap.style.display = "inline-block";
    if (sidebar) sidebar.style.display = "";

    const fullName = currentUser.user_metadata?.full_name || currentUser.email || "Account";
    const photoUrl = currentUser.user_metadata?.avatar_url || null;
    const initial = fullName.charAt(0).toUpperCase();

    document.getElementById("menuName").textContent = fullName;

    const avatarHtml = photoUrl
      ? `<img src="${esc(photoUrl)}" alt="" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`
      : `<span class="avatar-fallback">${initial}</span>`;
    document.getElementById("menuAvatar").innerHTML = avatarHtml;
  } else {
    pillBtn.style.display = "block";
    accountBox.style.display = "none";
    notifWrap.style.display = "none";
    // Signed-out visitors have nothing to do with Browse/Messages/Likes/etc.,
    // and leaving this rendered squeezes the full-screen welcome hero into
    // whatever space is left next to (desktop) or below (mobile) a dead
    // navigation list. Hide it until they're actually signed in.
    if (sidebar) sidebar.style.display = "none";
  }
}

document.addEventListener("click", (e) => {
  const notifWrap = document.getElementById("notifWrap");
  if (notifWrap && !notifWrap.contains(e.target)) document.getElementById("notifPanel")?.classList.remove("open");
});

let didProfileSetupRedirect = false; // only nudge once per page load, not on every token refresh

_supabase.auth.onAuthStateChange(async (_event, session) => {
  const wasSignedIn = !!currentUser;
  currentUser = session?.user || null;
  document.getElementById("gate").style.display = currentUser ? "none" : "flex";
  document.getElementById("homePanel").style.display = currentUser ? "block" : "none";
  updateHeaderAuthUI();
  if (currentUser){
    ensureConsentAndAge();
    await fetchMyProfile();
    refreshMyMatchedIds();
    // Signed in (Google, email or phone) but no dating profile yet:
    // go straight to profile setup instead of an empty Home feed.
    if (_event === "SIGNED_IN" && !myProfile && !didProfileSetupRedirect){
      didProfileSetupRedirect = true;
      switchTab("post");
    }
    loadFeed();
    setComposerAvatar();
    refreshUnreadBadge();
    refreshLikesBadge();
    refreshVisitorsBadge();
    refreshNotifCount();
    refreshProfileCompleteBadge();
    startNotifPolling();
    setupPersonalCallChannel();
    setupRealtimeMessaging();
    setupRealtimeNotifications();
  } else if (wasSignedIn){
    consentCheckedFor = null; myServerAge = null;
    const cg = document.getElementById("consentGate"); if (cg) cg.remove();
    teardownRealtimeChannels();
    myProfile = null;
    myMatchedIds = new Set();
    applyProfileGates();
    // Don't leave the previous member's details sitting in the form.
    const pf = document.getElementById("postForm");
    if (pf) pf.reset();
    postFormDirty = false; postFormFilledFor = null;
    setPostFormMode();
  }
});

async function refreshUnreadBadge(){
  const { count } = await _supabase
    .from("dating_messages")
    .select("*", { count: "exact", head: true })
    .eq("recipient_id", currentUser.id)
    .eq("read", false);
  const badge = document.getElementById("unreadBadge");
  badge.textContent = count ? `(${count})` : "";
  setMnavBadge("mnavUnreadBadge", count);
}

async function refreshLikesBadge(){
  const { count } = await _supabase
    .from("dating_likes")
    .select("*", { count: "exact", head: true })
    .eq("liked_id", currentUser.id)
    .eq("seen", false);
  const badge = document.getElementById("likesBadge");
  badge.textContent = count ? `(${count})` : "";
  setMnavBadge("mnavLikesBadge", count);
}

async function refreshVisitorsBadge(){
  const { count } = await _supabase
    .from("dating_profile_views")
    .select("*", { count: "exact", head: true })
    .eq("viewed_user_id", currentUser.id)
    .eq("seen", false);
  const badge = document.getElementById("visitorsBadge");
  if (badge) badge.textContent = count ? `(${count})` : "";
  setMnavBadge("mnavMoreBadge", count);
}

// ---------- Notifications ----------
let notifPollTimer = null;

function startNotifPolling(){
  if (notifPollTimer) clearInterval(notifPollTimer);
  notifPollTimer = setInterval(() => {
    if (document.visibilityState === "visible" && currentUser) refreshNotifCount();
  }, 45 * 1000);
}

async function refreshNotifCount(){
  refreshGiftBadge();   // fire and forget; has its own error handling
  const { count } = await _supabase
    .from("dating_notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", currentUser.id)
    .eq("read", false);
  const badge = document.getElementById("notifCount");
  if (!badge) return;
  badge.textContent = count > 9 ? "9+" : (count || "");
  badge.style.display = count ? "inline-block" : "none";
}

// ---------- Received gifts ----------
// Gifts a member has been sent live in dating_gifts (sender_id, recipient_id,
// gift_id -> dating_gift_catalog). RLS already lets recipients read their rows.
function giftSeenKey(){ return `wana_gifts_seen_${currentUser.id}`; }
function getGiftsSeenAt(){ try { return localStorage.getItem(giftSeenKey()) || ""; } catch (_) { return ""; } }
function setGiftsSeenAt(iso){ try { localStorage.setItem(giftSeenKey(), iso); } catch (_) {} }

async function refreshGiftBadge(){
  if (!currentUser) return;
  const badge = document.getElementById("giftCount");
  if (!badge) return;
  let q = _supabase.from("dating_gifts")
    .select("*", { count: "exact", head: true })
    .eq("recipient_id", currentUser.id);
  const seen = getGiftsSeenAt();
  if (seen) q = q.gt("created_at", seen);
  const { count, error } = await q;
  if (error){ console.warn("Gift badge:", error.message); return; }
  badge.textContent = count > 9 ? "9+" : (count || "");
  badge.style.display = count ? "inline-block" : "none";
}

async function openReceivedGifts(){
  if (!currentUser){ openAuthModal("signin"); return; }
  const root = document.getElementById("modalRoot");
  const shell = (inner) => `
    <div class="modal-backdrop" onclick="if(event.target===this) closeModal()">
      <div class="modal"><div class="body">
        <button class="btn-close" onclick="closeModal()">✕</button>
        <h3 style="margin-bottom:14px;">🎁 Gifts you've received</h3>
        ${inner}
      </div></div>
    </div>`;
  root.innerHTML = shell(`<p style="color:#777;">Loading…</p>`);

  try {
    let res = await _supabase.from("dating_gifts").select("*")
      .eq("recipient_id", currentUser.id)
      .order("created_at", { ascending: false }).limit(100);
    if (res.error) {   // e.g. no created_at column: retry unordered
      res = await _supabase.from("dating_gifts").select("*").eq("recipient_id", currentUser.id).limit(100);
    }
    if (res.error){
      console.error("Received gifts error:", res.error);
      root.innerHTML = shell(`<div class="msg error">Couldn't load your gifts: ${esc(res.error.message)}</div>`);
      return;
    }
    const gifts = res.data || [];

    // Gift details from the catalog, and sender names from profiles
    const catalog = {}, names = {};
    const giftIds = [...new Set(gifts.map(g => g.gift_id).filter(Boolean))];
    if (giftIds.length){
      const { data } = await _supabase.from("dating_gift_catalog").select("*").in("id", giftIds);
      (data || []).forEach(c => { catalog[c.id] = c; });
    }
    const senderIds = [...new Set(gifts.map(g => g.sender_id).filter(Boolean))];
    if (senderIds.length){
      const { data } = await _supabase.from("dating_profiles").select("user_id, display_name").in("user_id", senderIds);
      (data || []).forEach(p => { names[p.user_id] = p.display_name; });
    }

    const seen = getGiftsSeenAt();
    const cards = gifts.map(g => {
      const c = catalog[g.gift_id] || {};
      const emoji = c.emoji || g.emoji || "🎁";
      const gname = c.name || g.gift_name || "Gift";
      const sender = names[g.sender_id] || "Someone";
      const isNew = g.created_at && (!seen || g.created_at > seen);
      const when = g.created_at ? new Date(g.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "";
      return `
        <div style="display:flex;gap:12px;align-items:flex-start;border:1px solid var(--line);border-radius:12px;padding:12px;margin-bottom:10px;background:${isNew ? "#fffaf0" : "#fff"};">
          <div style="font-size:2rem;line-height:1;">${esc(emoji)}</div>
          <div style="flex:1;min-width:0;">
            <div><b>${esc(gname)}</b>${isNew ? ` <span style="font-size:.7rem;background:#B8860B;color:#fff;border-radius:999px;padding:2px 8px;margin-left:6px;">New</span>` : ""}</div>
            <div style="font-size:.88rem;color:#555;">from ${esc(sender)}</div>
            ${g.message ? `<div style="margin-top:6px;font-size:.92rem;white-space:pre-wrap;word-break:break-word;">“${esc(g.message)}”</div>` : ""}
            ${when ? `<div style="margin-top:6px;font-size:.74rem;color:#94a3b8;">${esc(when)}</div>` : ""}
          </div>
        </div>`;
    }).join("");

    root.innerHTML = shell(cards || `<p style="color:#777;">No gifts yet. Platinum members can send you a gift once you're matched.</p>`);

    // Mark everything up to the newest gift as seen and clear the badge
    const newest = gifts.map(g => g.created_at).filter(Boolean).sort().pop();
    setGiftsSeenAt(newest || new Date().toISOString());
    refreshGiftBadge();
  } catch (err){
    console.error("openReceivedGifts failed:", err);
    root.innerHTML = shell(`<div class="msg error">Couldn't load your gifts: ${esc((err && err.message) || String(err))}</div>`);
  }
}
window.openReceivedGifts = openReceivedGifts;

// ---------- Realtime: messages & notifications ----------
function setupRealtimeMessaging(){
  if (messageRealtimeChannel) return;
  messageRealtimeChannel = _supabase
    .channel(`dating-messages:${currentUser.id}`)
    .on("postgres_changes", {
      event: "INSERT", schema: "public", table: "dating_messages",
      filter: `recipient_id=eq.${currentUser.id}`
    }, (payload) => handleIncomingMessage(payload.new))
    .subscribe();
}

function handleIncomingMessage(m){
  refreshUnreadBadge();

  const messagesTabVisible = document.getElementById("messagesPanel")?.style.display !== "none";
  if (messagesTabVisible) loadThreads();

 if (currentOpenThread &&
      currentOpenThread.other === m.sender_id){
    if (!currentOpenThread.messages.some(x => x.id === m.id)) currentOpenThread.messages.unshift(m);
    openThread(currentOpenThread);
  }
}

function setupRealtimeNotifications(){
  if (notifRealtimeChannel) return;
  notifRealtimeChannel = _supabase
    .channel(`dating-notifications:${currentUser.id}`)
    .on("postgres_changes", {
      event: "INSERT", schema: "public", table: "dating_notifications",
      filter: `user_id=eq.${currentUser.id}`
    }, (payload) => {
      refreshNotifCount();
      if (document.getElementById("notifPanel")?.classList.contains("open")) loadNotifications();
      showBrowserNotification(payload && payload.new);
    })
    .subscribe();
}

// ---------- Browser notifications (Safety & Trust Center) ----------
// These are ordinary browser notifications raised by the realtime channel, so they
// work while Wana Dating is open in a tab (including a background tab). Without a
// service worker + push server they cannot wake a closed browser; the panel says so.
const BROWSER_NOTIF_KEY = "wana_browser_notifications";
function _notifPrefGet(){ try { return localStorage.getItem(BROWSER_NOTIF_KEY) === "1"; } catch(e){ return false; } }
function _notifPrefSet(on){ try { on ? localStorage.setItem(BROWSER_NOTIF_KEY, "1") : localStorage.removeItem(BROWSER_NOTIF_KEY); } catch(e){} }

function browserNotificationsEnabled(){
  return ("Notification" in window) && Notification.permission === "granted" && _notifPrefGet();
}

// Deliberately generic text: it shows on lock screens, so it never includes
// message content or names.
function showBrowserNotification(n){
  if (!n || !browserNotificationsEnabled() || !document.hidden) return;
  const text = {
    message: "You have a new message",
    like: "Someone liked your profile",
    match: "It's a match! ✨",
    date: "There's an update on a date plan"
  }[n.type] || "You have new activity";
  try {
    const note = new Notification("Wana Dating", { body: text, tag: "wana-" + (n.id || Date.now()) });
    note.onclick = () => { window.focus(); note.close(); };
  } catch(e){ /* some mobile browsers only allow notifications via a service worker */ }
}

function refreshPushStatus(){
  const status = document.getElementById("pushStatus");
  const btn = document.getElementById("pushEnableBtn");
  if (!status || !btn) return;
  if (!("Notification" in window)){
    btn.disabled = true;
    status.textContent = "Not supported in this browser.";
    return;
  }
  if (Notification.permission === "denied"){
    btn.disabled = true;
    status.textContent = "Blocked for this site. Allow notifications in your browser's site settings, then reload.";
    return;
  }
  btn.disabled = false;
  if (browserNotificationsEnabled()){
    btn.textContent = "Turn off notifications";
    status.textContent = "On. You'll get an alert for new activity while Wana Dating is open in a background tab.";
  } else {
    btn.textContent = "Enable notifications";
    status.textContent = "Off. These alerts work while the site is open in a tab; they can't reach a closed browser.";
  }
}

async function enableWanaNotifications(){
  const status = document.getElementById("pushStatus");
  if (!("Notification" in window)){ refreshPushStatus(); return; }
  if (browserNotificationsEnabled()){ _notifPrefSet(false); refreshPushStatus(); return; } // toggle off
  let permission = Notification.permission;
  if (permission === "default") permission = await Notification.requestPermission();
  if (permission !== "granted"){
    if (status) status.textContent = permission === "denied"
      ? "Blocked for this site. Allow notifications in your browser's site settings, then reload."
      : "Permission wasn't granted, so notifications stay off.";
    refreshPushStatus();
    return;
  }
  _notifPrefSet(true);
  try { new Notification("Wana Dating", { body: "Notifications are on." }); } catch(e){}
  refreshPushStatus();
}

// ---------- Safety: how to report ----------
function openSafetyReportGuide(){
  document.getElementById("modalRoot").innerHTML = `
    <div class="modal-backdrop" onclick="if(event.target===this) closeModal()">
      <div class="modal">
        <div class="body">
          <button class="btn-close" onclick="closeModal()">✕</button>
          <h3 style="margin-top:0;">Report a concern</h3>
          <p style="font-size:.9rem;color:#555;">Reports go to our moderators, who can remove profiles and posts. The other person is never told who reported them.</p>
          <ol style="font-size:.9rem;color:#444;line-height:1.7;padding-left:20px;">
            <li><b>A profile:</b> open their profile card (Browse, New Members, Likes or Visitors) and choose <b>Report</b>. Choose <b>Block</b> as well to stop all contact.</li>
            <li><b>A post:</b> use <b>Report</b> on the post in the Home feed.</li>
            <li><b>Never</b> send money, passwords or verification codes to another member.</li>
          </ol>
          <p style="font-size:.8rem;color:#b3261e;">If you are in immediate danger, contact your local emergency services. Moderators can't respond to emergencies.</p>
          <div class="actions">
            <button class="btn-contact" onclick="closeModal();switchTab('browse')">Go to Browse</button>
            <button class="btn-contact" style="background:var(--paper);color:var(--green);" onclick="closeModal();switchTab('home')">Go to Home feed</button>
          </div>
        </div>
      </div>
    </div>`;
}

refreshPushStatus(); // set the button label/state as soon as the page loads

function teardownRealtimeChannels(){
  if (messageRealtimeChannel){ _supabase.removeChannel(messageRealtimeChannel); messageRealtimeChannel = null; }
  if (notifRealtimeChannel){ _supabase.removeChannel(notifRealtimeChannel); notifRealtimeChannel = null; }

    if (personalCallChannel){ _supabase.removeChannel(personalCallChannel); personalCallChannel = null; }
}


function notifIcon(type){
  return type === "match" ? "✨" : type === "like" ? "💛" : type === "date" ? "📅" : type === "gift" ? "🎁" : type === "platinum" ? "💎" : type === "photo" ? "📷" : "💬";
}

function notifText(n){
  const name = n.actor_name || "Someone";
  if (n.type === "match") return `It's a match with ${esc(name)}!`;
  if (n.type === "like") return `${esc(name)} liked your profile`;
  if (n.type === "date") return `${esc(name)} ${esc(n.body || "sent you a date update")}`;
  if (n.type === "platinum") return esc(n.body || "Your Platinum is active");
  if (n.type === "photo") return esc(n.body || "One of your photos was removed");
  // The database already writes a full sentence ("You received a Platinum gift: Rose")
  if (n.type === "gift") return `${esc(n.body || "You received a gift")}${n.actor_name ? ` from ${esc(name)}` : ""}`;
  return `New message from ${esc(name)}${n.body ? `: "${esc(n.body)}"` : ""}`;
}

async function toggleNotifPanel(){
  const panel = document.getElementById("notifPanel");
  const opening = !panel.classList.contains("open");
  panel.classList.toggle("open", opening);
  if (opening) await loadNotifications();
}

async function loadNotifications(){
  const list = document.getElementById("notifList");
  list.innerHTML = `<div class="notif-empty">Loading…</div>`;

  const { data, error } = await _supabase
    .from("dating_notifications")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error){ list.innerHTML = `<div class="notif-empty">Couldn't load notifications.</div>`; return; }
  if (!data || data.length === 0){
    list.innerHTML = `<div class="notif-empty">Nothing yet — likes, matches and messages will show up here.</div>`;
    const unreadLabelEmpty = document.getElementById("notifUnreadLabel");
    if (unreadLabelEmpty) unreadLabelEmpty.textContent = "";
    return;
  }

  const unreadLabel = document.getElementById("notifUnreadLabel");
  if (unreadLabel){
    const unreadCount = data.filter(n => !n.read).length;
    unreadLabel.textContent = unreadCount ? `(${unreadCount} new)` : "";
  }

  const actorIds = [...new Set(data.map(n => n.actor_id).filter(Boolean))];
  const { data: actors } = actorIds.length
    ? await _supabase.from("dating_profiles").select("user_id, display_name, gender").in("user_id", actorIds)
    : { data: [] };
  const actorMap = {};
  (actors || []).forEach(a => actorMap[a.user_id] = a.display_name || a.gender || "Someone");

  list.innerHTML = data.map((n, i) => {
    n._idx = i;
    const name = actorMap[n.actor_id] || "Someone";
    return `
      <button class="notif-item${n.read ? "" : " unread"}" onclick="handleNotifClick(${i})">
        ${notifIcon(n.type)} ${notifText({...n, actor_name: name})}
        <span class="when">${new Date(n.created_at).toLocaleString()}</span>
      </button>`;
  }).join("");

  window._notifCache = data.map(n => ({...n, actor_name: actorMap[n.actor_id] || "Someone"}));
}

async function handleNotifClick(idx){
  const n = window._notifCache?.[idx];
  document.getElementById("notifPanel").classList.remove("open");
  if (!n) return;

  if (!n.read){
    await _supabase.from("dating_notifications").update({ read: true }).eq("id", n.id);
    refreshNotifCount();
  }

  if (n.type === "message"){
    switchTab("messages");
    return;
  }
  if (n.type === "date"){
    switchTab("dateplans");
    return;
  }
  if (n.type === "gift"){
    openReceivedGifts();
    return;
  }
  if (n.type === "platinum"){
    switchTab("myprofile");
    return;
  }
  if (n.type === "photo"){
    switchTab("post");      // Edit Profile: upload a replacement photo
    return;
  }

  if (n.actor_id){
    const { data: profile } = await _supabase
      .from("dating_profiles")
      .select("*")
      .eq("user_id", n.actor_id)
      .maybeSingle();
    if (profile){ switchTab("browse"); openModal(profile); return; }
  }
  switchTab(n.type === "match" ? "messages" : "likes");
}

async function markAllNotificationsRead(){
  await _supabase.from("dating_notifications").update({ read: true }).eq("user_id", currentUser.id).eq("read", false);
  await loadNotifications();
  refreshNotifCount();
}

async function loadLikesReceived(){
  await refreshMyMatchedIds();
  const grid = document.getElementById("likesGrid");
  const empty = document.getElementById("likesEmpty");
  grid.innerHTML = "";

  const { data: likes, error } = await _supabase
    .from("dating_likes")
    .select("*")
    .eq("liked_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error || !likes || likes.length === 0){
    empty.style.display = "block";
    return;
  }

  const unseenIds = likes.filter(l => !l.seen).map(l => l.id);
  if (unseenIds.length){
    await _supabase.from("dating_likes").update({ seen: true }).in("id", unseenIds);
  }
  document.getElementById("likesBadge").textContent = "";
  setMnavBadge("mnavLikesBadge", 0);

  const likerIds = likes.map(l => l.liker_id);
  const { data: profiles } = await _supabase
    .from("dating_profiles")
    .select("*")
    .in("user_id", likerIds);
  const profileMap = {};
  (profiles || []).forEach(p => profileMap[p.user_id] = p);

  const blockedIds = await fetchBlockedIds();
  const rows = likes.map(l => profileMap[l.liker_id]).filter(p => p && !blockedIds.has(p.user_id));

  if (rows.length === 0){
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  rows.forEach(row => grid.appendChild(createProfileCard(row, { extraMeta: null })));
}

// ---------- Visitors (who viewed you) ----------
async function loadVisitors(){
  const grid = document.getElementById("visitorsGrid");
  const empty = document.getElementById("visitorsEmpty");
  grid.innerHTML = "";

  const { data: visits, error } = await _supabase
    .from("dating_profile_views")
    .select("*")
    .eq("viewed_user_id", currentUser.id)
    .order("last_viewed_at", { ascending: false })
    .limit(50);

  if (error){
    console.error("Couldn't load visitors:", error.message);
    empty.style.display = "none";
    grid.innerHTML = `<div class="msg error" style="grid-column:1/-1;">Couldn't load your visitors right now. Please try again later.</div>`;
    return;
  }
  if (!visits || visits.length === 0){
    empty.style.display = "block";
    return;
  }

  const unseenIds = visits.filter(v => !v.seen).map(v => v.id);
  if (unseenIds.length){
    await _supabase.from("dating_profile_views").update({ seen: true }).in("id", unseenIds);
  }
  const badge = document.getElementById("visitorsBadge");
  if (badge) badge.textContent = "";
  setMnavBadge("mnavMoreBadge", 0);

  const viewerIds = visits.map(v => v.viewer_id);
  const { data: profiles } = await _supabase
    .from("dating_profiles")
    .select("*")
    .in("user_id", viewerIds);
  const profileMap = {};
  (profiles || []).forEach(p => profileMap[p.user_id] = p);

  const blockedIds = await fetchBlockedIds();
  const visitMap = {};
  visits.forEach(v => visitMap[v.viewer_id] = v.last_viewed_at);

  const rows = visits.map(v => profileMap[v.viewer_id]).filter(p => p && !blockedIds.has(p.user_id));

  if (rows.length === 0){
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  rows.forEach(row => {
    const viewedText = joinedAgoText(visitMap[row.user_id]).replace("Joined", "Viewed");
    grid.appendChild(createProfileCard(row, {
      showOnlineDot: false,
      extraMeta: `<div class="presence" style="color:var(--gold);font-weight:600;">${viewedText}</div>`
    }));
  });
}

async function recordProfileView(viewedUserId){
  if (!currentUser || viewedUserId === currentUser.id) return;
  // Goes through a database function rather than a direct upsert: an upsert
  // fails on any repeat visit because the viewer isn't allowed to read the
  // existing row (only the person being viewed is). Never block opening
  // the profile over this, but do log failures so they can be diagnosed.
  try {
    const { error } = await _supabase.rpc("dating_record_profile_view", { p_viewed: viewedUserId });
    if (error) console.warn("Couldn't record profile view:", error.message);
  } catch (e){
    console.warn("Couldn't record profile view:", e);
  }
}

// ---------- Tabs ----------
const PANELS = [
  "homePanel", "browsePanel", "newMembersPanel", "postPanel",
  "messagesPanel", "callsPanel", "likesPanel", "visitorsPanel",
  "compatibilityPanel", "dateplansPanel", "safetyPanel",
  "myProfilePanel", "settingsPanel"
];

// ---------- Phone bottom nav helpers ----------
function setMnavBadge(id, count){
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = count > 99 ? "99+" : (count || "");
  el.style.display = count ? "flex" : "none";
}

function openMoreSheet(){
  const sheet = document.getElementById("moreSheet");
  if (sheet) sheet.classList.add("open");
  document.getElementById("moreSheetBackdrop")?.classList.add("open");
}

function closeMoreSheet(){
  document.getElementById("moreSheet")?.classList.remove("open");
  document.getElementById("moreSheetBackdrop")?.classList.remove("open");
}

const MNAV_PRIMARY_TABS = ["home", "browse", "messages", "likes", "myprofile"];

function switchTab(tab){
  closeMoreSheet();
  if (tab === 'home' && currentUser) setTimeout(loadHomeRecommendations, 80);

  // Desktop sidebar tabs
  document.querySelectorAll(".side-nav .tab").forEach(t =>
    t.classList.toggle("active", t.dataset.tab === tab)
  );

  // Mobile bottom nav
  document.querySelectorAll('.mnav-item[data-tab]').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.tab === tab)
  );
  const moreBtn = document.getElementById("mnavMore");
  if (moreBtn) moreBtn.classList.toggle("active", !MNAV_PRIMARY_TABS.includes(tab));
  window.scrollTo({ top: 0 });

  if (!currentUser){
    document.getElementById("gate").style.display = "flex";
    PANELS.forEach(p => {
      const el = document.getElementById(p);
      if (el) el.style.display = "none";
    });
    return;
  }

  document.getElementById("gate").style.display = "none";
  PANELS.forEach(p => {
    const el = document.getElementById(p);
    if (el) el.style.display = "none";
  });

  const map = {
    home: "homePanel",
    browse: "browsePanel",
    newmembers: "newMembersPanel",
    post: "postPanel",
    messages: "messagesPanel",
    calls: "callsPanel",
    likes: "likesPanel",
    visitors: "visitorsPanel",
    compatibility: "compatibilityPanel",
    dateplans: "dateplansPanel",
    safety: "safetyPanel",
    myprofile: "myProfilePanel",
    settings: "settingsPanel"
  };

  const panelId = map[tab];
  if (panelId) {
    const panel = document.getElementById(panelId);
    if (panel) panel.style.display = "block";
  }

  if (tab === "home") loadFeed();
  if (tab === "browse") loadProfiles();
  if (tab === "newmembers") loadNewMembers();
  if (tab === "messages"){ loadThreads(); refreshUnreadBadge(); }
  if (tab === "calls" && window.loadCallHistory) window.loadCallHistory();
  if (tab === "likes") loadLikesReceived();
  if (tab === "visitors") loadVisitors();
  if (tab === "myprofile") loadMyProfile();
  if (tab === "post") fetchMyProfile();   // refreshes + prefills the form with the saved profile
  if (tab === "settings") loadSettings();
  // Add handlers for compatibility / dateplans / safety if you have them
}

// ---------- Home feed ----------
let pendingPostImageFile = null;

async function setComposerAvatar(){
  const el = document.getElementById("composerAvatar");
  if (!el) return;
  const { data } = await _supabase
    .from("dating_profiles")
    .select("photo_url, photos")
    .eq("user_id", currentUser.id)
    .maybeSingle();
  const photo = data ? ((data.photos && data.photos[0]) || data.photo_url) : null;
  el.innerHTML = photo ? `<img src="${esc(photo)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : "👤";
}

function previewPostImage(){
  const input = document.getElementById("postImage");
  const preview = document.getElementById("postImagePreview");
  const file = input.files && input.files[0];
  pendingPostImageFile = file || null;
  preview.innerHTML = "";
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    preview.innerHTML = `<div style="position:relative;display:inline-block;margin-top:8px;">
      <img src="${e.target.result}" style="max-width:100%;max-height:200px;border-radius:12px;display:block;">
      <button type="button" onclick="clearPostImage()" aria-label="Remove photo" style="position:absolute;top:6px;right:6px;background:rgba(0,0,0,.6);color:#fff;border:none;border-radius:50%;width:24px;height:24px;cursor:pointer;">✕</button>
    </div>`;
  };
  reader.readAsDataURL(file);
}

function clearPostImage(){
  pendingPostImageFile = null;
  document.getElementById("postImage").value = "";
  document.getElementById("postImagePreview").innerHTML = "";
}

const POST_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const POST_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

// Shared upload hardening (profile photos, selfies, receipts).
// SVG is deliberately not allowed: it can carry scripts.
const UPLOAD_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

// Returns an error message, or null if the file is OK.
function checkUploadFile(file, { allowPdf = false } = {}){
  if (!file) return "Choose a file first.";
  const okType = UPLOAD_IMAGE_TYPES.has(file.type) || (allowPdf && file.type === "application/pdf");
  if (!okType) return allowPdf ? "Use a JPG, PNG, WEBP, GIF or PDF file." : "Use a JPG, PNG, WEBP or GIF image.";
  if (file.size > UPLOAD_MAX_BYTES) return "File must be 10 MB or smaller.";
  return null;
}

// Storage path: keeps the "<userId>-" prefix the bucket write policies expect,
// strips unsafe characters (spaces, slashes, Amharic etc. in file names) and
// adds a random part so two files can never collide.
function makeUploadPath(file){
  const safe = String(file.name || "file").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const rand = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2)).slice(0, 8);
  return `${currentUser.id}-${Date.now()}-${rand}-${safe}`;
}
let postSubmitting = false;
// Which column holds the post's photo. The newer private-storage schema calls it
// photo_url; an older database still calls it image_url. We try photo_url first
// and, if the database says that column doesn't exist, switch to image_url for
// the rest of the session instead of failing every post.
let postMediaColumn = "photo_url";

async function submitPost(){
  if (postSubmitting) return;
  if (!(await requireProfile("post to the Home feed"))) return;

  const msgEl = document.getElementById("postMsg");
  const btn = document.getElementById("postSubmitBtn");
  const bodyText = document.getElementById("postBody").value.trim();
  const visibility = document.getElementById("postVisibility").value;
  const file = pendingPostImageFile || (document.getElementById("postImage").files || [])[0] || null;

  if (!bodyText && !file){
    msgEl.innerHTML = `<div class="msg error">Please enter text or attach an image.</div>`;
    return;
  }
  if (file && !POST_IMAGE_TYPES.has(file.type)){
    msgEl.innerHTML = `<div class="msg error">Use a JPG, PNG, WEBP, or GIF image.</div>`;
    return;
  }
  if (file && file.size > POST_IMAGE_MAX_BYTES){
    msgEl.innerHTML = `<div class="msg error">Images must be 5 MB or smaller.</div>`;
    return;
  }

  postSubmitting = true;
  if (btn){ btn.disabled = true; btn.textContent = "Posting..."; }
  try {
    let mediaPath = null;
    if (file){
      // "<uid>-<time>-<name>" with NO sub-folder: this bucket's write policy is
      // name LIKE auth.uid()||'-%', so a "<uid>/<file>" path is rejected. The name
      // is sanitised so a crafted filename can't alter the path.
      const safe = String(file.name || "image").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
      mediaPath = `${currentUser.id}-${Date.now()}-${safe}`;
      const { error: uploadErr } = await _supabase.storage.from(BUCKET_POST_MEDIA)
        .upload(mediaPath, file, { contentType: file.type, upsert: false });
      if (uploadErr){
        msgEl.innerHTML = `<div class="msg error">Image upload failed: ${esc(uploadErr.message)}</div>`;
        return;
      }
    }

    // body is never null/empty: an image-only post gets a camera emoji so it
    // satisfies a NOT NULL / minimum-length constraint on the column.
    const row = { user_id: currentUser.id, body: bodyText || "📷", visibility };
    const insertRow = () => _supabase.from("dating_posts").insert({ ...row, [postMediaColumn]: mediaPath });

    let { error } = await insertRow();
    if (error && postMediaColumn === "photo_url" && /photo_url/i.test(error.message || "") && /column|schema cache/i.test(error.message || "")){
      postMediaColumn = "image_url";
      ({ error } = await insertRow());
    }

    if (error){
      const isRlsBlock = error.code === "42501" || /row-level security/i.test(error.message || "");
      msgEl.innerHTML = isRlsBlock
        ? `<div class="msg error">Post a profile first (see the "Setup Profile" tab) before sharing to the Home feed.</div>`
        : `<div class="msg error">Couldn't post: ${esc(error.message)}</div>`;
      return;
    }

    document.getElementById("postBody").value = "";
    clearPostImage();
    msgEl.innerHTML = `<div class="msg success">Post shared!</div>`;
    setTimeout(() => { if (msgEl.textContent.includes("Post shared")) msgEl.innerHTML = ""; }, 2500);
    loadFeed();
  } finally {
    postSubmitting = false;
    if (btn){ btn.disabled = false; btn.textContent = "Post"; }
  }
}

// Opens someone's profile. The row is always fetched fresh, and the
// viewer's own verification/match status is loaded first, so the owner's
// current privacy settings (e.g. who may see last seen) are applied
// correctly rather than from a stale copy.
async function openProfileByUserId(userId, opts = {}){
  if (userId === currentUser.id){
    closeModal();
    switchTab("myprofile");
    return;
  }
  if (!myProfile) await fetchMyProfile();
  await refreshMyMatchedIds();
  const { data, error } = await _supabase
    .from("dating_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data){
    alert("This person doesn't have a dating profile to view.");
    return;
  }
  returnThread = opts.returnTo || null;
  // Otherwise an incoming message would re-render the chat over this profile.
  currentOpenThread = null;
  openModal(data);
}

async function viewProfileFromFeed(userId){
  return openProfileByUserId(userId);
}

// Clicking a person in Messages. From inside an open chat, the profile
// gets a "Back to chat" button.
async function viewProfileFromThread(userId, fromOpenChat){
  return openProfileByUserId(userId, { returnTo: fromOpenChat ? currentOpenThread : null });
}

function backToThread(){
  const t = returnThread;
  returnThread = null;
  if (t) openThread(t);
}

async function loadFeed(){
  const feed = document.getElementById("feed");
  const empty = document.getElementById("feedEmpty");

  const hiddenIds = await fetchBlockedIds();

  const { data, error } = await _supabase
    .from("dating_posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error){ feed.innerHTML = `<p style="color:red;">${esc(error.message)}</p>`; return; }

  const posts = (data || []).filter(p => !hiddenIds.has(p.user_id));
  if (posts.length === 0){
    feed.innerHTML = "";
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  const postIds = posts.map(p => p.id);
  const authorIds = [...new Set(posts.map(p => p.user_id))];

  const [{ data: authors }, { data: reactions }, { data: comments }] = await Promise.all([
    _supabase.from("dating_profiles").select("user_id, display_name, gender, photo_url, photos, is_verified, is_platinum, platinum_until").in("user_id", authorIds),
    _supabase.from("dating_post_reactions").select("*").in("post_id", postIds),
    _supabase.from("dating_post_comments").select("*").in("post_id", postIds).order("created_at", { ascending: true })
  ]);

  const authorMap = {};
  (authors || []).forEach(a => authorMap[a.user_id] = a);

  const reactionsByPost = {};
  (reactions || []).forEach(r => { (reactionsByPost[r.post_id] ||= []).push(r); });

  const commentsByPost = {};
  (comments || []).forEach(c => { (commentsByPost[c.post_id] ||= []).push(c); });
  
  const commenterIds = [...new Set((comments || []).map(c => c.user_id))];
  const { data: commenterProfiles } = commenterIds.length
    ? await _supabase.from("dating_profiles").select("user_id, display_name, gender, is_verified, is_platinum, platinum_until").in("user_id", commenterIds)
    : { data: [] };
  const commenterMap = {};
  (commenterProfiles || []).forEach(p => commenterMap[p.user_id] = p);

  // Post images live in the private dating-post-media bucket now, gated
  // per-post by dating_can_view_post_media() — resolve each to a signed
  // URL up front so renderFeedPost can stay a plain synchronous template.
  const postPhotoUrls = {};
  const postMediaPath = p => p.photo_url || p.image_url; // either schema
  await Promise.all(posts.filter(p => postMediaPath(p)).map(async p => {
    postPhotoUrls[p.id] = await resolvePrivateUrl(BUCKET_POST_MEDIA, postMediaPath(p));
  }));

  feed.innerHTML = posts.map(p => renderFeedPost(p, authorMap[p.user_id], reactionsByPost[p.id] || [], commentsByPost[p.id] || [], commenterMap, postPhotoUrls[p.id], !!postMediaPath(p))).join("");
}

function renderFeedPost(p, a, postReactions, postComments, commenterMap, resolvedPhotoUrl, hadMedia){
  const name = a ? (a.display_name || a.gender || "Someone") : "Someone";
  const photo = a ? ((a.photos && a.photos[0]) || a.photo_url) : null;
  const photoIsUrl = photo && /^https?:\/\//i.test(photo);
  const isMine = p.user_id === currentUser.id;
  const visBadge = p.visibility === "matches" ? "👥 Matches only" : "🌍 Public";

  const reactionCounts = {};
  postReactions.forEach(r => {
    if (!REACTION_EMOJIS.includes(r.emoji)) return; // value is used inside an onclick attribute
    reactionCounts[r.emoji] = (reactionCounts[r.emoji]||0) + 1;
  });
  const myReaction = postReactions.find(r => r.user_id === currentUser.id);
  const reactionRow = Object.keys(reactionCounts).length
    ? `<div class="reaction-row">${Object.entries(reactionCounts).map(([e,c]) =>
        `<span class="reaction-pill${myReaction && myReaction.emoji===e ? " mine" : ""}" onclick="togglePostReaction('${p.id}','${e}')">${e} ${c}</span>`).join("")}</div>`
    : "";

  const commentsHtml = postComments.map(c => {
    const cp = commenterMap[c.user_id];
    const cname = cp ? (cp.display_name || cp.gender || "Someone") : "Someone";
    const canDelete = c.user_id === currentUser.id || isMine; 
    return `<div class="post-comment">
      <strong>${esc(cname)}${verifiedBadge(cp && cp.is_verified)}${platinumBadge(isPlatinumActive(cp))}</strong> ${esc(c.body)}
      ${canDelete ? `<button onclick="deleteComment('${c.id}','${p.id}')" style="background:none;border:none;color:#999;cursor:pointer;font-size:.85rem;float:right; font-weight:bold;">✕</button>` : ""}
    </div>`;
  }).join("");

  return `
    <div class="feed-post-card" id="post-${p.id}">
      <div style="display:flex;gap:12px;align-items:center;">
        <div onclick="viewProfileFromFeed('${p.user_id}')" ${photo && !photoIsUrl ? `data-profile-media-bg="${esc(photo)}"` : ""} style="cursor:pointer;width:42px;height:42px;border-radius:50%;flex-shrink:0;background:${photoIsUrl ? `url('${esc(photo)}') center/cover` : "var(--paper)"};display:flex;align-items:center;justify-content:center;color:#aaa; border: 1px solid var(--line);">${photo ? "" : "👤"}</div>
        <div style="flex:1;min-width:0;">
          <div onclick="viewProfileFromFeed('${p.user_id}')" style="cursor:pointer;font-weight:700;font-size:.95rem;color:var(--ink);width:fit-content;">${esc(name)}${verifiedBadge(a && a.is_verified)}${platinumBadge(isPlatinumActive(a))}</div>
          <div style="font-size:.8rem;color:#888;">${new Date(p.created_at).toLocaleString()} · ${visBadge}</div>
        </div>
        ${isMine ? `<button onclick="deletePost('${p.id}')" style="background:none;border:none;color:#aaa;cursor:pointer;font-size:1.1rem;">✕</button>`
                 : `<button onclick="reportPost('${p.id}')" style="background:none;border:none;color:#888;cursor:pointer;font-size:.8rem; font-weight:bold;">Report</button>`}
      </div>
      <div style="margin-top:12px;font-size:1rem;color:var(--ink);white-space:pre-wrap; line-height: 1.5;">${esc(p.body)}</div>
      ${resolvedPhotoUrl ? `<img src="${esc(resolvedPhotoUrl)}" style="margin-top:12px;max-width:100%;border-radius:10px;">`
        : hadMedia ? `<div style="margin-top:12px;padding:14px;border:1px dashed var(--line);border-radius:10px;color:#999;font-size:.8rem;text-align:center;">📷 Photo couldn't be loaded</div>` : ""}

      <div class="post-actions">
        <button onclick="showPostReactionPicker(event,'${p.id}')">😀 React</button>
        <button onclick="toggleCommentBox('${p.id}')">💬 Comment${postComments.length ? ` (${postComments.length})` : ""}</button>
      </div>
      ${reactionRow}

      <div class="post-comments" id="comments-${p.id}" style="display:none;">
        <div class="post-comment-list">${commentsHtml}</div>
        <div class="post-comment-input">
          <input type="text" id="commentInput-${p.id}" maxlength="500" placeholder="Write a comment...">
          <button onclick="submitComment('${p.id}')">Post</button>
        </div>
      </div>
    </div>`;
}

function toggleCommentBox(postId){
  const box = document.getElementById(`comments-${postId}`);
  if (box) box.style.display = box.style.display === "none" ? "block" : "none";
}

async function submitComment(postId){
  if (!(await requireProfile("comment on posts"))) return;
  const input = document.getElementById(`commentInput-${postId}`);
  const body = input.value.trim();
  if (!body) return;
  const { error } = await _supabase.from("dating_post_comments").insert({
    post_id: postId, user_id: currentUser.id, body
  });
  if (error){ alert("Couldn't comment: " + error.message); return; }
  input.value = "";
  loadFeed();
}

async function deleteComment(commentId, postId){
  if (!confirm("Delete this comment?")) return;
  const { error } = await _supabase.from("dating_post_comments").delete().eq("id", commentId);
  if (error){ alert("Couldn't delete: " + error.message); return; }
  loadFeed();
}

const REACTION_EMOJIS = ["❤️","😂","😮","😢","👍","🔥"];

function showPostReactionPicker(event, postId){
  event.stopPropagation();
  document.getElementById("reactionPicker")?.remove();
  const picker = document.createElement("div");
  picker.id = "reactionPicker";
  picker.className = "reaction-picker";
  picker.innerHTML = REACTION_EMOJIS.map(e => `<span onclick="togglePostReaction('${postId}','${e}')">${e}</span>`).join("");
  document.body.appendChild(picker);
  const rect = event.target.getBoundingClientRect();
  picker.style.top = (rect.bottom + window.scrollY + 4) + "px";
  picker.style.left = Math.max(8, rect.left + window.scrollX - 60) + "px";
  setTimeout(() => document.addEventListener("click", function closePicker(e){
    if (!picker.contains(e.target)){ picker.remove(); document.removeEventListener("click", closePicker); }
  }), 0);
}

async function togglePostReaction(postId, emoji){
  document.getElementById("reactionPicker")?.remove();
  const { data: existing } = await _supabase
    .from("dating_post_reactions")
    .select("*")
    .eq("post_id", postId)
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (existing && existing.emoji === emoji){
    await _supabase.from("dating_post_reactions").delete().eq("id", existing.id);
  } else if (existing){
    await _supabase.from("dating_post_reactions").update({ emoji }).eq("id", existing.id);
  } else {
    await _supabase.from("dating_post_reactions").insert({ post_id: postId, user_id: currentUser.id, emoji });
  }
  loadFeed();
}

async function deletePost(postId){
  if (!confirm("Delete this post?")) return;
  const { error } = await _supabase.from("dating_posts").delete().eq("id", postId);
  if (error){ alert("Couldn't delete: " + error.message); return; }
  loadFeed();
}

async function reportPost(postId){
  const reason = prompt("What's the issue with this post?");
  if (!reason) return;
  const { error } = await _supabase.from("dating_post_reports").insert({
    post_id: postId,
    reporter_id: currentUser.id,
    reason
  });
  alert(error ? "Couldn't send report: " + error.message : "Thanks — we'll take a look.");
}

// ---------- Load / render profiles ----------
async function loadProfiles() {
  await refreshMyMatchedIds();

  const seeking = document.getElementById("filterSeeking").value;
  const type = document.getElementById("filterType").value;
  const city = document.getElementById("filterCity").value.trim();
  const onlineOnly = document.getElementById("filterOnline").checked;
  const verifiedOnly = document.getElementById("filterVerified").checked;
  const ageMin = parseInt(document.getElementById("filterAgeMin").value, 10);
  const ageMax = parseInt(document.getElementById("filterAgeMax").value, 10);
  const religion = document.getElementById("filterReligion").value;
  const lifestyle = document.getElementById("filterLifestyle").value;
  const hasKids = document.getElementById("filterHasKids").value;
  const wantsKids = document.getElementById("filterWantsKids").value;

  const grid = document.getElementById("grid");
  const empty = document.getElementById("emptyState");
  grid.innerHTML = "";

  // 1. Build dynamic Supabase Query (Filtering on Server)
  let query = _supabase
    .from("dating_profiles")
    .select("*")
    .neq("user_id", currentUser.id);

  if (seeking) query = query.eq("gender", seeking);
  if (type) query = query.eq("relationship_type", type);
  if (city) query = query.ilike("city", `%${city}%`);
  if (verifiedOnly) query = query.eq("is_verified", true);
  if (!isNaN(ageMin)) query = query.gte("age", ageMin);
  if (!isNaN(ageMax)) query = query.lte("age", ageMax);
  if (religion) query = query.eq("religion", religion);
  if (lifestyle) query = query.eq("lifestyle", lifestyle);
  if (hasKids) query = query.eq("has_kids", hasKids);
  if (wantsKids) query = query.eq("wants_kids", wantsKids);

  // 2. Fetch Filtered Data
  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    empty.textContent = "Couldn't load profiles right now.";
    empty.style.display = "block";
    console.error(error);
    return;
  }

  // 3. Post-process online status & client render limits
  let rows = data || [];
  if (onlineOnly) {
    rows = rows.filter(r => visiblePresence(r).online);
  }

  // Sort online profiles to the top
  rows.sort((a, b) => {
    const aOnline = visiblePresence(a).online;
    const bOnline = visiblePresence(b).online;
    if (aOnline !== bOnline) return aOnline ? -1 : 1;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const onlineCount = rows.filter(r => visiblePresence(r).online).length;
  document.getElementById("onlineSummary").textContent =
    onlineCount > 0
      ? `🟢 ${onlineCount} ${onlineCount === 1 ? "person" : "people"} online now`
      : "";

  if (rows.length === 0) {
    empty.style.display = "block";
    document.getElementById("moreWrap").style.display = "none";
    return;
  }
  
  empty.style.display = "none";
  allBrowseRows = rows;
  visibleCount = PAGE_SIZE;
  renderBrowseGrid();
}

function clearBrowseFilters(){
  ["filterSeeking","filterType","filterReligion","filterLifestyle","filterHasKids","filterWantsKids"]
    .forEach(id => document.getElementById(id).value = "");
  ["filterCity","filterAgeMin","filterAgeMax"].forEach(id => document.getElementById(id).value = "");
  ["filterOnline","filterVerified"].forEach(id => document.getElementById(id).checked = false);
  loadProfiles();
}

/**
 * Shared profile card used by Browse, Likes, Visitors, and New Members.
 * @param {object} row - dating_profiles row
 * @param {object} [opts]
 * @param {string|null} [opts.extraMeta] - HTML for the third info line. Pass null to omit presence.
 * @param {boolean} [opts.showOnlineDot=true]
 */
function createProfileCard(row, opts = {}) {
  const { extraMeta, showOnlineDot = true } = opts;
  const img = (row.photos && row.photos[0]) || row.photo_url || null;
  const displayName = esc(row.display_name || row.gender || "Someone");
  const presence = visiblePresence(row);
  const metaLine = extraMeta !== undefined
    ? extraMeta
    : `<div class="presence ${presence.online ? "is-online" : ""}">${presence.text}</div>`;
  const card = document.createElement("div");
  card.className = "card";
  card.onclick = () => openModal(row);
  // img may be a full https URL (legacy) or a private-bucket storage path
  // (current uploads) — a raw path isn't a usable background-image url, so
  // it goes through data-profile-media-bg and gets resolved to a signed
  // URL by hydrateProfileMedia()/the hydration observer, same as the home
  // feed's recommended-matches rail does.
  const imgIsUrl = img && /^https?:\/\//i.test(img);
  card.innerHTML = `
    <div class="photo ${img && !imgIsUrl ? "profile-media-loading" : ""}" ${img ? `data-profile-media-bg="${esc(img)}"` : ""} style="${imgIsUrl ? `background-image:url('${esc(img)}')` : ""}">
      ${img ? "" : "👤"}
      ${showOnlineDot && presence.online ? `<span class="online-dot" title="Online now"></span>` : ""}
    </div>
    <div class="info">
      <div class="name-age">${displayName.toUpperCase()}${verifiedBadge(row.is_verified)}${platinumBadge(isPlatinumActive(row))} <span class="age">${row.age || "?"} yrs</span></div>
      <div class="meta">${esc(row.city || "")} · ${esc(row.relationship_type || "")}</div>
      ${metaLine || ""}
    </div>`;
  return card;
}

function renderBrowseGrid(){
  const grid = document.getElementById("grid");
  const moreWrap = document.getElementById("moreWrap");
  grid.innerHTML = "";

  allBrowseRows.slice(0, visibleCount).forEach(row => {
    grid.appendChild(createProfileCard(row));
  });

  moreWrap.style.display = allBrowseRows.length > visibleCount ? "block" : "none";
}

// ---------- New Members ----------
function joinedAgoText(createdAt){
  if (!createdAt) return "";
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Joined just now";
  if (mins < 60) return `Joined ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Joined ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Joined ${days}d ago`;
  return `Joined ${new Date(createdAt).toLocaleDateString()}`;
}

async function loadNewMembers(){
  await refreshMyMatchedIds();
  if (!myProfile) await fetchMyProfile();

  const grid = document.getElementById("newMembersGrid");
  const empty = document.getElementById("newMembersEmpty");
  grid.innerHTML = "";
  empty.style.display = "none";

  const blockedIds = await fetchBlockedIds();
  const mySeeking = String(myProfile?.seeking || "").trim().toLowerCase();
  const myGender = String(myProfile?.gender || "").trim().toLowerCase();

  // New Members is intentionally driven by the member's explicit
  // "Looking For" gender. Do not show a mixed-gender feed here.
  if (!myProfile || !["male", "female"].includes(myGender) || !["male", "female", "any"].includes(mySeeking)) {
    empty.textContent = "Complete your Gender and Looking For selections in Setup Profile to see New Members.";
    empty.style.display = "block";
    return;
  }

  let query = _supabase
    .from("dating_profiles")
    .select("*")
    .neq("user_id", currentUser.id)
    .order("created_at", { ascending: false })
    .limit(100);

  // Hard server-side gender filter: New Members only contains the gender
  // selected in the current member's Looking For field. "Any" means both.
  if (mySeeking !== "any") query = query.eq("gender", mySeeking === "male" ? "Male" : "Female");

  const { data, error } = await query;
  if (error){
    empty.textContent = "Couldn't load new members right now.";
    empty.style.display = "block";
    console.error(error);
    return;
  }

  const rows = (data || []).filter(r => {
    if (blockedIds.has(r.user_id)) return false;
    const candidateGender = String(r.gender || "").trim().toLowerCase();
    // Never display profiles with missing/invalid gender in New Members.
    if (!["male", "female"].includes(candidateGender)) return false;
    return mySeeking === "any" || candidateGender === mySeeking;
  });

  if (rows.length === 0){
    empty.textContent = mySeeking === "any"
      ? "No new members are available right now."
      : `No new ${mySeeking === "male" ? "men" : "women"} are available right now.`;
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";
  rows.forEach(row => {
    grid.appendChild(createProfileCard(row, {
      extraMeta: `<div class="presence" style="color:var(--gold);font-weight:600;">${joinedAgoText(row.created_at)}</div>`
    }));
  });
}

function showMoreProfiles(){
  visibleCount += PAGE_SIZE;
  renderBrowseGrid();
}

// ---------- Modal ----------
async function openModal(row){
  recordProfileView(row.user_id);
  const photos = (row.photos && row.photos.length) ? row.photos : (row.photo_url ? [row.photo_url] : []);
  const mainPhoto = photos[0] || null;
  const presence = visiblePresence(row);
  const root = document.getElementById("modalRoot");
  const matched = await checkMatch(row.user_id);
  const actionBtn = matched
    ? `<button class="btn-contact" onclick="contactProfile('${row.id}','${row.user_id}')">💬 Message</button>
       <button class="btn-contact" style="background:#6651a6;color:#fff;" id="planDateBtn">📅 Plan a Date</button>
       ${isPlatinumActive(myProfile)?'<button class="btn-contact" style="background:#B8860B;color:#fff;" id="sendGiftBtn">🎁 Send Gift</button>':''}`
    : `<button class="btn-contact" id="likeBtn" style="background:var(--gold); color:var(--ink);" onclick="likeProfile('${row.id}','${row.user_id}')">💛 Like Profile</button>`;
  // Same private-path vs. public-URL handling as createProfileCard(): a
  // storage path needs data-profile-media-bg + hydration, not a direct
  // background-image url (which would just fail to load silently).
  const isUrl = v => v && /^https?:\/\//i.test(v);
  const thumbs = photos.length > 1
    ? `<div class="thumb-row">${photos.map((p,i) => `<div class="thumb${i===0?" active":""} ${p && !isUrl(p) ? "profile-media-loading" : ""}" data-idx="${i}" ${p ? `data-profile-media-bg="${esc(p)}"` : ""} style="${isUrl(p) ? `background-image:url('${esc(p)}')` : ""}"></div>`).join("")}</div>`
    : "";
  root.innerHTML = `
    <div class="modal-backdrop" onclick="if(event.target===this) closeModal()">
      <div class="modal">
        <div class="photo ${mainPhoto && !isUrl(mainPhoto) ? "profile-media-loading" : ""}" id="modalMainPhoto" ${mainPhoto ? `data-profile-media-bg="${esc(mainPhoto)}"` : ""} style="${isUrl(mainPhoto) ? `background-image:url('${esc(mainPhoto)}')` : ""}"></div>
        ${thumbs}
        <div class="body">
          <button class="btn-close" onclick="closeModal()">✕</button>
          <h3>${row.display_name ? esc(row.display_name) + ", " : ""}${row.age || "?"}${verifiedBadge(row.is_verified)}${platinumBadge(isPlatinumActive(row))}</h3>
          <div class="meta">${esc(row.city || "")} · Looking for ${esc(row.seeking || "")} · ${esc(row.relationship_type || "")}</div>
          <div class="presence ${presence.online ? "is-online" : ""}" style="margin-bottom:12px; font-weight:600;">${presence.online ? "🟢 " : ""}${presence.text}</div>
          <div class="bio" style="background:#f4f7f6; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">${esc(row.bio || "")}</div>
          <div class="meta" style="margin-top:12px;line-height:1.8;">
            ${row.looking_for ? `<div>💍 <b>Looking for:</b> ${esc(row.looking_for)}</div>` : ""}
            ${(row.age_min && row.age_max) ? `<div>🎂 <b>Interested in ages:</b> ${esc(row.age_min)}–${esc(row.age_max)}</div>` : ""}
            ${row.lifestyle ? `<div>🌿 <b>Lifestyle:</b> ${esc(row.lifestyle)}</div>` : ""}
            ${row.has_kids ? `<div>👶 <b>Has kids:</b> ${esc(row.has_kids)}</div>` : ""}
            ${row.wants_kids ? `<div>🍼 <b>Wants kids:</b> ${esc(row.wants_kids)}</div>` : ""}
            ${row.religion ? `<div>🙏 <b>Religion:</b> ${esc(row.religion)}</div>` : ""}
            ${row.occupation ? `<div>💼 <b>Occupation:</b> ${esc(row.occupation)}</div>` : ""}
            ${(row.income_range && row.income_range !== "Prefer not to say") ? `<div>💰 <b>Income:</b> ${esc(row.income_range)}</div>` : ""}
          </div>
          <div id="matchNotice"></div>
          <div class="actions">
            ${returnThread ? `<button class="btn-report" onclick="backToThread()">← Back to chat</button>` : ""}
            ${actionBtn}
            <button class="btn-report" onclick="reportProfile('${row.id}')">Report</button>
            <button class="btn-report" onclick="blockProfile('${row.user_id}')">Block</button>
          </div>
        </div>
      </div>
    </div>`;
  
  const planDateBtn = root.querySelector("#planDateBtn");
  if (planDateBtn) planDateBtn.addEventListener("click", () => openDatePlanModal(row.user_id, row.display_name || "Match"));
  const sendGiftBtn = root.querySelector("#sendGiftBtn");
  if (sendGiftBtn) sendGiftBtn.addEventListener("click", () => openGiftCenter(row.user_id, row.display_name || "Match"));
  root.querySelectorAll(".thumb").forEach(el => {
    el.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const idx = parseInt(el.dataset.idx, 10);
      swapModalPhoto(photos[idx], el);
    });
  });
}
async function swapModalPhoto(url, thumbEl){
  const main = document.getElementById("modalMainPhoto");
  // Same path-vs-URL split as the rest of the modal: a storage path needs
  // resolvePrivateUrl() (signed URL), not a direct background-image.
  // (Not resolveProfilePhoto() — that helper is private to a later
  // IIFE-scoped <script> block and isn't reachable from here.)
  const resolved = /^https?:\/\//i.test(url) ? url : await resolvePrivateUrl(BUCKET_PROFILE_PHOTOS, url);
  if (main && resolved) main.style.backgroundImage = `url('${esc(resolved)}')`;
  thumbEl.parentElement.querySelectorAll(".thumb").forEach(t => t.classList.remove("active"));
  thumbEl.classList.add("active");
}
function closeModal(){ document.getElementById("modalRoot").innerHTML = ""; currentOpenThread = null; returnThread = null; document.body.classList.remove("chat-open"); }

// ---------- Likes / Matches ----------
async function checkMatch(otherUserId){
  const a = currentUser.id < otherUserId ? currentUser.id : otherUserId;
  const b = currentUser.id < otherUserId ? otherUserId : currentUser.id;
  const { data } = await _supabase
    .from("dating_matches")
    .select("id")
    .eq("user_a", a)
    .eq("user_b", b)
    .maybeSingle();
  return !!data;
}

async function unmatchUser(otherUserId, otherName){
  otherName = otherName ?? (window._threadNames && window._threadNames[otherUserId]) ?? "this person";
  if (!confirm(`Unmatch with ${otherName}? You'll stop seeing each other in Messages, and they'll need to match with you again before you can message.`)) return;
  const a = currentUser.id < otherUserId ? currentUser.id : otherUserId;
  const b = currentUser.id < otherUserId ? otherUserId : currentUser.id;
  const { error } = await _supabase
    .from("dating_matches")
    .delete()
    .eq("user_a", a)
    .eq("user_b", b);
  if (error){ alert("Couldn't unmatch right now: " + error.message); return; }
  closeModal();
  loadThreads();
  refreshUnreadBadge();
}

async function likeProfile(profileId, otherUserId){
  if (!(await requireProfile("like profiles"))) return;
  const btn = document.getElementById("likeBtn");
  if (btn){ btn.disabled = true; btn.textContent = "Liking..."; }

  const { error } = await _supabase.from("dating_likes").insert({
    liker_id: currentUser.id,
    liked_id: otherUserId
  });

  if (error && error.code !== "23505"){ 
    if (btn){ btn.disabled = false; btn.textContent = "💛 Like Profile"; }
    alert("Couldn't like right now: " + error.message);
    return;
  }

  const matched = await checkMatch(otherUserId);
  const notice = document.getElementById("matchNotice");
  if (matched){
    if (notice) notice.innerHTML = `<div class="msg success">🎉 It's a match! You can message each other now.</div>`;
    if (btn){
      btn.textContent = "💬 Message";
      btn.style.background = "var(--green)";
      btn.style.color = "white";
      btn.onclick = () => contactProfile(profileId, otherUserId);
      btn.disabled = false;
    }
    refreshUnreadBadge();
  } else {
    if (notice) notice.innerHTML = `<div class="msg success">💛 Liked! If they like you back, it's a match.</div>`;
    if (btn){ btn.textContent = "💛 Liked"; }
  }
}

function contactProfile(profileId, recipientId){
  const root = document.getElementById("modalRoot");
  root.innerHTML = `
    <div class="modal-backdrop" onclick="if(event.target===this) closeModal()">
      <div class="modal" style="max-width: 400px;">
        <div class="body">
          <button class="btn-close" onclick="closeModal()">✕</button>
          <h3 style="margin-bottom: 15px;">Send a message</h3>
          <textarea id="composeBody" maxlength="1000" placeholder="Say hello..." style="width:100%;min-height:120px;padding:12px;border:1px solid var(--line);border-radius:10px;font-family:inherit;font-size:1rem; outline:none;"></textarea>
          <div class="actions">
            <button class="btn-contact" onclick="sendMessage('${profileId}','${recipientId}')" style="width: 100%;">Send Message 🚀</button>
          </div>
          <div id="composeMsg"></div>
        </div>
      </div>
    </div>`;
}

function esc(str){
  return String(str ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  }[c]));
}

function opts(list, current){
  return list.map(v => `<option ${v===current?"selected":""}>${esc(v)}</option>`).join("");
}

// ---------- Sending: shared guard ----------
// One send at a time, a length cap, and a soft per-minute limit so a stuck
// key or double-tap can't flood someone. (Real rate limiting must also exist
// on the server; this only protects against accidents and casual spam.)
let _sendingMessage = false;
let _recentSendTimes = [];
const MSG_MAX_LEN = 1000;
const MSG_MAX_PER_MINUTE = 20;

function sendGuard(body){
  if (body.length > MSG_MAX_LEN) return `Messages can be up to ${MSG_MAX_LEN} characters.`;
  const now = Date.now();
  _recentSendTimes = _recentSendTimes.filter(t => now - t < 60000);
  if (_recentSendTimes.length >= MSG_MAX_PER_MINUTE) return "You're sending messages very quickly. Please wait a moment.";
  return null;
}

function friendlySendError(error){
  const text = String((error && (error.message || error.details)) || "");
  if ((error && error.code === "42501") || /row-level security|permission denied/i.test(text)){
    return "This message couldn't be sent. You may no longer be matched with this person, or they may have blocked you.";
  }
  return "Couldn't send: " + text;
}

async function sendMessage(profileId, recipientId){
  if (_sendingMessage) return;
  if (!(await requireProfile("send messages"))) return;
  const body = document.getElementById("composeBody").value.trim();
  const msgBox = document.getElementById("composeMsg");
  if (!body){ msgBox.innerHTML = `<div class="msg error">Write something first.</div>`; return; }
  const blocked = sendGuard(body);
  if (blocked){ msgBox.innerHTML = `<div class="msg error">${esc(blocked)}</div>`; return; }

  _sendingMessage = true;
  try {
    const { error } = await _supabase.from("dating_messages").insert({
      profile_id: profileId,
      sender_id: currentUser.id,
      recipient_id: recipientId,
      body
    });
    if (error){
      msgBox.innerHTML = `<div class="msg error">${esc(friendlySendError(error))}</div>`;
    } else {
      _recentSendTimes.push(Date.now());
      msgBox.innerHTML = `<div class="msg success">Sent!</div>`;
      setTimeout(closeModal, 700);
    }
  } finally {
    _sendingMessage = false;
  }
}

async function sendReply(profileId, recipientId){
  if (_sendingMessage) return;
  if (!(await requireProfile("send messages"))) return;

  const textarea = document.getElementById("replyBody");
  if (!textarea) return;
  const body = textarea.value.trim();
  if (!body) return;
  const setErr = (t) => { const el = document.getElementById("replyError"); if (el) el.textContent = t || ""; };
  setErr("");

  const blocked = sendGuard(body);
  if (blocked){ setErr(blocked); return; }

  _sendingMessage = true;
  const sendBtn = document.getElementById("sendReplyBtn");
  if (sendBtn){ sendBtn.disabled = true; sendBtn.textContent = "Sending…"; }
  try {
    // The thread template passes the profile id as text, so a missing id can
    // arrive as the string "undefined"; treat that as missing.
    let pid = (profileId && profileId !== "undefined" && profileId !== "null") ? profileId : null;
    if (!pid){
      const { data } = await _supabase
        .from("dating_profiles")
        .select("id")
        .eq("user_id", recipientId)
        .maybeSingle();
      pid = (data && data.id) || (currentOpenThread && currentOpenThread.messages[0]?.profile_id);
      if (currentOpenThread) currentOpenThread.profileId = pid;
    }
    if (!pid){ setErr("Couldn't send: recipient profile unavailable."); return; }

    const { error } = await _supabase.from("dating_messages").insert({
      profile_id: pid,
      sender_id: currentUser.id,
      recipient_id: recipientId,
      body
    });
    if (error){ setErr(friendlySendError(error)); return; }  // text stays in the box

    _recentSendTimes.push(Date.now());
    textarea.value = "";
    await refreshCurrentThreadAfterSend(pid, recipientId);
  } finally {
    _sendingMessage = false;
    const btn = document.getElementById("sendReplyBtn"); // thread re-renders, so look it up again
    if (btn){ btn.disabled = false; btn.textContent = "Send"; }
  }
}

async function refreshCurrentThreadAfterSend(profileId, other){
  const { data } = await _supabase
    .from("dating_messages")
    .select("*")
    .eq("profile_id", profileId)
    .or(`and(sender_id.eq.${currentUser.id},recipient_id.eq.${other}),and(sender_id.eq.${other},recipient_id.eq.${currentUser.id})`)
    .order("created_at", { ascending: false });
  if (currentOpenThread){
    currentOpenThread.messages = data || [];
    openThread(currentOpenThread);
  }
  refreshUnreadBadge();
}

// ---------- Voice calls ----------
const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

let personalCallChannel = null;
let activeCallChannel = null;
let peerConnection = null;
let localCallStream = null;
let currentCallId = null;
let currentCallPeerId = null;
let currentCallRow = null;
let callTimer = null;
let callStartedAt = null;

function setupPersonalCallChannel(){
  if (personalCallChannel) return;
  personalCallChannel = _supabase.channel(`call:${currentUser.id}`);
  personalCallChannel.on("broadcast", { event: "ring" }, (msg) => {
    showIncomingCallUI(msg.payload);
  });
  personalCallChannel.subscribe();
}

async function startCall(recipientId, recipientName){
  recipientName = recipientName ?? (window._threadNames && window._threadNames[recipientId]) ?? "Conversation";
  if (peerConnection){ alert("You're already in a call."); return; }
  if (!(await requireProfile("make calls"))) return;
  if (!isPlatinumActive(myProfile)){
    alert("Voice calls are a Platinum feature. Upgrade to Platinum to start calling your matches.");
    return;
  }
  currentCallId = (crypto.randomUUID ? crypto.randomUUID() : `${currentUser.id}-${Date.now()}`);
  currentCallPeerId = recipientId;

  // Create (and verify) the call row BEFORE ringing the other person —
  // previously this rang first and inserted after, with no error check,
  // so a blocked/failed insert still left the recipient seeing an
  // incoming call for a call that was never actually logged.
  const { data: callRow, error: callErr } = await _supabase.from("dating_calls").insert({
    caller_id: currentUser.id, recipient_id: recipientId, status: "ringing"
  }).select().single();
  if (callErr){
    alert("Couldn't start the call: " + callErr.message);
    currentCallId = null;
    currentCallPeerId = null;
    return;
  }
  currentCallRow = callRow;

  const myName = (myProfile && myProfile.display_name) || "Someone"; // dating profile name, never the sign-in/email name
  const notifyChan = _supabase.channel(`call:${recipientId}`);
  await new Promise(res => notifyChan.subscribe(status => { if (status === "SUBSCRIBED") res(); }));
  notifyChan.send({ type: "broadcast", event: "ring",
    payload: { callId: currentCallId, callerId: currentUser.id, callerName: myName } });
  _supabase.removeChannel(notifyChan);

  showOutgoingCallUI(recipientName);
  await joinCallSignaling(currentCallId, true);
}

// A "ring" arrives over a broadcast channel, which anyone who knows your
// user id can publish to — the database call rules (matched, Platinum,
// not blocked, privacy setting, all enforced by v24/v28's dating_can_call)
// only guard the dating_calls row, not the ring broadcast itself. So before
// showing anything we confirm the caller really created a call row aimed
// at us in the last couple of minutes — that row can only exist if the
// database's own rules already approved the call.
async function isLegitimateIncomingCall(callerId){
  if (!callerId || callerId === currentUser.id) return false;
  const since = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { data } = await _supabase
    .from("dating_calls")
    .select("id")
    .eq("caller_id", callerId)
    .eq("recipient_id", currentUser.id)
    .eq("status", "ringing")
    .gt("started_at", since)
    .limit(1)
    .maybeSingle();
  return !!data;
}

async function showIncomingCallUI(payload){
  if (peerConnection){ return; }
  if (!payload || !(await isLegitimateIncomingCall(payload.callerId))) return; // forged/unapproved ring: ignore silently
  currentCallId = payload.callId;
  currentCallPeerId = payload.callerId;
  document.getElementById("callRoot").innerHTML = `
    <div class="call-overlay">
      <div class="call-card">
        <div class="call-avatar">📞</div>
        <div class="call-name">${esc(payload.callerName || "Someone")}</div>
        <div class="call-status">Incoming call...</div>
        <div class="call-actions">
          <button class="call-accept" onclick="acceptCall()">Answer</button>
          <button class="call-decline" onclick="declineCall()">Decline</button>
        </div>
      </div>
    </div>`;
}

function showOutgoingCallUI(name){
  document.getElementById("callRoot").innerHTML = `
    <div class="call-overlay">
      <div class="call-card">
        <div class="call-avatar">📞</div>
        <div class="call-name">${esc(name)}</div>
        <div class="call-status" id="callStatusText">Ringing...</div>
        <div class="call-actions">
          <button class="call-decline" onclick="endCall(true)">Cancel</button>
        </div>
      </div>
    </div>`;
}

function showActiveCallUI(name){
  document.getElementById("callRoot").innerHTML = `
    <div class="call-overlay">
      <div class="call-card">
        <div class="call-avatar" style="background: rgba(46, 204, 113, 0.2);">📞</div>
        <div class="call-name">${esc(name || "In call")}</div>
        <div class="call-status" id="callStatusText" style="color: #2ecc71; font-weight:bold;">00:00</div>
        <div class="call-actions">
          <button class="call-mute" id="muteBtn" onclick="toggleMute()">🎙️ Mute</button>
          <button class="call-decline" onclick="endCall(true)">Hang up</button>
        </div>
      </div>
    </div>`;
  callStartedAt = Date.now();
  callTimer = setInterval(() => {
    const secs = Math.floor((Date.now() - callStartedAt) / 1000);
    const mm = String(Math.floor(secs / 60)).padStart(2, "0");
    const ss = String(secs % 60).padStart(2, "0");
    const el = document.getElementById("callStatusText");
    if (el) el.textContent = `${mm}:${ss}`;
  }, 1000);
}

async function acceptCall(){
  // Must match the still-ringing call, not just the most recent row between
  // these two people — otherwise a stale/ended call from earlier could be
  // picked up instead of the one actually being answered.
  const { data: callRow } = await _supabase
    .from("dating_calls")
    .select("*")
    .eq("caller_id", currentCallPeerId)
    .eq("recipient_id", currentUser.id)
    .eq("status", "ringing")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  currentCallRow = callRow;
  if (!currentCallRow){
    document.getElementById("callRoot").innerHTML = "";
    currentCallId = null; currentCallPeerId = null;
    alert("This call is no longer available.");
    return;
  }
  await _supabase.from("dating_calls").update({ status: "accepted" }).eq("id", currentCallRow.id);
  showActiveCallUI("In call");
  await joinCallSignaling(currentCallId, false);
}

async function declineCall(){
  const chan = _supabase.channel(`callsig:${currentCallId}`);
  await new Promise(res => chan.subscribe(status => { if (status === "SUBSCRIBED") res(); }));
  chan.send({ type: "broadcast", event: "signal", payload: { type: "hangup", from: currentUser.id } });
  _supabase.removeChannel(chan);

  const { data: callRow } = await _supabase
    .from("dating_calls")
    .select("*")
    .eq("caller_id", currentCallPeerId)
    .eq("recipient_id", currentUser.id)
    .eq("status", "ringing")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (callRow) await _supabase.from("dating_calls").update({ status: "declined", ended_at: new Date().toISOString() }).eq("id", callRow.id);

  document.getElementById("callRoot").innerHTML = "";
  currentCallId = null; currentCallPeerId = null;
}

async function joinCallSignaling(callId, isInitiator){
  activeCallChannel = _supabase.channel(`callsig:${callId}`);
  activeCallChannel.on("broadcast", { event: "signal" }, async (msg) => {
    const data = msg.payload;
    if (data.from === currentUser.id) return;
    if (data.type === "answer" && isInitiator){
      document.getElementById("callStatusText") && showActiveCallUI(document.querySelector(".call-name")?.textContent);
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
    } else if (data.type === "offer" && !isInitiator){
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      sendSignal({ type: "answer", sdp: answer });
    } else if (data.type === "ice"){
      try { await peerConnection.addIceCandidate(data.candidate); } catch (e){}
    } else if (data.type === "hangup"){
      endCall(false);
    }
  });
  await new Promise(res => activeCallChannel.subscribe(status => { if (status === "SUBSCRIBED") res(); }));

  try {
    localCallStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err){
    alert("Couldn't access microphone: " + err.message);
    endCall(true);
    return;
  }

  peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  localCallStream.getTracks().forEach(t => peerConnection.addTrack(t, localCallStream));
  peerConnection.ontrack = (e) => {
    document.getElementById("remoteAudio").srcObject = e.streams[0];
  };
  peerConnection.onicecandidate = (e) => {
    if (e.candidate) sendSignal({ type: "ice", candidate: e.candidate });
  };
  peerConnection.onconnectionstatechange = () => {
    if (peerConnection && ["disconnected","failed","closed"].includes(peerConnection.connectionState)){
      endCall(false);
    }
  };

  if (isInitiator){
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    sendSignal({ type: "offer", sdp: offer });
  }
}

function sendSignal(data){
  if (!activeCallChannel) return;
  activeCallChannel.send({ type: "broadcast", event: "signal", payload: { ...data, from: currentUser.id } });
}

function toggleMute(){
  if (!localCallStream) return;
  const track = localCallStream.getAudioTracks()[0];
  track.enabled = !track.enabled;
  const btn = document.getElementById("muteBtn");
  if (btn) btn.textContent = track.enabled ? "🎙️ Mute" : "🔇 Unmuted";
}

async function endCall(notifyPeer){
  if (notifyPeer) sendSignal({ type: "hangup" });
  if (callTimer){ clearInterval(callTimer); callTimer = null; }
  if (peerConnection){ peerConnection.close(); peerConnection = null; }
  if (localCallStream){ localCallStream.getTracks().forEach(t => t.stop()); localCallStream = null; }
  if (activeCallChannel){ _supabase.removeChannel(activeCallChannel); activeCallChannel = null; }
  document.getElementById("remoteAudio").srcObject = null;
  document.getElementById("callRoot").innerHTML = "";

  if (currentCallRow){
    await _supabase.from("dating_calls").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", currentCallRow.id);
  }
  currentCallId = null; currentCallPeerId = null; currentCallRow = null; callStartedAt = null;
}

// ---------- Voice messages ----------
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

async function toggleVoiceRecording(profileId, recipientId){
  const btn = document.getElementById("micBtn");
  const status = document.getElementById("recordStatus");

  if (!isRecording){
    if (!(await requireProfile("send messages"))) return;
    if (!myProfile || (!myProfile.is_verified && !isPlatinumActive(myProfile))){
      if (status) status.textContent = "Voice messages require a verified profile. Verify your profile to unlock this.";
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunks, { type: "audio/webm" });
        await sendVoiceMessage(profileId, recipientId, blob);
      };
      mediaRecorder.start();
      isRecording = true;
      btn.textContent = "⏹️ Stop";
      btn.style.background = "var(--danger)";
      btn.style.color = "#fff";
      status.textContent = "Recording... tap Stop to send.";
    } catch (err){
      status.textContent = "Couldn't access microphone: " + err.message;
    }
  } else {
    mediaRecorder.stop();
    isRecording = false;
    btn.textContent = "🎤";
    btn.style.background = "";
    btn.style.color = "";
    status.textContent = "Sending voice message...";
  }
}

async function sendVoiceMessage(profileId, recipientId, blob){
  const status = document.getElementById("recordStatus");
  // Path starts with the sender's id (no sub-folder) to match the
  // "name LIKE auth.uid()||'-%'" write policy on this private bucket.
  const path = `${currentUser.id}-${Date.now()}.webm`;
  const { error: uploadErr } = await _supabase.storage.from(BUCKET_VOICE_MESSAGES).upload(path, blob);
  if (uploadErr){
    if (status) status.textContent = "Voice upload failed: " + uploadErr.message;
    return;
  }
  const { error } = await _supabase.from("dating_messages").insert({
    profile_id: profileId,
    sender_id: currentUser.id,
    recipient_id: recipientId,
    voice_url: path // stored as a path; resolved to a signed URL when the thread renders it
  });
  if (error){
    if (status) status.textContent = "Couldn't send: " + error.message;
    return;
  }
  if (status) status.textContent = "";
  await refreshCurrentThreadAfterSend(profileId, recipientId);
}

// ---------- Messages tab ----------
// Short, readable time for the conversation list: time today, "Yesterday", weekday this week, else date.
function threadTimeLabel(iso){
  const d = new Date(iso), now = new Date();
  if (isNaN(d)) return "";
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const days = Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
  if (days === 1) return "Yesterday";
  if (days < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: d.getFullYear() === now.getFullYear() ? undefined : "2-digit" });
}
async function loadThreads(){
  const { data, error } = await _supabase
    .from("dating_messages")
    .select("*")
    .or(`sender_id.eq.${currentUser.id},recipient_id.eq.${currentUser.id}`)
    .order("created_at", { ascending: false });

  const list = document.getElementById("threadList");
  const empty = document.getElementById("messagesEmpty");
  list.innerHTML = "";

  if (error || !data || data.length === 0){
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

 const threads = {};
  data.forEach(m => {
    const other = m.sender_id === currentUser.id ? m.recipient_id : m.sender_id;
    const key = other;
    if (!threads[key]) threads[key] = { other, profileId: null, messages: [] };
    threads[key].messages.push(m);
  });

  const otherIds = [...new Set(Object.values(threads).map(t => t.other))];

  // Filter out anyone in a block relationship with the current user (either
  // direction). Blocking doesn't delete the match/message history, so without
  // this a blocked conversation would still appear with a broken call button.
  const blockedIds = await fetchBlockedIds();
  const visibleOtherIds = otherIds.filter(id => !blockedIds.has(id));

  const { data: profiles } = await _supabase
    .from("dating_profiles")
        .select("id, user_id, display_name, gender, photo_url, photos, is_verified, is_platinum, platinum_until, call_privacy")
    .in("user_id", visibleOtherIds.length ? visibleOtherIds : ["00000000-0000-0000-0000-000000000000"]);
  const profileMap = {};
  (profiles || []).forEach(p => profileMap[p.user_id] = p);

  Object.values(threads)
    .filter(thread => !blockedIds.has(thread.other))
    .forEach(thread => {
    const last = thread.messages[0];
    const unreadCount = thread.messages.filter(m => !m.read && m.recipient_id === currentUser.id).length;
      const p = profileMap[thread.other];
    thread.profile = p;
    const photo = p ? ((p.photos && p.photos[0]) || p.photo_url) : null;
    const photoIsUrl = photo && /^https?:\/\//i.test(photo);
    const name = p ? (p.display_name || p.gender || "Someone") : "Someone";
  thread.profileId = (p && p.id) || thread.messages[0].profile_id;
      
    const div = document.createElement("div");
    div.className = "thread-row" + (unreadCount ? " unread" : "");
    div.setAttribute("role", "button");
    div.tabIndex = 0;
    div.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openThread(thread); } };
    const preview = last.deleted_at ? "🚫 Message deleted" : (last.voice_url ? "🎤 Voice message" : esc((last.body||"").slice(0,80)));
    const youPrefix = last.sender_id === currentUser.id && !last.deleted_at ? "You: " : "";
    div.innerHTML = `
      <div class="thread-avatar" onclick="event.stopPropagation(); viewProfileFromThread('${thread.other}')" title="View profile" ${photo && !photoIsUrl ? `data-profile-media-bg="${esc(photo)}"` : ""} style="${photoIsUrl ? `background-image:url('${esc(photo)}')` : ""}">${photo ? "" : "👤"}</div>
      <div class="thread-main">
        <div class="thread-top">
          <span class="thread-name">${esc(name)}${verifiedBadge(p && p.is_verified)}${platinumBadge(isPlatinumActive(p))}</span>
          <span class="thread-time">${esc(threadTimeLabel(last.created_at))}</span>
        </div>
        <div class="thread-bottom">
          <span class="thread-preview">${youPrefix}${preview}</span>
          ${unreadCount ? `<span class="thread-unread">${unreadCount > 9 ? "9+" : unreadCount}</span>` : ""}
        </div>
      </div>`;
    div.onclick = () => openThread(thread);
    list.appendChild(div);
  });
}

async function openThread(thread){
  currentOpenThread = thread;
  thread.messages
    .filter(m => m.recipient_id === currentUser.id && !m.read)
    .forEach(m => _supabase.from("dating_messages").update({ read: true }).eq("id", m.id).then(()=>{}));

  const ordered = [...thread.messages].reverse();
  const msgIds = ordered.map(m => m.id);
  const { data: reactions } = await _supabase
    .from("dating_message_reactions")
    .select("*")
    .in("message_id", msgIds.length ? msgIds : ["00000000-0000-0000-0000-000000000000"]);
  const reactionsByMsg = {};
  (reactions || []).forEach(r => {
    if (!reactionsByMsg[r.message_id]) reactionsByMsg[r.message_id] = [];
    reactionsByMsg[r.message_id].push(r);
  });

  // Voice clips live in the private dating-voice-messages bucket —
  // resolve each to a signed URL up front, same approach as post images.
  const voiceUrls = {};
  await Promise.all(ordered.filter(m => m.voice_url).map(async m => {
    voiceUrls[m.id] = await resolvePrivateUrl(BUCKET_VOICE_MESSAGES, m.voice_url);
  }));

  const otherNameRaw = thread.profile ? String(thread.profile.display_name || thread.profile.gender || "Conversation") : "Conversation";
  // Names are looked up by id from this map. They are never placed inside an
  // inline onclick="" attribute (HTML-decoding turns &#39; back into ' and
  // lets a crafted name break out of the JS string).
  window._threadNames = window._threadNames || {};
  window._threadNames[thread.other] = otherNameRaw;
  const otherName = esc(otherNameRaw);
  const otherBadge = thread.profile ? verifiedBadge(thread.profile.is_verified) + platinumBadge(isPlatinumActive(thread.profile)) : "";
  const headerPhoto = thread.profile ? ((thread.profile.photos && thread.profile.photos[0]) || thread.profile.photo_url) : null;
  const headerPhotoIsUrl = headerPhoto && /^https?:\/\//i.test(headerPhoto);
  const callAllowed = thread.profile ? canCall(thread.profile) : true;
  const notPlatinum = !isPlatinumActive(myProfile);
  const callTooltip = notPlatinum
    ? "Voice calls are a Platinum feature — upgrade to start calling"
    : (thread.profile && thread.profile.call_privacy === "verified" ? "This person only accepts calls from verified profiles" : "This person isn't accepting calls right now");
  const callBtnHtml = callAllowed
    ? `<button class="call-btn" onclick="startCall('${thread.other}')" title="Voice call" style="width:34px; height:34px; font-size:0.9rem;">📞</button>`
    : `<button class="call-btn" disabled title="${callTooltip}" style="width:34px; height:34px; font-size:0.9rem;opacity:.4;cursor:not-allowed;">📞</button>`;

  // Read receipts ("Seen") are a Platinum perk — only show if the LAST
  // message in the thread is mine and has actually been read.
  const lastMsg = ordered[ordered.length - 1];
  const showSeen = lastMsg && lastMsg.sender_id === currentUser.id && lastMsg.read && !lastMsg.deleted_at
    && isPlatinumActive(myProfile);
  const seenHtml = showSeen ? `<div class="cmsg-seen">Seen ✓</div>` : "";

  // Every new message / reaction re-renders this whole modal. Remember the
  // half-typed reply, focus and scroll position so the re-render doesn't wipe them.
  const oldReply = document.getElementById("replyBody");
  const oldBox = document.getElementById("threadMessages");
  const sameThread = !!oldReply && window._lastRenderedThread === thread.other;
  const draft = sameThread ? oldReply.value : "";
  const hadFocus = sameThread && document.activeElement === oldReply;
  const wasNearBottom = !oldBox || (oldBox.scrollHeight - oldBox.scrollTop - oldBox.clientHeight < 80);
  const oldScrollTop = oldBox ? oldBox.scrollTop : 0;

  const root = document.getElementById("modalRoot");
  root.innerHTML = `
    <div class="modal-backdrop chat-backdrop" onclick="if(event.target===this) closeModal()">
      <div class="modal chat-modal" role="dialog" aria-label="Conversation with ${otherName}">
        <header class="chat-head">
          <span class="chat-who" onclick="viewProfileFromThread('${thread.other}', true)" title="View profile">
            <span class="chat-avatar" ${headerPhoto && !headerPhotoIsUrl ? `data-profile-media-bg="${esc(headerPhoto)}"` : ""} style="${headerPhotoIsUrl ? `background-image:url('${esc(headerPhoto)}')` : ""}">${headerPhoto ? "" : "👤"}</span>
            <span class="chat-name">${otherName}${otherBadge}</span>
          </span>
          <span class="chat-tools">
            ${callBtnHtml}
            <button class="chat-icon-btn chat-more" onclick="toggleChatMenu(event)" aria-label="More options" aria-haspopup="true" type="button">⋯</button>
            <button class="chat-close" onclick="closeModal()" aria-label="Close conversation" title="Close" type="button">✕</button>
          </span>
          <div class="chat-menu" id="chatMenu" hidden>
            <button type="button" onclick="toggleChatMenu();viewProfileFromThread('${thread.other}', true)">👤 View profile</button>
            <button type="button" class="danger" onclick="toggleChatMenu();unmatchUser('${thread.other}')">🚫 Unmatch</button>
          </div>
        </header>
        <div id="threadMessages" class="chat-scroll" aria-live="polite">
          ${renderBubblesWithDays(ordered, reactionsByMsg, voiceUrls)}
          ${seenHtml}
        </div>
        <footer class="chat-composer">
          <div id="replyError" role="alert" class="chat-error"></div>
          <div id="recordStatus" class="chat-record"></div>
          <div class="chat-input-row">
            <button class="chat-mic" id="micBtn" onclick="toggleVoiceRecording('${thread.profileId}','${thread.other}')" title="Record voice message" aria-label="Record voice message" type="button">🎤</button>
            <textarea id="replyBody" rows="1" maxlength="1000" placeholder="Type a message…" aria-label="Message"></textarea>
            <button class="chat-send" id="sendReplyBtn" onclick="sendReply('${thread.profileId}','${thread.other}');" aria-label="Send message" type="button">Send</button>
          </div>
        </footer>
      </div>
    </div>`;
    document.body.classList.add("chat-open");

    window._lastRenderedThread = thread.other;
    const chatBox = document.getElementById("threadMessages");
    if (chatBox) chatBox.addEventListener("click", (e) => {
      // Touch screens: tap a message to show / hide its action buttons.
      if (e.target.closest(".react-add, audio, textarea, button, .reaction-pill")) return;
      const msg = e.target.closest(".cmsg");
      chatBox.querySelectorAll(".cmsg.show-actions").forEach(x => { if (x !== msg) x.classList.remove("show-actions"); });
      if (msg) msg.classList.toggle("show-actions");
    });
    if (chatBox) chatBox.scrollTop = (!sameThread || wasNearBottom) ? chatBox.scrollHeight : oldScrollTop;

    const replyBox = document.getElementById("replyBody");
    if (replyBox){
      const grow = () => { replyBox.style.height = "auto"; replyBox.style.height = Math.min(replyBox.scrollHeight, 140) + "px"; };
      replyBox.addEventListener("input", grow);
      if (draft) { replyBox.value = draft; grow(); }
      if (hadFocus) { replyBox.focus(); replyBox.setSelectionRange(replyBox.value.length, replyBox.value.length); }
      // Enter sends, Shift+Enter adds a new line. Not on phones, where Enter should stay a new line.
      if (!window.matchMedia("(pointer: coarse)").matches){
        replyBox.addEventListener("keydown", (e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.isComposing){
            e.preventDefault();
            sendReply(thread.profileId, thread.other);
          }
        });
      }
    }
}

// "⋯" menu in the chat header (View profile / Unmatch). Click anywhere else to close it.
function toggleChatMenu(e){
  if (e) e.stopPropagation();
  const m = document.getElementById("chatMenu");
  if (m) m.hidden = !m.hidden;
}
document.addEventListener("click", (e) => {
  const m = document.getElementById("chatMenu");
  if (m && !m.hidden && !e.target.closest(".chat-menu, .chat-more")) m.hidden = true;
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  const m = document.getElementById("chatMenu");
  if (m && !m.hidden) { m.hidden = true; return; }
  if (document.querySelector(".chat-modal") && typeof closeModal === "function") closeModal();
});

const EDIT_WINDOW_MS = 15 * 60 * 1000; 

function msgDayLabel(d){
  const now = new Date();
  const yest = new Date(); yest.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return "Today";
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}

function renderBubblesWithDays(ordered, reactionsByMsg, voiceUrls){
  let lastDay = "";
  return ordered.map((m, i) => {
    const d = new Date(m.created_at);
    const day = d.toDateString();
    let divider = "";
    if (day !== lastDay){
      lastDay = day;
      divider = `<div class="chat-day"><span>${esc(msgDayLabel(d))}</span></div>`;
    }
    // Group runs of messages from the same person within 5 minutes: tight spacing, time only on the last one.
    const prev = ordered[i - 1], next = ordered[i + 1];
    const near = (a, b) => a && b && a.sender_id === b.sender_id && new Date(a.created_at).toDateString() === new Date(b.created_at).toDateString()
      && Math.abs(new Date(b.created_at) - new Date(a.created_at)) < 5 * 60 * 1000;
    const joinedPrev = near(prev, m) && !divider;
    const joinedNext = near(m, next);
    return divider + renderMessageBubble(m, reactionsByMsg[m.id] || [], voiceUrls[m.id], joinedPrev, joinedNext);
  }).join("");
}

function renderMessageBubble(m, msgReactions, resolvedVoiceUrl, joinedPrev, joinedNext){
  const mine = m.sender_id === currentUser.id;
  const reactionCounts = {};
  // Only the known reaction emojis are rendered: the value is placed inside an
  // onclick attribute, so anything else stored in the database is ignored.
  msgReactions.forEach(r => {
    if (!REACTION_EMOJIS.includes(r.emoji)) return;
    reactionCounts[r.emoji] = (reactionCounts[r.emoji]||0) + 1;
  });
  const myReaction = msgReactions.find(r => r.user_id === currentUser.id && REACTION_EMOJIS.includes(r.emoji));
  const reactionRow = Object.keys(reactionCounts).length
    ? `<div class="reaction-row">${Object.entries(reactionCounts).map(([e,c]) =>
        `<span class="reaction-pill${myReaction && myReaction.emoji===e ? " mine" : ""}" onclick="toggleReaction('${m.id}','${e}')">${e} ${c}</span>`).join("")}</div>`
    : "";
  const cls = "cmsg " + (mine ? "mine" : "theirs") + (joinedPrev ? " joined-prev" : "") + (joinedNext ? " joined-next" : "");

  if (m.deleted_at){
    return `
      <div class="${cls}">
        <div class="msg-bubble deleted">🚫 This message was deleted</div>
      </div>`;
  }

  const canEdit = mine && !m.voice_url && (Date.now() - new Date(m.created_at).getTime() < EDIT_WINDOW_MS);
  const content = m.voice_url
    ? (resolvedVoiceUrl
        ? `<audio controls src="${esc(resolvedVoiceUrl)}"></audio>`
        : `<span class="cmsg-unavailable">Voice message unavailable</span>`)
    : `<span id="msgBody-${m.id}">${esc(m.body || "")}</span>${m.edited_at ? ` <span class="cmsg-edited">(edited)</span>` : ""}`;

  const ownControls = mine ? `
    ${canEdit ? `<span class="react-add" style="right:26px;" title="Edit" onclick="startEditMessage('${m.id}')">✏️</span>` : ""}
    <span class="react-add" onclick="deleteMessage('${m.id}')" title="Delete" style="color:var(--danger);">🗑️</span>
  ` : `<span class="react-add" onclick="showReactionPicker(event,'${m.id}')">＋</span>`;

  return `
    <div class="${cls}" data-message-id="${m.id}">
      <div class="msg-bubble">
        ${content}
        ${ownControls}
      </div>
      ${joinedNext ? "" : `<div class="cmsg-time">${esc(new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))}</div>`}
      ${reactionRow}
    </div>`;
}

function startEditMessage(messageId){
  const span = document.getElementById(`msgBody-${messageId}`);
  if (!span) return;
  const currentText = span.textContent;
  const wrapper = span.parentElement;
  wrapper.innerHTML = `
    <textarea id="editBody-${messageId}" class="cmsg-edit" maxlength="1000">${esc(currentText)}</textarea>
    <div class="cmsg-edit-actions">
      <button type="button" class="save" onclick="saveEditMessage('${messageId}')">Save</button>
      <button type="button" class="cancel" onclick="refreshOpenThreadMessages()">Cancel</button>
    </div>`;
}

async function saveEditMessage(messageId){
  const textarea = document.getElementById(`editBody-${messageId}`);
  const newBody = textarea.value.trim();
  if (!newBody) return;
  const editedAt = new Date().toISOString();
  const { error } = await _supabase
    .from("dating_messages")
    .update({ body: newBody, edited_at: editedAt })
    .eq("id", messageId);
  if (error){ alert("Couldn't save edit: " + error.message); return; }
  // openThread() only re-fetches reactions from the DB, not the messages
  // themselves — without updating the in-memory copy here, the open
  // thread would keep showing the pre-edit text until reopened.
  if (currentOpenThread){
    const msg = currentOpenThread.messages.find(x => x.id === messageId);
    if (msg){ msg.body = newBody; msg.edited_at = editedAt; }
  }
  refreshOpenThreadMessages();
  loadThreads();
}

async function deleteMessage(messageId){
  if (!confirm("Delete this message for everyone? This can't be undone.")) return;
  const deletedAt = new Date().toISOString();
  const { error } = await _supabase
    .from("dating_messages")
    .update({ deleted_at: deletedAt })
    .eq("id", messageId);
  if (error){ alert("Couldn't delete: " + error.message); return; }
  if (currentOpenThread){
    const msg = currentOpenThread.messages.find(x => x.id === messageId);
    if (msg) msg.deleted_at = deletedAt;
  }
  refreshOpenThreadMessages();
  loadThreads();
}

function showReactionPicker(event, messageId){
  event.stopPropagation();
  document.getElementById("reactionPicker")?.remove();
  const picker = document.createElement("div");
  picker.id = "reactionPicker";
  picker.className = "reaction-picker";
  picker.innerHTML = REACTION_EMOJIS.map(e => `<span onclick="toggleReaction('${messageId}','${e}')">${e}</span>`).join("");
  document.body.appendChild(picker);
  const rect = event.target.getBoundingClientRect();
  picker.style.top = (rect.bottom + window.scrollY + 4) + "px";
  picker.style.left = Math.max(8, rect.left + window.scrollX - 60) + "px";
  setTimeout(() => document.addEventListener("click", function closePicker(e){
    if (!picker.contains(e.target)){ picker.remove(); document.removeEventListener("click", closePicker); }
  }), 0);
}

async function toggleReaction(messageId, emoji){
  document.getElementById("reactionPicker")?.remove();
  const { data: existing } = await _supabase
    .from("dating_message_reactions")
    .select("*")
    .eq("message_id", messageId)
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (existing && existing.emoji === emoji){
    await _supabase.from("dating_message_reactions").delete().eq("id", existing.id);
  } else if (existing){
    await _supabase.from("dating_message_reactions").update({ emoji }).eq("id", existing.id);
  } else {
    await _supabase.from("dating_message_reactions").insert({ message_id: messageId, user_id: currentUser.id, emoji });
  }
  refreshOpenThreadMessages();
}

async function refreshOpenThreadMessages(){
  if (currentOpenThread) openThread(currentOpenThread);
}

// ---------- My Profile tab ----------
function computeProfileCompleteness(data){
  const checklist = [
    { label: "Your gender", done: !!data.gender, focus: "eGender" },
    { label: "Who you're interested in", done: !!data.seeking, focus: "eSeeking" },
    { label: "About you", done: !!(data.bio && data.bio.trim()), focus: "eBio" },
    { label: "What you're looking for", done: !!data.looking_for, focus: "eLookingFor" },
    { label: "Age range you're interested in", done: !!(data.age_min && data.age_max), focus: "eAgeMin" },
    { label: "Your lifestyle", done: !!data.lifestyle, focus: "eLifestyle" },
    { label: "Whether you have kids", done: !!data.has_kids, focus: "eHasKids" },
    { label: "Whether you want kids", done: !!data.wants_kids, focus: "eWantsKids" },
    { label: "Religion", done: !!data.religion, focus: "eReligion" }
  ];
  const done = checklist.filter(c => c.done).length;
  return { percent: Math.round((done / checklist.length) * 100), missing: checklist.filter(c => !c.done) };
}

function profileCompletenessBanner(data){
  const { percent, missing } = computeProfileCompleteness(data);
  if (percent >= 100) return "";

  return `
    <div style="background:#FFF9EE;border:1px solid #fce3b4;border-radius:12px;padding:16px;margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <strong style="font-size:1rem;color:#8a6d1f;">Your profile is ${percent}% complete</strong>
        <span style="font-size:.8rem;color:#b89028; font-weight:bold;">${missing.length} thing${missing.length === 1 ? "" : "s"} left</span>
      </div>
      <div style="background:#fce3b4;border-radius:999px;height:8px;overflow:hidden;margin-bottom:12px;">
        <div style="background:var(--gold);height:100%;width:${percent}%;"></div>
      </div>
      <div style="font-size:.85rem;color:#8a6d1f;margin-bottom:10px;">Complete profiles get 3x more matches! Add:</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        ${missing.map(m => `<button type="button" onclick="focusProfileField('${m.focus}')" style="font-size:.8rem;padding:6px 12px;border:1px solid var(--gold);background:#fff;color:#8a6d1f;border-radius:999px;cursor:pointer; font-weight:600;">+ ${esc(m.label)}</button>`).join("")}
      </div>
    </div>`;
}

async function refreshProfileCompleteBadge(){
  const badge = document.getElementById("profileCompleteBadge");
  if (!badge || !currentUser) return;
  const { data } = await _supabase
    .from("dating_profiles")
    .select("gender, seeking, bio, looking_for, age_min, age_max, lifestyle, has_kids, wants_kids, religion")
    .eq("user_id", currentUser.id)
    .maybeSingle();
  if (!data){ badge.textContent = ""; return; }
  const { percent } = computeProfileCompleteness(data);
  badge.textContent = percent < 100 ? "●" : "";
  badge.style.color = "var(--danger)";
}

function focusProfileField(id){
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.focus();
  el.style.outline = "3px solid var(--gold)";
  setTimeout(() => { el.style.outline = ""; }, 1500);
}

// ---------- Verification ----------
function verifiedBadge(isVerified){
  return isVerified ? ` <span title="Verified profile" style="color:#1E8E4F;font-weight:700;">✓</span>` : "";
}

// A Platinum plan can have an end date (platinum_until, v28). The database
// already stops honouring an expired plan on its own; this makes the UI agree,
// so a lapsed member doesn't keep the badge, the call button or the
// "Platinum tier" label. No end date (older grants) means it doesn't expire.
function isPlatinumActive(p){
  if (!p || !p.is_platinum) return false;
  return !p.platinum_until || new Date(p.platinum_until) > new Date();
}

function platinumBadge(isActive){
  return isActive ? ` <span title="Platinum member" style="color:#B8860B;font-weight:700;">💎</span>` : "";
}

function renderTierBox(profile){
  const plat = isPlatinumActive(profile);
  const tier = plat ? "Platinum" : (profile.is_verified ? "Verified" : "Basic");
  const planNote = (plat && profile.platinum_until)
    ? ` <span style="font-weight:400;color:#666;">· ${profile.platinum_plan ? esc(profile.platinum_plan) + ", " : ""}until ${new Date(profile.platinum_until).toLocaleDateString()}</span>`
    : "";
  const expiredNote = (profile.is_platinum && !plat)
    ? `<div style="font-size:.8rem;color:#B3261E;margin-top:4px;">Your Platinum plan ended on ${new Date(profile.platinum_until).toLocaleDateString()}. Renew to get unlimited messaging and calls back.</div>` : "";
  const limits = plat
    ? "Unlimited messaging, voice messages, and calls — plus read receipts."
    : (profile.is_verified
        ? "4 text messages per day, 4 voice messages per week. Go Platinum for unlimited messaging and calls."
        : "4 text messages total, no voice messages, no calls. Verify your profile for daily messaging + voice, or go Platinum for unlimited.");
  const color = plat ? "#B8860B" : (profile.is_verified ? "#1E8E4F" : "#666");
  return `<div style="background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin-bottom:14px; box-shadow: 0 4px 10px rgba(0,0,0,0.03);">
    <div style="font-weight:700;color:${color};">${plat ? "💎 " : ""}${tier} tier${planNote}</div>
    <div style="font-size:.85rem;color:#666;margin-top:4px;">${limits}</div>
    ${expiredNote}
  </div>`;
}

function renderVerificationBox(profile, latestRequest){
  if (profile.is_verified){
    return `<div class="msg success" style="margin-bottom:20px; font-size:1rem;">✅ Your profile is officially verified!</div>`;
  }
  if (latestRequest && latestRequest.status === "pending"){
    return `<div class="msg" style="background:#FFF9EE;color:#8A6D1F;margin-bottom:20px; border: 1px solid #fce3b4;">⏳ Your verification photo is under review. Please check back later.</div>`;
  }
  const rejectedNote = (latestRequest && latestRequest.status === "rejected" && latestRequest.reviewer_note)
    ? `<div style="margin-top:6px; font-weight:normal;">Reviewer note: ${esc(latestRequest.reviewer_note)}</div>` : "";
  const rejectedHeader = (latestRequest && latestRequest.status === "rejected")
    ? `<div class="msg error" style="margin-bottom:20px;">Your last verification photo wasn't approved.${rejectedNote}
        <div style="margin-top:10px;"><button type="button" class="submit-btn" style="width:auto;padding:8px 20px; border-radius:8px;" onclick="openVerificationModal()">Try Again</button></div>
       </div>`
    : `<div style="background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;gap:15px;flex-wrap:wrap; box-shadow: 0 4px 10px rgba(0,0,0,0.03);">
        <div style="font-size:.95rem;color:#333; flex:1; min-width:200px;"><b>Get a Verified Badge ✅</b><br><span style="font-size:0.85rem; color:#666;">Confirm a quick selfie matches your profile photos to stand out.</span></div>
        <button type="button" class="submit-btn" style="width:auto;padding:10px 24px;flex-shrink:0; border-radius:8px;" onclick="openVerificationModal()">Get Verified</button>
       </div>`;
  return rejectedHeader;
}

// ---------- Platinum upgrade (manual payment + transaction number review) ----------
// Where members send Platinum payments. Only methods with a complete, real number are shown:
// a number that still contains "*" or "FILL IN" is hidden, so members are never sent to an
// unusable account. Edit this list to add, change or remove a method.
const PLATINUM_PAYMENT_METHODS = [
  { icon: "🏦", method: "Commercial Bank of Ethiopia (CBE)", accountName: "Abebe", number: "1000******1212" /* put the FULL account number here */ },
  { icon: "📱", method: "Telebirr", accountName: "Kebede", number: "09******90" },
  { icon: "📱", method: "M-Pesa", accountName: "Aster", number: "070*******70" }
];
function platinumPaymentMethodsReady(){
  // A number is shown only if it is a complete phone / account number (digits, optional leading +, spaces or dashes).
  // Anything masked or unfinished (e.g. "1000******1212", "094++++7532") stays hidden.
  const looksComplete = (v) => /^\+?[0-9][0-9 \-]{6,}$/.test(String(v || "").trim());
  return PLATINUM_PAYMENT_METHODS.filter(m => m.accountName && looksComplete(m.number));
}

const PLATINUM_PLANS = {
  weekly:  { label: "Weekly",  price: 100, unit: "/ week" },
  monthly: { label: "Monthly", price: 500, unit: "/ month" }
};

function renderPlatinumBox(profile, latestPlatinumRequest){
  if (isPlatinumActive(profile)) return ""; // renderTierBox already shows active-plan details

  if (latestPlatinumRequest && latestPlatinumRequest.status === "pending"){
    const plan = PLATINUM_PLANS[latestPlatinumRequest.plan];
    return `<div class="msg" style="background:#FFF9EE;color:#8A6D1F;margin-bottom:20px;border:1px solid #fce3b4;">
      ⏳ Your ${plan ? esc(plan.label) : esc(latestPlatinumRequest.plan)} Platinum request${latestPlatinumRequest.transaction_number ? ` (ref: ${esc(latestPlatinumRequest.transaction_number)})` : ""} is under review.
    </div>`;
  }

  const rejectedNote = (latestPlatinumRequest && latestPlatinumRequest.status === "rejected")
    ? `<div class="msg error" style="margin-bottom:12px;">Your last Platinum request wasn't approved.${latestPlatinumRequest.reviewer_note ? ` ${esc(latestPlatinumRequest.reviewer_note)}` : ""} You can try again below.</div>`
    : "";

  return `
    ${rejectedNote}
    <div style="background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px;margin-bottom:20px; box-shadow: 0 4px 10px rgba(0,0,0,0.03);">
      <div style="font-weight:700;margin-bottom:10px;">💎 Go Platinum</div>
      <p style="font-size:.85rem;color:#666;margin:0 0 14px;">Unlimited messaging, voice messages, calls, read receipts, <b>and Platinum gifts</b>.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button type="button" onclick="choosePlatinumPlan('weekly')" style="flex:1;min-width:140px;background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:14px;text-align:center;cursor:pointer;">
          <div style="font-weight:700;">Weekly</div>
          <div style="font-size:1.1rem;font-weight:700;color:#B8860B;margin:4px 0;">100 Birr</div>
          <div style="font-size:.75rem;color:#999;">per week</div>
        </button>
        <button type="button" onclick="choosePlatinumPlan('monthly')" style="flex:1;min-width:140px;background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:14px;text-align:center;cursor:pointer;">
          <div style="font-weight:700;">Monthly</div>
          <div style="font-size:1.1rem;font-weight:700;color:#B8860B;margin:4px 0;">500 Birr</div>
          <div style="font-size:.75rem;color:#999;">per month</div>
        </button>
      </div>
    </div>`;
}

// The gift code calls esc2() and escapeAttr(), which app.js never defined.
// If no other script provides them, opening the gift picker threw a
// ReferenceError (silently, inside a click handler), so nothing happened.
// Window-property fallbacks: a later script that defines its own wins.
if (typeof window.esc2 !== "function") window.esc2 = (v) => esc(v == null ? "" : String(v));
if (typeof window.escapeAttr !== "function") window.escapeAttr = (v) => esc(v == null ? "" : String(v));

function giftErrorText(error){
  const t = String((error && (error.message || error.details)) || "");
  if ((error && (error.code === "PGRST202" || error.code === "42P01")) ||
      /could not find the function|does not exist|schema cache/i.test(t)){
    return "Gifts aren't set up on the server yet. Please try again later.";
  }
  return t || "Something went wrong.";
}

async function openGiftCenter(recipientId, recipientName){
  try { await _openGiftCenterInner(recipientId, recipientName); }
  catch (err){
    console.error("openGiftCenter failed:", err);
    alert("Couldn't open the gift picker: " + ((err && err.message) || err));
  }
}

async function _openGiftCenterInner(recipientId, recipientName){
  if(!isPlatinumActive(myProfile)){ alert("Gifts are a Platinum feature. Upgrade to Platinum first."); return; }
  const root=document.getElementById("modalRoot"); if(!root)return;
  const {data:gifts,error}=await _supabase.from("dating_gift_catalog").select("*").eq("active",true).order("sort_order",{ascending:true});
  if(error){console.error("Gift catalog error:",error);alert("Gift catalog is unavailable: "+giftErrorText(error));return;}
  const items=(gifts||[]).map(g=>`<button type="button" data-gift-id="${escapeAttr(g.id)}" style="text-align:left;border:1px solid var(--line);background:#fff;border-radius:12px;padding:12px;cursor:pointer"><div style="font-size:1.35rem">${esc2(g.emoji||"🎁")}</div><b>${esc2(g.name)}</b><div style="font-size:.76rem;color:#777;margin-top:3px">${esc2(g.description||"")} · ${esc2(g.price_birr)} Birr</div></button>`).join("");
  root.innerHTML=`<div class="modal-backdrop" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:520px"><div class="body"><button class="btn-close" onclick="closeModal()">✕</button><h3>🎁 Send a Platinum Gift to ${esc2(recipientName||"your match")}</h3><p class="bio">Gifts are visible to the recipient and are available only to active Platinum members.</p><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">${items||'<div class="date-plan-empty">No gifts are available right now.</div>'}</div><textarea id="giftMessage" maxlength="240" placeholder="Optional message" style="width:100%;min-height:70px;margin-top:12px;padding:10px;border:1px solid var(--line);border-radius:9px"></textarea><div id="giftMsg" style="margin-top:10px"></div></div></div></div>`;
  root.querySelectorAll("[data-gift-id]").forEach(btn=>btn.addEventListener("click",()=>sendPlatinumGift(btn.dataset.giftId,recipientId,recipientName)));
}

let _sendingGift = false;
async function sendPlatinumGift(giftId,recipientId,recipientName){
  if (_sendingGift) return;   // one gift at a time; a double-tap must not send twice
  _sendingGift = true;
  const btns = [...document.querySelectorAll("[data-gift-id]")];
  btns.forEach(b => b.disabled = true);
  try { await _sendPlatinumGiftInner(giftId,recipientId,recipientName); }
  catch (err){
    console.error("sendPlatinumGift failed:", err);
    const box = document.getElementById("giftMsg");
    if (box) box.innerHTML = `<div class="msg error">${esc(giftErrorText(err))}</div>`;
  } finally {
    _sendingGift = false;
    btns.forEach(b => { if (b.isConnected) b.disabled = false; });
  }
}

async function _sendPlatinumGiftInner(giftId,recipientId,recipientName){
  const msg=(document.getElementById("giftMessage")?.value||"").trim();
  if(!isPlatinumActive(myProfile)){alert("Active Platinum is required.");return;}
  const {error}=await _supabase.rpc("dating_send_platinum_gift",{p_recipient_id:recipientId,p_gift_id:giftId,p_message:msg||null});
  if(error){console.error("Gift RPC error:",error);const box=document.getElementById("giftMsg");if(box)box.innerHTML=`<div class="msg error">${esc(giftErrorText(error))}</div>`;return;}
  closeModal();
  alert(`Gift sent to ${recipientName||"your match"}.`);
}
window.openGiftCenter=openGiftCenter;
window.sendPlatinumGift=sendPlatinumGift;

function choosePlatinumPlan(planKey){
  const plan = PLATINUM_PLANS[planKey];
  const root = document.getElementById("modalRoot");
  // Safety: never show members placeholder bank details. Until the real
  // account is filled in above, tell them payment isn't open yet.
  const payMethods = platinumPaymentMethodsReady();
  const payConfigured = payMethods.length > 0;
  if (!payConfigured){
    root.innerHTML = `
      <div class="modal-backdrop" onclick="if(event.target===this) closeModal()">
        <div class="modal" style="max-width:420px;"><div class="body">
          <button class="btn-close" onclick="closeModal()">✕</button>
          <h3 style="margin-bottom:8px;">Platinum payment isn't open yet</h3>
          <p style="color:#666;font-size:.92rem;">We're finishing our payment details. Please contact Support and we'll help you upgrade.</p>
          <div class="actions"><button class="btn-contact" style="width:100%;" onclick="closeModal();if(window.WanaSupport)WanaSupport.openNew()">Contact Support</button></div>
        </div></div>
      </div>`;
    return;
  }
  root.innerHTML = `
    <div class="modal-backdrop" onclick="if(event.target===this) closeModal()">
      <div class="modal" style="max-width:420px;">
        <div class="body">
          <button class="btn-close" onclick="closeModal()">✕</button>
          <h3 style="margin-bottom:6px;">${esc(plan.label)} Platinum — ${plan.price} Birr</h3>
          <div class="bio" style="margin-bottom:14px;font-size:.9rem;background:#f8f9fa;padding:12px;border-radius:8px;border:1px solid #e2e8f0;">
            <div style="font-weight:700;margin-bottom:6px;">Send ${plan.price} Birr to:</div>
            ${payMethods.map(m => `
              <div style="padding:8px 0;border-top:1px solid #e2e8f0;">
                <div style="font-weight:700;">${m.icon} ${esc(m.method)}</div>
                <div>👤 Account name: <strong>${esc(m.accountName)}</strong></div>
                <div>🔢 Number: <strong style="letter-spacing:.3px;user-select:all;">${esc(m.number)}</strong></div>
              </div>`).join("")}
            <div style="margin-top:8px;padding:9px 10px;background:#fff4e5;border:1px solid #f5c37a;border-radius:8px;color:#8a4b00;font-size:.85rem;">
              ⚠️ <strong>Warning:</strong> pay only to the account${payMethods.length > 1 ? "s" : ""} shown here. Do not send money to any other number or account, even if someone claims to be from WanaGebya.
            </div>
            <div style="margin-top:8px;color:#666;">After sending, attach your receipt below, or enter the transaction reference number (either one is enough). We'll review and activate your plan — this isn't instant.</div>
          </div>
          <input type="text" id="platinumTxnNumber" placeholder="Transaction number / reference (optional if you attach a receipt)" maxlength="100" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-family:inherit;margin-bottom:14px;">
          <label style="display:block;font-size:.8rem;font-weight:600;color:#333;margin-bottom:6px;">Attach payment receipt or screenshot (or enter the transaction number above)</label>
          <input type="file" id="platinumReceiptFile" accept="image/*,.pdf" style="margin-bottom:14px;width:100%;padding:10px;border:2px dashed #ccc;border-radius:8px;cursor:pointer;">
          <div class="actions">
            <button class="btn-contact" style="width:100%;" onclick="submitPlatinumRequest('${planKey}', ${plan.price})">Submit for Review</button>
          </div>
          <div id="platinumReqMsg"></div>
        </div>
      </div>
    </div>`;
}

async function submitPlatinumRequest(planKey, amount){
  const txnInput = document.getElementById("platinumTxnNumber");
  const receiptInput = document.getElementById("platinumReceiptFile");
  const msg = document.getElementById("platinumReqMsg");
  const transactionNumber = txnInput.value.trim();
  const receiptFile = receiptInput && receiptInput.files[0];
  // Proof of payment is required, but either one is enough: a receipt/
  // screenshot OR a transaction number. The number is optional when a
  // receipt is attached.
  if (!receiptFile && transactionNumber.length < 3){
    msg.innerHTML = `<div class="msg error">Attach your payment receipt, or enter the transaction number.</div>`;
    return;
  }
  if (transactionNumber && transactionNumber.length < 3){
    msg.innerHTML = `<div class="msg error">The transaction number looks too short. Fix it, or leave it empty if you attached a receipt.</div>`;
    return;
  }
  let receiptPath = null;
  if (receiptFile){
    const receiptErr = checkUploadFile(receiptFile, { allowPdf: true });
    if (receiptErr){ msg.innerHTML = `<div class="msg error">${esc(receiptErr)}</div>`; return; }
    msg.innerHTML = `<div class="msg" style="color:var(--green);">Uploading receipt...</div>`;
    // Private bucket — path starts with the uploader's id to match the
    // write policy, and we store the PATH (not a public URL): only the
    // uploader and admins can ever read it, via a signed URL.
    receiptPath = makeUploadPath(receiptFile);
    const { error: uploadErr } = await _supabase.storage.from(BUCKET_PLATINUM_RECEIPTS).upload(receiptPath, receiptFile);
    if (uploadErr){
      msg.innerHTML = `<div class="msg error">Receipt upload failed: ${esc(uploadErr.message)}</div>`;
      return;
    }
  }

  msg.innerHTML = `<div class="msg" style="color:var(--green);">Submitting...</div>`;
  const { error } = await _supabase.from("dating_platinum_requests").insert({
    user_id: currentUser.id,
    plan: planKey,
    amount_birr: amount,
    transaction_number: transactionNumber || null,
    receipt_url: receiptPath
  });
  if (error){
    msg.innerHTML = `<div class="msg error">${esc(error.message)}</div>`;
    return;
  }
  closeModal();
  loadMyProfile();
}

function openVerificationModal(){
  const root = document.getElementById("modalRoot");
  root.innerHTML = `
    <div class="modal-backdrop" onclick="if(event.target===this) closeModal()">
      <div class="modal" style="max-width:400px;">
        <div class="body">
          <button class="btn-close" onclick="closeModal()">✕</button>
          <h3 style="margin-bottom: 10px;">Verify Your Profile ✅</h3>
          <div class="bio" style="margin-bottom:16px; font-size: 0.95rem; background: #f8f9fa; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
            Upload a clear selfie of your face. A moderator will compare it to your profile photos. <b>This photo stays private and is only used for review.</b>
          </div>
          <input type="file" id="verifySelfie" accept="image/*" capture="user" style="margin-bottom: 15px; width: 100%; padding: 10px; border: 2px dashed #ccc; border-radius: 8px; cursor: pointer;">
          <div class="actions">
            <button class="btn-contact" onclick="submitVerification()" style="width: 100%;">Submit for Review</button>
          </div>
          <div id="verifyMsg"></div>
        </div>
      </div>
    </div>`;
}

async function submitVerification(){
  const fileInput = document.getElementById("verifySelfie");
  const msg = document.getElementById("verifyMsg");
  const file = fileInput.files[0];
  if (!file){ msg.innerHTML = `<div class="msg error">Choose or take a selfie first.</div>`; return; }
  const selfieErr = checkUploadFile(file);
  if (selfieErr){ msg.innerHTML = `<div class="msg error">${esc(selfieErr)}</div>`; return; }

  msg.innerHTML = `<div class="msg" style="color:var(--green);">Uploading... please wait.</div>`;
  // Private bucket — path starts with the uploader's id to match the
  // write policy, and we store the PATH (not a public URL): only the
  // uploader and admins can ever read it, via a signed URL.
  const path = makeUploadPath(file);
  const { error: uploadErr } = await _supabase.storage.from(BUCKET_VERIFICATION).upload(path, file, { contentType: file.type });
  if (uploadErr){
    msg.innerHTML = `<div class="msg error">Upload failed: ${esc(uploadErr.message)}</div>`;
    return;
  }

  const { error } = await _supabase.from("dating_verification_requests").insert({
    user_id: currentUser.id,
    selfie_url: path
  });
  if (error){
    msg.innerHTML = `<div class="msg error">Couldn't submit: ${esc(error.message)}</div>`;
    return;
  }
  closeModal();
  loadMyProfile();
}

// ---------- Profile photos (up to 3) ----------
function renderPhotoEditor(data){
  const photos = data.photos && data.photos.length ? data.photos : (data.photo_url ? [data.photo_url] : []);
  const slots = [0, 1, 2].map(i => {
    const url = photos[i];
    return `
      <div class="photo-slot" style="position:relative;width:100px;height:100px;border-radius:10px;overflow:hidden;background:${url ? `url('${esc(url)}') center/cover` : "var(--paper)"};border:1px solid var(--line);display:flex;align-items:center;justify-content:center;">
        ${url ? "" : `<span style="font-size:1.6rem;color:#bbb;">+</span>`}
        <label style="position:absolute;inset:0;display:flex;align-items:end;justify-content:center;cursor:pointer;">
          <span style="width:100%;background:rgba(0,0,0,.55);color:#fff;font-size:.68rem;text-align:center;padding:3px 0;">${url ? "Change" : "Add"}</span>
          <input type="file" accept="image/*" style="display:none;" onchange="changeProfilePhoto(${i}, this)">
        </label>
        <div id="photoSlotStatus-${i}" style="position:absolute;top:2px;right:2px;font-size:.7rem;background:#fff;border-radius:50%;padding:1px 4px;display:none;">⏳</div>
      </div>`;
  }).join("");

  return `
    <div style="margin-bottom:18px;">
      <label style="font-size:.85rem;font-weight:600;color:#333;display:block;margin-bottom:8px;">Your photos (up to 3)</label>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">${slots}</div>
      <div id="photoEditorMsg" style="margin-top:8px;"></div>
    </div>`;
}

async function changeProfilePhoto(index, inputEl){
  const file = inputEl.files[0];
  if (!file) return;
  const statusEl = document.getElementById(`photoSlotStatus-${index}`);
  const msg = document.getElementById("photoEditorMsg");
  const photoErr = checkUploadFile(file);
  if (photoErr){ msg.innerHTML = `<div class="msg error">${esc(photoErr)}</div>`; inputEl.value = ""; return; }
  if (statusEl) statusEl.style.display = "block";

  const { data: profile, error: fetchErr } = await _supabase
    .from("dating_profiles")
    .select("id, photos, photo_url")
    .eq("user_id", currentUser.id)
    .maybeSingle();
  if (fetchErr || !profile){
    if (statusEl) statusEl.style.display = "none";
    msg.innerHTML = `<div class="msg error">Couldn't load your profile to update the photo.</div>`;
    return;
  }

  const path = makeUploadPath(file);
  const { error: uploadErr } = await _supabase.storage.from(BUCKET_PROFILE_PHOTOS).upload(path, file, { contentType: file.type });
  if (uploadErr){
    if (statusEl) statusEl.style.display = "none";
    msg.innerHTML = `<div class="msg error">Upload failed: ${esc(uploadErr.message)}</div>`;
    return;
  }
  const pub = { publicUrl: path };

  const photos = (profile.photos && profile.photos.length ? [...profile.photos] : (profile.photo_url ? [profile.photo_url] : []));
  while (photos.length <= index) photos.push(null);
  photos[index] = pub.publicUrl;
  const cleaned = photos.filter(Boolean).slice(0, 3);

  const { error: updErr } = await _supabase
    .from("dating_profiles")
    .update({ photos: cleaned, photo_url: cleaned[0] || null, updated_at: new Date().toISOString() })
    .eq("id", profile.id);

  if (statusEl) statusEl.style.display = "none";
  if (updErr){
    msg.innerHTML = `<div class="msg error">Couldn't save the new photo: ${esc(updErr.message)}</div>`;
    return;
  }
  msg.innerHTML = `<div class="msg success">Photo updated.</div>`;
  loadMyProfile();
}

async function loadMyProfile(){
  const el = document.getElementById("myProfileContent");
  const { data, error } = await _supabase
    .from("dating_profiles")
    .select("*")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (error || !data){
    el.innerHTML = `<div class="empty" style="font-size: 1.1rem; padding: 60px 20px;">You haven't posted a profile yet.<br><br> Go to the <b>Setup Profile</b> tab to get started!</div>`;
    return;
  }

  const { data: latestRequest } = await _supabase
    .from("dating_verification_requests")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: latestPlatinumRequest } = await _supabase
    .from("dating_platinum_requests")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  el.innerHTML = `
    <div class="browse-header" style="display:flex; justify-content:space-between; align-items:center;">
      <h2>Edit <span>My Profile</span></h2>
      <button onclick="switchTab('settings')" style="background:var(--paper); border:1px solid var(--line); padding:8px 14px; border-radius:8px; font-weight:600; cursor:pointer; font-size:0.85rem;">⚙️ Settings</button>
    </div>
    ${renderPhotoEditor(data)}
    ${renderTierBox(data)}
    ${renderPlatinumBox(data, latestPlatinumRequest)}
    ${renderVerificationBox(data, latestRequest)}
    ${profileCompletenessBanner(data)}
    <form class="post-form" id="editForm">
      <div><label>First name</label><input type="text" id="eName" maxlength="30" value="${esc(data.display_name||"")}" required></div>
      <div class="row2">
        <div><label>Age</label><input type="number" id="eAge" min="18" max="99" value="${esc(data.age||"")}" required></div>
        <div><label>City</label><input type="text" id="eCity" value="${esc(data.city||"")}" required></div>
      </div>
      <div>
        <label>About You</label>
        <textarea id="eBio" maxlength="500" required>${esc(data.bio||"")}</textarea>
      </div>
      <div class="row2">
        <div>
          <label>My Gender <span style="color:#b4232f">*</span></label>
          <select id="eGender" required>
            <option value="">Select Gender</option>
            ${opts(["Male","Female"], data.gender)}
          </select>
        </div>
        <div>
          <label>I'm Interested In <span style="color:#b4232f">*</span></label>
          <select id="eSeeking" required>
            <option value="">Select Gender</option>
            ${opts(["Male","Female","Any"], data.seeking)}
          </select>
        </div>
      </div>
      <div>
        <label>What I'm Looking For</label>
        <select id="eLookingFor" required>
          <option value="">Select</option>
          ${opts(["Long-term relationship","Something casual","Marriage","New friends","Not sure yet"], data.looking_for)}
        </select>
      </div>
      <div class="row2">
        <div><label>Interested In Ages (Min)</label><input type="number" id="eAgeMin" min="18" max="99" value="${esc(data.age_min||"")}" required></div>
        <div><label>Interested In Ages (Max)</label><input type="number" id="eAgeMax" min="18" max="99" value="${esc(data.age_max||"")}" required></div>
      </div>
      <div>
        <label>My Lifestyle</label>
        <select id="eLifestyle" required>
          <option value="">Select</option>
          ${opts(["Active & Outdoorsy","Homebody","Social & Outgoing","Balanced","Career-focused","Family-oriented","Other"], data.lifestyle)}
        </select>
      </div>
      <div class="row2">
        <div>
          <label>Have Kids?</label>
          <select id="eHasKids" required>
            <option value="">Select</option>
            ${opts(["Yes","No"], data.has_kids)}
          </select>
        </div>
        <div>
          <label>Want Kids?</label>
          <select id="eWantsKids" required>
            <option value="">Select</option>
            ${opts(["Yes","No","Maybe"], data.wants_kids)}
          </select>
        </div>
      </div>
      <div>
        <label>Religion</label>
        <select id="eReligion" required>
          <option value="">Select</option>
          ${opts(["Orthodox Christian","Protestant","Muslim","Catholic","Traditional","Other","Prefer not to say"], data.religion)}
        </select>
      </div>
      <div class="row2">
        <div><label>Occupation (Optional)</label><input type="text" id="eOccupation" maxlength="60" value="${esc(data.occupation||"")}"></div>
        <div>
          <label>Income (Optional)</label>
          <select id="eIncome">
            ${opts(["Prefer not to say","Under 10,000 ETB/mo","10,000–25,000 ETB/mo","25,000–50,000 ETB/mo","50,000–100,000 ETB/mo","100,000+ ETB/mo"], data.income_range || "Prefer not to say")}
          </select>
        </div>
      </div>
      <div style="display: flex; gap: 10px; margin-top: 10px;">
          <button type="submit" class="submit-btn" style="flex:2;">Save Changes</button>
          <button type="button" class="submit-btn" style="background:var(--danger); flex:1;" id="deleteBtn">Delete Profile</button>
      </div>
      <div id="editMsg"></div>
    </form>`;

  document.getElementById("editForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const ageMin = parseInt(document.getElementById("eAgeMin").value, 10);
    const ageMax = parseInt(document.getElementById("eAgeMax").value, 10);
    if (ageMin > ageMax){
      document.getElementById("editMsg").innerHTML = `<div class="msg error">Minimum age can't be greater than maximum age.</div>`;
      return;
    }
    const { error: updErr } = await _supabase.from("dating_profiles").update({
      display_name: document.getElementById("eName").value.trim(),
      age: parseInt(document.getElementById("eAge").value,10),
      city: document.getElementById("eCity").value.trim(),
      gender: document.getElementById("eGender").value,
      seeking: document.getElementById("eSeeking").value,
      bio: document.getElementById("eBio").value.trim(),
      looking_for: document.getElementById("eLookingFor").value,
      age_min: ageMin,
      age_max: ageMax,
      lifestyle: document.getElementById("eLifestyle").value,
      has_kids: document.getElementById("eHasKids").value,
      wants_kids: document.getElementById("eWantsKids").value,
      religion: document.getElementById("eReligion").value,
      occupation: document.getElementById("eOccupation").value.trim() || null,
      income_range: document.getElementById("eIncome").value,
      updated_at: new Date().toISOString()
    }).eq("id", data.id);
    document.getElementById("editMsg").innerHTML = updErr
      ? `<div class="msg error">${esc(updErr.message)}</div>`
      : `<div class="msg success">Changes Saved!</div>`;
    if (!updErr) refreshProfileCompleteBadge();
  });

  document.getElementById("deleteBtn").addEventListener("click", async () => {
    if (!confirm("Are you sure you want to permanently delete your dating profile? This cannot be undone.")) return;
    const { error: delErr } = await _supabase.from("dating_profiles").delete().eq("id", data.id);
    if (delErr){ alert("Couldn't delete: " + delErr.message); return; }
    loadMyProfile();
  });
}

// ---------- Privacy Settings & Blocked Users ----------
async function loadSettings() {
  const list = document.getElementById("blockedUsersList");
  list.innerHTML = "Loading...";

  // Populate the call/last-seen dropdowns from the current profile —
  // reuse myProfile if it's already loaded this session, otherwise fetch it.
  const profileForPrivacy = myProfile || await fetchMyProfile();
  if (profileForPrivacy){
    document.getElementById("setCallPrivacy").value = profileForPrivacy.call_privacy || "everybody";
    document.getElementById("setLastSeenPrivacy").value = profileForPrivacy.last_seen_privacy || "everybody";
  }

  const { data: blocks, error } = await _supabase
    .from("dating_blocks")
    .select("id, blocked_id")
    .eq("blocker_id", currentUser.id);

  if (error) {
    list.innerHTML = `<div class="msg error">Couldn't load blocked users.</div>`;
    return;
  }

  if (!blocks || blocks.length === 0) {
    list.innerHTML = `<div class="empty" style="padding: 20px 10px; font-size: 0.9rem;">You haven't blocked anyone.</div>`;
    return;
  }

  const blockedIds = blocks.map(b => b.blocked_id);
  const { data: profiles } = await _supabase
    .from("dating_profiles")
    .select("user_id, display_name, gender, photo_url, photos")
    .in("user_id", blockedIds);

  const profileMap = {};
  (profiles || []).forEach(p => profileMap[p.user_id] = p);

  list.innerHTML = blocks.map(b => {
    const p = profileMap[b.blocked_id];
    const name = p ? (p.display_name || p.gender || "Unknown User") : "Unknown User";
    const photo = p ? ((p.photos && p.photos[0]) || p.photo_url) : null;
    const photoIsUrl = photo && /^https?:\/\//i.test(photo);

    return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px;border:1px solid var(--line);border-radius:8px;margin-bottom:10px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div ${photo && !photoIsUrl ? `data-profile-media-bg="${esc(photo)}"` : ""} style="width:36px;height:36px;border-radius:50%;background:${photoIsUrl ? `url('${esc(photo)}') center/cover` : "var(--paper)"};display:flex;align-items:center;justify-content:center;color:#aaa;border:1px solid var(--line);">${photo ? "" : "👤"}</div>
          <div style="font-weight:600;font-size:0.9rem;">${esc(name)}</div>
        </div>
        <button onclick="unblockUser('${b.id}')" style="background:var(--paper);border:1px solid var(--line);padding:6px 12px;border-radius:6px;font-size:0.8rem;font-weight:bold;cursor:pointer;color:#333;transition:0.2s;">Unblock</button>
      </div>
    `;
  }).join("");
}

async function unblockUser(blockId) {
  if(!confirm("Unblock this user? They will be able to see your profile and message you again if you match.")) return;
  const { error } = await _supabase.from("dating_blocks").delete().eq("id", blockId);
  if (error){ alert("Couldn't unblock right now: " + error.message); return; }
  loadSettings();
  loadProfiles(); // Refresh main feed
}

async function updateAccountPassword() {
  const p1 = document.getElementById("setNewPwd").value;
  const p2 = document.getElementById("setNewPwdConf").value;
  const msg = document.getElementById("pwdMsg");

  if (!p1 || p1.length < 6) { msg.innerHTML = `<div class="msg error">Password must be at least 6 characters.</div>`; return; }
  if (p1 !== p2) { msg.innerHTML = `<div class="msg error">Passwords do not match.</div>`; return; }

  msg.innerHTML = `<div class="msg">Updating...</div>`;
  const { error } = await _supabase.auth.updateUser({ password: p1 });

  if (error) {
    msg.innerHTML = `<div class="msg error">${esc(error.message)}</div>`;
  } else {
    msg.innerHTML = `<div class="msg success">Password updated securely!</div>`;
    document.getElementById("setNewPwd").value = '';
    document.getElementById("setNewPwdConf").value = '';
  }
}

async function reportProfile(profileId){
  if (!currentUser){ alert("Please sign in to report a profile."); return; }
  const reason = (prompt("What is the issue with this profile? (e.g. fake photos, harassment, scam)") || "").trim();
  if (!reason) return;
  if (reason.length < 3){ alert("Please describe the problem in a few words."); return; }
  // Server function resolves the reported member, blocks self-reports and
  // duplicate/spam reports (run dating-migration-v41-report-fix.sql).
  const { error } = await _supabase.rpc("dating_report_profile", {
    p_profile_id: profileId,
    p_reason: reason.slice(0, 200),
    p_details: null
  });
  if (error){
    console.error("Report failed:", error);
    alert(/does not exist|schema cache/i.test(error.message || "")
      ? "Reporting isn't available yet. Please contact Support."
      : "Couldn't submit report: " + error.message);
    return;
  }
  alert("Report submitted. Thank you — our team will review it.");
  closeModal();
}

async function blockProfile(otherUserId){
  if (!confirm("Block this person? They won't be able to message you, and any match will end. You can unblock later in Privacy Settings.")) return;
  const { error } = await _supabase.from("dating_blocks").insert({
    blocker_id: currentUser.id,
    blocked_id: otherUserId
  });
  if (error && error.code !== "23505"){
    alert("Couldn't block right now: " + error.message);
    return;
  }
  closeModal();
  loadProfiles();
  refreshUnreadBadge();
}

// ---------- Setup/Edit profile form: prefill from the saved profile ----------
let postFormDirty = false;
let postFormFilledFor = null;

function setFieldValue(id, value){
  const el = document.getElementById(id);
  if (!el) return;
  const v = value == null ? "" : String(value);
  if (el.tagName === "SELECT" && v && ![...el.options].some(o => o.value === v)){
    // keep legacy / custom values selectable instead of silently dropping them
    const o = document.createElement("option");
    o.textContent = v; o.value = v;
    el.appendChild(o);
  }
  el.value = v;
}

function postSubmitLabel(){
  return myProfile ? "Save Changes" : "Publish My Profile";
}

function setPostFormMode(){
  const editing = !!myProfile;
  const h = document.getElementById("postHeading");
  const sub = document.getElementById("postSubheading");
  if (h) h.innerHTML = editing ? "Edit <span>My Profile</span>" : "Create Your <span>Dating Profile</span>";
  if (sub) sub.textContent = editing
    ? "Your saved details are filled in below. Change anything you like, then save."
    : "Fill out the details below to start matching with people.";
  const btn = document.getElementById("submitBtn");
  if (btn && !btn.disabled) btn.textContent = postSubmitLabel();
  document.querySelectorAll(".post-tab-label").forEach(el => { el.textContent = editing ? "Edit Profile" : "Setup Profile"; });
  const note = document.getElementById("postPhotoNote");
  const lbl = document.getElementById("fPhotoLabel");
  if (note && lbl){
    const n = myProfile && Array.isArray(myProfile.photos) ? myProfile.photos.length : (myProfile && myProfile.photo_url ? 1 : 0);
    if (editing && n){
      note.style.display = "block";
      note.textContent = `You have ${n} photo${n > 1 ? "s" : ""} saved. Leave this empty to keep ${n > 1 ? "them" : "it"}, or choose new photos to replace ${n > 1 ? "them" : "it"}. (Manage photos in My Account.)`;
      lbl.textContent = "Replace Photos (Optional, up to 3)";
    } else {
      note.style.display = "none";
      lbl.textContent = "Upload Photos (Up to 3)";
    }
  }
}

function fillPostForm(force){
  setPostFormMode();
  if (!currentUser) return;
  const key = myProfile ? `p:${myProfile.updated_at || myProfile.id || "x"}` : `new:${currentUser.id}`;
  // Don't wipe edits the member is in the middle of making.
  if (!force && postFormDirty && postFormFilledFor === key) return;
  if (myProfile){
    const p = myProfile;
    setFieldValue("fName", p.display_name);
    setFieldValue("fAge", p.age);
    setFieldValue("fCity", p.city);
    setFieldValue("fGender", p.gender);
    setFieldValue("fSeeking", p.seeking);
    setFieldValue("fType", p.relationship_type);
    setFieldValue("fLookingFor", p.looking_for);
    setFieldValue("fAgeMin", p.age_min);
    setFieldValue("fAgeMax", p.age_max);
    setFieldValue("fLifestyle", p.lifestyle);
    setFieldValue("fHasKids", p.has_kids);
    setFieldValue("fWantsKids", p.wants_kids);
    setFieldValue("fReligion", p.religion);
    setFieldValue("fOccupation", p.occupation);
    setFieldValue("fIncome", p.income_range || "Prefer not to say");
    setFieldValue("fBio", p.bio);
    const c = document.getElementById("fAgeConfirm");
    if (c) c.checked = p.age_confirmed !== false; // already confirmed when the profile was created
  } else {
    // New member: start from what their account already knows.
    const full = (currentUser.user_metadata && (currentUser.user_metadata.full_name || currentUser.user_metadata.name)) || "";
    const nameEl = document.getElementById("fName");
    if (nameEl && !nameEl.value && full) nameEl.value = String(full).trim().split(/\s+/)[0].slice(0, 30);
  }
  postFormDirty = false;
  postFormFilledFor = key;
}

// Document-level so it survives safety.js replacing the form node.
document.addEventListener("input", (e) => { if (e.target && e.target.closest && e.target.closest("#postForm")) postFormDirty = true; });

// ---------- Post form ----------
document.getElementById("postForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("submitBtn");
  const msg = document.getElementById("formMsg");
  msg.innerHTML = "";

  const age = parseInt(document.getElementById("fAge").value, 10);
  const ageConfirmed = document.getElementById("fAgeConfirm").checked;
  if (!Number.isFinite(age) || age < 18 || !ageConfirmed){
    msg.innerHTML = `<div class="msg error">You must be 18 or older to post here.</div>`;
    return;
  }

  const ageMin = parseInt(document.getElementById("fAgeMin").value, 10);
  const ageMax = parseInt(document.getElementById("fAgeMax").value, 10);
  if (ageMin > ageMax){
    msg.innerHTML = `<div class="msg error">Minimum age can't be greater than maximum age.</div>`;
    return;
  }

  btn.disabled = true;
  btn.textContent = myProfile ? "Saving..." : "Publishing Profile...";

  let photoUrls = [];
  const files = Array.from(document.getElementById("fPhoto").files).slice(0, 3);
  for (const f of files){
    const fileErr = checkUploadFile(f);
    if (fileErr){
      msg.innerHTML = `<div class="msg error">${esc(fileErr)}</div>`;
      btn.disabled = false; btn.textContent = postSubmitLabel();
      return;
    }
  }
  for (const file of files){
    const path = makeUploadPath(file);
    const { error: uploadErr } = await _supabase.storage.from(BUCKET_PROFILE_PHOTOS).upload(path, file, { contentType: file.type });
    if (uploadErr){
      msg.innerHTML = `<div class="msg error">Photo upload failed: ${esc(uploadErr.message)}</div>`;
      btn.disabled = false; btn.textContent = postSubmitLabel();
      return;
    }
    photoUrls.push(path);
  }

  // Editing keeps the member's existing profile code; only a brand-new profile gets one.
  const profileCode = (myProfile && myProfile.profile_code) || `WGD-${new Date().getFullYear()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
  const wasEditing = !!myProfile;
  const genderVal = document.getElementById("fGender").value;
  const cityVal = document.getElementById("fCity").value.trim();

  const payload = {
    user_id: currentUser.id,
    profile_code: profileCode,
    display_name: document.getElementById("fName").value.trim(),
    age,
    gender: genderVal,
    seeking: document.getElementById("fSeeking").value,
    relationship_type: document.getElementById("fType").value,
    city: cityVal,
    bio: document.getElementById("fBio").value.trim(),
    looking_for: document.getElementById("fLookingFor").value,
    age_min: ageMin,
    age_max: ageMax,
    lifestyle: document.getElementById("fLifestyle").value,
    has_kids: document.getElementById("fHasKids").value,
    wants_kids: document.getElementById("fWantsKids").value,
    religion: document.getElementById("fReligion").value,
    occupation: document.getElementById("fOccupation").value.trim() || null,
    income_range: document.getElementById("fIncome").value,
    age_confirmed: true,
    updated_at: new Date().toISOString()
  };
  
  if (photoUrls.length > 0){
    payload.photo_url = photoUrls[0];
    payload.photos = photoUrls;
  }

  const { error } = await _supabase
    .from("dating_profiles")
    .upsert(payload, { onConflict: "user_id" });

  btn.disabled = false;

  if (error){
    btn.textContent = postSubmitLabel();
    msg.innerHTML = `<div class="msg error">Something went wrong: ${esc(error.message)}</div>`;
  } else {
    msg.innerHTML = `<div class="msg success">${wasEditing ? "Profile updated successfully!" : "Profile Published Successfully!"}</div>`;
    const photoInput = document.getElementById("fPhoto");
    if (photoInput) photoInput.value = "";
    await fetchMyProfile();
    postFormDirty = false;
    fillPostForm(true);
    setTimeout(() => switchTab("myprofile"), 1500); 
  }
});

function toggleLang(){
  currentLang = currentLang === "en" ? "am" : "en";
  document.getElementById("langBtn").textContent = currentLang === "en" ? "አማ" : "EN";
}

initAuth();


/* ---------- Home recommendations ---------- */
async function loadHomeRecommendations(){
  const box=document.getElementById('homeRecommendedList');
  if(!box || !_supabase || !currentUser) return;

  box.innerHTML='<div class="wana-right-match-empty">Finding your best matches…</div>';

  try{
    let me=myProfile;
    if(!me){
      const {data}=await _supabase.from('dating_profiles')
        .select('*').eq('user_id',currentUser.id).maybeSingle();
      me=data||null;
    }

    if(!me){
      box.innerHTML='<div class="wana-right-match-empty">Complete your profile to get personalized recommendations.</div>';
      return;
    }

    const blockedIds = typeof fetchBlockedIds === 'function'
      ? await fetchBlockedIds()
      : new Set();

    const {data,error}=await _supabase.from('dating_profiles')
      .select('*')
      .neq('user_id',currentUser.id)
      .limit(80);

    if(error) throw error;

    const rows=(data||[])
      .filter(r=>!blockedIds.has(r.user_id))
      .map(r=>({row:r,score:homeRecommendationScore(me,r)}))
      .filter(x=>x.score>=35)
      .sort((a,b)=>b.score-a.score)
      .slice(0,3);

    if(!rows.length){
      box.innerHTML='<div class="wana-right-match-empty">No strong matches yet. Add more profile details to improve your recommendations.</div>';
      return;
    }

    box.innerHTML='';

    for(const {row,score} of rows){
      const el=document.createElement('div');
      el.className='wana-right-match';

      const img=(row.photos&&row.photos[0])||row.photo_url||'';
      const p=visiblePresence(row);
      const photoUrl=img ? await resolvePrivateUrl(BUCKET_PROFILE_PHOTOS,img) : null;

      el.innerHTML=`
        <div class="wana-right-match-photo"
             ${photoUrl ? `style="background-image:url('${esc(photoUrl)}')"` : ''}>
          ${photoUrl?'':'👤'}
          ${p.online?'<span class="online"></span>':''}
        </div>
        <div class="wana-right-match-name">
          ${esc(row.display_name||'Someone')}${row.is_verified?' ✓':''}
        </div>
        <div class="wana-right-match-meta">
          ${esc(row.city||'Nearby')} · ${esc(row.relationship_type||'Looking to connect')}
        </div>
        <button type="button" class="wana-right-match-btn">VIEW PROFILE</button>
      `;

      el.querySelector('.wana-right-match-btn').addEventListener('click',(ev)=>{
        ev.stopPropagation();
        openModal(row);
      });
      el.addEventListener('click',()=>openModal(row));
      box.appendChild(el);
    }
  }catch(e){
    console.warn('Home recommendations:',e);
    box.innerHTML='<div class="wana-right-match-empty">Recommendations are temporarily unavailable.</div>';
  }
}

function homeRecommendationScore(me,r){
  let s=0;
  const norm=v=>String(v||'').trim().toLowerCase();
  if(norm(me.relationship_type)&&norm(me.relationship_type)===norm(r.relationship_type))s+=18;
  if(norm(me.looking_for)&&norm(me.looking_for)===norm(r.looking_for))s+=10;
  if(norm(me.lifestyle)&&norm(me.lifestyle)===norm(r.lifestyle))s+=9;
  if(norm(me.religion)&&norm(me.religion)!=='prefer not to say'&&norm(me.religion)===norm(r.religion))s+=7;
  if(norm(me.city)&&norm(me.city)===norm(r.city))s+=12;
  if(norm(me.wants_kids)&&norm(me.wants_kids)===norm(r.wants_kids))s+=8;
  if(norm(me.has_kids)&&norm(me.has_kids)===norm(r.has_kids))s+=4;
  if(r.is_verified)s+=5;
  if(visiblePresence(r).online)s+=7;
  if(r.created_at&&Date.now()-new Date(r.created_at).getTime()<7*86400000)s+=3;
  return Math.min(99,s);
}
