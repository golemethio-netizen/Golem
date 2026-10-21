/* Original script block 5 */

(function(){
  "use strict";
  const state={dateFilter:"upcoming",matchMode:"all"};
  const originalSwitchTab=window.switchTab;
  const originalToggleLang=window.toggleLang;
  const extraPanels=["compatibilityPanel","dateplansPanel","safetyPanel"];
  const norm=v=>String(v||"").trim().toLowerCase();
  const esc2=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const today=()=>{const d=new Date();const p=n=>String(n).padStart(2,"0");return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`}; // local calendar date; toISOString() is UTC, which is up to 3h off from Ethiopian local time

  function isEligible(me,p){
    if(!me||!p) return false;
    const mySeeking=norm(me.seeking||"any"), theirGender=norm(p.gender), theirSeeking=norm(p.seeking||"any"), myGender=norm(me.gender);
    if(mySeeking!=="any" && mySeeking!==theirGender) return false;
    if(theirSeeking!=="any" && theirSeeking!==myGender) return false;
    const n=v=>(v===null||v===undefined||v==="")?NaN:Number(v); // Number(null) is 0 - keep "missing" as NaN
    const age=n(p.age), myAge=n(me.age), myMin=n(me.age_min), myMax=n(me.age_max), pMin=n(p.age_min), pMax=n(p.age_max);
    if(Number.isFinite(age)&&Number.isFinite(myMin)&&Number.isFinite(myMax)&&!(age>=myMin&&age<=myMax)) return false;
    if(Number.isFinite(myAge)&&Number.isFinite(pMin)&&Number.isFinite(pMax)&&!(myAge>=pMin&&myAge<=pMax)) return false;
    return true;
  }

  function scoreMatch(me,p){
    if(!isEligible(me,p)) return {score:0,reasons:[],mutual:0};
    let score=30; const reasons=[]; const add=(n,r)=>{score+=n;if(r&&!reasons.includes(r))reasons.push(r)};
    const genderFit = norm(me.seeking)==="any" || norm(me.seeking)===norm(p.gender);
    if(genderFit) add(12,"Gender preference fit");
    if(norm(me.relationship_type)&&norm(me.relationship_type)===norm(p.relationship_type)) add(16,"Same relationship goal");
    if(norm(me.looking_for)&&norm(me.looking_for)===norm(p.looking_for)) add(10,"Similar relationship preference");
    if(norm(me.lifestyle)&&norm(me.lifestyle)===norm(p.lifestyle)) add(10,"Similar lifestyle");
    if(norm(me.wants_kids)&&norm(me.wants_kids)===norm(p.wants_kids)) add(9,"Family plans align");
    if(norm(me.has_kids)&&norm(me.has_kids)===norm(p.has_kids)) add(5,"Similar family situation");
    if(norm(me.religion)&&norm(me.religion)!=="prefer not to say"&&norm(me.religion)===norm(p.religion)) add(7,"Shared faith");
    if(norm(me.city)&&norm(me.city)===norm(p.city)) add(6,"Same city");
    if(p.is_verified) add(3,"Verified profile");
    if(typeof visiblePresence==="function"&&visiblePresence(p).online) add(2,"Online now");
    if(p.created_at&&Date.now()-new Date(p.created_at).getTime()<7*86400000) add(2,"New member");
    const nn=v=>(v===null||v===undefined||v==="")?NaN:Number(v);
    const mutual=(Number.isFinite(nn(me.age))&&Number.isFinite(nn(p.age))&&Number.isFinite(nn(me.age_min))&&Number.isFinite(nn(me.age_max))&&nn(p.age)>=nn(me.age_min)&&nn(p.age)<=nn(me.age_max)&&Number.isFinite(nn(p.age_min))&&Number.isFinite(nn(p.age_max))&&nn(me.age)>=nn(p.age_min)&&nn(me.age)<=nn(p.age_max))?10:0;
    score=Math.min(99,score+mutual);
    if(mutual) reasons.unshift("Mutual age preference fit");
    return {score,reasons:reasons.slice(0,4),mutual};
  }

  function matchCard(p,r){
    const photo=(p.photos&&p.photos[0])||p.photo_url||""; const card=document.createElement("div"); card.className="card compat-card";
    const presence=typeof visiblePresence==="function"?visiblePresence(p):{online:false};
    card.innerHTML=`<div class="compat-score">❤️ ${r.score}% match</div><div class="photo ${photo && !/^https?:\/\//i.test(photo) ? "profile-media-loading" : ""}">${photo ? `<img data-smart-match-photo src="${/^https?:\/\//i.test(photo)?esc2(photo):""}" alt="" style="width:100%;height:100%;object-fit:cover;">` : "👤"}${p.is_verified?'<span style="position:absolute;left:10px;bottom:10px" class="verified-badge">✓ Verified</span>':""}</div><div class="info"><div class="name-age">${esc2(p.display_name||"Someone")} <span class="age">${p.age?esc2(p.age):""}</span></div><div class="meta">${esc2(p.city||"Ethiopia")} · ${esc2(p.relationship_type||"Dating")}${presence.online?' · 🟢 Online now':''}</div><div class="compat-reasons">${r.reasons.map(x=>`<span class="compat-reason">${esc2(x)}</span>`).join("")}</div><div class="match-explain">Strongest reason: ${esc2(r.reasons[0]||"Your preferences are compatible.")}</div></div>`;
    if(photo && !/^https?:\/\//i.test(photo)){resolvePrivateUrl(BUCKET_PROFILE_PHOTOS,photo).then(url=>{const img=card.querySelector("[data-smart-match-photo]");if(img&&url){img.src=url;img.parentElement.classList.remove("profile-media-loading")}})}
    card.addEventListener("click",()=>window.openModal&&window.openModal(p)); return card;
  }

  async function loadCompatibility(){
    const grid=document.getElementById("compatibilityGrid"), empty=document.getElementById("compatibilityEmpty"), summary=document.getElementById("compatibilitySummary");
    if(!grid||!currentUser)return; grid.innerHTML='<div class="empty">Finding your strongest mutual matches…</div>'; if(empty)empty.style.display="none";
    try{
      let me=myProfile; if(!me){const q=await _supabase.from("dating_profiles").select("*").eq("user_id",currentUser.id).maybeSingle();me=q.data||null}
      if(!me){grid.innerHTML="";empty.style.display="block";summary.innerHTML="";return}
      const blocked=typeof fetchBlockedIds==="function"?await fetchBlockedIds():new Set();
      const {data,error}=await _supabase.from("dating_profiles").select("*").neq("user_id",currentUser.id).limit(160); if(error)throw error;
      let rows=(data||[]).filter(p=>!blocked.has(p.user_id)).map(p=>({p,r:scoreMatch(me,p)})).filter(x=>x.r.score>=35);
      if(state.matchMode==="verified")rows=rows.filter(x=>x.p.is_verified); if(state.matchMode==="online")rows=rows.filter(x=>typeof visiblePresence==="function"&&visiblePresence(x.p).online);
      rows.sort((a,b)=>b.r.score-a.r.score); rows=rows.slice(0,16); grid.innerHTML="";
      if(!rows.length){empty.style.display="block";summary.innerHTML="";return}
      const avg=Math.round(rows.reduce((a,x)=>a+x.r.score,0)/rows.length), mutual=rows.filter(x=>x.r.mutual).length, verified=rows.filter(x=>x.p.is_verified).length;
      summary.innerHTML=`<div class="compat-stat"><strong>${avg}%</strong><span>Average compatibility</span></div><div class="compat-stat"><strong>${rows.length}</strong><span>Strong matches</span></div><div class="compat-stat"><strong>${mutual}</strong><span>Mutual preference fits</span></div><div class="compat-stat"><strong>${verified}</strong><span>Verified matches</span></div>`;
      rows.forEach(x=>grid.appendChild(matchCard(x.p,x.r)));
    }catch(e){console.warn("Smart Match 2.0",e);grid.innerHTML='<div class="msg error">Smart matches are temporarily unavailable.</div>'}
  }

  window.setMatchMode=function(mode,btn){state.matchMode=mode;document.querySelectorAll("[data-match-mode]").forEach(b=>b.classList.toggle("active",b.dataset.matchMode===mode));loadCompatibility()};

  function dateStatusLabel(s){return s||"pending"}
  function formatDate(d,t){if(!d)return "Date not set"; const dt=new Date(`${d}T${t||"12:00"}`); return isNaN(dt)?`${d}${t?` · ${t}`:""}`:dt.toLocaleString(undefined,{weekday:"short",month:"short",day:"numeric",year:"numeric",hour:t?"numeric":undefined,minute:t?"2-digit":undefined})}
  function escapeAttr(v){return esc2(v).replace(/`/g,"&#96;")}

  window.openDatePlanModal=function(recipientId,recipientName){
    if(!currentUser){return} const root=document.getElementById("modalRoot"); if(!root)return;
    root.innerHTML=`<div class="modal-backdrop" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:540px"><div class="body"><button class="btn-close" onclick="closeModal()">✕</button><h3>📅 Schedule a Date with ${esc2(recipientName||"your match")}</h3><p class="bio">Choose an in-person meetup or an online date. Online dates are scheduled events; share a meeting link only if you trust the platform and recipient.</p><form id="datePlanForm"><label>Date</label><input id="datePlanDate" type="date" min="${today()}" required style="width:100%;padding:11px;border:1px solid var(--line);border-radius:9px;margin:6px 0 12px"><label>Time</label><input id="datePlanTime" type="time" required style="width:100%;padding:11px;border:1px solid var(--line);border-radius:9px;margin:6px 0 12px"><label>Date type</label><select id="datePlanMode" required style="width:100%;padding:11px;border:1px solid var(--line);border-radius:9px;margin:6px 0 12px"><option value="in_person">In person</option><option value="online">Online date</option></select><div id="onlineDateFields" style="display:none"><label>Online platform</label><select id="datePlanPlatform" style="width:100%;padding:11px;border:1px solid var(--line);border-radius:9px;margin:6px 0 12px"><option value="Wana voice call">Wana voice call</option><option value="Google Meet">Google Meet</option><option value="Zoom">Zoom</option><option value="Telegram">Telegram</option><option value="Other">Other</option></select><label>Meeting link / room (optional)</label><input id="datePlanMeetingLink" maxlength="500" placeholder="Optional meeting link" style="width:100%;padding:11px;border:1px solid var(--line);border-radius:9px;margin:6px 0 12px"></div><div id="inPersonFields"><label>Place / venue</label><input id="datePlanLocation" maxlength="120" placeholder="e.g. public café" style="width:100%;padding:11px;border:1px solid var(--line);border-radius:9px;margin:6px 0 12px"><label>City</label><input id="datePlanCity" maxlength="80" value="${escapeAttr(myProfile?.city||"")}" placeholder="Addis Ababa" style="width:100%;padding:11px;border:1px solid var(--line);border-radius:9px;margin:6px 0 12px"></div><label>Notes (optional)</label><textarea id="datePlanNotes" maxlength="500" placeholder="Anything your match should know?" style="width:100%;min-height:90px;padding:11px;border:1px solid var(--line);border-radius:9px;margin:6px 0 12px"></textarea><div id="datePlanMsg"></div><div class="actions"><button type="button" class="btn-report" onclick="closeModal()">Cancel</button><button class="btn-contact" type="submit" style="background:#6651a6;color:#fff">Send Date Invitation 📅</button></div></form></div></div></div>`;
    const mode=document.getElementById("datePlanMode");
    mode.addEventListener("change",()=>{const online=mode.value==="online";document.getElementById("onlineDateFields").style.display=online?"block":"none";document.getElementById("inPersonFields").style.display=online?"none":"block";document.getElementById("datePlanLocation").required=!online;});
    document.getElementById("datePlanForm").addEventListener("submit",e=>createDatePlan(e,recipientId,recipientName));
  };

  async function createDatePlan(e,recipientId,recipientName){
    e.preventDefault(); const msg=document.getElementById("datePlanMsg"); const btn=e.currentTarget.querySelector("button[type=submit]");
    if(!(await requireProfile("plan a date")))return;
    if(!(await checkMatch(recipientId))){msg.innerHTML='<div class="msg error">Date planning is available after a mutual match.</div>';return}
    const date_on=document.getElementById("datePlanDate").value, start_time=document.getElementById("datePlanTime").value, mode=document.getElementById("datePlanMode").value, location_name=document.getElementById("datePlanLocation").value.trim(), city=document.getElementById("datePlanCity").value.trim(), platform=document.getElementById("datePlanPlatform")?.value||null, meeting_link=document.getElementById("datePlanMeetingLink")?.value.trim()||null, notes=document.getElementById("datePlanNotes").value.trim();
    if(!date_on||!start_time){msg.innerHTML='<div class="msg error">Choose a date and time.</div>';return}
    if(mode==="in_person"&&!location_name){msg.innerHTML='<div class="msg error">Choose a public place for an in-person date.</div>';return}
    if(meeting_link && !/^https:\/\//i.test(meeting_link)){msg.innerHTML='<div class="msg error">Meeting links must use HTTPS.</div>';return}
    btn.disabled=true;btn.textContent="Sending…";
    const {data,error}=await _supabase.rpc("dating_create_date_plan_v2",{p_recipient_id:recipientId,p_date_on:date_on,p_start_time:start_time,p_mode:mode,p_location_name:mode==="online"?null:location_name,p_city:city||null,p_online_platform:mode==="online"?platform:null,p_meeting_link:mode==="online"?meeting_link:null,p_notes:notes||null,p_title:`Date with ${recipientName||"your match"}`});
    if(error){msg.innerHTML=`<div class="msg error">Could not create the date invitation: ${esc2(error.message)}. If the database migration has not been run, install the Smart Match 2.0 migration.</div>`;btn.disabled=false;btn.textContent="Send Date Invitation 📅";return}
    closeModal(); switchTab("dateplans"); await loadDatePlans(); refreshDatePlanBadge();
  }
  window.createDatePlan=createDatePlan;

  async function loadDatePlans(){
    const list=document.getElementById("datePlansList"),summary=document.getElementById("datePlanSummary"); if(!list||!currentUser)return;
    list.innerHTML='<div class="date-plan-empty">Loading your date plans…</div>';
    try{
      const {data,error}=await _supabase.from("dating_date_plans").select("*").or(`creator_id.eq.${currentUser.id},recipient_id.eq.${currentUser.id}`).order("date_on",{ascending:true}).order("start_time",{ascending:true}).limit(100); if(error)throw error;
      const rows=data||[], upcoming=rows.filter(x=>x.date_on>=today()&&!["declined","cancelled","completed"].includes(x.status)), pending=rows.filter(x=>x.status==="pending"&&x.recipient_id===currentUser.id);
      summary.innerHTML=`<div class="compat-stat"><strong>${upcoming.length}</strong><span>Upcoming dates</span></div><div class="compat-stat"><strong>${pending.length}</strong><span>Needs your response</span></div><div class="compat-stat"><strong>${rows.filter(x=>x.status==="accepted").length}</strong><span>Confirmed</span></div>`;
      let visible=rows;
      if(state.dateFilter==="upcoming")visible=upcoming; else if(state.dateFilter==="pending")visible=pending;
      if(!visible.length){list.innerHTML='<div class="date-plan-empty">No date plans in this view yet.<br><button type="button" class="date-plan-primary" style="margin-top:12px" onclick="switchTab(\'compatibility\')">Find a match ❤️</button></div>';return}
      list.innerHTML=""; visible.forEach(plan=>list.appendChild(datePlanCard(plan)));
    }catch(e){console.warn("Date plans",e);list.innerHTML=`<div class="msg error">Date plans could not be loaded: ${esc2(e.message)}</div>`}
  }
  window.loadDatePlans=loadDatePlans;

  function datePlanCard(plan){
    const card=document.createElement("article");card.className="date-plan-card";
    const mine=plan.creator_id===currentUser.id; const counterpart=mine?plan.recipient_id:plan.creator_id; const isPending=plan.status==="pending";
    card.innerHTML=`<div class="date-plan-head"><div><div class="date-plan-title">${esc2(plan.title||"Date invitation")}</div><div style="margin-top:5px;color:#7a8491;font-size:.75rem">${mine?"You sent this invitation":"You received this invitation"}</div></div><span class="date-plan-status ${esc2(plan.status)}">${esc2(dateStatusLabel(plan.status))}</span></div><div class="date-plan-meta"><div>📅 ${esc2(formatDate(plan.date_on,plan.start_time))}</div>${plan.mode==="online"?`<div>💻 Online · ${esc2(plan.online_platform||"Online date")}</div>${plan.meeting_link?`<div>🔗 <a href="${escapeAttr(plan.meeting_link)}" target="_blank" rel="noopener noreferrer">Open meeting link</a></div>`:""}`:`<div>📍 ${esc2(plan.location_name||"Public place")}</div>${plan.city?`<div>🏙️ ${esc2(plan.city)}</div>`:""}`}<div>${plan.mode==="online"?"🛡️ Keep personal details private and use a trusted platform":"🛡️ First meetings: choose a public place"}</div></div>${plan.notes?`<div class="date-plan-notes">${esc2(plan.notes)}</div>`:""}`;
    const actions=document.createElement("div");actions.className="date-plan-actions";
    if(!mine&&isPending){actions.innerHTML='<button class="date-plan-primary">Accept</button><button class="date-plan-secondary">Decline</button>';} else if(mine&&isPending){actions.innerHTML='<button class="date-plan-danger">Cancel invitation</button>';} else if(plan.status==="accepted"&&plan.date_on>=today()){actions.innerHTML='<button class="date-plan-secondary">Safety checklist</button>'; if(isPlatinumActive(myProfile)) actions.insertAdjacentHTML("beforeend",'<button class="date-plan-secondary" style="background:#fff8df;color:#8a6500">🎁 Send gift</button>');} 
    card.appendChild(actions);
    const accept=actions.querySelector(".date-plan-primary"), decline=actions.querySelector(".date-plan-secondary"), cancel=actions.querySelector(".date-plan-danger");
    if(accept)accept.onclick=()=>respondDatePlan(plan.id,"accepted");
    if(decline)decline.onclick=()=>respondDatePlan(plan.id,"declined");
    if(cancel)cancel.onclick=()=>respondDatePlan(plan.id,"cancelled");
    const safety=actions.querySelector(".date-plan-secondary:not([style])"); if(safety&&plan.status==="accepted")safety.onclick=()=>showDateSafety(plan);
    const gift=actions.querySelector('button[style*="background:#fff8df"]'); if(gift)gift.onclick=()=>openGiftCenter(counterpart,"your date partner");
    return card;
  }

  async function respondDatePlan(id,status){
    if(status==="cancelled"&&!confirm("Cancel this date invitation?"))return;
    const {error}=await _supabase.rpc("dating_respond_date_plan",{p_plan_id:id,p_status:status}); if(error){alert("Could not update the date plan: "+error.message);return} await loadDatePlans();refreshDatePlanBadge();
  }
  window.respondDatePlan=respondDatePlan;

  function showDateSafety(plan){
    const root=document.getElementById("modalRoot"); if(!root)return; root.innerHTML=`<div class="modal-backdrop" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:480px"><div class="body"><button class="btn-close" onclick="closeModal()">✕</button><h3>🛡️ Date safety checklist</h3><div class="match-explain"><b>Before you go</b><br>Tell someone you trust where you are going and when you expect to return.<br><br><b>At the meetup</b><br>Choose a public place, keep control of your own transport, and avoid sending money or sharing passwords/codes.<br><br><b>If something feels wrong</b><br>Leave, block/report the member in Wana, and contact local emergency services when appropriate.</div><div class="actions"><button class="btn-contact" onclick="closeModal()">Got it</button></div></div></div></div>`;
  }

  window.filterDatePlans=function(filter,btn){state.dateFilter=filter;document.querySelectorAll("[data-date-filter]").forEach(b=>b.classList.toggle("active",b.dataset.dateFilter===filter));loadDatePlans()};
  async function refreshDatePlanBadge(){const b=document.getElementById("datePlansBadge");if(!b||!currentUser)return;const {count}=await _supabase.from("dating_date_plans").select("id",{count:"exact",head:true}).eq("recipient_id",currentUser.id).eq("status","pending");b.textContent=count?`(${count})`:""}
  window.refreshDatePlanBadge=refreshDatePlanBadge;

  const translations={"Date Plans":"የቀጠሮ እቅዶች","Compatibility":"ተኳሃኝነት","Safety Center":"የደህንነት ማዕከል","Plan a Date":"ቀጠሮ አዘጋጅ","Upcoming":"ቀጣይ ቀጠሮዎች","Needs response":"ምላሽ ያስፈልጋል","All plans":"ሁሉም እቅዶች","Accept":"ተቀበል","Decline":"እምቢ በል","Cancel invitation":"ግብዣውን ሰርዝ","Send Date Invitation":"የቀጠሮ ግብዣ ላክ","Date invitation":"የቀጠሮ ግብዣ","Verified profile":"የተረጋገጠ መገለጫ","Same relationship goal":"ተመሳሳይ የግንኙነት ግብ","Similar lifestyle":"ተመሳሳይ የአኗኗር ዘይቤ","Family plans align":"የቤተሰብ እቅዶች ይጣጣማሉ","Same city":"ተመሳሳይ ከተማ","Shared faith":"ተመሳሳይ እምነት"};
  function applyAm(){document.documentElement.lang="am";const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){if(n.parentElement&&/^(SCRIPT|STYLE)$/.test(n.parentElement.tagName))continue;const raw=n.nodeValue.trim();if(translations[raw])n.nodeValue=n.nodeValue.replace(raw,translations[raw])}}
  window.toggleLang=function(){if(typeof originalToggleLang==="function")originalToggleLang(); if(typeof currentLang!=="undefined"&&currentLang==="am")applyAm()};

  window.switchTab=function(tab){
    if(["compatibility","dateplans","safety"].includes(tab)){
      if(!currentUser){const gate=document.getElementById("gate");if(gate)gate.style.display="flex";return}
      document.querySelectorAll(".panel").forEach(p=>p.style.display="none");document.querySelectorAll(".side-nav .tab").forEach(t=>t.classList.toggle("active",t.dataset.tab===tab));const gate=document.getElementById("gate");if(gate)gate.style.display="none";const panel=document.getElementById(tab+"Panel");if(panel)panel.style.display="block";
      if(tab==="compatibility"){if(!document.querySelector("#compatibilityPanel .smart-match-controls"))document.getElementById("compatibilityGrid")?.insertAdjacentHTML("beforebegin",'<div class="smart-match-controls"><button data-match-mode="all" class="active" onclick="setMatchMode(\'all\',this)">Best matches</button><button data-match-mode="verified" onclick="setMatchMode(\'verified\',this)">🛡️ Verified</button><button data-match-mode="online" onclick="setMatchMode(\'online\',this)">🟢 Online</button></div>');loadCompatibility()}
      if(tab==="dateplans"){loadDatePlans();refreshDatePlanBadge()}
      if(tab==="safety")typeof pushState==="function"&&pushState(); return;
    }
    extraPanels.forEach(id=>{const el=document.getElementById(id);if(el)el.style.display="none"}); return originalSwitchTab?originalSwitchTab(tab):undefined;
  };
  const oldOpenModal=window.openModal;
  // Existing modal is the source of truth; the Plan a Date action is inserted there in the HTML.
  if(oldOpenModal)window.openModal=oldOpenModal;
  document.addEventListener("DOMContentLoaded",()=>{refreshDatePlanBadge();});
  window._wanaDating2={scoreMatch,loadCompatibility,loadDatePlans,openDatePlanModal};
})();

<script src="js/i18n.js"></script>
