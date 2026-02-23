// --- GLOBAL VARIABLES ---
let allApprovedProducts = [];
let cart = [];
let isSignUp = false;

// --- INITIALIZATION ---
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
        const grid = document.getElementById('productGrid');
        if (grid) grid.innerHTML = "<p>Error loading products. Please refresh.</p>";
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

// --- SEARCH & FILTER ---
function searchProducts() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    const filtered = allApprovedProducts.filter(p => 
        p.name.toLowerCase().includes(term) || 
        (p.description && p.description.toLowerCase().includes(term))
    );
    displayProducts(filtered);
}

function filterByCategory(category) {
    const buttons = document.querySelectorAll('.category-filters button');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    if (event) event.target.classList.add('active');

    if (category === 'All') {
        displayProducts(allApprovedProducts);
    } else {
        const filtered = allApprovedProducts.filter(p => p.category === category);
        displayProducts(filtered);
    }
}

// --- AUTHENTICATION ---
function openAuthModal() { document.getElementById('authModal').style.display = 'flex'; }
function closeAuth() { document.getElementById('authModal').style.display = 'none'; }

function toggleAuthMode() {
    isSignUp = !isSignUp;
    document.getElementById('authTitle').innerText = isSignUp ? "Create Account" : "Login";
    document.getElementById('registerFields').style.display = isSignUp ? "block" : "none";
    document.getElementById('authBtn').innerText = isSignUp ? "Register" : "Sign In";
    document.getElementById('toggleText').innerText = isSignUp ? 
        "Already have an account? Sign In" : "Don't have an account? Register";
}

async function handleAuth() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value.trim();
    const btn = document.getElementById('authBtn');

    if (!email || !password) return alert("Please fill all fields!");

    btn.disabled = true;
    btn.innerText = "Processing...";

    try {
        if (isSignUp) {
            const fullName = document.getElementById('regName').value.trim();
            const phone = document.getElementById('regPhone').value.trim();
            
            const { error } = await _supabase.auth.signUp({
                email, password, options: { data: { full_name: fullName, phone: phone } }
            });
            if (error) throw error;
            alert("Registration successful! Check your email.");
        } else {
            const { error } = await _supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            location.reload();
        }
    } catch (e) {
        alert(e.message);
    } finally {
        btn.disabled = false;
        btn.innerText = isSignUp ? "Register" : "Sign In";
    }
}

async function updateUIForUser() {
    const userMenu = document.getElementById('userMenu');
    const mobileMyItems = document.getElementById('mobileMyItems');

    const { data: { user } } = await _supabase.auth.getUser();

    if (user) {
        // Fetch order notification count
        const { count } = await _supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('seller_id', user.id);

        const badge = count > 0 ? `<span class="nav-badge">${count}</span>` : '';
        const name = user.user_metadata?.full_name || user.email.split('@')[0];

        if (userMenu) {
            userMenu.innerHTML = `
                <div class="user-profile">
                    <a href="my-items.html" style="text-decoration:none; color:inherit; font-weight:bold;">📦 My Items ${badge}</a>
                    <span style="margin: 0 10px;">👤 ${name}</span>
                    <button onclick="handleSignOut()" class="signout-btn">Sign Out</button>
                </div>
            `;
        }

        if (mobileMyItems && count > 0) {
            mobileMyItems.innerHTML += `<span class="nav-badge mobile">${count}</span>`;
        }
    }
}

async function handleSignOut() {
    await _supabase.auth.signOut();
    location.href = 'index.html';
}

async function checkAuthToSell() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (user) {
        location.href = 'submit.html';
    } else {
        alert("Please login to sell items!");
        openAuthModal();
    }
}

// --- CART & CHECKOUT ---
function addToCart(productId) {
    if (!cart.includes(productId)) {
        cart.push(productId);
        const countEl = document.getElementById('cartCount');
        if (countEl) countEl.innerText = cart.length;
        alert("Added to cart!");
    } else {
        alert("Already in cart!");
    }
}

async function checkout() {
    const name = document.getElementById('buyerName').value;
    const phone = document.getElementById('buyerPhone').value;
    if (!name || !phone) return alert("Please enter your details!");

    const product = allApprovedProducts.find(p => p.id == cart[0]);
    if (!product) return alert("Product not found!");

    try {
        // Log the order in Supabase
        await _supabase.from('orders').insert([{
            product_id: product.id,
            seller_id: product.user_id,
            buyer_name: name,
            buyer_phone: phone,
            product_name: product.name,
            price: product.price
        }]);

        // WhatsApp redirect
        const cleanPhone = product.seller_contact.replace(/\D/g, '');
        const waMsg = encodeURIComponent(`Hi! I'm ${name}. I want to buy your ${product.name}.`);
        window.open(`https://wa.me/${cleanPhone}?text=${waMsg}`, '_blank');
        
    } catch (err) {
        console.error("Order error:", err);
    }
}

// --- CART UI TOGGLE ---
function toggleCart() {
    const cartModal = document.getElementById('cartModal');
    if (cartModal) {
        const isVisible = cartModal.style.display === 'flex';
        cartModal.style.display = isVisible ? 'none' : 'flex';
        if (!isVisible) renderCartItems(); // Refresh the list when opening
    } else {
        alert("Cart is empty! Add some items first.");
    }
}

function renderCartItems() {
    const cartList = document.getElementById('cartItemsList');
    const cartTotal = document.getElementById('cartTotal');
    if (!cartList) return;

    if (cart.length === 0) {
        cartList.innerHTML = "<p>Your cart is empty.</p>";
        if (cartTotal) cartTotal.innerText = "0.00";
        return;
    }

    // Filter allApprovedProducts to find only the ones in the cart
    const itemsInCart = allApprovedProducts.filter(p => cart.includes(p.id));
    
    let total = 0;
    cartList.innerHTML = itemsInCart.map(p => {
        total += parseFloat(p.price);
        return `
            <div class="cart-item" style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #eee; padding-bottom:5px;">
                <span>${p.name}</span>
                <b>${p.price} ETB</b>
                <button onclick="removeFromCart('${p.id}')" style="background:none; border:none; color:red; cursor:pointer;">&times;</button>
            </div>
        `;
    }).join('');

    if (cartTotal) cartTotal.innerText = total.toFixed(2);
}

function removeFromCart(productId) {
    cart = cart.filter(id => id !== productId);
    const countEl = document.getElementById('cartCount');
    if (countEl) countEl.innerText = cart.length;
    renderCartItems();
}
