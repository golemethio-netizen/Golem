async function handleSignup() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    const { data, error } = await _supabase.auth.signUp({
        email: email,
        password: password,
    });

    if (error) {
        document.getElementById('authMsg').innerText = error.message;
    } else {
        document.getElementById('authMsg').innerText = "Success! Check your email or try logging in.";
    }
}

async function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const { data, error } = await _supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        document.getElementById('authMsg').innerText = error.message;
    } else {
        // Redirect to shop on success
        window.location.href = 'index.html';
   
}
    // Inside handleLogin after success:
if (data.user.email === 'YOUR_ADMIN_EMAIL@gmail.com') {
    alert("Welcome Boss!");
    window.location.href = 'admin.html'; // Create this page for approvals
} else {
    window.location.href = 'index.html';
}
}

async function logout() {
    await _supabase.auth.signOut();
    window.location.href = 'login.html';
}
