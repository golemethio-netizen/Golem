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
            const tg = (p.telegram_username || p.seller_telegram || '').replace('@', '');

            return `
                <div class="product-card ${isSold ? 'is-sold' : ''}">
                    <div class="card-img-container">
                        ${isSold ? '<div class="sold-watermark">SOLD</div>' : ''}
                        <img src="${p.image}" alt="${p.name}" loading="lazy">
                        <div class="image-overlay">
                            <button class="view-btn" onclick="window.openProductDetailsSafe('${safeData}')">Quick View</button>
                        </div>
                        <span class="status-badge ${condClass}">${condition}</span>
                    </div>
                    <div class="product-info">
                        <span class="category-badge">${p.category || 'General'}</span>
                        <h3 class="product-title">${p.name}</h3>
                        <div class="seller-line" style="font-size: 0.85rem; color: #666; margin-bottom: 5px;">
                            <i class="fas fa-user-circle"></i> ${p.seller_name || 'Seller'} ${verifiedBadge}
                        </div>
                        <div class="product-price">${p.price?.toLocaleString()} ETB</div>
                        
                        <div class="product-actions">
                            <button class="buy-btn" onclick="window.openProductDetailsSafe('${safeData}')">View Details</button>
                            ${tg ? `<a href="https://t.me/${tg}" target="_blank" class="share-btn"><i class="fab fa-telegram-plane"></i></a>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
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

    // Fill Modal Data
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

    // Setup Order Buttons
    const phone = product.phone_number;
    const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
    const tgUser = (product.telegram_username || product.seller_telegram || "").replace('@', '');
    const orderMsg = encodeURIComponent(`Hello! I'm interested in "${product.name}" for ${product.price?.toLocaleString()} ETB.`);

    const waBtn = document.getElementById('whatsappOrder');
    if (waBtn) waBtn.href = cleanPhone ? `https://wa.me/${cleanPhone}?text=${orderMsg}` : '#';

    const tgBtn = document.getElementById('telegramOrder');
    if (tgBtn) tgBtn.href = tgUser ? `https://t.me/${tgUser}` : '#';
    
    const callBtn = document.getElementById('callContact');
    if (callBtn) callBtn.href = cleanPhone ? `tel:${cleanPhone}` : '#';

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
        const title = card.querySelector('.product-title').innerText.toLowerCase();
        card.style.display = title.includes(term) ? 'block' : 'none';
    });
}

// --- 5. AUTH & UI HELPERS ---
window.closeProductModal = () => document.getElementById('productModal').style.display = 'none';

window.toggleModal = () => {
    const m = document.getElementById('authModal');
    if (!m) return;
    
    if (m.style.display === "flex") {
        m.style.display = "none";
        // Ensure the body doesn't stay locked/scrolled
        document.body.style.overflow = "auto";
    } else {
        m.style.display = "flex";
        document.body.style.overflow = "hidden"; // Prevent background scrolling
    }
};



window.updateCartBadge = function() {
    const cart = JSON.parse(localStorage.getItem('golem_cart') || '[]');
    const badge = document.getElementById('navCartCount') || document.getElementById('cartBadge');
    if (badge) {
        badge.innerText = cart.length;
        badge.style.display = cart.length > 0 ? 'flex' : 'none';
    }
};

window.showToast = function(message) {
    let toast = document.querySelector('.toast-container');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast-container';
        document.body.appendChild(toast);
    }
    toast.innerHTML = `<i class="fas fa-check-circle toast-icon"></i> ${message}`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
};

window.addToCart = function(id, name, price, image) {
    let cart = JSON.parse(localStorage.getItem('golem_cart') || '[]');
    if (cart.find(item => item.id === id)) {
        window.showToast("Already in your list!");
        return;
    }
    cart.push({ id, name, price, image });
    localStorage.setItem('golem_cart', JSON.stringify(cart));
    window.showToast("Item saved to your list!");
    window.updateCartBadge();
};

window.filterCategory = (cat, btn) => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    fetchProducts(cat);
};

window.checkAuthToSell = async () => {
    const { data: { user } } = await _supabase.auth.getUser();
    if (user) window.location.href = 'sell.html';
    else {
        alert("Please sign in to post an item.");
        window.toggleModal(); 
    }
};

window.addToCartFromModal = function() {
    const name = document.getElementById('modalProductTitle').innerText;
    const price = document.getElementById('modalProductPrice').innerText;
    const image = document.getElementById('modalProductImg').src;
    // We use the title as a temporary ID if ID isn't globally stored
    window.addToCart(name, name, price, image); 
};



