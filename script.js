// --- 1. INITIALIZATION & GLOBAL STATE ---
let currentProduct = null;

document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 Golem System Initializing...");
    
    // Auth & UI Setup
    await window.updateUIForUser();
    window.updateCartBadge();
    
    // Initial Data Fetch
    window.fetchProducts();
    window.loadSponsor();

    // Search Logic
    const searchInput = document.getElementById('headerSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => filterSearch(e.target.value.toLowerCase()));
    }
});

// --- 2. DATA FETCHING ---
window.fetchProducts = async (category = 'All') => {
    const grid = document.getElementById('productGrid');
    if (grid) grid.innerHTML = '<div class="loading-spinner"><i class="fas fa-circle-notch fa-spin"></i> Loading...</div>';

    const sortOrder = document.getElementById('sortSelect')?.value || 'newest';

    let query = _supabase
        .from('products')
        .select('*')
        .eq('status', 'approved');

    if (category !== 'All') {
        query = query.eq('category', category);
    }

    // Master Sorting: Sponsored > Featured > User Preference
    query = query
        .order('is_sponsored', { ascending: false })
        .order('is_featured', { ascending: false });

    if (sortOrder === 'price_low') {
        query = query.order('price', { ascending: true });
    } else if (sortOrder === 'price_high') {
        query = query.order('price', { ascending: false });
    } else {
        query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;
    if (!error) {
        renderProducts(data);
    } else {
        console.error("Fetch error:", error.message);
    }
};

// --- 3. WISHLIST / WHITELIST LOGIC ---
window.toggleWishlist = function(id, btnElement) {
    try {
        let saved = JSON.parse(localStorage.getItem('golem_saved') || '[]');
        const icon = btnElement.querySelector('i');

        if (saved.includes(id)) {
            saved = saved.filter(itemId => itemId !== id);
            btnElement.classList.remove('active');
            if (icon) {
                icon.classList.remove('fas');
                icon.classList.add('far');
            }
        } else {
            saved.push(id);
            btnElement.classList.add('active');
            if (icon) {
                icon.classList.remove('far');
                icon.classList.add('fas');
            }
        }

        localStorage.setItem('golem_saved', JSON.stringify(saved));
        window.updateCartBadge();
    } catch (e) {
        console.error("Wishlist error:", e);
    }
};

// THE MISSING FUNCTION FIXED
window.addToCartFromModal = function() {
    if (!currentProduct) return;
    
    let saved = JSON.parse(localStorage.getItem('golem_saved') || '[]');
    
    if (!saved.includes(currentProduct.id)) {
        saved.push(currentProduct.id);
        localStorage.setItem('golem_saved', JSON.stringify(saved));
        window.updateCartBadge();
        
        // Refresh the grid in the background so the heart icon updates there too
        window.fetchProducts();
        
        alert("❤️ Added to your Whitelist!");
    } else {
        alert("This item is already in your Whitelist!");
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

// --- 4. RENDERING ENGINE ---
function renderProducts(products) {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    if (products.length === 0) {
        grid.innerHTML = `<div style="text-align:center; grid-column:1/-1; padding:60px; color:#888;">No items found.</div>`;
        return;
    }

    const savedItems = JSON.parse(localStorage.getItem('golem_saved') || '[]');
    const now = new Date();

    grid.innerHTML = products.map(p => {
        const safeData = encodeURIComponent(JSON.stringify(p));
        const isSold = p.status === 'sold';
        const isSaved = savedItems.includes(p.id);
        
        const isSponsored = p.is_sponsored && p.sponsored_until && new Date(p.sponsored_until) > now;
        const isFeatured = p.is_featured;

        let statusBadge = '';
        if (isSponsored) {
            statusBadge = `<div class="badge sponsor-badge"><i class="fas fa-ad"></i> Sponsored</div>`;
        } else if (isFeatured) {
            statusBadge = `<div class="badge feature-badge"><i class="fas fa-star"></i> Featured</div>`;
        }

        const rawPhone = (p.seller_phone || "").replace(/\D/g, '');
        const cleanPhone = rawPhone.startsWith('0') ? '251' + rawPhone.substring(1) : rawPhone;
        const tgUser = (p.telegram_username || "").replace('@', '');

        return `
            <div class="product-card ${isSold ? 'is-sold' : ''} ${isSponsored ? 'is-sponsored' : ''} ${isFeatured && !isSponsored ? 'is-featured' : ''}">
                <div class="card-img-container">
                    ${isSold ? '<div class="sold-watermark">SOLD</div>' : ''}
                    ${statusBadge}
                    
                    <button class="wishlist-btn ${isSaved ? 'active' : ''}" 
                            onclick="window.toggleWishlist('${p.id}', this)" 
                            title="Save for Later">
                        <i class="${isSaved ? 'fas' : 'far'} fa-heart"></i>
                    </button>

                    <img src="${p.image}" alt="${p.name}" loading="lazy">
                    <div class="image-overlay">
                        <button class="view-btn" onclick="window.openProductDetailsSafe('${safeData}')">Quick View</button>
                    </div>
                </div>
                <div class="product-info">
                    <span class="category-badge">${p.category || 'General'}</span>
                    <h3 class="product-title">${p.name}</h3>
                    <div class="product-price">${p.price?.toLocaleString()} ETB</div>
                    
                    <div class="quick-contact-bar">
                        <a href="tel:+${cleanPhone}" class="contact-icon call"><i class="fas fa-phone-alt"></i></a>
                        <a href="https://t.me/${tgUser || '+'+cleanPhone}" target="_blank" class="contact-icon telegram"><i class="fab fa-telegram-plane"></i></a>
                        <a href="https://wa.me/${cleanPhone}?text=I'm interested in ${p.name}" target="_blank" class="contact-icon whatsapp"><i class="fab fa-whatsapp"></i></a>
                    </div>

                    <div class="product-actions">
                        <button class="buy-btn" onclick="window.openProductDetailsSafe('${safeData}')" style="width: 100%;">
                            <i class="fas fa-info-circle"></i> Full Details
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// --- 5. SPONSORSHIP & FILTERING ---
window.loadSponsor = async () => {
    try {
        const now = new Date().toISOString();
        const { data: product } = await _supabase
            .from('products')
            .select('*')
            .eq('is_sponsored', true)
            .gt('sponsored_until', now)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        const sponsorSection = document.getElementById('mainSponsor');
        if (product && sponsorSection) {
            document.getElementById('sponsorImg').src = product.image;
            document.getElementById('sponsorTitle').innerText = product.name;
            document.getElementById('sponsorDesc').innerText = product.description?.substring(0, 100) + "...";
            document.getElementById('sponsorLink').href = `checkout.html?id=${product.id}`;
            sponsorSection.style.display = 'block';
        }
    } catch (err) { console.error("Sponsor load error", err); }
};

window.filterCategory = (category, button) => {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    window.fetchProducts(category);
};

window.filterSponsored = async () => {
    const now = new Date().toISOString();
    const { data } = await _supabase
        .from('products')
        .select('*')
        .eq('is_sponsored', true)
        .gt('sponsored_until', now);
    
    if (data) renderProducts(data);
};

function filterSearch(term) {
    const cards = document.querySelectorAll('.product-card');
    cards.forEach(card => {
        const title = card.querySelector('.product-title').innerText.toLowerCase();
        card.style.display = title.includes(term) ? 'block' : 'none';
    });
}

// --- 6. MODAL & VIEW LOGIC ---
window.openProductDetailsSafe = (encodedData) => {
    try {
        const product = JSON.parse(decodeURIComponent(encodedData));
        window.openProductModal(product);
    } catch (e) { console.error("Error parsing product", e); }
};

window.openProductModal = (product) => {
    currentProduct = product;
    const modal = document.getElementById('productModal');
    if (!modal) return;

    document.getElementById('modalProductImg').src = product.image;
    document.getElementById('modalProductTitle').innerText = product.name;
    document.getElementById('modalProductPrice').innerText = product.price.toLocaleString() + " ETB";
    document.getElementById('modalProductDesc').innerText = product.description || "No description.";

    const cleanPhone = (product.seller_phone || "").replace(/\D/g, '');
    let intPhone = cleanPhone.startsWith('0') ? '251' + cleanPhone.substring(1) : cleanPhone;

    document.getElementById('callContact').href = `tel:+${intPhone}`;
    const tgUser = (product.telegram_username || "").replace('@', '');
    document.getElementById('telegramOrder').href = tgUser ? `https://t.me/${tgUser}` : `https://t.me/+${intPhone}`;
    document.getElementById('whatsappOrder').href = `https://wa.me/${intPhone}?text=I'm interested in ${product.name}`;

    modal.style.display = 'flex';
    document.body.style.overflow = "hidden";
};

window.closeProductModal = () => {
    const modal = document.getElementById('productModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = "auto";
};

// --- 7. AUTHENTICATION SYSTEM ---
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

window.toggleModal = () => {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.style.display = (modal.style.display === 'flex') ? 'none' : 'flex';
        document.body.style.overflow = (modal.style.display === 'flex') ? 'hidden' : 'auto';
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
            document.body.classList.add('is-admin');
        }
    } else {
        if (adminLink) adminLink.style.display = 'none';
    }
};

window.checkAuthToSell = async () => {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) {
        alert("Please Sign In first!");
        window.toggleModal();
    } else {
        window.location.href = 'sell.html';
    }
};

// --- 8. UTILITIES & SHARING ---
window.shareToTelegram = () => {
    const url = encodeURIComponent(window.location.origin);
    window.open(`https://t.me/share/url?url=${url}&text=Check out Golem Furniture!`, '_blank');
};

window.shareToWhatsApp = () => {
    const url = encodeURIComponent(window.location.origin);
    window.open(`https://wa.me/?text=Check out Golem! ${url}`, '_blank');
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
        const modal = document.getElementById('supportModal');
        if (modal) modal.style.display = 'none';
    }
};

// --- SUPPORT MODAL LOGIC ---
window.toggleSupportModal = function() {
    const modal = document.getElementById('supportModal');
    if (modal) {
        const isCurrentlyFlex = modal.style.display === 'flex';
        modal.style.display = isCurrentlyFlex ? 'none' : 'flex';
        document.body.style.overflow = isCurrentlyFlex ? 'auto' : 'hidden';
    } else {
        console.error("Support Modal element not found in HTML");
    }
};

const backToTopBtn = document.getElementById('backToTop');

// Show button when user scrolls down 400px
window.addEventListener('scroll', () => {
    if (window.scrollY > 400) {
        backToTopBtn.classList.add('show');
    } else {
        backToTopBtn.classList.remove('show');
    }
});

// Smooth scroll to top when clicked
backToTopBtn.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});


