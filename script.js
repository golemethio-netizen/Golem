// 1. GLOBAL VARIABLES
let allApprovedProducts = [];
let cart = JSON.parse(localStorage.getItem('golem_cart')) || [];

// 2. INITIALIZE ON LOAD
document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
    fetchProducts();
});

// 3. FETCH DATA FROM SUPABASE
async function fetchProducts() {
    const grid = document.getElementById('productGrid');
    if (grid) grid.innerHTML = "<p>Loading products from Golem database...</p>";

    try {
        // We use the _supabase client created in config.js
        const { data, error } = await _supabase
            .from('products')
            .select('*')
            .eq('status', 'approved');

        if (error) throw error;

        allApprovedProducts = data || [];
        console.log("Success! Items found:", allApprovedProducts.length);
        
        renderProducts(allApprovedProducts);

    } catch (err) {
        console.error("Fetch Error:", err.message);
        if (grid) grid.innerHTML = `<p style="color:red">Connection Error: ${err.message}</p>`;
    }
}

// 4. RENDER PRODUCTS TO THE GRID
function renderProducts(list) {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    if (list.length === 0) {
        grid.innerHTML = "<p>No approved products found. Check status in DB!</p>";
        return;
    }

    grid.innerHTML = list.map(p => `
        <div class="product-card">
            <img src="${p.image || 'https://via.placeholder.com/150'}" alt="${p.name || 'Product'}">
            <div class="product-info">
                <h3>${p.name || 'Unnamed Item'}</h3>
                <p class="price">$${p.price || '0.00'}</p>
                <button onclick="addToCart('${p.id}', event)">Add to Cart</button>
            </div>
        </div>
    `).join('');
}
// 5. ADD TO CART LOGIC
function addToCart(productId, event) {
    // Find the product in our local list (using == to handle both string and number IDs)
    const product = allApprovedProducts.find(p => p.id == productId);

    if (product) {
        // Add to local cart array
        cart.push(product);
        
        // Save to browser memory
        localStorage.setItem('golem_cart', JSON.stringify(cart));
        
        // Update the number in the navigation bar
        updateCartCount();

        // Visual Feedback: Change button temporarily
        if (event && event.target) {
            const btn = event.target;
            const originalText = btn.innerText;
            btn.innerText = "✅ Added!";
            btn.style.backgroundColor = "#27ae60";
            btn.disabled = true;

            setTimeout(() => {
                btn.innerText = originalText;
                btn.style.backgroundColor = "";
                btn.disabled = false;
            }, 1000);
        }
    } else {
        console.error("Could not find product with ID:", productId);
    }
}

// 6. UPDATE CART COUNTER UI
function updateCartCount() {
    const countElement = document.getElementById('cartCount');
    if (countElement) {
        countElement.innerText = cart.length;
    }
}

// 7. CATEGORY FILTERING
function filterCat(category) {
    if (category === 'all') {
        renderProducts(allApprovedProducts);
    } else {
        const filtered = allApprovedProducts.filter(p => 
            p.category && p.category.toLowerCase() === category.toLowerCase()
        );
        renderProducts(filtered);
    }
}

// 8. SEARCH LOGIC
function searchProducts() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const filtered = allApprovedProducts.filter(p => 
        p.name.toLowerCase().includes(query) || 
        p.category.toLowerCase().includes(query)
    );
    renderProducts(filtered);
}

