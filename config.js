
// Ensure you have ' ' around the URL and Key!
const supabaseUrl = 'https://ryeylhawdmykbbmnfrrh.supabase.co';
const supabaseKey = 'sb_publishable__XhkM93G4uNhdKhDKa6osQ_PPpIPO6m'; // Put quotes here!

// Initialize with a fallback for storage
const _supabase = supabase.createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // This helper checks if localStorage is available; if not, it stays in memory
    storage: window.localStorage 
  }
});
const GolemConfig = {
    myPhone: "251707022845", // Replace with your actual number
    myTelegram: "@allInOneEthiopia1",
    botToken: "8557174379:AAHjA_5WAIxIR8uq4mjZOhd1EfdKvgI2s7o",
    chatId: "6792892909"
};
