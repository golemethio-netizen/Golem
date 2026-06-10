// --- 1. INITIALIZATION & GLOBAL STATE ---
let currentProduct = null;
window.currentCategory    = 'All';
window.currentSubcategory = null;

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
window.fetchProducts = async (category) => {
    // Guard: if called with no/undefined arg (e.g. from sort/location change), use currentCategory
    if (!category || category === 'undefined') category = window.currentCategory || 'All';

    // If a subcategory is active, delegate to subcategory fetcher
    if (window.currentSubcategory && category !== 'All') {
        return window.fetchProductsBySubcat(category, window.currentSubcategory);
    }
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
        alert("🛒 Added to your Cart!");
    } else {
        alert("This item is already in your Cart!");
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
        // FIX: Replaced single quotes with URL encoding to prevent HTML breaking
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
        // JOB CARD — uses .job-card CSS classes from index.html
        // ═══════════════════════════════════════════════════════
        if (p.category === 'Jobs') {
            // Parse structured spec block from description
            const desc = p.description || '';
            const specs = {};
            const block = desc.split('--- Job Details ---')[1] || desc.split('--- Specs ---')[1] || '';
            block.split('\n').forEach(l => { const m = l.match(/^[-\s]*([^:]+):\s*(.+)$/); if (m) specs[m[1].trim().toLowerCase()] = m[2].trim(); });
            const mainDesc = desc.split('\n\n--- Job Details ---')[0].split('\n\n--- Specs ---')[0];

            const jobType = specs['job type'] || '';
            const industry = specs['industry'] || '';
            const exp = specs['experience required'] || '';
            const edu = specs['education level'] || '';
            const deadline = specs['application deadline'] || specs['deadline'] || '';
            const salary = specs['salary'] || (p.price ? p.price.toLocaleString() + ' ETB' : 'Negotiable');

            return `
            <div class="job-card" onclick="window.openProductDetailsSafe('${safeData}')">
                <button class="job-wishlist-btn ${isSaved ? 'active' : ''}"
                    onclick="event.stopPropagation(); window.toggleWishlist('${p.id}', this)">
                    <i class="${isSaved ? 'fas' : 'far'} fa-shopping-cart"></i>
                </button>

                <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:4px;">
                    ${jobType  ? `<span class="job-type-badge"><i class="fas fa-briefcase" style="font-size:9px;"></i>${jobType}</span>` : ''}
                    ${industry ? `<span class="job-tag blue">${industry}</span>` : ''}
                    <span style="margin-left:auto; font-size:11px; color:${isVerified ? '#2ed573' : '#aaa'}; display:flex; align-items:center; gap:3px;">
                        <i class="fas fa-check-circle"></i>${isVerified ? 'Verified' : 'Community'}
                    </span>
                </div>

                <div class="job-title">${p.name}</div>
                <div class="job-company">
                    <i class="fas fa-map-marker-alt" style="color:#ff4757; font-size:11px;"></i>
                    ${p.location || 'Addis Ababa'}
                </div>

                <p class="job-snippet">${mainDesc || desc.substring(0, 120)}</p>

                <div class="job-tags">
                    ${exp      ? `<span class="job-tag green"><i class="fas fa-clock" style="font-size:9px;"></i>${exp}</span>` : ''}
                    ${edu      ? `<span class="job-tag purple"><i class="fas fa-graduation-cap" style="font-size:9px;"></i>${edu}</span>` : ''}
                    ${deadline ? `<span class="job-tag red"><i class="fas fa-calendar-times" style="font-size:9px;"></i>Deadline: ${deadline}</span>` : ''}
                </div>

                <div class="job-meta-row">
                    <div>
                        <div style="font-size:10px; color:#aaa; text-transform:uppercase; letter-spacing:.08em; margin-bottom:2px;">Salary</div>
                        <div class="job-salary">${salary}</div>
                    </div>
                </div>

                <div class="job-actions">
                    <a href="tel:+${cleanPhone}" class="job-btn job-btn-primary" onclick="event.stopPropagation()">
                        <i class="fas fa-phone"></i> Call / Apply
                    </a>
                    <a href="https://t.me/${tgUser || '+' + cleanPhone}" target="_blank" class="job-btn job-btn-tg" onclick="event.stopPropagation()">
                        <i class="fab fa-telegram-plane"></i>
                    </a>
                    <a href="https://wa.me/${cleanPhone}" target="_blank" class="job-btn job-btn-wa" onclick="event.stopPropagation()">
                        <i class="fab fa-whatsapp"></i>
                    </a>
                </div>
            </div>`;
        }

        // ═══════════════════════════════════════════════════════
        // SERVICE CARD — uses .service-card CSS classes from index.html
        // ═══════════════════════════════════════════════════════
        if (p.category === 'Services') {
            const desc = p.description || '';
            const specs = {};
            const block = desc.split('--- Service Details ---')[1] || desc.split('--- Specs ---')[1] || '';
            block.split('\n').forEach(l => { const m = l.match(/^[-\s]*([^:]+):\s*(.+)$/); if (m) specs[m[1].trim().toLowerCase()] = m[2].trim(); });
            const mainDesc = desc.split('\n\n--- Service Details ---')[0].split('\n\n--- Specs ---')[0];

            const svcType = specs['service type'] || specs['service category'] || 'Service';
            const exp      = specs['experience'] || '';
            const avail    = specs['availability'] || '';
            const response = specs['response time'] || '';
            const pricing  = specs['pricing model'] || '';
            const area     = specs['service area'] || '';
            const priceStr = p.price && p.price > 0 ? p.price.toLocaleString() + ' ETB' : 'Negotiable';

            return `
            <div class="service-card" onclick="window.openProductDetailsSafe('${safeData}')">
                <div class="service-banner">
                    ${p.image
                        ? `<img src="${p.image}" alt="${p.name}" loading="lazy">`
                        : `<span class="service-banner-fallback">🛠</span>`}
                    <span class="service-type-badge">
                        <i class="fas fa-tools" style="font-size:9px;"></i>${svcType}
                    </span>
                    ${exp ? `<span class="service-rating"><i class="fas fa-star"></i>${exp}</span>` : ''}
                    <button class="service-wishlist-btn ${isSaved ? 'active' : ''}"
                        onclick="event.stopPropagation(); window.toggleWishlist('${p.id}', this)">
                        <i class="${isSaved ? 'fas' : 'far'} fa-shopping-cart"></i>
                    </button>
                </div>

                <div class="service-body">
                    <div class="service-name">${p.name}</div>
                    <div class="service-provider">
                        <i class="fas fa-map-marker-alt" style="color:#ff4757; font-size:11px;"></i>
                        ${p.location || 'Addis Ababa'}
                        <span style="margin-left:auto; font-size:11px; color:${isVerified ? '#2ed573' : '#aaa'};">
                            <i class="fas fa-check-circle"></i> ${isVerified ? 'Verified' : 'Community'}
                        </span>
                    </div>
                    <div class="service-highlights">
                        ${response ? `<span class="svc-tag pink"><i class="fas fa-bolt" style="font-size:9px;"></i>${response}</span>` : ''}
                        ${avail    ? `<span class="svc-tag amber"><i class="fas fa-calendar" style="font-size:9px;"></i>${avail}</span>` : ''}
                        ${area     ? `<span class="svc-tag teal"><i class="fas fa-map-pin" style="font-size:9px;"></i>${area}</span>` : ''}
                        ${pricing  ? `<span class="svc-tag purple">${pricing}</span>` : ''}
                    </div>
                    ${mainDesc ? `<p class="service-snippet">${mainDesc}</p>` : ''}
                </div>

                <div class="service-footer">
                    <div>
                        <div class="service-price">${priceStr}</div>
                        <div class="service-price-label">${pricing || 'Per Project'}</div>
                    </div>
                    <div class="service-actions">
                        <a href="tel:+${cleanPhone}" class="svc-btn svc-btn-primary" onclick="event.stopPropagation()">
                            <i class="fas fa-phone"></i> Call
                        </a>
                        <a href="https://wa.me/${cleanPhone}" target="_blank" class="svc-btn svc-btn-outline" onclick="event.stopPropagation()">
                            <i class="fab fa-whatsapp"></i>
                        </a>
                    </div>
                </div>
            </div>`;
        }
        // ═══════════════════════════════════════════════════════
        // END SPECIAL CARDS
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
                    <i class="${isSaved ? 'fas' : 'far'} fa-shopping-cart"></i>
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
    <i class="fab fa-telegram-plane" style="font-size:13px;"></i>
    TG
</a>
                    <a href="https://wa.me/${cleanPhone}?text=${encodeURIComponent('Interested in ' + p.name + ' on WanaGebya')}" target="_blank"
                        style="flex:1; display:flex; align-items:center; justify-content:center; gap:5px; padding:10px 6px; border-radius:10px; background:#25d366; color:#fff; text-decoration:none; font-size:12px; font-weight:600;">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                        WA
                    </a>
                    <<button onclick="window.open('https://t.me/share/url?url=' + encodeURIComponent('${shareUrl}') + '&text=' + encodeURIComponent('${shareText}'), '_blank')"
    style="flex:1; display:flex; align-items:center; justify-content:center; gap:5px; padding:10px 6px; border-radius:10px; background:#ffffff; color:#111; border:1.5px solid #ddd; cursor:pointer; font-size:12px; font-weight:600; font-family:inherit;">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>
                        Share
                    </button>
                </div>

                <div class="product-actions" style="margin-top:15px;">
                    <button class="buy-btn" onclick="window.openProductDetailsSafe('${safeData}')" style="width:100%; padding:10px; border-radius:8px; cursor:pointer; background:#F5A623; color:#1a1a1a; border:none; font-weight:700;">
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
    window.currentCategory    = category;
    window.currentSubcategory = null; // reset subcategory when switching category
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    window.fetchProducts(category);
};

