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
//includes the "Online Dot" check:
    const now = new Date();
    const hour = now.getHours();
    const dot = document.querySelector('.online-dot');
    if (dot) {
        dot.style.display = (hour >= 8 && hour < 20) ? 'block' : 'none';
    }
    // Welcome Toast Timer
    setTimeout(() => {
        const toast = document.getElementById('chatToast');
        if (toast && !document.getElementById('chatMenu').classList.contains('active')) {
            toast.style.display = 'block';
        }
    }, 5000);
    
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
// Replace your existing renderProducts function with this updated version
// Replace your existing renderProducts function with this updated version
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

        // Generate a specific share link for this product
        const shareText = encodeURIComponent(`Check out this ${p.name} on Golem Furniture! Price: ${p.price.toLocaleString()} ETB.`);
      // This dynamically finds the correct folder path

        const baseUrl = window.location.href.split('?')[0].split('#')[0].replace('index.html', '');
const shareUrl = encodeURIComponent(`${baseUrl}product.html?id=${p.id}`);

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
                        <a href="tel:+${cleanPhone}" class="contact-icon call" title="Call Seller"><i class="fas fa-phone-alt"></i></a>
                        <a href="https://t.me/${tgUser || '+'+cleanPhone}" target="_blank" class="contact-icon telegram" title="Telegram Seller"><i class="fab fa-telegram-plane"></i></a>
                        <a href="https://t.me/share/url?url=${shareUrl}&text=${shareText}" target="_blank" class="contact-icon share" style="background:#6c5ce7; color:white;" title="Share with Friends">
                            <i class="fas fa-share-alt"></i>
                        </a>
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
    const phone = document.getElementById('regPhone').value; // You have this in HTML
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
        else window.location.reload(); 
    }
    btn.disabled = false;
};

