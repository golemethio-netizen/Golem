/* Wana Dating — "Stay safe on dates" tips inside the Safety & Trust Center (English + Amharic). Fails quietly. */
(function () {
  "use strict";
  var TIPS = [
    ["🏛️", "Meet in a public place", "Choose a busy café or restaurant for the first few dates. Avoid private homes, quiet places and late nights.",
           "በመጀመሪያዎቹ ቀጠሮዎች ሰው የሚበዛበት ካፌ ወይም ሬስቶራንት ይምረጡ። የግል ቤቶችን፣ ጭር ያሉ ቦታዎችን እና ምሽትን ያስወግዱ።"],
    ["👥", "Tell someone you trust", "Tell a friend or family member who you are meeting, where, and when you will be back. Share your live location if you can.",
           "ከማን ጋር፣ የት እና መቼ እንደሚመለሱ ለታመነ ጓደኛ ወይም ዘመድ ይንገሩ። ከተቻለ የቀጥታ አካባቢዎን ያጋሩ።"],
    ["🚕", "Arrange your own transport", "Go and come back on your own. Do not accept a ride from someone you have just met.",
           "በራስዎ ይሂዱ፤ በራስዎ ይመለሱ። አዲስ ከተዋወቁት ሰው መኪና አይሳፈሩ።"],
    ["📞", "Talk first, meet later", "Chat and make a voice call on Wana Dating before meeting, to check that the person matches their photos.",
           "ከመገናኘትዎ በፊት በዋና ዳቲንግ ላይ ይወያዩ፤ በድምጽ ይደውሉ። ሰውየው ከፎቶዎቹ ጋር እንደሚመሳሰል ያረጋግጡ።"],
    ["💸", "Never send money", "Never send money, airtime or gifts to someone you have not met, whatever the story: an emergency, a visa, a business chance. Report anyone who asks.",
           "ምንም ታሪክ ቢነግርዎ (አስቸኳይ ጉዳይ፣ ቪዛ፣ የንግድ ዕድል) ካልተገናኛችሁት ሰው ገንዘብ፣ ካርድ ወይም ስጦታ አይላኩ። የጠየቀዎትን ሰው ሪፖርት ያድርጉ።"],
    ["🔐", "Keep private things private", "Do not share passwords, one-time codes (OTP), PINs or your home and work address early on. Wana Dating staff never ask for them.",
           "የይለፍ ቃል፣ የአንድ ጊዜ ኮድ (OTP)፣ ፒን ወይም የቤት እና የሥራ አድራሻዎን ቶሎ አይስጡ። የዋና ዳቲንግ ሠራተኞች በጭራሽ አይጠይቁም።"],
    ["🚩", "Watch for red flags", "Rushing to love, refusing calls, pushing you to another app, asking for photos or money, or a story that keeps changing.",
           "ቶሎ ፍቅር መግለጽ፣ ጥሪን አለመቀበል፣ ወደ ሌላ መተግበሪያ መጎተት፣ ፎቶ ወይም ገንዘብ መጠየቅ፣ ወይም የሚቀያየር ታሪክ።"],
    ["🛡️", "Trust your instincts", "If something feels wrong, leave. Use Report and Block on the profile at any time, and contact Support if you need help.",
           "የሆነ ነገር ትክክል ካልመሰለዎት ይውጡ። በማንኛውም ጊዜ መገለጫውን ሪፖርት ያድርጉ ወይም ያግዱ፤ እርዳታ ከፈለጉ ድጋፍን ያነጋግሩ።"]
  ];
  function am() { try { return currentLang === "am"; } catch (e) { return false; } }
  function render() {
    var panel = document.getElementById("safetyPanel"); if (!panel) return;
    var old = panel.querySelector(".wg-tips"); if (old) old.remove();
    var a = am();
    var h = '<section class="wg-tips" aria-label="' + (a ? "በቀጠሮ ጊዜ ደህንነት" : "Stay safe on dates") + '"><h3>' + (a ? "በቀጠሮ ጊዜ ደህንነትዎን ይጠብቁ" : "Stay safe on dates") + "</h3><ul>";
    TIPS.forEach(function (t) { h += "<li><span>" + t[0] + "</span><div><strong>" + (a ? tipTitleAm(t) : t[1]) + "</strong><p>" + (a ? t[3] : t[2]) + "</p></div></li>"; });
    h += "</ul></section>";
    var first = panel.querySelector("p");
    if (first) first.insertAdjacentHTML("afterend", h); else panel.insertAdjacentHTML("afterbegin", h);
  }
  var AM_TITLES = ["በሰው በሚበዛበት ቦታ ይገናኙ", "ለታመነ ሰው ይንገሩ", "የራስዎን መጓጓዣ ያዘጋጁ", "መጀመሪያ ይወያዩ፤ ቆይተው ይገናኙ", "ገንዘብ በጭራሽ አይላኩ", "የግል መረጃዎን ይጠብቁ", "ምልክቶችን ይጠንቀቁ", "ስሜትዎን ይመኑ"];
  function tipTitleAm(t) { return AM_TITLES[TIPS.indexOf(t)] || t[1]; }
  function boot() {
    render();
    var btn = document.getElementById("langBtn");
    if (btn) btn.addEventListener("click", function () { setTimeout(render, 80); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
