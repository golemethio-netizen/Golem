
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    updateUIForUser();


// Search Listener
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            filterSearch(term);
        });
    }
});

// 2. The Filter Function (No database call needed, it filters the current view)
function filterSearch(term) {
    const cards = document.querySelectorAll('.product-card');
    
    cards.forEach(card => {
        const title = card.querySelector('h3').innerText.toLowerCase();
        // Check if title contains the search term
        if (title.includes(term)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });


// Optional: Show "No items found" message if all are hidden
    const visibleCards = Array.from(cards).filter(c => c.style.display !== 'none');
    const grid = document.getElementById('productGrid');
    const existingNoMatch = document.getElementById('noMatchMsg');

    if (visibleCards.length === 0) {
        if (!existingNoMatch) {
            const msg = document.createElement('p');
            msg.id = 'noMatchMsg';
            msg.innerText = "No items match your search.";
            msg.style.textAlign = "center";
            grid.appendChild(msg);
        }
    } else if (existingNoMatch) {
        existingNoMatch.remove();
    }
}



// 2. Fetch Approved Products from Supabase
async function fetchProducts(category = 'All') {
    const productGrid = document.getElementById('productGrid');
    if (!productGrid) return;

    productGrid.innerHTML = '<p class="loading">Loading amazing items...</p>';

    let query = _supabase
        .from('products')
        .select('*')
        .eq('status', 'approved') // Only show items approved by Admin
        .order('created_at', { ascending: false });

    // Apply category filter if not 'All'
    if (category !== 'All') {
        query = query.eq('category', category);
    }

    const { data: products, error } = await query;

    if (error) {
        console.error("Database Error:", error.message);
        productGrid.innerHTML = '<p>Error loading products. Please refresh.</p>';
        return;
    }

    if (products.length === 0) {
        productGrid.innerHTML = '<p>No items found in this category.</p>';
        return;
    }

    renderProducts(products);
}

// 3. Render Product Cards to HTML
function renderProducts(products) {
    const productGrid = document.getElementById('productGrid');
    
    productGrid.innerHTML = products.map(p => `
        <div class="product-card">
            <div class="category-tag">${p.category}</div>
            <div class="img-container">
                <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x200?text=Image+Not+Found'">
            </div>
            <div class="product-info">
                <h3>${p.name}</h3>
                <div class="price-row">
                    <p class="price">${p.price} ETB</p>
                    <span class="views-count">👁️ ${p.views || 0}</span>
                </div>
                <button class="main-btn" onclick="location.href='checkout.html?id=${p.id}'">Buy Now</button>
            </div>
        </div>
    `).join('');
}

// 4. Update Navigation UI (Login/Logout/My Items)
async function updateUIForUser() {
    const userMenu = document.getElementById('userMenu');
    if (!userMenu) return;

    const { data: { user } } = await _supabase.auth.getUser();

    if (user) {
        // Logged in: Show My Items and Sign Out
        userMenu.innerHTML = `
            <button onclick="location.href='my-items.html'" class="filter-btn">My Items</button>
            <button onclick="handleSignOut()" class="login-btn">Sign Out</button>
        `;
    } else {
        // Not logged in: Show Sign In
        userMenu.innerHTML = `<button onclick="location.href='login.html'" class="login-btn">Sign In</button>`;
    }
}

// 5. Handle Sign Out
async function handleSignOut() {
    const { error } = await _supabase.auth.signOut();
    if (!error) window.location.reload();
}

// 6. Security Check for the "Sell" Button (index.html:33 fix)
async function checkAuthToSell() {
    const { data: { user } } = await _supabase.auth.getUser();

    if (user) {
        window.location.href = 'submit.html';
    } else {
        alert("Please Sign In to post an item.");
        window.location.href = 'login.html';
    }
}

// 7. Category Filter Logic for Buttons
function filterCategory(cat) {
    // Optional: add "active" class to clicked button
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    fetchProducts(cat);
}

async function loadDynamicFilters() {
    const filterContainer = document.querySelector('.filter-container'); // Ensure you have this class in HTML
    const { data: cats } = await _supabase.from('categories').select('name');
    
    let html = `<button class="filter-btn active" onclick="filterCategory('All')">All</button>`;
    cats.forEach(c => {
        html += `<button class="filter-btn" onclick="filterCategory('${c.name}')">${c.name}</button>`;
    });
    filterContainer.innerHTML = html;
}