// --- 1. SET INITIAL STATE ---
// We check localStorage so the user's choice is remembered after refresh
let currentLang = localStorage.getItem('golem_lang') || 'en';

// --- 2. MAKE THE FUNCTION GLOBAL ---
// Attaching it to 'window' fixes the ReferenceError
window.toggleLanguage = function() {
    currentLang = currentLang === 'en' ? 'am' : 'en';
    localStorage.setItem('golem_lang', currentLang);
    applyLanguage();
    console.log("Language switched to: " + currentLang);
};

// --- 3. APPLY THE TRANSLATIONS ---
function applyLanguage() {
    const langBtnText = document.getElementById('langText');
    
    // Select all elements that have a 'data-am' attribute
    const translatableElements = document.querySelectorAll('[data-am]');

    if (currentLang === 'am') {
        if (langBtnText) langBtnText.innerText = "English";
        
        translatableElements.forEach(el => {
            // Save the original English text if we haven't already
            if (!el.dataset.en) el.dataset.en = el.innerText; 
            el.innerText = el.dataset.am;
        });
    } else {
        if (langBtnText) langBtnText.innerText = "አማርኛ";
        
        translatableElements.forEach(el => {
            // Restore the saved English text
            if (el.dataset.en) el.innerText = el.dataset.en;
        });
    }
}

// --- 4. RUN ON LOAD ---
document.addEventListener('DOMContentLoaded', applyLanguage);

// Run on page load
document.addEventListener('DOMContentLoaded', applyLanguage);



function toggleChatMenu() {
    const menu = document.getElementById('chatMenu');
    menu.classList.toggle('active');
}

// Close menu if user clicks anywhere else on the screen
window.addEventListener('click', function(e) {
    const chatContainer = document.querySelector('.floating-chat');
    if (!chatContainer.contains(e.target)) {
        document.getElementById('chatMenu').classList.remove('active');
    }
});

window.addEventListener('DOMContentLoaded', () => {
    // Show the welcome message after 5 seconds
    setTimeout(() => {
        const toast = document.getElementById('chatToast');
        if (toast) {
            toast.style.display = 'block';
        }
    }, 5000);
});

// Update your existing toggleChatMenu to hide the toast when clicked
function toggleChatMenu() {
    const menu = document.getElementById('chatMenu');
    const toast = document.getElementById('chatToast');
    
    menu.classList.toggle('active');
    
    // Hide toast once the user interacts
    if (toast) {
        toast.style.display = 'none';
    }
}
