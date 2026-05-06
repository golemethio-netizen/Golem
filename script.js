// ================================================
// WanaGebya | ዋና ገበያ - Main JavaScript
// Consolidated & Improved Version
// ================================================

// Global Variables
let _supabase = null;
let currentProduct = null;
let currentCategory = 'All';
let isAmharic = false;
let searchTimeout = null;

// ====================== INITIALIZATION ======================
document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 WanaGebya Initializing...");

    initSupabase();

    await updateUIForUser();
    updateCartBadge();
    fetchProducts();
    loadSponsor();

    // Debounced Search
    const searchInput = document.getElementById('headerSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                fetchProducts(currentCategory, e.target.value.trim());
            }, 350);
        });
    }

    // Online dot (business hours)
    const now = new Date();
    const hour = now.getHours();
    const dot = document.querySelector('.online-dot');
    if (dot) {
        dot.style.display = (hour >= 8 && hour < 20) ? 'block' : 'none';
    }

    // Welcome toast
    setTimeout(() => {
        const toast = document.getElementById('chatToast');
        if (toast) toast.style.display = 'block';
    }, 5000);

    console.log("✅ WanaGebya Ready!");
});

// Safe Supabase Init
function initSupabase() {
    if (_supabase) return;
    if (typeof supabase === 'undefined') {
        console.error("Supabase JS library not loaded!");
        return;
    }
    if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
        _supabase = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    } else {
        console.warn("Supabase credentials missing in config.js");
    }
}

// ====================== FETCH PRODUCTS ======================
window.fetchProducts = async (category = currentCategory, searchTerm = '') => {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    grid.innerHTML = `<div class="loading-spinner"><i class="fas fa-circle-notch fa-spin"></i> Loading items...</div>`;

    const sortOrder = document.getElementById('sortSelect')?.value || 'newest';
    const locationFilter = document.getElementById('locationSelect')?.value || 'all';

    let query = _supabase
        .from('products')
        .select(`
            *,
            profiles:user_id (full_name, avatar_url, is_verified)
        `)
        .eq('status', 'approved');

    if (category !== 'All') query = query.eq('category', category);
    if (locationFilter !== 'all') query = query.ilike('location', `%${locationFilter}%`);
    if (searchTerm) query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);

    // Sorting
    if (sortOrder === 'price_low') query = query.order('price', { ascending: true });
    else if (sortOrder === 'price_high') query = query.order('price', { ascending: false });
    else query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
        console.error("Fetch error:", error);
        grid.innerHTML = `
            <div style="text-align:center; padding:60px; color:#ff4757; grid-column:1/-1;">
                <i class="fas fa-exclamation-triangle" style="font-size:40px;"></i>
                <h3>Database Error</h3>
                <p>${error.message}</p>
            </div>`;
        return;
    }

    renderProducts(data || []);
};

// ====================== RENDER PRODUCTS ======================
function renderProducts(products) {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    if (!products || products.length === 0) {
        grid.innerHTML = `<div style="text-align:center; padding:80px 20px; color:#666; grid-column:1/-1;">
            <i class="fas fa-box-open" style="font-size:50px; opacity:0.6;"></i>
            <h3>No items found</h3>
            <p>Try different filters</p>
        </div>`;
        return;
    }

    const savedItems = JSON.parse(localStorage.getItem('wana_saved') || '[]');

    grid.innerHTML = products.map(p => {
        const isSaved = savedItems.includes(p.id);
        const isVerified = p.profiles?.is_verified === true;
        const isSponsored = p.is_sponsored && new Date(p.sponsored_until) > new Date();

        const cleanPhone = (p.seller_phone || '').replace(/\D/g, '').replace(/^0/, '251');
        const tgUser = (p.telegram_username || '').replace('@', '');

        return `
        <div class="product-card">
            <div class="card-img-container">
                ${isSponsored ? `<div class="badge sponsor-badge"><i class="fas fa-ad"></i> Sponsored</div>` : ''}
                <button class="wishlist-btn ${isSaved ? 'active' : ''}" onclick="toggleWishlist('${p.id}', this)">
                    <i class="${isSaved ? 'fas' : 'far'} fa-heart"></i>
                </button>
                <img src="${p.image}" alt="${p.name}" loading="lazy">
                <div class="image-overlay">
                    <button class="view-btn" onclick="openProductModalById('${p.id}')">Quick View</button>
                </div>
            </div>
            <div class="product-info">
                <span class="category-badge">${p.category || 'General'}</span>
                <h3 class="product-title">
                    ${p.name}
                    ${isVerified ? `<i class="fas fa-check-circle" style="color:#2ed573; margin-left:6px;"></i>` : ''}
                </h3>
                <div class="product-price">${Number(p.price).toLocaleString()} ETB</div>
                <div class="product-location">
                    <i class="fas fa-map-marker-alt"></i> ${p.location || 'Addis Ababa'}
                </div>
                <div class="quick-contact-bar">
                    <a href="tel:+${cleanPhone}" class="contact-icon call"><i class="fas fa-phone-alt"></i></a>
                    <a href="https://t.me/${tgUser || cleanPhone}" target="_blank" class="contact-icon telegram"><i class="fab fa-telegram-plane"></i></a>
                </div>
                <button class="buy-btn" onclick="openProductModalById('${p.id}')">View Details</button>
            </div>
        </div>`;
    }).join('');
}

