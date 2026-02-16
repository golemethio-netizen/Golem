// Function to handle User Registration
async function handleSignup() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const msg = document.getElementById('authMsg');

    if (!email || !password) {
        msg.innerText = "Please fill in all fields.";
        return;
    }

    const { data, error } = await _supabase.auth.signUp({
        email: email,
        password: password,
    });

    if (error) {
        msg.style.color = "red";
        msg.innerText = error.message;
    } else {
        msg.style.color = "green";
        msg.innerText = "Success! Please check your email for a confirmation link.";
    }
}

// Function to handle Login
async function handleLogin() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const msg = document.getElementById('authMsg');

    const { data, error } = await _supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        msg.style.color = "red";
        msg.innerText = error.message;
    } else {
        const user = data.user;
        const adminEmail = 'golemethio@gmail.com'.toLowerCase(); // CHANGE THIS

        if (user.email.toLowerCase() === adminEmail) {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'index.html';
        }
    }
}

// General Logout Function
async function logout() {
    await _supabase.auth.signOut();
    window.location.href = 'login.html';
}
