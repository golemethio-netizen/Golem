// --- 1. INITIALIZATION & STATE ---
let currentProduct = null; 

document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 Golem System Initializing...");
    
    // Auth & UI Setup
    await updateUIForUser();
    updateCartBadge();
    
    // Initial Data Fetch
    fetchProducts();
    loadSponsor();

    // Search Logic
    const searchInput = document.getElementById('headerSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => filterSearch(e.target.value.toLowerCase()));
    }
});

// --- 2. DATA FETCHING ---
window.fetchProducts = async (category = 'All') => {
    const grid = document.getElementById('productGrid');
    if (grid) grid.innerHTML = '<div class="loading">Loading items...</div>';

    const sortOrder = document.getElementById('sortSelect')?.value || 'newest';
    let query = _supabase.from('products').select('*').eq('status', 'approved');

    if (category !== 'All') query = query.eq('category', category);

    // Sorting Logic
    if (sortOrder === 'price_low') query = query.order('price', { ascending: true });
    else if (sortOrder === 'price_high') query = query.order('price', { ascending: false });
    else query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (!error) renderProducts(data);
    else console.error("Fetch error:", error.message);
};

// --- 3. RENDERING (Integrated with Sponsored Logic) ---
function renderProducts(products) {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    if (products.length === 0) {
        grid.innerHTML = `<div style="text-align:center; grid-column:1/-1; padding:60px; color:#888;">No items found.</div>`;
        return;
    }

    const now = new Date();

    grid.innerHTML = products.map(p => {
        const safeData = encodeURIComponent(JSON.stringify(p));
        const isSold = p.status === 'sold';
        const condition = p.status_condition || 'New';
        const condClass = getConditionClass(condition);
        
        // Verified Sellers
        const verifiedNames = ['Crown Time', 'Crown Time Furniture', 'Golem Admin'];
        const isVerified = verifiedNames.includes(p.seller_name);
        const verifiedBadge = isVerified ? `<i class="fas fa-check-circle" style="color: #007bff; margin-left: 4px;"></i>` : '';

        // Sponsorship & Admin Expiry Logic
        let adminInfo = '';
        let sponsorBadge = '';
        
        if (p.is_sponsored && p.sponsored_until) {
            const expiry = new Date(p.sponsored_until);
            if (expiry > now) {
                sponsorBadge = `<div class="grid-sponsor-badge"><i class="fas fa-star"></i> Featured</div>`;
                
                // Calculate Days Left for Admin
                const diffTime = expiry - now;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const statusColor = diffDays <= 2 ? '#ff4757' : '#2ed573';
                
                adminInfo = `
                    <div class="admin-expiry-info" style="color: ${statusColor}; font-size: 0.75rem; font-weight: bold; margin-top: 5px;">
                        <i class="fas fa-clock"></i> ${diffDays} days left
                    </div>
                `;
            }
        }

        return `
            <div class="product-card ${isSold ? 'is-sold' : ''}">
                <div class="card-img-container">
                    ${isSold ? '<div class="sold-watermark">SOLD</div>' : ''}
                    ${sponsorBadge}
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
                    ${adminInfo}
                    <div class="product-actions" style="margin-top:10px;">
                        <button class="buy-btn" onclick="window.openProductDetailsSafe('${safeData}')">View Details</button>
                        ${p.telegram_username ? `<a href="https://t.me/${p.telegram_username.replace('@','')}" target="_blank" class="share-btn"><i class="fab fa-telegram-plane"></i></a>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// --- 4. SPONSORSHIP SYSTEM ---
async function loadSponsor() {
    try {
        const now = new Date().toISOString();
        // Added .maybeSingle() to prevent the 406 error if 0 rows are found
        const { data: product, error } = await _supabase
            .from('products')
            .select('*')
            .eq('is_sponsored', true)
            .gt('sponsored_until', now)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(); 

        if (error) throw error;

        const sponsorSection = document.querySelector('.sponsored-section');
        if (product && sponsorSection) {
            const imgEl = document.getElementById('sponsorImg');
            if(imgEl) imgEl.src = product.image;
            
            document.getElementById('sponsorTitle').innerText = product.name;
            document.getElementById('sponsorDesc').innerText = product.description?.substring(0, 100) + "...";
            document.getElementById('sponsorLink').href = `checkout.html?id=${product.id}`;
            sponsorSection.style.display = 'block';
        }
    } catch (err) {
        console.log("Sponsor Info: No active sponsors currently.");
        const sponsorSection = document.querySelector('.sponsored-section');
        if(sponsorSection) sponsorSection.style.display = 'none';
    }
}


window.filterSponsored = async () => {
    const now = new Date().toISOString();
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.sponsor-filter')?.classList.add('active');

    const { data } = await _supabase
        .from('products')
        .select('*')
        .eq('is_sponsored', true)
        .gt('sponsored_until', now)
        .order('price', { ascending: false });

    if (data) renderProducts(data);
};

// --- 5. MODAL & INTERACTION ---
window.openProductDetailsSafe = (encodedData) => {
    try {
        const product = JSON.parse(decodeURIComponent(encodedData));
        window.openProductModal(product);
    } catch (e) { console.error("Error parsing product data", e); }
};

window.openProductModal = (product) => {
    currentProduct = product;
    const modal = document.getElementById('productModal');
    if (!modal) return;

    document.getElementById('modalProductImg').src = product.image;
    document.getElementById('modalProductTitle').innerText = product.name;
    document.getElementById('modalProductPrice').innerText = product.price.toLocaleString() + " ETB";
    document.getElementById('modalProductDesc').innerText = product.description || "No description provided.";

    // Contact Formatting
    const rawPhone = product.seller_phone || product.phone_number || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    let intPhone = cleanPhone.startsWith('0') ? '251' + cleanPhone.substring(1) : cleanPhone;

    document.getElementById('callContact').href = `tel:+${intPhone}`;
    const tgUser = (product.telegram_username || "").replace('@', '');
    document.getElementById('telegramOrder').href = tgUser ? `https://t.me/${tgUser}` : `https://t.me/+${intPhone}`;
    document.getElementById('whatsappOrder').href = `https://wa.me/${intPhone}?text=Interest in ${product.name}`;

    modal.style.display = 'flex';
    document.body.style.overflow = "hidden";
};

window.closeProductModal = () => {
    document.getElementById('productModal').style.display = 'none';
    document.body.style.overflow = "auto";
};

// --- 6. USER & CART SYSTEM ---
window.updateUIForUser = async () => {
    const { data: { user } } = await _supabase.auth.getUser();
    const adminLink = document.getElementById('adminNavLink');
    if (user && adminLink && user.email === 'yohannes.surafel@gmail.com') {
        adminLink.style.display = 'flex';
        document.body.classList.add('is-admin'); // Automatically enable admin view for you
    }
};

window.updateCartBadge = () => {
    const saved = JSON.parse(localStorage.getItem('golem_saved') || '[]');
    const badge = document.getElementById('cartBadge');
    if (badge) {
        badge.innerText = saved.length;
        badge.style.display = saved.length > 0 ? 'flex' : 'none';
    }
};

window.addToCartFromModal = () => {
    if (!currentProduct) return;
    let saved = JSON.parse(localStorage.getItem('golem_saved') || '[]');
    if (!saved.includes(currentProduct.id)) {
        saved.push(currentProduct.id);
        localStorage.setItem('golem_saved', JSON.stringify(saved));
        updateCartBadge();
        alert("❤️ Item saved!");
    } else {
        alert("Already in your list.");
    }
};

// --- 7. HELPERS ---
function getConditionClass(condition) {
    const c = condition?.toLowerCase() || '';
    if (c.includes('new') && !c.includes('used')) return 'cond-new';
    if (c.includes('like new')) return 'cond-used-like-new';
    if (c.includes('fair') || c.includes('used')) return 'cond-used-fair';
    return 'cond-default';
}

function filterSearch(term) {
    const cards = document.querySelectorAll('.product-card');
    cards.forEach(card => {
        const title = card.querySelector('.product-title').innerText.toLowerCase();
        card.style.display = title.includes(term) ? 'block' : 'none';
    });
}


// Make sure these are attached to the window object so HTML can see them
window.toggleAuthModal = () => {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.style.display = (modal.style.display === "flex") ? "none" : "flex";
        document.body.style.overflow = (modal.style.display === "flex") ? "hidden" : "auto";
    } else {
        console.error("Auth Modal not found in HTML");
    }
};
