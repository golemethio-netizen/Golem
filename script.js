// --- 1. INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
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

// --- 2. PRODUCT LOGIC ---
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
    // We check for both possible IDs to avoid "Loading" hangs
    const grid = document.getElementById('productGrid') || document.getElementById('productsContainer');
    if (!grid) return;

    if (products.length === 0) {
        grid.innerHTML = `<div style="text-align:center; grid-column:1/-1; padding:50px;">No items found.</div>`;
    } else {
        grid.innerHTML = products.map(p => {
            const safeData = encodeURIComponent(JSON.stringify(p));
            const isSold = p.status === 'sold';
            return `
                <div class="product-card ${isSold ? 'is-sold' : ''}">
                    <div class="img-wrapper">
                        ${isSold ? '<div class="sold-watermark">SOLD</div>' : ''}
                        <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
                    </div>
                    <div class="product-info">
                        <h3>${p.name}</h3>
                        <p class="price">${p.price?.toLocaleString()} ETB</p>
                        <div class="action-buttons">
                            ${isSold ? 
                                `<button class="main-btn" disabled style="background:#ccc;">Sold</button>` : 
                                `<button class="main-btn" onclick="openProductDetailsSafe('${safeData}')">🛒 View Details</button>`
                            }
                        </div>
                    </div>
                </div>`;
        }).join('');
    }

    const loader = document.querySelector('.loading-spinner') || document.getElementById('loadingMessage');
    if (loader) loader.style.display = 'none';
}

// --- 3. GLOBAL FUNCTIONS (Attached to window so HTML can see them) ---

window.openProductDetailsSafe = function(encodedData) {
    const product = JSON.parse(decodeURIComponent(encodedData));
    window.openProductDetails(product);
};

window.filterCategory = function(cat, btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    fetchProducts(cat);
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

    const callBtn = document.getElementById('callContact');
    const waBtn = document.getElementById('whatsappContact');
    const tgBtn = document.getElementById('telegramContact');

    if (callBtn) { callBtn.href = `tel:${phone}`; callBtn.style.display = phone ? "flex" : "none"; }
    if (waBtn && phone) {
        const waMsg = encodeURIComponent(`Interested in ${product.name}`);
        waBtn.href = `https://wa.me/${phone.replace(/\D/g, '')}?text=${waMsg}`;
        waBtn.style.display = "flex";
    }
    if (tgBtn) { tgBtn.href = `https://t.me/${tgUser}`; tgBtn.style.display = tgUser ? "flex" : "none"; }

    modal.style.display = 'flex';
};

window.closeProductModal = function() {
    const pModal = document.getElementById('productModal');
    if (pModal) pModal.style.display = 'none';
};

// --- 4. AUTH & UI HELPERS ---

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

async function loadDynamicFilters() {
    const container = document.querySelector('.filter-bar');
    if (!container) return;
    const { data: cats } = await _supabase.from('categories').select('name').order('name');
    let buttonsHtml = `<button class="filter-btn active" onclick="filterCategory('All', this)">All</button>`;
    if (cats) {
        cats.forEach(c => {
            buttonsHtml += `<button class="filter-btn" onclick="filterCategory('${c.name}', this)">${c.name}</button>`;
        });
    }
    container.innerHTML = buttonsHtml;
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
