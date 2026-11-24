/* Wana Dating — FAQ answers for the Help assistant (no AI service, no cost).
   To add or change an answer, edit an entry below. Each entry:
     q  = the question shown on the chip (en / am)
     kw = words that trigger it (lower case; English and Amharic; partial words work)
     a  = the answer (en / am)
   The assistant replies in Amharic when the member writes in Ethiopic letters, otherwise in English. */
(function () {
  "use strict";
  var FAQ = [
    { id: "verify", q: { en: "How do I get verified?", am: "እንዴት ነው የምረጋገጠው?" },
      kw: ["verify", "verified", "verification", "badge", "blue tick", "tick", "ማረጋገጫ", "ማረጋገጥ", "ተረጋገጠ", "ባጅ"],
      a: { en: "Open the menu and choose Verification, then send a clear photo of yourself as the app asks. An admin reviews it. When it is approved you get a verified badge, higher message limits and 1 free Platinum day. If it is rejected, read the note and send a new photo.",
           am: "ከምናሌው «ማረጋገጫ» ን ይምረጡ እና መተግበሪያው እንደሚጠይቀው ግልጽ የራስዎን ፎቶ ይላኩ። አስተዳዳሪ ይመረምረዋል። ሲፈቀድ የተረጋገጠ ባጅ፣ ከፍ ያለ የመልእክት ገደብ እና 1 ነጻ የፕላቲነም ቀን ያገኛሉ። ውድቅ ከሆነ ማስታወሻውን አንብበው አዲስ ፎቶ ይላኩ።" } },
    { id: "basic", q: { en: "What can Basic members do?", am: "መሠረታዊ አባላት ምን ማድረግ ይችላሉ?" },
      kw: ["message limit", "messages limit", "how many message", "limit on message", "ስንት መልእክት", "basic", "not verified", "free member", "4 messages", "four messages", "limit", "limits", "መሠረታዊ", "ገደብ", "ያልተረጋገጠ"],
      a: { en: "Basic (not verified) members can browse, like and chat with matches, but can send only 4 text messages in total and no voice messages. Get verified to send 4 messages every day and plan dates, or get Platinum for unlimited messages.",
           am: "መሠረታዊ (ያልተረጋገጡ) አባላት ማየት፣ መውደድ እና ከተዛመዱ ሰዎች ጋር መወያየት ይችላሉ፤ ነገር ግን በጠቅላላው 4 የጽሑፍ መልእክት ብቻ መላክ ይችላሉ፣ የድምጽ መልእክት አይፈቀድም። በየቀኑ 4 መልእክት ለመላክና ቀጠሮ ለማቀድ ይረጋገጡ፣ ወይም ያልተገደበ መልእክት ለማግኘት ፕላቲነም ይውሰዱ።" } },
    { id: "verifiedlimits", q: { en: "What can Verified members do?", am: "የተረጋገጡ አባላት ምን ማድረግ ይችላሉ?" },
      kw: ["verified member", "verified can", "4 per day", "per day", "daily", "voice message", "voice", "የድምጽ", "በቀን", "የተረጋገጡ"],
      a: { en: "Verified members can send 4 text messages per day, 4 voice messages per week, and plan dates. Calls, read receipts and gifts are for Platinum members.",
           am: "የተረጋገጡ አባላት በቀን 4 የጽሑፍ መልእክት፣ በሳምንት 4 የድምጽ መልእክት መላክ እና ቀጠሮ ማቀድ ይችላሉ። ጥሪ፣ «ታይቷል» ምልክት እና ስጦታ ለፕላቲነም አባላት ብቻ ናቸው።" } },
    { id: "platinum", q: { en: "What is Platinum?", am: "ፕላቲነም ምንድን ነው?" },
      kw: ["platinum", "premium", "upgrade", "vip", "ፕላቲነም", "ፕሪሚየም"],
      a: { en: "Platinum gives unlimited text and voice messages, voice calls, read receipts (\"Seen\") and gifts. Prices and plans are on the Platinum screen in the app. When a plan ends you return to Verified or Basic limits.",
           am: "ፕላቲነም ያልተገደበ የጽሑፍና የድምጽ መልእክት፣ የድምጽ ጥሪ፣ «ታይቷል» ምልክት እና ስጦታ ይሰጣል። ዋጋና እቅዶች በመተግበሪያው ፕላቲነም ገጽ ላይ ይገኛሉ። እቅዱ ሲያልቅ ወደ የተረጋገጠ ወይም መሠረታዊ ገደብ ይመለሳሉ።" } },
    { id: "pay", q: { en: "How do I pay for Platinum?", am: "ለፕላቲነም እንዴት እከፍላለሁ?" },
      kw: ["platinum price", "platinum cost", "price of platinum", "how much", "ፕላቲነም ዋጋ", "pay", "payment", "telebirr", "mpesa", "m-pesa", "price", "cost", "how much", "birr", "ክፍያ", "መክፈል", "ተሌብር", "ዋጋ", "ብር", "ኤም ፔሳ"],
      a: { en: "Open the Platinum screen, choose a plan and pay ONLY to the accounts shown there (Telebirr or M-Pesa). Then send your payment details in the app and an admin will activate Platinum. Never pay any other account or person.",
           am: "ፕላቲነም ገጹን ይክፈቱ፣ እቅድ ይምረጡ እና እዚያ ወደሚታዩት አካውንቶች ብቻ (ተሌብር ወይም ኤም-ፔሳ) ይክፈሉ። ከዚያ የክፍያ ዝርዝሩን በመተግበሪያው ይላኩ፤ አስተዳዳሪው ፕላቲነምን ያነቃል። ሌላ አካውንት ወይም ሰው ላይ በጭራሽ አይክፈሉ።" } },
    { id: "paidnotactive", q: { en: "I paid but Platinum is not active", am: "ከፍያለሁ ግን ፕላቲነም አልነቃም" },
      kw: ["paid but", "not active", "not activated", "activate", "didn't activate", "waiting", "ከፍያለሁ", "አልነቃም", "አልተነቃም", "አላነቃ"],
      a: { en: "Platinum is activated by an admin after they check your payment, so it can take some time. Make sure you sent the payment details in the app. If it is still not active, open the Support tab from the menu and send the payment details there.",
           am: "ፕላቲነም የሚነቃው አስተዳዳሪው ክፍያዎን ካረጋገጠ በኋላ ነው፤ ስለዚህ ጊዜ ሊወስድ ይችላል። የክፍያ ዝርዝሩን በመተግበሪያው መላክዎን ያረጋግጡ። አሁንም ካልነቃ ከምናሌው «ድጋፍ» ን ከፍተው የክፍያ ዝርዝሩን እዚያ ይላኩ።" } },
    { id: "call", q: { en: "Why can't I call someone?", am: "ለምን መደወል አልችልም?" },
      kw: ["cant call", "why cant i call", "call", "calling", "phone call", "can't call", "cannot call", "voice call", "ጥሪ", "መደወል", "ደውል", "መደወያ"],
      a: { en: "Only Platinum members can start a call, and only with a matched member. The other person's call setting must also allow it (everybody, verified only, or nobody), and neither of you can have blocked the other.",
           am: "ጥሪ መጀመር የሚችሉት የፕላቲነም አባላት ብቻ ናቸው፣ እሱም ከተዛመደ አባል ጋር ብቻ። የተቀባዩም የጥሪ ቅንብር መፍቀድ አለበት (ሁሉም፣ የተረጋገጡ ብቻ ወይም ማንም)፣ እንዲሁም አንዳችሁ ሌላውን ማገድ የለበትም።" } },
    { id: "callsetting", q: { en: "Who can call me?", am: "ማን ሊደውልልኝ ይችላል?" },
      kw: ["who can call", "call setting", "receive call", "call privacy", "incoming call", "ማን ሊደውል", "የጥሪ ቅንብር"],
      a: { en: "You choose in Privacy Settings: everybody, verified members only, or nobody. Even then, only Platinum members who matched with you can call.",
           am: "በግላዊነት ቅንብሮች ውስጥ ይመርጣሉ፦ ሁሉም፣ የተረጋገጡ አባላት ብቻ ወይም ማንም። ያኔም ቢሆን ከእርስዎ ጋር የተዛመዱ የፕላቲነም አባላት ብቻ መደወል ይችላሉ።" } },
    { id: "match", q: { en: "Why can't I message someone?", am: "ለምን መልእክት መላክ አልችልም?" },
      kw: ["can't message", "cannot message", "can't send", "message", "match", "matched", "chat", "መልእክት", "መላክ", "ተዛመድ", "ማዛመድ", "ውይይት"],
      a: { en: "You can message only members you matched with (you both liked each other). Check that: you have a profile, you are not blocked, your account is not suspended, and you have messages left for today (Basic: 4 in total, Verified: 4 per day, Platinum: unlimited).",
           am: "መልእክት መላክ የሚችሉት ከተዛመዱዋቸው አባላት ጋር ብቻ ነው (እርስ በርስ ከተዋደዳችሁ)። እነዚህን ያረጋግጡ፦ መገለጫ አለዎት፣ አልታገዱም፣ አካውንትዎ አልታገደም፣ እና ለዛሬ የቀረ መልእክት አለዎት (መሠረታዊ፦ በጠቅላላ 4፣ የተረጋገጠ፦ በቀን 4፣ ፕላቲነም፦ ያልተገደበ)።" } },
    { id: "nomatch", q: { en: "How do I get more matches?", am: "ብዙ ተዛማጆችን እንዴት አገኛለሁ?" },
      kw: ["more matches", "no matches", "get matches", "nobody likes", "no likes", "ተዛማጅ", "ማግኘት", "ማንም አይወደኝም"],
      a: { en: "Add 3 or more clear photos with your face visible, write a real bio, fill in your interests, get verified, and like members regularly. Check the Active today row on Home, because people who are online reply faster.",
           am: "ፊትዎ የሚታይባቸው 3 እና ከዚያ በላይ ግልጽ ፎቶዎችን ይጨምሩ፣ እውነተኛ መግቢያ ይጻፉ፣ ፍላጎቶችዎን ይሙሉ፣ ይረጋገጡ እና በየጊዜው አባላትን ይውደዱ። በመነሻ ገጹ «ዛሬ ንቁ» ረድፍ ይመልከቱ፤ አሁን ኦንላይን ያሉ ሰዎች በፍጥነት ይመልሳሉ።" } },
    { id: "scam", q: { en: "How do I stay safe from scams?", am: "ከማጭበርበር እንዴት እጠበቃለሁ?" },
      kw: ["scam", "safe", "safety", "fraud", "fake", "money", "send money", "blackmail", "danger", "cheat", "ማጭበርበር", "ደህንነት", "ገንዘብ", "አስመሳይ", "ማስፈራራት"],
      a: { en: "Never send money, gift cards or bank details to anyone you meet here, even if they say it is an emergency. Do not share passwords or codes. Meet in a public place, tell a friend, and keep chatting inside the app. If someone asks for money or threatens you, block and report them, and contact the police if you are in danger.",
           am: "እዚህ ለሚያገኙት ማንኛውም ሰው ገንዘብ፣ የስጦታ ካርድ ወይም የባንክ መረጃ በጭራሽ አይላኩ፣ አስቸኳይ ነው ቢሉም። የይለፍ ቃል ወይም ኮድ አያጋሩ። በሕዝብ ቦታ ይገናኙ፣ ለጓደኛ ይንገሩ እና ውይይቱን በመተግበሪያው ውስጥ ያድርጉ። ገንዘብ የሚጠይቅ ወይም የሚያስፈራራ ሰው ካለ ያግዱና ሪፖርት ያድርጉ፤ አደጋ ላይ ከሆኑ ፖሊስን ያነጋግሩ።" } },
    { id: "block", q: { en: "How do I block someone?", am: "አንድን ሰው እንዴት አግዳለሁ?" },
      kw: ["block", "unblock", "blocked", "stop someone", "harass", "annoying", "ማገድ", "አግድ", "ማገጃ", "ማስቸገር"],
      a: { en: "Open the member's profile, tap the menu (⋯) and choose Block. They can no longer message or call you, and you will not see each other. You can unblock later in Privacy Settings.",
           am: "የአባሉን መገለጫ ይክፈቱ፣ ምናሌውን (⋯) ይንኩ እና «አግድ» ን ይምረጡ። ከዚያ በኋላ ሊጽፉልዎት ወይም ሊደውሉልዎት አይችሉም፣ እርስ በርስም አትተያዩም። በኋላ በግላዊነት ቅንብሮች ውስጥ ማገዱን ማንሳት ይችላሉ።" } },
    { id: "report", q: { en: "How do I report a profile or post?", am: "መገለጫ ወይም ጽሑፍ እንዴት ሪፖርት አደርጋለሁ?" },
      kw: ["report", "abuse", "inappropriate", "fake profile", "harassment", "ሪፖርት", "አስመሳይ መገለጫ", "ጥቃት"],
      a: { en: "Tap the menu (⋯) on the profile, message or post and choose Report, then tell us what is wrong. The team reviews reports. For something urgent, also use the Support tab.",
           am: "በመገለጫው፣ በመልእክቱ ወይም በጽሑፉ ላይ ያለውን ምናሌ (⋯) ይንኩ እና «ሪፖርት» ን ይምረጡ፣ ከዚያ ችግሩን ይንገሩን። ቡድኑ ሪፖርቶችን ይመረምራል። አስቸኳይ ከሆነ «ድጋፍ» ንም ይጠቀሙ።" } },
    { id: "lastseen", q: { en: "How do I hide my last seen or browse privately?", am: "የመጨረሻ ጊዜ ያየሁበትን እንዴት እደብቃለሁ?" },
      kw: ["last seen", "hide", "online status", "incognito", "private", "privacy", "invisible", "የመጨረሻ", "መደበቅ", "ግላዊ", "ኦንላይን"],
      a: { en: "Open Privacy Settings. There you can hide your last-seen time and browse in incognito so your visits are not shown. If you hide your last seen, you also will not see other people's.",
           am: "የግላዊነት ቅንብሮችን ይክፈቱ። እዚያ የመጨረሻ ጊዜ ያዩበትን መደበቅ እና ጉብኝትዎ እንዳይታይ በድብቅ (ኢንኮግኒቶ) ማሰስ ይችላሉ። የእርስዎን ከደበቁ የሌሎችንም አያዩም።" } },
    { id: "notify", q: { en: "How do I turn notifications on?", am: "ማሳወቂያዎችን እንዴት አበራለሁ?" },
      kw: ["notification", "notifications", "notify", "push", "email alert", "alerts", "not getting", "ማሳወቂያ", "ማሳወቅ", "ኢሜይል"],
      a: { en: "Open Settings > Notifications and choose what you want (messages, likes, matches, visitors, dates). Tap Allow when your browser asks. You can also turn on email alerts there. If your browser blocked notifications, allow them in the browser's site settings (in Brave, also turn on Google services for push messaging).",
           am: "ቅንብሮች > ማሳወቂያዎች ይክፈቱ እና የሚፈልጉትን ይምረጡ (መልእክት፣ መውደድ፣ ተዛማጅ፣ ጎብኚዎች፣ ቀጠሮ)። አሳሹ ሲጠይቅ «ፍቀድ» ን ይንኩ። እዚያም የኢሜይል ማሳወቂያ ማብራት ይችላሉ። አሳሹ ካገደው በአሳሹ የድረ-ገጽ ቅንብሮች ውስጥ ይፍቀዱ (በBrave ደግሞ «Google services for push messaging» ን ያብሩ)።" } },
    { id: "profile", q: { en: "How do I edit my profile or photos?", am: "መገለጫዬን ወይም ፎቶዎቼን እንዴት አስተካክላለሁ?" },
      kw: ["edit profile", "profile", "photo", "photos", "picture", "bio", "change name", "update", "upload", "መገለጫ", "ፎቶ", "ምስል", "መቀየር", "ማስተካከል"],
      a: { en: "Open the menu and choose Edit Profile. You can change your photos, bio, city, interests and what you are looking for. Photos must show you, with no nudity or contact details.",
           am: "ከምናሌው «መገለጫ አስተካክል» ን ይምረጡ። ፎቶዎችን፣ መግቢያን፣ ከተማን፣ ፍላጎቶችን እና የሚፈልጉትን መቀየር ይችላሉ። ፎቶዎች እርስዎን ማሳየት አለባቸው፣ ራቁትነት ወይም የመገናኛ መረጃ መኖር የለበትም።" } },
    { id: "photoremoved", q: { en: "Why was my photo removed?", am: "ፎቶዬ ለምን ተወገደ?" },
      kw: ["photo removed", "removed", "rejected photo", "deleted photo", "ተወገደ", "ተሰረዘ", "ውድቅ"],
      a: { en: "Photos that break the rules (nudity, other people's pictures, contact details or ads) are removed by the team. You get a notification with the reason. Upload a new photo that follows the rules. If you think it was a mistake, message us in the Support tab.",
           am: "ደንብ የሚጥሱ ፎቶዎች (ራቁትነት፣ የሌሎች ሰዎች ምስል፣ የመገናኛ መረጃ ወይም ማስታወቂያ) በቡድኑ ይወገዳሉ። ምክንያቱን የያዘ ማሳወቂያ ይደርስዎታል። ደንቡን የሚከተል አዲስ ፎቶ ይጫኑ። ስህተት ነው ብለው ካሰቡ በ«ድጋፍ» ይጻፉልን።" } },
    { id: "date", q: { en: "How do I plan a date?", am: "ቀጠሮ እንዴት አቅዳለሁ?" },
      kw: ["date", "plan a date", "date plan", "meet", "meeting", "date invite", "ቀጠሮ", "መገናኘት", "ማቀድ"],
      a: { en: "Verified and Platinum members can plan a date with a match: open Date Plans in the menu or in your chat, choose a place and time, and send the invitation. Always meet in a public place and tell a friend.",
           am: "የተረጋገጡና የፕላቲነም አባላት ከተዛመዱት ጋር ቀጠሮ ማቀድ ይችላሉ፦ ከምናሌው ወይም ከውይይቱ «የቀጠሮ እቅዶች» ን ይክፈቱ፣ ቦታና ሰዓት ይምረጡ እና ግብዣውን ይላኩ። ሁልጊዜ በሕዝብ ቦታ ይገናኙ እና ለጓደኛ ይንገሩ።" } },
    { id: "gifts", q: { en: "How do gifts and read receipts work?", am: "ስጦታና «ታይቷል» ምልክት እንዴት ይሠራሉ?" },
      kw: ["gift", "gifts", "present", "read receipt", "seen", "ስጦታ", "ታይቷል", "ተነበበ"],
      a: { en: "Sending gifts and seeing read receipts (\"Seen\") are Platinum features. Open a chat with a match and tap the gift button to send one.",
           am: "ስጦታ መላክና «ታይቷል» ምልክት ማየት የፕላቲነም አገልግሎቶች ናቸው። ከተዛመዱት ጋር ውይይት ይክፈቱ እና ስጦታ ለመላክ የስጦታውን ቁልፍ ይንኩ።" } },
    { id: "posts", q: { en: "How do I post on Home?", am: "በመነሻ ገጽ እንዴት እለጥፋለሁ?" },
      kw: ["post", "posts", "feed", "community", "comment", "share update", "ጽሑፍ", "ማህበረሰብ", "መለጠፍ", "አስተያየት"],
      a: { en: "On Home, open Community posts, write your update (up to 1,000 characters, one photo) and choose Public or Only my matches. You need a profile to post. Posts that break the rules can be reported and removed.",
           am: "በመነሻ ገጹ «የማህበረሰብ ጽሑፎች» ን ይክፈቱ፣ ጽሑፍዎን ይጻፉ (እስከ 1,000 ፊደል፣ አንድ ፎቶ) እና «ለሁሉም» ወይም «ለተዛማጆቼ ብቻ» ይምረጡ። ለመለጠፍ መገለጫ ያስፈልጋል። ደንብ የሚጥሱ ጽሑፎች ሪፖርት ሊደረጉና ሊወገዱ ይችላሉ።" } },
    { id: "visitors", q: { en: "Who viewed my profile?", am: "መገለጫዬን ማን አየው?" },
      kw: ["viewed", "visitor", "visitors", "who saw", "who looked", "profile view", "ጎብኚ", "ማን አየ", "አየኝ"],
      a: { en: "Open Visitors in the menu to see who viewed your profile. Members who browse in incognito do not appear. You get at most one visitor alert every 6 hours, and you can switch visitor alerts off in Settings > Notifications.",
           am: "መገለጫዎን ማን እንዳየ ለማየት ከምናሌው «ጎብኚዎች» ን ይክፈቱ። በድብቅ የሚያስሱ አባላት አይታዩም። የጎብኚ ማሳወቂያ በየ6 ሰዓቱ ቢበዛ አንድ ጊዜ ብቻ ይደርስዎታል፤ በቅንብሮች > ማሳወቂያዎች ማጥፋት ይችላሉ።" } },
    { id: "online", q: { en: "What is the Active today row?", am: "«ዛሬ ንቁ» ምንድን ነው?" },
      kw: ["active today", "online now", "who is online", "online", "active", "ዛሬ ንቁ", "ንቁ"],
      a: { en: "On Home, Active today shows members who are online now or were active in the last 8 hours, who also fit your preferences (gender, age and blocks). Members who hide their last seen do not appear there.",
           am: "በመነሻ ገጹ «ዛሬ ንቁ» አሁን ኦንላይን ያሉ ወይም ባለፉት 8 ሰዓታት ውስጥ ንቁ የነበሩ እና ከምርጫዎ (ጾታ፣ ዕድሜ፣ ማገድ) ጋር የሚስማሙ አባላትን ያሳያል። የመጨረሻ ጊዜያቸውን የደበቁ አባላት እዚያ አይታዩም።" } },
    { id: "invite", q: { en: "How do I invite friends?", am: "ጓደኞቼን እንዴት እጋብዛለሁ?" },
      kw: ["invite my friend", "invite a friend", "invite friend", "friends", "invite friends", "referral", "share link", "invite link", "refer", "ጓደኛ", "ግብዣ", "ማጋራት"],
      a: { en: "On Home, find the Invite friends card. Copy your personal link or share it by WhatsApp or Telegram. The card also shows how many people joined with your link.",
           am: "በመነሻ ገጹ «ጓደኞችን ጋብዝ» ካርዱን ያግኙ። የግል ሊንክዎን ይቅዱ ወይም በዋትስአፕ ወይም በቴሌግራም ያጋሩ። ካርዱ በሊንክዎ ምን ያህል ሰው እንደተቀላቀለም ያሳያል።" } },
    { id: "signin", q: { en: "I can't sign in", am: "መግባት አልቻልኩም" },
      kw: ["sign in", "login", "log in", "password", "forgot", "can't login", "cannot sign", "otp", "code", "google", "መግባት", "ይለፍ ቃል", "ረሳሁ", "ኮድ"],
      a: { en: "Check your email or phone number and try again. If you forgot your password, use Forgot password on the sign-in screen. For phone sign-in, enter the number with its country code (for Ethiopia you can type 09…) and wait for the code. You can also use Continue with Google. If it still fails, tell us in the Support tab (never send your password).",
           am: "ኢሜይልዎን ወይም ስልክ ቁጥርዎን አረጋግጠው እንደገና ይሞክሩ። የይለፍ ቃልዎን ከረሱ በመግቢያው ገጽ «የይለፍ ቃል ረሳሁ» ን ይጠቀሙ። በስልክ ለመግባት ቁጥሩን ከአገር ኮዱ ጋር ያስገቡ (ለኢትዮጵያ 09… ማስገባት ይችላሉ) እና ኮዱን ይጠብቁ። «በGoogle ቀጥል» ንም መጠቀም ይችላሉ። አሁንም ካልሆነ በ«ድጋፍ» ይንገሩን (የይለፍ ቃልዎን በጭራሽ አይላኩ)።" } },
    { id: "delete", q: { en: "How do I delete my account?", am: "አካውንቴን እንዴት እሰርዛለሁ?" },
      kw: ["delete account", "delete my account", "close account", "remove account", "deactivate", "አካውንት ሰርዝ", "አካውንቴን", "መሰረዝ", "ማጥፋት"],
      a: { en: "Open the menu, choose My Account and use Delete account. This removes your profile and cannot be undone. Any Platinum days left are lost.",
           am: "ከምናሌው «አካውንቴ» ን ይክፈቱ እና «አካውንት ሰርዝ» ን ይጠቀሙ። ይህ መገለጫዎን ያስወግዳል፤ መመለስ አይቻልም። የቀሩ የፕላቲነም ቀናትም ይጠፋሉ።" } },
    { id: "support", q: { en: "How do I contact support?", am: "ድጋፍን እንዴት አገኛለሁ?" },
      kw: ["support", "contact", "help", "human", "agent", "admin", "complain", "problem", "bug", "ድጋፍ", "ማነጋገር", "እርዳታ", "ችግር", "አስተዳዳሪ", "ቅሬታ"],
      a: { en: "Open Support in the menu, choose a category, and write your message. The team replies there. Include what happened and, for payments, the payment details. Never include your password.",
           am: "ከምናሌው «ድጋፍ» ን ይክፈቱ፣ ምድብ ይምረጡ እና መልእክትዎን ይጻፉ። ቡድኑ እዚያ ይመልሳል። የተፈጠረውን እና ለክፍያ ጉዳይ የክፍያ ዝርዝሩን ያካትቱ። የይለፍ ቃልዎን በጭራሽ አያካትቱ።" } },
    { id: "suspended", q: { en: "My account is suspended", am: "አካውንቴ ታግዷል" },
      kw: ["suspended", "suspend", "banned", "ban", "blocked account", "ታገደ", "ታግዷል", "ተዘጋ"],
      a: { en: "Suspended accounts cannot message or post. The team decides this, and I cannot see or change it. Please write to us in the Support tab and explain your situation.",
           am: "የታገዱ አካውንቶች መልእክት መላክም ሆነ መለጠፍ አይችሉም። ይህን የሚወስነው ቡድኑ ነው፤ እኔ ማየትም መቀየርም አልችልም። እባክዎ በ«ድጋፍ» ሁኔታዎን ገልጸው ይጻፉልን።" } }
  ];

  var GREET = /^(hi|hello|hey|selam|ሰላም|ሃይ|ሄሎ|እንደምን)\b/i;
  var THANKS = /(thank|thanks|አመሰግናለሁ|እናመሰግናለን|አመሰግን)/i;

  function isAmharic(t) { return /[ሀ-፿]/.test(t); }

  function best(text) {
    var t = String(text || "").toLowerCase();
    var scored = [];
    FAQ.forEach(function (f) {
      var s = 0;
      // Longer, more specific keywords count for more; Ethiopic letters carry more meaning per character.
      f.kw.forEach(function (k) { if (t.indexOf(k) !== -1) s += k.length * (isAmharic(k) ? 2 : 1); });
      if (t.indexOf(f.q.en.toLowerCase()) !== -1 || t.indexOf(f.q.am) !== -1) s += 40;
      if (s > 0) scored.push({ f: f, s: s });
    });
    scored.sort(function (a, b) { return b.s - a.s; });
    return scored;
  }

  function answer(text) {
    var am = isAmharic(text), L = am ? "am" : "en";
    if (THANKS.test(text)) return { text: am ? "ምንም አይደለም! ሌላ ጥያቄ ካለዎት ይጠይቁ።" : "You're welcome! Ask me anything else about Wana Dating." };
    if (GREET.test(String(text).trim()) && String(text).trim().length < 20) return { text: am ? "ሰላም! ስለ መልእክት፣ ማረጋገጫ፣ ፕላቲነም፣ ደህንነት እና ስለ ጣቢያው አጠቃቀም ልረዳዎ እችላለሁ። ምን ማወቅ ይፈልጋሉ?" : "Hello! I can help with messages, verification, Platinum, safety and how the site works. What would you like to know?" };
    var r = best(text);
    if (r.length && r[0].s >= 4) {
      var out = { text: r[0].f.a[L] };
      if (r.length > 1 && r[1].s >= 4 && r[1].s >= r[0].s * 0.8) out.more = [r[1].f.q[L]];
      return out;
    }
    return {
      text: am ? "ይቅርታ፣ ይህን ጥያቄ በትክክል አልገባኝም። ከታች ካሉት አንዱን ይሞክሩ፣ ወይም ከምናሌው «ድጋፍ» ን ከፍተው ቡድኑን ያነጋግሩ።"
               : "Sorry, I didn't quite get that. Try one of these, or open Support in the menu to talk to the team.",
      more: ["How do I get verified?", "What can Basic members do?", "How do I stay safe from scams?", "How do I contact support?"].map(function (x) { return x; }),
      fallback: true
    };
  }

  var api = { FAQ: FAQ, answer: answer, best: best, isAmharic: isAmharic };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.WanaFAQ = api;
})();
