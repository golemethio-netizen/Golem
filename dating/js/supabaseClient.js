import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabaseUrl = 'https://ryeylhawdmykbbmnfrrh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5ZXlsaGF3ZG15a2JibW5mcnJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MzU4NjcsImV4cCI6MjA4NjIxMTg2N30.6FpidGEaunpf8AwBIpjKwcC3a53iWmvaRxctj2ZYrSY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
