// --- 1. INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
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
    if (!error) renderProducts(data);
    else console.error("Fetch error:", error.message);
}

function renderProducts(products) {
    const container = document.getElementById('productsContainer');
    if (!container) return;

    if (products.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; grid-column: 1/-1; padding: 60px 20px;">
                <i class="fas fa-search" style="font-size: 3rem; color: #ccc; margin-bottom: 15px;"></i>
                <p style="color: #777; font-size: 1.1rem;">No products found in this category.</p>
            </div>`;
    } else {
        container.innerHTML = products.map(product => renderProductCard(product)).join('');
    }

    const loader = document.querySelector('.loading-spinner');
    if (loader) loader.style.display = 'none';
}

function renderProductCard(product) {
    const formattedPrice = new Intl.NumberFormat().format(product.price);
    // Encode product data to safely pass through HTML attributes
    const productData = encodeURIComponent(JSON.stringify(product));

    return `
        <div class="product-card" id="card-${product.id}">
            <div class="card-img-container">
                <img src="${product.image}" alt="${product.name}" loading="lazy">
                <div class="image-overlay">
                    <button class="view-btn" onclick="openProductDetailsSafe('${productData}')">
                        <i class="fas fa-expand"></i> Quick View
                    </button>
                </div>
            </div>
            
            <div class="card-content" style="padding: 20px;">
                <span class="category-badge">${product.category || 'General'}</span>
                <h3 class="product-title" style="margin: 10px 0; font-size: 1.1rem;">${product.name}</h3>
                <p class="product-description" style="color: #777; font-size: 0.85rem; height: 40px; overflow: hidden; margin-bottom: 15px;">
                    ${product.description || 'Premium quality item from Golem Marketplace.'}
                </p>
                
                <div class="card-footer" style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #eee; pt: 15px;">
                    <span class="product-price" style="font-weight: bold; color: #007bff; font-size: 1.2rem;">
                        ${formattedPrice} <small style="font-size: 0.7rem; color: #333;">ETB</small>
                    </span>
                    <button class="contact-btn" onclick="openProductDetailsSafe('${productData}')" 
                            style="background: #007bff; color: white; border: none; padding: 8px 15px; border-radius: 8px; cursor: pointer; font-weight: 500;">
                        Interested
                    </button>
                </div>
            </div>
        </div>
    `;
}

// --- 3. MODAL & PRODUCT DETAILS ---
window.openProductDetailsSafe = function(encodedData) {
    const product = JSON.parse(decodeURIComponent(encodedData));
    window.openProductDetails(product);
};

window.openProductDetails = function(product) {
    const modal = document.getElementById('productModal');
    if (!modal) return;

    document.getElementById('modalProductTitle').innerText = product.name;
    document.getElementById('modalProductPrice').innerText = `${product.price?.toLocaleString()} ETB`;
    document.getElementById('modalProductDesc').innerText = product.description || "No description provided.";
    
    const modalImg = document.getElementById('modalProductImg');
    modalImg.src = product.image;

    // Contact Buttons Logic
    const phone = product.phone_number;
    const tgUser = (product.telegram_username || product.seller_telegram || "").replace('@', '');

    const callBtn = document.getElementById('callContact');
    const waBtn = document.getElementById('whatsappContact');
    const tgBtn = document.getElementById('telegramContact');

    if (callBtn) {
        callBtn.href = `tel:${phone}`;
        callBtn.style.display = phone ? "flex" : "none";
    }

    if (waBtn && phone) {
        const cleanPhone = phone.replace(/\D/g, '');
        const waMsg = encodeURIComponent(`Hello! I'm interested in "${product.name}" listed on Golem.`);
        waBtn.href = `https://wa.me/${cleanPhone}?text=${waMsg}`;
        waBtn.style.display = "flex";
    }

    if (tgBtn) {
        tgBtn.href = `https://t.me/${tgUser}`;
        tgBtn.style.display = tgUser ? "flex" : "none";
    }

    const cartBtn = document.querySelector('.add-to-cart-btn');
    if (cartBtn) cartBtn.onclick = () => addToCart(product);

    modal.style.display = 'flex';
    if(product.id) _supabase.rpc('increment_views', { row_id: product.id });
};

