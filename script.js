// --- 1. INITIALIZATION & GLOBAL STATE ---
let currentProduct = null;

document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 Golem System Initializing...");
    
    // Auth & UI Setup
    await window.updateUIForUser();
    window.updateCartBadge();
    
    // Initial Data Fetch
    window.fetchProducts();
    window.loadSponsor();

    // Search Logic
    const searchInput = document.getElementById('headerSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => filterSearch(e.target.value.toLowerCase()));
    }
});

// --- 2. DATA FETCHING ---
window.fetchProducts = async (category = 'All') => {
    const grid = document.getElementById('productGrid');
    if (grid) grid.innerHTML = '<div class="loading-spinner"><i class="fas fa-circle-notch fa-spin"></i> Loading...</div>';

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

// --- 3. RENDERING ENGINE ---
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
        
        // Sponsorship & Admin Expiry Logic
        let adminInfo = '';
        let sponsorBadge = '';
        
        if (p.is_sponsored && p.sponsored_until) {
            const expiry = new Date(p.sponsored_until);
            if (expiry > now) {
                sponsorBadge = `<div class="grid-sponsor-badge"><i class="fas fa-star"></i> Featured</div>`;
                
                // Expiry Days (Visible only if body has .is-admin)
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
                </div>
                <div class="product-info">
                    <span class="category-badge">${p.category || 'General'}</span>
                    <h3 class="product-title">${p.name}</h3>
                    <div class="product-price">${p.price?.toLocaleString()} ETB</div>
                    ${adminInfo}
                    <div class="product-actions" style="margin-top:10px;">
                        <button class="buy-btn" onclick="window.openProductDetailsSafe('${safeData}')">Details</button>
                        ${p.telegram_username ? `<a href="https://t.me/${p.telegram_username.replace('@','')}" target="_blank" class="share-btn"><i class="fab fa-telegram-plane"></i></a>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// --- 4. SPONSORSHIP SYSTEM ---
window.loadSponsor = async () => {
    try {
        const now = new Date().toISOString();
        const { data: product } = await _supabase
            .from('products')
            .select('*')
            .eq('is_sponsored', true)
            .gt('sponsored_until', now)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        const sponsorSection = document.getElementById('mainSponsor');
        if (product && sponsorSection) {
            document.getElementById('sponsorImg').src = product.image;
            document.getElementById('sponsorTitle').innerText = product.name;
            document.getElementById('sponsorDesc').innerText = product.description?.substring(0, 100) + "...";
            document.getElementById('sponsorLink').href = `checkout.html?id=${product.id}`;
            sponsorSection.style.display = 'block';
        }
    } catch (err) { console.error("Sponsor load error", err); }
};

window.filterSponsored = async () => {
    const now = new Date().toISOString();
    const { data } = await _supabase
        .from('products')
        .select('*')
        .eq('is_sponsored', true)
        .gt('sponsored_until', now);
    
    if (data) renderProducts(data);
};

window.filterCategory = (category, button) => {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    window.fetchProducts(category);
};

// --- 5. MODAL LOGIC ---
window.openProductDetailsSafe = (encodedData) => {
    try {
        const product = JSON.parse(decodeURIComponent(encodedData));
        window.openProductModal(product);
    } catch (e) { console.error("Error parsing product", e); }
};

window.openProductModal = (product) => {
    currentProduct = product;
    const modal = document.getElementById('productModal');
    if (!modal) return;

    document.getElementById('modalProductImg').src = product.image;
    document.getElementById('modalProductTitle').innerText = product.name;
    document.getElementById('modalProductPrice').innerText = product.price.toLocaleString() + " ETB";
    document.getElementById('modalProductDesc').innerText = product.description || "No description.";

    const cleanPhone = (product.seller_phone || "").replace(/\D/g, '');
    let intPhone = cleanPhone.startsWith('0') ? '251' + cleanPhone.substring(1) : cleanPhone;

    document.getElementById('callContact').href = `tel:+${intPhone}`;
    const tgUser = (product.telegram_username || "").replace('@', '');
    document.getElementById('telegramOrder').href = tgUser ? `https://t.me/${tgUser}` : `https://t.me/+${intPhone}`;
    document.getElementById('whatsappOrder').href = `https://wa.me/${intPhone}?text=I'm interested in ${product.name}`;

    modal.style.display = 'flex';
    document.body.style.overflow = "hidden";
};

window.closeProductModal = () => {
    document.getElementById('productModal').style.display = 'none';
    document.body.style.overflow = "auto";
};

// --- 6. AUTH & ACCOUNT ---
window.toggleModal = () => {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.style.display = (modal.style.display === 'flex') ? 'none' : 'flex';
        document.body.style.overflow = (modal.style.display === 'flex') ? 'hidden' : 'auto';
    }
};

window.updateUIForUser = async () => {
    const { data: { user } } = await _supabase.auth.getUser();
    const adminLink = document.getElementById('adminNavLink');
    if (user && adminLink && user.email === 'yohannes.surafel@gmail.com') {
        adminLink.style.display = 'flex';
        document.body.classList.add('is-admin');
    }
};

window.handleAuth = async (e) => {
    e.preventDefault();
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const { error } = await _supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else window.location.reload();
};

window.checkAuthToSell = async () => {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) {
        alert("Please Sign In first!");
        window.toggleModal();
    } else {
        window.location.href = 'sell.html';
    }
};

// --- 7. CART / SAVED ITEMS ---
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
        window.updateCartBadge();
        alert("❤️ Saved!");
    }
};

// --- 8. HELPERS ---
function filterSearch(term) {
    const cards = document.querySelectorAll('.product-card');
    cards.forEach(card => {
        const title = card.querySelector('.product-title').innerText.toLowerCase();
        card.style.display = title.includes(term) ? 'block' : 'none';
    });
}

window.shareToTelegram = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://t.me/share/url?url=${url}&text=Check out Golem Furniture!`, '_blank');
};

window.shareToWhatsApp = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://wa.me/?text=Check out Golem! ${url}`, '_blank');
};

window.toggleSupportModal = () => {
    const modal = document.getElementById('supportModal');
    if (modal) modal.style.display = (modal.style.display === 'flex') ? 'none' : 'flex';
};
