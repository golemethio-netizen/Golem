/**
 * GOLEM MARKETPLACE - CORE SCRIPT
 * Handles: Auth, Product Fetching, Filtering, Modals, and Verification
 */

// 1. INITIALIZATION & AUTH STATE

let currentProduct = null;



document.addEventListener('DOMContentLoaded', async () => {
    await checkUser();
    await fetchProducts();
    updateCartBadge();
});


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






async function checkUser() {
    
    const { data: { user } } = await _supabase.auth.getUser();
    const signInBtn = document.getElementById('signInBtn');
    const userWelcome = document.getElementById('userWelcome');
    const userName = document.getElementById('userName');
    const adminLink = document.getElementById('adminNavLink');

    if (user) {
        signInBtn.style.display = 'none';
        userWelcome.style.display = 'flex';
        userName.innerText = user.user_metadata.full_name || user.email.split('@')[0];
        
        // Check if Admin to show dashboard link
        const { data: profile } = await _supabase.from('profiles').select('is_admin').eq('id', user.id).single();
        if (profile?.is_admin) adminLink.style.display = 'flex';
    }
}

// 2. PRODUCT FETCHING (The "Fix" is here)
window.currentCategory = 'All';

window.fetchProducts = async function() {
    const { data: products, error } = await query;
    const grid = document.getElementById('productGrid');
    const sort = document.getElementById('sortSelect').value;
    
    // JOIN: profiles(is_verified) is required to see the green checkmark
    let query = _supabase
        .from('products')
        .select('*, profiles(is_verified, full_name)') 
        .eq('status', 'approved');

    // Category Filter
    if (window.currentCategory !== 'All') {
        query = query.eq('category', window.currentCategory);
    }

    // Sorting Logic
    if (sort === 'price_low') query = query.order('price', { ascending: true });
    else if (sort === 'price_high') query = query.order('price', { ascending: false });
    else query = query.order('created_at', { ascending: false });

    const { data: products, error } = await query;

    if (error) {
        grid.innerHTML = `<p style="color:red;">Error loading items: ${error.message}</p>`;
        return;
    }

    renderProducts(products);
};

// 3. RENDERING LOGIC
function renderProducts(products) {
    const grid = document.getElementById('productGrid');
    if (products.length === 0) {
        grid.innerHTML = '<div style="padding:50px; text-align:center; color:#888; width:100%;">No items found in this category.</div>';
        return;
    }

    grid.innerHTML = products.map(item => {
        // This checks the joined profile data for verification status
        const isVerified = item.profiles?.is_verified === true;

        return `
        <div class="product-card" onclick="window.openProductModal('${item.id}')">
            <div class="product-img-wrapper">
                <img src="${item.image}" alt="${item.name}" loading="lazy">
                ${item.is_sponsored ? '<span class="featured-tag">FEATURED</span>' : ''}
            </div>
            <div class="product-info">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h3 class="product-title">${item.name}</h3>
                    <i class="fas fa-check-circle" 
                       style="color: ${isVerified ? '#2ed573' : '#ccc'}; font-size: 0.9rem;" 
                       title="${isVerified ? 'Verified Seller' : 'Unverified'}">
                    </i>
                </div>
                <p class="product-price">${item.price.toLocaleString()} ETB</p>
                <p class="product-loc"><i class="fas fa-map-marker-alt"></i> ${item.location || 'Addis Ababa'}</p>
            </div>
        </div>`;
    }).join('');
}




/ --- CHAT & UI UTILS ---
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






// 4. MODAL LOGIC
window.openProductModal = async function(id) {
    const { data: item, error } = await _supabase.from('products')

        .from('products')
        .select('*, profiles(is_verified, phone, full_name)')
        .eq('id', id)
        .single();

    if (error) return;

    document.getElementById('modalProductImg').src = item.image;
    document.getElementById('modalProductTitle').innerText = item.name;
    document.getElementById('modalProductPrice').innerText = `${item.price.toLocaleString()} ETB`;
    document.getElementById('modalProductDesc').innerText = item.description;

    // Update Seller Badge in Modal
    const badgeContainer = document.getElementById('sellerBadgeContainer');
    const isVerified = item.profiles?.is_verified;
    badgeContainer.innerHTML = isVerified 
        ? `<span style="color:#2ed573; font-weight:bold; font-size:0.8rem;"><i class="fas fa-check-circle"></i> VERIFIED SELLER</span>`
        : `<span style="color:#888; font-size:0.8rem;">Standard Seller</span>`;

    // Contact Buttons
    document.getElementById('callContact').href = `tel:${item.seller_phone || item.profiles?.phone}`;
    
    const message = `Hello, I am interested in your item: ${item.name} (${item.price} ETB). Is it available?`;
    document.getElementById('telegramOrder').href = `https://t.me/allInOneEthiopia1?text=${encodeURIComponent(message)}`;
    document.getElementById('whatsappOrder').href = `https://wa.me/251707022845?text=${encodeURIComponent(message)}`;

    document.getElementById('productModal').style.display = 'flex';
};

window.closeProductModal = () => {
    document.getElementById('productModal').style.display = 'none';
};

// 5. FILTERING & SEARCH
window.filterCategory = function(category, btn) {
    window.currentCategory = category;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    window.fetchProducts();
};

document.getElementById('headerSearch').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('.product-card').forEach(card => {
        const text = card.innerText.toLowerCase();
        card.style.display = text.includes(term) ? 'block' : 'none';
    });
});

// 6. AUTH ACTIONS
window.toggleModal = () => {
    const modal = document.getElementById('authModal');
    modal.style.display = (modal.style.display === 'flex') ? 'none' : 'flex';
};

window.handleSignOut = async () => {
    await _supabase.auth.signOut();
    location.reload();
};

window.checkAuthToSell = async () => {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) {
        alert("Please Sign In to post an item.");
        window.toggleModal();
        event.preventDefault();
    }
};

// 7. UTILS
function updateCartBadge() {
    const saved = JSON.parse(localStorage.getItem('golem_saved') || '[]');
    const badge = document.getElementById('cartBadge');
    if (badge && saved.length > 0) {
        badge.innerText = saved.length;
        badge.style.display = 'block';
    }
}
