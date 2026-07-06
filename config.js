

// Ensure you have ' ' around the URL and Key!
const supabaseUrl = 'https://ryeylhawdmykbbmnfrrh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5ZXlsaGF3ZG15a2JibW5mcnJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MzU4NjcsImV4cCI6MjA4NjIxMTg2N30.6FpidGEaunpf8AwBIpjKwcC3a53iWmvaRxctj2ZYrSY';

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
