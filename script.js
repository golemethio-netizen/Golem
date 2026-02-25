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

    productGrid.innerHTML = products.map(p => {
        // Log data to console to help us debug
        console.log("Loading product:", p);

        // Map database columns to variables (handles case-sensitivity)
        const name = p.name || p.Name || "Unnamed Item";
        const price = p.price || p.Price || "0";
        const image = p.image || p.Image || 'https://via.placeholder.com/300x200?text=No+Image';
        const category = p.category || p.Category || "General";

        return `
            <div class="product-card">
                <div class="category-tag">${category}</div>
                <img src="${image}" alt="${name}" onerror="this.src='https://via.placeholder.com/300x200?text=Error+Loading+Image'">
                <div class="product-info">
                    <h3>${name}</h3>
                    <p class="price">${price} ETB</p>
                    <button class="main-btn" onclick="location.href='checkout.html?id=${p.id}'">Buy Now</button>
                </div>
            </div>
        `;
    }).join('');
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
        // User is logged in
        userMenu.innerHTML = `
            <button onclick="location.href='my-items.html'" class="filter-btn">My Items</button>
            <button onclick="handleSignOut()" class="login-btn">Sign Out</button>
        `;
    } else {
        // User is NOT logged in - link directly to login.html
        userMenu.innerHTML = `<button onclick="location.href='login.html'" class="login-btn">Sign In</button>`;
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



function openAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.style.display = 'flex';
    } else {
        // If modal doesn't exist, just go to login page
        window.location.href = 'login.html';
    }
}

function closeAuthModal() {
    document.getElementById('authModal').style.display = 'none';
}

// Close modal if user clicks outside of it
window.onclick = function(event) {
    const modal = document.getElementById('authModal');
    if (event.target == modal) {
        modal.style.display = "none";
    }
}



