// 1. Global State
let allApprovedProducts = [];

// 2. Initialize App
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    updateUIForUser();
});

// 3. Fetch Data from Supabase
async function fetchProducts() {
    const productGrid = document.getElementById('productGrid');
    if (!productGrid) return;

    try {
        const { data, error } = await _supabase
            .from('products')
            .select('*')
            .eq('status', 'approved') // Important: Only shows items approved by admin
            .order('created_at', { ascending: false });

        if (error) throw error;

        allApprovedProducts = data;
        renderProducts(allApprovedProducts);

    } catch (err) {
        console.error("Fetch Error:", err.message);
        productGrid.innerHTML = `<p style="text-align:center;">Error loading items. Please try again.</p>`;
    }
}

// 4. Render Products to HTML
function renderProducts(products) {
    const productGrid = document.getElementById('productGrid');
    if (!productGrid) return;

    if (products.length === 0) {
        productGrid.innerHTML = `<p style="text-align:center; grid-column: 1/-1;">No items found.</p>`;
        return;
    }

    productGrid.innerHTML = products.map(p => `
        <div class="product-card">
            <img src="${p.image}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
            <div class="product-info">
                <h3>${p.name}</h3>
                <p class="price">${p.price} ETB</p>
                <button class="main-btn" onclick="openDetails('${p.id}')">View Details</button>
            </div>
        </div>


// Inside your renderProducts map loop
<div class="product-info">
    <h3>${p.name}</h3>
    <p class="price">${p.price} ETB</p>
    <div style="display:flex; gap:5px;">
        <button class="main-btn" onclick="addToCart('${p.id}')">🛒 Add</button>
        <button class="filter-btn" onclick="location.href='checkout.html?id=${p.id}'">Buy</button>
    </div>
</div>
        
    `).join('');
}

// 5. Category Filtering (Fixes your specific error)
function filterCategory(category) {
    // UI Update
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText.toLowerCase() === category.toLowerCase()) {
            btn.classList.add('active');
        }
    });

    // Filtering Logic
    if (category === 'all') {
        renderProducts(allApprovedProducts);
    } else {
        const filtered = allApprovedProducts.filter(p => 
            p.category && p.category.toLowerCase() === category.toLowerCase()
        );
        renderProducts(filtered);
    }
}

// 6. Search Logic
function searchProducts() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const filtered = allApprovedProducts.filter(p => 
        p.name.toLowerCase().includes(query) || 
        (p.category && p.category.toLowerCase().includes(query))
    );
    renderProducts(filtered);
}

// 7. User Authentication UI Updates
async function updateUIForUser() {
    const userMenu = document.getElementById('userMenu');
    if (!userMenu) return;

    const { data: { user } } = await _supabase.auth.getUser();

    if (user) {
        // Change 'your-email@gmail.com' to your actual admin email
        const isAdmin = user.email === 'yohannes.surafel@gmail.com'; 

        userMenu.innerHTML = `
            ${isAdmin ? '<button onclick="location.href=\'admin.html\'" class="filter-btn">Admin</button>' : ''}
            <button onclick="location.href='my-items.html'" class="filter-btn">My Items</button>
            <button onclick="handleSignOut()" class="login-btn">Sign Out</button>
        `;
    } else {
        userMenu.innerHTML = `<button onclick="openAuthModal()" class="login-btn">Sign In</button>`;
    }
}

// 8. Sign Out Logic
async function handleSignOut() {
    await _supabase.auth.signOut();
    location.reload();
}

// 9. Auth Modal Toggle (Ensure these IDs exist in your HTML)
function openAuthModal() {
    document.getElementById('authModal').style.display = 'flex';
}

function closeAuthModal() {
    document.getElementById('authModal').style.display = 'none';
}


