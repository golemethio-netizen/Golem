let isLoginMode = true;

function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    document.getElementById('authTitle').innerText = isLoginMode ? "Login" : "Register";
    document.getElementById('authBtn').innerText = isLoginMode ? "Login" : "Register";
    document.getElementById('toggleMsg').innerText = isLoginMode 
        ? "Need an account? Register here." 
        : "Already have an account? Login here.";
}

async function handleAuth() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('authError');

    if (isLoginMode) {
        // LOGIN
        const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
        if (error) errorMsg.innerText = error.message;
        else window.location.href = 'index.html'; // Redirect to shop
    } else {
        // REGISTER
        const { data, error } = await _supabase.auth.signUp({ email, password });
        if (error) errorMsg.innerText = error.message;
        else alert("Registration successful! You can now login.");
    }
}
