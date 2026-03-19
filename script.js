// --- 1. INITIALIZATION & HEARTBEAT ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 Golem System Initializing...");
    
    // Check Database Connection
    try {
        const { count, error } = await _supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'approved');
        if (error) throw error;
        console.log("✅ Supabase Connected: Found", count, "approved items.");
    } catch (err) {
        console.error("❌ Connection Error:", err.message);
    }

    // Load Core UI
    fetchProducts();
    updateUIForUser();
    loadDynamicFilters();
    updateCartBadge();

    // Search Input Listener
    const searchInput = document.getElementById('headerSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => filterSearch(e.target.value.toLowerCase()));
    }
});

// --- 2. PRODUCT DATA & RENDERING ---
async function fetchProducts(category = 'All') {
    const sortOrder = document.getElementById('sortSelect')?.value || 'newest';
    let query = _supabase.from('products').select('*').eq('status', 'approved');

    if (category !== 'All') query = query.eq('category', category);

    // Apply Sorting
    if (sortOrder === 'newest') query = query.order('created_at', { ascending: false });
    else if (sortOrder === 'price_low') query = query.order('price', { ascending: true });
    else if (sortOrder === 'price_high') query = query.order('price', { ascending: false });

    const { data, error } = await query;
    if (!error) (data);
    else console.error("Fetch error:", error.message);
}

function renderProducts(products) {
    // Looks for both common IDs to prevent "Loading..." hang
    const grid = document.getElementById('productGrid') || document.getElementById('productsContainer');
    if (!grid) return;

    if (products.length === 0) {
        grid.innerHTML = `
            <div style="text-align:center; grid-column: 1/-1; padding: 60px 20px;">
                <p style="color: #777;">No products found in this category.</p>
            </div>`;
    } else {
        grid.innerHTML = products.map(p => {
            const safeData = encodeURIComponent(JSON.stringify(p));
            const isSold = p.status === 'sold';
            
            // Inside renderProducts -> products.map(p => { ... })
return `
    <div class="product-card ${isSold ? 'is-sold' : ''}">
        <div class="img-wrapper">
            ${isSold ? '<div class="sold-watermark">SOLD</div>' : ''}
            <img src="${p.image}" alt="${p.name}" loading="lazy">
        </div>
        <div class="product-info">
            <div class="badge-row" style="display:flex; gap:5px; margin-bottom:8px;">
                <span class="category-tag">${p.category || 'General'}</span>
                <span class="condition-tag" style="background:#e9ecef; color:#495057; padding:2px 8px; border-radius:4px; font-size:0.75rem;">
                    ${p.status_condition || 'New'}
                </span>
            </div>
            <h3>${p.name}</h3>
            <p class="seller-preview" style="font-size: 0.8rem; color: #666; margin-bottom: 5px;">
                <i class="fas fa-user"></i> ${p.seller_name || 'Verified Seller'}
            </p>
            <p class="price">${p.price?.toLocaleString()} <small>ETB</small></p>
            <div class="action-buttons">
                ${isSold ? 
                    `<button class="main-btn" disabled style="background:#ccc;">Sold</button>` : 
                    `<button class="main-btn" onclick="window.openProductDetailsSafe('${safeData}')">🛒 View Details</button>`
                }
            </div>
        </div>
    </div>`;
        }).join('');
    }

    // Hide Loading Message
    const loader = document.querySelector('.loading-spinner') || document.getElementById('loadingMessage');
    if (loader) loader.style.display = 'none';
}

// --- 3. GLOBAL EXPOSED FUNCTIONS (For HTML onclick) ---

window.openProductDetailsSafe = function(encodedData) {
    try {
        const product = JSON.parse(decodeURIComponent(encodedData));
        window.openProductDetails(product);
    } catch (e) {
        console.error("Error parsing product data", e);
    }
};

