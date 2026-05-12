// --- 1. INITIALIZATION & GLOBAL STATE ---
let currentProduct = null;
window.currentCategory = 'All'; // Global variable

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
window.fetchProducts = async (category = window.currentCategory || 'All') => {
    // 1. Declare 'grid' once at the top
    const grid = document.getElementById('productGrid');
    if (grid) grid.innerHTML = '<div class="loading-spinner"><i class="fas fa-circle-notch fa-spin"></i> Loading...</div>';

    // Capture both Sort and Location values
    const sortOrder = document.getElementById('sortSelect')?.value || 'newest';
    const locationFilter = document.getElementById('locationSelect')?.value || 'all';

    let query = _supabase
        .from('products')
        .select(`
            *,
            profiles:user_id (
                is_verified,
                full_name,
                avatar_url
            )
        `)
        .eq('status', 'approved');

    // Category Filter
    if (category !== 'All') {
        query = query.eq('category', category);
    }

    // Location Filter
    if (locationFilter !== 'all') {
        query = query.ilike('location', `%${locationFilter}%`);
    }

    // Sorting Logic
    if (sortOrder === 'price_low') {
        query = query.order('price', { ascending: true });
    } else if (sortOrder === 'price_high') {
        query = query.order('price', { ascending: false });
    } else {
        query = query.order('created_at', { ascending: false });
    }

    // Execute the query
    const { data, error } = await query;
    
    // Check for errors
    if (!error) {
        renderProducts(data);
    } else {
        console.error("Fetch error:", error.message);
        // Display the database error on the screen
        if (grid) {
            grid.innerHTML = `
                <div style="text-align:center; grid-column:1/-1; padding:50px; color:#ff4757; background:#fff; border-radius:12px; border:1px solid #ff4757;">
                    <i class="fas fa-exclamation-triangle" style="font-size:30px; margin-bottom:10px;"></i>
                    <h3>Database Error</h3>
                    <p>${error.message}</p>
                    <p style="font-size:0.8rem; color:#666; margin-top:10px;">Check your Supabase RLS policies or Table relationships.</p>
                </div>`;
        }
    }
};
window.filterSponsored = async () => {
    const grid = document.getElementById('productGrid');
    if (grid) grid.innerHTML = '<div class="loading-spinner"><i class="fas fa-circle-notch fa-spin"></i> Loading...</div>';

    // Highlight the correct button
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.sponsor-filter').classList.add('active');

    const { data, error } = await _supabase
        .from('products')
        .select(`*, profiles:user_id (is_verified, full_name, avatar_url)`)
        .eq('status', 'approved')
        .or('is_sponsored.eq.true,is_featured.eq.true')
        .order('created_at', { ascending: false });

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
        alert("❤️ Added to your Wishlist!");
    } else {
        alert("This item is already in your Wishlist!");
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
        grid.innerHTML = `<div style="text-align:center; grid-column:1/-1; padding:60px; color:#888;">No items found in this category.</div>`;
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

        const shareText = encodeURIComponent(`Check out this ${p.name} on Golem Marketplace!`);
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
               <img src="${p.image}" alt="${p.name}" loading="lazy"
  style="cursor:pointer; width:100%; display:block;"
  onclick="window.openProductDetailsSafe('${safeData}')">
  
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

                <div class="product-location" style="display: flex; align-items: center; gap: 5px; font-size: 0.85rem; color: #666; margin-top: 5px;">
                    <i class="fas fa-map-marker-alt" style="color: #ff4757;"></i>
                    <span>${p.location || 'Addis Ababa'}</span>
                </div>
                
                <div class="quick-contact-bar" style="margin-top:12px; display:flex; gap:7px;">
    <a href="tel:+${cleanPhone}"
        style="flex:1; display:flex; align-items:center; justify-content:center; gap:5px; padding:10px 6px; border-radius:10px; background:#333; color:#fff; text-decoration:none; font-size:12px; font-weight:600;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>
        Call
    </a>
    <a href="https://t.me/${tgUser || '+'+cleanPhone}" target="_blank"
        style="flex:1; display:flex; align-items:center; justify-content:center; gap:5px; padding:10px 6px; border-radius:10px; background:#0088cc; color:#fff; text-decoration:none; font-size:12px; font-weight:600;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
        TG
    </a>
    <a href="https://wa.me/${cleanPhone}?text=${encodeURIComponent('Interested in '+p.name+' on WanaGebya')}" target="_blank"
        style="flex:1; display:flex; align-items:center; justify-content:center; gap:5px; padding:10px 6px; border-radius:10px; background:#25d366; color:#fff; text-decoration:none; font-size:12px; font-weight:600;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
        WA
    </a>
    <button onclick="window.open('https://t.me/share/url?url=${shareUrl}&text=${shareText}','_blank')"
        style="flex:1; display:flex; align-items:center; justify-content:center; gap:5px; padding:10px 6px; border-radius:10px; background:#6c5ce7; color:#fff; border:none; cursor:pointer; font-size:12px; font-weight:600; font-family:inherit;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>
        Share
    </button>
</div>

                <div class="product-actions" style="margin-top: 15px;">
                    <button class="buy-btn" onclick="window.openProductDetailsSafe('${safeData}')" style="width: 100%; padding: 10px; border-radius: 8px; cursor: pointer;">
                        Full Details
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');
}

