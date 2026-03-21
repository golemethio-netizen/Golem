// --- 1. INITIALIZATION & HEARTBEAT ---
let currentProduct = null; // Use this name everywhere to avoid errors
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
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    if (products.length === 0) {
        grid.innerHTML = `<div style="text-align:center; grid-column:1/-1; padding:60px; color:#888;">No items found.</div>`;
    } else {
        grid.innerHTML = products.map(p => {
            const safeData = encodeURIComponent(JSON.stringify(p));
            const isSold = p.status === 'sold';
            const condition = p.status_condition || 'New';
            const condClass = getConditionClass(condition);
            
            const verifiedNames = ['Crown Time', 'Crown Time Furniture', 'Golem Admin'];
            const isVerified = verifiedNames.includes(p.seller_name);
            const verifiedBadge = isVerified ? `<i class="fas fa-check-circle" style="color: #007bff; margin-left: 4px;"></i>` : '';

            // Formatting for quick Telegram/Phone check
            const rawPhone = p.seller_phone || p.phone_number || '';
            const tg = (p.telegram_username || '').replace('@', '');

            return `
                <div class="product-card ${isSold ? 'is-sold' : ''}">
                    <div class="card-img-container">
                        ${isSold ? '<div class="sold-watermark">SOLD</div>' : ''}
                        <img src="${p.image}" alt="${p.name}" loading="lazy">
                        <div class="image-overlay">
                            <button class="view-btn" onclick="window.openProductDetailsSafe('${safeData}')">Quick View</button>
                        </div>
                        <span class="status-badge ${condClass}">${condition}</span>
                    </div>
                    <div class="product-info">
                        <span class="category-badge">${p.category || 'General'}</span>
                        <h3 class="product-title">${p.name}</h3>
                        <div class="seller-line" style="font-size: 0.85rem; color: #666; margin-bottom: 5px;">
                            <i class="fas fa-user-circle"></i> ${p.seller_name || 'Seller'} ${verifiedBadge}
                        </div>
                        <div class="product-price">${p.price?.toLocaleString()} ETB</div>
                        
                        <div class="product-actions">
                            <button class="buy-btn" onclick="window.openProductDetailsSafe('${safeData}')">View Details</button>
                            ${tg ? `<a href="https://t.me/${tg}" target="_blank" class="share-btn"><i class="fab fa-telegram-plane"></i></a>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
}

// --- 3. MODAL & CONTACT LOGIC ---
window.openProductDetailsSafe = function(encodedData) {
    try {
        const product = JSON.parse(decodeURIComponent(encodedData));
        window.openProductModal(product);
    } catch (e) { console.error("Error parsing product data", e); }
};

window.openProductModal = function(product) {
    currentProduct = product; // Set the global variable
    const modal = document.getElementById('productModal');
    if (!modal) return;

    // 1. Fill UI
    document.getElementById('modalProductImg').src = product.image;
    document.getElementById('modalProductTitle').innerText = product.name;
    document.getElementById('modalProductPrice').innerText = product.price.toLocaleString() + " ETB";
    document.getElementById('modalProductDesc').innerText = product.description || "No description provided.";

    // 2. Update the 'View Full Page' link
    const detailsBtn = document.getElementById('viewFullDetails');
    if (detailsBtn) {
        detailsBtn.href = `checkout.html?id=${product.id}`;
    }

    // 3. Format Phone for Ethiopia (+251)
    const rawPhone = product.seller_phone || product.phone_number || '';
    const cleanPhone = rawPhone.replace(/\s+/g, '').replace(/-/g, '');
    
    let internationalPhone = cleanPhone;
    if (internationalPhone.startsWith('0')) {
        internationalPhone = '251' + internationalPhone.substring(1);
    } else if (internationalPhone.startsWith('+')) {
        internationalPhone = internationalPhone.substring(1);
    }

    // 4. Update Contact Buttons
    const callBtn = document.getElementById('callContact');
    if (callBtn) callBtn.href = cleanPhone ? `tel:${cleanPhone}` : '#';

    const tgBtn = document.getElementById('telegramOrder');
    const tgUser = (product.telegram_username || "").replace('@', '');
    if (tgBtn) {
        tgBtn.href = tgUser ? `https://t.me/${tgUser}` : `https://t.me/+${internationalPhone}`;
    }

    const waBtn = document.getElementById('whatsappOrder');
    const orderMsg = encodeURIComponent(`Hello! I'm interested in "${product.name}" on Golem.`);
    if (waBtn) waBtn.href = `https://wa.me/${internationalPhone}?text=${orderMsg}`;

    // 5. Show the modal
    modal.style.display = 'flex';
    document.body.style.overflow = "hidden"; 
};

window.closeProductModal = () => {
    document.getElementById('productModal').style.display = 'none';
    document.body.style.overflow = "auto";
};

// --- 4. HELPERS ---
function getConditionClass(condition) {
    if (!condition) return 'cond-default';
    const c = condition.toLowerCase();
    if (c.includes('new') && !c.includes('used')) return 'cond-new';
    if (c.includes('like new')) return 'cond-used-like-new';
    if (c.includes('fair') || c.includes('used')) return 'cond-used-fair';
    if (c.includes('refurbished')) return 'cond-refurbished';
    return 'cond-default';
}

function filterSearch(term) {
    const cards = document.querySelectorAll('.product-card');
    cards.forEach(card => {
        const title = card.querySelector('.product-title').innerText.toLowerCase();
        card.style.display = title.includes(term) ? 'block' : 'none';
    });
}

// --- 5. AUTH & ACCOUNT LOGIC ---
window.updateUIForUser = async function() {
    const { data: { user } } = await _supabase.auth.getUser();
    const signinBtn = document.querySelector('.signin-btn');
    const adminLink = document.getElementById('adminNavLink');

    if (user) {
        if (signinBtn) {
            signinBtn.innerHTML = `<i class="fas fa-sign-out-alt"></i> <p>Sign Out</p>`;
            signinBtn.onclick = async () => { 
                await _supabase.auth.signOut(); 
                window.location.reload(); 
            };
        }
        if (adminLink && user.email === 'yohannes.surafel@gmail.com') {
            adminLink.style.display = 'flex';
        }
    } else {
        if (adminLink) adminLink.style.display = 'none';
    }
};

window.toggleModal = () => {
    const m = document.getElementById('authModal');
    if (!m) return;
    m.style.display = (m.style.display === "flex") ? "none" : "flex";
    document.body.style.overflow = (m.style.display === "flex") ? "hidden" : "auto";
};

let isSignUpMode = false;
window.toggleAuthMode = function() {
    isSignUpMode = !isSignUpMode;
    const title = document.getElementById('modalTitle');
    const submitBtn = document.getElementById('authSubmitBtn');
    const regFields = document.getElementById('registerFields');
    const toggleLink = document.getElementById('toggleText');

    if (isSignUpMode) {
        title.innerText = "Create Account";
        submitBtn.innerText = "Sign Up";
        regFields.style.display = "block";
        toggleLink.innerHTML = 'Already have an account? <a href="#" onclick="window.toggleAuthMode()">Sign In</a>';
    } else {
        title.innerText = "Welcome Back";
        submitBtn.innerText = "Sign In";
        regFields.style.display = "none";
        toggleLink.innerHTML = 'Don\'t have an account? <a href="#" onclick="window.toggleAuthMode()">Sign Up</a>';
    }
};

window.handleAuth = async function(e) {
    e.preventDefault();
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const btn = document.getElementById('authSubmitBtn');

    btn.disabled = true;
    btn.innerText = "Processing...";

    if (isSignUpMode) {
        const fullName = document.getElementById('regName').value;
        const phone = document.getElementById('regPhone').value;
        const { error } = await _supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName, phone_number: phone } }
        });
        if (error) alert("Error: " + error.message);
        else { alert("Check your email for confirmation!"); window.toggleModal(); }
    } else {
        const { error } = await _supabase.auth.signInWithPassword({ email, password });
        if (error) alert("Login failed: " + error.message);
        else window.location.reload(); 
    }
    btn.disabled = false;
};

