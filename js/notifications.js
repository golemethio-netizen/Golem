// ============================================================
// notifications.js — bell panel, polling, realtime channels
// ============================================================

// Close the notification panel when clicking anywhere outside it
document.addEventListener("click", (e) => {
  const notifWrap = document.getElementById("notifWrap");
  if (notifWrap && !notifWrap.contains(e.target)) document.getElementById("notifPanel")?.classList.remove("open");
});

let notifPollTimer = null;

function startNotifPolling(){
  if (notifPollTimer) clearInterval(notifPollTimer);
  notifPollTimer = setInterval(() => {
    if (document.visibilityState === "visible" && currentUser) refreshNotifCount();
  }, 45 * 1000);
}

async function refreshNotifCount(){
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
      currentOpenThread.profileId === m.profile_id &&
      currentOpenThread.other === m.sender_id){
    currentOpenThread.messages.unshift(m);
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
    }, () => {
      refreshNotifCount();
      if (document.getElementById("notifPanel")?.classList.contains("open")) loadNotifications();
    })
    .subscribe();
}

function teardownRealtimeChannels(){
  if (messageRealtimeChannel){ _supabase.removeChannel(messageRealtimeChannel); messageRealtimeChannel = null; }
  if (notifRealtimeChannel){ _supabase.removeChannel(notifRealtimeChannel); notifRealtimeChannel = null; }
}

function notifIcon(type){
  return type === "match" ? "✨" : type === "like" ? "💛" : "💬";
}

function notifText(n){
  const name = n.actor_name || "Someone";
  if (n.type === "match") return `It's a match with ${esc(name)}!`;
  if (n.type === "like") return `${esc(name)} liked your profile`;
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
