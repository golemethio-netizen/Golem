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

// --- 5. PRODUCT & FILTER LOGIC ---
async function fetchProducts(category = 'All') {
    const sortOrder = document.getElementById('sortSelect')?.value || 'newest';
    let query = _supabase.from('products').select('*').eq('status', 'approved');

    if (category !== 'All') query = query.eq('category', category);

    if (sortOrder === 'newest') query = query.order('created_at', { ascending: false });
    else if (sortOrder === 'price_low') query = query.order('price', { ascending: true });
    else if (sortOrder === 'price_high') query = query.order('price', { ascending: false });

    const { data, error } = await query;
    if (!error) renderProducts(data);
}


function renderProducts(products) {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    grid.innerHTML = products.map(p => {
        // We use encodeURIComponent to safely hide special characters 
        // that usually break the HTML 'onclick' attribute.
        const safeData = encodeURIComponent(JSON.stringify(p));
        const isSold = p.status === 'sold';
        
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
                            `<button class="main-btn" onclick="openProductDetailsSafe('${safeData}')">🛒 View Details</button>`
                        }
                    </div>
                </div>
            </div>
        `;
    }).join('');

    const loader = document.querySelector('.loading-spinner');
    if (loader) loader.style.display = 'none';
}
// Add this helper function to handle the safe data
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
    modalImg.loading = "eager"; 

    const callBtn = document.getElementById('callContact');
    const waBtn = document.getElementById('whatsappContact');
    const tgBtn = document.getElementById('telegramContact');
    const shareTgBtn = document.getElementById('shareTgBtn');
    
    const phone = product.phone_number;
    const tgUser = (product.telegram_username || product.seller_telegram || "").replace('@', '');

    if (callBtn && phone) {
        callBtn.href = `tel:${phone}`;
        callBtn.style.display = "flex";
    }

    if (waBtn && phone) {
        const cleanPhone = phone.replace(/\D/g, '');
        const waMsg = encodeURIComponent(`Hello! I want to buy your "${product.name}" for ${product.price} ETB on Golem. Is it still available?`);
        waBtn.href = `https://wa.me/${cleanPhone}?text=${waMsg}`;
        waBtn.style.display = "flex";
    }

    if (tgBtn && tgUser) {
        tgBtn.href = `https://t.me/${tgUser.replace('@', '')}`;
        tgBtn.style.display = "flex";
    }

    if (shareTgBtn) {
        const shareUrl = window.location.href; 
        const shareText = encodeURIComponent(`🔥 Check out this ${product.name}!\n💰 Price: ${product.price} ETB\n\nContact seller on Golem:`);
        shareTgBtn.href = `https://t.me/share/url?url=${shareUrl}&text=${shareText}`;
        shareTgBtn.style.display = "flex";
    }

    const cartBtn = document.querySelector('.add-to-cart-btn');
    if (cartBtn) {
        cartBtn.onclick = () => addToCart(product);
    }

    modal.style.display = 'flex';
    if(product.id) _supabase.rpc('increment_views', { row_id: product.id });
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
        cart.push({ id: product.id, name: product.name, price: product.price, image: product.image });
        localStorage.setItem('golem_cart', JSON.stringify(cart));
        updateCartBadge();
        alert("Saved to your list!");
    } else {
        alert("Already in your list.");
    }
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

// --- 2. AUTH & MODAL LOGIC (Global Access) ---
// --- 2. AUTH & MODAL LOGIC (Global Access) ---
window.toggleModal = function() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.style.display = (modal.style.display === 'flex') ? 'none' : 'flex';
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

    const { data, error } = await _supabase.auth.signInWithPassword({ email, password });

    if (error) alert("Login Error: " + error.message);
    else {
        alert("Welcome back!");
        window.location.reload();
    }
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
async function loadDynamicFilters() {
    const container = document.querySelector('.filter-bar');
    if (!container) return;

    const { data: cats, error } = await _supabase.from('categories').select('name').order('name');
    if (error) return;

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

async function updateUIForUser() {
    const { data: { user } } = await _supabase.auth.getUser();
    const authContainer = document.querySelector('.auth-buttons');
    const signinBtn = document.querySelector('.signin-btn');
    
    if (user) {
        // 1. Change Sign In button to Sign Out
        if (signinBtn) {
            signinBtn.innerText = "Sign Out";
            signinBtn.onclick = async () => {
                await _supabase.auth.signOut();
                alert("You have been signed out.");
                window.location.reload();
            };
        }
        
        // 2. Optional: Show a "Welcome" message or User Email
        console.log("Logged in as:", user.email);
    } else {
        // 1. Ensure button says Sign In
        if (signinBtn) {
            signinBtn.innerText = "Sign In";
            signinBtn.onclick = () => window.toggleModal();
        }
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


window.handleSignUp = async (event) => {
    event.preventDefault();
    const email = event.target.querySelector('input[type="email"]').value;
    const password = event.target.querySelector('input[type="password"]').value;

    const { data, error } = await _supabase.auth.signUp({
        email: email,
        password: password,
    });

    if (error) {
        alert("Registration Error: " + error.message);
    } else {
        alert("Check your email for the confirmation link!");
        toggleModal();
    }
};

// --- SELL BUTTON GATEKEEPER ---
window.checkAuthToSell = async function() {
    // Check if a user is currently logged in
    const { data: { user } } = await _supabase.auth.getUser();

    if (user) {
        // If logged in, send them to the sell page
        window.location.href = 'sell.html'; 
    } else {
        // If not logged in, show a friendly alert and open the login modal
        alert("Please Sign In first to post an item for sale.");
        window.toggleModal();
    }
};

