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
    
    // Debugging: This will tell us if the script can't find the 'productGrid' div
    if (!grid) {
        console.error("Error: Could not find the element with ID 'productGrid' on the page.");
        return;
    }

    console.log("Rendering 33 products into the grid now...");

    grid.innerHTML = products.map(p => {
       // Inside products.map(p => { ...
return `
    <div class="product-card">
        <img src="${p.image}" alt="${p.name}">
        <div class="product-info">
            <h3>${p.name}</h3>
            <p class="price">${p.price} ETB</p>
            
            <div class="action-buttons">
                <button class="main-btn" onclick="handleViewAndBuy('${p.id}')">🛒 Buy Now</button>
                <div style="display: flex; gap: 5px;">
                    <a href="https://t.me/${p.telegram_username}" target="_blank" class="tg-btn" style="flex:2;">✈️ Telegram</a>
                    <button class="share-btn" onclick="shareItem('${p.name}', '${p.price}', '${p.id}')" style="flex:1;">📤 Share</button>
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
    const container = document.querySelector('.filter-bar'); // Matches your HTML
    if (!container) return;

    const { data: cats, error } = await _supabase.from('categories').select('name').order('name');
    if (error) {
        console.error("Category Load Error:", error.message);
        return;
    }

    // Keep your hardcoded buttons and append new ones from the database
    if (cats) {
        cats.forEach(c => {
            // Check if button already exists to avoid duplicates
            if (!container.innerHTML.includes(c.name)) {
                container.innerHTML += `<button class="filter-btn" onclick="filterCategory('${c.name}', this)">${c.name}</button>`;
            }
        });
    }
}

window.filterCategory = function(cat, btn) {
    console.log("Category clicked:", cat); // This should pop up in your console!
    fetchProducts(cat);
    
    // UI: highlight active button
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
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






