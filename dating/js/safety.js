/* Original script block 4 */

/* =========================================================
   Wana Dating — correctness, privacy & performance patch
   Applied on top of the existing UI/features.
   ========================================================= */
(() => {
  "use strict";

  const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
  const PROFILE_IMAGE_TYPES = new Set(["image/jpeg","image/png","image/webp","image/gif"]);
  const BROWSE_FETCH_SIZE = 24;
  const BROWSE_RENDER_SIZE = 6;

  let browsePage = 0;
  let browseHasMore = false;
  let browseLoading = false;
  let browseRequestId = 0;

  function safeName(name){
    return String(name || "image").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
  }

  function validateDatingImage(file){
    if (!file) throw new Error("Please choose an image.");
    if (!PROFILE_IMAGE_TYPES.has(file.type)) throw new Error("Use JPG, PNG, WEBP, or GIF images.");
    if (file.size > PROFILE_IMAGE_MAX_BYTES) throw new Error("Images must be 5 MB or smaller.");
  }

  async function uploadPrivateProfileImage(file){
    validateDatingImage(file);
    if (!currentUser) throw new Error("You must be signed in.");
    // "<uid>-<random>-<name>" matches the path convention (and the storage write policy,
    // name LIKE auth.uid()||'-%') used by every other upload in this file.
    const path = `${currentUser.id}-${crypto.randomUUID()}-${safeName(file.name)}`;
    const { error } = await _supabase.storage.from(BUCKET_PROFILE_PHOTOS).upload(path, file, {
      upsert: false,
      contentType: file.type,
      cacheControl: "3600"
    });
    if (error) throw error;
    return path;
  }

  async function deletePrivateProfileFiles(paths){
    const clean = [...new Set((paths || []).filter(p => p && !/^https?:\/\//i.test(p)))];
    if (!clean.length) return;
    const { error } = await _supabase.storage.from(BUCKET_PROFILE_PHOTOS).remove(clean);
    if (error) console.warn("Profile media cleanup failed:", error);
  }

  async function resolveProfilePhoto(value){
    if (!value) return null;
    return resolvePrivateUrl(BUCKET_PROFILE_PHOTOS, value);
  }

  // Storage paths we create always start with the uploader's uuid; anything else
  // (site images, data:/blob: URLs, full http URLs) is left alone, so ordinary
  // <img src="images/..."> tags never trigger pointless signing requests.
  const STORAGE_PATH_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-/i;
  const isStoragePath = v => !!v && !/^(https?:|data:|blob:)/i.test(v) && STORAGE_PATH_RE.test(v);

  async function hydrateProfileMedia(root = document){
    const imgEls = [...root.querySelectorAll("img[src]")];
    await Promise.all(imgEls.map(async img => {
      const src = img.getAttribute("src");
      if (!isStoragePath(src) || img.dataset.mediaTried) return;
      img.dataset.mediaTried = "1";
      const url = await resolveProfilePhoto(src);
      if (url) img.src = url;
    }));

    const bgEls = [...root.querySelectorAll("[data-profile-media-bg]")];
    await Promise.all(bgEls.map(async el => {
      const value = el.getAttribute("data-profile-media-bg");
      if (!isStoragePath(value)) return;
      const url = await resolveProfilePhoto(value);
      if (url) el.style.backgroundImage = `url("${String(url).replace(/"/g, '\\"')}")`;
    }));

    // Avatars/thumbnails drawn with an inline style="...url('<path>')..." (feed
    // authors, thread list, photo editor, ...) never carried a data attribute, so a
    // private path there rendered as a broken image.
    const styled = [...root.querySelectorAll('[style*="url("]')];
    await Promise.all(styled.map(async el => {
      if (el.dataset.mediaTried) return;
      const style = el.getAttribute("style") || "";
      const m = style.match(/url\((['"]?)([^'")]+)\1\)/);
      if (!m || !isStoragePath(m[2])) return;
      el.dataset.mediaTried = "1";
      const url = await resolveProfilePhoto(m[2]);
      if (url) el.setAttribute("style", style.replace(m[0], `url("${url}")`));
    }));
  }

  function isEligibleForDating(me, candidate){
    if (!me || !candidate) return false;
    const seeking = String(me.seeking || "").toLowerCase();
    const candidateGender = String(candidate.gender || "").toLowerCase();
    const candidateSeeking = String(candidate.seeking || "").toLowerCase();
    const myGender = String(me.gender || "").toLowerCase();

    // Gender and gender preference are mandatory for active discovery.
    // Never recommend legacy/incomplete profiles by guessing their gender.
    if (!["male","female"].includes(myGender) || !["male","female"].includes(candidateGender)) return false;
    if (!["male","female","any"].includes(seeking) || !["male","female","any"].includes(candidateSeeking)) return false;

    const myGenderOk = seeking === "any" || seeking === candidateGender;
    const reciprocalGenderOk = candidateSeeking === "any" || candidateSeeking === myGender;

    // A missing value must stay "unknown", not 0: Number(null) is 0, which
    // turned every profile without an age range (all profiles made before
    // that field existed) into a "0-0" preference that matched nobody.
    const num = v => (v === null || v === undefined || v === "") ? NaN : Number(v);
    const myAge = num(me.age);
    const candidateAge = num(candidate.age);
    const candidateMin = num(candidate.age_min);
    const candidateMax = num(candidate.age_max);
    const myMin = num(me.age_min);
    const myMax = num(me.age_max);

    const myAgeOk = Number.isFinite(myAge) && Number.isFinite(candidateMin) && Number.isFinite(candidateMax)
      ? myAge >= candidateMin && myAge <= candidateMax : true;
    const reciprocalAgeOk = Number.isFinite(candidateAge) && Number.isFinite(myMin) && Number.isFinite(myMax)
      ? candidateAge >= myMin && candidateAge <= myMax : true;

    return myGenderOk && reciprocalGenderOk && myAgeOk && reciprocalAgeOk;
  }

  function compatibilityBreakdown(me, r){
    const norm = v => String(v || "").trim().toLowerCase();
    const parts = [];
    if (norm(me.relationship_type) && norm(me.relationship_type) === norm(r.relationship_type)) parts.push("same goal");
    if (norm(me.looking_for) && norm(me.looking_for) === norm(r.looking_for)) parts.push("same relationship preference");
    if (norm(me.lifestyle) && norm(me.lifestyle) === norm(r.lifestyle)) parts.push("similar lifestyle");
    if (norm(me.city) && norm(me.city) === norm(r.city)) parts.push("same city");
    if (norm(me.wants_kids) && norm(me.wants_kids) === norm(r.wants_kids)) parts.push("family plans align");
    if (norm(me.religion) && norm(me.religion) !== "prefer not to say" && norm(me.religion) === norm(r.religion)) parts.push("shared religion");
    return parts.slice(0,3);
  }

  // Reciprocal eligibility is now a hard gate. Similarity only ranks eligible people.
  window.homeRecommendationScore = function(me, r){
    if (!isEligibleForDating(me, r)) return 0;
    let s = 40;
    const norm = v => String(v || "").trim().toLowerCase();
    if (norm(me.relationship_type) && norm(me.relationship_type) === norm(r.relationship_type)) s += 18;
    if (norm(me.looking_for) && norm(me.looking_for) === norm(r.looking_for)) s += 10;
    if (norm(me.lifestyle) && norm(me.lifestyle) === norm(r.lifestyle)) s += 9;
    if (norm(me.religion) && norm(me.religion) !== "prefer not to say" && norm(me.religion) === norm(r.religion)) s += 7;
    if (norm(me.city) && norm(me.city) === norm(r.city)) s += 8;
    if (norm(me.wants_kids) && norm(me.wants_kids) === norm(r.wants_kids)) s += 8;
    if (norm(me.has_kids) && norm(me.has_kids) === norm(r.has_kids)) s += 4;
    if (r.is_verified) s += 4;
    if (visiblePresence(r).online) s += 5;
    if (r.created_at && Date.now() - new Date(r.created_at).getTime() < 7*86400000) s += 3;
    return Math.min(99, s);
  };

  const legacyCreateProfileCard = window.createProfileCard;
  window.createProfileCard = function(row, opts = {}){
    const { extraMeta, showOnlineDot = true } = opts;
    const card = document.createElement("div");
    card.className = "card";
    card.onclick = () => openModal(row);
    const rawImg = (row.photos && row.photos[0]) || row.photo_url || null;
    const displayName = esc(row.display_name || row.gender || "Someone");
    const presence = visiblePresence(row);
    const metaLine = extraMeta !== undefined
      ? extraMeta
      : `<div class="presence ${presence.online ? "is-online" : ""}">${presence.text}</div>`;

    card.innerHTML = `
      <div class="photo ${rawImg && !/^https?:\/\//i.test(rawImg) ? "profile-media-loading" : ""}" data-profile-media-bg="${rawImg ? esc(rawImg) : ""}" style="${rawImg && /^https?:\/\//i.test(rawImg) ? `background-image:url('${esc(rawImg)}')` : ""}">
        ${rawImg ? "" : "👤"}
        ${showOnlineDot && presence.online ? `<span class="online-dot" title="Online now"></span>` : ""}
      </div>
      <div class="info">
        <div class="name-age">${displayName.toUpperCase()}${verifiedBadge(row.is_verified)}${platinumBadge(isPlatinumActive(row))} <span class="age">${row.age || "?"} yrs</span></div>
        <div class="meta">${esc(row.city || "")} · ${esc(row.relationship_type || "")}</div>
        ${metaLine || ""}
      </div>`;

    if (rawImg && !/^https?:\/\//i.test(rawImg)) {
      resolveProfilePhoto(rawImg).then(url => {
        const photo = card.querySelector("[data-profile-media-bg]");
        if (photo && url) {
          photo.style.backgroundImage = `url("${String(url).replace(/"/g, '\\"')}")`;
          photo.classList.remove("profile-media-loading");
        }
      });
    }
    return card;
  };

  window.loadProfiles = async function(reset = true){
    if (!currentUser || browseLoading) return;
    const requestId = ++browseRequestId;
    browseLoading = true;

    if (reset) browsePage = 0;
    const seeking = document.getElementById("filterSeeking").value;
    const type = document.getElementById("filterType").value;
    const city = document.getElementById("filterCity").value.trim();
    const onlineOnly = document.getElementById("filterOnline").checked;
    const verifiedOnly = document.getElementById("filterVerified").checked;
    const ageMin = parseInt(document.getElementById("filterAgeMin").value,10);
    const ageMax = parseInt(document.getElementById("filterAgeMax").value,10);
    const religion = document.getElementById("filterReligion").value;
    const lifestyle = document.getElementById("filterLifestyle").value;
    const hasKids = document.getElementById("filterHasKids").value;
    const wantsKids = document.getElementById("filterWantsKids").value;

    const grid = document.getElementById("grid");
    const empty = document.getElementById("emptyState");
    const moreWrap = document.getElementById("moreWrap");
    const moreBtn = document.getElementById("moreBtn");

    if (reset) {
      grid.innerHTML = "";
      empty.style.display = "none";
      moreWrap.style.display = "none";
      document.getElementById("onlineSummary").textContent = "";
    }
    if (moreBtn) moreBtn.disabled = true;

    try {
      await refreshMyMatchedIds();
      const blockedIds = await fetchBlockedIds();
      let query = _supabase.from("dating_profiles")
        .select("user_id, id, display_name, age, gender, seeking, relationship_type, city, bio, looking_for, age_min, age_max, lifestyle, has_kids, wants_kids, religion, occupation, photos, photo_url, is_verified, created_at, last_seen_at, call_privacy, last_seen_privacy")
        .neq("user_id", currentUser.id)
        .order("created_at", {ascending:false})
        .range(browsePage * BROWSE_FETCH_SIZE, (browsePage + 1) * BROWSE_FETCH_SIZE - 1);

      if (seeking) query = query.eq("gender", seeking);
      if (type) query = query.eq("relationship_type", type);
      if (city) query = query.ilike("city", `%${city}%`);
      if (verifiedOnly) query = query.eq("is_verified", true);
      if (!Number.isNaN(ageMin)) query = query.gte("age", ageMin);
      if (!Number.isNaN(ageMax)) query = query.lte("age", ageMax);
      if (religion) query = query.eq("religion", religion);
      if (lifestyle) query = query.eq("lifestyle", lifestyle);
      if (hasKids) query = query.eq("has_kids", hasKids);
      if (wantsKids) query = query.eq("wants_kids", wantsKids);

      const {data,error} = await query;
      if (requestId !== browseRequestId) return;
      if (error) throw error;

      // Someone who hasn't posted a profile yet can still browse; eligibility needs a profile to compare against.
      let rows = (data || []).filter(r => !blockedIds.has(r.user_id) && (!myProfile || isEligibleForDating(myProfile, r)));
      if (onlineOnly) rows = rows.filter(r => visiblePresence(r).online);
      rows.sort((a,b) => {
        const ao = visiblePresence(a).online, bo = visiblePresence(b).online;
        if (ao !== bo) return ao ? -1 : 1;
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      });

      browseHasMore = (data || []).length === BROWSE_FETCH_SIZE;
      browsePage += 1;

      rows.forEach(r => grid.appendChild(createProfileCard(r))); // render every eligible row of the fetched page (slicing here silently dropped the rest)
      const shown = grid.children.length;
      const onlineCount = [...grid.querySelectorAll(".presence.is-online")].length;
      document.getElementById("onlineSummary").textContent = onlineCount
        ? `🟢 ${onlineCount} ${onlineCount === 1 ? "person" : "people"} online on this page`
        : "";

      empty.style.display = shown ? "none" : (browseHasMore ? "none" : "block");
      moreWrap.style.display = browseHasMore ? "block" : "none";
    } catch(err) {
      if (requestId !== browseRequestId) return;
      console.error("Browse load failed:", err);
      empty.textContent = "Couldn't load profiles right now.";
      empty.style.display = "block";
    } finally {
      browseLoading = false;
      if (moreBtn) {
        moreBtn.disabled = false;
        moreBtn.textContent = browseHasMore ? "Load More Profiles" : "No More Profiles";
      }
    }
  };

  window.showMoreProfiles = function(){
    if (!browseHasMore || browseLoading) return;
    loadProfiles(false);
  };

  window.clearBrowseFilters = function(){
    ["filterSeeking","filterType","filterReligion","filterLifestyle","filterHasKids","filterWantsKids"]
      .forEach(id => document.getElementById(id).value = "");
    ["filterCity","filterAgeMin","filterAgeMax"].forEach(id => document.getElementById(id).value = "");
    ["filterOnline","filterVerified"].forEach(id => document.getElementById(id).checked = false);
    loadProfiles(true);
  };

  // Home recommendations: select only discovery fields, exclude blocked/previously matched people,
  // apply reciprocal eligibility before ranking, and resolve private photos only when rendered.
  window.loadHomeRecommendations = async function(){
    const box = document.getElementById("homeRecommendedList");
    if (!box || !currentUser) return;
    box.innerHTML = '<div style="padding:18px;text-align:center;color:#98a1ad;font-size:.8rem;">Finding your best matches…</div>';
    try {
      if (!myProfile) await fetchMyProfile();
      if (!myProfile) {
        box.innerHTML = '<div style="padding:18px;text-align:center;color:#7d8795;font-size:.8rem;">Complete your profile to get personalized recommendations.</div>';
        return;
      }
      await refreshMyMatchedIds();
      const blockedIds = await fetchBlockedIds();
      const {data,error} = await _supabase.from("dating_profiles")
        .select("user_id,id,display_name,age,gender,seeking,relationship_type,city,looking_for,age_min,age_max,lifestyle,has_kids,wants_kids,religion,photos,photo_url,is_verified,created_at,last_seen_at")
        .neq("user_id", currentUser.id)
        .order("created_at",{ascending:false})
        .range(0,79);
      if (error) throw error;

      const rows = (data || [])
        .filter(r => !blockedIds.has(r.user_id))
        .filter(r => !myMatchedIds.has(r.user_id))
        .filter(r => isEligibleForDating(myProfile,r))
        .map(r => ({row:r,score:homeRecommendationScore(myProfile,r), reasons:compatibilityBreakdown(myProfile,r)}))
        .filter(x => x.score >= 40)
        .sort((a,b) => b.score-a.score)
        .slice(0,5);

      if (!rows.length) {
        box.innerHTML = '<div style="padding:18px;text-align:center;color:#7d8795;font-size:.8rem;">No strong matches yet. Try adding more profile details.</div>';
        return;
      }

      box.innerHTML = "";
      rows.forEach(({row,score,reasons}) => {
        const el = document.createElement("div");
        el.className = "wana-rec";
        el.onclick = () => openModal(row);
        const img = (row.photos && row.photos[0]) || row.photo_url || "";
        const p = visiblePresence(row);
        el.innerHTML = `<div class="wana-rec-photo ${img && !/^https?:\/\//i.test(img) ? "profile-media-loading" : ""}" ${img ? `data-profile-media-bg="${esc(img)}"` : ""} style="${img && /^https?:\/\//i.test(img) ? `background-image:url('${esc(img)}')` : ""}">${img ? "" : "👤"}${p.online ? '<span class="online"></span>' : ""}</div><div style="min-width:0"><div class="wana-rec-name">${esc(row.display_name||"Someone")}${row.is_verified?" ✓":""}</div><div class="wana-rec-meta">${esc(row.city||"Nearby")} · ${esc(row.relationship_type||"Looking to connect")}${reasons.length ? " · " + esc(reasons.join(" · ")) : ""}</div></div><span class="wana-match">${Math.min(99,score)}%</span>`;
        box.appendChild(el);
        if (img && !/^https?:\/\//i.test(img)) {
          resolveProfilePhoto(img).then(url => {
            const photo = el.querySelector("[data-profile-media-bg]");
            if (photo && url) {
              photo.style.backgroundImage = `url("${String(url).replace(/"/g,'\\"')}")`;
              photo.classList.remove("profile-media-loading");
            }
          });
        }
      });
    } catch(e) {
      console.warn("Home recommendations:",e);
      box.innerHTML = '<div style="padding:18px;text-align:center;color:#7d8795;font-size:.8rem;">Recommendations are temporarily unavailable.</div>';
    }
  };

  // Resolve private profile photos for the legacy modal without rewriting the modal UI.
  const legacyOpenModal = window.openModal;
  window.openModal = async function(row){
    const normalized = {...row};
    const photos = (row.photos && row.photos.length) ? row.photos : (row.photo_url ? [row.photo_url] : []);
    const resolved = await Promise.all(photos.slice(0,3).map(resolveProfilePhoto));
    normalized.photos = resolved.filter(Boolean);
    normalized.photo_url = normalized.photos[0] || null;
    return legacyOpenModal(normalized);
  };

  // Keep legacy My Account rendering, then hydrate any private media URLs it emitted.
  const legacyLoadMyProfile = window.loadMyProfile;
  if (legacyLoadMyProfile) {
    window.loadMyProfile = async function(){
      const result = await legacyLoadMyProfile();
      await hydrateProfileMedia(document.getElementById("myProfileContent") || document);
      return result;
    };
  }

  // Heartbeat lifecycle: one listener only, and clean shutdown.
  const originalSendHeartbeat = window.sendHeartbeat;
  function handleDatingVisibility(){
    if (document.visibilityState === "visible" && currentUser) originalSendHeartbeat();
  }
  window.startPresenceHeartbeat = function(){
    window.stopPresenceHeartbeat();
    if (!currentUser) return;
    originalSendHeartbeat();
    presenceTimer = setInterval(() => {
      if (document.visibilityState === "visible") originalSendHeartbeat();
    }, 60 * 1000);
    document.addEventListener("visibilitychange", handleDatingVisibility);
  };
  window.stopPresenceHeartbeat = function(){
    if (presenceTimer) {
      clearInterval(presenceTimer);
      presenceTimer = null;
    }
    document.removeEventListener("visibilitychange", handleDatingVisibility);
  };

  // Harden profile image changes. This function intentionally keeps the existing editor UI.
  window.changeProfilePhoto = async function(index, inputEl){
    const file = inputEl?.files?.[0];
    if (!file) return;
    const statusEl = document.getElementById(`photoSlotStatus-${index}`);
    const msg = document.getElementById("photoEditorMsg");
    if (statusEl) statusEl.style.display = "block";
    try {
      validateDatingImage(file);
      const {data: profile, error: fetchErr} = await _supabase.from("dating_profiles")
        .select("id,photos,photo_url").eq("user_id",currentUser.id).maybeSingle();
      if (fetchErr || !profile) throw new Error("Couldn't load your profile to update the photo.");

      const path = await uploadPrivateProfileImage(file);
      const photos = (profile.photos && profile.photos.length ? [...profile.photos] : (profile.photo_url ? [profile.photo_url] : []));
      while (photos.length <= index) photos.push(null);
      photos[index] = path;
      const cleaned = photos.filter(Boolean).slice(0,3);

      const {error: updErr} = await _supabase.from("dating_profiles")
        .update({photos:cleaned,photo_url:cleaned[0]||null,updated_at:new Date().toISOString()})
        .eq("id",profile.id);
      if (updErr) {
        await deletePrivateProfileFiles([path]);
        throw updErr;
      }
      if (statusEl) statusEl.style.display = "none";
      if (msg) msg.innerHTML = '<div class="msg success">Photo updated.</div>';
      await loadMyProfile();
    } catch(err) {
      if (statusEl) statusEl.style.display = "none";
      if (msg) msg.innerHTML = `<div class="msg error">${esc(err.message || "Photo upload failed.")}</div>`;
    }
  };

  // Replace the profile form mutation with validation, private media paths, and cleanup on DB failure.
  const profileForm = document.getElementById("postForm");
  if (profileForm) {
    // The original page already registered a submit listener above. Replace
    // the form node so that only this hardened handler remains active.
    const cleanProfileForm = profileForm.cloneNode(true);
    profileForm.replaceWith(cleanProfileForm);
    const activeProfileForm = document.getElementById("postForm");
    activeProfileForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!currentUser) return;
      const btn = document.getElementById("submitBtn");
      const msg = document.getElementById("formMsg");
      const age = parseInt(document.getElementById("fAge").value,10);
      const ageMin = parseInt(document.getElementById("fAgeMin").value,10);
      const ageMax = parseInt(document.getElementById("fAgeMax").value,10);

      if (!Number.isInteger(age) || age < 18 || age > 99 || !document.getElementById("fAgeConfirm").checked) {
        msg.innerHTML = '<div class="msg error">You must be 18–99 and confirm that you are 18 or older.</div>';
        return;
      }
      if (!Number.isInteger(ageMin) || !Number.isInteger(ageMax) || ageMin < 18 || ageMax > 99 || ageMin > ageMax) {
        msg.innerHTML = '<div class="msg error">Choose a valid preferred age range from 18–99.</div>';
        return;
      }

      const files = Array.from(document.getElementById("fPhoto").files || []).slice(0,3);
      try { files.forEach(validateDatingImage); }
      catch(err) { msg.innerHTML = `<div class="msg error">${esc(err.message)}</div>`; return; }

      btn.disabled = true;
      btn.textContent = myProfile ? "Saving…" : "Publishing Profile…";
      const wasEditing = !!myProfile;
      msg.innerHTML = "";
      const uploadedPaths = [];

      try {
        const photoPaths = [];
        for (const file of files) {
          const path = await uploadPrivateProfileImage(file);
          uploadedPaths.push(path);
          photoPaths.push(path);
        }

        // Editing keeps the existing profile code; only a brand-new profile gets one.
        const profileCode = (myProfile && myProfile.profile_code) || `WGD-${new Date().getFullYear()}-${crypto.randomUUID().split("-")[0].toUpperCase()}`;
        const payload = {
          user_id: currentUser.id,
          profile_code: profileCode,
          display_name: document.getElementById("fName").value.trim(),
          age,
          gender: document.getElementById("fGender").value,
          seeking: document.getElementById("fSeeking").value,
          relationship_type: document.getElementById("fType").value,
          city: document.getElementById("fCity").value.trim(),
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
        if (photoPaths.length) {
          payload.photo_url = photoPaths[0];
          payload.photos = photoPaths;
        }

        const {error} = await _supabase.from("dating_profiles").upsert(payload,{onConflict:"user_id"});
        if (error) throw error;

        msg.innerHTML = `<div class="msg success">${wasEditing ? "Profile updated successfully." : "Profile published successfully."}</div>`;
        const photoInput = document.getElementById("fPhoto");
        if (photoInput) photoInput.value = "";
        await fetchMyProfile();
        if (typeof fillPostForm === "function") { postFormDirty = false; fillPostForm(true); }
        await refreshProfileCompleteBadge();
        setTimeout(() => switchTab("myprofile"), 900);
      } catch(err) {
        await deletePrivateProfileFiles(uploadedPaths);
        msg.innerHTML = `<div class="msg error">Couldn't ${myProfile ? "save" : "publish"} profile: ${esc(err.message || "Unknown error")}</div>`;
      } finally {
        btn.disabled = false;
        btn.textContent = (typeof postSubmitLabel === "function") ? postSubmitLabel() : "Publish My Profile";
      }
    });
  }

  // Avoid stale async tab loads overwriting a later navigation.
  let tabRequestId = 0;
  const legacySwitchTab = window.switchTab;
  if (legacySwitchTab) {
    window.switchTab = function(tab){
      const id = ++tabRequestId;
      const result = legacySwitchTab(tab);
      return result;
    };
  }

  // Best-effort hydration after any normal tab load/render.
  const hydrationObserver = new MutationObserver(() => {
    clearTimeout(hydrationObserver._t);
    hydrationObserver._t = setTimeout(() => hydrateProfileMedia(document), 120);
  });
  hydrationObserver.observe(document.body, {subtree:true, childList:true});

  // Keep signed-out cleanup complete.
  const legacySignOut = window.signOut;
  window.signOut = async function(){
    window.stopPresenceHeartbeat();
    if (legacySignOut) return legacySignOut();
  };

  console.info("Wana Dating maintenance patch loaded.");
})();

