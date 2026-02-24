/**
 * GOLEM MARKETPLACE - CORE SCRIPT
 * Features: Auth, Admin Check, Categories, Search, Cart, & Order Tracking
 */

// --- 1. CONFIGURATION & STATE ---
const YOUR_ADMIN_EMAIL = "your-email@example.com"; // 👈 CHANGE THIS
let allApprovedProducts = [];
let cart = [];
let isSignUp = false;

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    updateUIForUser();
});

// --- 2. PRODUCT FETCHING & DISPLAY ---
async function fetchProducts() {
    try {
        // Only fetch items that you (the admin) have approved
        const { data, error } = await _supabase
            .from('products')
            .select('*')
            .eq('status', 'approved')
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        allApprovedProducts = data;
        displayProducts(data);
    } catch (err) {
        console.error("Fetch error:", err.message);
        const grid = document.getElementById('productGrid');
        if (grid) grid.innerHTML = "<p>Error loading products. Please refresh.</p>";
    }
}

function displayProducts(products) {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    if (products.length === 0) {
        grid.innerHTML = "<p style='padding:20px;'>No items found in this category.</p>";
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

// --- 3. SEARCH & CATEGORIES ---
function searchProducts() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    const filtered = allApprovedProducts.filter(p => 
        p.name.toLowerCase().includes(term)
    );
    displayProducts(filtered);
}

function filterByCategory(category) {
    const buttons = document.querySelectorAll('.category-filters button');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    // Set clicked button to active
    if (event) event.target.classList.add('active');

    if (category === 'All') {
        displayProducts(allApprovedProducts);
    } else {
        const filtered = allApprovedProducts.filter(p => p.category === category);
        displayProducts(filtered);
    }
}

// --- 4. AUTHENTICATION LOGIC ---
function openAuthModal() { document.getElementById('authModal').style.display = 'flex'; }
function closeAuth() { document.getElementById('authModal').style.display = 'none'; }

function toggleAuthMode() {
    isSignUp = !isSignUp;
    document.getElementById('authTitle').innerText = isSignUp ? "Create Account" : "Login";
    document.getElementById('registerFields').style.display = isSignUp ? "block" : "none";
    document.getElementById('authBtn').innerText = isSignUp ? "Register" : "Sign In";
    document.getElementById('toggleText').innerText = isSignUp ? 
        "Already have an account? Sign In" : "Don't have an account? Register";
}

async function handleAuth() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value.trim();

    if (!email || !password) return alert("Please fill all fields!");

    try {
        if (isSignUp) {
            const fullName = document.getElementById('regName').value.trim();
            const phone = document.getElementById('regPhone').value.trim();
            
            const { error } = await _supabase.auth.signUp({
                email, password, options: { data: { full_name: fullName, phone: phone } }
            });
            if (error) throw error;
            alert("Registration successful! Verify your email.");
        } else {
            const { error } = await _supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            location.reload();
        }
    } catch (e) { alert(e.message); }
}

async function updateUIForUser() {
    const userMenu = document.getElementById('userMenu');
    const mobileMyItems = document.getElementById('mobileMyItems');

    const { data: { user } } = await _supabase.auth.getUser();

    if (user) {
        // 1. Check for Order Notifications
        const { count } = await _supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('seller_id', user.id);

        const badge = count > 0 ? `<span class="nav-badge">${count}</span>` : '';
        const name = user.user_metadata?.full_name || "Account";

        // 2. Check if this user is the Admin
        const adminLink = (user.email === YOUR_ADMIN_EMAIL) 
            ? `<a href="admin.html" style="color:red; font-weight:bold; margin-right:15px;">🛠️ ADMIN</a>` 
            : "";

        if (userMenu) {
            userMenu.innerHTML = `
                <div class="user-profile">
                    ${adminLink}
                    <a href="my-items.html" class="nav-link">📦 My Items ${badge}</a>
                    <button onclick="handleSignOut()" class="signout-btn">Sign Out</button>
                </div>
            `;
        }
        
        // Update Mobile Nav
        if (mobileMyItems && count > 0) {
            mobileMyItems.innerHTML += `<span class="nav-badge mobile">${count}</span>`;
        }
    }
}

async function handleSignOut() {
    await _supabase.auth.signOut();
    location.href = 'index.html';
}

// --- 5. CART & CHECKOUT ---
function addToCart(productId) {
    if (!cart.includes(productId)) {
        cart.push(productId);
        const countEl = document.getElementById('cartCount');
        if (countEl) countEl.innerText = cart.length;
        alert("Added to cart!");
    } else {
        alert("Already in your cart!");
    }
}

function toggleCart() {
    const modal = document.getElementById('cartModal');
    if (!modal) return;
    const isVisible = modal.style.display === 'flex';
    modal.style.display = isVisible ? 'none' : 'flex';
    if (!isVisible) renderCartItems();
}

function renderCartItems() {
    const list = document.getElementById('cartItemsList');
    const totalEl = document.getElementById('cartTotal');
    if (!list) return;

    if (cart.length === 0) {
        list.innerHTML = "<p>Your cart is empty.</p>";
        totalEl.innerText = "0.00";
        return;
    }

    const items = allApprovedProducts.filter(p => cart.includes(p.id));
    let total = 0;

    list.innerHTML = items.map(p => {
        total += parseFloat(p.price);
        return `
            <div class="cart-item">
                <span>${p.name}</span>
                <b>${p.price} ETB</b>
                <button onclick="removeFromCart('${p.id}')">❌</button>
            </div>
        `;
    }).join('');
    totalEl.innerText = total.toFixed(2);
}

function removeFromCart(id) {
    cart = cart.filter(cid => cid !== id);
    document.getElementById('cartCount').innerText = cart.length;
    renderCartItems();
}

async function checkout() {
    const name = document.getElementById('buyerName').value;
    const phone = document.getElementById('buyerPhone').value;
    if (!name || !phone) return alert("Please fill in your details!");

    // Get the first item in cart for WhatsApp redirect
    const product = allApprovedProducts.find(p => p.id == cart[0]);

    try {
        // Record the intent in the 'orders' table
        await _supabase.from('orders').insert([{
            product_id: product.id,
            seller_id: product.user_id,
            buyer_name: name,
            buyer_phone: phone,
            product_name: product.name,
            price: product.price
        }]);

        // WhatsApp Redirect
        const msg = encodeURIComponent(`Hello! I am ${name}. I am interested in buying your ${product.name}.`);
        window.open(`https://wa.me/${product.seller_contact.replace(/\D/g,'')}?text=${msg}`);
    } catch (e) { alert("Checkout error!"); }
}

async function checkAuthToSell() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (user) {
        location.href = 'submit.html';
    } else {
        alert("Login required to sell items.");
        openAuthModal();
    }
}
