/* Wana Dating — English / Amharic (አማርኛ) layer
 * Load AFTER app.js, safety.js and date-planning.js so it overrides toggleLang().
 * Matches visible English text exactly and swaps it; translates text added later too
 * (feed, modals, notifications) as long as the English string is in the dictionary below.
 * To translate a new string, add:  "English text": "አማርኛ",
 */
(function () {
  "use strict";

  var AM = {
    // header / nav
    "← Back to Shop": "← ወደ ሱቅ ተመለስ", "👤 Sign In": "👤 ግባ",
    "Notifications": "ማሳወቂያዎች", "Mark all read": "ሁሉንም እንደተነበበ አድርግ",
    "Home": "መነሻ", "Browse Matches": "ተዛማጆችን ፈልግ", "New Members": "አዲስ አባላት",
    "Setup Profile": "መገለጫ አዘጋጅ", "Messages": "መልዕክቶች", "Likes": "መውደዶች",
    "Visitors": "ጎብኚዎች", "Compatibility": "ተኳሃኝነት", "Date Plans": "የቀጠሮ እቅዶች",
    "Safety Center": "የደህንነት ማዕከል", "My Account": "መለያዬ", "Privacy Settings": "የግላዊነት ቅንብሮች",
    "Edit Profile": "መገለጫ አርትዕ", "Sign out": "ውጣ",

    // gate / landing
    "Ethiopian": "ኢትዮጵያዊ", "Real People": "እውነተኛ ሰዎች", "Genuine Connections": "ትክክለኛ ግንኙነቶች", "A Better Tomorrow": "የተሻለ ነገ",
    "Connect with singles across Ethiopia looking for friendship, dating or marriage — with verified profiles, smart compatibility matching, and tools to meet safely.":
      "ጓደኝነት፣ ፍቅር ወይም ጋብቻ በሚፈልጉ በመላው ኢትዮጵያ ካሉ ነጠላዎች ጋር ይገናኙ — በተረጋገጡ መገለጫዎች፣ በብልህ የተኳሃኝነት ማዛመጃ እና በደህና ለመገናኘት በሚረዱ መሣሪያዎች።",
    "Sign In / Register Now": "አሁን ግባ / ተመዝገብ",
    "Learn more about Wana Dating ↓": "ስለ Wana Dating ተጨማሪ ይወቁ ↓",
    "← Back to marketplace": "← ወደ ገበያ ተመለስ",
    "Why Wana Dating": "ለምን Wana Dating",
    "Built for genuine connections, not endless swiping": "ለእውነተኛ ግንኙነት የተሰራ እንጂ ማለቂያ ለሌለው ማንሸራተት አይደለም",
    "Every part of Wana Dating is designed around one goal: helping you meet someone real, safely, and at your own pace.":
      "እያንዳንዱ የ Wana Dating ክፍል የተነደፈው በአንድ ግብ ዙሪያ ነው፦ እውነተኛ ሰው በደህና እና በራስዎ ፍጥነት እንዲያገኙ መርዳት።",
    "Verified profiles": "የተረጋገጡ መገለጫዎች",
    "Members can submit a selfie for review and earn a verified badge, so you know who you're really talking to.":
      "አባላት ለግምገማ ሰልፊ አስገብተው የማረጋገጫ ምልክት ማግኘት ይችላሉ፤ ስለዚህ ከማን ጋር እየተነጋገሩ እንደሆነ ያውቃሉ።",
    "Smart compatibility": "ብልህ ተኳሃኝነት",
    "Matching that looks at your preferences, lifestyle and relationship goals — not just a photo.":
      "ፎቶ ብቻ ሳይሆን ምርጫዎችዎን፣ አኗኗርዎን እና የግንኙነት ግቦችዎን የሚመለከት ማዛመድ።",
    "Guided date planning": "የተመራ የቀጠሮ እቅድ",
    "Plan a real-world meetup with built-in details and reminders, right inside the app.":
      "በመተግበሪያው ውስጥ ባሉ ዝርዝሮችና ማስታወሻዎች በአካል የሚደረግ ቀጠሮ ያዘጋጁ።",
    "Privacy on your terms": "ግላዊነት በእርስዎ ውሳኔ",
    "Choose who sees your posts and photos — everyone, or only your matches.":
      "ልጥፎችዎንና ፎቶዎችዎን ማን እንደሚያይ ይምረጡ — ሁሉም ሰው ወይም ተዛማጆችዎ ብቻ።",
    "Report & block tools": "የሪፖርት እና የማገድ መሣሪያዎች",
    "Our safety team reviews every report, so problem behavior doesn't stay on the platform.":
      "የደህንነት ቡድናችን እያንዳንዱን ሪፖርት ይገመግማል፤ ስለዚህ ችግር ፈጣሪ ባህሪ በመድረኩ ላይ አይቆይም።",
    "English & Amharic": "እንግሊዝኛ እና አማርኛ",
    "Use Wana Dating in the language you're most comfortable with.": "Wana Datingን በሚመቹበት ቋንቋ ይጠቀሙ።",
    "How it works": "እንዴት ይሰራል",
    "Three steps to your first conversation": "ወደ መጀመሪያ ውይይትዎ ሦስት ደረጃዎች",
    "No gimmicks — just a straightforward path from creating a profile to meeting someone in person, when you're ready.":
      "ምንም ማታለያ የለም — መገለጫ ከመፍጠር እስከ ዝግጁ ሲሆኑ በአካል መገናኘት ድረስ ቀጥተኛ መንገድ ብቻ።",
    "Create your profile": "መገለጫዎን ይፍጠሩ",
    "Add photos, write a short bio, and tell us what you're looking for — friendship, dating or marriage.":
      "ፎቶዎችን ያክሉ፣ አጭር መግለጫ ይጻፉ፣ እና ምን እንደሚፈልጉ ይንገሩን — ጓደኝነት፣ ፍቅር ወይም ጋብቻ።",
    "Get matched": "ተዛማጅ ያግኙ",
    "Browse singles near you, or let compatibility scoring highlight the people most worth saying hello to.":
      "በአቅራቢያዎ ያሉ ነጠላዎችን ያስሱ፣ ወይም የተኳሃኝነት ውጤት ሰላም ሊሏቸው የሚገቡ ሰዎችን ያሳይዎ።",
    "Meet safely": "በደህና ተገናኙ",
    "Chat, then plan a date using our built-in tools — on your terms, when you're ready.":
      "ይወያዩ፣ ከዚያ በመተግበሪያው መሣሪያዎች ቀጠሮ ያቅዱ — በራስዎ ውሳኔ፣ ዝግጁ ሲሆኑ።",
    "About us": "ስለ እኛ", "Part of the WanaGebya platform": "የ WanaGebya መድረክ አካል",
    "Wana Dating is the dating space inside WanaGebya, built for people in Ethiopia looking for a genuine connection. We believe good matchmaking starts with trust — which is why profile verification, flexible privacy controls and a dedicated safety team are built into the product, not bolted on afterward.":
      "Wana Dating በ WanaGebya ውስጥ ያለ የፍቅር ግንኙነት ቦታ ሲሆን እውነተኛ ግንኙነት ለሚፈልጉ በኢትዮጵያ ላሉ ሰዎች የተሰራ ነው። ጥሩ ማዛመድ የሚጀምረው በእምነት ነው ብለን እናምናለን — ለዚህም ነው የመገለጫ ማረጋገጫ፣ ተለዋዋጭ የግላዊነት ቁጥጥሮች እና ራሱን የቻለ የደህንነት ቡድን ከኋላ የተጨመሩ ሳይሆኑ በምርቱ ውስጥ የተካተቱት።",
    "Whether you're here to make a new friend, find someone to date, or look for a life partner, Wana Dating is built to help you do it on your own terms — at your own pace, with your privacy respected throughout.":
      "አዲስ ጓደኛ ለማፍራት፣ የሚወዱትን ሰው ለማግኘት ወይም የሕይወት አጋር ለመፈለግ የመጡ ቢሆኑም፣ Wana Dating በራስዎ ውሳኔ፣ በራስዎ ፍጥነት እና ግላዊነትዎ ተከብሮ እንዲያደርጉት ለመርዳት የተሰራ ነው።",
    "🇪🇹 Made for Ethiopia": "🇪🇹 ለኢትዮጵያ የተሰራ", "🛡️ Safety-first design": "🛡️ ደህንነትን የሚያስቀድም ንድፍ",
    "🔒 Privacy controls": "🔒 የግላዊነት ቁጥጥሮች", "💬 English & Amharic": "💬 እንግሊዝኛ እና አማርኛ",
    "Profile verification": "የመገለጫ ማረጋገጫ", "Selfie review": "የሰልፊ ግምገማ",
    "Who sees your posts": "ልጥፎችዎን ማን ያያል", "Your choice": "የእርስዎ ምርጫ",
    "Reports & blocks": "ሪፖርቶችና ማገጃዎች", "Team-reviewed": "በቡድን የሚገመገም",
    "Date planning": "የቀጠሮ እቅድ", "Built-in": "አብሮ የተሰራ", "Languages": "ቋንቋዎች", "English, Amharic": "እንግሊዝኛ፣ አማርኛ",
    "Ready to meet someone real?": "እውነተኛ ሰው ለመገናኘት ዝግጁ ነዎት?",
    "It takes a minute to create your profile — and you control what you share.":
      "መገለጫ ለመፍጠር አንድ ደቂቃ ብቻ ይወስዳል — የሚያጋሩትንም እርስዎ ይቆጣጠራሉ።",

    // home
    "Meet someone who feels right. ❤️": "ልብዎ የሚፈልገውን ሰው ይገናኙ። ❤️",
    "Discover genuine connections based on your preferences, lifestyle and relationship goals.":
      "በምርጫዎችዎ፣ በአኗኗርዎ እና በግንኙነት ግቦችዎ ላይ የተመሠረቱ እውነተኛ ግንኙነቶችን ያግኙ።",
    "🔎 Discover matches": "🔎 ተዛማጆችን ያግኙ", "✨ New members": "✨ አዲስ አባላት", "✦ Improve my profile": "✦ መገለጫዬን አሻሽል",
    "Set up your profile to post and send messages.": "ለመለጠፍ እና መልዕክት ለመላክ መገለጫዎን ያዘጋጁ።",
    "Set up now": "አሁን አዘጋጅ",
    "Share how you're feeling, or what you are looking for...": "ምን እንደሚሰማዎት ወይም ምን እንደሚፈልጉ ያካፍሉ...",
    "🖼️ Add Photo": "🖼️ ፎቶ ጨምር", "🌍 Public (Everyone)": "🌍 ይፋዊ (ለሁሉም)", "👥 Only My Matches": "👥 ተዛማጆቼ ብቻ", "Post": "ለጥፍ",
    "No posts yet — be the first to share something!": "እስካሁን ምንም ልጥፍ የለም — መጀመሪያ የሚያጋራ ይሁኑ!",

    // browse
    "Find Singles": "ነጠላዎችን ያግኙ", "Online": "መስመር ላይ",
    "Browse people near you looking for friendship, dating, or marriage. Like a profile to start chatting.":
      "ጓደኝነት፣ ፍቅር ወይም ጋብቻ የሚፈልጉ በአቅራቢያዎ ያሉ ሰዎችን ያስሱ። ለመወያየት መገለጫን ይወዱ።",
    "Show: Everyone": "አሳይ፦ ሁሉንም", "Men": "ወንዶች", "Women": "ሴቶች", "Any Purpose": "ማንኛውም ዓላማ",
    "Friendship": "ጓደኝነት", "Dating": "ፍቅር", "Marriage": "ጋብቻ",
    "Filter by City...": "በከተማ አጣራ...", "Min age": "ዝቅተኛ ዕድሜ", "Max age": "ከፍተኛ ዕድሜ",
    "Any Religion": "ማንኛውም ሃይማኖት", "Orthodox Christian": "ኦርቶዶክስ ክርስቲያን", "Protestant": "ፕሮቴስታንት",
    "Muslim": "ሙስሊም", "Catholic": "ካቶሊክ", "Traditional": "ባህላዊ", "Other": "ሌላ", "Prefer not to say": "መናገር አልፈልግም",
    "Any Lifestyle": "ማንኛውም አኗኗር", "Active & Outdoorsy": "ንቁ እና ከቤት ውጭ ወዳድ", "Homebody": "ቤት ወዳድ",
    "Social & Outgoing": "ማኅበራዊ እና ተግባቢ", "Balanced": "ሚዛናዊ", "Career-focused": "ሥራ ላይ ያተኮረ", "Family-oriented": "ቤተሰብ ወዳድ",
    "Has kids: Any": "ልጆች አሉት፦ ማንኛውም", "Wants kids: Any": "ልጆች ይፈልጋል፦ ማንኛውም",
    "Yes": "አዎ", "No": "አይ", "Maybe": "ምናልባት",
    "Online now": "አሁን መስመር ላይ", "Verified only": "የተረጋገጡ ብቻ",
    "Filter Results": "ውጤቱን አጣራ", "Clear filters": "ማጣሪያዎችን አጽዳ",
    "No profiles match your filters yet — check back soon.": "ከማጣሪያዎችዎ ጋር የሚዛመድ መገለጫ እስካሁን የለም — በቅርቡ ተመልሰው ይመልከቱ።",
    "Load More Profiles": "ተጨማሪ መገለጫዎችን ጫን",

    // new members
    "New": "አዲስ", "Members": "አባላት", "People who've just joined, newest first.": "አሁን የተቀላቀሉ ሰዎች፣ አዲሱ መጀመሪያ።",
    "No new members to show right now.": "አሁን የሚታይ አዲስ አባል የለም።",

    // profile form
    "Create Your": "የእርስዎን", "Dating Profile": "የፍቅር መገለጫ ይፍጠሩ",
    "Fill out the details below to start matching with people.": "ከሰዎች ጋር መዛመድ ለመጀመር ከታች ያሉትን ዝርዝሮች ይሙሉ።",
    "First Name (Shown Publicly)": "ስም (በይፋ ይታያል)", "Your name": "ስምዎ", "Age": "ዕድሜ", "City": "ከተማ", "e.g. Addis Ababa": "ለምሳሌ አዲስ አበባ",
    "I Am A": "እኔ", "Select Gender": "ጾታ ይምረጡ", "Male": "ወንድ", "Female": "ሴት", "Looking For": "የምፈልገው", "Any": "ማንኛውም",
    "My Goal / Purpose": "ግቤ / ዓላማዬ", "Select Goal": "ግብ ይምረጡ",
    "What I'm Looking For Details": "የምፈልገው ዝርዝር", "Select Details": "ዝርዝር ይምረጡ",
    "Long-term relationship": "የረጅም ጊዜ ግንኙነት", "Something casual": "ቀለል ያለ ግንኙነት", "New friends": "አዲስ ጓደኞች", "Not sure yet": "እስካሁን እርግጠኛ አይደለሁም",
    "Interested In Ages (Min)": "የምፈልገው ዕድሜ (ዝቅተኛ)", "Interested In Ages (Max)": "የምፈልገው ዕድሜ (ከፍተኛ)",
    "Min Age": "ዝቅተኛ ዕድሜ", "Max Age": "ከፍተኛ ዕድሜ",
    "My Lifestyle": "አኗኗሬ", "Select Lifestyle": "አኗኗር ይምረጡ", "Have Kids?": "ልጆች አሉዎት?", "Want Kids?": "ልጆች ይፈልጋሉ?", "Select": "ይምረጡ",
    "Religion": "ሃይማኖት", "Select Religion": "ሃይማኖት ይምረጡ",
    "Occupation (Optional)": "ሙያ (አማራጭ)", "e.g. Engineer": "ለምሳሌ መሐንዲስ", "Income (Optional)": "ገቢ (አማራጭ)",
    "Under 10,000 ETB/mo": "ከ10,000 ብር/ወር በታች", "10,000–25,000 ETB/mo": "10,000–25,000 ብር/ወር",
    "25,000–50,000 ETB/mo": "25,000–50,000 ብር/ወር", "50,000–100,000 ETB/mo": "50,000–100,000 ብር/ወር", "100,000+ ETB/mo": "100,000+ ብር/ወር",
    "About You (Max 500 chars)": "ስለ እርስዎ (ቢበዛ 500 ቁምፊዎች)",
    "Tell people a bit about your hobbies, interests, and what makes you unique...": "ስለ ትርፍ ጊዜ ማሳለፊያዎችዎ፣ ፍላጎቶችዎ እና ልዩ የሚያደርግዎትን ለሰዎች ይንገሩ...",
    "Upload Photos (Up to 3)": "ፎቶዎችን ይስቀሉ (እስከ 3)",
    "I confirm I am 18 years or older and this information is accurate.": "ዕድሜዬ 18 ዓመት ወይም ከዚያ በላይ መሆኑን እና መረጃው ትክክል መሆኑን አረጋግጣለሁ።",
    "Publish My Profile": "መገለጫዬን አትም",

    // messages / likes / visitors
    "Your": "የእርስዎ",
    "No messages yet. Match with someone from Browse to start a conversation!": "እስካሁን መልዕክት የለም። ውይይት ለመጀመር ከ«ተዛማጆችን ፈልግ» ከአንድ ሰው ጋር ይዛመዱ!",
    "People Who": "እነዚህ ሰዎች", "Liked You": "ወደውዎታል",
    "Like them back to match and start chatting.": "ለመዛመድ እና ለመወያየት መልሰው ይውደዷቸው።",
    "No one has liked your profile yet. Make sure you have a great photo!": "እስካሁን ማንም መገለጫዎን አልወደደም። ጥሩ ፎቶ እንዳለዎት ያረጋግጡ!",
    "Who": "ማን", "Viewed You": "ጎበኘዎት",
    "People who've recently looked at your profile, most recent first.": "በቅርቡ መገለጫዎን የተመለከቱ ሰዎች፣ የቅርብ ጊዜው መጀመሪያ።",
    "No one has viewed your profile yet.": "እስካሁን ማንም መገለጫዎን አልጎበኘም።",

    // compatibility / date plans
    "Recommendations respect your gender preference and the other member’s preference first, then rank compatible goals, lifestyle, family plans and preferences.":
      "ምክሮች በመጀመሪያ የእርስዎን እና የሌላኛውን አባል የጾታ ምርጫ ያከብራሉ፤ ከዚያም ተኳሃኝ ግቦችን፣ አኗኗርን፣ የቤተሰብ እቅዶችን እና ምርጫዎችን ደረጃ ይሰጣሉ።",
    "Complete your dating profile to unlock personalized compatibility scores.": "ለእርስዎ የተበጀ የተኳሃኝነት ውጤት ለማግኘት የፍቅር መገለጫዎን ያጠናቅቁ።",
    "Plan a safe meetup with a mutual match, respond to invitations, and keep the details in one place.":
      "ከተዛማጅዎ ጋር ደህንነቱ የተጠበቀ ቀጠሮ ያቅዱ፣ ለግብዣዎች ምላሽ ይስጡ፣ እና ዝርዝሮቹን በአንድ ቦታ ያስቀምጡ።",
    "Upcoming": "የሚመጡ", "Needs response": "ምላሽ ይፈልጋል", "All plans": "ሁሉም እቅዶች",

    // safety
    "Safety &": "ደህንነት እና", "Trust Center": "የእምነት ማዕከል",
    "Verify your profile, control notifications, report concerns and keep your dating experience safer.":
      "መገለጫዎን ያረጋግጡ፣ ማሳወቂያዎችን ይቆጣጠሩ፣ ስጋቶችን ሪፖርት ያድርጉ እና የፍቅር ልምድዎን የበለጠ ደህንነቱ የተጠበቀ ያድርጉ።",
    "Submit a private selfie for moderator review and show a verified badge on your profile.":
      "ለአስተዳዳሪ ግምገማ የግል ሰልፊ ያስገቡ እና በመገለጫዎ ላይ የማረጋገጫ ምልክት ያሳዩ።",
    "Verify profile": "መገለጫ አረጋግጥ", "Report & block": "ሪፖርት እና ማገድ",
    "If someone behaves abusively, scams, harasses or violates community rules, report the profile and block them.":
      "አንድ ሰው ጥቃት ካደረሰ፣ ካጭበረበረ፣ ካስቸገረ ወይም የማኅበረሰብ ደንቦችን ከጣሰ መገለጫውን ሪፖርት ያድርጉ እና ያግዱት።",
    "Report a concern": "ስጋት ሪፖርት አድርግ", "Push notifications": "ፑሽ ማሳወቂያዎች",
    "Get browser notifications for important dating activity. Permission is always controlled by you.":
      "ለአስፈላጊ የፍቅር እንቅስቃሴዎች የአሳሽ ማሳወቂያዎችን ያግኙ። ፈቃዱ ሁልጊዜ በእርስዎ ቁጥጥር ስር ነው።",
    "Enable notifications": "ማሳወቂያዎችን አንቃ", "Amharic": "አማርኛ",
    "Switch the Wana Dating interface between English and Amharic from the language control above.":
      "ከላይ ካለው የቋንቋ መቆጣጠሪያ የ Wana Dating በይነገጽን በእንግሊዝኛ እና በአማርኛ መካከል ይቀይሩ።",
    "Dating safety reminders": "የደህንነት ማስታወሻዎች",
    "Never send passwords, verification codes or money to another member. Meet in a public place and tell someone you trust where you are going.":
      "የይለፍ ቃል፣ የማረጋገጫ ኮድ ወይም ገንዘብ ለሌላ አባል በጭራሽ አይላኩ። በሕዝብ ቦታ ይገናኙ እና ወዴት እንደሚሄዱ የሚያምኑትን ሰው ይንገሩ።",

    // settings
    "Privacy": "ግላዊነት", "Settings": "ቅንብሮች",
    "Manage your account security and blocked contacts.": "የመለያዎን ደህንነት እና የታገዱ ሰዎችን ያስተዳድሩ።",
    "Who Can Contact You": "ማን ሊያገኝዎት ይችላል",
    "Control who can call you and who can see when you were last active.": "ማን ሊደውልልዎ እና መጨረሻ ንቁ የነበሩበትን ጊዜ ማን ማየት እንደሚችል ይቆጣጠሩ።",
    "Who can call you": "ማን ሊደውልልዎ ይችላል", "Who can see your last seen time": "መጨረሻ የታዩበትን ጊዜ ማን ማየት ይችላል",
    "Everybody": "ሁሉም", "Verified profiles only": "የተረጋገጡ መገለጫዎች ብቻ", "My matches only": "ተዛማጆቼ ብቻ", "Nobody": "ማንም",
    "Save Preferences": "ምርጫዎችን አስቀምጥ", "Change Password": "የይለፍ ቃል ቀይር", "New Password": "አዲስ የይለፍ ቃል",
    "Confirm Password": "የይለፍ ቃል አረጋግጥ", "Min 6 characters": "ቢያንስ 6 ቁምፊዎች", "Confirm new password": "አዲሱን የይለፍ ቃል ያረጋግጡ",
    "Update Password": "የይለፍ ቃል አዘምን", "Blocked Users": "የታገዱ ተጠቃሚዎች",
    "Users you have blocked cannot see your profile or message you.": "ያገዷቸው ተጠቃሚዎች መገለጫዎን ማየት ወይም መልዕክት መላክ አይችሉም።",
    "Loading...": "በመጫን ላይ...",

    // right rail
    "New matches on": "አዲስ ተዛማጆች በ", "Ethiopia": "ኢትዮጵያ",
    "Finding your best matches…": "ምርጥ ተዛማጆችዎን በመፈለግ ላይ…", "SEE ALL YOUR MATCHES": "ሁሉንም ተዛማጆችዎን ይመልከቱ",

    // document title
    "Dating — WanaGebya": "ፍቅር — WanaGebya"
  };

  var has = Object.prototype.hasOwnProperty;

  // ---- strings built in app.js / safety.js / date-planning.js (alerts, modals, cards, toasts) ----
  var EXTRA = {
    "Account created — sign in with your phone number and password.": "መለያ ተፈጥሯል — በስልክ ቁጥርዎ እና በይለፍ ቃልዎ ይግቡ።",
    "Active Platinum is required.": "ንቁ የፕላቲነም አባልነት ያስፈልጋል።", "Add": "ጨምር", "Address / Location": "አድራሻ / አካባቢ",
    "Age range you're interested in": "የሚፈልጉት የዕድሜ ክልል", "About you": "ስለ እርስዎ", "About You": "ስለ እርስዎ", "Account": "መለያ",
    "Are you sure you want to permanently delete your dating profile? This cannot be undone.": "የፍቅር መገለጫዎን ሙሉ በሙሉ ለመሰረዝ እርግጠኛ ነዎት? ይህ ሊመለስ አይችልም።",
    "Back to chat": "ወደ ውይይት ተመለስ", "← Back to chat": "← ወደ ውይይት ተመለስ", "Before you continue": "ከመቀጠልዎ በፊት",
    "Block": "አግድ", "Block this person? They won't be able to message you, and any match will end. You can unblock later in Privacy Settings.": "ይህን ሰው ማገድ ይፈልጋሉ? መልዕክት መላክ አይችልም፣ ማንኛውም ተዛማጅነትም ይቋረጣል። በኋላ በግላዊነት ቅንብሮች ውስጥ ማንሳት ይችላሉ።",
    "Cancel": "ተው", "Change": "ለውጥ", "Changes Saved!": "ለውጦች ተቀምጠዋል!",
    "Check your email to confirm your account, then sign in.": "መለያዎን ለማረጋገጥ ኢሜይልዎን ይመልከቱ፣ ከዚያ ይግቡ።",
    "Choose a file first.": "መጀመሪያ ፋይል ይምረጡ።", "Choose or take a selfie first.": "መጀመሪያ ሰልፊ ይምረጡ ወይም ያንሱ።",
    "Confirm password": "የይለፍ ቃል ያረጋግጡ", "Contact Support": "ድጋፍ ያግኙ", "Continue": "ቀጥል", "Conversation": "ውይይት",
    "Create Account": "መለያ ፍጠር", "Creating account...": "መለያ በመፍጠር ላይ...", "Date of birth": "የትውልድ ቀን",
    "Decline": "እምቢ በል", "Delete": "ሰርዝ", "Delete Profile": "መገለጫ ሰርዝ", "Delete this comment?": "ይህ አስተያየት ይሰረዝ?",
    "Delete this message for everyone? This can't be undone.": "ይህ መልዕክት ለሁሉም ይሰረዝ? ይህ ሊመለስ አይችልም።", "Delete this post?": "ይህ ልጥፍ ይሰረዝ?",
    "Edit": "አርትዕ", "(edited)": "(ተስተካክሏል)", "Email": "ኢሜይል", "✉️ Email": "✉️ ኢሜይል", "Enter": "አስገባ",
    "Enter a valid Ethio Telecom (09...) or Safaricom (07...) number.": "ትክክለኛ የኢትዮ ቴሌኮም (09...) ወይም የሳፋሪኮም (07...) ቁጥር ያስገቡ።",
    "Enter your date of birth.": "የትውልድ ቀንዎን ያስገቡ።", "Enter your email above first.": "መጀመሪያ ከላይ ኢሜይልዎን ያስገቡ።",
    "File must be 10 MB or smaller.": "ፋይሉ 10 ሜጋባይት ወይም ከዚያ በታች መሆን አለበት።", "Images must be 5 MB or smaller.": "ምስሎች 5 ሜጋባይት ወይም ከዚያ በታች መሆን አለባቸው።",
    "First name": "ስም", "Forgot password?": "የይለፍ ቃል ረሱ?", "Full name": "ሙሉ ስም", "Get Verified": "ይረጋገጡ",
    "Get a Verified Badge ✅": "የማረጋገጫ ምልክት ያግኙ ✅", "Gift": "ስጦታ", "Gifts are a Platinum feature. Upgrade to Platinum first.": "ስጦታ የፕላቲነም ባህሪ ነው። መጀመሪያ ወደ ፕላቲነም ያሻሽሉ።",
    "Go to Browse": "ወደ ማሰስ ሂድ", "Go to Home feed": "ወደ መነሻ ገጽ ሂድ", "Got it, continue": "ገባኝ፣ ቀጥል", "Got it": "ገባኝ", "Hang up": "ዝጋ",
    "Has kids:": "ልጆች አሉት፦", "Wants kids:": "ልጆች ይፈልጋል፦", "Looking for:": "የሚፈልገው፦", "Interested in ages:": "የሚፈልገው ዕድሜ፦",
    "Lifestyle:": "አኗኗር፦", "Religion:": "ሃይማኖት፦", "Occupation:": "ሙያ፦", "Income:": "ገቢ፦",
    "I'm Interested In": "የምፈልገው", "In call": "በጥሪ ላይ", "Incoming call...": "ገቢ ጥሪ...", "Ringing...": "እየጮኸ ነው...",
    "It's a match! ✨": "ተዛመዳችሁ! ✨", "Loading…": "በመጫን ላይ…", "Looking to connect": "ለመገናኘት ይፈልጋል", "Match": "ተዛማጅ",
    "Monthly": "ወርሃዊ", "Weekly": "ሳምንታዊ", "My Gender": "ጾታዬ", "My Profile": "መገለጫዬ", "Nearby": "በአቅራቢያ", "Never": "በጭራሽ",
    "Never send money": "ገንዘብ በጭራሽ አይላኩ", "Not supported in this browser.": "በዚህ አሳሽ አይደገፍም።", "Notification": "ማሳወቂያ", "OK": "እሺ",
    "Optional message": "አማራጭ መልዕክት", "Password": "የይለፍ ቃል", "Phone number": "ስልክ ቁጥር", "Phone number (optional)": "ስልክ ቁጥር (አማራጭ)", "📱 Phone": "📱 ስልክ",
    "Photo updated.": "ፎቶ ተዘምኗል።", "Platinum": "ፕላቲነም", "Platinum member": "የፕላቲነም አባል", "Platinum tier": "የፕላቲነም ደረጃ", "💎 Go Platinum": "💎 ወደ ፕላቲነም ይሂዱ",
    "Privacy Policy": "የግላዊነት ፖሊሲ", "Terms of Use": "የአጠቃቀም ደንቦች",
    "Profile Published Successfully!": "መገለጫ በተሳካ ሁኔታ ታትሟል!", "Profile updated successfully!": "መገለጫ በተሳካ ሁኔታ ተዘምኗል!",
    "Profile published successfully.": "መገለጫ በተሳካ ሁኔታ ታትሟል።", "Profile updated successfully.": "መገለጫ በተሳካ ሁኔታ ተዘምኗል።",
    "Publishing Profile...": "መገለጫ በማተም ላይ...", "Publishing Profile…": "መገለጫ በማተም ላይ…",
    "Record voice message": "የድምፅ መልዕክት ቅዳ", "Register": "ተመዝገብ", "Remove photo": "ፎቶ አስወግድ", "Report": "ሪፖርት",
    "Report submitted. Thank you — our team will review it.": "ሪፖርቱ ገብቷል። እናመሰግናለን — ቡድናችን ይገመግመዋል።",
    "Save": "አስቀምጥ", "Save Changes": "ለውጦችን አስቀምጥ", "Saved.": "ተቀምጧል።", "Saving...": "በማስቀመጥ ላይ...", "Say hello...": "ሰላም ይበሉ...",
    "Seen": "ታይቷል", "Send Message": "መልዕክት ላክ", "Send Message 🚀": "መልዕክት ላክ 🚀", "Send a message": "መልዕክት ላክ", "Sent!": "ተልኳል!",
    "Sign In": "ግባ", "Signing in...": "በመግባት ላይ...", "Someone": "አንድ ሰው", "Someone liked your profile": "አንድ ሰው መገለጫዎን ወዶታል",
    "Something went wrong.": "የሆነ ችግር ተፈጥሯል።", "Something went wrong. Please try again.": "የሆነ ችግር ተፈጥሯል። እባክዎ እንደገና ይሞክሩ።",
    "Stay Safe While Dating 🛡️": "በፍቅር ጉዞዎ ደህንነትዎን ይጠብቁ 🛡️", "Submit for Review": "ለግምገማ አስገባ", "Submitting...": "በማስገባት ላይ...",
    "Try Again": "እንደገና ሞክር", "Turn off notifications": "ማሳወቂያዎችን አጥፋ", "Type a message...": "መልዕክት ይጻፉ...", "Unblock": "አገዳ አንሳ",
    "Unmatch": "ተዛማጅነት አቋርጥ", "Unknown User": "ያልታወቀ ተጠቃሚ", "Updating...": "በማዘመን ላይ...", "Uploading... please wait.": "በመስቀል ላይ... እባክዎ ይጠብቁ።",
    "VIEW PROFILE": "መገለጫ ይመልከቱ", "View profile": "መገለጫ ይመልከቱ", "Verified": "የተረጋገጠ", "Verified profile": "የተረጋገጠ መገለጫ",
    "Verify Your Profile ✅": "መገለጫዎን ያረጋግጡ ✅", "Viewed": "ተጎብኝቷል", "Voice call": "የድምፅ ጥሪ",
    "Wana Dating is only for people aged 18 and over.": "Wana Dating ዕድሜያቸው 18 እና ከዚያ በላይ ለሆኑ ሰዎች ብቻ ነው።",
    "Today": "ዛሬ", "Yesterday": "ትናንት", "You have a new message": "አዲስ መልዕክት አለዎት", "You have new activity": "አዲስ እንቅስቃሴ አለዎት",
    "You haven't blocked anyone.": "ማንንም አላገዱም።", "You haven't posted a profile yet.": "እስካሁን መገለጫ አልለጠፉም።", "You received a gift": "ስጦታ ተቀብለዋል",
    "You're already in a call.": "አስቀድመው በጥሪ ላይ ነዎት።", "You're sending messages very quickly. Please wait a moment.": "መልዕክቶችን በጣም በፍጥነት እየላኩ ነው። እባክዎ ትንሽ ይጠብቁ።",
    "Your account is suspended": "መለያዎ ታግዷል", "Write a comment...": "አስተያየት ይጻፉ...", "Write something first.": "መጀመሪያ የሆነ ነገር ይጻፉ።",
    "What's the issue with this post?": "በዚህ ልጥፍ ላይ ያለው ችግር ምንድን ነው?",
    "What is the issue with this profile? (e.g. fake photos, harassment, scam)": "በዚህ መገለጫ ላይ ያለው ችግር ምንድን ነው? (ለምሳሌ የውሸት ፎቶ፣ ትንኮሳ፣ ማጭበርበር)",
    "💛 Like Profile": "💛 መገለጫን ውደድ", "💛 Liked! If they like you back, it's a match.": "💛 ወደዋቸዋል! መልሰው ከወደዱዎት ይዛመዳሉ።",
    "🎉 It's a match! You can message each other now.": "🎉 ተዛመዳችሁ! አሁን መልዕክት መለዋወጥ ትችላላችሁ።",
    "💬 Message": "💬 መልዕክት", "📅 Plan a Date": "📅 ቀጠሮ አዘጋጅ", "🎁 Send Gift": "🎁 ስጦታ ላክ", "🎁 Send gift": "🎁 ስጦታ ላክ",
    "🎁 Gifts you've received": "🎁 የተቀበሏቸው ስጦታዎች", "🎙️ Mute": "🎙️ ድምፅ አጥፋ", "😀 React": "😀 ምላሽ", "⚙️ Settings": "⚙️ ቅንብሮች",
    "✅ Your profile is officially verified!": "✅ መገለጫዎ በይፋ ተረጋግጧል!",
    "⏳ Your verification photo is under review. Please check back later.": "⏳ የማረጋገጫ ፎቶዎ እየተገመገመ ነው። እባክዎ በኋላ ይመልከቱ።",
    "Passwords do not match.": "የይለፍ ቃሎቹ አይመሳሰሉም።", "Passwords don't match.": "የይለፍ ቃሎቹ አይመሳሰሉም።",
    "Password must be at least 6 characters.": "የይለፍ ቃል ቢያንስ 6 ቁምፊዎች መሆን አለበት።", "Password reset email sent.": "የይለፍ ቃል ማስጀመሪያ ኢሜይል ተልኳል።",
    "Password updated securely!": "የይለፍ ቃል በደህና ተዘምኗል!", "Please complete the security check first.": "እባክዎ መጀመሪያ የደህንነት ፍተሻውን ያጠናቅቁ።",
    "Please confirm you are 18 or older and accept the Terms and Privacy Policy.": "እባክዎ ዕድሜዎ 18 ወይም ከዚያ በላይ መሆኑን ያረጋግጡ እና ደንቦቹን እና የግላዊነት ፖሊሲውን ይቀበሉ።",
    "Please describe the problem in a few words.": "እባክዎ ችግሩን በጥቂት ቃላት ይግለጹ።", "Please enter text or attach an image.": "እባክዎ ጽሑፍ ያስገቡ ወይም ምስል ያያይዙ።",
    "Please sign in to report a profile.": "መገለጫ ሪፖርት ለማድረግ እባክዎ ይግቡ።", "Please tick the box to continue.": "ለመቀጠል እባክዎ ሳጥኑን ምልክት ያድርጉ።",
    "Post shared!": "ልጥፍ ተጋርቷል!", "Post shared": "ልጥፍ ተጋርቷል", "Thanks — we'll take a look.": "እናመሰግናለን — እንመለከተዋለን።",
    "This call is no longer available.": "ይህ ጥሪ አሁን የለም።", "This person doesn't have a dating profile to view.": "ይህ ሰው የሚታይ የፍቅር መገለጫ የለውም።",
    "Voice calls are a Platinum feature. Upgrade to Platinum to start calling your matches.": "የድምፅ ጥሪ የፕላቲነም ባህሪ ነው። ተዛማጆችዎን ለመደወል ወደ ፕላቲነም ያሻሽሉ።",
    "Unblock this user? They will be able to see your profile and message you again if you match.": "ይህ ተጠቃሚ ይፈታ? ከተዛመዳችሁ መገለጫዎን ማየት እና መልዕክት መላክ ይችላል።",
    "No gifts are available right now.": "አሁን የሚገኝ ስጦታ የለም።", "No new members are available right now.": "አሁን የሚገኝ አዲስ አባል የለም።",
    "Couldn't load new members right now.": "አሁን አዲስ አባላትን መጫን አልተቻለም።", "Couldn't load profiles right now.": "አሁን መገለጫዎችን መጫን አልተቻለም።",
    "Couldn't load notifications.": "ማሳወቂያዎችን መጫን አልተቻለም።", "Couldn't load blocked users.": "የታገዱ ተጠቃሚዎችን መጫን አልተቻለም።",
    "Complete your profile to get personalized recommendations.": "ለእርስዎ የተበጁ ምክሮችን ለማግኘት መገለጫዎን ያጠናቅቁ።",
    "No strong matches yet. Add more profile details to improve your recommendations.": "እስካሁን ጠንካራ ተዛማጅ የለም። ምክሮችዎን ለማሻሻል ተጨማሪ የመገለጫ ዝርዝሮችን ያክሉ።",
    "No strong matches yet. Try adding more profile details.": "እስካሁን ጠንካራ ተዛማጅ የለም። ተጨማሪ የመገለጫ ዝርዝሮችን ለማከል ይሞክሩ።",
    "Recommendations are temporarily unavailable.": "ምክሮች ለጊዜው አይገኙም።",
    "Nothing yet — likes, matches and messages will show up here.": "እስካሁን ምንም የለም — መውደዶች፣ ተዛማጆች እና መልዕክቶች እዚህ ይታያሉ።",
    "Notifications are on.": "ማሳወቂያዎች በርተዋል።", "Permission wasn't granted, so notifications stay off.": "ፈቃድ ስላልተሰጠ ማሳወቂያዎች ጠፍተው ይቆያሉ።",
    "You can't message, like or call. Please contact Support.": "መልዕክት መላክ፣ መውደድ ወይም መደወል አይችሉም። እባክዎ ድጋፍ ያግኙ።",
    "Your saved details are filled in below. Change anything you like, then save.": "የተቀመጡ ዝርዝሮችዎ ከታች ተሞልተዋል። የሚፈልጉትን ይለውጡ፣ ከዚያ ያስቀምጡ።",
    "Calculated from your date of birth": "ከትውልድ ቀንዎ የተሰላ",
    "Others only see your age, never your birth date. It can't be changed later without contacting support.": "ሌሎች ዕድሜዎን ብቻ ያያሉ፣ የትውልድ ቀንዎን በጭራሽ። ድጋፍን ሳያነጋግሩ በኋላ ሊቀየር አይችልም።",
    "Your photos (up to 3)": "ፎቶዎችዎ (እስከ 3)", "Your gender": "ጾታዎ", "Your lifestyle": "አኗኗርዎ", "Whether you have kids": "ልጆች እንዳሉዎት",
    "Whether you want kids": "ልጆች እንደሚፈልጉ", "Who you're interested in": "የሚፈልጉት ሰው", "What you're looking for": "የሚፈልጉት", "What I'm Looking For": "የምፈልገው",
    "Tell a friend or family member where you're going for a first meetup.": "ለመጀመሪያ ቀጠሮ ወዴት እንደሚሄዱ ለጓደኛ ወይም ለቤተሰብ አባል ይንገሩ።",
    "Trust your instincts — if something feels off, use Report or Block.": "በደመነፍስዎ ይተማመኑ — የሆነ ነገር ከተሳሳተ ሪፖርት ወይም አግድ ይጠቀሙ።",
    "If you are in immediate danger, contact your local emergency services. Moderators can't respond to emergencies.": "አፋጣኝ አደጋ ላይ ከሆኑ የአካባቢዎን የድንገተኛ አገልግሎት ያነጋግሩ። አስተዳዳሪዎች ለድንገተኛ ሁኔታዎች ምላሽ መስጠት አይችሉም።",
    "This photo stays private and is only used for review.": "ይህ ፎቶ የግል ሆኖ ይቆያል፤ ለግምገማ ብቻ ይውላል።",
    "Confirm a quick selfie matches your profile photos to stand out.": "ጎልቶ ለመታየት ፈጣን ሰልፊ ከመገለጫ ፎቶዎችዎ ጋር እንደሚመሳሰል ያረጋግጡ።",
    "Voice messages require a verified profile. Verify your profile to unlock this.": "የድምፅ መልዕክት የተረጋገጠ መገለጫ ይፈልጋል። ይህን ለመክፈት መገለጫዎን ያረጋግጡ።",
    "Unlimited messaging, voice messages, and calls — plus read receipts.": "ያልተገደበ መልዕክት፣ የድምፅ መልዕክት እና ጥሪ — እንዲሁም የንባብ ማረጋገጫ።",
    "We're finishing our payment details. Please contact Support and we'll help you upgrade.": "የክፍያ ዝርዝራችንን እያጠናቀቅን ነው። እባክዎ ድጋፍን ያነጋግሩ፣ እናግዝዎታለን።",
    "Platinum payment isn't open yet": "የፕላቲነም ክፍያ እስካሁን አልተከፈተም", "We can't open this account": "ይህን መለያ መክፈት አንችልም",

    // date planning (their existing wording kept where it already existed)
    "Upcoming": "ቀጣይ ቀጠሮዎች", "Needs response": "ምላሽ ያስፈልጋል", "Plan a Date": "ቀጠሮ አዘጋጅ", "Accept": "ተቀበል",
    "Cancel invitation": "ግብዣውን ሰርዝ", "Send Date Invitation": "የቀጠሮ ግብዣ ላክ", "Send Date Invitation 📅": "የቀጠሮ ግብዣ ላክ 📅", "Date invitation": "የቀጠሮ ግብዣ",
    "Same relationship goal": "ተመሳሳይ የግንኙነት ግብ", "Similar lifestyle": "ተመሳሳይ የአኗኗር ዘይቤ", "Family plans align": "የቤተሰብ እቅዶች ይጣጣማሉ",
    "Same city": "ተመሳሳይ ከተማ", "Shared faith": "ተመሳሳይ እምነት",
    "Date plans": "የቀጠሮ እቅዶች", "Date type": "የቀጠሮ ዓይነት", "In person": "በአካል", "Online date": "የመስመር ላይ ቀጠሮ", "Date": "ቀን", "Time": "ሰዓት",
    "Place / venue": "ቦታ / አዳራሽ", "Public place": "የሕዝብ ቦታ", "Notes (optional)": "ማስታወሻ (አማራጭ)", "Anything your match should know?": "ተዛማጅዎ ማወቅ ያለበት ነገር አለ?",
    "Online platform": "የመስመር ላይ መድረክ", "Meeting link / room (optional)": "የስብሰባ አገናኝ / ክፍል (አማራጭ)", "Optional meeting link": "አማራጭ የስብሰባ አገናኝ",
    "Open meeting link": "የስብሰባ አገናኙን ክፈት", "Choose a date and time.": "ቀን እና ሰዓት ይምረጡ።", "Choose a public place for an in-person date.": "ለአካል ቀጠሮ የሕዝብ ቦታ ይምረጡ።",
    "Meeting links must use HTTPS.": "የስብሰባ አገናኞች HTTPS መጠቀም አለባቸው።", "Date planning is available after a mutual match.": "የቀጠሮ እቅድ ከጋራ ተዛማጅነት በኋላ ይገኛል።",
    "Cancel this date invitation?": "ይህ የቀጠሮ ግብዣ ይሰረዝ?", "Date not set": "ቀን አልተወሰነም", "Confirmed": "ተረጋግጧል", "Needs your response": "ምላሽዎን ይፈልጋል",
    "You received this invitation": "ይህን ግብዣ ተቀብለዋል", "You sent this invitation": "ይህን ግብዣ ልከዋል", "No date plans in this view yet.": "በዚህ እይታ እስካሁን የቀጠሮ እቅድ የለም።",
    "Loading your date plans…": "የቀጠሮ እቅዶችዎን በመጫን ላይ…", "Finding your strongest mutual matches…": "ጠንካራ የጋራ ተዛማጆችዎን በመፈለግ ላይ…",
    "Smart matches are temporarily unavailable.": "ብልህ ተዛማጆች ለጊዜው አይገኙም።", "Average compatibility": "አማካይ ተኳሃኝነት", "Best matches": "ምርጥ ተዛማጆች",
    "Strong matches": "ጠንካራ ተዛማጆች", "Verified matches": "የተረጋገጡ ተዛማጆች", "Upcoming dates": "መጪ ቀጠሮዎች", "Find a match ❤️": "ተዛማጅ ያግኙ ❤️",
    "Gender preference fit": "የጾታ ምርጫ መስማማት", "Mutual age preference fit": "የጋራ የዕድሜ ምርጫ መስማማት", "Mutual preference fits": "የጋራ ምርጫ መስማማት",
    "Similar family situation": "ተመሳሳይ የቤተሰብ ሁኔታ", "Similar relationship preference": "ተመሳሳይ የግንኙነት ምርጫ", "Your preferences are compatible.": "ምርጫዎችዎ ተኳሃኝ ናቸው።",
    "New member": "አዲስ አባል", "Before you go": "ከመሄድዎ በፊት", "At the meetup": "በቀጠሮው ላይ", "If something feels wrong": "የሆነ ነገር ከተሳሳተ",
    "Safety checklist": "የደህንነት ዝርዝር", "🛡️ Date safety checklist": "🛡️ የቀጠሮ ደህንነት ዝርዝር",
    "Choose a public place, keep control of your own transport, and avoid sending money or sharing passwords/codes.": "የሕዝብ ቦታ ይምረጡ፣ የራስዎን ትራንስፖርት ይቆጣጠሩ፣ እና ገንዘብ ከመላክ ወይም የይለፍ ቃል/ኮድ ከማጋራት ይቆጠቡ።",
    "Tell someone you trust where you are going and when you expect to return.": "የሚያምኑትን ሰው ወዴት እንደሚሄዱ እና መቼ እንደሚመለሱ ይንገሩ።",
    "Leave, block/report the member in Wana, and contact local emergency services when appropriate.": "ይውጡ፣ አባሉን በ Wana ውስጥ ያግዱ/ሪፖርት ያድርጉ፣ እንዲሁም አስፈላጊ ሲሆን የአካባቢ የድንገተኛ አገልግሎት ያነጋግሩ።",
    "Choose an in-person meetup or an online date. Online dates are scheduled events; share a meeting link only if you trust the platform and recipient.": "በአካል ቀጠሮ ወይም የመስመር ላይ ቀጠሮ ይምረጡ። የመስመር ላይ ቀጠሮዎች የተያዙ ዝግጅቶች ናቸው፤ መድረኩን እና ተቀባዩን ካመኑ ብቻ የስብሰባ አገናኝ ያጋሩ።",
    "🟢 Online": "🟢 መስመር ላይ", "✓ Verified": "✓ የተረጋገጠ", "🛡️ Verified": "🛡️ የተረጋገጠ"
  };
  Object.keys(EXTRA).forEach(function (k) { AM[k] = EXTRA[k]; });

  // Messages that embed a name, number or server error text
  var PREFIX = {
    "Sign-in failed: ": "መግባት አልተሳካም፦ ", "Couldn't delete: ": "መሰረዝ አልተቻለም፦ ", "Couldn't comment: ": "አስተያየት መስጠት አልተቻለም፦ ",
    "Couldn't send report: ": "ሪፖርት መላክ አልተቻለም፦ ", "Couldn't unmatch right now: ": "አሁን ተዛማጅነት ማቋረጥ አልተቻለም፦ ",
    "Couldn't like right now: ": "አሁን መውደድ አልተቻለም፦ ", "Couldn't block right now: ": "አሁን ማገድ አልተቻለም፦ ",
    "Couldn't unblock right now: ": "አሁን አገዳ ማንሳት አልተቻለም፦ ", "Couldn't save edit: ": "ማስተካከያውን ማስቀመጥ አልተቻለም፦ ",
    "Couldn't start the call: ": "ጥሪውን መጀመር አልተቻለም፦ ", "Couldn't access microphone: ": "ማይክሮፎኑን መጠቀም አልተቻለም፦ ",
    "Something went wrong: ": "የሆነ ችግር ተፈጥሯል፦ "
  };
  var UNIT = { m: "ደቂቃ", h: "ሰዓት", d: "ቀን" };
  var VERB = { Joined: "ተቀላቅሏል", Viewed: "ተጎብኝቷል", Active: "ንቁ ነበር" };
  var RULES = [
    [/^Joined just now$/, function () { return "አሁን ተቀላቅሏል"; }],
    [/^(Joined|Viewed|Active) (\d+)(m|h|d) ago$/, function (m) { return "ከ" + m[2] + " " + UNIT[m[3]] + " በፊት " + VERB[m[1]]; }],
    [/^Gift sent to (.+)\.$/, function (m) { return "ስጦታ ለ" + m[1] + " ተልኳል።"; }],
    [/^Unmatch with (.+?)\? .*$/, function (m) { return "ከ" + m[1] + " ጋር ተዛማጅነት ይቋረጥ? በመልዕክቶች ውስጥ መተያየት ያቆማሉ፣ መልዕክት ለመለዋወጥ እንደገና መዛመድ ይኖርባችኋል።"; }],
    [/^You need to set up your profile before you can .+\. Set it up now\?$/, function () { return "ይህን ከማድረግዎ በፊት መገለጫዎን ማዘጋጀት ያስፈልጋል። አሁን ያዘጋጁ?"; }]
  ];

  // ---- round 2: sentences split across <b>/<a> tags, payment/Platinum, upload & call errors ----
  // Amharic is verb-final, so fragments of one English sentence are worded to read correctly when
  // they are shown back-to-back in the original element order.
  var EXTRA2 = {
    // consent line:  [text] [Terms of Use] and [Privacy Policy] .
    "I am 18 or older and I agree to the": "ዕድሜዬ 18 ወይም ከዚያ በላይ መሆኑን አረጋግጣለሁ፤ የምስማማባቸው፦",
    "By continuing you confirm you are 18 or older and agree to the": "በመቀጠልዎ ዕድሜዎ 18 ወይም ከዚያ በላይ መሆኑን ያረጋግጣሉ፤ እንዲሁም የሚስማሙባቸው፦",
    "and": "እና", "or": "ወይም",
    // safety guide
    "Never send money": "ገንዘብ",
    ", gifts, or account/card details to someone you haven't met.": "፣ ስጦታ ወይም የመለያ/ካርድ ዝርዝሮችን ላልተገናኙት ሰው በጭራሽ አይላኩ።",
    "Meet new people in a": "አዳዲስ ሰዎችን ለመጀመሪያዎቹ ጊዜያት",
    "public place": "በሕዝብ ቦታ", "for the first few times.": "ይገናኙ።",
    "A profile:": "መገለጫ፦",
    "open their profile card (Browse, New Members, Likes or Visitors) and choose": "የመገለጫ ካርዳቸውን (ማሰስ፣ አዲስ አባላት፣ መውደዶች ወይም ጎብኚዎች) ከፍተው",
    ". Choose": "ን ይምረጡ። ግንኙነትን ሙሉ በሙሉ ለማቋረጥ ደግሞ",
    "as well to stop all contact.": "ን ይምረጡ።",
    "A post:": "ልጥፍ፦", "use": "በመነሻ ገጽ ላይ ባለው ልጥፍ ላይ ያለውን", "on the post in the Home feed.": "ይጠቀሙ።",
    "Never": "በጭራሽ", "send money, passwords or verification codes to another member.": "ገንዘብ፣ የይለፍ ቃል ወይም የማረጋገጫ ኮድ ለሌላ አባል አይላኩ።",
    // empty states / hints
    "Go to the": "ለመጀመር ወደ", "tab to get started!": "ትር ይሂዱ!",
    "Complete profiles get 3x more matches! Add:": "የተሟሉ መገለጫዎች 3 እጥፍ ተጨማሪ ተዛማጆችን ያገኛሉ! ያክሉ፦",
    "Complete your Gender and Looking For selections in Setup Profile to see New Members.": "አዲስ አባላትን ለማየት በመገለጫ ማዘጋጃ ውስጥ የጾታ እና የሚፈልጉትን ምርጫዎች ያጠናቅቁ።",
    'Post a profile first (see the "Setup Profile" tab) before sharing to the Home feed.': "ወደ መነሻ ገጽ ከማጋራትዎ በፊት መጀመሪያ መገለጫ ይለጥፉ («መገለጫ አዘጋጅ» ትርን ይመልከቱ)።",
    "📷 Photo couldn't be loaded": "📷 ፎቶው መጫን አልቻለም", "Smart Match 2.0": "ብልህ ማዛመጃ 2.0",
    // Platinum / payment
    "Unlimited messaging, voice messages, calls, read receipts,": "ያልተገደበ መልዕክት፣ የድምፅ መልዕክት፣ ጥሪ፣ የንባብ ማረጋገጫ፣",
    "and Platinum gifts": "እና የፕላቲነም ስጦታዎች", "100 Birr": "100 ብር", "500 Birr": "500 ብር", "per week": "በሳምንት", "per month": "በወር",
    "After sending, attach your receipt below, or enter the transaction reference number (either one is enough). We'll review and activate your plan — this isn't instant.": "ከላኩ በኋላ ደረሰኝዎን ከታች ያያይዙ፣ ወይም የግብይት ማጣቀሻ ቁጥሩን ያስገቡ (ከሁለቱ አንዱ በቂ ነው)። እቅድዎን ገምግመን እናነቃለን — ይህ ወዲያውኑ አይደለም።",
    "Attach payment receipt or screenshot (or enter the transaction number above)": "የክፍያ ደረሰኝ ወይም ስክሪንሾት ያያይዙ (ወይም ከላይ የግብይት ቁጥሩን ያስገቡ)",
    "Attach your payment receipt, or enter the transaction number.": "የክፍያ ደረሰኝዎን ያያይዙ፣ ወይም የግብይት ቁጥሩን ያስገቡ።",
    "The transaction number looks too short. Fix it, or leave it empty if you attached a receipt.": "የግብይት ቁጥሩ በጣም አጭር ይመስላል። ያስተካክሉት፣ ወይም ደረሰኝ ካያያዙ ባዶ ይተዉት።",
    "Uploading receipt...": "ደረሰኝ በመስቀል ላይ...",
    "Gifts are visible to the recipient and are available only to active Platinum members.": "ስጦታዎች ለተቀባዩ ይታያሉ፤ ለንቁ የፕላቲነም አባላት ብቻ ይገኛሉ።",
    "Gifts aren't set up on the server yet. Please try again later.": "ስጦታዎች በአገልጋዩ ላይ እስካሁን አልተዘጋጁም። እባክዎ ቆይተው እንደገና ይሞክሩ።",
    "No gifts yet. Platinum members can send you a gift once you're matched.": "እስካሁን ስጦታ የለም። የፕላቲነም አባላት ከተዛመዳችሁ በኋላ ስጦታ ሊልኩልዎ ይችላሉ።",
    "Voice calls are a Platinum feature — upgrade to start calling": "የድምፅ ጥሪ የፕላቲነም ባህሪ ነው — ለመደወል ያሻሽሉ",
    "Voice message unavailable": "የድምፅ መልዕክት አይገኝም",
    // sign-in / forms / notifications
    "Auth check timed out": "የማረጋገጫ ፍተሻ ጊዜው አልፏል", "Can't connect": "መገናኘት አልተቻለም", "Opening Google…": "ጉግልን በመክፈት ላይ…",
    "Couldn't load the security check. Check your connection and reload the page.": "የደህንነት ፍተሻውን መጫን አልተቻለም። ግንኙነትዎን ያረጋግጡ እና ገጹን ያድሱ።",
    "Couldn't load your profile to update the photo.": "ፎቶውን ለማዘመን መገለጫዎን መጫን አልተቻለም።",
    "Couldn't load your visitors right now. Please try again later.": "አሁን ጎብኚዎችዎን መጫን አልተቻለም። እባክዎ ቆይተው እንደገና ይሞክሩ።",
    "Couldn't save your date of birth.": "የትውልድ ቀንዎን ማስቀመጥ አልተቻለም።",
    "Couldn't send: recipient profile unavailable.": "መላክ አልተቻለም፦ የተቀባዩ መገለጫ አይገኝም።",
    "Minimum age can't be greater than maximum age.": "ዝቅተኛው ዕድሜ ከከፍተኛው ዕድሜ መብለጥ አይችልም።",
    "No account found with that phone number, or wrong password.": "በዚህ ስልክ ቁጥር መለያ አልተገኘም፣ ወይም የይለፍ ቃሉ ትክክል አይደለም።",
    "Blocked for this site. Allow notifications in your browser's site settings, then reload.": "ለዚህ ጣቢያ ታግዷል። በአሳሽዎ የጣቢያ ቅንብሮች ውስጥ ማሳወቂያዎችን ይፍቀዱ፣ ከዚያ ገጹን ያድሱ።",
    "Off. These alerts work while the site is open in a tab; they can't reach a closed browser.": "ጠፍቷል። እነዚህ ማንቂያዎች ጣቢያው በትር ላይ ክፍት ሆኖ ሲቆይ ይሰራሉ፤ የተዘጋ አሳሽ ላይ መድረስ አይችሉም።",
    "On. You'll get an alert for new activity while Wana Dating is open in a background tab.": "በርቷል። Wana Dating በጀርባ ትር ላይ ክፍት ሆኖ ሳለ ለአዲስ እንቅስቃሴ ማንቂያ ያገኛሉ።",
    "Recording... tap Stop to send.": "በመቅዳት ላይ... ለመላክ «አቁም» የሚለውን ይንኩ።", "Sending voice message...": "የድምፅ መልዕክት በመላክ ላይ...",
    "Reporting isn't available yet. Please contact Support.": "ሪፖርት ማድረግ እስካሁን አይገኝም። እባክዎ ድጋፍ ያነጋግሩ።",
    "Reports go to our moderators, who can remove profiles and posts. The other person is never told who reported them.": "ሪፖርቶች መገለጫዎችንና ልጥፎችን ማስወገድ ወደሚችሉ አስተዳዳሪዎቻችን ይሄዳሉ። ሌላኛው ሰው ማን ሪፖርት እንዳደረገ በጭራሽ አይነገረውም።",
    "There's an update on a date plan": "በቀጠሮ እቅድ ላይ አዲስ ዝመና አለ",
    "This message couldn't be sent. You may no longer be matched with this person, or they may have blocked you.": "ይህ መልዕክት ሊላክ አልቻለም። ከዚህ ሰው ጋር ከእንግዲህ ላይዛመዱ ይችላሉ፣ ወይም አግደውዎት ሊሆን ይችላል።",
    "This person isn't accepting calls right now": "ይህ ሰው አሁን ጥሪ እየተቀበለ አይደለም",
    "This person only accepts calls from verified profiles": "ይህ ሰው ጥሪ የሚቀበለው ከተረጋገጡ መገለጫዎች ብቻ ነው",
    "Use a JPG, PNG, WEBP or GIF image.": "JPG፣ PNG፣ WEBP ወይም GIF ምስል ይጠቀሙ።", "Use a JPG, PNG, WEBP, or GIF image.": "JPG፣ PNG፣ WEBP ወይም GIF ምስል ይጠቀሙ።",
    "Use a JPG, PNG, WEBP, GIF or PDF file.": "JPG፣ PNG፣ WEBP፣ GIF ወይም PDF ፋይል ይጠቀሙ።", "Use JPG, PNG, WEBP, or GIF images.": "JPG፣ PNG፣ WEBP ወይም GIF ምስሎችን ይጠቀሙ።",
    "You must be 18 or older to post here.": "እዚህ ለመለጠፍ ዕድሜዎ 18 ወይም ከዚያ በላይ መሆን አለበት።",
    "You must be 18 or older. Others only see your age.": "ዕድሜዎ 18 ወይም ከዚያ በላይ መሆን አለበት። ሌሎች ዕድሜዎን ብቻ ያያሉ።",
    "Choose a valid preferred age range from 18–99.": "ከ18–99 ትክክለኛ የምርጫ የዕድሜ ክልል ይምረጡ።", "No More Profiles": "ተጨማሪ መገለጫ የለም",
    "Please choose an image.": "እባክዎ ምስል ይምረጡ።", "Photo upload failed.": "ፎቶ መስቀል አልተሳካም።", "Unknown error": "ያልታወቀ ስህተት",
    "You must be 18–99 and confirm that you are 18 or older.": "ዕድሜዎ ከ18–99 መሆን እና 18 ወይም ከዚያ በላይ መሆንዎን ማረጋገጥ አለብዎት።",
    "You must be signed in.": "መግባት አለብዎት።", "Answer": "መልስ"
  };
  Object.keys(EXTRA2).forEach(function (k) { AM[k] = EXTRA2[k]; });
  PREFIX["Auth check failed: "] = "የማረጋገጫ ፍተሻ አልተሳካም፦ ";
  PREFIX["Couldn't send: "] = "መላክ አልተቻለም፦ ";
  PREFIX["Couldn't open the gift picker: "] = "የስጦታ መምረጫውን መክፈት አልተቻለም፦ ";
  PREFIX["Couldn't submit report: "] = "ሪፖርቱን ማስገባት አልተቻለም፦ ";
  PREFIX["Couldn't load visitors: "] = "ጎብኚዎችን መጫን አልተቻለም፦ ";
  PREFIX["Report failed: "] = "ሪፖርት አልተሳካም፦ ";
  PREFIX["Voice upload failed: "] = "የድምፅ መስቀል አልተሳካም፦ ";
  PREFIX["Gift catalog is unavailable: "] = "የስጦታ ዝርዝር አይገኝም፦ ";
  RULES.push([/^You received a Platinum gift: (.+)$/, function (m) { return "የፕላቲነም ስጦታ ተቀብለዋል፦ " + m[1]; }]);

  // returns the Amharic text for a trimmed English string, or null
  function tr(t) {
    if (!t) return null;
    if (has.call(AM, t)) return AM[t];
    for (var k in PREFIX) if (has.call(PREFIX, k) && t.indexOf(k) === 0) return PREFIX[k] + t.slice(k.length);
    for (var i = 0; i < RULES.length; i++) { var m = RULES[i][0].exec(t); if (m) return RULES[i][1](m); }
    return null;
  }

  var KEY = "wana_lang";
  var SKIP = "script,style,textarea,.brand,.gate-logo-title,.dating-script,[data-no-i18n]";
  var ATTRS = ["placeholder", "title"];
  var lang = "en";
  try { lang = localStorage.getItem(KEY) === "am" ? "am" : "en"; } catch (e) {}

  var textRec = new WeakMap(); // text node -> {en, am}
  var attrRec = new WeakMap(); // element   -> {attr: {en, am}}
  var origTitle = document.title;

  var style = document.createElement("style");
  style.textContent = "body.lang-am,body.lang-am h1,body.lang-am h2,body.lang-am h3,body.lang-am button,body.lang-am input,body.lang-am select,body.lang-am textarea{font-family:'Noto Sans Ethiopic','Inter',system-ui,sans-serif}";
  document.head.appendChild(style);

  function toAm(node) {
    var p = node.parentElement;
    if (!p || p.closest(SKIP)) return;
    var cur = node.nodeValue, t = cur.trim();
    var tt = tr(t);
    if (!tt) return;
    // <option> without a value attribute uses its text as value: pin the English value first
    if (p.tagName === "OPTION" && !p.hasAttribute("value")) p.setAttribute("value", t);
    var out = cur.replace(t, tt);
    textRec.set(node, { en: cur, am: out });
    node.nodeValue = out;
  }

  function toAmAttrs(el) {
    if (el.closest && el.closest("[data-no-i18n]")) return;
    ATTRS.forEach(function (a) {
      var v = el.getAttribute && el.getAttribute(a);
      if (!v) return;
      var t = v.trim();
      var at = tr(t);
      if (!at) return;
      var rec = attrRec.get(el) || {};
      rec[a] = { en: v, am: at };
      attrRec.set(el, rec);
      el.setAttribute(a, at);
    });
  }

  function walkAm(root) {
    if (root.nodeType === 3) return toAm(root);
    if (root.nodeType !== 1) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), n, list = [];
    while ((n = w.nextNode())) list.push(n);
    list.forEach(toAm);
    toAmAttrs(root);
    root.querySelectorAll("[placeholder],[title]").forEach(toAmAttrs);
  }

  function restoreAll() {
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), n, list = [];
    while ((n = w.nextNode())) list.push(n);
    list.forEach(function (node) {
      var r = textRec.get(node);
      if (r && node.nodeValue === r.am) node.nodeValue = r.en;
      textRec.delete(node);
    });
    document.querySelectorAll("[placeholder],[title]").forEach(function (el) {
      var rec = attrRec.get(el);
      if (!rec) return;
      Object.keys(rec).forEach(function (a) {
        if (el.getAttribute(a) === rec[a].am) el.setAttribute(a, rec[a].en);
      });
      attrRec.delete(el);
    });
  }

  var mo = new MutationObserver(function (muts) {
    if (lang !== "am") return;
    mo.disconnect();
    muts.forEach(function (m) {
      if (m.type === "characterData") toAm(m.target);
      else m.addedNodes.forEach(walkAm);
    });
    observe();
  });
  function observe() { mo.observe(document.body, { childList: true, characterData: true, subtree: true }); }

  function setLang(l) {
    lang = l === "am" ? "am" : "en";
    try { localStorage.setItem(KEY, lang); } catch (e) {}
    document.documentElement.lang = lang;
    document.body.classList.toggle("lang-am", lang === "am");
    mo.disconnect();
    if (lang === "am") {
      walkAm(document.body);
      document.title = AM[origTitle.trim()] || origTitle;
    } else {
      restoreAll();
      document.title = origTitle;
    }
    var btn = document.getElementById("langBtn");
    if (btn) btn.textContent = lang === "am" ? "EN" : "አማ";
    try { currentLang = lang; } catch (e) {}
    observe();
  }

  // alert / confirm / prompt are not in the DOM, so translate them at call time
  ["alert", "confirm", "prompt"].forEach(function (fn) {
    var orig = window[fn];
    window[fn] = function (msg) {
      var args = Array.prototype.slice.call(arguments);
      if (lang === "am" && typeof msg === "string") {
        var t = msg.trim(), out = tr(t);
        if (out) args[0] = msg.replace(t, out);
      }
      return orig.apply(window, args);
    };
  });

  // Overrides any older toggleLang() defined in app.js
  window.toggleLang = function () { setLang(lang === "am" ? "en" : "am"); };
  window.WANA_I18N = {
    setLang: setLang,
    add: function (obj) { Object.keys(obj).forEach(function (k) { AM[k] = obj[k]; }); if (lang === "am") setLang("am"); },
    get lang() { return lang; }
  };

  setLang(lang);
})();
