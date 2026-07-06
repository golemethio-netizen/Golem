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
    myPhone:    "251707022845",
    myTelegram: "@allInOneEthiopia1",
};

// ── Telegram helper ──────────────────────────────────────────────────────────
// Routes through the Supabase Edge Function — bot token never exposed in browser.
// Usage: sendTelegram('🛒 New order from <b>Alem</b>')
// ── Updated Telegram helper in config.js ─────────────────────────────────────
async function sendTelegram(message, parse_mode = 'Markdown') {
    try {
        // 1. Get the current active session/token
        const { data: { session } } = await _supabase.auth.getSession();
        
        // 2. Prepare headers (include Auth token if available)
        const headers = { 'Content-Type': 'application/json' };
        if (session && session.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const res = await fetch(`${supabaseUrl}/functions/v1/send-telegram`, {
            method:  'POST',
            headers: headers, // 3. Inject the Authorization header here
            body:    JSON.stringify({ message, parse_mode })
        });
        
        const data = await res.json();
        if (!data.success) console.warn('Telegram send failed:', data.error || data);
        return data;
    } catch (err) {
        console.warn('sendTelegram error:', err.message);
        return { success: false, error: err.message };
    }
}

