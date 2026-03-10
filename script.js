/* ==========================================
   1. INITIALIZATION & CORE LISTENERS
   ========================================== */
document.addEventListener('DOMContentLoaded', async () => {
    // Initial data fetch
    fetchProducts();
    updateUIForUser();

    // Search Listener
    const searchInput = document.getElementById('headerSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterSearch(e.target.value.toLowerCase());
        });
    }

    // Auth Form Listener
    const authForm = document.getElementById('authForm');
    if (authForm) {
        authForm.addEventListener('submit', handleAuthSubmit);
    }
});

/* ==========================================
   2. PRODUCT FETCHING (The Supabase Handshake)
   ========================================== */
async function fetchProducts(category = 'All') {
    const grid = document.getElementById('productGrid');
    if (!grid) return;
    
    grid.innerHTML = '<div class="loading-spinner"><i class="fas fa-circle-notch fa-spin"></i> Loading items...</div>';

    // IMPORTANT: We explicitly ask for 'phone_number' here
    let query = _supabase
        .from('products')
        .select('id, name, price, description, status, image, category, phone_number, seller_telegram');

    if (category !== 'All') {
        query = query.eq('category', category);
    }

    const { data: products, error } = await query.order('created_at', { ascending: false });

    if (error) {
        console.error("Supabase Error:", error);
        grid.innerHTML = '<p>Error loading products. Please refresh.</p>';
        return;
    }

    renderProductGrid(products);
}

function renderProductGrid(products) {
    const grid = document.getElementById('productGrid');
    const favs = JSON.parse(localStorage.getItem('golem_favs') || '[]');

    if (products.length === 0) {
        grid.innerHTML = '<p style="text-align:center; width:100%; padding:50px;">No items found.</p>';
        return;
    }

    grid.innerHTML = products.map(p => {
        const isFav = favs.includes(p.id);
        const condition = p.status || "New";
        const shortDesc = p.description ? p.description.substring(0, 50) + '...' : 'No description.';
        
        return `
            <div class="product-card" data-id="${p.id}">
                <div class="image-container">
                    <button class="fav-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite(event, '${p.id}')">
                        <i class="${isFav ? 'fas' : 'far'} fa-heart"></i>
                    </button>
                    <img src="${p.image}" alt="${p.name}" loading="lazy">
                    <span class="status-badge ${condition.toLowerCase()}">${condition}</span>
                </div>
                <div class="product-info">
                    <h3>${p.name}</h3>
                    <p class="product-price">${p.price?.toLocaleString()} ETB</p>
                    <p class="product-description">${shortDesc}</p>
                    
                    <div class="product-actions">
                        <button class="buy-btn" onclick='openProductDetails(${JSON.stringify(p)})'>
                           Buy Now
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/* ==========================================
   3. PRODUCT MODAL (The Display Logic)
   ========================================== */
function openProductDetails(product) {
    const modal = document.getElementById('productModal');
    
    // Fill Text & Image
    document.getElementById('modalProductTitle').innerText = product.name;
    document.getElementById('modalProductDesc').innerText = product.description || "No description.";
    document.getElementById('modalProductPrice').innerText = `${product.price?.toLocaleString()} ETB`;
    document.getElementById('modalProductImg').src = product.image;

    // Call Button Logic
    const callBtn = document.getElementById('callContact');
    const phone = product.phone_number; // Mapping to your Supabase column

    if (phone && callBtn) {
        callBtn.href = `tel:${phone}`;
        callBtn.style.display = 'flex'; // This makes it visible
    } else if (callBtn) {
        console.warn("Phone number missing for:", product.name);
        callBtn.style.display = 'none'; // Hides it if the data is empty
    }

    // WhatsApp Logic
    const waBtn = document.getElementById('whatsappContact');
    if (phone && waBtn) {
        const cleanPhone = phone.replace(/\D/g, ''); 
        waBtn.href = `https://wa.me/${cleanPhone}`;
        waBtn.style.display = 'flex';
    }

    // Telegram Logic
    const tgBtn = document.getElementById('telegramContact');
    const tgUser = product.seller_telegram;
    if (tgUser && tgBtn) {
        tgBtn.href = `https://t.me/${tgUser.replace('@', '')}`;
        tgBtn.style.display = 'flex';
    } else if (tgBtn) {
        tgBtn.style.display = 'none';
    }

    modal.style.display = 'flex';
}

function closeProductModal() {
    document.getElementById('productModal').style.display = 'none';
}

/* ==========================================
   4. AUTH & UI HELPERS
   ========================================== */
async function handleAuthSubmit(e) {
    e.preventDefault();
    const email = e.target.querySelector('input[type="email"]').value;
    const password = e.target.querySelector('input[type="password"]').value;
    const btn = e.target.querySelector('.auth-submit');

    btn.innerText = "Processing...";
    const { error } = await _supabase.auth.signInWithPassword({ email, password });

    if (error) {
        alert(error.message);
        btn.innerText = "Sign In";
    } else {
        window.location.reload();
    }
}

async function updateUIForUser() {
    const { data: { user } } = await _supabase.auth.getUser();
    const authBtn = document.querySelector('.signin-btn');
    if (user && authBtn) {
        authBtn.innerText = "Sign Out";
        authBtn.onclick = async () => {
            await _supabase.auth.signOut();
            window.location.reload();
        };
    }
}

window.toggleFavorite = function(e, id) {
    e.stopPropagation();
    let favs = JSON.parse(localStorage.getItem('golem_favs') || '[]');
    const btn = e.currentTarget;
    if (favs.includes(id)) {
        favs = favs.filter(item => item !== id);
        btn.classList.remove('active');
    } else {
        favs.push(id);
        btn.classList.add('active');
    }
    localStorage.setItem('golem_favs', JSON.stringify(favs));
};

window.filterCategory = function(cat, btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    fetchProducts(cat);
};

function filterSearch(term) {
    document.querySelectorAll('.product-card').forEach(card => {
        const title = card.querySelector('h3').innerText.toLowerCase();
        card.style.display = title.includes(term) ? 'block' : 'none';
    });
}

function toggleModal() {
    const m = document.getElementById('authModal');
    m.style.display = (m.style.display === 'flex') ? 'none' : 'flex';
}
