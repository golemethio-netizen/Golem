let isLoginMode = true;

// Wait for DOM to load to attach listeners
document.addEventListener('DOMContentLoaded', () => {
    const authBtn = document.getElementById('authBtn');
    const toggleLink = document.getElementById('toggleMsg');

    if (authBtn) authBtn.addEventListener('click', handleAuth);
    if (toggleLink) toggleLink.addEventListener('click', toggleAuthMode);
    
    console.log("Auth System Ready");
});

function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    const title = document.getElementById('authTitle');
    const btn = document.getElementById('authBtn');
    const msg = document.getElementById('toggleMsg');

    if (isLoginMode) {
        title.innerText = "Login";
        btn.innerText = "Login";
        msg.innerText = "Need an account? Register here.";
    } else {
        title.innerText = "Register";
        btn.innerText = "Register";
        msg.innerText = "Already have an account? Login here.";
    }
}

async function handleAuth() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDisplay = document.getElementById('authError');
    
    errorDisplay.innerText = ""; // Clear old errors

    try {
        if (isLoginMode) {
            // LOGIN LOGIC
            const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            window.location.href = 'index.html'; 
        } else {
            // REGISTER LOGIC
            const { data, error } = await _supabase.auth.signUp({ email, password });
            if (error) throw error;
            alert("Registration successful! You can now log in.");
            toggleAuthMode();
        }
    } catch (err) {
        errorDisplay.innerText = err.message;
        console.error("Auth Error:", err);
    }
}
