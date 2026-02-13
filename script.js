let products = [];

document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    updateNavUI();
});

// 1. Fetch Approved Products
// This holds the full list of approved products
let allApprovedProducts = []; 

async function fetchProducts() {
    try {
        const { data, error } = await _supabase
            .from('products')
            .select('*')
            .eq('status', 'approved'); 

        if (error) throw error;
        
        allApprovedProducts = data; // Save the full list here
        renderProducts(allApprovedProducts); // Show all by default
    } catch (err) {
        console.error("Fetch Error:", err);
    }
}

// THE FILTER FUNCTION
function filterCat(category) {
    // 1. Remove 'active' class from all buttons
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => btn.classList.remove('active'));

    // 2. Add 'active' class to the clicked button
    event.target.classList.add('active');

    // 3. Filter the logic
    if (category === 'all') {
        renderProducts(allApprovedProducts);
    } else {
        const filtered = allApprovedProducts.filter(p => p.category.toLowerCase() === category.toLowerCase());
        renderProducts(filtered);
    }
}

// 2. Render Products to UI
function renderProducts(list) {
    const grid = document.getElementById('productGrid');
    if (!grid) return;
    
    grid.innerHTML = list.map(p => `
        <div class="product-card">
            <img src="${p.image}" alt="${p.name}">
            <h3>${p.name}</h3>
            <p>$${p.price}</p>
            <button onclick="addToCart(${p.id})">Add to Cart</button>
        </div>
    `).join('');
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

