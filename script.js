
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    updateUIForUser();
    loadDynamicFilters();

    // Search input listener
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            filterSearch(term);
        });
    }
});

/* ==========================================
   2. PRODUCT FETCHING & RENDERING
   ========================================== */
async function fetchProducts(category = 'All') {
    const sortSelect = document.getElementById('sortSelect');
    const sortOrder = sortSelect ? sortSelect.value : 'newest';

    // We use .select('*') to ensure new columns (description, condition) are fetched
    let query = _supabase.from('products').select('*').eq('status', 'approved');

    if (category !== 'All') {
        query = query.eq('category', category);
    }

    // Sort: Sponsored items always stay at the top
    query = query.order('is_sponsored', { ascending: false });

    if (sortOrder === 'newest') query = query.order('created_at', { ascending: false });
    else if (sortOrder === 'price_low') query = query.order('price', { ascending: true });
    else if (sortOrder === 'price_high') query = query.order('price', { ascending: false });
    else if (sortOrder === 'popular') query = query.order('views', { ascending: false });

    const { data: products, error } = await query;
    if (error) {
        console.error("Error fetching products:", error);
        return;
    }
    renderProducts(products);
}

function renderProducts(products) {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    if (products.length === 0) {
        grid.innerHTML = '<p style="text-align:center; padding:20px;">No items found.</p>';
        return;
    }

    grid.innerHTML = products.map(p => {
        const isSold = p.status === 'sold';
        const telegramLink = `https://t.me/${p.telegram_username || 'GolemSupport'}`;
        
        return `
            <div class="product-card ${isSold ? 'is-sold' : ''}">
                <div class="img-wrapper" style="position: relative;">
                    ${isSold ? '<div class="sold-watermark">SOLD</div>' : ''}
                    <span class="condition-tag">${p.condition || 'Used'}</span>
                    <img src="${p.image}" alt="${p.name}" loading="lazy">
                </div>
                <div class="product-info">
                    <h3>${p.name}</h3>
                    <p class="description-preview">${p.description || 'No description provided.'}</p>
                    <p class="price">${p.price} ETB</p>
                    
                    <div class="action-buttons" style="display: flex; flex-direction: column; gap: 8px;">
                        ${isSold ? 
                            `<button class="main-btn" disabled style="background:#ccc;">Already Sold</button>` : 
                            `<button class="main-btn" onclick="handleViewAndBuy('${p.id}')">🛒 Buy Now</button>`
                        }
                        
                        <div style="display: flex; gap: 5px;">
                            <a href="${telegramLink}" target="_blank" class="tg-btn" style="flex: 2; text-decoration: none; text-align: center;">✈️ Telegram</a>
                            <button class="share-btn" onclick="shareItem('${p.name}', '${p.price}', '${p.id}')" style="flex: 1;">📤 Share</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Hide global loader if present
    const loader = document.getElementById('pageLoader');
    if (loader) loader.style.display = 'none';
}

/* ==========================================
   3. FILTERS & SEARCH
   ========================================== */
function filterSearch(term) {
    const cards = document.querySelectorAll('.product-card');
    let visibleCount = 0;

    cards.forEach(card => {
        const title = card.querySelector('h3').innerText.toLowerCase();
        const desc = card.querySelector('.description-preview').innerText.toLowerCase();
        
        if (title.includes(term) || desc.includes(term)) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });

    const grid = document.getElementById('productGrid');
    const existingMsg = document.getElementById('noMatchMsg');
    
    if (visibleCount === 0 && !existingMsg) {
        const msg = document.createElement('p');
        msg.id = 'noMatchMsg';
        msg.innerText = "No items match your search.";
        msg.style.cssText = "text-align:center; grid-column:1/-1; padding:20px; color:#666;";
        grid.appendChild(msg);
    } else if (visibleCount > 0 && existingMsg) {
        existingMsg.remove();
    }
}

async function loadDynamicFilters() {
    const container = document.querySelector('.filter-container');
    if (!container) return;

    const { data: cats, error } = await _supabase.from('categories').select('name').order('name');
    if (error) {
        console.error("Category Load Error:", error.message);
        return;
    }

    container.innerHTML = `<button class="filter-btn active" onclick="filterCategory('All', this)">All</button>`;
    if (cats) {
        cats.forEach(c => {
            container.innerHTML += `<button class="filter-btn" onclick="filterCategory('${c.name}', this)">${c.name}</button>`;
        });
    }
}

window.filterCategory = function(cat, btn) {
    // UI Update
    if (!btn) {
        const allBtns = document.querySelectorAll('.filter-btn');
        btn = Array.from(allBtns).find(b => b.innerText.trim() === cat);
    }
    if (btn) {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }
    // Fetch Data
    fetchProducts(cat);
};

window.applyPriceFilter = function() {
    const min = parseFloat(document.getElementById('minPrice').value) || 0;
    const max = parseFloat(document.getElementById('maxPrice').value) || Infinity;
    const cards = document.querySelectorAll('.product-card');
    
    cards.forEach(card => {
        const priceText = card.querySelector('.price').innerText;
        const price = parseFloat(priceText.replace(' ETB', ''));
        card.style.display = (price >= min && price <= max) ? 'block' : 'none';
    });
};

/* ==========================================
   4. USER ACTIONS & AUTH
   ========================================== */
async function incrementView(productId) {
    try {
        await _supabase.rpc('increment_views', { row_id: productId });
    } catch (e) {
        console.log("View count error:", e);
    }
}

function handleViewAndBuy(id) {
    incrementView(id);
    location.href = `checkout.html?id=${id}`;
}

async function shareItem(name, price, id) {
    const shareUrl = `${window.location.origin}${window.location.pathname.replace('index.html','')}checkout.html?id=${id}`;
    const shareText = `Check out this ${name} for ${price} ETB on Golem Marketplace!`;

    if (navigator.share) {
        try { await navigator.share({ title: 'Golem', text: shareText, url: shareUrl }); } 
        catch (err) { console.log("Share cancelled"); }
    } else {
        navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
        alert("Link copied to clipboard!");
    }
}

async function updateUIForUser() {
    const userMenu = document.getElementById('userMenu');
    if (!userMenu) return;

    const { data: { user } } = await _supabase.auth.getUser();
    userMenu.innerHTML = user ? 
        `<button onclick="location.href='my-items.html'" class="filter-btn">My Items</button>
         <button onclick="handleSignOut()" class="login-btn">Sign Out</button>` : 
        `<button onclick="location.href='login.html'" class="login-btn">Sign In</button>`;
}

async function handleSignOut() {
    await _supabase.auth.signOut();
    window.location.reload();
}

window.checkAuthToSell = async function() {
    const { data: { user }, error } = await _supabase.auth.getUser();
    if (error || !user) {
        alert("Please Sign In to post an item.");
        window.location.href = 'login.html';
        return;
    }
    window.location.href = 'submit.html';
};

