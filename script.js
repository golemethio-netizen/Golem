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
    if (!error) renderProducts(data); // FIXED: Added renderProducts call here
    else console.error("Fetch error:", error.message);
}

function renderProducts(products) {
    const grid = document.getElementById('productGrid') || document.getElementById('productsContainer');
    if (!grid) return;

    if (products.length === 0) {
        grid.innerHTML = `<div style="text-align:center; grid-column:1/-1; padding:60px; color:#888;">No items found.</div>`;
    } else {
        grid.innerHTML = products.map(p => {
            const safeData = encodeURIComponent(JSON.stringify(p));
            const isSold = p.status === 'sold';
            const condition = p.status_condition || 'New';
            
            // Verified Seller Logic
            const verifiedNames = ['Crown Time', 'Crown Time Furniture', 'Golem Admin'];
            const isVerified = verifiedNames.includes(p.seller_name);
            const verifiedBadge = isVerified ? `<i class="fas fa-check-circle" style="color: #007bff; margin-left: 4px;" title="Verified Business"></i>` : '';

            // Condition Colors
            const conditionColors = {
                'New': { bg: '#d4edda', text: '#155724' },
                'Used - Like New': { bg: '#fff3cd', text: '#856404' },
                'Used - Fair': { bg: '#f8d7da', text: '#721c24' },
                'Refurbished': { bg: '#cce5ff', text: '#004085' }
            };
            const style = conditionColors[condition] || { bg: '#e9ecef', text: '#495057' };

            const phone = p.phone_number ? p.phone_number.replace(/\D/g, '') : '';
            const tg = p.telegram_username || p.seller_telegram || '';

            return `
                <div class="product-card ${isSold ? 'is-sold' : ''}">
                    <div class="img-wrapper">
                        ${isSold ? '<div class="sold-watermark">SOLD</div>' : ''}
                        <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x200?text=Image+Not+Found'">
                    </div>
                    
                    <div class="product-info">
                        <div class="badge-row" style="display:flex; gap:8px; margin-bottom:10px; align-items:center;">
                            <span class="category-tag">${p.category || 'General'}</span>
                            <span class="condition-tag" style="background:${style.bg}; color:${style.text}; padding:3px 10px; border-radius:12px; font-size:0.7rem; font-weight:bold; text-transform:uppercase;">
                                ${condition}
                            </span>
                        </div>
                        
                        <h3>${p.name}</h3>
                        
                        <div class="seller-line" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; color:#666; font-size:0.85rem;">
                            <span><i class="fas fa-user-circle"></i> ${p.seller_name || 'Verified'} ${verifiedBadge}</span>
                            <span style="font-weight:bold; color:#28a745;">${p.price?.toLocaleString()} ETB</span>
                        </div>

                        <div class="quick-contact-bar" style="display:flex; gap:5px; margin-bottom:15px; border-top:1px solid #f0f0f0; padding-top:10px;">
                            ${phone ? `<a href="tel:${phone}" class="mini-contact" title="Call Seller" style="flex:1; text-align:center; padding:5px; background:#f8f9fa; border-radius:5px; color:#007bff;"><i class="fas fa-phone"></i></a>` : ''}
                            ${phone ? `<a href="https://wa.me/${phone}" target="_blank" class="mini-contact" title="WhatsApp" style="flex:1; text-align:center; padding:5px; background:#f8f9fa; border-radius:5px; color:#25d366;"><i class="fab fa-whatsapp"></i></a>` : ''}
                            ${tg ? `<a href="https://t.me/${tg.replace('@','')}" target="_blank" class="mini-contact" title="Telegram" style="flex:1; text-align:center; padding:5px; background:#f8f9fa; border-radius:5px; color:#0088cc;"><i class="fab fa-telegram"></i></a>` : ''}
                        </div>

                        <div class="action-buttons">
                            ${isSold ? 
                                `<button class="main-btn" disabled style="background:#ccc; width:100%; border:none; padding:10px; border-radius:8px;">Sold Out</button>` : 
                                `<button class="main-btn" onclick="window.openProductDetailsSafe('${safeData}')" style="width:100%; padding:10px; border-radius:8px; background:#007bff; color:white; border:none; cursor:pointer; font-weight:bold;">🛒 View Full Details</button>`
                            }
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    const loader = document.querySelector('.loading-spinner') || document.getElementById('loadingMessage');
    if (loader) loader.style.display = 'none';
}

// --- 3. MODAL LOGIC ---
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

    // Basic Info
    document.getElementById('modalProductTitle').innerText = product.name;
    document.getElementById('modalProductPrice').innerText = `${product.price?.toLocaleString()} ETB`;
    document.getElementById('modalProductDesc').innerText = product.description || "No description provided.";
    document.getElementById('modalProductImg').src = product.image;

    // Seller Display with Verified Check
    const verifiedNames = ['Crown Time', 'Crown Time Furniture', 'Golem Admin'];
    const isVerified = verifiedNames.includes(product.seller_name);
    const sellerDisplay = document.getElementById('modalSellerName');
    if (sellerDisplay) {
        sellerDisplay.innerHTML = `${product.seller_name || 'Verified Seller'} ${isVerified ? '<i class="fas fa-check-circle" style="color: #007bff;"></i>' : ''}`;
    }

    const conditionDisplay = document.getElementById('modalCondition');
    if (conditionDisplay) conditionDisplay.innerText = product.status_condition || 'New';

    // Order Logic
    const phone = product.phone_number;
    const tgUser = (product.telegram_username || product.seller_telegram || "").replace('@', '');
    const orderMsg = encodeURIComponent(`Hello! I'm interested in "${product.name}" for ${product.price?.toLocaleString()} ETB. Is it still available?`);

    const waBtn = document.getElementById('whatsappOrder');
    if (waBtn && phone) {
        waBtn.href = `https://wa.me/${phone.replace(/\D/g, '')}?text=${orderMsg}`;
        waBtn.style.display = "flex";
    }

    const tgBtn = document.getElementById('telegramOrder');
    if (tgBtn && tgUser) {
        tgBtn.href = `https://t.me/${tgUser}`;
        tgBtn.style.display = "flex";
    }

    modal.style.display = 'flex';
    if(product.id) _supabase.rpc('increment_views', { row_id: product.id });
};

// --- 4. GLOBAL HELPERS ---
window.closeProductModal = function() {
    const pModal = document.getElementById('productModal');
    if (pModal) pModal.style.display = 'none';
};

window.filterCategory = function(cat, btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    fetchProducts(cat);
};

async function updateUIForUser() {
    const { data: { user } } = await _supabase.auth.getUser();
    const signinBtn = document.querySelector('.signin-btn');
    if (!signinBtn) return;
    if (user) {
        signinBtn.innerText = "Sign Out";
        signinBtn.onclick = async () => { await _supabase.auth.signOut(); window.location.reload(); };
    } else {
        signinBtn.innerText = "Sign In";
        signinBtn.onclick = () => window.toggleModal();
    }
}

window.toggleModal = function() {
    const modal = document.getElementById('authModal');
    if (modal) modal.style.display = (modal.style.display === "flex") ? "none" : "flex";
};

window.updateCartBadge = function() {
    const cart = JSON.parse(localStorage.getItem('golem_cart') || '[]');
    const badge = document.getElementById('cartBadge');
    if (badge) {
        badge.innerText = cart.length;
        badge.style.display = cart.length > 0 ? 'flex' : 'none';
    }
};

window.onclick = (e) => {
    if (e.target.classList.contains('modal-overlay') || e.target.id === 'productModal' || e.target.id === 'authModal') {
        e.target.style.display = 'none';
    }
};

// Auth and other missing functions would go here...
