
// ---------- Profile completeness ----------
function computeProfileCompleteness(data){
  const checklist = [
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
    .select("bio, looking_for, age_min, age_max, lifestyle, has_kids, wants_kids, religion")
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

  const path = `${currentUser.id}-${Date.now()}-${file.name}`;
  const { error: uploadErr } = await _supabase.storage.from(BUCKET_PROFILE_PHOTOS).upload(path, file);
  if (uploadErr){
    if (statusEl) statusEl.style.display = "none";
    msg.innerHTML = `<div class="msg error">Upload failed: ${esc(uploadErr.message)}</div>`;
    return;
  }
  const { data: pub } = _supabase.storage.from(BUCKET_PROFILE_PHOTOS).getPublicUrl(path);

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

// ---------- My Profile tab ----------
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

// ---------- Report / Block ----------
async function reportProfile(profileId){
  const reason = prompt("What is the issue with this profile?");
  if (!reason) return;
  const { error } = await _supabase.from("dating_reports").insert({
    reported_profile_id: profileId,
    reporter_id: currentUser.id,
    reason
  });
  alert(error ? "Couldn't submit report, please try again." : "Report submitted successfully. Thank you.");
  closeModal();
}

async function blockProfile(otherUserId){
  if (!confirm("Block this person? They won't be able to message you, and any match will end. You can't undo this from here.")) return;
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

// ---------- Setup Profile form ----------
document.getElementById("postForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("submitBtn");
  const msg = document.getElementById("formMsg");
  msg.innerHTML = "";

  const age = parseInt(document.getElementById("fAge").value, 10);
  const ageConfirmed = document.getElementById("fAgeConfirm").checked;
  if (age < 18 || !ageConfirmed){
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
  btn.textContent = "Publishing Profile...";

  let photoUrls = [];
  const files = Array.from(document.getElementById("fPhoto").files).slice(0, 3);
  for (const file of files){
    const path = `${currentUser.id}-${Date.now()}-${file.name}`;
    const { error: uploadErr } = await _supabase.storage.from(BUCKET_PROFILE_PHOTOS).upload(path, file);
    if (uploadErr){
      msg.innerHTML = `<div class="msg error">Photo upload failed: ${uploadErr.message}</div>`;
      btn.disabled = false; btn.textContent = "Publish My Profile";
      return;
    }
    const { data: pub } = _supabase.storage.from(BUCKET_PROFILE_PHOTOS).getPublicUrl(path);
    photoUrls.push(pub.publicUrl);
  }

  const profileCode = `WGD-${new Date().getFullYear()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
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
  btn.textContent = "Publish My Profile";

  if (error){
    msg.innerHTML = `<div class="msg error">Something went wrong: ${error.message}</div>`;
  } else {
    msg.innerHTML = `<div class="msg success">Profile Published Successfully!</div>`;
    document.getElementById("postForm").reset();
    fetchMyProfile();
    setTimeout(() => switchTab("myprofile"), 1500);
  }
});
