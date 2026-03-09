/* ==========================================
   1. INITIALIZATION & CORE LISTENERS
   ========================================== */
document.addEventListener('DOMContentLoaded', async () => {
    fetchProducts();
    updateUIForUser();

    const searchInput = document.getElementById('headerSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterSearch(e.target.value.toLowerCase());
        });
    }

    const authForm = document.getElementById('authForm');
    if (authForm) {
        authForm.addEventListener('submit', handleAuthSubmit);
    }
});

/* ==========================================
   2. PRODUCT FETCHING & RENDERING
   ========================================== */
async function fetchProducts(category = 'All') {
    const grid = document.getElementById('productGrid');
    if (!grid) return;
    
    grid.innerHTML = '<p style="text-align:center; width:100%;">Loading latest items...</p>';

    let query = _supabase.from('products').select('*');
    
    if (category !== 'All') {
        query = query.eq('category', category);
    }

    const { data: products, error } = await query.order('created_at', { ascending: false });

    if (error) {
        grid.innerHTML = '<p>Error loading products.</p>';
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
        const shortDesc = p.description ? p.description.substring(0, 60) + '...' : 'No description.';
        
        // Share Logic
        const shareMsg = encodeURIComponent(`Check out this ${p.name} for ${p.price} ETB!`);
        const tgLink = `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${shareMsg}`;

        return `
            <div class="product-card" data-id="${p.id}">
                <div class="image-container" style="position: relative;">
                    <button class="fav-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite(event, '${p.id}')">
                        <i class="${isFav ? 'fas' : 'far'} fa-heart"></i>
                    </button>
                    <img src="${p.image}" alt="${p.name}" loading="lazy">
                    <span class="status-badge ${condition.toLowerCase()}">${condition}</span>
                </div>
                <div class="product-info">
                    <h3>${p.name}</h3>
                    <p class="product-price">${p.price.toLocaleString()} ETB</p>
                    <p class="product-description">${shortDesc}</p>
                    
                    <div class="product-actions">
                        <button class="buy-btn" onclick='openProductDetails(${JSON.stringify(p)})'>
                           Buy Now
                        </button>
                        <a href="${tgLink}" target="_blank" class="share-btn">
                            <i class="fab fa-telegram"></i>
                        </a>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/* ==========================================
   3. MODAL & INTERACTION LOGIC
   ========================================== */
function openProductDetails(product) {
    cconst modal = document.getElementById('productModal');
    const callBtn = document.getElementById('callContact');
   const phoneNumber = product.seller_contact || 
                        product.seller_phone || 
                        product.phone || 
                        product.contact;

    console.log("Found Phone Number:", phoneNumber); // Check your F12 Console for this!

    if (phoneNumber && callBtn) {
        callBtn.href = `tel:${phoneNumber}`;
        callBtn.style.setProperty('display', 'flex', 'important');
        
        // Update the text inside just to be sure
        callBtn.innerHTML = `<i class="fas fa-phone-alt"></i> Call Seller (${phoneNumber})`;
    } else if (callBtn) {
        console.error("No phone number found in product data:", product);
        callBtn.style.display = 'none';
    }


    if(!modal) return;

    // Set Text Content
    document.getElementById('modalProductTitle').innerText = product.name;
    document.getElementById('modalProductDesc').innerText = product.description || "No description.";
    document.getElementById('modalProductPrice').innerText = `${product.price?.toLocaleString()} ETB`;
    document.getElementById('modalProductImg').src = product.image;

    // Call Button Logic
    const callBtn = document.getElementById('callContact');
    const phone = product.seller_contact || product.phone;
    
    if (phone && callBtn) {
        callBtn.href = `tel:${phone}`;
        callBtn.style.display = 'flex';
    } else if (callBtn) {
        callBtn.style.display = 'none';
    }

    // Social Links
    const waLink = document.getElementById('whatsappContact');
    const tgLink = document.getElementById('telegramContact');
    
    if(waLink) waLink.href = `https://wa.me/${phone}`;
    if(tgLink) tgLink.href = `https://t.me/${product.seller_telegram || ''}`;

    modal.style.display = 'flex';
}

function closeProductModal() {
    document.getElementById('productModal').style.display = 'none';
}

/* ==========================================
   4. FAVORITES & FILTERS
   ========================================== */
window.toggleFavorite = function(e, id) {
    e.stopPropagation();
    let favs = JSON.parse(localStorage.getItem('golem_favs') || '[]');
    const btn = e.currentTarget;
    const icon = btn.querySelector('i');

    if (favs.includes(id)) {
        favs = favs.filter(item => item !== id);
        btn.classList.remove('active');
        icon.classList.replace('fas', 'far');
    } else {
        favs.push(id);
        btn.classList.add('active');
        icon.classList.replace('far', 'fas');
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

// Ensure modal closes when clicking outside the content
window.onclick = function(event) {
    const authModal = document.getElementById('authModal');
    const productModal = document.getElementById('productModal');
    if (event.target == authModal) authModal.style.display = "none";
    if (event.target == productModal) productModal.style.display = "none";
};

