// --- 1. INITIALIZATION & HEARTBEAT ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Connection Check
    try {
        const { count, error } = await _supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'approved');
        if (error) throw error;
        console.log("✅ Supabase Connected: Found", count, "approved items.");
    } catch (err) {
        console.error("❌ Connection Error:", err.message);
    }

    // 2. Load UI
    fetchProducts();
    updateUIForUser();
    loadDynamicFilters();
    updateCartBadge();

    // 3. Search Logic
    const searchInput = document.getElementById('headerSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => filterSearch(e.target.value.toLowerCase()));
    }
});

// --- 2. PRODUCT & FILTER LOGIC ---
async function fetchProducts(category = 'All') {
    const sortOrder = document.getElementById('sortSelect')?.value || 'newest';
    let query = _supabase.from('products').select('*').eq('status', 'approved');

    if (category !== 'All') query = query.eq('category', category);

    // Sorting
    if (sortOrder === 'newest') query = query.order('created_at', { ascending: false });
    else if (sortOrder === 'price_low') query = query.order('price', { ascending: true });
    else if (sortOrder === 'price_high') query = query.order('price', { ascending: false });

    const { data, error } = await query;
    if (!error) renderProducts(data);
    else console.error("Fetch error:", error.message);
}

function renderProducts(products) {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    if (products.length === 0) {
        grid.innerHTML = `<div style="text-align:center; grid-column:1/-1; padding:50px; color:#888;">No items found.</div>`;
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
                        <span class="category-tag">${p.category || 'General'}</span>
                        <h3>${p.name}</h3>
                        <p class="price">${p.price?.toLocaleString()} <small>ETB</small></p>
                        <div class="action-buttons">
                            ${isSold ? 
                                `<button class="main-btn" disabled style="background:#ccc; cursor:not-allowed;">Already Sold</button>` : 
                                `<button class="main-btn" onclick="openProductDetailsSafe('${safeData}')">🛒 View Details</button>`
                            }
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    const loader = document.querySelector('.loading-spinner');
    if (loader) loader.style.display = 'none';
}

// Helper to handle safe modal opening
window.openProductDetailsSafe = function(encodedData) {
    const product = JSON.parse(decodeURIComponent(encodedData));
    window.openProductDetails(product);
};

// Ensure filters are global
window.filterCategory = (cat, btn) => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    fetchProducts(cat);
};

// Global click to close modals
window.onclick = (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.style.display = 'none';
    }
};


// --- 3. MODAL & PRODUCT DETAILS ---
window.openProductDetails = function(product) {
    const modal = document.getElementById('productModal');
    if (!modal) return;

    document.getElementById('modalProductTitle').innerText = product.name;
    document.getElementById('modalProductPrice').innerText = `${product.price?.toLocaleString()} ETB`;
    document.getElementById('modalProductDesc').innerText = product.description || "No description provided.";
    
    const modalImg = document.getElementById('modalProductImg');
    modalImg.src = product.image;

    // Contact buttons
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
        const waMsg = encodeURIComponent(`Hello! I'm interested in "${product.name}" for ${product.price} ETB.`);
        waBtn.href = `https://wa.me/${cleanPhone}?text=${waMsg}`;
        waBtn.style.display = "flex";
    }

    if (tgBtn && tgUser) {
        tgBtn.href = `https://t.me/${tgUser}`;
        tgBtn.style.display = "flex";
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

// --- 4. CART SYSTEM ---
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
        cart.push(product);
        localStorage.setItem('golem_cart', JSON.stringify(cart));
        updateCartBadge();
        alert("Saved to list!");
    }
};

window.onclick = (e) => {
    if (e.target.classList.contains('modal-overlay')) e.target.style.display = 'none';
};


window.whatsappAllItems = function() {
    const cart = JSON.parse(localStorage.getItem('golem_cart') || '[]');
    if (cart.length === 0) return alert("Your list is empty!");

    let message = "🚀 *Inquiry from Golem Marketplace*\n\nI'm interested in:\n";
    cart.forEach((item, i) => {
        message += `${i + 1}. ${item.name} - ${item.price} ETB\n`;
    });
    
    const adminPhone = "251911223344"; 
    window.open(`https://wa.me/${adminPhone}?text=${encodeURIComponent(message)}`, '_blank');
};

// --- 3. MODAL TOGGLE ---
window.toggleModal = function() {
    const modal = document.getElementById('authModal');
    if (modal) {
        if (modal.style.display === "flex") {
            modal.style.display = "none";
        } else {
            modal.style.display = "flex";
        }
    }
};
window.closeProductModal = function() {
    const pModal = document.getElementById('productModal');
    if (pModal) pModal.style.display = 'none';
};


