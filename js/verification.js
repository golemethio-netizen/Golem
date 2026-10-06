// ============================================================
// verification.js — badges, tier box, selfie verification, Platinum
// ============================================================

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
// IMPORTANT: PLATINUM_PAYMENT_ACCOUNT below is a placeholder. Fill in your
// real bank account or Telebirr/CBE Birr number before this goes live —
// sending members a wrong or fake account number would mean their real
// money goes nowhere. This is intentionally left unfilled rather than
// guessed, since a wrong number here is actively harmful, not just a bug.
const PLATINUM_PAYMENT_ACCOUNT = {
  bank: "FILL IN YOUR BANK NAME (e.g. Commercial Bank of Ethiopia)",
  accountName: "FILL IN THE ACCOUNT HOLDER NAME",
  accountNumber: "FILL IN YOUR ACCOUNT NUMBER",
  telebirr: "FILL IN YOUR TELEBIRR NUMBER (optional, leave blank to hide)"
};

const PLATINUM_PLANS = {
  weekly:  { label: "Weekly",  price: 100, unit: "/ week" },
  monthly: { label: "Monthly", price: 500, unit: "/ month" }
};

function renderPlatinumBox(profile, latestPlatinumRequest){
  if (isPlatinumActive(profile)) return ""; // renderTierBox already shows active-plan details

  if (latestPlatinumRequest && latestPlatinumRequest.status === "pending"){
    const plan = PLATINUM_PLANS[latestPlatinumRequest.plan];
    return `<div class="msg" style="background:#FFF9EE;color:#8A6D1F;margin-bottom:20px;border:1px solid #fce3b4;">
      ⏳ Your ${plan ? esc(plan.label) : esc(latestPlatinumRequest.plan)} Platinum request (ref: ${esc(latestPlatinumRequest.transaction_number)}) is under review.
    </div>`;
  }

  const rejectedNote = (latestPlatinumRequest && latestPlatinumRequest.status === "rejected")
    ? `<div class="msg error" style="margin-bottom:12px;">Your last Platinum request wasn't approved.${latestPlatinumRequest.reviewer_note ? ` ${esc(latestPlatinumRequest.reviewer_note)}` : ""} You can try again below.</div>`
    : "";

  return `
    ${rejectedNote}
    <div style="background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px;margin-bottom:20px; box-shadow: 0 4px 10px rgba(0,0,0,0.03);">
      <div style="font-weight:700;margin-bottom:10px;">💎 Go Platinum</div>
      <p style="font-size:.85rem;color:#666;margin:0 0 14px;">Unlimited messaging, voice messages, and calls — plus read receipts.</p>
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

function choosePlatinumPlan(planKey){
  const plan = PLATINUM_PLANS[planKey];
  const root = document.getElementById("modalRoot");
  root.innerHTML = `
    <div class="modal-backdrop" onclick="if(event.target===this) closeModal()">
      <div class="modal" style="max-width:420px;">
        <div class="body">
          <button class="btn-close" onclick="closeModal()">✕</button>
          <h3 style="margin-bottom:6px;">${esc(plan.label)} Platinum — ${plan.price} Birr</h3>
          <div class="bio" style="margin-bottom:14px;font-size:.9rem;background:#f8f9fa;padding:12px;border-radius:8px;border:1px solid #e2e8f0;">
            <div style="font-weight:700;margin-bottom:6px;">Send ${plan.price} Birr to:</div>
            <div>🏦 Bank: ${esc(PLATINUM_PAYMENT_ACCOUNT.bank)}</div>
            <div>👤 Account name: ${esc(PLATINUM_PAYMENT_ACCOUNT.accountName)}</div>
            <div>🔢 Account number: ${esc(PLATINUM_PAYMENT_ACCOUNT.accountNumber)}</div>
            ${PLATINUM_PAYMENT_ACCOUNT.telebirr ? `<div>📱 Telebirr: ${esc(PLATINUM_PAYMENT_ACCOUNT.telebirr)}</div>` : ""}
            <div style="margin-top:8px;color:#666;">After sending, enter the transaction reference number below. We'll review and activate your plan — this isn't instant.</div>
          </div>
          <input type="text" id="platinumTxnNumber" placeholder="Transaction number / reference" maxlength="100" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-family:inherit;margin-bottom:14px;">
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
  const msg = document.getElementById("platinumReqMsg");
  const transactionNumber = txnInput.value.trim();
  if (transactionNumber.length < 3){
    msg.innerHTML = `<div class="msg error">Enter the transaction number from your payment.</div>`;
    return;
  }
  msg.innerHTML = `<div class="msg" style="color:var(--green);">Submitting...</div>`;
  const { error } = await _supabase.from("dating_platinum_requests").insert({
    user_id: currentUser.id,
    plan: planKey,
    amount_birr: amount,
    transaction_number: transactionNumber
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

  msg.innerHTML = `<div class="msg" style="color:var(--green);">Uploading... please wait.</div>`;
  // Private bucket — path starts with the uploader's id to match the
  // write policy, and we store the PATH (not a public URL): only the
  // uploader and admins can ever read it, via a signed URL.
  const path = `${currentUser.id}-${Date.now()}-${file.name}`;
  const { error: uploadErr } = await _supabase.storage.from(BUCKET_VERIFICATION).upload(path, file);
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
