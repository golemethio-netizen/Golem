async function handleLogin(email, password) {
    const { error } = await _supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else window.location.href = 'index.html';
}

async function handleReset(email) {
    const { error } = await _supabase.auth.resetPasswordForEmail(email);
    alert(error ? error.message : "Check your email!");
}