// --- 6. SUPPORT & MISC ---
window.toggleSupportModal = () => {
    const modal = document.getElementById('supportModal');
    if(modal) modal.style.display = (modal.style.display === 'flex') ? 'none' : 'flex';
};

window.handleSupportSubmit = async function(e) {
    e.preventDefault();
    const email = document.getElementById('supportEmail').value;
    const subject = document.getElementById('supportSubject').value;
    const msg = document.getElementById('supportMessage').value;

    const { error } = await _supabase.from('support_tickets').insert([{ user_email: email, subject: subject, message: msg }]);

    if (error) alert("Error: " + error.message);
    else {
        alert("Message sent! We'll get back to you soon.");
        e.target.reset();
        window.toggleSupportModal();
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



window.shareToTelegram = () => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent("Check out Golem Marketplace! Buy and sell furniture easily.");
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
};

window.shareToWhatsApp = () => {
    const text = encodeURIComponent("Check out Golem Marketplace! " + window.location.href);
    window.open(`https://wa.me/?text=${text}`, '_blank');
};


window.addToCartFromModal = () => {
    if (!currentProduct) {
        console.error("No product selected!");
        return;
    }

    const productId = currentProduct.id;
    let saved = JSON.parse(localStorage.getItem('golem_saved')) || [];

    if (!saved.includes(productId)) {
        saved.push(productId);
        localStorage.setItem('golem_saved', JSON.stringify(saved));
        
        // Show the count on the heart icon
        window.updateCartBadge();
        alert("❤️ Item saved to your list!");
    } else {
        alert("This item is already in your saved list.");
    }
};

function updateCartBadge() {
    const saved = JSON.parse(localStorage.getItem('golem_saved')) || [];
    const badge = document.getElementById('cartBadge');
    if (badge) {
        badge.innerText = saved.length;
        badge.style.display = saved.length > 0 ? 'block' : 'none';
    }
}


// This makes the function global so the HTML onclick can find it
window.filterCategory = (category, button) => {
    // 1. Handle the UI (Active class)
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    // 2. Run the actual fetch/filter logic
    // We pass the category to your fetch function
    fetchProducts(category); 
};

// Also ensure fetchProducts is accessible if called from HTML
window.fetchProducts = async (category = 'All') => {
    const grid = document.getElementById('productGrid');
    grid.innerHTML = '<div class="loading">Loading items...</div>';

    let query = _supabase.from('products').select('*');

    // Filter logic
    if (category !== 'All') {
        query = query.eq('category', category);
    }

    // Sort logic (using your existing sortSelect)
    const sort = document.getElementById('sortSelect').value;
    if (sort === 'price_low') query = query.order('price', { ascending: true });
    else if (sort === 'price_high') query = query.order('price', { ascending: false });
    else query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
        console.error("Error fetching products:", error);
        return;
    }

    renderProducts(data);
};

