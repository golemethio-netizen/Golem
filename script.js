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

  // Inside script.js -> fetchProducts
let query = _supabase
        .from('products')
        .select(`
            *,
            profiles:seller_id (
                is_verified,
                full_name
            )
        `) // ADDED 'full_name' HERE
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

    if (!products || products.length === 0) {
        grid.innerHTML = `<div style="text-align:center; grid-column:1/-1; padding:60px; color:#888;">No items found.</div>`;
        return;
    }

    const savedItems = JSON.parse(localStorage.getItem('golem_saved') || '[]');
    const now = new Date();

    grid.innerHTML = products.map(p => {
        // --- 1. DATA PREP ---
        // 'p' is defined here by the .map loop, so this works now:
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
                                ${isVerified ? 'Verified Seller' : 'Community Seller'}
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
                    <div class="product-actions">
                        <button class="buy-btn" onclick="window.openProductDetailsSafe('${safeData}')" style="width: 100%;">
                            Full Details
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
        const isFlex = modal.style.display === 'flex';
        modal.style.display = isFlex ? 'none' : 'flex';
        document.body.style.overflow = isFlex ? 'auto' : 'hidden';
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
        if (error) {
            alert("Login failed: " + error.message);
        } else {
            window.toggleModal();
            await window.updateUIForUser();
        }
    }
    btn.disabled = false;
};

// FIXED: UI Update with Admin Check
window.updateUIForUser = async function() {
    const { data: { user } } = await _supabase.auth.getUser();
    const signinBtn = document.getElementById('signInBtn');
    const adminLink = document.getElementById('adminNavLink');

    if (user) {
        // Sign Out Logic
        if (signinBtn) {
            signinBtn.innerHTML = `<i class="fas fa-sign-out-alt"></i> <p>Sign Out</p>`;
            signinBtn.onclick = async () => { 
                await _supabase.auth.signOut(); 
                window.location.reload(); 
            };
        }

        // Fetch User Profile
        const { data: profile } = await _supabase
            .from('profiles')
            .select('is_admin, full_name')
            .eq('id', user.id)
            .maybeSingle();

        // Show User Name
        if (profile?.full_name && signinBtn) {
            signinBtn.querySelector('p').innerText = profile.full_name.split(' ')[0]; 
        }

        // IMPORTANT: Show Admin Link if user is admin
        if (adminLink && profile?.is_admin) {
            adminLink.style.display = 'flex'; // Or 'block' depending on your CSS
        } else if (adminLink) {
            adminLink.style.display = 'none';
        }
    } else {
        // Guest View
        if (signinBtn) {
            signinBtn.innerHTML = `<i class="fas fa-user-circle"></i> <p>Sign In</p>`;
            signinBtn.onclick = () => window.toggleModal();
        }
        if (adminLink) adminLink.style.display = 'none';
    }
};

// --- 8. ADMIN & USER MGMT ---
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

    // Get current logged in user ID to prevent self-deletion
    const { data: { user } } = await _supabase.auth.getUser();

    list.innerHTML = `
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="text-align: left; border-bottom: 2px solid #f4f7f6; color: #888;">
                        <th style="padding: 15px;">NAME</th>
                        <th style="padding: 15px;">EMAIL</th>
                        <th style="padding: 15px;">ROLE</th>
                        <th style="padding: 15px;">STATUS</th>
                        <th style="padding: 15px; text-align: right;">ACTIONS</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(u => `
                        <tr style="border-bottom: 1px solid #f4f7f6;">
                            <td style="padding: 10px 15px;">${u.full_name || 'Member'}</td>
                            <td style="padding: 10px 15px;">${u.email || 'N/A'}</td>
                            <td style="padding: 10px 15px;">${u.is_admin ? 'Admin 🛡️' : 'User 👤'}</td>
                            <td style="padding: 10px 15px;">
                                ${u.is_verified ? '<span style="color:#2ed573; font-weight:bold;">VERIFIED</span>' : '<span style="color:#888;">GUEST</span>'}
                            </td>
                            <td style="padding: 10px 15px; text-align: right;">
                                <div style="display: flex; gap: 8px; justify-content: flex-end;">
                                    <button class="btn-verify" 
                                            onclick="window.toggleVerification('${u.id}', ${u.is_verified})"
                                            style="background:${u.is_verified ? '#ff4757' : '#2ed573'}; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">
                                        ${u.is_verified ? 'Unverify' : 'Verify'}
                                    </button>
                                    
                                    ${u.id !== user?.id ? `
                                        <button class="btn-delete" 
                                                onclick="window.deleteUser('${u.id}', '${u.full_name || u.email}')"
                                                style="background:#eb4d4b; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;"
                                                title="Delete User">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    ` : '<span style="font-size:12px; color:#aaa; padding:5px;">(You)</span>'}
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`;
};

window.deleteUser = async function(userId, identifier) {
    const isConfirmed = confirm(`⚠️ DANGER: Are you sure you want to permanently delete ${identifier}?\n\nThis will remove their profile from the Golem database.`);
    
    if (!isConfirmed) return;

    try {
        const { error } = await _supabase
            .from('profiles')
            .delete()
            .eq('id', userId);

        if (error) throw error;

        alert("User deleted successfully.");
        await window.loadUsers(); 
    } catch (err) {
        console.error("Delete Error:", err.message);
        alert("Failed to delete user: " + err.message);
    }
};


window.toggleVerification = async (userId, currentStatus) => {
    // Added confirmation dialog
    const action = currentStatus ? "unverify" : "verify";
    if (!confirm(`Are you sure you want to ${action} this seller?`)) {
        return;
    }

    const { error } = await _supabase
        .from('profiles')
        .update({ is_verified: !currentStatus })
        .eq('id', userId);
    
    if (!error) {
        // Success! Reload the table to show the new status
        alert(`Seller successfully ${currentStatus ? 'unverified' : 'verified'}!`);
        window.loadUsers();
    } else {
        // If the 500 error happens, it will show here
        console.error("Verification Error:", error);
        alert("Verification update failed: " + error.message);
    }
};

window.openProductModal = async (product) => {
    // 1. SET GLOBAL STATE
    currentProduct = product;
    const modal = document.getElementById('productModal');
    const badgeContainer = document.getElementById('sellerBadgeContainer');
    const sellerNameElem = document.getElementById('modalSellerName'); // Target for the name
    
    if (!modal) return;

    // 2. DATA PREPARATION
    const rawPhone = (product.seller_phone || "").replace(/\D/g, '');
    const intPhone = rawPhone.startsWith('0') ? '251' + rawPhone.substring(1) : rawPhone;
    const tgUser = (product.telegram_username || "").replace('@', '');

    // 3. UI INJECTION (Product Details)
    document.getElementById('modalProductImg').src = product.image;
    document.getElementById('modalProductTitle').innerText = product.name;
    document.getElementById('modalProductPrice').innerText = product.price.toLocaleString() + " ETB";
    document.getElementById('modalProductDesc').innerText = product.description || "No description available.";

    // 4. SELLER DETAILS (Name & Verification)
    const isVerified = product.profiles?.is_verified === true;
    const sellerName = product.profiles?.full_name || "Community Member";

    // Update the Name element
    if (sellerNameElem) {
        sellerNameElem.innerText = `Seller: ${sellerName}`;
    }

    // Update the Badge
    if (badgeContainer) {
        badgeContainer.innerHTML = isVerified 
            ? `<div class="verified-badge" style="color: #2ed573; font-weight: bold; margin-top: 5px;">
                <i class="fas fa-check-circle"></i> Verified Seller
               </div>`
            : `<div class="unverified-badge" style="color: #888; font-weight: normal; margin-top: 5px;">
                <i class="fas fa-shield-alt"></i> Community Seller
               </div>`;
    }

    // 5. CONTACT LINKS
    if (document.getElementById('whatsappOrder')) {
        document.getElementById('whatsappOrder').href = `https://wa.me/${intPhone}?text=${encodeURIComponent("I'm interested in " + product.name)}`;
    }

    if (document.getElementById('telegramOrder')) {
        document.getElementById('telegramOrder').href = tgUser ? `https://t.me/${tgUser}` : `https://t.me/+${intPhone}`;
    }

    if (document.getElementById('callContact')) {
        document.getElementById('callContact').href = `tel:+${intPhone}`;
    }

    // 6. DISPLAY MODAL
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


