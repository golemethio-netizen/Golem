document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    updateUIForUser();
    loadCategories();

    // Live Search Listener
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            filterUI(term);
        });
    }
});

// 1. Fetch and Sort Products
async function fetchProducts(category = 'All') {
    const grid = document.getElementById('productGrid');
    const sortOrder = document.getElementById('sortSelect').value;

    let query = _supabase.from('products').select('*').eq('status', 'approved');

    if (category !== 'All') query = query.eq('category', category);

    // Apply Priority Sorting
    query = query.order('is_sponsored', { ascending: false });
    
    if (sortOrder === 'newest') query = query.order('created_at', { ascending: false });
    else if (sortOrder === 'price_low') query = query.order('price', { ascending: true });
    else if (sortOrder === 'price_high') query = query.order('price', { ascending: false });
    else if (sortOrder === 'popular') query = query.order('views', { ascending: false });

    const { data: products, error } = await query;
    if (!error) renderProducts(products);
}

// 2. Render Cards with Share Buttons
function renderProducts(products) {
    const grid = document.getElementById('productGrid');
    grid.innerHTML = products.map(p => `
        <div class="product-card ${p.is_sponsored ? 'sponsored' : ''}">
            ${p.is_sponsored ? '<div class="sponsored-tag">⭐ SPONSORED</div>' : ''}
            <div class="img-wrapper">
                <img src="${p.image}" alt="${p.name}" loading="lazy">
                <button class="share-btn-overlay" onclick="shareItem('${p.name}', '${p.price}', '${p.id}')">📤 Share</button>
            </div>
            <div class="product-info">
                <h3>${p.name}</h3>
                <div class="price-row">
                    <span class="price">${p.price} ETB</span>
                    <span class="views">👁️ ${p.views || 0}</span>
                </div>
                <button class="main-btn" onclick="location.href='checkout.html?id=${p.id}'">Buy Now</button>
            </div>
        </div>
    `).join('');
}

// 3. Web Share API
async function shareItem(name, price, id) {
    const shareUrl = `${window.location.origin}${window.location.pathname.replace('index.html', '')}checkout.html?id=${id}`;
    try {
        await navigator.share({
            title: 'Golem Ethiopia',
            text: `Check out this ${name} for ${price} ETB!`,
            url: shareUrl
        });
    } catch (err) {
        navigator.clipboard.writeText(shareUrl);
        alert("Link copied to clipboard!");
    }
}

// 4. UI Auth Checks
async function updateUIForUser() {
    const { data: { user } } = await _supabase.auth.getUser();
    const menu = document.getElementById('userMenu');
    menu.innerHTML = user ? 
        `<button onclick="location.href='my-items.html'" class="filter-btn">My Items</button>` : 
        `<button onclick="location.href='login.html'" class="login-btn">Sign In</button>`;
}

async function checkAuthToSell() {
    const { data: { user } } = await _supabase.auth.getUser();
    location.href = user ? 'submit.html' : 'login.html';
}

function filterUI(term) {
    const cards = document.querySelectorAll('.product-card');
    cards.forEach(card => {
        const title = card.querySelector('h3').innerText.toLowerCase();
        card.style.display = title.includes(term) ? 'block' : 'none';
    });
}

async function loadCategories() {
    const { data: cats } = await _supabase.from('categories').select('name');
    const container = document.getElementById('categoryFilters');
    if (cats) {
        container.innerHTML = `<button class="filter-btn active" onclick="fetchProducts('All')">All</button>` + 
            cats.map(c => `<button class="filter-btn" onclick="fetchProducts('${c.name}')">${c.name}</button>`).join('');
    }
}
