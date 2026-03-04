/* ==========================================
   1. INITIALIZATION & LISTENERS
   ========================================== */
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    updateUIForUser();
    loadDynamicFilters();



// 1. Find the form
const authForm = document.getElementById('authForm');

if (authForm) {
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevent page from refreshing
        
        // 2. Get the values from your HTML inputs
        // Note: Check your HTML to ensure these inputs have 'type="email"' and 'type="password"'
        const email = authForm.querySelector('input[type="email"]').value;
        const password = authForm.querySelector('input[type="password"]').value;
        const submitBtn = authForm.querySelector('.auth-submit');

        // UI: Show the user something is happening
        submitBtn.innerText = "Processing...";
        submitBtn.disabled = true;

        // 3. Send to Supabase
        const { data, error } = await _supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            alert("Login Failed: " + error.message);
            submitBtn.innerText = "Sign In";
            submitBtn.disabled = false;
        } else {
            // Success!
            console.log("Logged in as:", data.user.email);
            toggleModal(); // Close the modal
            window.location.reload(); // Refresh to update the Nav bar
        }
    });
}



   

    const searchInput = document.getElementById('headerSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterSearch(e.target.value.toLowerCase());
        });
    }
});

/* ==========================================
   2. DATA FETCHING
   ========================================== */
async function fetchProducts(category = 'All') {
    console.log("Fetching:", category);
    
    // Using the '_supabase' variable from your config.js
    let query = _supabase.from('products').select('*');

    if (category !== 'All') {
        query = query.eq('category', category);
    }

    const { data: products, error } = await query;

    if (error) {
        console.error("Supabase Error:", error.message);
        return;
    }

    renderProducts(products);
}

/* ==========================================
   3. RENDERING ENGINE (The Core Fix)
   ========================================== */
function renderProducts(products) {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    // Get current favorites to highlight hearts correctly
    const favs = JSON.parse(localStorage.getItem('golem_favs') || '[]');

    if (products.length === 0) {
        grid.innerHTML = '<p style="text-align:center; width:100%; padding:50px;">No items found.</p>';
        return;
    }

    grid.innerHTML = products.map(p => {
        const isFav = favs.includes(p.id);
        const telegramLink = `https://t.me/${p.telegram_username || 'GolemSupport'}`;
        
        return `
            <div class="product-card" data-id="${p.id}">
                <div class="img-wrapper" style="position: relative;">
                    <button class="fav-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite(event, '${p.id}')">
                        <i class="${isFav ? 'fas' : 'far'} fa-heart"></i>
                    </button>
                    
                    <span class="condition-tag">${p.condition || 'Used'}</span>
                    <img src="${p.image}" alt="${p.name}" loading="lazy">
                </div>

                <div class="product-info">
                    <h3>${p.name}</h3>
                    <p class="description-preview">${p.description || ''}</p>
                    <p class="price">${p.price} ETB</p>
                    
                    <div class="action-buttons">
                        <button class="main-btn" onclick="handleViewAndBuy('${p.id}')">🛒 Buy Now</button>
                        
                        <div style="display: flex; gap: 5px; width: 100%;">
                            <a href="${telegramLink}" target="_blank" class="tg-btn" style="flex: 2;">✈️ Telegram</a>
                            <button class="share-btn" onclick="shareItem('${p.name}', '${p.price}', '${p.id}')" style="flex: 1;">📤</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/* ==========================================
   4. FAVORITES & FILTERS LOGIC
   ========================================== */
window.toggleFavorite = function(event, productId) {
    event.stopPropagation();
    let favs = JSON.parse(localStorage.getItem('golem_favs') || '[]');
    const btn = event.currentTarget;
    const icon = btn.querySelector('i');

    if (favs.includes(productId)) {
        favs = favs.filter(id => id !== productId);
        btn.classList.remove('active');
        icon.classList.replace('fas', 'far');
    } else {
        favs.push(productId);
        btn.classList.add('active');
        icon.classList.replace('far', 'fas');
    }
    localStorage.setItem('golem_favs', JSON.stringify(favs));
};

window.filterFavorites = function(btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const favs = JSON.parse(localStorage.getItem('golem_favs') || '[]');
    const cards = document.querySelectorAll('.product-card');
    let visibleCount = 0;

    cards.forEach(card => {
        const id = card.getAttribute('data-id');
        if (favs.includes(id)) {
            card.style.display = 'inline-block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });

    if (visibleCount === 0) {
        alert("No favorites saved yet!");
        filterCategory('All');
    }
};

window.filterCategory = function(cat, btn) {
    const allBtns = document.querySelectorAll('.filter-btn');
    allBtns.forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    
    fetchProducts(cat);
};

/* ==========================================
   5. SEARCH & PRICE FILTERS
   ========================================== */
function filterSearch(term) {
    const cards = document.querySelectorAll('.product-card');
    cards.forEach(card => {
        const title = card.querySelector('h3').innerText.toLowerCase();
        card.style.display = title.includes(term) ? 'inline-block' : 'none';
    });
}

window.applyPriceFilter = function() {
    const min = parseFloat(document.getElementById('minPrice').value) || 0;
    const max = parseFloat(document.getElementById('maxPrice').value) || Infinity;
    document.querySelectorAll('.product-card').forEach(card => {
        const price = parseFloat(card.querySelector('.price').innerText.replace(' ETB', ''));
        card.style.display = (price >= min && price <= max) ? 'inline-block' : 'none';
    });
};

/* ==========================================
   6. UTILITIES (Buy, Share, Auth)
   ========================================== */
function handleViewAndBuy(id) {
    location.href = `checkout.html?id=${id}`;
}

async function shareItem(name, price, id) {
    const url = `${window.location.origin}/checkout.html?id=${id}`;
    if (navigator.share) {
        navigator.share({ title: 'Golem', text: `${name} - ${price} ETB`, url });
    } else {
        navigator.clipboard.writeText(url);
        alert("Link copied!");
    }
}

async function loadDynamicFilters() {
    const container = document.querySelector('.filter-bar');
    const { data: cats } = await _supabase.from('categories').select('name');
    if (cats && container) {
        cats.forEach(c => {
            if (!container.innerHTML.includes(c.name)) {
                container.innerHTML += `<button class="filter-btn" onclick="filterCategory('${c.name}', this)">${c.name}</button>`;
            }
        });
    }
}

function toggleModal() {
    const m = document.getElementById('authModal');
    m.style.display = (m.style.display === 'flex') ? 'none' : 'flex';
}

async function updateUIForUser() {
    const btn = document.querySelector('.signin-btn');
    const { data: { user } } = await _supabase.auth.getUser();
    if (user && btn) {
        btn.innerText = "Sign Out";
        btn.onclick = async () => { await _supabase.auth.signOut(); location.reload(); };
    }
}

