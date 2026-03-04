/* ==========================================
   1. INITIALIZATION & LISTENERS
   ========================================== */
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    updateUIForUser();
    loadDynamicFilters();

    // Synced with your index.html ID "headerSearch"
    const searchInput = document.getElementById('headerSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            filterSearch(term);
        });
    }

    // Modal close listener (clicks outside content close the modal)
    window.onclick = function(event) {
        const modal = document.getElementById('authModal');
        if (event.target == modal) {
            toggleModal();
        }
    }
});

/* ==========================================
   2. PRODUCT FETCHING & RENDERING
   ========================================== */
async function fetchProducts(category = 'All') {
    console.log("Fetching products for category:", category); // Debugging line
    
    const sortSelect = document.getElementById('sortSelect');
    const sortOrder = sortSelect ? sortSelect.value : 'newest';

    // IMPORTANT: Ensure '_supabase' matches your config.js variable name
    let query = _supabase.from('products').select('*');

    // Remove the 'approved' filter temporarily to see if products appear
    // query = query.eq('status', 'approved'); 

    if (category !== 'All') {
        query = query.eq('category', category);
    }

    const { data: products, error } = await query;

    if (error) {
        console.error("Supabase Error:", error.message);
        return;
    }

    console.log("Products found:", products.length);
    renderProducts(products);
}


function renderProducts(products) {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    if (products.length === 0) {
        grid.innerHTML = '<p style="text-align:center; padding:20px; width: 100%;">No items found.</p>';
        return;
    }

    grid.innerHTML = products.map(p => {
        const isSold = p.status === 'sold';
        const telegramLink = `https://t.me/${p.telegram_username || 'GolemSupport'}`;
        
        return `
            <div class="product-card ${isSold ? 'is-sold' : ''}">
                <div class="img-wrapper" style="position: relative;">
                    ${isSold ? '<div class="sold-watermark">SOLD</div>' : ''}
                    <span class="condition-tag" style="position:absolute; top:10px; left:10px; background:rgba(0,0,0,0.6); color:white; padding:2px 8px; border-radius:5px; font-size:12px;">
                        ${p.condition || 'Used'}
                    </span>
                    <img src="${p.image}" alt="${p.name}" loading="lazy" style="width:100%; display:block;">
                </div>
                <div class="product-info">
                    <h3>${p.name}</h3>
                    <p class="description-preview" style="font-size:14px; color:#666; margin: 5px 0;">${p.description || 'No description provided.'}</p>
                    <p class="price" style="font-weight:bold; color:#28a745; margin-bottom:10px;">${p.price} ETB</p>
                    
                    <div class="action-buttons" style="display: flex; flex-direction: column; gap: 8px;">
                        ${isSold ? 
                            `<button class="main-btn" disabled style="background:#ccc; border:none; padding:8px; border-radius:5px;">Already Sold</button>` : 
                            `<button class="main-btn" onclick="handleViewAndBuy('${p.id}')" style="background:#007bff; color:white; border:none; padding:8px; border-radius:5px; cursor:pointer;">🛒 Buy Now</button>`
                        }
                        
                        <div style="display: flex; gap: 5px;">
                            <a href="${telegramLink}" target="_blank" class="tg-btn" style="flex: 2; text-decoration: none; text-align: center; background:#0088cc; color:white; padding:5px; border-radius:5px; font-size:14px;">✈️ Telegram</a>
                            <button class="share-btn" onclick="shareItem('${p.name}', '${p.price}', '${p.id}')" style="flex: 1; cursor:pointer; background:#eee; border:1px solid #ddd; border-radius:5px;">📤 Share</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    const loader = document.getElementById('pageLoader');
    if (loader) loader.style.display = 'none';
}

/* ==========================================
   3. FILTERS & SEARCH (GRID-FRIENDLY)
   ========================================== */
function filterSearch(term) {
    const cards = document.querySelectorAll('.product-card');
    let visibleCount = 0;

    cards.forEach(card => {
        const title = card.querySelector('h3').innerText.toLowerCase();
        const desc = card.querySelector('.description-preview').innerText.toLowerCase();
        
        if (title.includes(term) || desc.includes(term)) {
            // FIX: Using inline-block to preserve Masonry flow
            card.style.display = 'inline-block'; 
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
        msg.style.cssText = "text-align:center; width:100%; padding:20px; color:#666;";
        grid.appendChild(msg);
    } else if (visibleCount > 0 && existingMsg) {
        existingMsg.remove();
    }
}

async function loadDynamicFilters() {
    const container = document.querySelector('.filter-bar'); // Matches your HTML class
    if (!container) return;

    const { data: cats, error } = await _supabase.from('categories').select('name').order('name');
    if (error) {
        console.error("Category Load Error:", error.message);
        return;
    }

    // Keep the hardcoded "All" button and append dynamic ones
    container.innerHTML = `<button class="filter-btn active" onclick="filterCategory('All', this)">All</button>`;
    if (cats) {
        cats.forEach(c => {
            container.innerHTML += `<button class="filter-btn" onclick="filterCategory('${c.name}', this)">${c.name}</button>`;
        });
    }
}

window.filterCategory = function(cat, btn) {
    const allBtns = document.querySelectorAll('.filter-btn');
    allBtns.forEach(b => b.classList.remove('active'));
    
    if (btn) {
        btn.classList.add('active');
    } else {
        const targetBtn = Array.from(allBtns).find(b => b.innerText.trim() === cat);
        if (targetBtn) targetBtn.classList.add('active');
    }
    fetchProducts(cat);
};

window.applyPriceFilter = function() {
    const min = parseFloat(document.getElementById('minPrice').value) || 0;
    const max = parseFloat(document.getElementById('maxPrice').value) || Infinity;
    const cards = document.querySelectorAll('.product-card');
    
    cards.forEach(card => {
        const priceText = card.querySelector('.price').innerText;
        const price = parseFloat(priceText.replace(' ETB', ''));
        // FIX: Using inline-block to preserve Masonry flow
        card.style.display = (price >= min && price <= max) ? 'inline-block' : 'none';
    });
};

/* ==========================================
   4. USER ACTIONS & AUTH
   ========================================== */
function toggleModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
        const currentDisplay = window.getComputedStyle(modal).display;
        modal.style.display = (currentDisplay === 'none') ? 'flex' : 'none';
    }
}

async function updateUIForUser() {
    const signinBtn = document.querySelector('.signin-btn');
    const { data: { user } } = await _supabase.auth.getUser();

    if (user && signinBtn) {
        signinBtn.innerHTML = "Sign Out";
        signinBtn.onclick = handleSignOut;
    } else if (signinBtn) {
        signinBtn.innerHTML = "Sign In";
        signinBtn.onclick = (e) => {
            e.preventDefault();
            toggleModal();
        };
    }
}

async function handleSignOut(e) {
    if (e) e.preventDefault();
    await _supabase.auth.signOut();
    window.location.reload();
}

window.checkAuthToSell = async function() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) {
        alert("Please Sign In to post an item.");
        toggleModal();
        return;
    }
    window.location.href = 'submit.html';
};

// Increment view helper
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

// Amharic Toggle Placeholder
const langBtn = document.querySelector('.lang-toggle');
if (langBtn) {
    langBtn.addEventListener('click', () => {
        alert('Switching to Amharic!');
        // logic for translation goes here
    });
}

