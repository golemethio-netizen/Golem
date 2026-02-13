let allApprovedProducts = []; // The Master List

// 1. Run this as soon as the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log("Shop Loading...");
    fetchProducts();
    updateNavUI();
});

async function fetchProducts() {
    try {
        // Fetch only approved items
        const { data, error } = await _supabase
            .from('products')
            .select('*')
            .eq('status', 'approved');

        if (error) throw error;

        allApprovedProducts = data || [];
        console.log("Products Loaded:", allApprovedProducts.length);
        
        renderProducts(allApprovedProducts);
    } catch (err) {
        console.error("Database Error:", err.message);
        document.getElementById('productGrid').innerHTML = "<p>Failed to load products. Check console.</p>";
    }
}


// 2. Render Products to UI
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
            <h3>${p.name}</h3>
            <p class="price">$${p.price}</p>
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


// 2. FIXED Filter Function
function filterCat(category) {
    console.log("Filtering for:", category);
    
    // Safety check: if no products loaded yet, stop
    if (allApprovedProducts.length === 0) return;

    // Update Button UI (Active State)
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if(btn.innerText.toLowerCase() === category.toLowerCase() || (category === 'all' && btn.innerText === 'All')) {
            btn.classList.add('active');
        }
    });

    // Filter Logic
    if (category === 'all') {
        renderProducts(allApprovedProducts);
    } else {
        const filtered = allApprovedProducts.filter(p => 
            p.category && p.category.toLowerCase() === category.toLowerCase()
        );
        renderProducts(filtered);
    }
}

// ... Keep your logout and updateNavUI functions below ...