// --- 5. AUTH & UI HELPERS (EXPOSED FOR MODULE USE) ---

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
        toggleLink.innerHTML = 'Already have an account? <a href="#" onclick="window.toggleAuthMode()">Sign In</a>';
    } else {
        title.innerText = "Welcome Back";
        submitBtn.innerText = "Sign In";
        regFields.style.display = "none";
        toggleLink.innerHTML = 'Don\'t have an account? <a href="#" onclick="window.toggleAuthMode()">Sign Up</a>';
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
        const fullName = document.getElementById('regName').value;
        const phone = document.getElementById('regPhone').value;

        const { data, error } = await _supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName, phone_number: phone } }
        });

        if (error) alert("Error: " + error.message);
        else {
            alert("Registration successful! Check your email.");
            window.toggleModal();
        }
    } else {
        const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
        if (error) alert("Login failed: " + error.message);
        else window.location.reload(); 
    }
    btn.disabled = false;
    btn.innerText = isSignUpMode ? "Sign Up" : "Sign In";
};

window.toggleModal = () => {
    const m = document.getElementById('authModal');
    if (!m) return;
    m.style.display = (m.style.display === "flex") ? "none" : "flex";
    document.body.style.overflow = (m.style.display === "flex") ? "hidden" : "auto";
};

// This ensures the UI updates (Sign In -> Sign Out) as soon as the page loads
async function updateUIForUser() {
    const { data: { user } } = await _supabase.auth.getUser();
    const signinBtn = document.querySelector('.signin-btn');
    const adminLink = document.getElementById('adminNavLink');

    if (user) {
        // 1. Update Sign In button to Sign Out
        if (signinBtn) {
            signinBtn.innerHTML = `<i class="fas fa-sign-out-alt"></i> <p>Sign Out</p>`;
            signinBtn.onclick = async () => { 
                await _supabase.auth.signOut(); 
                window.location.reload(); 
            };
        }

        // 2. Show Admin link ONLY if the email matches yours
        if (adminLink && user.email === 'yohannes.surafel@gmail.com') {
            adminLink.style.display = 'flex';
        }
    } else {
        // If logged out, ensure Admin link is hidden
        if (adminLink) adminLink.style.display = 'none';
    }
}


// Toggle Support Modal
window.toggleSupportModal = function() {
    const modal = document.getElementById('supportModal');
    modal.style.display = (modal.style.display === 'flex') ? 'none' : 'flex';
};

// Handle Support Submission
window.handleSupportSubmit = async function(e) {
    e.preventDefault();
    const email = document.getElementById('supportEmail').value;
    const subject = document.getElementById('supportSubject').value;
    const msg = document.getElementById('supportMessage').value;

    const { error } = await _supabase
        .from('support_tickets')
        .insert([{ user_email: email, subject: subject, message: msg }]);

    if (error) {
        alert("Error sending message: " + error.message);
    } else {
        alert("Message sent! Golem Admin will check it soon.");
        e.target.reset();
        toggleSupportModal();
    }
};


async function loadTickets() {
    const list = document.getElementById('ticketList');
    list.innerHTML = "<p>Loading tickets...</p>";

    const { data: tickets, error } = await _supabase
        .from('support_tickets')
        .select('*')
        .eq('is_resolved', false)
        .order('created_at', { ascending: false });

    if (error) {
        list.innerHTML = `<p style="color:red;">Error: ${error.message}</p>`;
        return;
    }

    if (!tickets || tickets.length === 0) {
        list.innerHTML = "<p style='color: #888; padding: 20px; text-align: center;'>✅ All caught up! No pending tickets.</p>";
        return;
    }

    // Inside loadTickets()
list.innerHTML = tickets.map(t => `
    <div class="stat-card" style="display: block; border-left: 5px solid #ff4d4d; cursor: default;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <strong style="color: #333;">${t.subject}</strong>
            <small style="color: #999;">${new Date(t.created_at).toLocaleDateString()}</small>
        </div>
        <p style="color: #555; background: #f9f9f9; padding: 10px; border-radius: 5px; margin: 10px 0;">
            ${t.message} </p>
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.8rem; color: #007bff;">From: ${t.user_email}</span>
            <button onclick="resolveTicket('${t.id}')" style="background: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
                Mark Resolved
            </button>
        </div>
    </div>
`).join('');
}

window.openProductModal = function(product) {
    const modal = document.getElementById('productModal');
    
    // Fill text data
    document.getElementById('modalProductImg').src = product.image;
    document.getElementById('modalProductTitle').innerText = product.name;
    document.getElementById('modalProductPrice').innerText = product.price.toLocaleString() + " ETB";
    document.getElementById('modalProductDesc').innerText = product.description || "No description provided.";

    // --- FIX CALL BUTTON ---
    // Remove spaces/dashes so the dialer can read it
    const cleanPhone = product.seller_phone.replace(/\s+/g, ''); 
    document.getElementById('callContact').href = `tel:${cleanPhone}`;

    // --- FIX TELEGRAM BUTTON ---
    // If seller_phone is '0912345678', we use international format for Telegram
    // Or if you have a telegram_username column, use that.
    let tgPhone = cleanPhone;
    if (tgPhone.startsWith('0')) {
        tgPhone = '+251' + tgPhone.substring(1);
    }
    document.getElementById('telegramOrder').href = `https://t.me/${tgPhone}`;

    // --- FIX WHATSAPP BUTTON ---
    document.getElementById('whatsappOrder').href = `https://wa.me/${tgPhone}?text=I am interested in ${product.name}`;

    modal.style.display = 'flex';
};
