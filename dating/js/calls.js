/* Reserved for a future dependency-safe extraction. Existing functionality remains in app.js. */
/* =====================================================================
   Wana Dating — voice calls (rewrite, loaded AFTER app.js / the main script)

   Why this file exists. The original calls had no sound at all and no way
   to tell whether they worked:
     1. The caller sent its WebRTC "offer" immediately, but the other person
        only joined the signalling channel after pressing Answer — seconds
        later. Broadcasts aren't stored, so the offer was lost and the call
        never connected (silence, with the timer running).
     2. No ringtone / ringback, so nothing audible while ringing.
     3. The remote audio element was never explicitly played; Safari/iOS and
        some Chrome setups block autoplay, silently.
     4. Only a public STUN server — many mobile networks need a TURN relay.
     5. No status, so nobody could tell "connecting" from "connected" from
        "can't hear you".

   This file redefines the call functions (same names, so the existing
   buttons keep working) with:
     - a "ready" handshake: the caller only sends its offer once the callee
       has joined and is listening
     - buffered ICE candidates
     - a ringtone (incoming) and ringback tone (outgoing)
     - live status text, plus mic + speaker level meters so both people can
       SEE that sound is flowing
     - a "Tap to enable sound" fallback when the browser blocks autoplay
     - cancel / decline / no-answer handling on both sides
     - optional TURN servers: set GolemConfig.iceServers in config.js
   ===================================================================== */
