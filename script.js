document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    updateUIForUser();
    loadDynamicFilters();

    const searchInput = document.getElementById('headerSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            filterSearch(term);
        });
    }
});

// 1. Fetch Products from Supabase
async function fetchProducts(category = 'All') {
    const sortSelect = document.getElementById('sortSelect');
    const sortOrder = sortSelect ? sortSelect.value : 'newest';

    let query = _supabase.from('products').select('*').eq('status', 'approved');

    if (category !== 'All') {
        query = query.eq('category', category);
    }

    if (sortOrder === 'newest') query = query.order('created_at', { ascending: false });
    else if (sortOrder === 'price_low') query = query.order('price', { ascending: true });
    else if (sortOrder === 'price_high') query = query.order('price', { ascending: false });
    else if (sortOrder === 'popular') query = query.order('views', { ascending: false });

    const { data: products, error } = await query;
    if (!error) {
        renderProducts(products);
    } else {
        console.error("Supabase Error:", error.message);
    }
}

// 2. Render Grid
function renderProducts(products) {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    grid.innerHTML = products.map(p => {
        const isSold = p.status === 'sold';
        const productData = JSON.stringify(p).replace(/'/g, "&apos;");
        
        return `
            <div class="product-card ${isSold ? 'is-sold' : ''}">
                <div class="img-wrapper">
                    ${isSold ? '<div class="sold-watermark">SOLD</div>' : ''}
                    <img src="${p.image}" alt="${p.name}" loading="lazy">
                </div>
                <div class="product-info">
                    <h3>${p.name}</h3>
                    <p class="price">${p.price?.toLocaleString()} ETB</p>
                    <div class="action-buttons">
                        ${isSold ? 
                            `<button class="main-btn" disabled style="background:#ccc;">Already Sold</button>` : 
                            `<button class="main-btn" onclick='openProductDetails(${productData})'>🛒 View Details</button>`
                        }
                    </div>
                </div>
            </div>
        `;
    }).join('');

    const loader = document.querySelector('.loading-spinner');
    if (loader) loader.style.display = 'none';
}

// 3. Modal & Call Seller Logic
window.openProductDetails = function(product) {
    const modal = document.getElementById('productModal');
    if (!modal) return;

    document.getElementById('modalProductTitle').innerText = product.name;
    document.getElementById('modalProductPrice').innerText = `${product.price?.toLocaleString()} ETB`;
    document.getElementById('modalProductDesc').innerText = product.description || "No description provided.";
    document.getElementById('modalProductImg').src = product.image;

    // 📞 Call Seller Fix
    const callBtn = document.getElementById('callContact');
    if (callBtn && product.phone_number) {
        callBtn.href = `tel:${product.phone_number}`;
        callBtn.style.display = "flex";
    } else if (callBtn) {
        callBtn.style.display = "none";
    }

    // 🟢 WhatsApp
    const waBtn = document.getElementById('whatsappContact');
    if (waBtn && product.phone_number) {
        const cleanPhone = product.phone_number.replace(/\D/g, '');
        waBtn.href = `https://wa.me/${cleanPhone}`;
        waBtn.style.display = "flex";
    }

    // ✈️ Telegram
    const tgBtn = document.getElementById('telegramContact');
    const tgUser = product.telegram_username || product.seller_telegram;
    if (tgBtn && tgUser) {
        tgBtn.href = `https://t.me/${tgUser.replace('@', '')}`;
        tgBtn.style.display = "flex";
    } else if (tgBtn) {
        tgBtn.style.display = "none";
    }

    modal.style.display = 'flex';
    if(product.id) _supabase.rpc('increment_views', { row_id: product.id });
};

window.closeProductModal = function() {
    document.getElementById('productModal').style.display = 'none';
};

// 4. Dynamic Categories Fix
async function loadDynamicFilters() {
    // Corrected to match your index.html class: .filter-bar
    const container = document.querySelector('.filter-bar');
    if (!container) return;

    const { data: cats, error } = await _supabase.from('categories').select('name').order('name');
    if (error) return;

    // Keep the "All" and "Favorites" buttons existing in HTML
    let buttonsHtml = `<button class="filter-btn active" onclick="filterCategory('All', this)">All</button>`;
    buttonsHtml += `<button class="filter-btn fav-filter-btn" onclick="filterFavorites(this)"><i class="fas fa-heart"></i> My Favorites</button>`;

    if (cats) {
        cats.forEach(c => {
            buttonsHtml += `<button class="filter-btn" onclick="filterCategory('${c.name}', this)">${c.name}</button>`;
        });
    }
    container.innerHTML = buttonsHtml;
}

// 5. Helpers
function filterSearch(term) {
    const cards = document.querySelectorAll('.product-card');
    cards.forEach(card => {
        const title = card.querySelector('h3').innerText.toLowerCase();
        card.style.display = title.includes(term) ? 'block' : 'none';
    });
}

window.filterCategory = function(cat, btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    fetchProducts(cat);
};

window.applyPriceFilter = function() {
    const min = parseFloat(document.getElementById('minPrice').value) || 0;
    const max = parseFloat(document.getElementById('maxPrice').value) || Infinity;
    document.querySelectorAll('.product-card').forEach(card => {
        const price = parseFloat(card.querySelector('.price').innerText.replace(/[^0-9.-]+/g,""));
        card.style.display = (price >= min && price <= max) ? 'block' : 'none';
    });
};

function toggleModal() {
    const m = document.getElementById('authModal');
    m.style.display = (m.style.display === 'flex') ? 'none' : 'flex';
}

async function updateUIForUser() {
    const { data: { user } } = await _supabase.auth.getUser();
    const signinBtn = document.querySelector('.signin-btn');
    if (user && signinBtn) {
        signinBtn.innerText = "Sign Out";
        signinBtn.onclick = async () => {
            await _supabase.auth.signOut();
            window.location.reload();
        };
    }
}
