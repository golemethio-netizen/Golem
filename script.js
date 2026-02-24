/**
 * GOLEM MARKETPLACE - CORE SCRIPT
 */

// --- STATE ---
let allApprovedProducts = [];
let cart = [];
let isSignUp = false;

document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    updateUIForUser();
});

// --- PRODUCT LOGIC ---
async function fetchProducts() {
    try {
        
        const { data, error } = await _supabase
    .from('products')
    .select('*')
    .eq('status', 'approved') // 👈 This ensures 'sold' items disappear from the shop automatically!
    .order('created_at', { ascending: false });

        if (error) throw error;
        allApprovedProducts = data;
        displayProducts(data);
    } catch (err) {
        console.error("Fetch error:", err.message);
    }
}

function displayProducts(products) {
    const grid = document.getElementById('productGrid');
    if (!grid) return;
    if (products.length === 0) {
        grid.innerHTML = "<p style='padding:20px;'>No items found.</p>";
        return;
    }
    grid.innerHTML = products.map(p => `
        <div class="product-card">
            <img src="${p.image}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/150'">
            <div class="product-info">
                <h3>${p.name}</h3>
                <p class="price">${p.price} ETB</p>
                <button onclick="addToCart('${p.id}')">Add to Cart</button>
            </div>
        </div>
    `).join('');
}

async function updateUIForUser() {
    const userMenu = document.getElementById('userMenu');
    const { data: { user } } = await _supabase.auth.getUser();

    if (user) {
        // 1. Check for Admin status
        const { data: profile } = await _supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
        
        // 2. Check for Orders (to show notification badge)
        const { count, error } = await _supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('seller_id', user.id);

        const isAdmin = profile?.is_admin || false;
        const orderCount = count || 0;
        
        // The badge HTML - only shows if count > 0
        const badge = orderCount > 0 ? `<span class="notify-badge">${orderCount}</span>` : "";

        userMenu.innerHTML = `
            <div class="user-profile">
                ${isAdmin ? '<button onclick="location.href=\'admin.html\'" class="admin-btn-nav">🛠️ Admin</button>' : ''}
                <a href="my-items.html" class="nav-link" style="position:relative;">
                    📦 My Items ${badge}
                </a>
                <button onclick="handleSignOut()" class="signout-btn">Sign Out</button>
            </div>
        `;
    }
}

function openAuthModal() { document.getElementById('authModal').style.display = 'flex'; }
function closeAuth() { document.getElementById('authModal').style.display = 'none'; }

async function handleSignOut() {
    await _supabase.auth.signOut();
    location.reload();
}

// --- CART LOGIC ---
function addToCart(productId) {
    if (!cart.includes(productId)) {
        cart.push(productId);
        document.getElementById('cartCount').innerText = cart.length;
        alert("Added to cart!");
    }
}

// Search & Filter
function searchProducts() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    const filtered = allApprovedProducts.filter(p => p.name.toLowerCase().includes(term));
    displayProducts(filtered);
}

function filterByCategory(category) {
    const buttons = document.querySelectorAll('.category-filters button');
    buttons.forEach(btn => btn.classList.remove('active'));
    if (event) event.target.classList.add('active');
    
    const filtered = category === 'All' ? allApprovedProducts : allApprovedProducts.filter(p => p.category === category);
    displayProducts(filtered);
}

// --- CART UI TOGGLE ---
function toggleCart() {
    const modal = document.getElementById('cartModal');
    if (!modal) {
        console.error("Cart Modal not found in HTML!");
        return;
    }
    const isVisible = modal.style.display === 'flex';
    modal.style.display = isVisible ? 'none' : 'flex';
    
    if (!isVisible) renderCartItems(); // Refresh items when opening
}