(function () {
  "use strict";

  var RING_TIMEOUT_MS = 45000;      // unanswered calls stop ringing after this
  var NO_AUDIO_HINT_MS = 7000;      // after connecting, hint if nothing is heard

  function iceServers() {
    var list = [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun.cloudflare.com:3478" }
    ];
    try {
      if (typeof GolemConfig !== "undefined" && Array.isArray(GolemConfig.iceServers)) {
        list = list.concat(GolemConfig.iceServers); // TURN servers go here
      }
    } catch (e) {}
    return list;
  }

  // ---------------- sound ----------------
  var audioCtx = null;
  var toneTimer = null;
  var toneStopFns = [];

  function getCtx() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === "suspended") audioCtx.resume().catch(function () {});
      return audioCtx;
    } catch (e) { return null; }
  }

  function beep(freqs, durMs, vol) {
    var ctx = getCtx();
    if (!ctx) return;
    var gain = ctx.createGain();
    var t0 = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.03);
    gain.gain.setValueAtTime(vol, t0 + durMs / 1000 - 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durMs / 1000);
    gain.connect(ctx.destination);
    freqs.forEach(function (f) {
      var o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      o.connect(gain);
      o.start(t0);
      o.stop(t0 + durMs / 1000 + 0.02);
    });
  }

  function stopTones() {
    if (toneTimer) { clearInterval(toneTimer); toneTimer = null; }
    toneStopFns.forEach(function (fn) { try { fn(); } catch (e) {} });
    toneStopFns = [];
    try { if (navigator.vibrate) navigator.vibrate(0); } catch (e) {}
  }

  // Outgoing: classic "ring-ring ... pause" ringback.
  function startRingback() {
    stopTones();
    function pattern() { beep([440, 480], 1000, 0.12); }
    pattern();
    toneTimer = setInterval(pattern, 3000);
  }

  // Incoming: a two-note ring that repeats, plus vibration where supported.
  function startRingtone() {
    stopTones();
    function pattern() {
      beep([880], 220, 0.18);
      setTimeout(function () { beep([660], 220, 0.18); }, 260);
      setTimeout(function () { beep([880], 220, 0.18); }, 700);
      setTimeout(function () { beep([660], 220, 0.18); }, 960);
      try { if (navigator.vibrate) navigator.vibrate([300, 150, 300]); } catch (e) {}
    }
    pattern();
    toneTimer = setInterval(pattern, 2600);
  }

  function chime(kind) { // short end-of-call / connected feedback
    if (kind === "connected") { beep([660], 120, 0.12); setTimeout(function () { beep([880], 160, 0.12); }, 140); }
    else { beep([520], 160, 0.12); setTimeout(function () { beep([390], 240, 0.12); }, 180); }
  }

  // ---------------- state ----------------
  var pendingIce = [];
  var offerSent = false;
  var ringTimeout = null;
  var noAudioTimer = null;
  var disconnectTimer = null;
  var meterTimer = null;
  var meterNodes = [];
  var heardRemote = false;
  var callPeerName = "";
  var incomingTimeout = null;
  var iAmInitiator = false;
  var callEnding = false;

  function setStatus(text, color) {
    var el = document.getElementById("callStatusText");
    if (el) { el.textContent = text; el.style.color = color || ""; }
  }
  function setSub(text) {
    var el = document.getElementById("callSubText");
    if (el) el.textContent = text || "";
  }

  // ---------------- UI ----------------
  function cardHtml(name, statusHtml, actionsHtml, opts) {
    opts = opts || {};
    return '<div class="call-overlay" role="dialog" aria-live="polite" aria-label="Voice call">' +
      '<div class="call-card" style="max-width:340px;padding:0 16px;">' +
      '<div class="call-avatar"' + (opts.avatarStyle ? ' style="' + opts.avatarStyle + '"' : "") + '>📞</div>' +
      '<div class="call-name">' + esc(name) + "</div>" +
      statusHtml +
      '<div id="callSubText" style="font-size:.85rem;color:rgba(255,255,255,.7);min-height:22px;margin:-24px 0 18px;"></div>' +
      (opts.meters ? meterHtml() : "") +
      '<div class="call-actions">' + actionsHtml + "</div>" +
      '<button id="callSoundBtn" type="button" onclick="callEnableSound()" style="display:none;margin:18px auto 0;border:0;border-radius:999px;padding:10px 18px;font-weight:700;background:#fff;color:#2a1033;cursor:pointer;">🔊 Tap to enable sound</button>' +
      "</div></div>";
  }

  function meterHtml() {
    function bar(id, label) {
      return '<div style="display:flex;align-items:center;gap:10px;margin:6px 0;font-size:.8rem;color:rgba(255,255,255,.75);">' +
        '<span style="width:74px;text-align:left;">' + label + "</span>" +
        '<div style="flex:1;height:8px;background:rgba(255,255,255,.14);border-radius:6px;overflow:hidden;">' +
        '<div id="' + id + '" style="height:100%;width:0%;background:#2ecc71;border-radius:6px;transition:width .08s linear;"></div></div></div>';
    }
    return '<div style="margin:0 0 22px;">' + bar("meterMe", "🎙️ You") + bar("meterThem", "🔊 Them") + "</div>";
  }

  window.showOutgoingCallUI = function (name) {
    callPeerName = name;
    document.getElementById("callRoot").innerHTML = cardHtml(
      name,
      '<div class="call-status" id="callStatusText">Calling…</div>',
      '<button class="call-decline" onclick="endCall(true)">Cancel</button>'
    );
  };

  window.showActiveCallUI = function (name) {
    if (name) callPeerName = name;
    document.getElementById("callRoot").innerHTML = cardHtml(
      callPeerName || "In call",
      '<div class="call-status" id="callStatusText">Connecting…</div>',
      '<button class="call-mute" id="muteBtn" onclick="toggleMute()">🎙️ Mute</button>' +
      '<button class="call-decline" onclick="endCall(true)">Hang up</button>',
      { meters: true, avatarStyle: "background:rgba(46,204,113,.2);" }
    );
    startMeters();
  };

  function markConnected() {
    if (callStartedAt) return;
    stopTones();
    clearTimeout(ringTimeout); ringTimeout = null;
    if (!document.getElementById("muteBtn")) window.showActiveCallUI(callPeerName);
    chime("connected");
    callStartedAt = Date.now();
    setStatus("00:00", "#2ecc71");
    if (callTimer) clearInterval(callTimer);
    callTimer = setInterval(function () {
      var secs = Math.floor((Date.now() - callStartedAt) / 1000);
      var mm = String(Math.floor(secs / 60)).padStart(2, "0");
      var ss = String(secs % 60).padStart(2, "0");
      setStatus(mm + ":" + ss, "#2ecc71");
    }, 1000);
    clearTimeout(noAudioTimer);
    noAudioTimer = setTimeout(function () {
      if (!heardRemote && peerConnection) {
        setSub("You can't hear them? Check your volume, or ask them to unmute / allow the microphone.");
      }
    }, NO_AUDIO_HINT_MS);
  }

  // ---------------- level meters ----------------
  function makeAnalyser(stream) {
    var ctx = getCtx();
    if (!ctx || !stream) return null;
    try {
      var src = ctx.createMediaStreamSource(stream);
      var an = ctx.createAnalyser();
      an.fftSize = 256;
      src.connect(an); // analysis only — NOT connected to the speakers (no echo)
      meterNodes.push(src);
      return an;
    } catch (e) { return null; }
  }
  function level(an) {
    if (!an) return 0;
    var buf = new Uint8Array(an.fftSize);
    an.getByteTimeDomainData(buf);
    var peak = 0;
    for (var i = 0; i < buf.length; i++) { var v = Math.abs(buf[i] - 128) / 128; if (v > peak) peak = v; }
    return Math.min(1, peak * 2.2);
  }
  var meLevel = null, themLevel = null, statLevel = null, statTimer = null;
  function startMeters() {
    stopMeters();
    meLevel = localCallStream ? makeAnalyser(localCallStream) : null;
    var remote = document.getElementById("remoteAudio");
    themLevel = remote && remote.srcObject ? makeAnalyser(remote.srcObject) : null;
    // Remote level straight from WebRTC stats: more reliable than a Web Audio analyser on a
    // remote stream (which some browsers leave silent). The analyser is only the fallback.
    statTimer = setInterval(function () {
      if (!peerConnection || !peerConnection.getStats) return;
      peerConnection.getStats().then(function (rep) {
        rep.forEach(function (x) {
          if (x.type === "inbound-rtp" && (x.kind === "audio" || x.mediaType === "audio") && typeof x.audioLevel === "number") statLevel = x.audioLevel;
        });
      }).catch(function () {});
    }, 250);
    meterTimer = setInterval(function () {
      if (!meLevel && localCallStream) meLevel = makeAnalyser(localCallStream);
      if (!themLevel) { // remote stream may arrive after the UI
        var r = document.getElementById("remoteAudio");
        if (r && r.srcObject) themLevel = makeAnalyser(r.srcObject);
      }
      var me = document.getElementById("meterMe");
      var th = document.getElementById("meterThem");
      var lm = level(meLevel);
      var lt = (statLevel != null) ? Math.min(1, statLevel * 4) : level(themLevel);
      if (me) me.style.width = Math.round(lm * 100) + "%";
      if (th) th.style.width = Math.round(lt * 100) + "%";
      if (lt > 0.04 && !heardRemote) { heardRemote = true; setSub(""); }
    }, 90);
  }
  function stopMeters() {
    if (meterTimer) { clearInterval(meterTimer); meterTimer = null; }
    if (statTimer) { clearInterval(statTimer); statTimer = null; }
    statLevel = null;
    meterNodes.forEach(function (n) { try { n.disconnect(); } catch (e) {} });
    meterNodes = []; meLevel = null; themLevel = null;
  }

  // ---------------- remote audio playback ----------------
  window.callEnableSound = function () {
    getCtx();
    var a = document.getElementById("remoteAudio");
    if (a) a.play().then(function () {
      var b = document.getElementById("callSoundBtn"); if (b) b.style.display = "none";
    }).catch(function () {});
  };
  function playRemote(stream) {
    var a = document.getElementById("remoteAudio");
    if (!a) return;
    a.setAttribute("playsinline", "");
    a.autoplay = true;
    a.muted = false;
    a.volume = 1;
    a.srcObject = stream;
    var p = a.play();
    if (p && p.catch) p.catch(function () {
      var b = document.getElementById("callSoundBtn"); if (b) b.style.display = "inline-block";
      setSub("Your browser blocked the sound — tap the button below.");
    });
  }

  // ---------------- call flow ----------------
  function resetCallState() {
    pendingIce = []; offerSent = false; heardRemote = false; callEnding = false;
    clearTimeout(ringTimeout); ringTimeout = null;
    clearTimeout(noAudioTimer); noAudioTimer = null;
    clearTimeout(disconnectTimer); disconnectTimer = null;
    clearTimeout(incomingTimeout); incomingTimeout = null;
  }

  window.setupPersonalCallChannel = function () {
    if (personalCallChannel) return;
    personalCallChannel = _supabase.channel("call:" + currentUser.id);
    personalCallChannel.on("broadcast", { event: "ring" }, function (msg) {
      window.showIncomingCallUI(msg.payload);
    });
    // The caller hung up before we answered.
    personalCallChannel.on("broadcast", { event: "cancel" }, function (msg) {
      var p = msg && msg.payload;
      if (p && p.callId && p.callId === currentCallId && !peerConnection) {
        stopTones(); clearTimeout(incomingTimeout);
        document.getElementById("callRoot").innerHTML = "";
        currentCallId = null; currentCallPeerId = null;
        flashNotice("Missed call from " + (callPeerName || "someone"));
      }
    });
    personalCallChannel.subscribe();
  };

  function flashNotice(text) {
    var d = document.createElement("div");
    d.setAttribute("role", "status");
    d.textContent = text;
    d.style.cssText = "position:fixed;left:50%;top:76px;transform:translateX(-50%);z-index:9500;background:#2a1033;color:#fff;padding:10px 18px;border-radius:999px;font-weight:600;box-shadow:0 8px 30px rgba(0,0,0,.25);max-width:90vw;text-align:center;";
    document.body.appendChild(d);
    setTimeout(function () { d.remove(); }, 4000);
  }

  window.startCall = async function (recipientId, recipientName) {
    recipientName = recipientName != null ? recipientName : ((window._threadNames && window._threadNames[recipientId]) || "Conversation");
    if (peerConnection || callStartedAt || document.querySelector("#callRoot .call-overlay")) { alert("You're already in a call."); return; }
    if (!(await requireProfile("make calls"))) return;
    if (!isPlatinumActive(myProfile)) {
      alert("Voice calls are a Platinum feature. Upgrade to Platinum to start calling your matches.");
      return;
    }
    getCtx(); // unlock audio inside this click so tones and remote sound are allowed
    resetCallState();
    iAmInitiator = true;
    currentCallId = (crypto.randomUUID ? crypto.randomUUID() : currentUser.id + "-" + Date.now());
    currentCallPeerId = recipientId;
    callPeerName = recipientName;

    var ins = await _supabase.from("dating_calls").insert({
      caller_id: currentUser.id, recipient_id: recipientId, status: "ringing"
    }).select().single();
    if (ins.error) {
      alert("Couldn't start the call: " + ins.error.message);
      currentCallId = null; currentCallPeerId = null;
      return;
    }
    currentCallRow = ins.data;

    window.showOutgoingCallUI(recipientName);
    startRingback();

    var myName = (currentUser.user_metadata && currentUser.user_metadata.full_name) || "Someone";
    var notifyChan = _supabase.channel("call:" + recipientId);
    await new Promise(function (res) { notifyChan.subscribe(function (s) { if (s === "SUBSCRIBED") res(); }); });
    notifyChan.send({ type: "broadcast", event: "ring",
      payload: { callId: currentCallId, callerId: currentUser.id, callerName: myName } });
    // keep this channel for a possible "cancel"
    window.__callNotifyChan = notifyChan;

    ringTimeout = setTimeout(function () {
      if (!callStartedAt) { flashNotice("No answer"); window.endCall(true); }
    }, RING_TIMEOUT_MS);

    await window.joinCallSignaling(currentCallId, true);
  };

  window.showIncomingCallUI = async function (payload) {
    if (peerConnection || document.querySelector("#callRoot .call-overlay")) return;
    if (!payload || !(await isLegitimateIncomingCall(payload.callerId))) return;
    resetCallState();
    iAmInitiator = false;
    currentCallId = payload.callId;
    currentCallPeerId = payload.callerId;
    callPeerName = payload.callerName || "Someone";
    document.getElementById("callRoot").innerHTML = cardHtml(
      callPeerName,
      '<div class="call-status" id="callStatusText">Incoming call…</div>',
      '<button class="call-accept" onclick="acceptCall()">Answer</button>' +
      '<button class="call-decline" onclick="declineCall()">Decline</button>'
    );
    startRingtone();
    // If the browser blocked the ringtone (no interaction yet), say so.
    var ctx = getCtx();
    if (ctx && ctx.state !== "running") setSub("Tap anywhere to hear the ring");
    incomingTimeout = setTimeout(function () {
      if (!peerConnection) {
        stopTones();
        document.getElementById("callRoot").innerHTML = "";
        currentCallId = null; currentCallPeerId = null;
      }
    }, RING_TIMEOUT_MS + 5000);
  };

  window.acceptCall = async function () {
    getCtx();
    stopTones();
    clearTimeout(incomingTimeout);
    var r = await _supabase.from("dating_calls").select("*")
      .eq("caller_id", currentCallPeerId).eq("recipient_id", currentUser.id).eq("status", "ringing")
      .order("started_at", { ascending: false }).limit(1).maybeSingle();
    currentCallRow = r.data;
    if (!currentCallRow) {
      document.getElementById("callRoot").innerHTML = "";
      currentCallId = null; currentCallPeerId = null;
      alert("This call is no longer available.");
      return;
    }
    await _supabase.from("dating_calls").update({ status: "accepted" }).eq("id", currentCallRow.id);
    window.showActiveCallUI(callPeerName);
    setStatus("Connecting…");
    await window.joinCallSignaling(currentCallId, false);
  };

  window.declineCall = async function () {
    stopTones();
    clearTimeout(incomingTimeout);
    var chan = _supabase.channel("callsig:" + currentCallId);
    await new Promise(function (res) { chan.subscribe(function (s) { if (s === "SUBSCRIBED") res(); }); });
    chan.send({ type: "broadcast", event: "signal", payload: { type: "hangup", reason: "declined", from: currentUser.id } });
    _supabase.removeChannel(chan);
    var r = await _supabase.from("dating_calls").select("*")
      .eq("caller_id", currentCallPeerId).eq("recipient_id", currentUser.id).eq("status", "ringing")
      .order("started_at", { ascending: false }).limit(1).maybeSingle();
    if (r.data) await _supabase.from("dating_calls").update({ status: "declined", ended_at: new Date().toISOString() }).eq("id", r.data.id);
    document.getElementById("callRoot").innerHTML = "";
    currentCallId = null; currentCallPeerId = null;
  };

  async function flushIce() {
    var list = pendingIce; pendingIce = [];
    for (var i = 0; i < list.length; i++) {
      try { await peerConnection.addIceCandidate(list[i]); } catch (e) {}
    }
  }

  async function sendOffer() {
    if (offerSent || !peerConnection) return;
    offerSent = true;
    var offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    window.sendSignal({ type: "offer", sdp: offer });
  }

  window.joinCallSignaling = async function (callId, isInitiator) {
    iAmInitiator = isInitiator;
    activeCallChannel = _supabase.channel("callsig:" + callId);
    activeCallChannel.on("broadcast", { event: "signal" }, async function (msg) {
      var data = msg.payload;
      if (!data || data.from === currentUser.id || !peerConnection) return;
      try {
        if (data.type === "ready" && isInitiator) {
          setStatus("Ringing…");
          await sendOffer();
        } else if (data.type === "answer" && isInitiator) {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
          await flushIce();
          stopTones();
          setStatus("Connecting…");
          if (!document.getElementById("muteBtn")) window.showActiveCallUI(callPeerName);
          setStatus("Connecting…");
        } else if (data.type === "offer" && !isInitiator) {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
          await flushIce();
          var answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          window.sendSignal({ type: "answer", sdp: answer });
        } else if (data.type === "ice") {
          if (peerConnection.remoteDescription && peerConnection.remoteDescription.type) {
            try { await peerConnection.addIceCandidate(data.candidate); } catch (e) {}
          } else {
            pendingIce.push(data.candidate);
          }
        } else if (data.type === "hangup") {
          var declined = data.reason === "declined";
          flashNotice(declined ? (callPeerName || "They") + " declined the call" : "Call ended");
          window.endCall(false, true);
        }
      } catch (err) {
        console.error("Call signalling error:", err);
      }
    });
    await new Promise(function (res) { activeCallChannel.subscribe(function (s) { if (s === "SUBSCRIBED") res(); }); });

    try {
      localCallStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
    } catch (err) {
      alert("Couldn't access the microphone: " + (err && err.message ? err.message : err) +
        "\n\nAllow microphone access for this site in your browser settings and try again.");
      window.endCall(true);
      return;
    }

    peerConnection = new RTCPeerConnection({ iceServers: iceServers() });
    localCallStream.getTracks().forEach(function (t) { peerConnection.addTrack(t, localCallStream); });
    peerConnection.ontrack = function (e) {
      playRemote(e.streams && e.streams[0] ? e.streams[0] : new MediaStream([e.track]));
      startMeters();
    };
    peerConnection.onicecandidate = function (e) {
      if (e.candidate) window.sendSignal({ type: "ice", candidate: e.candidate.toJSON ? e.candidate.toJSON() : e.candidate });
    };
    peerConnection.oniceconnectionstatechange = function () {
      if (!peerConnection) return;
      var s = peerConnection.iceConnectionState;
      if (s === "connected" || s === "completed") {
        clearTimeout(disconnectTimer); disconnectTimer = null;
        markConnected();
        setSub(heardRemote ? "" : "");
      } else if (s === "disconnected") {
        setStatus("Reconnecting…", "#f5b971");
        clearTimeout(disconnectTimer);
        disconnectTimer = setTimeout(function () {
          if (peerConnection && peerConnection.iceConnectionState !== "connected") {
            flashNotice("Connection lost"); window.endCall(true);
          }
        }, 8000);
      } else if (s === "failed") {
        setStatus("Couldn't connect", "#ff8a8a");
        setSub("Your network may be blocking voice calls. Try Wi-Fi or another network.");
        setTimeout(function () { window.endCall(true); }, 3500);
      }
    };

    if (isInitiator) {
      // Wait for the callee's "ready" before sending the offer (see header).
      setStatus("Calling…");
    } else {
      window.sendSignal({ type: "ready" });
    }
  };

  window.sendSignal = function (data) {
    if (!activeCallChannel) return;
    activeCallChannel.send({ type: "broadcast", event: "signal", payload: Object.assign({}, data, { from: currentUser.id }) });
  };

  window.toggleMute = function () {
    if (!localCallStream) return;
    var track = localCallStream.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    var btn = document.getElementById("muteBtn");
    if (btn) btn.textContent = track.enabled ? "🎙️ Mute" : "🔇 Unmute";
    setSub(track.enabled ? "" : "Your microphone is muted");
  };

  window.endCall = async function (notifyPeer, remoteEnded) {
    if (callEnding) return;
    callEnding = true;
    var wasRinging = !callStartedAt;
    if (notifyPeer) window.sendSignal({ type: "hangup" });
    // A caller cancelling before the other side answered: also tell their ring screen.
    if (notifyPeer && iAmInitiator && wasRinging && window.__callNotifyChan) {
      try { window.__callNotifyChan.send({ type: "broadcast", event: "cancel", payload: { callId: currentCallId } }); } catch (e) {}
    }
    if (window.__callNotifyChan) {
      var nc = window.__callNotifyChan; window.__callNotifyChan = null;
      setTimeout(function () { try { _supabase.removeChannel(nc); } catch (e) {} }, 600);
    }
    stopTones();
    if (!wasRinging) chime("end");
    stopMeters();
    if (callTimer) { clearInterval(callTimer); callTimer = null; }
    clearTimeout(ringTimeout); clearTimeout(noAudioTimer); clearTimeout(disconnectTimer); clearTimeout(incomingTimeout);
    if (peerConnection) { try { peerConnection.close(); } catch (e) {} peerConnection = null; }
    if (localCallStream) { localCallStream.getTracks().forEach(function (t) { t.stop(); }); localCallStream = null; }
    if (activeCallChannel) { var ac = activeCallChannel; activeCallChannel = null; setTimeout(function () { try { _supabase.removeChannel(ac); } catch (e) {} }, 300); }
    var ra = document.getElementById("remoteAudio"); if (ra) ra.srcObject = null;
    document.getElementById("callRoot").innerHTML = "";

    if (currentCallRow) {
      try { await _supabase.from("dating_calls").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", currentCallRow.id); } catch (e) {}
    }
    currentCallId = null; currentCallPeerId = null; currentCallRow = null; callStartedAt = null;
    pendingIce = []; offerSent = false; heardRemote = false;
  };

  // Auth may already have finished (and subscribed the ORIGINAL ring listener) before this
  // file loaded: replace that channel so the new ring/cancel handlers are the ones listening.
  try {
    if (typeof personalCallChannel !== "undefined" && personalCallChannel) {
      _supabase.removeChannel(personalCallChannel);
      personalCallChannel = null;
      if (typeof currentUser !== "undefined" && currentUser) window.setupPersonalCallChannel();
    }
  } catch (e) { console.warn("calls.js: could not refresh call channel", e); }

  // Browsers only allow sound after a user gesture: unlock on the first tap/click anywhere.
  ["pointerdown", "keydown", "touchstart"].forEach(function (ev) {
    document.addEventListener(ev, function () { getCtx(); }, { once: false, passive: true });
  });
})();