// Filter by both category AND subcategory
window.fetchProductsBySubcat = async (category, subcategory) => {
    const grid = document.getElementById('productGrid');
    if (grid) grid.innerHTML = '<div class="loading-spinner"><i class="fas fa-circle-notch fa-spin"></i> Loading...</div>';

    window.currentSubcategory = subcategory;

    const sortOrder     = document.getElementById('sortSelect')?.value     || 'newest';
    const locationFilter = document.getElementById('locationSelect')?.value || 'all';

    let query = _supabase
        .from('products')
        .select(`*, profiles:user_id (is_verified, full_name, avatar_url)`)
        .eq('status', 'approved')
        .eq('category', category)
        .eq('subcategory', subcategory);

    if (locationFilter !== 'all') query = query.ilike('location', `%${locationFilter}%`);

    if (sortOrder === 'price_low')       query = query.order('price', { ascending: true });
    else if (sortOrder === 'price_high') query = query.order('price', { ascending: false });
    else                                 query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (!error) renderProducts(data);
    else console.error('Subcategory fetch error:', error.message);
};

function filterSearch(term) {
    // If search is cleared, re-fetch so sort+location filters are re-applied properly
    if (!term || term.trim() === '') {
        window.fetchProducts();
        return;
    }
    document.querySelectorAll('#productGrid > div').forEach(card => {
        const text = card.innerText.toLowerCase();
        card.style.display = text.includes(term) ? '' : 'none';
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

// ── STOCK STATUS BADGE HELPER ──
function getStockBadge(stockStatus, quantity) {
    if (!stockStatus || stockStatus === 'in_stock') {
        const qty = quantity ? ' &nbsp;·&nbsp; <strong>' + quantity + ' left</strong>' : '';
        return '<div style="display:inline-flex;align-items:center;gap:6px;background:#e8fdf5;border:1.5px solid #2ed573;border-radius:20px;padding:5px 14px;font-size:0.78rem;font-weight:700;color:#F5A623;margin-bottom:10px;">'
             + '<i class="fas fa-check-circle"></i> In Stock' + qty + '</div>';
    } else if (stockStatus === 'out_of_stock') {
        return '<div style="display:inline-flex;align-items:center;gap:6px;background:#fff0f0;border:1.5px solid #ff4757;border-radius:20px;padding:5px 14px;font-size:0.78rem;font-weight:700;color:#ff4757;margin-bottom:10px;">'
             + '<i class="fas fa-times-circle"></i> Out of Stock &nbsp;·&nbsp; <span style="font-weight:400;font-size:0.75rem;">Contact seller for availability</span></div>';
    } else if (stockStatus === 'limited') {
        const qty = quantity ? ' &nbsp;·&nbsp; <strong>Only ' + quantity + ' left!</strong>' : '';
        return '<div style="display:inline-flex;align-items:center;gap:6px;background:#fff8e1;border:1.5px solid #F5A623;border-radius:20px;padding:5px 14px;font-size:0.78rem;font-weight:700;color:#F5A623;margin-bottom:10px;">'
             + '<i class="fas fa-exclamation-triangle"></i> Limited Stock' + qty + '</div>';
    }
    return '';
}

// ── SPEC CARD HELPERS ──
function specCell(icon, label, value) {
    return '<div style="padding:13px 16px;border-right:1px solid rgba(255,255,255,0.06);border-bottom:1px solid rgba(255,255,255,0.06);">'
         + '<div style="width:24px;height:24px;border-radius:6px;background:rgba(26,143,255,0.15);display:flex;align-items:center;justify-content:center;margin-bottom:6px;">'
         + '<i class="' + icon + '" style="font-size:0.7rem;color:#F5A623;"></i></div>'
         + '<div style="font-size:0.65rem;font-weight:700;letter-spacing:0.1em;color:#6b7280;text-transform:uppercase;margin-bottom:2px;">' + label + '</div>'
         + '<div style="font-size:0.9rem;font-weight:600;color:#e2e8f0;">' + (value || '—') + '</div>'
         + '</div>';
}
function miniBar(label, value) {
    return '<div style="flex:1;padding:10px 16px;border-right:1px solid rgba(255,255,255,0.06);">'
         + '<div style="font-size:0.62rem;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">' + label + '</div>'
         + '<div style="font-size:0.82rem;font-weight:600;color:#c8e6c9;margin-top:2px;">' + (value || '—') + '</div>'
         + '</div>';
}

window.openProductModal = async (product) => {
    currentProduct = product;
    const modal = document.getElementById('productModal');
    if (!modal) return;

    // 1. Inject CSS for the Custom Job/Service Card dynamically
    if (!document.getElementById('jc-custom-styles')) {
        const style = document.createElement('style');
        style.id = 'jc-custom-styles';
        style.innerHTML = `
        :root { --jc-accent: #e8321a; --jc-accent2: #f97316; --jc-accent-light: #fff4f2; --jc-dark-header: #1a1a1a; --jc-border: #e2e8f0; --jc-green: #2ed573; }
        .jc-card { width: 100%; background: #fff; border-radius: 18px; overflow: hidden; position: relative; text-align: left; font-family: 'Poppins', sans-serif;}
        .jc-watermark { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; z-index: 10; overflow: hidden; transform: rotate(-25deg); }
        .jc-watermark-text { font-weight: 800; white-space: nowrap; font-size: 62px; color: rgba(232, 50, 26, 0.05); }
        .jc-photo-wrap { background: #1a1a1a; border-bottom: 1px solid #1a1a1a; display: flex; align-items: center; justify-content: center; min-height: 56px; position: relative; }
        .jc-photo-wrap.has-photo { min-height: 200px; }
        .jc-card-photo { width: 100%; max-height: 250px; object-fit: cover; display: block; }
        .jc-no-photo-msg { font-size: 10px; color: #3a3530; padding: 16px; text-transform: uppercase; font-weight: 600; }
        .jc-card-header { background: var(--jc-dark-header); padding: 18px 22px 20px; position: relative; }
        .jc-header-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 10px; gap: 10px; }
        .jc-badge-stock { color: #4ade80; border: 1px solid rgba(74,222,128,0.4); background: rgba(74,222,128,0.08); font-size: 10.5px; font-weight: 700; padding: 4px 10px; border-radius: 6px; letter-spacing: 0.05em; }
        .jc-price-block { text-align: right; }
        .jc-price-old { font-size: 12px; color: #555; font-weight: 500; text-decoration: line-through; }
        .jc-price-new { font-size: 1.05rem; font-weight: 700; color: #e53935; line-height: 1; font-variant-numeric: tabular-nums; }
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
        .jc-availability { display: flex; align-items: center; gap: 7px; font-size: 12px; color: #6b7280; font-weight: 500; }
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
                        <div class="jc-badges">
                            <span class="jc-badge-stock">${isJob ? 'OPEN VACANCY' : 'AVAILABLE NOW'}</span>
                            ${!isJob && product.stock_status === 'out_of_stock' ? '<span style="background:#ff4757;color:white;font-size:0.65rem;font-weight:800;padding:3px 9px;border-radius:10px;margin-left:5px;letter-spacing:0.05em;">OUT OF STOCK</span>' : ''}
                            ${!isJob && product.stock_status === 'limited' ? '<span style="background:#F5A623;color:white;font-size:0.65rem;font-weight:800;padding:3px 9px;border-radius:10px;margin-left:5px;letter-spacing:0.05em;">LIMITED' + (product.quantity ? ': ' + product.quantity + ' LEFT' : '') + '</span>' : ''}
                        </div>
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
                <div style="background: #1a1a1a; padding: 9px 22px; display: flex; align-items: center; justify-content: center; border-top: 1px solid #1a1a1a; border-radius: 0 0 18px 18px;">
                    <span style="font-size: 11px; color: #555570; letter-spacing: 0.06em;">wanagebya.com</span>
                </div>
            </div>`;

    } else if (
        product.subcategory === 'Computers & Laptops' ||
        product.subcategory === 'Computer' ||
        product.subcategory === 'Laptop' ||
        product.subcategory === 'Laptops' ||
        product.subcategory === 'Desktop Computer' ||
        product.subcategory === 'Desktop Computers' ||
        product.subcategory === 'Tablet' ||
        product.subcategory === 'Tablets' ||
        product.subcategory === 'Mobile Phones' ||
        product.subcategory === 'Mobile Phone' ||
        product.subcategory === 'Phone' ||
        product.subcategory === 'Smartphone' ||
        (product.category === 'Electronics' && product.subcategory)
    ) {
        // ── ELECTRONICS / COMPUTER SPEC CARD ──
        modalContent.style.padding = '0';
        modalContent.style.background = 'transparent';

        const specs = {};
        const descLines = (product.description || '').split('\n');
        const introLines = [];
        descLines.forEach(line => {
            const m = line.match(/^[-\s]*([^:]+):\s*(.+)$/);
            if (m) specs[m[1].trim().toLowerCase()] = m[2].trim();
            else if (line.trim() && !line.trim().startsWith('-')) introLines.push(line.trim());
        });

        const PHONE_SUBS = ['Mobile Phones','Mobile Phone','Phone','Smartphone'];
        const isMobile = PHONE_SUBS.includes(product.subcategory);

        const brand    = specs['brand'] || '';
        const model    = specs['model'] || '';
        const cpu      = specs['processor'] || specs['cpu'] || '-';
        const ram      = specs['ram'] || specs['memory'] || '-';
        const storage  = specs['storage'] || '-';
        const display  = specs['display'] || specs['screen size'] || '-';
        const gpu      = specs['graphics'] || specs['gpu'] || '-';
        const battery  = specs['battery life'] || specs['battery'] || '-';
        const os       = specs['operating system'] || specs['os'] || '-';
        const warranty = specs['warranty'] || '-';
        const features = specs['features'] || '';
        const condition= specs['condition'] || product.status_condition || '-';
        const camera   = specs['camera'] || specs['main camera'] || '-';
        const network  = specs['network'] || specs['connectivity'] || '-';
        const simSlots = specs['sim slots'] || specs['sim'] || '-';
        const color    = specs['color'] || specs['colour'] || '';
        const subtitle = (brand ? brand + ' · ' : '') + (model ? model + ' · ' : '') + (product.subcategory || product.category);

        const stockColor = (!product.stock_status || product.stock_status === 'in_stock') ? '#2ed573'
            : product.stock_status === 'limited' ? '#F5A623' : '#ef4444';
        const stockLabel = (!product.stock_status || product.stock_status === 'in_stock') ? 'IN STOCK'
            : product.stock_status === 'limited' ? 'LIMITED STOCK' : 'OUT OF STOCK';

        modalContent.innerHTML =
            '<button onclick="window.closeProductModal()" style="position:absolute;top:14px;right:14px;z-index:99;background:rgba(255,255,255,0.15);border:none;color:white;width:34px;height:34px;border-radius:50%;font-size:1.3rem;cursor:pointer;display:flex;align-items:center;justify-content:center;">&times;</button>'
          + '<div style="background:#0f1623;border-radius:18px;overflow:hidden;font-family:Poppins,Arial,sans-serif;">'
          + '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;z-index:0;opacity:0.04;">'
          + '<div style="font-size:3.5rem;font-weight:900;color:white;">ዋና ገበያ</div>'
          + '<div style="font-size:1.2rem;color:white;">wanagebya.com</div>'
          + '</div>'
          + '<div style="position:relative;height:220px;background:#131e2e;overflow:hidden;">'
          + (product.image ? '<img src="' + product.image + '" style="width:100%;height:100%;object-fit:cover;display:block;opacity:0.92;">' : '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#334;font-size:2rem;">🖥️</div>')
          + '<div style="position:absolute;inset:0;background:linear-gradient(transparent 40%,rgba(15,22,35,0.85));"></div>'
          + '</div>'
          + '<div style="padding:18px 20px 14px;border-bottom:1px solid rgba(255,255,255,0.07);">'
          + '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px;">'
          + '<span style="display:inline-flex;align-items:center;gap:5px;background:' + stockColor + '22;border:1px solid ' + stockColor + ';border-radius:20px;padding:3px 10px;font-size:0.65rem;font-weight:800;color:' + stockColor + ';">'
          + '<span style="width:6px;height:6px;border-radius:50%;background:' + stockColor + ';"></span>' + stockLabel + '</span>'
          + '<div style="text-align:right;">'
          + (product.price ? '<div style="font-size:1.05rem;font-weight:700;color:#e53935;font-variant-numeric:tabular-nums;">' + product.price.toLocaleString() + ' <span style="font-size:0.9rem;color:#e53935;">ETB</span></div>' : '<div style="font-size:1.05rem;color:#e53935;font-weight:700;">Negotiable</div>')
          + '</div></div>'
          + '<div style="font-size:1.1rem;font-weight:700;color:white;margin-bottom:3px;">' + product.name + '</div>'
          + '<div style="font-size:0.8rem;color:#6b7280;">' + subtitle + '</div>'
          + '</div>'
          + '<div style="display:flex;align-items:center;gap:10px;padding:12px 20px;border-bottom:1px solid rgba(255,255,255,0.06);">'
          + '<img src="' + avatarUrl + '" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid #F5A623;flex-shrink:0;" onerror="this.src=&quot;https://ui-avatars.com/api/?name=Seller&background=1a8fff&color=fff&quot;">'
          + '<div><div style="font-size:0.82rem;font-weight:700;color:#e2e8f0;">' + sellerName + '</div>'
          + '<div style="font-size:0.72rem;color:#4a90d9;">📞 +' + intPhone + '</div></div>'
          + (isVerified ? '<span style="margin-left:auto;font-size:0.68rem;color:#2ed573;background:rgba(34,197,94,0.1);border:1px solid #2ed573;border-radius:20px;padding:2px 8px;font-weight:700;"><i class="fas fa-check-circle"></i> Verified</span>' : '')
          + '</div>'
          + (!isMobile ? '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;">'
          + specCell('fas fa-microchip', 'Processor', cpu)
          + specCell('fas fa-hdd', 'Storage', storage)
          + specCell('fas fa-memory', 'RAM', ram)
          + specCell('fas fa-desktop', 'Display', display)
          + specCell('fas fa-th-large', 'Graphics', gpu)
          + specCell('fas fa-shield-alt', 'Warranty', warranty)
          + '</div>' : '')
          + (isMobile ? '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;">'
          + specCell('fas fa-camera', 'Camera', camera)
          + specCell('fas fa-hdd', 'Storage', storage)
          + specCell('fas fa-memory', 'RAM', ram)
          + specCell('fas fa-mobile-alt', 'Display', display)
          + specCell('fas fa-battery-full', 'Battery', battery)
          + specCell('fas fa-shield-alt', 'Warranty', warranty)
          + '</div>' : '')
          + (isMobile && (network !== '-' || simSlots !== '-') ? '<div style="display:grid;grid-template-columns:1fr 1fr;">'
          + specCell('fas fa-wifi', 'Network', network)
          + specCell('fas fa-sim-card', 'SIM Slots', simSlots)
          + '</div>' : '')
          + (features ? '<div style="padding:12px 20px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;flex-wrap:wrap;gap:6px;">'
          + features.split(',').map(function(f){ return '<span style="background:rgba(26,143,255,0.12);border:1px solid rgba(26,143,255,0.3);color:#c8e6c9;border-radius:20px;padding:3px 10px;font-size:0.7rem;font-weight:600;">' + f.trim() + '</span>'; }).join('')
          + '</div>' : '')
          + '<div style="display:flex;border-bottom:1px solid rgba(255,255,255,0.06);">'
          + miniBar('OS', os)
          + (isMobile && color ? miniBar('Color', color) : miniBar('Condition', condition))
          + miniBar('Location', product.location || '-')
          + '</div>'
          + (isMobile ? '<div style="display:flex;border-bottom:1px solid rgba(255,255,255,0.06);">'
          + miniBar('Condition', condition)
          + miniBar('Warranty', warranty)
          + miniBar('OS', os)
          + '</div>' : '')
          + (introLines.length ? '<div style="padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.06);">'
          + '<div style="font-size:0.68rem;font-weight:700;color:#6b7280;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:6px;">Description</div>'
          + '<p style=\"font-size:0.82rem;color:#cbd5e1;line-height:1.6;margin:0;white-space:pre-wrap;\">' + introLines.join('\n') + '</p>'
          + '</div>' : '')
          + '<div style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.06);">'
          + '<button onclick="window.addToCartFromModal()" style="width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:13px;background:#F5A623;color:#1a1a1a;border:none;border-radius:12px;font-size:0.88rem;font-weight:800;cursor:pointer;font-family:Poppins,Arial,sans-serif;"><i class="fas fa-cart-plus"></i> Add to Cart</button>'
          + '</div>'
          + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;">'
          + '<a href="tel:+' + intPhone + '" style="display:flex;align-items:center;justify-content:center;gap:6px;padding:15px 10px;background:#1a1a1a;color:white;text-decoration:none;font-weight:700;font-size:0.82rem;border-right:1px solid rgba(255,255,255,0.07);"><i class="fas fa-phone"></i> Call</a>'
          + '<a href="https://wa.me/' + intPhone + '" target="_blank" style="display:flex;align-items:center;justify-content:center;gap:6px;padding:15px 10px;background:#075e54;color:white;text-decoration:none;font-weight:700;font-size:0.82rem;border-right:1px solid rgba(255,255,255,0.07);"><i class="fab fa-whatsapp"></i> WhatsApp</a>'
          + '<a href="https://t.me/' + (tgUser || '+' + intPhone) + '" target="_blank" style="display:flex;align-items:center;justify-content:center;gap:6px;padding:15px 10px;background:#0088cc;color:white;text-decoration:none;font-weight:700;font-size:0.82rem;"><i class="fab fa-telegram-plane"></i> Telegram</a>'
          + '</div>'
          + '<div style="text-align:center;padding:8px;background:#0a0f1a;">'
          + '<span style="font-size:0.65rem;color:#334155;letter-spacing:0.1em;">ዋና ገበያ · wanagebya.com</span>'
          + '</div>'
          + '</div>';

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
                    <img src="${avatarUrl}" alt="Seller avatar" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover; border: 2px solid #0A291A;">
                    <div style="flex: 1;">
                        <h4 style="margin: 0; color: #333; font-size: 0.95rem; font-weight: 600;">Seller: ${sellerName}</h4>
                        <div style="margin-top:5px; font-size:0.8rem;">
                            ${isVerified 
                                ? `<span style="color:#2ed573; font-weight:bold;"><i class="fas fa-check-circle"></i> Verified Seller</span>` 
                                : `<span style="color:#888;"><i class="fas fa-shield-alt"></i> Community Seller</span>`}
                        </div>
                    </div>
                </div>

                <div class="modal-price" style="font-size: 1.05rem; color: #e53935; font-weight:700; margin-bottom:10px; font-variant-numeric:tabular-nums;">
                    ${product.price ? product.price.toLocaleString() : 'Negotiable'} ETB
                </div>

                <div style="margin-bottom:4px;">${getStockBadge(product.stock_status, product.quantity)}</div>
                
                <p class="modal-description" style="font-size: 0.9rem; line-height: 1.5; color:#555; white-space: pre-wrap;">
                    ${product.description || "No description available."}
                </p>

                <div class="modal-flex-actions" style="display:flex; gap:10px; margin-top:20px; flex-wrap:wrap;">
                    <a href="tel:+${intPhone}" class="contact-btn" style="flex:1; text-align:center; padding:10px; background:#333; color:white; border-radius:8px; text-decoration:none;"><i class="fas fa-phone"></i> Call</a>
                    <a href="https://t.me/${tgUser || '+'+intPhone}" target="_blank" class="contact-btn" style="flex:1; text-align:center; padding:10px; background:#0088cc; color:white; border-radius:8px; text-decoration:none;"><i class="fab fa-telegram-plane"></i> Message</a>
                    <a href="https://wa.me/${intPhone}?text=${encodeURIComponent('I am interested in ' + product.name + " on WanaGebya")}" target="_blank" class="contact-btn" style="flex:1; text-align:center; padding:10px; background:#25d366; color:white; border-radius:8px; text-decoration:none;"><i class="fab fa-whatsapp"></i> WhatsApp</a>
                    <button onclick="window.addToCartFromModal()" class="contact-btn save-btn" style="width: 100%; text-align:center; padding:10px; background:#F5A623; color:#1a1a1a; border-radius:8px; border:none; cursor:pointer; font-weight:bold; margin-top:5px;"><i class="fas fa-shopping-cart"></i> Add to Cart</button>
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

// Show inline toast inside the auth modal
function authToast(msg, type) {
    const t = document.getElementById('authToast');
    if (!t) return;
    t.style.display = 'block';
    t.style.background = type === 'error' ? '#fee2e2' : '#dcfce7';
    t.style.color     = type === 'error' ? '#991b1b' : '#166534';
    t.textContent = msg;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.style.display = 'none'; }, 4000);
}

// Switch between Sign In / Create Account tabs
window.switchAuthTab = function(mode) {
    isSignUpMode = (mode === 'signup');
    const tabLogin  = document.getElementById('authTabLogin');
    const tabSignup = document.getElementById('authTabSignup');
    const regFields = document.getElementById('registerFields');
    const submitBtn = document.getElementById('authSubmitBtn');
    const emailLabel = document.querySelector('#authPanelLogin label');

    const activeStyle   = 'flex:1; padding:14px 10px; font-size:13px; font-weight:600; font-family:Poppins,sans-serif; border:none; background:transparent; color:#0A291A; border-bottom:2.5px solid #F5A623; cursor:pointer;';
    const inactiveStyle = 'flex:1; padding:14px 10px; font-size:13px; font-weight:600; font-family:Poppins,sans-serif; border:none; background:transparent; color:#9ca3af; border-bottom:2.5px solid transparent; cursor:pointer;';

    if (isSignUpMode) {
        if (tabLogin)  tabLogin.style.cssText  = inactiveStyle;
        if (tabSignup) tabSignup.style.cssText = activeStyle;
        if (regFields) regFields.style.display = 'block';
        if (submitBtn) submitBtn.textContent   = 'Create My Account';
    } else {
        if (tabLogin)  tabLogin.style.cssText  = activeStyle;
        if (tabSignup) tabSignup.style.cssText = inactiveStyle;
        if (regFields) regFields.style.display = 'none';
        if (submitBtn) submitBtn.textContent   = 'Sign In to WanaGebya';
    }
    const toast = document.getElementById('authToast');
    if (toast) toast.style.display = 'none';
};

// Keep old toggleAuthMode as alias for scripts that call it
window.toggleAuthMode = function() {
    window.switchAuthTab(isSignUpMode ? 'login' : 'signup');
};

window.handleAuth = async function(e) {
    e.preventDefault();
    const email    = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const btn      = document.getElementById('authSubmitBtn');

    if (!email || !password) { authToast('Please fill in all fields.', 'error'); return; }

    const origText = btn.textContent;
    btn.disabled   = true;
    btn.textContent = 'Please wait…';

    if (isSignUpMode) {
        const fullName = document.getElementById('regName')?.value || '';
        const phone    = document.getElementById('regPhone')?.value || '';
        const location = document.getElementById('regLocation')?.value || '';
        const bio      = document.getElementById('regBio')?.value || '';

        const { error } = await _supabase.auth.signUp({
            email, password,
            options: { data: { full_name: fullName, phone_number: phone, location, bio } }
        });
        if (error) { authToast(error.message, 'error'); }
        else {
            authToast('✓ Account created! Check your email to confirm.', 'success');
            setTimeout(() => window.toggleModal(), 2500);
        }
    } else {
        const { error } = await _supabase.auth.signInWithPassword({ email, password });
        if (error) { authToast(error.message, 'error'); }
        else { window.toggleModal(); await window.updateUIForUser(); }
    }

    btn.disabled    = false;
    btn.textContent = origText;
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
        if (!isFlex) {
            // Reset to Sign In tab every time modal opens
            window.switchAuthTab('login');
            const toast = document.getElementById('authToast');
            if (toast) toast.style.display = 'none';
        }
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
                    <tr style="text-align:left; border-bottom:2px solid #f7f8f6; color:#888;">
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
                        <tr style="border-bottom:1px solid #f7f8f6;">
                            <td style="padding:10px 15px;"><strong>${u.full_name || 'Member'}</strong><br><small style="color:#888;">${u.email || 'N/A'}</small></td>
                            <td style="padding:10px 15px; font-size:0.85rem;">${u.location || 'Addis Ababa'}</td>
                            <td style="padding:10px 15px; font-size:0.85rem;">${u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}</td>
                            <td style="padding:10px 15px;">${u.is_admin ? 'Admin 🛡️' : 'User 👤'}</td>
                            <td style="padding:10px 15px;">${u.is_verified ? '<span style="color:#2ed573; font-weight:bold;">VERIFIED</span>' : '<span style="color:#888;">GUEST</span>'}</td>
                            <td style="padding:10px 15px; text-align:right;">
                                <button onclick="window.toggleVerification('${u.id}', ${u.is_verified})" style="padding:5px 10px; background:#F5A623; color:#1a1a1a; border:none; border-radius:4px; cursor:pointer;">Toggle Verify</button>
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

// ── Full translation map (English ↔ Amharic) ──
const TRANSLATIONS = {
    en: {
        // Nav
        'Home': 'Home', 'Sell Item': 'Sell Item', 'My Items': 'My Items',
        'Cart': 'Cart', 'Admin': 'Admin', 'Sell': 'Sell', 'Items': 'Items',
        // Filters
        'All': 'All', 'Featured': 'Featured',
        // Sort
        '🆕 Newest First': '🆕 Newest First',
        '💰 Price: Low to High': '💰 Price: Low to High',
        '💎 Price: High to Low': '💎 Price: High to Low',
        '🌍 All Regions': '🌍 All Regions',
        // Buttons & labels
        'Contact Us': 'Contact Us', 'Call Now': 'Call Now',
        'Full Details': 'Full Details', 'Share': 'Share',
        'Add to Cart': 'Add to Cart', 'Save': 'Save',
        'Call': 'Call', 'Message': 'Message', 'WhatsApp': 'WhatsApp',
        'Send Message': 'Send Message', 'Sign In': 'Sign In',
        'Sign Out': 'Sign Out', 'Welcome Back': 'Welcome Back',
        'Featured Partner': 'Featured Partner',
        'View Details': 'View Details',
        'Back to Catalog': 'Back to Catalog',
        'Copy Link': 'Copy Link',
        '✓ Link copied to clipboard!': '✓ Link copied to clipboard!',
        'Share this item': 'Share this item',
        'Verified Merchant': 'Verified Merchant', 'Member': 'Member',
        'Loading...': 'Loading...',
        '👋 Hello! Welcome! Need help with buying or selling?': '👋 Hello! Welcome! Need help with buying or selling?',
        'Contact WanaGebya Support': 'Contact WanaGebya Support',
        'Join Telegram Channel': 'Join Telegram Channel',
        'Share on Telegram': 'Share on Telegram',
        'Share on WhatsApp': 'Share on WhatsApp',
        'Share on Facebook': 'Share on Facebook',
        'No description provided.': 'No description provided.',
        'Call Seller': 'Call Seller',
        'Message on Telegram': 'Message on Telegram',
        'Message on WhatsApp': 'Message on WhatsApp',
    },
    am: {
        // Nav
        'Home': 'መነሻ', 'Sell Item': 'ይሽጡ', 'My Items': 'እቃዎቼ',
        'Cart': 'ጋሪ', 'Admin': 'አስተዳዳሪ', 'Sell': 'ይሽጡ', 'Items': 'እቃዎቼ',
        // Filters
        'All': 'ሁሉም', 'Featured': 'ልዩ',
        // Sort
        '🆕 Newest First': '🆕 አዲስ መጀመሪያ',
        '💰 Price: Low to High': '💰 ዋጋ፡ ከዝቅ ወደ ከፍ',
        '💎 Price: High to Low': '💎 ዋጋ፡ ከከፍ ወደ ዝቅ',
        '🌍 All Regions': '🌍 ሁሉም ክልሎች',
        // Buttons & labels
        'Contact Us': 'ያግኙን', 'Call Now': 'አሁን ይደውሉ',
        'Full Details': 'ሙሉ ዝርዝር', 'Share': 'አጋሩ',
        'Add to Cart': 'ወደ ጋሪ ጨምር', 'Save': 'አስቀምጥ',
        'Call': 'ይደውሉ', 'Message': 'መልዕክት', 'WhatsApp': 'ዋትስአፕ',
        'Send Message': 'መልዕክት ይላኩ', 'Sign In': 'ይግቡ',
        'Sign Out': 'ይውጡ', 'Welcome Back': 'እንኳን ደህና መጡ',
        'Featured Partner': 'ልዩ አጋር',
        'View Details': 'ዝርዝር ይመልከቱ',
        'Back to Catalog': 'ወደ ዝርዝር ተመለስ',
        'Copy Link': 'ሊንክ ቅዱ',
        '✓ Link copied to clipboard!': '✓ ሊንክ ተቀድቷል!',
        'Share this item': 'ይህን እቃ አጋሩ',
        'Verified Merchant': 'የተረጋገጠ ነጋዴ', 'Member': 'አባል',
        'Loading...': 'በመጫን ላይ...',
        '👋 Hello! Welcome! Need help with buying or selling?': '👋 ሰላም! እንኳን ደህና መጡ! ለመግዛት ወይም ለመሸጥ እርዳታ ይፈልጋሉ?',
        'Contact WanaGebya Support': 'የWanaGebya ድጋፍ ያግኙ',
        'Join Telegram Channel': 'ቴሌግራም ቻናል ይቀላቀሉ',
        'Share on Telegram': 'በቴሌግራም አጋሩ',
        'Share on WhatsApp': 'በዋትስአፕ አጋሩ',
        'Share on Facebook': 'በፌስቡክ አጋሩ',
        'No description provided.': 'መግለጫ አልቀረበም።',
        'Call Seller': 'ሻጩን ይደውሉ',
        'Message on Telegram': 'በቴሌግራም ይላኩ',
        'Message on WhatsApp': 'በዋትስአፕ ይላኩ',
    }
};

window.toggleLanguage = function() {
    isAmharic = !isAmharic;
    const lang = isAmharic ? 'am' : 'en';
    const t = TRANSLATIONS[lang];

    // Update lang toggle button label
    const langTextEl = document.getElementById('langText');
    if (langTextEl) langTextEl.innerText = isAmharic ? 'English' : 'አማርኛ';

    // Translate all [data-am] elements (legacy support)
    document.querySelectorAll('[data-am]').forEach(el => {
        const currentText = el.innerText.trim();
        const stored = el.getAttribute('data-am');
        el.innerText = stored;
        el.setAttribute('data-am', currentText);
    });

    // Translate text nodes using the map
    document.querySelectorAll('[data-translate]').forEach(el => {
        const key = el.getAttribute('data-translate');
        if (t[key]) el.innerText = t[key];
    });

    // Translate placeholders
    document.querySelectorAll('[data-am-placeholder]').forEach(el => {
        const amPh = el.getAttribute('data-am-placeholder');
        const enPh = el.getAttribute('data-en-placeholder') || el.placeholder;
        if (!el.getAttribute('data-en-placeholder')) el.setAttribute('data-en-placeholder', el.placeholder);
        el.placeholder = isAmharic ? amPh : el.getAttribute('data-en-placeholder');
    });

    // Translate select option text
    document.querySelectorAll('option[data-am]').forEach(opt => {
        const cur = opt.textContent.trim();
        const am = opt.getAttribute('data-am');
        opt.textContent = am;
        opt.setAttribute('data-am', cur);
    });

    // Store preference
    localStorage.setItem('wg_lang', lang);
    document.documentElement.lang = isAmharic ? 'am' : 'en';
};

// Auto-apply saved language on page load
window.applyStoredLanguage = function() {
    const saved = localStorage.getItem('wg_lang');
    if (saved === 'am') window.toggleLanguage();
};


async function postToSocialMedia(product) {
    // Falls back to a specific token if GolemConfig isn't defined, keeping your data secure
    const botToken = typeof GolemConfig !== 'undefined' ? GolemConfig.botToken : 'YOUR_TELEGRAM_BOT_TOKEN';
    const chatId = typeof GolemConfig !== 'undefined' ? (GolemConfig.channelId || GolemConfig.chatId) : '@your_public_channel_username';
    
    const message = `
🌟 *New Item Approved!*
📦 *Product:* ${product.name}
💰 *Price:* ${product.price} ETB
📍 *Location:* ${product.location}

🔗 View Details: https://grand-sawine-a63bc3.netlify.app/product.html?id=${product.id}
    `;
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' })
    }).catch(err => console.log("Telegram notification silently failed", err));
}


// --- UPDATE THIS IN script.js ---
window.generateItemHTML = function(item) {
    // 1. PROFESSIONAL JOB LISTING VIEW
    if (item.category === 'Jobs') {
        return `
            <div class="job-card" onclick="showProductDetails('${item.id}')">
                <div class="job-badge"><i class="fas fa-briefcase"></i> ${item.job_type || 'Full-Time'}</div>
                <h3 class="job-title">${item.title}</h3>
                <div class="job-meta">
                    <span><i class="fas fa-building"></i> ${item.company || 'Private Employer'}</span>
                    <span><i class="fas fa-map-marker-alt"></i> ${item.location}</span>
                </div>
                <div class="job-footer">
                    <span class="job-salary">${item.price} ETB / Month</span>
                    <button class="job-apply-btn">Details</button>
                </div>
            </div>`;
    } 
    
    // 2. PROFESSIONAL SERVICE PROVIDER VIEW
    if (item.category === 'Services') {
        return `
            <div class="service-card" onclick="showProductDetails('${item.id}')">
                <div class="service-image-container">
                    <img src="${item.image_url}" onerror="this.src='https://via.placeholder.com/300x150?text=Service'">
                    <div class="service-status">Verified</div>
                </div>
                <div class="service-info">
                    <h3 class="service-title">${item.title}</h3>
                    <p class="service-price">Starting: <strong>${item.price} ETB</strong></p>
                </div>
            </div>`;
    }

    // 3. STANDARD PRODUCT VIEW (Electronics, Furniture, etc.)
    return `
        <div class="product-card" onclick="showProductDetails('${item.id}')">
            <div class="product-image-container">
                <img src="${item.image_url}" alt="${item.title}">
            </div>
            <div class="product-info">
                <h3>${item.title}</h3>
                <p class="price">${item.price} ETB</p>
                <p class="location"><i class="fas fa-map-marker-alt"></i> ${item.location}</p>
            </div>
        </div>`;
};


function showTGPopup() {
    // Check if user has seen it today
    if (!localStorage.getItem('tg_popup_seen')) {
        setTimeout(() => {
            document.getElementById('tg-popup').classList.add('tg-popup-show');
        }, 3000); // 3-second delay
    }
}

function closeTGPopup() {
    document.getElementById('tg-popup').classList.remove('tg-popup-show');
    // Set a flag so it doesn't show again for 24 hours
    localStorage.setItem('tg_popup_seen', 'true');
}

// Run the function on page load
window.onload = showTGPopup;




// Function for the Automatic Popup (runs once per day)
function showTGPopupAuto() {
    if (!localStorage.getItem('tg_popup_seen')) {
        setTimeout(() => {
            document.getElementById('tg-popup').classList.add('tg-popup-show');
        }, 3000); 
    }
}

// Function for the Manual Button (always opens when clicked)
function openTGPopupManual() {
    document.getElementById('tg-popup').classList.add('tg-popup-show');
}

// Function to close the popup
function closeTGPopup() {
    document.getElementById('tg-popup').classList.remove('tg-popup-show');
    // We only set the 'seen' flag if it was an automatic trigger
    localStorage.setItem('tg_popup_seen', 'true');
}

// Start the auto-checker when the page loads
window.onload = showTGPopupAuto;
