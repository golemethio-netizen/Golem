let isSignUp = false;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    updateUIForUser();
});

async function fetchProducts() {
    const { data, error } = await _supabase
        .from('products')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

    if (!error) displayProducts(data);
}

// --- AUTH LOGIC ---
function toggleAuthMode() {
    isSignUp = !isSignUp;
    document.getElementById('authTitle').innerText = isSignUp ? "Create Account" : "Login";
    document.getElementById('registerFields').style.display = isSignUp ? "block" : "none";
    document.getElementById('authBtn').innerText = isSignUp ? "Register" : "Sign In";
}

async function handleAuth() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value.trim();
    if (!email || !password) return alert("Required fields missing!");

    try {
        if (isSignUp) {
            const name = document.getElementById('regName').value;
            const phone = document.getElementById('regPhone').value;
            const { error } = await _supabase.auth.signUp({
                email, password, options: { data: { full_name: name, phone: phone } }
            });
            if (error) throw error;
            alert("Check your email!");
        } else {
            const { error } = await _supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            location.reload();
        }
    } catch (e) { alert(e.message); }
}

async function updateUIForUser() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return;

    // Get order count for badge
    const { count } = await _supabase.from('orders').select('*', { count: 'exact', head: true }).eq('seller_id', user.id);
    const badge = count > 0 ? `<span class="nav-badge">${count}</span>` : '';

    document.getElementById('userMenu').innerHTML = `
        <div class="user-profile">
            <a href="my-items.html" style="text-decoration:none; color:inherit;">📦 My Items ${badge}</a>
            <button onclick="handleSignOut()" class="signout-btn">Exit</button>
        </div>
    `;

    if(count > 0) {
        document.getElementById('mobileMyItems').innerHTML += `<span class="nav-badge mobile">${count}</span>`;
    }
}

async function handleSignOut() {
    await _supabase.auth.signOut();
    location.href = 'index.html';
}

async function checkout() {
    const name = document.getElementById('buyerName').value;
    const phone = document.getElementById('buyerPhone').value;
    const product = allApprovedProducts.find(p => p.id == cart[0]);

    if (!product || !name) return alert("Missing info");

    // Save Order to History
    await _supabase.from('orders').insert([{
        product_id: product.id,
        seller_id: product.user_id,
        buyer_name: name,
        buyer_phone: phone,
        product_name: product.name,
        price: product.price
    }]);

    window.open(`https://wa.me/${product.seller_contact.replace(/\D/g,'')}?text=Order for ${product.name}`);
}