// Call updateCartBadge on page load
document.addEventListener('DOMContentLoaded', updateCartBadge);


// Add this at the end of script.js
window.checkAuthToSell = () => {
    const user = supabase.auth.user();
    if (!user) {
        alert("Please Sign In to sell items!");
        window.toggleModal(); // Opens the login modal
    } else {
        window.location.href = 'sell.html'; // Or wherever your sell page is
    }
};

window.toggleModal = () => {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.style.display = (modal.style.display === 'flex') ? 'none' : 'flex';
    }
};

window.toggleSupportModal = () => {
    const modal = document.getElementById('supportModal');
    if (modal) {
        modal.style.display = (modal.style.display === 'flex') ? 'none' : 'flex';
    }
};

// Function to toggle Full Image Mode on Computer
function toggleFullScreenImage() {
    const imgWrapper = document.querySelector('.modal-img-wrapper');
    if (imgWrapper) {
        imgWrapper.style.height = imgWrapper.style.height === '80vh' ? '300px' : '80vh';
        imgWrapper.style.cursor = imgWrapper.style.height === '80vh' ? 'zoom-out' : 'zoom-in';
    }
}

// Add event listener to the modal image wrapper
document.querySelector('.modal-img-wrapper').addEventListener('dblclick', toggleFullScreenImage);

// --- Updated Saved Item Card Template ---
function createSavedItemCard(item) {
    return `
    <div class="product-card" data-id="${item.id}">
        <button class="remove-btn" onclick="removeItem(${item.id})" title="Remove from saved">
            <i class="fas fa-times"></i>
        </button>
        
        <div class="card-img-container" onclick="openProductModal(${item.id})">
            <img src="${item.image}" alt="${item.name}">
        </div>
        
        <div class="product-info">
            <h3 class="product-title">${item.name}</h3>
            <p class="product-price">${item.price} ETB</p>
        </div>
    </div>
    `;
}
