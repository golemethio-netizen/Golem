let isLoginMode = true;
// At the top of auth.js
document.addEventListener('DOMContentLoaded', () => {
    const toggleLink = document.getElementById('toggleMsg');
    const authBtn = document.getElementById('authBtn');

    if (toggleLink) {
        toggleLink.addEventListener('click', toggleAuthMode);
    }
    
    if (authBtn) {
        authBtn.addEventListener('click', handleAuth);
    }
    console.log("Listeners attached!");
});

function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    // ... the rest of your toggle code ...
}

alert("Auth.js is loaded!"); 
console.log("Auth script is active.");


function toggleAuthMode() {
    console.log("Toggle clicked!"); // Check if this shows in console
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
    
    if (isLoginMode) {
        const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
        if (error) {
            alert("Login Failed: " + error.message);
        } else {
            console.log("Login Success:", data);
            window.location.href = 'index.html'; // Direct redirect
        }
    } else {
        const { data, error } = await _supabase.auth.signUp({ email, password });
        if (error) {
            alert("Registration Failed: " + error.message);
        } else {
            alert("Registration successful! Now try to Login.");
            toggleAuthMode(); // Switch them back to login mode automatically
        }
    }
}