window.updateUIForUser = async function() {
    const { data: { user } } = await _supabase.auth.getUser();
    
    const userNav = document.getElementById('userNav');
    const signInBtn = document.getElementById('signInBtn'); // The one with "nav-item-box" class
    const adminNavLink = document.getElementById('adminNavLink');

    if (user) {
        // 1. Toggle Visibility
        if (signInBtn) signInBtn.style.display = 'none';
        if (userNav) userNav.style.display = 'flex';

        // 2. Fetch Profile
        const { data: profile } = await _supabase
            .from('profiles')
            .select('full_name, avatar_url, is_admin')
            .eq('id', user.id)
            .single();

        if (profile) {
            // Update Avatar and Name
            const navName = document.getElementById('navName');
            const navAvatar = document.getElementById('navAvatar');
            
            if (navName) navName.innerText = profile.full_name || "Account";
            if (navAvatar) {
                navAvatar.src = profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.full_name || 'User'}&background=333&color=fff`;
            }

            // 3. Routing (Admin vs Seller)
            const profileTrigger = document.getElementById('profileTrigger');
            if (profile.is_admin) {
                if (adminNavLink) adminNavLink.style.display = 'flex';
                if (profileTrigger) profileTrigger.onclick = () => location.href='admin.html';
            } else {
                if (adminNavLink) adminNavLink.style.display = 'none';
                // Change the redirection to sell.html
            if (profileTrigger) profileTrigger.onclick = () => location.href='sell.html';
            }
        }
    } else {
        // No user logged in
        if (signInBtn) signInBtn.style.display = 'flex';
        if (userNav) userNav.style.display = 'none';
        if (adminNavLink) adminNavLink.style.display = 'none';
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

// --- FIX FOR LINE 776 ---
const backToTopBtn = document.getElementById('backToTop');
if (backToTopBtn) { // <--- ADD THIS CHECK
    window.addEventListener('scroll', () => {
        if (window.scrollY > 400) {
            backToTopBtn.classList.add('show');
        } else {
            backToTopBtn.classList.remove('show');
        }
    });

    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// --- FIX FOR AVATAR UPLOAD (Line 752 approx) ---
const avatarInput = document.getElementById('avatarUpload');
if (avatarInput) { // <--- ADD THIS CHECK
    avatarInput.addEventListener('change', async (e) => {
        // ... your existing upload code ...
    });
}


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



// --- MASTER CHAT LOGIC ---
function toggleChatMenu() {
    const menu = document.getElementById('chatMenu');
    const toast = document.getElementById('chatToast');
    
    if (menu) {
        menu.classList.toggle('active');
    }
    
    // Hide the welcome bubble once the user clicks the button
    if (toast) {
        toast.style.display = 'none';
    }
}

// --- MASTER CHAT LOGIC (GLOBAL) ---
window.toggleChatMenu = function() {
    const menu = document.getElementById('chatMenu');
    const toast = document.getElementById('chatToast');
    
    if (menu) {
        menu.classList.toggle('active');
    }
    
    // Hide the welcome bubble once the user interacts
    if (toast) {
        toast.style.display = 'none';
    }
};

// --- CLOSE TOAST LOGIC (GLOBAL) ---
window.closeToast = function(event) {
    if (event) {
        event.stopPropagation(); // Prevents the click from opening the menu
    }
    const toast = document.getElementById('chatToast');
    if (toast) {
        toast.style.display = 'none';
    }
};

// Global click listener to close menu when clicking outside
window.addEventListener('click', function(e) {
    const chatContainer = document.querySelector('.floating-chat');
    const menu = document.getElementById('chatMenu');
    
    if (chatContainer && !chatContainer.contains(e.target) && menu) {
        menu.classList.remove('active');
    }
});

//Ensure your toggleChatMenu also hides the toast
/*function toggleChatMenu() {
    const menu = document.getElementById('chatMenu');
    const toast = document.getElementById('chatToast');
    
    menu.classList.toggle('active');
    
    if (toast) {
        toast.style.display = 'none';
    }
} 
window.addEventListener('DOMContentLoaded', () => {
    const now = new Date();
    const hour = now.getHours();
    const dot = document.querySelector('.online-dot');

    // Show "Online" only between 8 AM and 8 PM
    if (dot) {
        if (hour >= 8 && hour < 20) {
            dot.style.display = 'block';
        } else {
            dot.style.display = 'none'; // Hide when you are likely asleep!
        }
    }
});*/


async function loadUsers() {
    const list = document.getElementById('userList');
    list.innerHTML = "<div class='loading-spinner'><i class='fas fa-sync fa-spin'></i> Syncing database...</div>";

    const { data: users, error } = await _supabase
        .from('profiles') 
        .select('*')
        .order('created_at', { ascending: false });

    if (error || !users) {
        list.innerHTML = `<p style="color:#ff4757; padding:20px;">Error: ${error?.message || 'Unauthorized access to profiles'}</p>`;
        return;
    }

    // Update Top Stat Card
    const userCountEl = document.getElementById('totalUsers');
    if (userCountEl) userCountEl.innerText = users.length;

    list.innerHTML = `
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; min-width: 600px;">
                <thead>
                    <tr style="text-align: left; border-bottom: 2px solid #f4f7f6; color: #888; font-size: 0.85rem;">
                        <th style="padding: 15px;">FULL NAME</th>
                        <th style="padding: 15px;">EMAIL ADDRESS</th>
                        <th style="padding: 15px;">STATUS</th>
                        <th style="padding: 15px;">JOINED</th>
                        <th style="padding: 15px; text-align: right;">ACTIONS</th>
                    </tr>
                </thead>
                // Update the row mapping inside loadUsers() to look like this:
<tbody>
    ${users.map(u => `
        <tr style="border-bottom: 1px solid #f4f7f6; transition: 0.2s; height: 60px;">
            <td style="padding: 10px 15px; font-weight: 600;">${u.full_name || 'New Member'}</td>
            <td style="padding: 10px 15px; color: #555;">${u.email}</td>
            <td style="padding: 10px 15px;">
                ${u.is_admin ? 
                    '<span style="background:#6c5ce7; color:white; padding:4px 10px; border-radius:20px; font-size:0.75rem;">Admin</span>' : 
                    '<span style="background:#eee; color:#666; padding:4px 10px; border-radius:20px; font-size:0.75rem;">User</span>'}
                ${u.is_verified ? 
                    '<span style="background:#2ed573; color:white; padding:4px 10px; border-radius:20px; font-size:0.75rem; margin-left:5px;">Verified</span>' : 
                    '<span style="background:#ffa502; color:white; padding:4px 10px; border-radius:20px; font-size:0.75rem; margin-left:5px;">Standard</span>'}
            </td>
            <td style="padding: 10px 15px; font-size: 0.85rem; color: #999;">
                ${new Date(u.created_at).toLocaleDateString('en-GB')}
            </td>
            <td style="padding: 10px 15px; text-align: right;">
                <button onclick="toggleVerification('${u.id}', ${u.is_verified})" 
                        style="background: none; border: 1px solid #ddd; padding: 5px 10px; border-radius: 5px; cursor: pointer; font-size: 0.75rem; margin-right:5px;">
                    ${u.is_verified ? 'Unverify' : 'Verify Seller'}
                </button>
                ${u.email !== 'yohannes.surafel@gmail.com' ? `
                    <button onclick="toggleAdminPrivilege('${u.id}', ${u.is_admin})" 
                            style="background: none; border: 1px solid #ddd; padding: 5px 10px; border-radius: 5px; cursor: pointer; font-size: 0.75rem;">
                        ${u.is_admin ? 'Demote' : 'Make Admin'}
                    </button>
                ` : '<i class="fas fa-lock" title="Master Admin"></i>'}
            </td>
        </tr>
    `).join('')}
</tbody>

            </table>
        </div>
    `;
}
window.toggleAdminPrivilege = async (userId, currentStatus) => {
    const action = currentStatus ? "remove admin rights from" : "grant admin rights to";
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;

    const { error } = await _supabase
        .from('profiles')
        .update({ is_admin: !currentStatus })
        .eq('id', userId);

    if (error) {
        alert("Failed to update: " + error.message);
    } else {
        loadUsers(); // Refresh the list
    }
};



// Add this helper to script.js or ensure it's in config.js
async function notifyAdminOfNewPost(product) {
    const message = `🆕 *NEW POST PENDING*\n📦 Item: ${product.name}\n💰 Price: ${product.price} ETB\n📞 Seller: ${product.seller_phone}\n\nCheck admin.html to approve!`;
    
    await fetch(`https://api.telegram.org/bot${GolemConfig.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: GolemConfig.chatId,
            text: message,
            parse_mode: 'Markdown'
        })
    });
}


