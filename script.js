document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    updateUIForUser();
    loadDynamicFilters();

    // Match search input to your HTML ID: headerSearch
    const searchInput = document.getElementById('headerSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            filterSearch(term);
        });
    }
});

// 1. Fetch Approved Products
// 1. Fetch Approved Products from Supabase
async function fetchProducts(category = 'All') {
    const sortSelect = document.getElementById('sortSelect');
    const sortOrder = sortSelect ? sortSelect.value : 'newest';

    // Using .select('*') ensures phone_number is included
    let query = _supabase.from('products').select('*').eq('status', 'approved');

    if (category !== 'All') {
        query = query.eq('category', category);
    }

    // Apply Sorting
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

// 2. Render Products
// 2. Render Product Cards to the Grid
function renderProducts(products) {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    grid.innerHTML = products.map(p => {
        const isSold = p.status === 'sold';
        // Prepare data for the modal
        const productData = JSON.stringify(p).replace(/'/g, "&apos;");
        
        return `
            <div class="product-card ${isSold ? 'is-sold' : ''}">
                <div class="img-wrapper" style="position:relative;">
                    ${isSold ? '<div class="sold-watermark">SOLD</div>' : ''}
                    <img src="${p.image}" alt="${p.name}" loading="lazy">
                </div>
                <div class="product-info">
                    <h3>${p.name}</h3>
                    <p class="price">${p.price?.toLocaleString()} ETB</p>
                    <div class="action-buttons" style="display: flex; flex-direction: column; gap: 8px;">
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




// 3. Open the Product Modal & Fill Data (The "Call Seller" logic)
window.openProductDetails = function(product) {
    const modal = document.getElementById('productModal');
    if (!modal) return;

    // Set Text Content
    document.getElementById('modalProductTitle').innerText = product.name;
    document.getElementById('modalProductPrice').innerText = `${product.price?.toLocaleString()} ETB`;
    document.getElementById('modalProductDesc').innerText = product.description || "No description.";
    document.getElementById('modalProductImg').src = product.image;

    // 📞 Handle Call Seller Button
    const callBtn = document.getElementById('callContact');
    if (callBtn && product.phone_number) {
        callBtn.href = `tel:${product.phone_number}`;
        callBtn.style.display = "flex"; // Force show
        callBtn.innerHTML = `<i class="fas fa-phone-alt"></i> Call Seller`;
    } else if (callBtn) {
        callBtn.style.display = "none"; // Hide if no number
    }

    // 🟢 Handle WhatsApp Button
    const waBtn = document.getElementById('whatsappContact');
    if (waBtn && product.phone_number) {
        const cleanPhone = product.phone_number.replace(/\D/g, '');
        waBtn.href = `https://wa.me/${cleanPhone}`;
        waBtn.style.display = "flex";
    }

    // ✈️ Handle Telegram Button
    const tgBtn = document.getElementById('telegramContact');
    const tgUser = product.telegram_username || product.seller_telegram;
    if (tgBtn && tgUser) {
        tgBtn.href = `https://t.me/${tgUser.replace('@', '')}`;
        tgBtn.style.display = "flex";
    } else if (tgBtn) {
        tgBtn.style.display = "none";
    }

    modal.style.display = 'flex';
    
    // Optional: Increment view count
    if(product.id) _supabase.rpc('increment_views', { row_id: product.id });
};

window.closeProductModal = function() {
    document.getElementById('productModal').style.display = 'none';
};

// 4. Search and UI Helpers
function filterSearch(term) {
    const cards = document.querySelectorAll('.product-card');
    cards.forEach(card => {
        const title = card.querySelector('h3').innerText.toLowerCase();
        card.style.display = title.includes(term) ? 'block' : 'none';
    });
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

function toggleModal() {
    const m = document.getElementById('authModal');
    m.style.display = (m.style.display === 'flex') ? 'none' : 'flex';
}



async function loadDynamicFilters() {
    const container = document.querySelector('.filter-container');
    if (!container) return;

    const { data: cats, error } = await _supabase.from('categories').select('name').order('name');
    if (error) return;

    container.innerHTML = `<button class="filter-btn active" onclick="filterCategory('All', this)">All</button>`;
    if (cats) {
        cats.forEach(c => {
            container.innerHTML += `<button class="filter-btn" onclick="filterCategory('${c.name}', this)">${c.name}</button>`;
        });
    }
}

window.filterCategory = function(cat, btn) {
    if (!btn) {
        const allBtns = document.querySelectorAll('.filter-btn');
        btn = Array.from(allBtns).find(b => b.innerText.trim() === cat);
    }
    if (btn) {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }
    fetchProducts(cat);
};

window.applyPriceFilter = function() {
    const min = parseFloat(document.getElementById('minPrice').value) || 0;
    const max = parseFloat(document.getElementById('maxPrice').value) || Infinity;
    const cards = document.querySelectorAll('.product-card');
    
    cards.forEach(card => {
        const priceText = card.querySelector('.price').innerText;
        const price = parseFloat(priceText.replace(' ETB', ''));
        card.style.display = (price >= min && price <= max) ? 'block' : 'none';
    });
};

// 4. Navigation & Auth
async function incrementView(productId) {
    await _supabase.rpc('increment_views', { row_id: productId });
}

function handleViewAndBuy(id) {
    incrementView(id);
    location.href = `checkout.html?id=${id}`;
}

async function shareItem(name, price, id) {
    const shareUrl = `${window.location.origin}${window.location.pathname.replace('index.html','')}checkout.html?id=${id}`;
    const shareText = `Check out this ${name} for ${price} ETB on Golem Marketplace!`;
    if (navigator.share) {
        try { await navigator.share({ title: 'Golem', text: shareText, url: shareUrl }); } 
        catch (err) { console.log("Share cancelled"); }
    } else {
        navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
        alert("Link copied to clipboard!");
    }
}


