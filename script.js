// --- 1. INITIALIZATION & GLOBAL STATE ---
let currentProduct = null;
window.currentCategory = 'All'; // Global variable

// Helper function for safe localStorage parsing
function getSavedItems() {
    try {
        return JSON.parse(localStorage.getItem('golem_saved') || '[]');
    } catch (e) {
        console.warn("Cleared corrupted local storage.");
        localStorage.removeItem('golem_saved');
        return[];
    }
}

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
        if (toast && !document.getElementById('chatMenu')?.classList.contains('active')) {
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
    const grid = document.getElementById('productGrid');
    if (grid) grid.innerHTML = '<div class="loading-spinner"><i class="fas fa-circle-notch fa-spin"></i> Loading...</div>';

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

    if (category !== 'All') query = query.eq('category', category);
    if (locationFilter !== 'all') query = query.ilike('location', `%${locationFilter}%`);

    if (sortOrder === 'price_low') query = query.order('price', { ascending: true });
    else if (sortOrder === 'price_high') query = query.order('price', { ascending: false });
    else query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    
    if (!error) {
        renderProducts(data);
    } else {
        console.error("Fetch error:", error.message);
        if (grid) {
            grid.innerHTML = `
                <div style="text-align:center; grid-column:1/-1; padding:50px; color:#ff4757; background:#fff; border-radius:12px; border:1px solid #ff4757;">
                    <i class="fas fa-exclamation-triangle" style="font-size:30px; margin-bottom:10px;"></i>
                    <h3>Database Error</h3>
                    <p>${error.message}</p>
                </div>`;
        }
    }
};

window.filterSponsored = async () => {
    const grid = document.getElementById('productGrid');
    if (grid) grid.innerHTML = '<div class="loading-spinner"><i class="fas fa-circle-notch fa-spin"></i> Loading...</div>';

    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.sponsor-filter')?.classList.add('active');

    const { data, error } = await _supabase
        .from('products')
        .select(`*, profiles:user_id (is_verified, full_name, avatar_url)`)
        .eq('status', 'approved')
        .or('is_sponsored.eq.true,is_featured.eq.true')
        .order('created_at', { ascending: false });

    if (!error) renderProducts(data);
    else console.error("Fetch error:", error.message);
};

// --- 3. WISHLIST LOGIC ---
window.toggleWishlist = function(id, btnElement) {
    let saved = getSavedItems();
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
};

