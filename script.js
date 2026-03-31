/**
 * GOLEM MARKETPLACE - CORE SCRIPT (Integrated Version)
 * Handles: Auth, Product Fetching, Filtering, Modals, and Verification
 */

// --- 1. GLOBAL STATE & INITIALIZATION ---
window.currentCategory = 'All';
let currentProduct = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Auth & UI Setup
    const { data: { user } } = await _supabase.auth.getUser();
    if (user) {
        await updateUIForUser(user);
    }
    
    // Initial Data Fetch
    await fetchProducts();
    updateCartBadge();
    if (window.loadSponsor) window.loadSponsor();

    // UI: Online Status Dot (8 AM - 8 PM)
    const now = new Date();
    const hour = now.getHours();
    const dot = document.querySelector('.online-dot');
    if (dot) {
        dot.style.display = (hour >= 8 && hour < 20) ? 'block' : 'none';
    }

    // UI: Chat Toast Delay
    setTimeout(() => {
        const toast = document.getElementById('chatToast');
        const menu = document.getElementById('chatMenu');
        if (toast && (!menu || !menu.classList.contains('active'))) {
            toast.style.display = 'block';
        }
    }, 5000);

    // Search Event Listener
    const searchInput = document.getElementById('headerSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('.product-card').forEach(card => {
                const text = card.innerText.toLowerCase();
                card.style.display = text.includes(term) ? 'block' : 'none';
            });
        });
    }
});

// --- 2. AUTH & USER INTERFACE ---
async function updateUIForUser(user) {
    const signInBtn = document.getElementById('signInBtn');
    const userWelcome = document.getElementById('userWelcome');
    const userName = document.getElementById('userName');
    const adminLink = document.getElementById('adminNavLink');

    if (user) {
        if (signInBtn) signInBtn.style.display = 'none';
        if (userWelcome) userWelcome.style.display = 'flex';
        if (userName) {
            userName.innerText = user.user_metadata?.full_name || user.email.split('@')[0];
        }
        
        // Check Admin Status
        const { data: profile } = await _supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .maybeSingle();

        if (profile?.is_admin && adminLink) {
            adminLink.style.display = 'flex';
        }
    }
}

// --- 3. DATA FETCHING (Buyer-Side Verification Fix) ---
async function fetchProducts() {
    const grid = document.getElementById('productGrid');
    const sort = document.getElementById('sortSelect')?.value || 'newest';
    
    if (grid) grid.innerHTML = '<div class="loading-spinner"><i class="fas fa-circle-notch fa-spin"></i> Loading...</div>';

    // JOIN: profiles(is_verified) ensures the green checkmark works
    let query = _supabase
        .from('products')
        .select('*, profiles(is_verified, full_name)') 
        .eq('status', 'approved');

    if (window.currentCategory !== 'All') {
        query = query.eq('category', window.currentCategory);
    }

    // Apply Sorting
    if (sort === 'price_low') query = query.order('price', { ascending: true });
    else if (sort === 'price_high') query = query.order('price', { ascending: false });
    else query = query.order('created_at', { ascending: false });

    const { data: fetchedItems, error } = await query;

    if (error) {
        console.error("Fetch error:", error.message);
        if (grid) grid.innerHTML = `<p style="color:red; padding:20px;">Error: ${error.message}</p>`;
        return;
    }

    renderProducts(fetchedItems);
}

// --- 4. RENDERING LOGIC ---
function renderProducts(products) {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    if (products.length === 0) {
        grid.innerHTML = '<div style="padding:50px; text-align:center; color:#888; width:100%;">No items found.</div>';
        return;
    }

    grid.innerHTML = products.map(item => {
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

// --- 5. MODAL & ORDER LOGIC ---
window.openProductModal = async function(id) {
    const { data: item, error } = await _supabase
        .from('products')
        .select('*, profiles(is_verified, phone, full_name)')
        .eq('id', id)
        .single();

    if (error) return;
    currentProduct = item;

    document.getElementById('modalProductImg').src = item.image;
    document.getElementById('modalProductTitle').innerText = item.name;
    document.getElementById('modalProductPrice').innerText = `${item.price.toLocaleString()} ETB`;
    document.getElementById('modalProductDesc').innerText = item.description;

    const badgeContainer = document.getElementById('sellerBadgeContainer');
    if (badgeContainer) {
        badgeContainer.innerHTML = item.profiles?.is_verified 
            ? `<span style="color:#2ed573; font-weight:bold;"><i class="fas fa-check-circle"></i> VERIFIED SELLER</span>`
            : `<span style="color:#888;">Standard Seller</span>`;
    }

    // Order/Contact links
    const message = `Hello, I'm interested in: ${item.name} (${item.price} ETB). Is it available?`;
    const tgBtn = document.getElementById('telegramOrder');
    const callBtn = document.getElementById('callContact');
    
    if (tgBtn) tgBtn.href = `https://t.me/allInOneEthiopia1?text=${encodeURIComponent(message)}`;
    if (callBtn) callBtn.href = `tel:${item.profiles?.phone || ''}`;

    document.getElementById('productModal').style.display = 'flex';
};

window.closeProductModal = () => {
    document.getElementById('productModal').style.display = 'none';
};

// --- 6. WISHLIST & WHITELIST ---
window.updateCartBadge = function() {
    const saved = JSON.parse(localStorage.getItem('golem_saved') || '[]');
    const badge = document.getElementById('cartBadge');
    if (badge) {
        badge.innerText = saved.length;
        badge.style.display = saved.length > 0 ? 'flex' : 'none';
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

// --- 7. CHAT & UI UTILS ---
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

window.filterCategory = function(category, btn) {
    window.currentCategory = category;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    fetchProducts();
};

window.handleSignOut = async () => {
    await _supabase.auth.signOut();
    location.reload();
};

window.toggleModal = () => {
    const modal = document.getElementById('authModal');
    if (modal) modal.style.display = (modal.style.display === 'flex') ? 'none' : 'flex';
};

// Global assignments for HTML access
window.fetchProducts = fetchProducts;
window.updateUIForUser = updateUIForUser;