window.openProductDetails = function(product) {
   const modal = document.getElementById('productModal');
    if (!modal) return;

    document.getElementById('modalProductTitle').innerText = product.name;
    document.getElementById('modalProductPrice').innerText = `${product.price?.toLocaleString()} ETB`;
    document.getElementById('modalProductDesc').innerText = product.description || "No description provided.";
    document.getElementById('modalProductImg').src = product.image;

    const phone = product.phone_number;
    const tgUser = (product.telegram_username || product.seller_telegram || "").replace('@', '');

    const sellerEl = document.getElementById('modalSellerName');
    const conditionEl = document.getElementById('modalCondition')
    const callBtn = document.getElementById('callContact');
    const waBtn = document.getElementById('whatsappContact');
    const tgBtn = document.getElementById('telegramContact');
    
if (sellerEl) sellerEl.innerText = product.seller_name || "Anonymous Seller";
    if (conditionEl) conditionEl.innerText = product.status_condition || "Not Specified";
    if (callBtn) {
        callBtn.href = `tel:${phone}`;
        callBtn.style.display = phone ? "flex" : "none";
    }

    if (waBtn && phone) {
        const cleanPhone = phone.replace(/\D/g, '');
        const waMsg = encodeURIComponent(`Hello! I'm interested in "${product.name}" on Golem.`);
        waBtn.href = `https://wa.me/${cleanPhone}?text=${waMsg}`;
        waBtn.style.display = "flex";
    }

    if (tgBtn) {
        tgBtn.href = `https://t.me/${tgUser}`;
        tgBtn.style.display = tgUser ? "flex" : "none";
    }

    const cartBtn = document.querySelector('.add-to-cart-btn');
    if (cartBtn) cartBtn.onclick = () => addToCart(product);

    modal.style.display = 'flex';
};

window.filterCategory = function(cat, btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    fetchProducts(cat);
};

window.closeProductModal = function() {
    const pModal = document.getElementById('productModal');
    if (pModal) pModal.style.display = 'none';
};

// --- 4. AUTHENTICATION & USER UI ---

async function updateUIForUser() {
    const { data: { user } } = await _supabase.auth.getUser();
    const signinBtn = document.querySelector('.signin-btn');
    if (!signinBtn) return;

    if (user) {
        signinBtn.innerText = "Sign Out";
        signinBtn.onclick = async () => {
            await _supabase.auth.signOut();
            window.location.reload();
        };
    } else {
        signinBtn.innerText = "Sign In";
        signinBtn.onclick = () => window.toggleModal();
    }
}

window.handleAuth = async (event) => {
    event.preventDefault();
    const email = event.target.querySelector('input[type="email"]').value;
    const password = event.target.querySelector('input[type="password"]').value;
    const { error } = await _supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else window.location.reload();
};

window.handleSignUp = async (event) => {
    event.preventDefault();
    const email = event.target.querySelector('input[type="email"]').value;
    const password = event.target.querySelector('input[type="password"]').value;
    const { error } = await _supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    else {
        alert("Check your email for the confirmation link!");
        window.toggleModal();
    }
};

window.toggleModal = function() {
    const modal = document.getElementById('authModal');
    if (modal) modal.style.display = (modal.style.display === "flex") ? "none" : "flex";
};

window.toggleAuthMode = function() {
    const title = document.getElementById('modalTitle');
    const isSignIn = title.innerText === "Welcome Back";
    title.innerText = isSignIn ? "Create Account" : "Welcome Back";
    document.getElementById('authForm').onsubmit = isSignIn ? handleSignUp : handleAuth;
};

// --- 5. UTILITIES ---

async function loadDynamicFilters() {
    const container = document.querySelector('.filter-bar');
    if (!container) return;
    const { data: cats } = await _supabase.from('categories').select('name').order('name');
    let buttonsHtml = `<button class="filter-btn active" onclick="window.filterCategory('All', this)">All</button>`;
    if (cats) {
        cats.forEach(c => {
            buttonsHtml += `<button class="filter-btn" onclick="window.filterCategory('${c.name}', this)">${c.name}</button>`;
        });
    }
    container.innerHTML = buttonsHtml;
}

function filterSearch(term) {
    const cards = document.querySelectorAll('.product-card');
    cards.forEach(card => {
        const title = card.querySelector('h3').innerText.toLowerCase();
        card.style.display = title.includes(term) ? 'block' : 'none';
    });
}

window.updateCartBadge = function() {
    const cart = JSON.parse(localStorage.getItem('golem_cart') || '[]');
    const badge = document.getElementById('cartBadge');
    if (badge) {
        badge.innerText = cart.length;
        badge.style.display = cart.length > 0 ? 'flex' : 'none';
    }
};

window.addToCart = function(product) {
    let cart = JSON.parse(localStorage.getItem('golem_cart') || '[]');
    if (!cart.find(item => item.id === product.id)) {
        cart.push(product);
        localStorage.setItem('golem_cart', JSON.stringify(cart));
        window.updateCartBadge();
        alert("Saved to your list!");
    } else {
        alert("Already in your list.");
    }
};

window.onclick = (e) => {
    if (e.target.classList.contains('modal-overlay') || e.target.id === 'productModal' || e.target.id === 'authModal') {
        e.target.style.display = 'none';
    }
};

window.checkAuthToSell = async function() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (user) window.location.href = 'sell.html';
    else {
        alert("Please Sign In first to post an item.");
        window.toggleModal();
    }
};