window.openProductModal = async (product) => {
    currentProduct = product;
    const modal = document.getElementById('productModal');
    if (!modal) return;

    // ... [Keep your existing image/title/price code here] ...

    const cleanPhone = (product.seller_phone || "").replace(/\D/g, '');
    let intPhone = cleanPhone.startsWith('0') ? '251' + cleanPhone.substring(1) : cleanPhone;

    // --- NEW WHITELIST CHECK ---
    const { data: profile } = await _supabase
        .from('profiles')
        .select('is_verified')
        .eq('phone', product.seller_phone)
        .single();

    const isVerified = profile?.is_verified || false;

    // If NOT verified, the "Order" goes to the Golem Admin (You)
    const whatsappTarget = isVerified ? intPhone : GolemConfig.myPhone;
    const waPrefix = isVerified ? "" : "[UNVERIFIED SELLER] ";
    
    document.getElementById('whatsappOrder').href = 
        `https://wa.me/${whatsappTarget}?text=${encodeURIComponent(waPrefix + "I'm interested in " + product.name + " ID: " + product.id)}`;

    // Telegram Logic
    const tgUser = (product.telegram_username || "").replace('@', '');
    document.getElementById('telegramOrder').href = tgUser ? `https://t.me/${tgUser}` : `https://t.me/+${intPhone}`;
    document.getElementById('callContact').href = `tel:+${intPhone}`;

    modal.style.display = 'flex';
    document.body.style.overflow = "hidden";
};




window.toggleVerification = async (userId, currentStatus) => {
    const { error } = await _supabase
        .from('profiles')
        .update({ is_verified: !currentStatus })
        .eq('id', userId);

    if (!error) loadUsers();
    else alert("Error: " + error.message);
};




async function loadUserProfile() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return;

    const { data: profile, error } = await _supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (profile) {
        document.getElementById('userName').innerText = profile.full_name || "New Golem Member";
        document.getElementById('userRole').innerText = profile.is_admin ? "🛡️ System Admin" : "🛒 Golem Seller";
        document.getElementById('userJoined').innerHTML = `<i class="fas fa-calendar-alt"></i> Joined: ${new Date(profile.created_at).toLocaleDateString()}`;
        
        if (profile.avatar_url) {
            document.getElementById('userAvatar').src = profile.avatar_url;
        } else {
            // Fallback to initials if no photo
            document.getElementById('userAvatar').src = `https://ui-avatars.com/api/?name=${profile.full_name || 'User'}&background=333&color=fff`;
        }
    }
}

// Handle Avatar Upload
document.getElementById('avatarUpload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const { data: { user } } = await _supabase.auth.getUser();
    const filePath = `avatars/${user.id}-${Date.now()}`;

    // 1. Upload to Storage
    const { error: uploadError } = await _supabase.storage
        .from('product-images') // You can reuse your existing bucket or create 'avatars'
        .upload(filePath, file);

    if (uploadError) return alert("Upload failed");

    // 2. Get Public URL
    const { data: { publicUrl } } = _supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

    // 3. Update Profile Table
    const { error: updateError } = await _supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

    if (!updateError) {
        document.getElementById('userAvatar').src = publicUrl;
        alert("Profile photo updated!");
    }
});


async function checkUserSession() {
    const { data: { user } } = await _supabase.auth.getUser();
    
    const userNav = document.getElementById('userNav');
    const signInBtn = document.getElementById('signInBtn');

    if (user) {
        // 1. Hide Sign In, Show User Nav
        signInBtn.style.display = 'none';
        userNav.style.display = 'flex';

        // 2. Get Profile Data (Name and Photo)
        const { data: profile } = await _supabase
            .from('profiles')
            .select('full_name, avatar_url, is_admin')
            .eq('id', user.id)
            .single();

        if (profile) {
            document.getElementById('navName').innerText = profile.full_name || "Account";
            document.getElementById('navAvatar').src = profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.full_name || 'User'}&background=333&color=fff`;
            
            // Optional: If Admin, change the click link to admin.html
            if (profile.is_admin) {
                document.getElementById('userNav').firstElementChild.onclick = () => location.href='admin.html';
            }
        }
    } else {
        // No user logged in
        signInBtn.style.display = 'block';
        userNav.style.display = 'none';
    }
}

// Simple Sign Out Function
async function signOut() {
    // 1. Call the Supabase sign out method correctly
    await _supabase.auth.signOut(); 
    
    // 2. Reload the page to clear the session and update the UI
    location.reload(); 
}

// Ensure it is globally accessible if called from an 'onclick' in HTML
window.signOut = signOut;




