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

// --- 2. DATA FETCHING ---
window.fetchProducts = async (category = 'All') => {
    const grid = document.getElementById('productGrid');
    if (grid) grid.innerHTML = '<div class="loading-spinner"><i class="fas fa-circle-notch fa-spin"></i> Loading...</div>';

    const sortOrder = document.getElementById('sortSelect')?.value || 'newest';

    let query = _supabase
        .from('products')
        .select(`
            *,
            profiles:seller_id (
                is_verified,
                full_name,
                avatar_url
            )
        `)
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

// --- 3. WISHLIST LOGIC ---
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

    if (!products || products.length === 0) {
        grid.innerHTML = `<div style="text-align:center; grid-column:1/-1; padding:60px; color:#888;">No items found.</div>`;
        return;
    }

    const savedItems = JSON.parse(localStorage.getItem('golem_saved') || '[]');
    const now = new Date();

    grid.innerHTML = products.map(p => {
        const safeData = encodeURIComponent(JSON.stringify(p));
        const isVerified = p.profiles?.is_verified === true;
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
            <div class="product-card ${isSold ? 'is-sold' : ''}">
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
                    <h3 class="product-title">
                        ${p.name} 
                        <span class="verification-wrapper" style="display: inline-flex; align-items: center; gap: 5px; font-size: 0.8rem; margin-left: 5px;">
                            <i class="fas fa-check-circle" style="color: ${isVerified ? '#2ed573' : '#ccc'};"></i>
                            <span style="color: ${isVerified ? '#2ed573' : '#888'}; font-weight: normal;">
                                ${isVerified ? 'Verified' : 'Community'}
                            </span>
                        </span>
                    </h3>
                    <div class="product-price">${p.price?.toLocaleString()} ETB</div>
                    <div class="quick-contact-bar">
                        <a href="tel:+${cleanPhone}" class="contact-icon call"><i class="fas fa-phone-alt"></i></a>
                        <a href="https://t.me/${tgUser || '+'+cleanPhone}" target="_blank" class="contact-icon telegram"><i class="fab fa-telegram-plane"></i></a>
                        <a href="https://t.me/share/url?url=${shareUrl}&text=${shareText}" target="_blank" class="contact-icon share" style="background:#6c5ce7; color:white;">
                            <i class="fas fa-share-alt"></i>
                        </a>
                    </div>
                </div>
            </div>`;
    }).join('');
}

// --- 5. MODAL & VIEW LOGIC ---
window.openProductDetailsSafe = (encodedData) => {
    try {
        const product = JSON.parse(decodeURIComponent(encodedData));
        window.openProductModal(product);
    } catch (e) { console.error("Error parsing product", e); }
};

window.openProductModal = async (product) => {
    currentProduct = product;
    const modal = document.getElementById('productModal');
    const badgeContainer = document.getElementById('sellerBadgeContainer');
    const sellerAvatarElem = document.getElementById('modalSellerAvatar');
    const sellerNameElem = document.getElementById('modalSellerName');
    
    if (!modal) return;

    const rawPhone = (product.seller_phone || "").replace(/\D/g, '');
    const intPhone = rawPhone.startsWith('0') ? '251' + rawPhone.substring(1) : rawPhone;
    const tgUser = (product.telegram_username || "").replace('@', '');

    document.getElementById('modalProductImg').src = product.image;
    document.getElementById('modalProductTitle').innerText = product.name;
    document.getElementById('modalProductPrice').innerText = product.price.toLocaleString() + " ETB";
    document.getElementById('modalProductDesc').innerText = product.description || "No description available.";

    const profile = product.profiles; // Accessing the joined profile data
    const isVerified = profile?.is_verified === true;
    const sellerName = profile?.full_name || "Community Member";
    const avatarUrl = profile?.avatar_url || 'https://via.placeholder.com/150';
    
    if (sellerNameElem) sellerNameElem.innerText = `Seller: ${sellerName}`;
    if (sellerAvatarElem) sellerAvatarElem.src = avatarUrl;

    if (badgeContainer) {
        badgeContainer.innerHTML = isVerified 
            ? `<div style="color: #2ed573; font-weight: bold; margin-top: 5px;"><i class="fas fa-check-circle"></i> Verified Seller</div>`
            : `<div style="color: #888; margin-top: 5px;"><i class="fas fa-shield-alt"></i> Community Seller</div>`;
    }

    document.getElementById('whatsappOrder').href = `https://wa.me/${intPhone}?text=${encodeURIComponent("I'm interested in " + product.name)}`;
    document.getElementById('telegramOrder').href = tgUser ? `https://t.me/${tgUser}` : `https://t.me/+${intPhone}`;
    document.getElementById('callContact').href = `tel:+${intPhone}`;

    modal.style.display = 'flex';
    document.body.style.overflow = "hidden";
};

window.closeProductModal = () => {
    const modal = document.getElementById('productModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = "auto";
};

// --- 6. AUTHENTICATION SYSTEM ---
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
            options: { data: { full_name: fullName, phone: phone } }
        });
        if (error) alert("Error: " + error.message);
        else { alert("Check your email for confirmation!"); window.toggleModal(); }
    } else {
        const { error } = await _supabase.auth.signInWithPassword({ email, password });
        if (error) alert("Login failed: " + error.message);
        else { window.toggleModal(); await window.updateUIForUser(); }
    }
    btn.disabled = false;
};

