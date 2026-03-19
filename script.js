// --- 1. INITIALIZATION & HEARTBEAT ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 Golem System Initializing...");
    
    try {
        const { count, error } = await _supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'approved');
        if (error) throw error;
        console.log("✅ Supabase Connected: Found", count, "approved items.");
    } catch (err) {
        console.error("❌ Connection Error:", err.message);
    }

    fetchProducts();
    updateUIForUser();
    loadDynamicFilters();
    updateCartBadge();

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

    if (sortOrder === 'newest') query = query.order('created_at', { ascending: false });
    else if (sortOrder === 'price_low') query = query.order('price', { ascending: true });
    else if (sortOrder === 'price_high') query = query.order('price', { ascending: false });

    const { data, error } = await query;
    if (!error) renderProducts(data);
    else console.error("Fetch error:", error.message);
}

function renderProducts(products) {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    if (products.length === 0) {
        grid.innerHTML = `<div style="text-align:center; grid-column:1/-1; padding:60px; color:#888;">No items found.</div>`;
    } else {
        grid.innerHTML = products.map(p => {
            const safeData = encodeURIComponent(JSON.stringify(p));
            const isSold = p.status === 'sold';
            const condition = p.status_condition || 'New';
            const condClass = getConditionClass(condition);
            
            const verifiedNames = ['Crown Time', 'Crown Time Furniture', 'Golem Admin'];
            const isVerified = verifiedNames.includes(p.seller_name);
            const verifiedBadge = isVerified ? `<i class="fas fa-check-circle" style="color: #007bff; margin-left: 4px;"></i>` : '';

            const phone = p.phone_number ? p.phone_number.replace(/\D/g, '') : '';
            const tg = p.telegram_username || p.seller_telegram || '';

            // FIXED: Combined the template into ONE string properly
            return `
                <div class="product-card ${isSold ? 'is-sold' : ''}">
                    <div class="img-wrapper">
                        ${isSold ? '<div class="sold-watermark">SOLD</div>' : ''}
                        <img src="${p.image}" alt="${p.name}" loading="lazy">
                    </div>
                    <div class="product-info">
                        <div class="badge-row" style="display:flex; gap:8px; margin-bottom:10px; align-items:center;">
                            <span class="category-tag">${p.category || 'General'}</span>
                            <span class="condition-tag ${condClass}">${condition}</span>
                        </div>
                        <h3>${p.name}</h3>
                        <div class="seller-line">
                            <span><i class="fas fa-user-circle"></i> ${p.seller_name || 'Seller'} ${verifiedBadge}</span>
                            <span style="font-weight:bold; color:#28a745;">${p.price?.toLocaleString()} ETB</span>
                        </div>
                        <div class="quick-contact-bar">
                            ${phone ? `<a href="tel:${phone}" class="mini-contact"><i class="fas fa-phone"></i></a>` : ''}
                            ${phone ? `<a href="https://wa.me/${phone}" target="_blank" class="mini-contact"><i class="fab fa-whatsapp"></i></a>` : ''}
                            ${tg ? `<a href="https://t.me/${tg.replace('@','')}" target="_blank" class="mini-contact"><i class="fab fa-telegram"></i></a>` : ''}
                        </div>
                        <div class="action-buttons">
                            <button class="main-btn" onclick="window.openProductDetailsSafe('${safeData}')">🛒 View Details</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    const loader = document.querySelector('.loading-spinner');
    if (loader) loader.style.display = 'none';
}

// --- 3. MODAL & ORDERING LOGIC ---
window.openProductDetailsSafe = function(encodedData) {
    try {
        const product = JSON.parse(decodeURIComponent(encodedData));
        window.openProductDetails(product);
    } catch (e) { console.error("Error parsing product data", e); }
};

window.openProductDetails = function(product) {
    const modal = document.getElementById('productModal');
    if (!modal) return;

    document.getElementById('modalProductTitle').innerText = product.name;
    document.getElementById('modalProductPrice').innerText = `${product.price?.toLocaleString()} ETB`;
    document.getElementById('modalProductDesc').innerText = product.description || "No description provided.";
    document.getElementById('modalProductImg').src = product.image;

    const conditionDisplay = document.getElementById('modalCondition');
    if (conditionDisplay) {
        const cond = product.status_condition || 'New';
        conditionDisplay.innerText = cond;
        conditionDisplay.className = 'condition-badge ' + getConditionClass(cond);
    }

    const phone = product.phone_number;
    const tgUser = (product.telegram_username || product.seller_telegram || "").replace('@', '');
    const orderMsg = encodeURIComponent(`Hello! I'm interested in "${product.name}" for ${product.price?.toLocaleString()} ETB.`);

    const waBtn = document.getElementById('whatsappOrder');
    if (waBtn) waBtn.href = phone ? `https://wa.me/${phone.replace(/\D/g, '')}?text=${orderMsg}` : '#';

    const tgBtn = document.getElementById('telegramOrder');
    if (tgBtn) tgBtn.href = tgUser ? `https://t.me/${tgUser}` : '#';

    modal.style.display = 'flex';
};

// --- 4. HELPERS ---
function getConditionClass(condition) {
    if (!condition) return 'cond-default';
    const c = condition.toLowerCase();
    if (c.includes('new') && !c.includes('used')) return 'cond-new';
    if (c.includes('like new')) return 'cond-used-like-new';
    if (c.includes('fair') || c.includes('used')) return 'cond-used-fair';
    if (c.includes('refurbished')) return 'cond-refurbished';
    return 'cond-default';
}

function filterSearch(term) {
    const cards = document.querySelectorAll('.product-card');
    cards.forEach(card => {
        const title = card.querySelector('h3').innerText.toLowerCase();
        card.style.display = title.includes(term) ? 'block' : 'none';
    });
}

// --- 5. EXPOSE TO WINDOW (Essential for type="module") ---
window.filterCategory = function(cat, btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    fetchProducts(cat);
};

window.closeProductModal = () => document.getElementById('productModal').style.display = 'none';
window.toggleModal = () => {
    const m = document.getElementById('authModal');
    m.style.display = (m.style.display === "flex") ? "none" : "flex";
};

async function updateUIForUser() {
    const { data: { user } } = await _supabase.auth.getUser();
    const signinBtn = document.querySelector('.signin-btn');
    if (signinBtn && user) {
        signinBtn.innerText = "Sign Out";
        signinBtn.onclick = async () => { await _supabase.auth.signOut(); window.location.reload(); };
    }
}

window.updateCartBadge = function() {
    const cart = JSON.parse(localStorage.getItem('golem_cart') || '[]');
    const badge = document.getElementById('cartBadge');
    if (badge) {
        badge.innerText = cart.length;
        badge.style.display = cart.length > 0 ? 'flex' : 'none';
    }
};

window.fetchProducts = fetchProducts;

let isSignUpMode = false;

window.toggleAuthMode = function() {
    isSignUpMode = !isSignUpMode;
    const title = document.getElementById('modalTitle');
    const submitBtn = document.getElementById('authSubmitBtn');
    const regFields = document.getElementById('registerFields');
    const toggleLink = document.getElementById('toggleText');

    if (isSignUpMode) {
        title.innerText = "Create Account";
        submitBtn.innerText = "Sign Up";
        regFields.style.display = "block";
        toggleLink.innerHTML = 'Already have an account? <a href="#" onclick="toggleAuthMode()">Sign In</a>';
    } else {
        title.innerText = "Welcome Back";
        submitBtn.innerText = "Sign In";
        regFields.style.display = "none";
        toggleLink.innerHTML = 'Don\'t have an account? <a href="#" onclick="toggleAuthMode()">Sign Up</a>';
    }
};

window.handleAuth = async function(e) {
    e.preventDefault();
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const btn = document.getElementById('authSubmitBtn');

    btn.disabled = true;
    btn.innerText = "Processing...";

    if (isSignUpMode) {
        // SIGN UP LOGIC
        const fullName = document.getElementById('regName').value;
        const phone = document.getElementById('regPhone').value;

        const { data, error } = await _supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: fullName,
                    phone_number: phone
                }
            }
        });

        if (error) {
            alert("Error: " + error.message);
        } else {
            alert("Registration successful! Please check your email for a confirmation link.");
            toggleModal();
        }
    } else {
        // SIGN IN LOGIC
        const { data, error } = await _supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            alert("Login failed: " + error.message);
        } else {
            window.location.reload(); // Refresh to update UI
        }
    }
    btn.disabled = false;
    btn.innerText = isSignUpMode ? "Sign Up" : "Sign In";
};



window.checkAuthToSell = async function() {
    const { data: { user } } = await _supabase.auth.getUser();
    
    if (user) {
        // User is logged in, send them to the sell page
        window.location.href = 'sell.html';
    } else {
        // User is not logged in, show the login modal
        alert("Please sign in to post an item.");
        window.toggleModal(); 
    }
};


// This makes the function accessible to the HTML button
window.checkAuthToSell = checkAuthToSell;