// --- 5. SPONSORSHIP, FILTERING & SEARCH ---
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
            // Removed checkout.html logic since this is a classifieds marketplace
            document.getElementById('sponsorLink').onclick = (e) => {
                e.preventDefault();
                window.openProductModal(product);
            };
            sponsorSection.style.display = 'block';
        }
    } catch (err) { console.error("Sponsor load error", err); }
};

window.filterCategory = (category, button) => {
    window.currentCategory = category;
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

window.openProductModal = async (product) => {
    currentProduct = product;
    const modal = document.getElementById('productModal');
    const badgeContainer = document.getElementById('sellerBadgeContainer');
    const sellerAvatarElem = document.getElementById('modalSellerAvatar');
    const sellerNameElem = document.getElementById('modalSellerName');
    
    if (!modal) return;

    // DATA PREPARATION
    const rawPhone = (product.seller_phone || "").replace(/\D/g, '');
    const intPhone = rawPhone.startsWith('0') ? '251' + rawPhone.substring(1) : rawPhone;
    const tgUser = (product.telegram_username || "").replace('@', '');

    // UI INJECTION
    document.getElementById('modalProductImg').src = product.image;
    document.getElementById('modalProductTitle').innerText = product.name;
    document.getElementById('modalProductPrice').innerText = product.price.toLocaleString() + " ETB";
    document.getElementById('modalProductDesc').innerText = product.description || "No description available.";

    // SELLER DETAILS
    const profile = product.profiles || {}; 
    const isVerified = profile.is_verified === true;
    const sellerName = profile.full_name || product.seller_name || "Community Member";
    const avatarUrl = profile.avatar_url || 'https://via.placeholder.com/150';
    
    if (sellerNameElem) sellerNameElem.innerText = `Seller: ${sellerName}`;
    if (sellerAvatarElem) sellerAvatarElem.src = avatarUrl;

    if (badgeContainer) {
        badgeContainer.innerHTML = isVerified 
            ? `<div style="color: #2ed573; font-weight: bold; margin-top: 5px;"><i class="fas fa-check-circle"></i> Verified Seller</div>`
            : `<div style="color: #888; margin-top: 5px;"><i class="fas fa-shield-alt"></i> Community Seller</div>`;
    }

    document.getElementById('whatsappOrder').href = `https://wa.me/${intPhone}?text=${encodeURIComponent("I'm interested in " + product.name + " on Golem Marketplace")}`;
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
        const location = document.getElementById('regLocation').value;
        const bio = document.getElementById('regBio').value;

        const { error } = await _supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName, phone_number: phone, location: location, bio: bio } }
        });
        if (error) alert("Error: " + error.message);
        else { 
            alert("Success! Check your email to verify your account."); 
            window.toggleModal(); 
        }
    } else {
        const { error } = await _supabase.auth.signInWithPassword({ email, password });
        if (error) alert("Login failed: " + error.message);
        else { 
            window.toggleModal(); 
            await window.updateUIForUser(); 
        }
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

// Add 'event' inside the parentheses here!
window.checkAuthToSell = async function(event) { 
    event.preventDefault(); // Now this works properly
    const { data: { user } } = await _supabase.auth.getUser();
    if (user) {
        window.location.href = "sell.html"; 
    } else {
        window.toggleModal(); 
    }
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

// --- 8. ADMIN & USER MGMT ---
window.loadUsers = async function() {
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
                <th style="padding: 15px;">USER INFO</th>
                <th style="padding: 15px;">LOCATION</th> 
                <th style="padding: 15px;">JOINED</th>
                <th style="padding: 15px;">ROLE</th>
                <th style="padding: 15px;">STATUS</th>
                <th style="padding: 15px; text-align: right;">ACTIONS</th>
            </tr>
        </thead>
        <tbody>
            ${users.map(u => `
                <tr style="border-bottom: 1px solid #f4f7f6;">
                    <td style="padding: 10px 15px;">
                         <strong>${u.full_name || 'Member'}</strong><br>
                         <small style="color:#888;">${u.email || 'N/A'}</small>
                    </td>
                    <td style="padding: 10px 15px; font-size: 0.85rem;">${u.location || 'Addis Ababa'}</td>
                    <td style="padding: 10px 15px; font-size: 0.85rem;">${u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}</td>
                    <td style="padding: 10px 15px;">${u.is_admin ? 'Admin 🛡️' : 'User 👤'}</td>
                    <td style="padding: 10px 15px;">
                        ${u.is_verified ? '<span style="color:#2ed573; font-weight:bold;">VERIFIED</span>' : '<span style="color:#888;">GUEST</span>'}
                    </td>
                    <td style="padding: 10px 15px; text-align: right;">
                        <button onclick="window.toggleVerification('${u.id}', ${u.is_verified})" style="padding:5px 10px; background:#6c5ce7; color:white; border:none; border-radius:4px; cursor:pointer;">Toggle Verify</button>
                    </td>
                </tr>
            `).join('')}
        </tbody>
        </table>
        </div>`;
};

window.deleteUser = async function(userId, identifier) {
    const isConfirmed = confirm(`⚠️ DANGER: Are you sure you want to permanently delete ${identifier}?`);
    if (!isConfirmed) return;

    try {
        const { error } = await _supabase.from('profiles').delete().eq('id', userId);
        if (error) throw error;
        alert("User deleted successfully.");
        await window.loadUsers(); 
    } catch (err) {
        console.error("Delete Error:", err.message);
        alert("Failed to delete user: " + err.message);
    }
};

window.toggleVerification = async (userId, currentStatus) => {
    const action = currentStatus ? "unverify" : "verify";
    if (!confirm(`Are you sure you want to ${action} this seller?`)) return;

    const { error } = await _supabase
        .from('profiles')
        .update({ is_verified: !currentStatus })
        .eq('id', userId);
    
    if (error) {
        console.error("Verification Error:", error);
        alert("Verification update failed: " + error.message);
        return;
    }

    alert(`Seller successfully ${currentStatus ? 'unverified' : 'verified'}!`);
    
    // Trigger the auto-post logic if they were just verified
    if (!currentStatus) {
        console.log("New verified seller alert triggered.");
        // Optional: postToSocialMedia(someUserData);
    }
    
    window.loadUsers();
};

// --- 9. PROFILE MANAGEMENT ---
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
    const file = fileInput ? fileInput.files[0] : null;
    
    btn.disabled = true;
    btn.innerText = "Processing...";

    const { data: { user } } = await _supabase.auth.getUser();
    let avatarUrl = null;

    // Fixed path to include user.id so users don't overwrite each other
    if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/avatar_${Date.now()}.${fileExt}`;

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

// --- 10. SUPPORT & MISC LOGIC ---
window.toggleSupportModal = function() {
    const modal = document.getElementById('supportModal');
    if (!modal) return;
    const isHidden = modal.style.display === 'none' || modal.style.display === '';
    modal.style.display = isHidden ? 'flex' : 'none';
};

window.handleSupportSubmit = async function(event) {
    event.preventDefault();
    const email = document.getElementById('supportEmail').value;
    const subject = document.getElementById('supportSubject').value;
    const message = document.getElementById('supportMessage').value;

    const submitBtn = event.target.querySelector('button');
    const originalText = submitBtn.innerText;
    submitBtn.innerText = "Sending...";
    submitBtn.disabled = true;

    try {
        const { error } = await _supabase
            .from('support_tickets')
            .insert([{ user_email: email, subject: subject, message: message, is_resolved: false }]);
        if (error) throw error;
        alert("Thank you! Your message has been sent to Golem Support.");
        event.target.reset();
        window.toggleSupportModal();
    } catch (err) {
        console.error("Support Error:", err.message);
        alert("Failed to send message: " + err.message);
    } finally {
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
    }
};

window.shareToTelegramMain = function() {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent("Check out Golem Marketplace - The best place to buy & sell in Ethiopia!");
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
};
window.shareToWhatsApp = function() {
    const text = encodeURIComponent("Check out Golem Marketplace - The best place to buy & sell in Ethiopia! " + window.location.href);
    window.open(`https://wa.me/?text=${text}`, '_blank');
};

let isAmharic = false;
window.toggleLanguage = function() {
    isAmharic = !isAmharic;
    document.getElementById('langText').innerText = isAmharic ? "English" : "አማርኛ";
    
    // Example localization - grab elements with data-am attribute
    document.querySelectorAll('[data-am]').forEach(el => {
        const currentText = el.innerText;
        el.innerText = el.getAttribute('data-am');
        el.setAttribute('data-am', currentText); // Swap them back and forth
    });
};


async function postToSocialMedia(product) {
    const botToken = 'YOUR_TELEGRAM_BOT_TOKEN';
    const chatId = '@your_public_channel_username'; // Your public channel
    const message = `
🌟 *New Item Approved!*
📦 *Product:* ${product.name}
💰 *Price:* ${product.price} ETB
📍 *Location:* ${product.location}

🔗 View Details: https://grand-sawine-a63bc3.netlify.app/product.html?id=${product.id}
    `;

    // Send to Telegram
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'Markdown'
        })
    });
}

window.shareToFacebook = function() {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
};

window.shareToTelegram = function() {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent("Check out this awesome find on WanaGebya!");
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
};
