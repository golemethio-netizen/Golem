// ============================================================
// calls.js — WebRTC voice calls over Supabase broadcast channels
// ============================================================

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

  const myName = currentUser.user_metadata?.full_name || "Someone";
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
