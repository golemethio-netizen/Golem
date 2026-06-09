// Supabase configuration
const supabaseUrl = 'https://ryeylhawdmykbbmnfrrh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5ZXlsaGF3ZG15a2JibW5mcnJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MzU4NjcsImV4cCI6MjA4NjIxMTg2N30.6FpidGEaunpf8AwBIpjKwcC3a53iWmvaRxctj2ZYrSY';

// Create ONE single instance — shared everywhere via window._supabase
if (!window._supabase) {
    window._supabase = supabase.createClient(supabaseUrl, supabaseKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storage: window.localStorage
        }
    });
}

// All files use _supabase — this ensures they all get the same instance
const _supabase = window._supabase;

// Keep window.supabase pointing to the same instance (backward compat)
window.supabase = window._supabase;

const GolemConfig = {
    myPhone: "251707022845",
    myTelegram: "@allInOneEthiopia1",
    botToken: "8557174379:AAHjA_5WAIxIR8uq4mjZOhd1EfdKvgI2s7o",
    chatId: "6792892909"
};