window.closeProductModal = function() {
    const pModal = document.getElementById('productModal');
    if (pModal) pModal.style.display = 'none';
};

// --- 4. AUTHENTICATION ---
async function updateUIForUser() {
    const { data: { user } } = await _supabase.auth.getUser();
    const signinBtn = document.querySelector('.signin-btn');
    if (!signinBtn) return;

    if (user) {
        signinBtn.innerText = "Sign Out";
        signinBtn.onclick = async () => {
            await _supabase.auth.signOut();
            alert("Signed out successfully");
            window.location.reload();
        };
    } else {
        signinBtn.innerText = "Sign In";
        signinBtn.onclick = () => window.toggleModal();
    }
}

window.handleAuth = async (event) => {
    event.preventDefault();
    const email = event.target.querySelector('input[type="email"]').value;
    const password = event.target.querySelector('input[type="password"]').value;

    const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
    if (error) alert("Login Error: " + error.message);
    else window.location.reload();
};

window.handleSignUp = async (event) => {
    event.preventDefault();
    const email = event.target.querySelector('input[type="email"]').value;
    const password = event.target.querySelector('input[type="password"]').value;

    const { error } = await _supabase.auth.signUp({ email, password });
    if (error) alert("Registration Error: " + error.message);
    else {
        alert("Success! Check your email for the confirmation link.");
        window.toggleModal();
    }
};

window.toggleModal = function() {
    const modal = document.getElementById('authModal');
    if (modal) modal.style.display = (modal.style.display === "flex") ? "none" : "flex";
};

window.toggleAuthMode = function() {
    const title = document.getElementById('modalTitle');
    const submitBtn = document.querySelector('.auth-submit');
    const isSignIn = title.innerText === "Welcome Back";

    title.innerText = isSignIn ? "Create Account" : "Welcome Back";
    submitBtn.innerText = isSignIn ? "Sign Up" : "Sign In";
    document.getElementById('authForm').onsubmit = isSignIn ? handleSignUp : handleAuth;
};

// --- 5. FILTERS & SEARCH ---
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

window.filterCategory = function(cat, btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    fetchProducts(cat);
};

function filterSearch(term) {
    const cards = document.querySelectorAll('.product-card');
    cards.forEach(card => {
        const title = card.querySelector('h3').innerText.toLowerCase();
        card.style.display = title.includes(term) ? 'block' : 'none';
    });
}

// --- 6. CART SYSTEM ---
window.updateCartBadge = function() {
    const cart = JSON.parse(localStorage.getItem('golem_cart') || '[]');
    const badge = document.getElementById('cartBadge');
    if (badge) {
        badge.innerText = cart.length;
        badge.style.display = cart.length > 0 ? 'flex' : 'none';
    }
};

window.addToCart = function(product) {
    let cart = JSON.parse(localStorage.getItem('golem_cart') || '[]');
    if (!cart.find(item => item.id === product.id)) {
        cart.push({ id: product.id, name: product.name, price: product.price, image: product.image });
        localStorage.setItem('golem_cart', JSON.stringify(cart));
        updateCartBadge();
        alert("Saved to your list!");
    } else {
        alert("Already in your list.");
    }
};

// --- 7. UTILITIES & GLOBAL HANDLERS ---
window.onclick = (e) => {
    const authModal = document.getElementById('authModal');
    const prodModal = document.getElementById('productModal');
    if (e.target === authModal) authModal.style.display = "none";
    if (e.target === prodModal) prodModal.style.display = "none";
};

window.checkAuthToSell = async function() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (user) window.location.href = 'sell.html';
    else {
        alert("Please Sign In first to post an item.");
        window.toggleModal();
    }
};