function renderCartItems() {
    const list = document.getElementById('cartItemsList');
    const totalEl = document.getElementById('cartTotal');
    if (!list) return;

    if (cart.length === 0) {
        list.innerHTML = "<p style='padding:10px;'>Your cart is empty.</p>";
        if (totalEl) totalEl.innerText = "0.00";
        return;
    }

    // Filter approved products to find what's in the cart
    const items = allApprovedProducts.filter(p => cart.includes(p.id));
    let total = 0;

    list.innerHTML = items.map(p => {
        total += parseFloat(p.price);
        return `
            <div class="cart-item" style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid #eee;">
                <span>${p.name}</span>
                <b>${p.price} ETB</b>
                <button onclick="removeFromCart('${p.id}')" style="background:none; border:none; color:red; cursor:pointer;">❌</button>
            </div>
        `;
    }).join('');
    
    if (totalEl) totalEl.innerText = total.toFixed(2);
}

function removeFromCart(id) {
    cart = cart.filter(cid => cid !== id);
    document.getElementById('cartCount').innerText = cart.length;
    renderCartItems();
}
async function handleAuth() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value.trim();

    if (!email || !password) return alert("Please fill all fields!");

    // Check if we are in Sign Up mode or Login mode
    // (You need a global variable 'isSignUp' defined at the top of script.js)
    try {
        if (isSignUp) {
            const fullName = document.getElementById('regName').value.trim();
            const phone = document.getElementById('regPhone').value.trim();
            
            const { error } = await _supabase.auth.signUp({
                email, 
                password, 
                options: { 
                    data: { full_name: fullName, phone: phone } 
                }
            });
            if (error) throw error;
            alert("Registration successful! Please check your email for a verification link.");
        } else {
            const { error } = await _supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            location.reload(); // Refresh to update the UI
        }
    } catch (e) { 
        alert("Auth Error: " + e.message); 
    }
}

async function checkout() {
    const name = document.getElementById('buyerName').value;
    const phone = document.getElementById('buyerPhone').value;
    
    if (!name || !phone) return alert("Please enter your name and phone number!");

    // For this example, we'll take the first item in the cart
    const productId = cart[0]; 
    const product = allApprovedProducts.find(p => p.id === productId);

    try {
        // 1. Save order to Supabase so the seller sees it in "My Items"
        const { error } = await _supabase.from('orders').insert([{
            product_id: product.id,
            seller_id: product.user_id,
            buyer_name: name,
            buyer_phone: phone,
            product_name: product.name,
            price: product.price
        }]);

        if (error) throw error;

        // 2. Open WhatsApp for the direct chat
        const message = `Hello, I'm ${name}. I want to buy your ${product.name} for ${product.price} ETB.`;
        const whatsappUrl = `https://wa.me/${product.seller_contact.replace(/\D/g,'')}?text=${encodeURIComponent(message)}`;
        
        window.open(whatsappUrl, '_blank');
        
        // 3. Clear cart and close
        cart = [];
        document.getElementById('cartCount').innerText = "0";
        toggleCart();
        alert("Order placed! Redirecting to WhatsApp...");

    } catch (err) {
        alert("Checkout error: " + err.message);
    }
}


/**
 * Redirects to submit page if logged in, otherwise opens login modal
 */
async function checkAuthToSell() {
    const { data: { user } } = await _supabase.auth.getUser();
    
    if (user) {
        // User is logged in, let them sell
        window.location.href = 'submit.html';
    } else {
        // Not logged in, show the login modal
        alert("Please sign in to post an item for sale.");
        openAuthModal();
    }
}
// --- PASSWORD RESET LOGIC ---

async function handleForgotPassword() {
    const email = document.getElementById('authEmail').value.trim();
    
    if (!email) {
        alert("Please enter your email address first!");
        return;
    }

    const { error } = await _supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password.html',
    });

    if (error) {
        alert("Error: " + error.message);
    } else {
        alert("Password reset link sent! Check your inbox.");
    }
}

// Update your existing toggleAuthMode function to show/hide the link
function toggleAuthMode() {
    isSignUp = !isSignUp;
    document.getElementById('authTitle').innerText = isSignUp ? "Create Account" : "Login";
    document.getElementById('authBtn').innerText = isSignUp ? "Register" : "Sign In";
    document.getElementById('toggleText').innerText = isSignUp ? "Already have an account? Login" : "Don't have an account? Sign Up";
    
    // Hide forgot password link if signing up
    document.getElementById('forgotPasswordLink').style.display = isSignUp ? "none" : "block";
}

