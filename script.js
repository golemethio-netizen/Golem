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
// 3. Modal & Contact Logic
window.openProductDetails = function(product) {
    const modal = document.getElementById('productModal');
    if (!modal) return;

    // Fill Basic Info
    document.getElementById('modalProductTitle').innerText = product.name;
    document.getElementById('modalProductPrice').innerText = `${product.price?.toLocaleString()} ETB`;
    document.getElementById('modalProductDesc').innerText = product.description || "No description provided.";
    
    // Fix for Lazy Loading Intervention: Force eager loading in modal
    const modalImg = document.getElementById('modalProductImg');
    modalImg.src = product.image;
    modalImg.loading = "eager"; 

    // Button Selectors
    const callBtn = document.getElementById('callContact');
    const waBtn = document.getElementById('whatsappContact');
    const tgBtn = document.getElementById('telegramContact');
    const shareTgBtn = document.getElementById('shareTgBtn');
    
    const phone = product.phone_number;
    const tgUser = (product.telegram_username || product.seller_telegram || "").replace('@', '');

    // 📞 Call Seller Logic
    if (callBtn && phone) {
        callBtn.href = `tel:${phone}`;
        callBtn.style.display = "flex";
    }

    // 🛒 Buy Now (WhatsApp with pre-filled text)
    if (waBtn && phone) {
        const cleanPhone = phone.replace(/\D/g, '');
        const waMsg = encodeURIComponent(`Hello! I want to buy your "${product.name}" for ${product.price} ETB on Golem. Is it still available?`);
        waBtn.href = `https://wa.me/${cleanPhone}?text=${waMsg}`;
        waBtn.style.display = "flex";
    }

    // ✈️ Telegram Contact
    if (tgBtn && tgUser) {
        tgBtn.href = `https://t.me/${tgUser}`;
        tgBtn.style.display = "flex";
    }

    // 📤 Share to Telegram Logic
    if (shareTgBtn) {
        const shareUrl = window.location.href; 
        const shareText = encodeURIComponent(`🔥 Check out this ${product.name}!\n💰 Price: ${product.price} ETB\n\nContact seller on Golem:`);
        shareTgBtn.href = `https://t.me/share/url?url=${shareUrl}&text=${shareText}`;
        shareTgBtn.style.display = "flex";
    }

    // 🛍️ Add to Cart Logic (Local Storage)
    const cartBtn = document.querySelector('.add-to-cart-btn');
    if (cartBtn) {
        cartBtn.onclick = () => addToCart(product);
    }

    modal.style.display = 'flex';
    if(product.id) _supabase.rpc('increment_views', { row_id: product.id });
};




// 4. Simple Cart System
function addToCart(product) {
    let cart = JSON.parse(localStorage.getItem('golem_cart') || '[]');
    
    // Check if already in cart
    if (!cart.find(item => item.id === product.id)) {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image
        });
        localStorage.setItem('golem_cart', JSON.stringify(cart));
        alert("Item added to your interests!");
    } else {
        alert("This item is already in your list.");
    }
}


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



