// --- 1. INITIALIZATION & GLOBAL STATE ---
let currentProduct = null;
window.currentCategory = 'All';

document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 WanaGebya System Initializing...");
    await window.updateUIForUser();
    window.updateCartBadge();
    window.fetchProducts();
    window.loadSponsor();


    const now = new Date();
    const hour = now.getHours();
    const dot = document.querySelector('.online-dot');
    if (dot) {
        dot.style.display = (hour >= 8 && hour < 20) ? 'block' : 'none';
    }

    setTimeout(() => {
        const toast = document.getElementById('chatToast');
        if (toast && !document.getElementById('chatMenu').classList.contains('active')) {
            toast.style.display = 'block';
        }
    }, 5000);

    const searchInput = document.getElementById('headerSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => filterSearch(e.target.value.toLowerCase()));
    }
});

// --- 2. DATA FETCHING ---
window.fetchProducts = async (category = window.currentCategory || 'All') => {
    const grid = document.getElementById('productGrid');
    if (grid) grid.innerHTML = '<div class="loading-spinner"><i class="fas fa-circle-notch fa-spin"></i> Loading...</div>';

    const sortOrder = document.getElementById('sortSelect')?.value || 'newest';
    const locationFilter = document.getElementById('locationSelect')?.value || 'all';

    let query = _supabase
        .from('products')
        .select(`*, profiles:user_id (is_verified, full_name, avatar_url)`)
        .eq('status', 'approved');

    if (category !== 'All') query = query.eq('category', category);
    if (locationFilter !== 'all') query = query.ilike('location', `%${locationFilter}%`);

    if (sortOrder === 'price_low') {
        query = query.order('price', { ascending: true });
    } else if (sortOrder === 'price_high') {
        query = query.order('price', { ascending: false });
    } else {
        query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;

    if (!error) {
        renderProducts(data);
    } else {
        console.error("Fetch error:", error.message);
        if (grid) {
            grid.innerHTML = `
                <div style="text-align:center; grid-column:1/-1; padding:50px; color:#ff4757; background:#fff; border-radius:12px; border:1px solid #ff4757;">
                    <i class="fas fa-exclamation-triangle" style="font-size:30px; margin-bottom:10px;"></i>
                    <h3>Database Error</h3>
                    <p>${error.message}</p>
                    <p style="font-size:0.8rem; color:#666; margin-top:10px;">Check your Supabase RLS policies or Table relationships.</p>
                </div>`;
        }
    }
};

window.filterSponsored = async () => {
    const grid = document.getElementById('productGrid');
    if (grid) grid.innerHTML = '<div class="loading-spinner"><i class="fas fa-circle-notch fa-spin"></i> Loading...</div>';

    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.sponsor-filter').classList.add('active');

    const { data, error } = await _supabase
        .from('products')
        .select(`*, profiles:user_id (is_verified, full_name, avatar_url)`)
        .eq('status', 'approved')
        .or('is_sponsored.eq.true,is_featured.eq.true')
        .order('created_at', { ascending: false });

    if (!error) renderProducts(data);
    else console.error("Fetch error:", error.message);
};

// --- 3. WISHLIST LOGIC ---
window.toggleWishlist = function(id, btnElement) {
    try {
        let saved = JSON.parse(localStorage.getItem('golem_saved') || '[]');
        const icon = btnElement.querySelector('i');
        if (saved.includes(id)) {
            saved = saved.filter(itemId => itemId !== id);
            btnElement.classList.remove('active');
            if (icon) { icon.classList.remove('fas'); icon.classList.add('far'); }
        } else {
            saved.push(id);
            btnElement.classList.add('active');
            if (icon) { icon.classList.remove('far'); icon.classList.add('fas'); }
        }
        localStorage.setItem('golem_saved', JSON.stringify(saved));
        window.updateCartBadge();
    } catch (e) { console.error("Wishlist error:", e); }
};

window.addToCartFromModal = function() {
    if (!currentProduct) return;
    let saved = JSON.parse(localStorage.getItem('golem_saved') || '[]');
    if (!saved.includes(currentProduct.id)) {
        saved.push(currentProduct.id);
        localStorage.setItem('golem_saved', JSON.stringify(saved));
        window.updateCartBadge();
        alert("❤️ Added to your Wishlist!");
    } else {
        alert("This item is already in your Wishlist!");
    }
};

window.updateCartBadge = function() {
    const saved = JSON.parse(localStorage.getItem('golem_saved') || '[]');
    const badge = document.getElementById('cartBadge');
    if (badge) {
        badge.innerText = saved.length;
        badge.style.display = saved.length > 0 ? 'flex' : 'none';
    }
};

// --- 4. RENDERING ENGINE ---
function renderProducts(products) {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    if (!products || products.length === 0) {
        grid.innerHTML = `<div style="text-align:center; grid-column:1/-1; padding:60px; color:#888;">No items found in this category.</div>`;
        return;
    }

    const savedItems = JSON.parse(localStorage.getItem('golem_saved') || '[]');
    const now = new Date();

    grid.innerHTML = products.map(p => {
     
        // Ensure no backticks or quotes are nested incorrectly
const safeData = encodeURIComponent(JSON.stringify(p)).replace(/'/g, "%27");
        
        const isVerified = p.profiles?.is_verified === true;
        const isSold = p.status === 'sold';
        const isSaved = savedItems.includes(p.id);
        const isSponsored = p.is_sponsored && p.sponsored_until && new Date(p.sponsored_until) > now;
        const isFeatured = p.is_featured;

        const rawPhone = (p.seller_phone || "").replace(/\D/g, '');
        const cleanPhone = rawPhone.startsWith('0') ? '251' + rawPhone.substring(1) : rawPhone;
        const tgUser = (p.telegram_username || "").replace('@', '');

        // ═══════════════════════════════════════════════════════
        // SPECIAL CARD — Jobs & Services
        // ═══════════════════════════════════════════════════════
        if (p.category === 'Jobs' || p.category === 'Services') {
            const isJob = p.category === 'Jobs';
            const icon      = isJob ? 'fa-briefcase' : 'fa-handshake';
            const label     = isJob ? 'Job Opportunity' : 'Service';
            const priceLabel = isJob ? 'Salary' : 'Starting From';
            const accentColor  = isJob ? '#63b3ed' : '#b794f4';
            const accentColor2 = isJob ? '#4299e1' : '#9f7aea';
            const bgGrad    = isJob
                ? 'linear-gradient(135deg,#0d1b2a 0%,#1a2d45 100%)'
                : 'linear-gradient(135deg,#1a0d2e 0%,#2d1a45 100%)';
            const borderColor = isJob ? '#1e3a5f' : '#3d1a5f';
            const shortDesc = (p.description || '').substring(0, 100) + (p.description?.length > 100 ? '…' : '');

            return `
            <div style="
                background:${bgGrad};
                border-radius:16px;
                overflow:hidden;
                border:1px solid ${borderColor};
                color:white;
                position:relative;
                display:flex;
                flex-direction:column;
            ">
                <!-- Top accent line -->
                <div style="height:3px; background:linear-gradient(90deg,${accentColor},${accentColor2});"></div>

                <!-- Header -->
                <div style="padding:16px 16px 12px; position:relative;">

                    <!-- Wishlist -->
                    <button class="wishlist-btn ${isSaved ? 'active' : ''}"
                        onclick="window.toggleWishlist('${p.id}', this)"
                        style="position:absolute; top:12px; right:12px; background:rgba(255,255,255,0.08); border:none; border-radius:50%; width:30px; height:30px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:${isSaved ? '#ff6b81' : '#888'}; font-size:13px;">
                        <i class="${isSaved ? 'fas' : 'far'} fa-heart"></i>
                    </button>

                    <!-- Category badge -->
                    <div style="display:inline-flex; align-items:center; gap:6px; font-size:10px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; padding:4px 11px; border-radius:20px; margin-bottom:11px; background:rgba(255,255,255,0.07); color:${accentColor}; border:1px solid ${borderColor};">
                        <i class="fas ${icon}" style="font-size:10px;"></i> ${label}
                    </div>

                    <!-- Title -->
                    <h3 onclick="window.openProductDetailsSafe('${safeData}')"
                        style="margin:0 0 8px; font-size:15px; font-weight:700; color:#fff; line-height:1.3; cursor:pointer;">
                        ${p.name}
                    </h3>

                    <!-- Location -->
                    <div style="display:flex; align-items:center; gap:5px; font-size:12px; color:#8899bb;">
                        <i class="fas fa-map-marker-alt" style="color:#ff6b81; font-size:11px;"></i>
                        ${p.location || 'Addis Ababa'}
                    </div>
                </div>

                <!-- Description -->
                <p style="margin:0; padding:0 16px 14px; font-size:12px; color:#8899bb; line-height:1.55;">
                    ${shortDesc || 'No description provided.'}
                </p>

                <!-- Divider -->
                <div style="height:1px; background:rgba(255,255,255,0.07); margin:0 16px;"></div>

                <!-- Price & Verification row -->
                <div style="display:flex; align-items:center; justify-content:space-between; padding:12px 16px;">
                    <div>
                        <div style="font-size:9px; color:#556; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:3px;">${priceLabel}</div>
                        <div style="font-size:17px; font-weight:800; background:linear-gradient(90deg,${accentColor},${accentColor2}); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">
                            ${p.price ? p.price.toLocaleString() + ' ETB' : 'Negotiable'}
                        </div>
                    </div>
                    <div style="display:flex; align-items:center; gap:5px; font-size:11px; color:#8899bb;">
                        <i class="fas fa-check-circle" style="color:${isVerified ? '#2ed573' : '#444'};"></i>
                        ${isVerified ? 'Verified' : 'Community'}
                    </div>
                </div>

                <!-- Action buttons -->
                <div style="display:flex; gap:8px; padding:0 16px 16px;">
                    <a href="tel:+${cleanPhone}"
                        style="flex:1; display:flex; align-items:center; justify-content:center; gap:5px; padding:10px 6px; border-radius:10px; background:${accentColor}; color:#0d1117; text-decoration:none; font-size:12px; font-weight:700; border:none;">
                        <i class="fas fa-phone" style="font-size:11px;"></i> Call
                    </a>
                    <a href="https://t.me/${tgUser || '+' + cleanPhone}" target="_blank"
                        style="flex:1; display:flex; align-items:center; justify-content:center; gap:5px; padding:10px 6px; border-radius:10px; background:rgba(255,255,255,0.07); color:#fff; text-decoration:none; font-size:12px; font-weight:700; border:1px solid rgba(255,255,255,0.14);">
                        <i class="fab fa-telegram-plane" style="font-size:11px;"></i> Telegram
                    </a>
                    <button onclick="window.openProductDetailsSafe('${safeData}')"
                        style="flex:1; display:flex; align-items:center; justify-content:center; gap:5px; padding:10px 6px; border-radius:10px; background:rgba(255,255,255,0.07); color:#fff; font-size:12px; font-weight:700; border:1px solid rgba(255,255,255,0.14); cursor:pointer; font-family:inherit;">
                        <i class="fas fa-info-circle" style="font-size:11px;"></i> Details
                    </button>
                </div>
            </div>`;
        }
        // ═══════════════════════════════════════════════════════
        // END SPECIAL CARD
        // ═══════════════════════════════════════════════════════

        // Regular product card
        let statusBadge = '';
        if (isSponsored) {
            statusBadge = `<div class="badge sponsor-badge"><i class="fas fa-ad"></i> Sponsored</div>`;
        } else if (isFeatured) {
            statusBadge = `<div class="badge feature-badge"><i class="fas fa-star"></i> Featured</div>`;
        }

        const shareText = encodeURIComponent(`Check out this ${p.name} on WanaGebya Marketplace!`);
        const baseUrl = window.location.href.split('?')[0].split('#')[0].replace('index.html', '');
        const shareUrl = encodeURIComponent(`${baseUrl}product.html?id=${p.id}`);

        return `
        <div class="product-card ${isSold ? 'is-sold' : ''}">
            <div class="card-img-container">
                ${isSold ? '<div class="sold-watermark">SOLD</div>' : ''}
                ${statusBadge}
                <button class="wishlist-btn ${isSaved ? 'active' : ''}" onclick="window.toggleWishlist('${p.id}', this)">
                    <i class="${isSaved ? 'fas' : 'far'} fa-heart"></i>
                </button>
                <img src="${p.image}" alt="${p.name}" loading="lazy"
                    style="cursor:pointer; width:100%; display:block;"
                    onclick="window.openProductDetailsSafe('${safeData}')">
                <div class="image-overlay">
                    <button class="view-btn" onclick="window.openProductDetailsSafe('${safeData}')">Quick View</button>
                </div>
            </div>

            <div class="product-info">
                <span class="category-badge">${p.category || 'General'}</span>
                <h3 class="product-title">
                    ${p.name}
                    <span class="verification-wrapper" style="display:inline-flex; align-items:center; gap:5px; font-size:0.8rem; margin-left:5px;">
                        <i class="fas fa-check-circle" style="color:${isVerified ? '#2ed573' : '#ccc'};"></i>
                        <span style="color:${isVerified ? '#2ed573' : '#888'}; font-weight:normal;">
                            ${isVerified ? 'Verified' : 'Community'}
                        </span>
                    </span>
                </h3>

                <div class="product-price">${p.price?.toLocaleString()} ETB</div>

                <div class="product-location" style="display:flex; align-items:center; gap:5px; font-size:0.85rem; color:#666; margin-top:5px;">
                    <i class="fas fa-map-marker-alt" style="color:#ff4757;"></i>
                    <span>${p.location || 'Addis Ababa'}</span>
                </div>

                <div class="quick-contact-bar" style="margin-top:12px; display:flex; gap:7px;">
                    <a href="tel:+${cleanPhone}"
                        style="flex:1; display:flex; align-items:center; justify-content:center; gap:5px; padding:10px 6px; border-radius:10px; background:#333; color:#fff; text-decoration:none; font-size:12px; font-weight:600;">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>
                        Call
                    </a>
                    <a href="https://t.me/${tgUser || '+' + cleanPhone}" target="_blank"
                        style="flex:1; display:flex; align-items:center; justify-content:center; gap:5px; padding:10px 6px; border-radius:10px; background:#0088cc; color:#fff; text-decoration:none; font-size:12px; font-weight:600;">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                        TG
                    </a>
                    <a href="https://wa.me/${cleanPhone}?text=${encodeURIComponent('Interested in ' + p.name + ' on WanaGebya')}" target="_blank"
                        style="flex:1; display:flex; align-items:center; justify-content:center; gap:5px; padding:10px 6px; border-radius:10px; background:#25d366; color:#fff; text-decoration:none; font-size:12px; font-weight:600;">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                        WA
                    </a>
                    <button onclick="window.open('https://t.me/share/url?url=${shareUrl}&text=${shareText}','_blank')"
                        style="flex:1; display:flex; align-items:center; justify-content:center; gap:5px; padding:10px 6px; border-radius:10px; background:#6c5ce7; color:#fff; border:none; cursor:pointer; font-size:12px; font-weight:600; font-family:inherit;">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>
                        Share
                    </button>
                </div>

                <div class="product-actions" style="margin-top:15px;">
                    <button class="buy-btn" onclick="window.openProductDetailsSafe('${safeData}')" style="width:100%; padding:10px; border-radius:8px; cursor:pointer;">
                        Full Details
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');
}

// --- 5. SPONSORSHIP, FILTERING & SEARCH ---
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
            document.getElementById('sponsorLink').onclick = (e) => {
                e.preventDefault();
                window.openProductModal(product);
            };
            sponsorSection.style.display = 'block';
        }
    } catch (err) { console.error("Sponsor load error", err); }
};

window.filterCategory = (category, button) => {
    window.currentCategory = category;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    window.fetchProducts(category);
};

function filterSearch(term) {
    const cards = document.querySelectorAll('.product-card, [data-searchable]');
    document.querySelectorAll('#productGrid > div').forEach(card => {
        const titleEl = card.querySelector('.product-title, h3');
        if (titleEl) {
            card.style.display = titleEl.innerText.toLowerCase().includes(term) ? '' : 'none';
        }
    });
}

// --- 6. MODAL & VIEW LOGIC ---
// --- 6. MODAL & VIEW LOGIC ---
window.openProductDetailsSafe = (encodedData) => {
    try {
        const product = JSON.parse(decodeURIComponent(encodedData));
        window.openProductModal(product);
    } catch (e) { console.error("Error parsing product", e); }
};

window.openProductModal = async (product) => {
    currentProduct = product;
    const modal = document.getElementById('productModal');
    if (!modal) return;

    // 1. Inject CSS for the Custom Job/Service Card dynamically
    if (!document.getElementById('jc-custom-styles')) {
        const style = document.createElement('style');
        style.id = 'jc-custom-styles';
        style.innerHTML = `
        :root { --jc-accent: #e8321a; --jc-accent2: #f97316; --jc-accent-light: #fff4f2; --jc-dark-header: #1a1612; --jc-border: #e2e8f0; --jc-green: #22c55e; }
        .jc-card { width: 100%; background: #fff; border-radius: 18px; overflow: hidden; position: relative; text-align: left; font-family: 'Poppins', sans-serif;}
        .jc-watermark { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; z-index: 10; overflow: hidden; transform: rotate(-25deg); }
        .jc-watermark-text { font-weight: 800; white-space: nowrap; font-size: 62px; color: rgba(232, 50, 26, 0.05); }
        .jc-photo-wrap { background: #1a1612; border-bottom: 1px solid #2a2420; display: flex; align-items: center; justify-content: center; min-height: 56px; position: relative; }
        .jc-photo-wrap.has-photo { min-height: 200px; }
        .jc-card-photo { width: 100%; max-height: 250px; object-fit: cover; display: block; }
        .jc-no-photo-msg { font-size: 10px; color: #3a3530; padding: 16px; text-transform: uppercase; font-weight: 600; }
        .jc-card-header { background: var(--jc-dark-header); padding: 18px 22px 20px; position: relative; }
        .jc-header-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 10px; gap: 10px; }
        .jc-badge-stock { color: #4ade80; border: 1px solid rgba(74,222,128,0.4); background: rgba(74,222,128,0.08); font-size: 10.5px; font-weight: 700; padding: 4px 10px; border-radius: 6px; letter-spacing: 0.05em; }
        .jc-price-block { text-align: right; }
        .jc-price-old { font-size: 12px; color: #555; font-weight: 500; text-decoration: line-through; }
        .jc-price-new { font-size: 24px; font-weight: 800; color: var(--jc-accent); line-height: 1; }
        .jc-price-currency { font-size: 10px; color: #666; font-weight: 600; margin-top: 2px; }
        .jc-product-name { font-size: 22px; font-weight: 800; color: #fff; line-height: 1.1; margin-bottom: 5px; }
        .jc-product-sub { font-size: 12px; color: #8899aa; font-weight: 400; }
        .jc-highlight-bar { background: linear-gradient(90deg, var(--jc-accent) 0%, var(--jc-accent2) 100%); padding: 10px 22px; display: flex; align-items: center; justify-content: space-between; }
        .jc-highlight-item { display: flex; flex-direction: column; align-items: center; flex: 1; }
        .jc-highlight-item + .jc-highlight-item { border-left: 1px solid rgba(255,255,255,0.2); }
        .jc-highlight-value { font-size: 14px; font-weight: 800; color: white; text-align: center; }
        .jc-highlight-label { font-size: 9px; font-weight: 700; color: rgba(255,255,255,0.75); text-transform: uppercase; margin-top: 2px; }
        .jc-specs-grid { display: grid; grid-template-columns: 1fr 1fr; background: white; }
        .jc-spec-cell { padding: 13px 20px; border-bottom: 1px solid var(--jc-border); display: flex; flex-direction: column; gap: 2px; }
        .jc-spec-cell:nth-child(odd) { border-right: 1px solid var(--jc-border); }
        .jc-spec-cell:nth-last-child(-n+2) { border-bottom: none; }
        .jc-spec-icon-wrap { width: 26px; height: 26px; border-radius: 6px; background: var(--jc-accent-light); display: flex; align-items: center; justify-content: center; margin-bottom: 7px; color: var(--jc-accent); font-size:12px; }
        .jc-spec-label { font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
        .jc-spec-value { font-size: 13.5px; font-weight: 700; color: #12100e; }
        .jc-desc-area { padding: 15px 20px; font-size: 13px; color: #444; background: #fff; border-bottom: 1px solid var(--jc-border); line-height: 1.5; white-space: pre-wrap;}
        .jc-card-footer { padding: 13px 20px; display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--jc-border); background: white; flex-wrap: wrap; gap:10px;}
        .jc-availability { display: flex; align-items: center; gap: 7px; font-size: 12px; color: #64748b; font-weight: 500; }
        .jc-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--jc-green); box-shadow: 0 0 6px rgba(34,197,94,0.5); }
        .jc-cta-btn { background: var(--jc-accent); color: white; font-size: 13px; font-weight: 700; padding: 10px 15px; border-radius: 9px; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; border: none; cursor: pointer; flex: 1; justify-content: center;}
        `;
        document.head.appendChild(style);
    }

    // 2. Data Preparation
    const rawPhone = (product.seller_phone || "").replace(/\D/g, '');
    const intPhone = rawPhone.startsWith('0') ? '251' + rawPhone.substring(1) : rawPhone;
    const tgUser = (product.telegram_username || "").replace('@', '');

    const profile = product.profiles || {};
    const isVerified = profile.is_verified === true;
    const sellerName = profile.full_name || product.seller_name || "Community Member";
    const avatarUrl = profile.avatar_url || "https://via.placeholder.com/50";
    const modalContent = modal.querySelector('.modal-content');

    // 3. Conditional Layout Rendering
    if (product.category === 'Jobs' || product.category === 'Services') {
        const isJob = product.category === 'Jobs';
        
        // Parse specs from description
        const specs = {};
        const descParts = (product.description || '').split('--- Specs ---');
        const cleanDesc = descParts[0].trim();
        if (descParts[1]) {
            descParts[1].split('\n').forEach(line => {
                const m = line.match(/^[-\s]*([^:]+):\s*(.+)$/);
                if (m) specs[m[1].trim().toLowerCase()] = m[2].trim();
            });
        }

        const type = specs['job type'] || specs['service category'] || (isJob ? 'Full-Time' : 'Service');
        const exp = specs['experience required'] || specs['experience'] || '-';
        const h3Label = isJob ? 'Gender' : 'Response';
        const h3Val = isJob ? (specs['gender'] || 'Both') : (specs['response time'] || 'Fast');

        const company = specs['company'] || specs['provider name'] || sellerName;

        let priceOld = 'Fixed Rate';
        let priceNew = product.price ? product.price.toLocaleString() : 'Open';
        if (specs['salary min'] && specs['salary max']) {
            priceOld = specs['salary min'];
            priceNew = specs['salary max'];
        } else if (!product.price) {
            priceOld = ''; priceNew = 'Negotiable';
        }

        // Wipe standard padding to fit custom card seamlessly
        modalContent.style.padding = '0';
        modalContent.style.background = 'transparent';
        
        modalContent.innerHTML = `
            <button class="close-modal-btn" onclick="window.closeProductModal()" style="z-index: 50; position:absolute; top:15px; right:15px; background:rgba(255,255,255,0.2); color:white; border-radius:50%; width:30px; height:30px; display:flex; align-items:center; justify-content:center; border:none; cursor:pointer;">&times;</button>
            <div class="jc-card">
                <div class="jc-watermark"><span class="jc-watermark-text amharic">ዋና ገበያ</span></div>
                <div class="jc-photo-wrap ${product.image ? 'has-photo' : ''}">
                    ${product.image ? `<img src="${product.image}" class="jc-card-photo">` : `<span class="jc-no-photo-msg">No Image Attached</span>`}
                </div>
                <div class="jc-card-header">
                    <div class="jc-header-top">
                        <div class="jc-badges"><span class="jc-badge-stock">${isJob ? 'OPEN VACANCY' : 'AVAILABLE NOW'}</span></div>
                        <div class="jc-price-block">
                            <div class="jc-price-old">${priceOld}</div>
                            <div class="jc-price-new">${priceNew}</div>
                            <div class="jc-price-currency">${isJob ? 'Monthly (ETB)' : 'ETB'}</div>
                        </div>
                    </div>
                    <div class="jc-product-name">${product.name}</div>
                    <div class="jc-product-sub">${company}</div>
                </div>

                <div class="jc-highlight-bar">
                    <div class="jc-highlight-item"><div class="jc-highlight-value">${type}</div><div class="jc-highlight-label">${isJob ? 'Type' : 'Category'}</div></div>
                    <div class="jc-highlight-item"><div class="jc-highlight-value">${exp}</div><div class="jc-highlight-label">Experience</div></div>
                    <div class="jc-highlight-item"><div class="jc-highlight-value" style="font-size:11px; display:flex; align-items:center; height:100%;">${h3Val}</div><div class="jc-highlight-label">${h3Label}</div></div>
                </div>

                <div class="jc-specs-grid">
                    <div class="jc-spec-cell">
                        <div class="jc-spec-icon-wrap"><i class="fas fa-graduation-cap"></i></div>
                        <div class="jc-spec-label">${isJob ? 'Education' : 'Service Area'}</div>
                        <div class="jc-spec-value">${specs['education level'] || specs['service area'] || '-'}</div>
                    </div>
                    <div class="jc-spec-cell">
                        <div class="jc-spec-icon-wrap"><i class="fas fa-calendar-alt"></i></div>
                        <div class="jc-spec-label">${isJob ? 'Deadline' : 'Availability'}</div>
                        <div class="jc-spec-value">${specs['deadline'] || specs['availability'] || 'Open'}</div>
                    </div>
                    <div class="jc-spec-cell">
                        <div class="jc-spec-icon-wrap"><i class="fas fa-tools"></i></div>
                        <div class="jc-spec-label">${isJob ? 'Required Skills' : 'Highlights'}</div>
                        <div class="jc-spec-value" style="font-size:11px;">${specs['key skills'] || specs['service highlights'] || '-'}</div>
                    </div>
                    <div class="jc-spec-cell">
                        <div class="jc-spec-icon-wrap"><i class="fas fa-users"></i></div>
                        <div class="jc-spec-label">${isJob ? 'Vacancy Qty' : 'Payment'}</div>
                        <div class="jc-spec-value">${specs['positions available'] || specs['payment methods'] || '-'}</div>
                    </div>
                </div>

                ${cleanDesc ? `<div class="jc-desc-area">${cleanDesc.replace(/\n/g, '<br>')}</div>` : ''}

                <div class="jc-card-footer">
                    <div class="jc-availability"><span class="jc-dot"></span> ${isJob ? 'Hiring Now' : 'Active'}</div>
                    <div style="display:flex; gap:8px;">
                        <a href="https://t.me/${tgUser || '+'+intPhone}" target="_blank" class="jc-cta-btn" style="background:#0088cc;"><i class="fab fa-telegram-plane"></i></a>
                        <a href="https://wa.me/${intPhone}?text=${encodeURIComponent("I'm inquiring about: " + product.name)}" target="_blank" class="jc-cta-btn" style="background:#25d366;"><i class="fab fa-whatsapp"></i></a>
                        <a href="tel:+${intPhone}" class="jc-cta-btn"><i class="fas fa-phone"></i> ${isJob ? 'Apply' : 'Call'}</a>
                    </div>
                </div>
                <div style="background: #1a1612; padding: 9px 22px; display: flex; align-items: center; justify-content: center; border-top: 1px solid #2a2420; border-radius: 0 0 18px 18px;">
                    <span style="font-size: 11px; color: #555570; letter-spacing: 0.06em;">wanagebya.com</span>
                </div>
            </div>`;

    } else {
        // Restore standard modal layout & styles
        modalContent.style.padding = ''; 
        modalContent.style.background = '#fff';

        modalContent.innerHTML = `
            <button class="close-modal-btn" onclick="window.closeProductModal()">&times;</button>
            <div class="modal-img-wrapper">
                <img src="${product.image || ''}" alt="Product" style="border-radius: 10px; width: 100%;">
            </div>
            <div class="modal-body" style="padding: 20px 0 0;">
                <h2 style="font-size: 1.2rem; margin-bottom: 5px;">${product.name}</h2>
                
                <div class="seller-details-wrapper" style="margin: 15px 0; padding: 10px; background: #f9f9f9; border-radius: 12px; display: flex; align-items: center; gap: 10px; border: 1px solid #eee;">
                    <img src="${avatarUrl}" alt="Seller avatar" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover; border: 2px solid #6c5ce7;">
                    <div style="flex: 1;">
                        <h4 style="margin: 0; color: #333; font-size: 0.95rem; font-weight: 600;">Seller: ${sellerName}</h4>
                        <div style="margin-top:5px; font-size:0.8rem;">
                            ${isVerified 
                                ? `<span style="color:#2ed573; font-weight:bold;"><i class="fas fa-check-circle"></i> Verified Seller</span>` 
                                : `<span style="color:#888;"><i class="fas fa-shield-alt"></i> Community Seller</span>`}
                        </div>
                    </div>
                </div>

                <div class="modal-price" style="font-size: 1.3rem; color: #2ed573; font-weight:bold; margin-bottom:15px;">
                    ${product.price ? product.price.toLocaleString() : 'Negotiable'} ETB
                </div>
                
                <p class="modal-description" style="font-size: 0.9rem; line-height: 1.5; color:#555;">
                    ${product.description || "No description available."}
                </p>

                <div class="modal-flex-actions" style="display:flex; gap:10px; margin-top:20px; flex-wrap:wrap;">
                    <a href="tel:+${intPhone}" class="contact-btn" style="flex:1; text-align:center; padding:10px; background:#333; color:white; border-radius:8px; text-decoration:none;"><i class="fas fa-phone"></i> Call</a>
                    <a href="https://t.me/${tgUser || '+'+intPhone}" target="_blank" class="contact-btn" style="flex:1; text-align:center; padding:10px; background:#0088cc; color:white; border-radius:8px; text-decoration:none;"><i class="fab fa-telegram-plane"></i> Message</a>
                    <a href="https://wa.me/${intPhone}?text=${encodeURIComponent("I'm interested in " + product.name + " on WanaGebya")}" target="_blank" class="contact-btn" style="flex:1; text-align:center; padding:10px; background:#25d366; color:white; border-radius:8px; text-decoration:none;"><i class="fab fa-whatsapp"></i> WhatsApp</a>
                    <button onclick="window.addToCartFromModal()" class="contact-btn save-btn" style="width: 100%; text-align:center; padding:10px; background:#6c5ce7; color:white; border-radius:8px; border:none; cursor:pointer; font-weight:bold; margin-top:5px;"><i class="fas fa-heart"></i> Save to Wishlist</button>
                </div>
            </div>`;
    }

    modal.style.display = 'flex';
    document.body.style.overflow = "hidden";
};

window.closeProductModal = () => {
    const modal = document.getElementById('productModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = "auto";
};
// --- 7. AUTHENTICATION SYSTEM ---
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
        toggleLink.innerHTML = 'Already have an account? <a href="#" id="toggleAuthModeLink">Sign In</a>';
    } else {
        title.innerText = "Welcome Back";
        submitBtn.innerText = "Sign In";
        regFields.style.display = "none";
        toggleLink.innerHTML = 'Don\'t have an account? <a href="#" id="toggleAuthModeLink">Sign Up</a>';
    }
    document.getElementById('toggleAuthModeLink')?.addEventListener('click', function(e) {
        e.preventDefault(); window.toggleAuthMode();
    });
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
        const location = document.getElementById('regLocation').value;
        const bio = document.getElementById('regBio').value;

        const { error } = await _supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName, phone_number: phone, location, bio } }
        });
        if (error) alert("Error: " + error.message);
        else { alert("Success! Check your email to verify your account."); window.toggleModal(); }
    } else {
        const { error } = await _supabase.auth.signInWithPassword({ email, password });
        if (error) alert("Login failed: " + error.message);
        else { window.toggleModal(); await window.updateUIForUser(); }
    }
    btn.disabled = false;
};

window.updateUIForUser = async function() {
    const { data: { user } } = await _supabase.auth.getUser();
    const signInBtn = document.getElementById('signInBtn');
    const userWelcome = document.getElementById('userWelcome');
    const userNameElem = document.getElementById('userName');
    const signOutBtn = document.getElementById('signOutBtn');
    const adminLink = document.getElementById('adminNavLink');

    if (user) {
        if (signInBtn) signInBtn.style.display = 'none';
        if (userWelcome) userWelcome.style.display = 'flex';
        if (signOutBtn) signOutBtn.style.display = 'block';

        const { data: profile } = await _supabase
            .from('profiles')
            .select('full_name, is_admin')
            .eq('id', user.id)
            .maybeSingle();

        if (userNameElem) userNameElem.innerText = profile?.full_name ? profile.full_name.split(' ')[0] : "Member";
        if (adminLink && profile?.is_admin) adminLink.style.display = 'flex';
    } else {
        if (signInBtn) signInBtn.style.display = 'block';
        if (userWelcome) userWelcome.style.display = 'none';
        if (signOutBtn) signOutBtn.style.display = 'none';
        if (adminLink) adminLink.style.display = 'none';
    }
};

window.checkAuthToSell = async function(event) {
    if(event) event.preventDefault();
    const { data: { user } } = await _supabase.auth.getUser();
    if (user) { window.location.href = "sell.html"; }
    else { window.toggleModal(); }
};

window.handleSignOut = async function() {
    await _supabase.auth.signOut();
    window.location.href = 'index.html';
};

window.toggleModal = () => {
    const modal = document.getElementById('authModal');
    if (modal) {
        const isFlex = modal.style.display === 'flex';
        modal.style.display = isFlex ? 'none' : 'flex';
        document.body.style.overflow = isFlex ? 'auto' : 'hidden';
    }
};

// --- 8. ADMIN & USER MGMT ---
window.loadUsers = async function() {
    const list = document.getElementById('userList');
    if (!list) return;
    list.innerHTML = "<div class='loading-spinner'><i class='fas fa-sync fa-spin'></i> Syncing...</div>";

    const { data: users, error } = await _supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

    if (error || !users) {
        list.innerHTML = `<p style="color:#ff4757; padding:20px;">Error: ${error?.message || 'Unauthorized'}</p>`;
        return;
    }

    list.innerHTML = `
        <div style="overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse;">
                <thead>
                    <tr style="text-align:left; border-bottom:2px solid #f4f7f6; color:#888;">
                        <th style="padding:15px;">USER INFO</th>
                        <th style="padding:15px;">LOCATION</th>
                        <th style="padding:15px;">JOINED</th>
                        <th style="padding:15px;">ROLE</th>
                        <th style="padding:15px;">STATUS</th>
                        <th style="padding:15px; text-align:right;">ACTIONS</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(u => `
                        <tr style="border-bottom:1px solid #f4f7f6;">
                            <td style="padding:10px 15px;"><strong>${u.full_name || 'Member'}</strong><br><small style="color:#888;">${u.email || 'N/A'}</small></td>
                            <td style="padding:10px 15px; font-size:0.85rem;">${u.location || 'Addis Ababa'}</td>
                            <td style="padding:10px 15px; font-size:0.85rem;">${u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}</td>
                            <td style="padding:10px 15px;">${u.is_admin ? 'Admin 🛡️' : 'User 👤'}</td>
                            <td style="padding:10px 15px;">${u.is_verified ? '<span style="color:#2ed573; font-weight:bold;">VERIFIED</span>' : '<span style="color:#888;">GUEST</span>'}</td>
                            <td style="padding:10px 15px; text-align:right;">
                                <button onclick="window.toggleVerification('${u.id}', ${u.is_verified})" style="padding:5px 10px; background:#6c5ce7; color:white; border:none; border-radius:4px; cursor:pointer;">Toggle Verify</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`;
};

window.deleteUser = async function(userId, identifier) {
    if (!confirm(`⚠️ DANGER: Are you sure you want to permanently delete ${identifier}?`)) return;
    try {
        const { error } = await _supabase.from('profiles').delete().eq('id', userId);
        if (error) throw error;
        alert("User deleted successfully.");
        await window.loadUsers();
    } catch (err) {
        alert("Failed to delete user: " + err.message);
    }
};

window.toggleVerification = async (userId, currentStatus) => {
    if (!confirm(`Are you sure you want to ${currentStatus ? 'unverify' : 'verify'} this seller?`)) return;
    const { error } = await _supabase.from('profiles').update({ is_verified: !currentStatus }).eq('id', userId);
    if (error) { alert("Verification update failed: " + error.message); return; }
    alert(`Seller successfully ${currentStatus ? 'unverified' : 'verified'}!`);
    window.loadUsers();
};

// --- 9. PROFILE MANAGEMENT ---
window.loadUserProfile = async function() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await _supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (profile) {
        const nameElem = document.getElementById('profileName');
        const emailElem = document.getElementById('profileEmail');
        const avatarElem = document.getElementById('profileAvatar');
        const badgeElem = document.getElementById('verificationBadge');
        if (nameElem) nameElem.innerText = profile.full_name || "Member";
        if (emailElem) emailElem.innerText = user.email;
        if (avatarElem) avatarElem.src = profile.avatar_url || '';
        if (badgeElem) {
            badgeElem.innerText = profile.is_verified ? "Verified Seller" : "Community Seller";
            badgeElem.style.background = profile.is_verified ? "#2ed573" : "#888";
        }
    }
};

window.updateProfileInfo = async function(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const fileInput = document.getElementById('editAvatar');
    const file = fileInput ? fileInput.files[0] : null;
    btn.disabled = true; btn.innerText = "Processing...";
    const { data: { user } } = await _supabase.auth.getUser();
    let avatarUrl = null;
    if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/avatar_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await _supabase.storage.from('avatars').upload(fileName, file);
        if (!uploadError) {
            const { data } = _supabase.storage.from('avatars').getPublicUrl(fileName);
            avatarUrl = data.publicUrl;
        }
    }
    const updates = {
        full_name: document.getElementById('editFullName').value,
        phone: document.getElementById('editPhone').value,
    };
    if (avatarUrl) updates.avatar_url = avatarUrl;
    const { error } = await _supabase.from('profiles').update(updates).eq('id', user.id);
    if (!error) { alert("Profile Updated!"); location.reload(); }
    else { alert("Error: " + error.message); }
    btn.disabled = false;
};

// --- 10. SUPPORT & MISC LOGIC ---
window.toggleSupportModal = function() {
    const modal = document.getElementById('supportModal');
    if (!modal) return;
    const isHidden = modal.style.display === 'none' || modal.style.display === '';
    modal.style.display = isHidden ? 'flex' : 'none';
};

window.handleSupportSubmit = async function(event) {
    event.preventDefault();
    const email = document.getElementById('supportEmail').value;
    const subject = document.getElementById('supportSubject').value;
    const message = document.getElementById('supportMessage').value;
    const submitBtn = event.target.querySelector('button');
    const originalText = submitBtn.innerText;
    submitBtn.innerText = "Sending..."; submitBtn.disabled = true;
    try {
        const { error } = await _supabase.from('support_tickets').insert([{ user_email: email, subject, message, is_resolved: false }]);
        if (error) throw error;
        alert("Thank you! Your message has been sent to WanaGebya Support.");
        event.target.reset();
        window.toggleSupportModal();
    } catch (err) {
        alert("Failed to send message: " + err.message);
    } finally {
        submitBtn.innerText = originalText; submitBtn.disabled = false;
    }
};

window.shareToWhatsApp = function() {
    const text = encodeURIComponent("Check out WanaGebya - The best place to buy & sell in Ethiopia! " + window.location.href);
    window.open(`https://wa.me/?text=${text}`, '_blank');
};

window.shareToFacebook = function() {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
};

window.shareToTelegram = function() {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent("Check out this awesome find on WanaGebya!");
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
};

let isAmharic = false;
window.toggleLanguage = function() {
    isAmharic = !isAmharic;
    document.getElementById('langText').innerText = isAmharic ? "English" : "አማርኛ";
    document.querySelectorAll('[data-am]').forEach(el => {
        const currentText = el.innerText;
        el.innerText = el.getAttribute('data-am');
        el.setAttribute('data-am', currentText);
    });
};

async function postToSocialMedia(product) {
    // Uses the values from your config.js
    const botToken = GolemConfig.botToken;
    const chatId = GolemConfig.chatId;
    const baseUrl = "https://wanagebya.com";
    
    let message = product.category === 'Jobs' 
        ? `💼 *NEW JOB OPENING*\n\n📌 *Role:* ${product.name}\n💰 *Salary:* ${product.price} ETB\n\n🔗 Apply: ${baseUrl}/product.html?id=${product.id}`
        : `🌟 *New Item!*\n📦 *Product:* ${product.name}\n💰 *Price:* ${product.price} ETB\n\n🔗 View: ${baseUrl}/product.html?id=${product.id}`;

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' })
    }).catch(err => console.error("Telegram notification failed", err));
}

window.showProductModal = (item) => {
    const modal = document.getElementById('productModal');
    
    // Set Title & Image
    document.getElementById('modalProductTitle').innerText = item.name;
    document.getElementById('modalProductImg').src = item.image || 'https://cdn-icons-png.flaticon.com/512/9422/9422566.png';
    
    // Format Description (Cleaning out the --- Specs --- block for the modal)
    const displayDesc = item.description.split('--- Specs ---')[0];
    document.getElementById('modalProductDesc').innerText = displayDesc;

    // Contact Links
    const cleanPhone = item.seller_phone.replace(/\s/g, '');
    document.getElementById('callContact').href = `tel:${cleanPhone}`;
    document.getElementById('telegramOrder').href = `https://t.me/${cleanPhone.replace('+', '')}`;
    document.getElementById('whatsappOrder').href = `https://wa.me/${cleanPhone.replace('+', '')}`;

    // Price/Salary Label
    const priceEl = document.getElementById('modalProductPrice');
    if (item.category === 'Jobs') {
        priceEl.innerText = item.price > 0 ? `${item.price.toLocaleString()} ETB / Month` : "Salary Negotiable";
    } else {
        priceEl.innerText = item.price > 0 ? `${item.price.toLocaleString()} ETB` : "Price on Request";
    }

    modal.style.display = 'flex';
};


