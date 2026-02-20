let allApprovedProducts = [];

// 1. FETCH DATA FROM DATABASE
async function fetchProducts() {
    console.log("Fetching started...");
    const grid = document.getElementById('productGrid');
    
    try {
        const { data, error } = await _supabase
            .from('products')
            .select('*'); 

        if (error) throw error;

        console.log("Data received:", data);

        // Filter for approved or sold items
        allApprovedProducts = data.filter(p => p.status === 'approved' || p.status === 'sold');
        
        renderProducts(allApprovedProducts);

    } catch (err) {
        console.error("Fetch Error:", err.message);
        if(grid) grid.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
    }
}

// 2. RENDER PRODUCTS TO THE SCREEN
function renderProducts(list) {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    grid.innerHTML = "";

    if (list.length === 0) {
        grid.innerHTML = "<p>No products found.</p>";
        return;
    }

    grid.innerHTML = list.map(p => {
        const isSold = p.status === 'sold';
        
        // 1. Create the Share Link
        // This takes the current page URL and adds a message
        const pageUrl = window.location.href;
        const message = `Check out this ${p.name} on Golem Store!\nPrice: $${p.price}`;
        const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(message)}`;

        return `
        <div class="product-card">
            ${isSold ? '<div class="sold-badge">SOLD</div>' : ''}
            
            <div class="share-btn" title="Share to Telegram" onclick="event.stopPropagation(); window.open('${telegramShareUrl}', '_blank')">
                ✈️
            </div>

            <img src="${p.image}" alt="${p.name}" onclick="openProductDetail('${p.id}')" style="${isSold ? 'filter: grayscale(100%); opacity: 0.6;' : ''}">
            
            <div class="product-info">
                <h3>${p.name}</h3>
                <p class="price">$${p.price}</p>
                ${isSold 
                    ? '<button disabled style="background: #888;">Sold Out</button>' 
                    : `<button onclick="event.stopPropagation(); addToCart('${p.id}')">Add to Cart</button>`
                }
            </div>
        </div>`;
    }).join('');
}
// 3. SEARCH AND FILTER FUNCTIONS
function searchProducts() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    
    // Filter the global array we created earlier
    const filtered = allApprovedProducts.filter(p => 
        p.name.toLowerCase().includes(term) || 
        (p.description && p.description.toLowerCase().includes(term))
    );
    
    renderProducts(filtered); // Re-draw the grid with only matched items
}

function filterByCategory(category) {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => btn.classList.toggle('active', btn.innerText === category));

    const filtered = category === 'All' 
        ? allApprovedProducts 
        : allApprovedProducts.filter(p => p.category === category);
    renderProducts(filtered);
}

// 4. PRODUCT DETAIL MODAL
function openProductDetail(id) {
    const p = allApprovedProducts.find(item => item.id == id);
    if (!p) return;

    document.getElementById('modalImg').src = p.image;
    document.getElementById('modalName').innerText = p.name;
    document.getElementById('modalPrice').innerText = `$${p.price}`;
    document.getElementById('modalDesc').innerText = p.description || "No description provided.";
    document.getElementById('productModal').style.display = "flex";
}

function closeModal() {
    document.getElementById('productModal').style.display = "none";
}

// 5. CART LOGIC
let cart = [];

function addToCart(id) {
    cart.push(id);
    updateCartUI();
    document.getElementById('cartSidebar').classList.add('active');
}

function updateCartUI() {
    const cartItemsContainer = document.getElementById('cartItems');
    const cartCount = document.getElementById('cartCount');
    const cartTotal = document.getElementById('cartTotal');

    cartCount.innerText = cart.length;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = "<p style='padding:20px;'>Your cart is empty.</p>";
        cartTotal.innerText = "0";
        return;
    }

    let total = 0;
    cartItemsContainer.innerHTML = cart.map((itemId, index) => {
        const product = allApprovedProducts.find(p => p.id == itemId);
        if (product) {
            total += parseFloat(product.price);
            return `
                <div class="cart-item">
                    <img src="${product.image}" alt="${product.name}">
                    <div class="cart-item-info">
                        <h4>${product.name}</h4>
                        <p>$${product.price}</p>
                    </div>
                    <button class="remove-btn" onclick="removeFromCart(${index})">&times;</button>
                </div>
            `;
        }
    }).join('');

    cartTotal.innerText = total.toFixed(2);
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
}

function toggleCart() {
    document.getElementById('cartSidebar').classList.toggle('active');
}

// 6. TELEGRAM CHECKOUT
async function checkout() {
    if (cart.length === 0) return;

    const botToken = "8557174379:AAHjA_5WAIxIR8uq4mjZOhd1EfdKvgI2s7o"; 
    const chatId = "6792892909";

    let orderList = "🛍️ **New Order!**\n\n";
    let total = 0;

    cart.forEach((itemId, index) => {
        const product = allApprovedProducts.find(p => p.id == itemId);
        if (product) {
            orderList += `${index + 1}. ${product.name} — $${product.price}\n`;
            total += parseFloat(product.price);
        }
    });

    orderList += `\n💰 **Total: $${total.toFixed(2)}**`;

    try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: orderList, parse_mode: "Markdown" })
        });
        alert("Order sent!");
        cart = [];
        updateCartUI();
        toggleCart();
    } catch (e) {
        alert("Error sending order.");
    }
}

// START THE APP
fetchProducts();





let isSignUp = false;

// 1. Check if user is logged in before allowing them to sell
function checkAuthToSell() {
    const user = _supabase.auth.user(); // Checks for active session
    if (user) {
        window.location.href = "submit.html"; // Go to sell page
    } else {
        document.getElementById('authModal').style.display = 'flex'; // Show login
    }
}

function closeAuth() {
    document.getElementById('authModal').style.display = 'none';
}

function toggleAuthMode() {
    isSignUp = !isSignUp;
    document.getElementById('authTitle').innerText = isSignUp ? "Create Account" : "Login to Golem";
    document.getElementById('authBtn').innerText = isSignUp ? "Register" : "Sign In";
    document.getElementById('toggleText').innerText = isSignUp ? "Already have an account? Login." : "Don't have an account? Register.";
}

// 2. Handle the actual Login/Register with Supabase
async function handleAuth() {
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;

    if (isSignUp) {
        const { error } = await _supabase.auth.signUp({ email, password });
        if (error) alert(error.message);
        else alert("Check your email for the confirmation link!");
    } else {
        const { error } = await _supabase.auth.signIn({ email, password });
        if (error) alert(error.message);
        else {
            alert("Logged in successfully!");
            location.reload(); // Refresh to update UI
        }
    }
}

// Run this function every time the page loads
async function updateUserMenu() {
    const userMenu = document.getElementById('userMenu');
    const user = _supabase.auth.user(); // Get current logged-in user

    if (user) {
        // If logged in: Show email and Sign Out button
        userMenu.innerHTML = `
            <span class="user-email">${user.email.split('@')[0]}</span>
            <button class="auth-link" onclick="handleSignOut()">Sign Out</button>
        `;
    } else {
        // If logged out: Show Login link
        userMenu.innerHTML = `
            <button class="auth-link" onclick="openAuthModal()">Login</button>
        `;
    }
}

async function handleSignOut() {
    await _supabase.auth.signOut();
    location.reload(); // Refresh to clear user data
}

function openAuthModal() {
    document.getElementById('authModal').style.display = 'flex';
}

// Call this at the very bottom of your script.js
updateUserMenu();
