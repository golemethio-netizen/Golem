
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

    
//The code above filters what is already on the screen. If you want to search through all approved products in your database
async function searchDatabase(term) {
    const { data: products, error } = await _supabase
        .from('products')
        .select('*')
        .eq('status', 'approved')
        .ilike('name', `%${term}%`); // 'ilike' makes it case-insensitive search

    if (!error) renderProducts(products);
}
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
    const grid = document.getElementById('productGrid');
    const sortOrder = document.getElementById('sortSelect').value;

    let query = _supabase
        .from('products')
        .select('*')
        .eq('status', 'approved');

    // Filter by Category
    if (category !== 'All') {
        query = query.eq('category', category);
    }

    // APPLY SORTING LOGIC
    // We always put 'is_sponsored' (true) at the top first
    query = query.order('is_sponsored', { ascending: false });

    if (sortOrder === 'newest') {
        query = query.order('created_at', { ascending: false });
    } else if (sortOrder === 'price_low') {
        query = query.order('price', { ascending: true });
    } else if (sortOrder === 'price_high') {
        query = query.order('price', { ascending: false });
    } else if (sortOrder === 'popular') {
        query = query.order('views', { ascending: false });
    }

    const { data: products, error } = await query;
    if (!error) renderProducts(products);
}

// 3. Render Product Cards to HTML
function renderProducts(products) {
    const grid = document.getElementById('productGrid');
    grid.innerHTML = products.map(p => `
        <div class="product-card ${p.is_sponsored ? 'sponsored-card' : ''}">
            ${p.is_sponsored ? '<div class="sponsored-tag">⭐ SPONSORED</div>' : ''}
            <img src="${p.image}">
            </div>
    `).join('');


    // Add this inside your renderProducts mapping
const shareData = {
    title: p.name,
    text: `Check out this ${p.name} for ${p.price} ETB on Golem!`,
    url: window.location.origin + '/checkout.html?id=' + p.id
};

// Add this button HTML inside your product-card
`<button class="share-btn" onclick="shareItem('${p.name}', '${p.price}', '${p.id}')">
    📤 Share
</button>`
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