// Add this to your script.js
window.deleteUserAccount = async function(userId, identifier) {
    const isConfirmed = confirm(`⚠️ DANGER: Are you sure you want to permanently delete ${identifier}?`);
    
    if (!isConfirmed) return;

    try {
        const { error } = await _supabase
            .from('profiles')
            .delete()
            .eq('id', userId);

        if (error) throw error;

        alert("User deleted successfully.");
        
        // This triggers the refresh of your table
        if (typeof window.loadUsers === "function") {
            await window.loadUsers();
        } else {
            location.reload(); // Fallback if loadUsers isn't global
        }
    } catch (err) {
        console.error("Delete Error:", err.message);
        alert("Failed to delete user: " + err.message);
    }
};


// --- PROFILE & ACCOUNT MANAGEMENT ---

// Load Profile Data
window.loadUserProfile = async function() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) {
        window.location.href = 'index.html'; // Redirect if not logged in
        return;
    }

    // Fetch the detailed profile from the 'profiles' table
    const { data: profile, error } = await _supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

    if (profile) {
        // Update HTML elements
        const nameElem = document.getElementById('profileName');
        const emailElem = document.getElementById('profileEmail');
        const badgeElem = document.getElementById('verificationBadge');

        if (nameElem) nameElem.innerText = profile.full_name || "New Member";
        if (emailElem) emailElem.innerText = user.email;
        
        if (badgeElem) {
            badgeElem.innerText = profile.is_verified ? "Verified Seller" : "Community Seller";
            badgeElem.style.background = profile.is_verified ? "#2ed573" : "#888";
        }
    }
};

// Handle Sign Out
window.handleSignOut = async function() {
    const { error } = await _supabase.auth.signOut();
    if (error) {
        alert("Error signing out: " + error.message);
    } else {
        window.location.href = 'index.html';
    }
};

// Open Edit Modal & Pre-fill data
window.openEditModal = async function() {
    const { data: { user } } = await _supabase.auth.getUser();
    const { data: profile } = await _supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', user.id)
        .maybeSingle();

    if (profile) {
        document.getElementById('editFullName').value = profile.full_name || '';
        document.getElementById('editPhone').value = profile.phone || '';
        document.getElementById('editProfileModal').style.display = 'flex';
    }
};

// Save Changes to Supabase
window.updateProfileInfo = async function(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    btn.innerText = "Saving...";

    const { data: { user } } = await _supabase.auth.getUser();
    const newName = document.getElementById('editFullName').value;
    const newPhone = document.getElementById('editPhone').value;

    const { error } = await _supabase
        .from('profiles')
        .update({ 
            full_name: newName, 
            phone: newPhone 
        })
        .eq('id', user.id);

    if (!error) {
        alert("Profile updated successfully!");
        document.getElementById('editProfileModal').style.display = 'none';
        window.loadUserProfile(); // Refresh the page info
    } else {
        alert("Update failed: " + error.message);
    }
    
    btn.disabled = false;
    btn.innerText = "Save Changes";
};
