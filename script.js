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

    const now = new Date();
    const hour = now.getHours();
    const dot = document.querySelector('.online-dot');
    if (dot) {
        dot.style.display = (hour >= 8 && hour < 20) ? 'block' : 'none';
    }

    setTimeout(() => {
        const toast = document.getElementById('chatToast');
        if (toast && !document.getElementById('chatMenu').classList.contains('active')) {
            toast.style.display = 'block';
        }
    }, 5000);
    
    const searchInput = document.getElementById('headerSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => filterSearch(e.target.value.toLowerCase()));
    }
});



/// 1. Toggle Modal Visibility
window.toggleModal = () => {
    const modal = document.getElementById('authModal');
    if (modal) {
        const isFlex = modal.style.display === 'flex';
        modal.style.display = isFlex ? 'none' : 'flex';
        document.body.style.overflow = isFlex ? 'auto' : 'hidden';
    }
};




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

window.addToCartFromModal = function() {
    if (!currentProduct) return;
    let saved = JSON.parse(localStorage.getItem('golem_saved') || '[]');
    if (!saved.includes(currentProduct.id)) {
        saved.push(currentProduct.id);
        localStorage.setItem('golem_saved', JSON.stringify(saved));
        window.updateCartBadge();
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

        const shareText = encodeURIComponent(`Check out this ${p.name} on Golem Furniture!`);
        const baseUrl = window.location.href.split('?')[0].split('#')[0].replace('index.html', '');
        const shareUrl = encodeURIComponent(`${baseUrl}product.html?id=${p.id}`);

        return `
            <div class="product-card ${isSold ? 'is-sold' : ''} ${isSponsored ? 'is-sponsored' : ''} ${isFeatured && !isSponsored ? 'is-featured' : ''}">
                <div class="card-img-container">
                    ${isSold ? '<div class="sold-watermark">SOLD</div>' : ''}
                    ${statusBadge}
                    <button class="wishlist-btn ${isSaved ? 'active' : ''}" onclick="window.toggleWishlist('${p.id}', this)">
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
                        <a href="https://t.me/share/url?url=${shareUrl}&text=${shareText}" target="_blank" class="contact-icon share" style="background:#6c5ce7; color:white;">
                            <i class="fas fa-share-alt"></i>
                        </a>
                    </div>
                    <div class="product-actions">
                        <button class="buy-btn" onclick="window.openProductDetailsSafe('${safeData}')" style="width: 100%;">
                            <i class="fas fa-info-circle"></i> Full Details
                        </button>
                    </div>
                </div>
            </div>`;
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

window.closeProductModal = () => {
    const modal = document.getElementById('productModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = "auto";
};

// --- 7. AUTHENTICATION SYSTEM ---
let isSignUpMode = false;

// 1. Toggle between Login and Register
// 2. Toggle between Login and Register
window.toggleAuthMode = function() {
    const fields = document.getElementById('registerFields');
    const title = document.getElementById('modalTitle');
    const btn = document.getElementById('authSubmitBtn');
    const toggleText = document.getElementById('toggleText');

    if (fields.style.display === 'none' || fields.style.display === '') {
        fields.style.display = 'block';
        title.innerText = "Create Account";
        btn.innerText = "Sign Up";
        toggleText.innerHTML = 'Already have an account? <a href="#" onclick="window.toggleAuthMode()">Sign In</a>';
    } else {
        fields.style.display = 'none';
        title.innerText = "Welcome Back";
        btn.innerText = "Sign In";
        toggleText.innerHTML = 'Don\'t have an account? <a href="#" onclick="window.toggleAuthMode()">Sign Up</a>';
    }
};


// 3. Handle the actual Auth
window.handleAuth = async (event) => {
    event.preventDefault();
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const isSignUp = document.getElementById('registerFields').style.display === 'block';
    const btn = document.getElementById('authSubmitBtn');

    btn.disabled = true;
    const originalText = btn.innerText;
    btn.innerText = "Processing...";

    try {
        if (isSignUp) {
            const { error } = await _supabase.auth.signUp({
                email, password,
                options: { data: { 
                    full_name: document.getElementById('regName').value,
                    phone: document.getElementById('regPhone').value 
                }}
            });
            if (error) throw error;
            alert("Success! Check your email to confirm.");
        } else {
            const { error } = await _supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            window.location.reload();
        }
    } catch (err) {
        alert(err.message);
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
};



window.updateUIForUser = async function() {
    const { data: { user } } = await _supabase.auth.getUser();
    
    const signInBtn = document.getElementById('signInBtn');
    const signOutBtn = document.getElementById('signOutBtn');
    const welcomeDiv = document.getElementById('userWelcome');
    const nameSpan = document.getElementById('userName');

    if (user) {
        // Switch buttons
        if (signInBtn) signInBtn.style.display = 'none';
        if (signOutBtn) signOutBtn.style.display = 'flex';

        // Fetch user metadata for the name
        const { data: profile } = await _supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .maybeSingle();

        if (welcomeDiv && nameSpan) {
            // Priority: Database Name -> Metadata Name -> Email prefix
            const displayName = profile?.full_name || 
                                user.user_metadata?.full_name || 
                                user.email.split('@')[0];
            
            nameSpan.innerText = displayName;
            welcomeDiv.style.display = 'flex';
        }
    } else {
        // Reset to Guest mode
        if (signInBtn) signInBtn.style.display = 'flex';
        if (signOutBtn) signOutBtn.style.display = 'none';
        if (welcomeDiv) welcomeDiv.style.display = 'none';
    }
};

// Important: Run this every time the page loads
document.addEventListener('DOMContentLoaded', window.updateUIForUser);


// --- 8. ADMIN & USER MGMT ---
async function loadUsers() {
    const list = document.getElementById('userList');
    if (!list) return;
    list.innerHTML = "<div class='loading-spinner'><i class='fas fa-sync fa-spin'></i> Syncing...</div>";

    const { data: users, error } = await _supabase
        .from('profiles') 
        .select('*')
        .order('created_at', { ascending: false });

    if (error || !users) {
        list.innerHTML = `<p style="color:#ff4757; padding:20px;">Error: ${error?.message || 'Unauthorized'}</p>`;
        return;
    }

    list.innerHTML = `
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="text-align: left; border-bottom: 2px solid #f4f7f6; color: #888;">
                        <th style="padding: 15px;">NAME</th>
                        <th style="padding: 15px;">EMAIL</th>
                        <th style="padding: 15px;">STATUS</th>
                        <th style="padding: 15px; text-align: right;">ACTIONS</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(u => `
                        <tr style="border-bottom: 1px solid #f4f7f6;">
                            <td style="padding: 10px 15px;">${u.full_name || 'Member'}</td>
                            <td style="padding: 10px 15px;">${u.email}</td>
                            <td style="padding: 10px 15px;">${u.is_admin ? 'Admin' : 'User'}</td>
                            <td style="padding: 10px 15px; text-align: right;">
                                <button onclick="window.toggleVerification('${u.id}', ${u.is_verified})">Verify</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`;
}

window.toggleVerification = async (userId, currentStatus) => {
    const { error } = await _supabase
        .from('profiles')
        .update({ is_verified: !currentStatus })
        .eq('id', userId);
    if (!error) loadUsers();
    else alert("Error: " + error.message);
};

window.openProductModal = async (product) => {
    currentProduct = product;
    const modal = document.getElementById('productModal');
    if (!modal) return;

    document.getElementById('modalProductImg').src = product.image;
    document.getElementById('modalProductTitle').innerText = product.name;
    document.getElementById('modalProductPrice').innerText = product.price.toLocaleString() + " ETB";
    document.getElementById('modalProductDesc').innerText = product.description || "No description.";

    const cleanPhone = (product.seller_phone || "").replace(/\D/g, '');
    let intPhone = cleanPhone.startsWith('0') ? '251' + cleanPhone.substring(1) : cleanPhone;

    const { data: profile } = await _supabase
        .from('profiles')
        .select('is_verified')
        .eq('phone', product.seller_phone)
        .maybeSingle();

    const isVerified = profile?.is_verified || false;
    const whatsappTarget = isVerified ? intPhone : GolemConfig.myPhone;
    const waPrefix = isVerified ? "" : "[UNVERIFIED SELLER] ";
    
    document.getElementById('whatsappOrder').href = `https://wa.me/${whatsappTarget}?text=${encodeURIComponent(waPrefix + "I'm interested in " + product.name)}`;

    const tgUser = (product.telegram_username || "").replace('@', '');
    document.getElementById('telegramOrder').href = tgUser ? `https://t.me/${tgUser}` : `https://t.me/+${intPhone}`;
    document.getElementById('callContact').href = `tel:+${intPhone}`;

    modal.style.display = 'flex';
    document.body.style.overflow = "hidden";
};

// --- CHAT & UI UTILS ---
window.toggleChatMenu = function() {
    const menu = document.getElementById('chatMenu');
    const toast = document.getElementById('chatToast');
    if (menu) menu.classList.toggle('active');
    if (toast) toast.style.display = 'none';
};

window.closeToast = function(event) {
    if (event) event.stopPropagation();
    const toast = document.getElementById('chatToast');
    if (toast) toast.style.display = 'none';
};

window.toggleLanguage = function() {
    let currentLang = localStorage.getItem('golem_lang') || 'en';
    currentLang = currentLang === 'en' ? 'am' : 'en';
    localStorage.setItem('golem_lang', currentLang);
    location.reload(); 
};

// 3. Handle Sign Out
window.handleSignOut = async function() {
    await _supabase.auth.signOut();
    window.location.reload();
};
