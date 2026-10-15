// Ensure you have ' ' around the URL and Key!
const supabaseUrl = 'https://ryeylhawdmykbbmnfrrh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5ZXlsaGF3ZG15a2JibW5mcnJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MzU4NjcsImV4cCI6MjA4NjIxMTg2N30.6FpidGEaunpf8AwBIpjKwcC3a53iWmvaRxctj2ZYrSY';

// Browsers with strict tracking prevention can throw when localStorage is touched.
// Fall back to an in-memory store instead of crashing the whole site.
function _safeAuthStorage() {
  try {
    const k = '__wg_test__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return window.localStorage;
  } catch (e) {
    const mem = {};
    return {
      getItem: (key) => (key in mem ? mem[key] : null),
      setItem: (key, v) => { mem[key] = String(v); },
      removeItem: (key) => { delete mem[key]; }
    };
  }
}

const _supabase = supabase.createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: _safeAuthStorage()
  }
});
const GolemConfig = {
    myPhone: "251707022845", // Replace with your actual number
    myTelegram: "@allInOneEthiopia1"
    // botToken / chatId intentionally removed — these now live ONLY as
    // Supabase Edge Function secrets (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID),
    // never in client-side code.
};