// ====================== PRODUCT MODAL ======================
window.openProductModalById = async (id) => {
    if (!_supabase) return;
    const { data: product } = await _supabase
        .from('products')
        .select('*, profiles:user_id(*)')
        .eq('id', id)
        .single();

    if (product) openProductModal(product);
};

window.openProductModal = (product) => {
    currentProduct = product;

    const intPhone = (product.seller_phone || '').replace(/\D/g, '').replace(/^0/, '251');
    const tgUser = (product.telegram_username || '').replace('@', '');

    document.getElementById('modalProductImg').src = product.image;
    document.getElementById('modalProductTitle').innerText = product.name;
    document.getElementById('modalProductPrice').innerText = Number(product.price).toLocaleString() + " ETB";
    document.getElementById('modalProductDesc').innerText = product.description || "No description available.";

    const profile = product.profiles || {};
    document.getElementById('modalSellerName').innerText = `Seller: ${profile.full_name || 'Community Member'}`;

    document.getElementById('callContact').href = `tel:+${intPhone}`;
    document.getElementById('whatsappOrder').href = `https://wa.me/${intPhone}?text=${encodeURIComponent("I'm interested in " + product.name)}`;
    document.getElementById('telegramOrder').href = tgUser ? `https://t.me/${tgUser}` : `https://t.me/+${intPhone}`;

    document.getElementById('productModal').style.display = 'flex';
    document.body.style.overflow = "hidden";
};

window.closeProductModal = () => {
    document.getElementById('productModal').style.display = 'none';
    document.body.style.overflow = "auto";
};

// ====================== WISHLIST ======================
window.toggleWishlist = function(id, btnElement) {
    let saved = JSON.parse(localStorage.getItem('wana_saved') || '[]');
    if (saved.includes(id)) {
        saved = saved.filter(itemId => itemId !== id);
        btnElement.classList.remove('active');
    } else {
        saved.push(id);
        btnElement.classList.add('active');
    }
    localStorage.setItem('wana_saved', JSON.stringify(saved));
    updateCartBadge();
};

window.addToCartFromModal = function() {
    if (!currentProduct) return;
    let saved = JSON.parse(localStorage.getItem('wana_saved') || '[]');
    if (!saved.includes(currentProduct.id)) {
        saved.push(currentProduct.id);
        localStorage.setItem('wana_saved', JSON.stringify(saved));
        updateCartBadge();
        alert("❤️ Added to your Wishlist!");
    } else {
        alert("Already in Wishlist!");
    }
};

window.updateCartBadge = function() {
    const saved = JSON.parse(localStorage.getItem('wana_saved') || '[]');
    const badge = document.getElementById('cartBadge');
    if (badge) {
        badge.innerText = saved.length;
        badge.style.display = saved.length > 0 ? 'flex' : 'none';
    }
};

// ====================== FILTERS & SPONSOR ======================
window.filterCategory = (category, button) => {
    currentCategory = category;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    fetchProducts(category);
};

window.filterSponsored = async () => {
    const grid = document.getElementById('productGrid');
    grid.innerHTML = `<div class="loading-spinner"><i class="fas fa-circle-notch fa-spin"></i> Loading...</div>`;

    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('featuredFilterBtn').classList.add('active');

    const { data } = await _supabase
        .from('products')
        .select(`*, profiles:user_id(*)`)
        .eq('status', 'approved')
        .or('is_sponsored.eq.true,is_featured.eq.true')
        .order('created_at', { ascending: false });

    renderProducts(data || []);
};

window.loadSponsor = async () => {
    if (!_supabase) return;
    try {
        const now = new Date().toISOString();
        const { data: product } = await _supabase
            .from('products')
            .select('*')
            .eq('is_sponsored', true)
            .gt('sponsored_until', now)
            .limit(1)
            .maybeSingle();

        if (product) {
            document.getElementById('sponsorImg').src = product.image;
            document.getElementById('sponsorTitle').innerText = product.name;
            document.getElementById('sponsorDesc').innerText = (product.description || '').substring(0, 100) + "...";
            document.getElementById('mainSponsor').style.display = 'block';

            document.getElementById('sponsorLink').onclick = (e) => {
                e.preventDefault();
                openProductModal(product);
            };
        }
    } catch (err) {
        console.error("Sponsor error:", err);
    }
};

// ====================== AUTH & USER ======================
let isSignUpMode = false;

window.toggleAuthMode = function() { /* Your existing toggleAuthMode */ };
window.handleAuth = async function(e) { /* Your existing handleAuth */ };
window.updateUIForUser = async function() { /* Your existing updateUIForUser */ };
window.checkAuthToSell = async function(event) { /* Your existing checkAuthToSell */ };
window.handleSignOut = async function() { /* Your existing handleSignOut */ };
window.toggleModal = function() { /* Your existing toggleModal */ };

// ====================== ADMIN & OTHER FUNCTIONS ======================
// (Keep all your admin functions: loadUsers, toggleVerification, etc.)
// ... Paste your original admin, profile, support, and share functions here if needed ...

window.toggleLanguage = function() {
    isAmharic = !isAmharic;
    document.getElementById('langText').innerText = isAmharic ? "English" : "አማርኛ";
    // Simple toggle for data-am attributes
    document.querySelectorAll('[data-am]').forEach(el => {
        const temp = el.innerText;
        el.innerText = el.getAttribute('data-am');
        el.setAttribute('data-am', temp);
    });
};

// Close modals on background click
document.addEventListener('click', (e) => {
    if (e.target.id === 'productModal') closeProductModal();
    if (e.target.id === 'authModal') toggleModal();
});
