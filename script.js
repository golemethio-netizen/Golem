/**
 * GOLEM MARKETPLACE - CORE SCRIPT
 */

// --- STATE ---
let allApprovedProducts = [];
let cart = [];
let isSignUp = false;

document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    updateUIForUser();
});

// --- PRODUCT LOGIC ---
async function fetchProducts() {
    try {
        const { data, error } = await _supabase
            .from('products')
            .select('*')
            .eq('status', 'approved')
            .order('created_at', { ascending: false });

        if (error) throw error;
        allApprovedProducts = data;
        displayProducts(data);
    } catch (err) {
        console.error("Fetch error:", err.message);
    }
}

function displayProducts(products) {
    const grid = document.getElementById('productGrid');
    if (!grid) return;
    if (products.length === 0) {
        grid.innerHTML = "<p style='padding:20px;'>No items found.</p>";
        return;
    }
    grid.innerHTML = products.map(p => `
        <div class="product-card">
            <img src="${p.image}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/150'">
            <div class="product-info">
                <h3>${p.name}</h3>
                <p class="price">${p.price} ETB</p>
                <button onclick="addToCart('${p.id}')">Add to Cart</button>
            </div>
        </div>
    `).join('');
}

// --- UI & AUTH ---
async function updateUIForUser() {
    const userMenu = document.getElementById('userMenu');
    const { data: { user } } = await _supabase.auth.getUser();

    if (user) {
        // Fetch Admin Flag from Profiles table
        const { data: profile } = await _supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();

        const isAdmin = profile?.is_admin || false;
        const name = user.user_metadata?.full_name || user.email.split('@')[0];

        userMenu.innerHTML = `
            <div class="user-profile">
                ${isAdmin ? '<button onclick="location.href=\'admin.html\'" class="admin-btn-nav">🛠️ Admin</button>' : ''}
                <a href="my-items.html" class="nav-link">📦 My Items</a>
                <span class="user-name">👤 ${name}</span>
                <button onclick="handleSignOut()" class="signout-btn">Sign Out</button>
            </div>
        `;
    }
}

function openAuthModal() { document.getElementById('authModal').style.display = 'flex'; }
function closeAuth() { document.getElementById('authModal').style.display = 'none'; }

async function handleSignOut() {
    await _supabase.auth.signOut();
    location.reload();
}

// --- CART LOGIC ---
function addToCart(productId) {
    if (!cart.includes(productId)) {
        cart.push(productId);
        document.getElementById('cartCount').innerText = cart.length;
        alert("Added to cart!");
    }
}

// Search & Filter
function searchProducts() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    const filtered = allApprovedProducts.filter(p => p.name.toLowerCase().includes(term));
    displayProducts(filtered);
}

function filterByCategory(category) {
    const buttons = document.querySelectorAll('.category-filters button');
    buttons.forEach(btn => btn.classList.remove('active'));
    if (event) event.target.classList.add('active');
    
    const filtered = category === 'All' ? allApprovedProducts : allApprovedProducts.filter(p => p.category === category);
    displayProducts(filtered);
}