window.addToCartFromModal = function() {
    if (!currentProduct) return;
    let saved = getSavedItems();
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
    const saved = getSavedItems();
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

    const savedItems = getSavedItems();
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

                <div class="product-location" style="display: flex; align-items: center; gap: 5px; font-size: 0.85rem; color: #666; margin-top: 5px;">
                    <i class="fas fa-map-marker-alt" style="color: #ff4757;"></i>
                    <span>${p.location || 'Addis Ababa'}</span>
                </div>
                
                <div class="quick-contact-bar" style="margin-top: 12px;">
                    <a href="tel:+${cleanPhone}" class="contact-icon call"><i class="fas fa-phone-alt"></i></a>
                    <a href="https://t.me/${tgUser || '+'+cleanPhone}" target="_blank" class="contact-icon telegram"><i class="fab fa-telegram-plane"></i></a>
                    <a href="https://t.me/share/url?url=${shareUrl}&text=${shareText}" target="_blank" class="contact-icon share" style="background:#6c5ce7; color:white;">
                        <i class="fas fa-share-alt"></i>
                    </a>
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
    if (!modal) return;

    const rawPhone = (product.seller_phone || "").replace(/\D/g, '');
    const intPhone = rawPhone.startsWith('0') ? '251' + rawPhone.substring(1) : rawPhone;
    const tgUser = (product.telegram_username || "").replace('@', '');

    document.getElementById('modalProductImg').src = product.image;
    document.getElementById('modalProductTitle').innerText = product.name;
    document.getElementById('modalProductPrice').innerText = product.price.toLocaleString() + " ETB";
    document.getElementById('modalProductDesc').innerText = product.description || "No description available.";

    const profile = product.profiles || {}; 
    const isVerified = profile.is_verified === true;
    
    const sellerNameElem = document.getElementById('modalSellerName');
    if (sellerNameElem) sellerNameElem.innerText = `Seller: ${profile.full_name || product.seller_name || "Community Member"}`;
    
    const sellerAvatarElem = document.getElementById('modalSellerAvatar');
if (sellerAvatarElem) {
    const sellerName = profile.full_name || product.seller_name || "Community";
    // Generates an image with the user's initials!
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(sellerName)}&background=random&size=150`;
    sellerAvatarElem.src = profile.avatar_url || defaultAvatar;
}
    
    const badgeContainer = document.getElementById('sellerBadgeContainer');
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

window.checkAuthToSell = async function(event) { 
    event.preventDefault(); 
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
    const isConfirmed = confirm(`⚠️ DANGER: Are you sure you want to permanently delete profile for ${identifier}? (Note: Auth user deletion requires Edge Functions)`);
    if (!isConfirmed) return;

    try {
        const { error } = await _supabase.from('profiles').delete().eq('id', userId);
        if (error) throw error;
        alert("User profile deleted successfully.");
        await window.loadUsers(); 
    } catch (err) {
        console.error("Delete Error:", err.message);
        alert("Failed to delete user profile: " + err.message);
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
        
        // Populate inputs if edit modal is opened
        const editFullName = document.getElementById('editFullName');
        const editPhone = document.getElementById('editPhone');

        if (nameElem) nameElem.innerText = profile.full_name || "Member";
        if (emailElem) emailElem.innerText = user.email;
       if (avatarElem) {
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || "Member")}&background=6c5ce7&color=fff&size=150`;
    avatarElem.src = profile.avatar_url || defaultAvatar;
}
        
        if (editFullName) editFullName.value = profile.full_name || "";
        if (editPhone) editPhone.value = profile.phone_number || "";

        if (badgeElem) {
            badgeElem.innerText = profile.is_verified ? "Verified Seller" : "Community Seller";
            badgeElem.style.background = profile.is_verified ? "#2ed573" : "#eee";
            badgeElem.style.color = profile.is_verified ? "#fff" : "#555";
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

    if (file) {
        const fileExt = file.name.split('.').pop();
        // Overwrite the exact same file to save storage limit size
        const fileName = `${user.id}/avatar.${fileExt}`;

        const { error: uploadError } = await _supabase.storage.from('avatars').upload(fileName, file, {
            upsert: true
        });

        if (!uploadError) {
            // Append timestamp so browser ignores cache and shows newly uploaded image
            const { data } = _supabase.storage.from('avatars').getPublicUrl(fileName);
            avatarUrl = `${data.publicUrl}?t=${Date.now()}`; 
        } else {
            console.error("Upload error:", uploadError);
        }
    }

    const updates = {
        full_name: document.getElementById('editFullName').value,
        phone_number: document.getElementById('editPhone').value, // Standardized property
    };
    if (avatarUrl) updates.avatar_url = avatarUrl;

    const { error } = await _supabase.from('profiles').update(updates).eq('id', user.id);

    if (!error) {
        alert("Profile Updated!");
        window.closeEditModal(); // Custom function in your HTML to close modal
        window.loadUserProfile(); // Re-render without full page reload
    } else {
        alert("Error: " + error.message);
    }
    
    btn.disabled = false;
    btn.innerText = "Save Changes";
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
    const langBtn = document.getElementById('langText');
    if(langBtn) langBtn.innerText = isAmharic ? "English" : "አማርኛ";
    
    document.querySelectorAll('[data-am]').forEach(el => {
        const currentText = el.innerText;
        el.innerText = el.getAttribute('data-am');
        el.setAttribute('data-am', currentText); 
    });
};

/* 
 * 🔒 SECURITY FIX: 
 * Do NOT put Telegram Bot Tokens on the frontend. Malicious users can steal it.
 * You should use a Supabase Database Webhook or an Edge Function to trigger this securely.
 */
async function postToSocialMedia(product) {
    console.warn("Security Notice: Moving social media auto-posts to the backend.");
    // NOTE: Replace this with an invocation to your Supabase Edge Function:
    // await _supabase.functions.invoke('telegram-bot', { body: { product: product } });
}

window.shareToFacebook = function() {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
};

window.shareToTelegram = function() {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent("Check out this awesome find on Golem Marketplace!");
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
};
