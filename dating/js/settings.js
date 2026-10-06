// ============================================================
// settings.js — contact privacy, password change, blocked users
// ============================================================

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

    return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px;border:1px solid var(--line);border-radius:8px;margin-bottom:10px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:36px;height:36px;border-radius:50%;background:${photo ? `url('${esc(photo)}') center/cover` : "var(--paper)"};display:flex;align-items:center;justify-content:center;color:#aaa;border:1px solid var(--line);">${photo ? "" : "👤"}</div>
          <div style="font-weight:600;font-size:0.9rem;">${esc(name)}</div>
        </div>
        <button onclick="unblockUser('${b.id}')" style="background:var(--paper);border:1px solid var(--line);padding:6px 12px;border-radius:6px;font-size:0.8rem;font-weight:bold;cursor:pointer;color:#333;transition:0.2s;">Unblock</button>
      </div>
    `;
  }).join("");
}

async function unblockUser(blockId) {
  if(!confirm("Unblock this user? They will be able to see your profile and message you again if you match.")) return;
  await _supabase.from("dating_blocks").delete().eq("id", blockId);
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
