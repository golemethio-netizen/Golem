let allApprovedProducts = [];

// 1. Initialize the cart count when the page loads
document.addEventListener('DOMContentLoaded', () => {
    updateCartCount(); 
});

async function fetchProducts() {
    try {
        const { data, error } = await _supabase
            .from('products')
            .select('*')
            .eq('status', 'approved');

        if (error) {
            // This will tell us if it's an API key issue or an RLS issue
            console.error("Supabase Error Detail:", error);
            document.getElementById('productGrid').innerHTML = `<p>Auth Error: ${error.message}</p>`;
            return;
        }

        allApprovedProducts = data || [];
        renderProducts(allApprovedProducts);
        
    } catch (err) {
        console.error("System Crash:", err);
    }
}



function renderProducts(list) {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    if (list.length === 0) {
        grid.innerHTML = "<p>No approved products yet. Make sure status is 'approved' in Supabase.</p>";
        return;
    }

    grid.innerHTML = list.map(p => `
        <div class="product-card">
            <img src="${p.image}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/150'">
            <div class="card-info">
                <h3>${p.name}</h3>
                <p class="category-tag">${p.category}</p>
                <p class="price">$${p.price}</p>
                <button onclick="addToCart(${p.id})">Add to Cart</button>
            </div>
        </div>
    `).join('');
}

// 2. The Add to Cart Function
function addToCart(productId) {
    // Find the product data from our loaded list
    const product = allApprovedProducts.find(p => p.id === productId);
    
    if (product) {
        // Get existing cart or empty array
        let cart = JSON.parse(localStorage.getItem('golem_cart')) || [];
        
        // Add the new product
        cart.push(product);
        
        // Save back to localStorage
        localStorage.setItem('golem_cart', JSON.stringify(cart));
        
        // Update the UI
        updateCartCount();
        
        // Optional: Visual feedback
        alert(`${product.name} added to cart!`);
    } else {
        console.error("Product not found!");
    }
}


// 3. Function to update the number shown in the Nav
function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('golem_cart')) || [];
    const countElement = document.getElementById('cartCount');
    if (countElement) {
        countElement.innerText = cart.length;
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


// 2. FIXED Filter Function
function filterCat(category) {
    // 1. Visual feedback
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    
    // 2. Logic
    if (category === 'all') {
        renderProducts(allApprovedProducts);
    } else {
        const filtered = allApprovedProducts.filter(p => 
            p.category && p.category.toLowerCase().trim() === category.toLowerCase()
        );
        renderProducts(filtered);
    }
}

// ... Keep your logout and updateNavUI functions below ...







