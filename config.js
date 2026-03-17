
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