window.updateUIForUser = async function() {
    const { data: { user } } = await _supabase.auth.getUser();
    const signInBtn = document.getElementById('signInBtn');
    const userWelcome = document.getElementById('userWelcome');
    const userNameElem = document.getElementById('userName');
    const signOutBtn = document.getElementById('signOutBtn');
    const adminLink = document.getElementById('adminNavLink');

    if (user) {
        if (signInBtn) signInBtn.style.display = 'none';
        if (userWelcome) userWelcome.style.display = 'flex';
        if (signOutBtn) signOutBtn.style.display = 'block';

        const { data: profile } = await _supabase
            .from('profiles')
            .select('full_name, is_admin')
            .eq('id', user.id)
            .maybeSingle();

        if (userNameElem) userNameElem.innerText = profile?.full_name ? profile.full_name.split(' ')[0] : "Member";
        if (adminLink && profile?.is_admin) adminLink.style.display = 'flex';
    } else {
        if (signInBtn) signInBtn.style.display = 'block';
        if (userWelcome) userWelcome.style.display = 'none';
        if (signOutBtn) signOutBtn.style.display = 'none';
        if (adminLink) adminLink.style.display = 'none';
    }
};

// --- 7. PROFILE MANAGEMENT ---
window.loadUserProfile = async function() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await _supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

    if (profile) {
        const nameElem = document.getElementById('profileName');
        const emailElem = document.getElementById('profileEmail');
        const avatarElem = document.getElementById('profileAvatar');
        const badgeElem = document.getElementById('verificationBadge');

        if (nameElem) nameElem.innerText = profile.full_name || "Member";
        if (emailElem) emailElem.innerText = user.email;
        if (avatarElem) avatarElem.src = profile.avatar_url || 'https://via.placeholder.com/150';
        
        if (badgeElem) {
            badgeElem.innerText = profile.is_verified ? "Verified Seller" : "Community Seller";
            badgeElem.style.background = profile.is_verified ? "#2ed573" : "#888";
        }
    }
};

window.updateProfileInfo = async function(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const fileInput = document.getElementById('editAvatar');
    const file = fileInput.files[0];
    
    btn.disabled = true;
    btn.innerText = "Processing...";

    const { data: { user } } = await _supabase.auth.getUser();
    let avatarUrl = null;

    if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await _supabase.storage.from('avatars').upload(fileName, file);

        if (!uploadError) {
            const { data } = _supabase.storage.from('avatars').getPublicUrl(fileName);
            avatarUrl = data.publicUrl;
        }
    }

    const updates = {
        full_name: document.getElementById('editFullName').value,
        phone: document.getElementById('editPhone').value,
    };
    if (avatarUrl) updates.avatar_url = avatarUrl;

    const { error } = await _supabase.from('profiles').update(updates).eq('id', user.id);

    if (!error) {
        alert("Profile Updated!");
        location.reload();
    } else {
        alert("Error: " + error.message);
    }
    btn.disabled = false;
};

window.handleSignOut = async function() {
    await _supabase.auth.signOut();
    window.location.href = 'index.html';
};

window.toggleModal = () => {
    const modal = document.getElementById('authModal');
    if (modal) {
        const isFlex = modal.style.display === 'flex';
        modal.style.display = isFlex ? 'none' : 'flex';
        document.body.style.overflow = isFlex ? 'auto' : 'hidden';
    }
};
