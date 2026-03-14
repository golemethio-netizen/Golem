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


function renderProductCard(product) {
    // Format price with a comma for a more professional look
    const formattedPrice = new Intl.NumberFormat().format(product.price);

    return `
        <div class="product-card" id="card-${product.id}">
            <div class="card-img-container">
                <img src="${product.image}" alt="${product.name}" loading="lazy">
                <div class="image-overlay">
                    <button class="view-btn" onclick="openDetails('${product.id}')">
                        <i class="fas fa-expand"></i> Quick View
                    </button>
                </div>
            </div>
            
            <div class="card-content" style="padding: 20px;">
                <span class="category-badge">${product.category || 'General'}</span>
                <h3 class="product-title">${product.name}</h3>
                <p class="product-description" style="color: #777; font-size: 0.85rem; height: 40px; overflow: hidden;">
                    ${product.description || 'Premium quality item from Golem Marketplace.'}
                </p>
                
                <div class="card-footer" style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px;">
                    <span class="product-price">${formattedPrice} <small style="font-size: 0.7rem;">ETB</small></span>
                    <button class="contact-btn" onclick="contactSeller('${product.id}')" 
                            style="background: #007bff; color: white; border: none; padding: 8px 15px; border-radius: 8px; cursor: pointer; font-weight: 500;">
                        Interested
                    </button>
                </div>
            </div>
        </div>
    `;
}.join('');

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
    const signinBtn = document.querySelector('.signin-btn');
    
    if (!signinBtn) return;

    if (user) {
        signinBtn.innerText = "Sign Out";
        signinBtn.onclick = async () => {
            await _supabase.auth.signOut();
            alert("Signed out successfully");
            window.location.reload();
        }; // End of onclick
    } else {
        signinBtn.innerText = "Sign In";
        signinBtn.onclick = () => window.toggleModal();
    } // End of if-else
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
