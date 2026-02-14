// 1. Global Variables
let allApprovedProducts = [];
let cart = JSON.parse(localStorage.getItem('golem_cart')) || [];

// 2. Initialize on Page Load
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    updateCartCount();
    updateNavUI();
});

// 3. Fetch Products from Supabase
async function fetchProducts() {
    const grid = document.getElementById('productGrid');
    if (grid) grid.innerHTML = "<p>Loading products...</p>";

    try {
        const { data, error } = await _supabase
            .from('products')
            .select('*')
            .eq('status', 'approved');

        if (error) throw error;

        allApprovedProducts = data || [];
        console.log("Database Sync Success. Items:", allApprovedProducts.length);
        
        renderProducts(allApprovedProducts);
    } catch (err) {
        console.error("Fetch Error:", err.message);
        if (grid) grid.innerHTML = "<p style='color:red'>Connection error. Please refresh.</p>";
    }
}
// 4. Render Products to UI
function renderProducts(list) {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    if (list.length === 0) {
        grid.innerHTML = "<p>No products found in this category.</p>";
        return;
    }

    grid.innerHTML = list.map(p => `
        <div class="product-card">
            <img src="${p.image}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/150'">
            <div class="product-info">
                <h3>${p.name}</h3>
                <p class="price">$${p.price}</p>
                <button onclick="addToCart(${p.id})">Add to Cart</button>
            </div>
        </div>
    `).join('');
}

// 5. Add to Cart Logic
function addToCart(productId) {
    // Find item in our already loaded list
    const product = allApprovedProducts.find(p => p.id === productId);
    
    if (product) {
        cart.push(product);
        localStorage.setItem('golem_cart', JSON.stringify(cart));
        updateCartCount();
        
        // Visual feedback (optional)
        const btn = event.target;
        const originalText = btn.innerText;
        btn.innerText = "✅ Added!";
        setTimeout(() => btn.innerText = originalText, 1000);
    }
}

// 6. Update UI Counter
function updateCartCount() {
    const countElement = document.getElementById('cartCount');
    if (countElement) {
        countElement.innerText = cart.length;
    }
}

// 7. Filtering Logic
function filterCat(category) {
    if (category === 'all') {
        renderProducts(allApprovedProducts);
    } else {
        const filtered = allApprovedProducts.filter(p => 
            p.category && p.category.toLowerCase().trim() === category.toLowerCase()
        );
        renderProducts(filtered);
    }
}



// 3. UI: Update Nav based on Login Status
async function updateNavUI() {
    const { data: { user } } = await _supabase.auth.getUser();
    
    const logoutBtn = document.getElementById('logoutBtn');
    const loginLink = document.getElementById('loginLink');
    const sellLink = document.getElementById('submitLink');

    if (user) {
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        if (loginLink) loginLink.style.display = 'none';
        if (sellLink) sellLink.style.display = 'inline-block';
    } else {
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (loginLink) loginLink.style.display = 'inline-block';
        if (sellLink) sellLink.style.display = 'none';
    }
}

// 4. Logout Function
async function logout() {
    await _supabase.auth.signOut();
    window.location.href = 'index.html';
}

// 5. Search Logic
function initSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = products.filter(p => p.name.toLowerCase().includes(term));
        renderProducts(filtered);
    });
}



// ... Keep your logout and updateNavUI functions below ...










