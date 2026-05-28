// Supabase configuration
const supabaseUrl = 'https://ryeylhawdmykbbmnfrrh.supabase.co';
const supabaseKey = 'sb_publishable__XhkM93G4uNhdKhDKa6osQ_PPpIPO6m';

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