window.handleAuth = async (event) => {
    event.preventDefault();
    const email = event.target.querySelector('input[type="email"]').value;
    const password = event.target.querySelector('input[type="password"]').value;
    const { error } = await _supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else window.location.reload();
};



// --- 3. INVITE & SHARE LOGIC ---
window.shareToTelegram = function() {
    const text = encodeURIComponent("Check out Golem Marketplace - Ethiopia's best place to buy and sell!");
    const url = window.location.origin;
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
};

window.shareToWhatsApp = function() {
    const text = encodeURIComponent("Check out Golem Marketplace: " + window.location.origin);
    window.open(`https://wa.me/?text=${text}`, '_blank');
};







// --- 6. HELPERS ---
// --- 5. HELPERS & UTILITIES ---
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

// --- 4. AUTH & USER UI ---
async function updateUIForUser() {
    const { data: { user } } = await _supabase.auth.getUser();
    const signinBtn = document.querySelector('.signin-btn');
    if (!signinBtn) return;

    if (user) {
        signinBtn.innerText = "Sign Out";
        signinBtn.onclick = async () => {
            await _supabase.auth.signOut();
            window.location.reload();
        };
    } else {
        signinBtn.innerText = "Sign In";
        signinBtn.onclick = () => window.toggleModal();
    }
}


// Global click handler to close modals
window.onclick = function(event) {
    const authModal = document.getElementById('authModal');
    const prodModal = document.getElementById('productModal');
    if (event.target === authModal) authModal.style.display = "none";
    if (event.target === prodModal) prodModal.style.display = "none";
};



window.toggleAuthMode = function() {
    const title = document.getElementById('modalTitle');
    const subtitle = document.getElementById('modalSubtitle');
    const submitBtn = document.querySelector('.auth-submit');
    const footerLink = document.querySelector('.modal-footer p');

    if (title.innerText === "Welcome Back") {
        title.innerText = "Create Account";
        subtitle.innerText = "Join the Golem marketplace today";
        submitBtn.innerText = "Sign Up";
        footerLink.innerHTML = 'Already have an account? <a href="#" onclick="toggleAuthMode()">Sign In</a>';
        // Change form behavior to sign up
        document.getElementById('authForm').onsubmit = (e) => handleSignUp(e);
    } else {
        title.innerText = "Welcome Back";
        subtitle.innerText = "Please enter your details to continue";
        submitBtn.innerText = "Sign In";
        footerLink.innerHTML = 'Don\'t have an account? <a href="#" onclick="toggleAuthMode()">Sign Up</a>';
        // Change form behavior back to sign in
        document.getElementById('authForm').onsubmit = (e) => handleAuth(e);
    }
};


wwindow.handleSignUp = async (event) => {
    event.preventDefault();
    const email = event.target.querySelector('input[type="email"]').value;
    const password = event.target.querySelector('input[type="password"]').value;
    const { error } = await _supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    else {
        alert("Success! Check your email to confirm.");
        window.toggleModal();
    }
};

window.toggleModal = function() {
    const modal = document.getElementById('authModal');
    if (modal) modal.style.display = (modal.style.display === "flex") ? "none" : "flex";
};

window.toggleAuthMode = function() {
    const title = document.getElementById('modalTitle');
    const isSignIn = title.innerText === "Welcome Back";
    title.innerText = isSignIn ? "Create Account" : "Welcome Back";
    document.getElementById('authForm').onsubmit = isSignIn ? handleSignUp : handleAuth;
};

// --- 2. THE SELL BUTTON GATEKEEPER ---
window.checkAuthToSell = async function() {
    const { data: { user } } = await _supabase.auth.getUser();

    if (user) {
        // If logged in, go to sell page
        window.location.href = 'sell.html'; 
    } else {
        // If not logged in, pop the modal
        alert("Please Sign In first to post an item.");
        window.toggleModal();
    }
};


window.permanentlyDelete = async function(productId) {
    // 1. Double check with the admin
    const confirmDelete = confirm("⚠️ Are you sure? This will permanently remove the item from the database. This cannot be undone.");
    
    if (!confirmDelete) return;

    try {
        // 2. Execute the delete query
        const { error } = await _supabase
            .from('products')
            .delete()
            .eq('id', productId);

        if (error) {
            throw error;
        }

        // 3. Success! Update the UI
        alert("Product deleted permanently.");
        
        // If you have a function to refresh the list, call it here
        if (typeof fetchPendingProducts === "function") {
            fetchPendingProducts(); 
        } else {
            window.location.reload(); // Fallback: refresh the whole page
        }

    } catch (err) {
        console.error("Delete Error:", err.message);
        alert("Failed to delete item: " + err.message);
    }
};
