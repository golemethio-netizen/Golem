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

  var KEY = "wana_lang";
  var SKIP = "script,style,textarea,.brand,.gate-logo-title,.dating-script,[data-no-i18n]";
  var ATTRS = ["placeholder", "title"];
  var has = Object.prototype.hasOwnProperty;
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
    if (!t || !has.call(AM, t)) return;
    // <option> without a value attribute uses its text as value: pin the English value first
    if (p.tagName === "OPTION" && !p.hasAttribute("value")) p.setAttribute("value", t);
    var out = cur.replace(t, AM[t]);
    textRec.set(node, { en: cur, am: out });
    node.nodeValue = out;
  }

  function toAmAttrs(el) {
    if (el.closest && el.closest("[data-no-i18n]")) return;
    ATTRS.forEach(function (a) {
      var v = el.getAttribute && el.getAttribute(a);
      if (!v) return;
      var t = v.trim();
      if (!has.call(AM, t)) return;
      var rec = attrRec.get(el) || {};
      rec[a] = { en: v, am: AM[t] };
      attrRec.set(el, rec);
      el.setAttribute(a, AM[t]);
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
    if (btn) btn.textContent = lang === "am" ? "አማ" : "EN";
    observe();
  }

  // Overrides any older toggleLang() defined in app.js
  window.toggleLang = function () { setLang(lang === "am" ? "en" : "am"); };
  window.WANA_I18N = {
    setLang: setLang,
    add: function (obj) { Object.keys(obj).forEach(function (k) { AM[k] = obj[k]; }); if (lang === "am") setLang("am"); },
    get lang() { return lang; }
  };

  setLang(lang);
})();
/* Reserved for a future dependency-safe extraction. Existing functionality remains in app.js. */
