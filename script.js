


let isSignUp = false;
let allApprovedProducts = [];

document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    updateUIForUser();
});

// --- SHOP LOGIC ---
async function fetchProducts() {
    const { data, error } = await _supabase
        .from('products')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

    if (!error) {
        allApprovedProducts = data;
        displayProducts(data);
    }
}

function displayProducts(products) {
    const grid = document.getElementById('productGrid');
    grid.innerHTML = products.map(p => `
        <div class="product-card">
            <img src="${p.image}" alt="${p.name}">
            <div class="product-info">
                <h3>${p.name}</h3>
                <p class="price">$${p.price}</p>
                <button onclick="addToCart('${p.id}')">Add to Cart</button>
            </div>
        </div>
    `).join('');
}

// --- AUTH UI & NOTIFICATIONS ---
async function updateUIForUser() {
    const { data: { user } } = await _supabase.auth.getUser();
    const userMenu = document.getElementById('userMenu');
    const mobileMyItems = document.getElementById('mobileMyItems');

    if (user) {
        // Check for orders sent to this seller
        const { count } = await _supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('seller_id', user.id);

        const badge = count > 0 ? `<span class="nav-badge">${count}</span>` : '';
        const name = user.user_metadata?.full_name || "Account";

        userMenu.innerHTML = `
            <div class="user-profile">
                <a href="my-items.html" class="nav-link">📦 My Items ${badge}</a>
                <span class="user-display">👤 ${name}</span>
                <button onclick="handleSignOut()" class="signout-btn">Sign Out</button>
            </div>
        `;

        if (count > 0 && mobileMyItems) {
            mobileMyItems.innerHTML += `<span class="nav-badge mobile">${count}</span>`;
        }
    }
}

async function handleAuth() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value.trim();
    
    try {
        if (isSignUp) {
            const name = document.getElementById('regName').value;
            const phone = document.getElementById('regPhone').value;
            const { error } = await _supabase.auth.signUp({
                email, password, options: { data: { full_name: name, phone: phone } }
            });
            if (error) throw error;
            alert("Success! Please check your email for a verification link.");
        } else {
            const { error } = await _supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            location.reload();
        }
    } catch (e) { alert(e.message); }
}

async function handleSignOut() {
    await _supabase.auth.signOut();
    location.href = 'index.html';
}

function toggleAuthMode() {
    isSignUp = !isSignUp;
    document.getElementById('authTitle').innerText = isSignUp ? "Create Account" : "Login";
    document.getElementById('registerFields').style.display = isSignUp ? "block" : "none";
    document.getElementById('authBtn').innerText = isSignUp ? "Register" : "Sign In";
}

function openAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.style.display = 'flex';
    } else {
        console.error("Error: Could not find the element with ID 'authModal'");
    }
}


function closeAuth() { document.getElementById('authModal').style.display = 'none'; }

function filterByCategory(category) {
    // 1. Update the UI buttons (Visual)
    const buttons = document.querySelectorAll('.category-filters button');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    // 2. Filter the data (Logic)
    if (category === 'All') {
        displayProducts(allApprovedProducts);
    } else {
        const filtered = allApprovedProducts.filter(p => p.category === category);
        displayProducts(filtered);
    }
}

let cart = []; // Make sure this is at the top of your script

function addToCart(productId) {
    // Check if the product is already in the cart
    if (!cart.includes(productId)) {
        cart.push(productId);
        updateCartUI();
        alert("Item added to cart!");
    } else {
        alert("This item is already in your cart.");
    }
}

function updateCartUI() {
    const cartCountElements = document.querySelectorAll('.cart-count, #cartCount');
    cartCountElements.forEach(el => {
        el.innerText = cart.length;
    });
}


