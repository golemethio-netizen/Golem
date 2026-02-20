// --- INITIALIZATION ---
let allApprovedProducts = [];
let cart = [];
let isSignUp = false;

// --- 1. DATA FETCHING ---
async function fetchProducts() {
    const grid = document.getElementById('productGrid');
    try {
        const { data, error } = await _supabase
            .from('products')
            .select('*');

        if (error) throw error;

        // Filter for items that are live or sold
        allApprovedProducts = data.filter(p => p.status === 'approved' || p.status === 'sold');
        renderProducts(allApprovedProducts);
    } catch (err) {
        console.error("Fetch Error:", err.message);
        if(grid) grid.innerHTML = `<p style="color:red; text-align:center;">Error loading shop. Please refresh.</p>`;
    }
}

// --- 2. RENDER PRODUCTS ---
function renderProducts(list) {
    const grid = document.getElementById('productGrid');
    if (!grid) return;
    grid.innerHTML = "";

    if (list.length === 0) {
        grid.innerHTML = "<p style='text-align:center; width:100%;'>No products found.</p>";
        return;
    }

    grid.innerHTML = list.map(p => {
        const isSold = p.status === 'sold';
        const pageUrl = window.location.href;
        const shareMsg = `Check out this ${p.name} on Golem Store!`;
        const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(shareMsg)}`;

        return `
        <div class="product-card">
            ${isSold ? '<div class="sold-badge">SOLD</div>' : ''}
            <div class="share-btn" title="Share to Telegram" onclick="event.stopPropagation(); window.open('${telegramShareUrl}', '_blank')">✈️</div>
            
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

// --- 3. AUTHENTICATION LOGIC ---
async function checkAuthToSell() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (user) {
        window.location.href = "submit.html";
    } else {
        openAuthModal();
    }
}

function openAuthModal() {
    document.getElementById('authModal').style.display = 'flex';
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

async function handleAuth() {
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const btn = document.getElementById('authBtn');

    if (!email || !password) return alert("Please fill all fields.");

    btn.innerText = "Processing...";
    try {
        if (isSignUp) {
            const { error } = await _supabase.auth.signUp({ email, password });
            if (error) throw error;
            alert("Check your email for confirmation!");
        } else {
            const { error } = await _supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            location.reload(); 
        }
    } catch (e) { alert(e.message); }
    finally { btn.innerText = isSignUp ? "Register" : "Sign In"; }
}

async function handleSignOut() {
    await _supabase.auth.signOut();
    location.reload();
}

async function updateUserMenu() {
    const userMenu = document.getElementById('userMenu');
    const { data: { user } } = await _supabase.auth.getUser();
    
    if (user && userMenu) {
        userMenu.innerHTML = `
            <a href="my-items.html" style="margin-right:15px; text-decoration:none; color:var(--primary); font-size:0.9rem;">My Items</a>
            <button class="auth-link" onclick="handleSignOut()">Logout</button>
        `;
    }
}

// --- 4. SEARCH & FILTERS ---
function searchProducts() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    const filtered = allApprovedProducts.filter(p => p.name.toLowerCase().includes(term));
    renderProducts(filtered);
}

// --- 5. CART & TELEGRAM ---
function addToCart(id) {
    cart.push(id);
    updateCartUI();
    document.getElementById('cartSidebar').classList.add('active');
}

function updateCartUI() {
    const container = document.getElementById('cartItems');
    document.getElementById('cartCount').innerText = cart.length;
    let total = 0;
    container.innerHTML = cart.map((id, index) => {
        const p = allApprovedProducts.find(item => item.id == id);
        if (p) {
            total += parseFloat(p.price);
            return `<div class="cart-item"><span>${p.name}</span><b>$${p.price}</b><button onclick="removeFromCart(${index})">&times;</button></div>`;
        }
    }).join('');
    document.getElementById('cartTotal').innerText = total.toFixed(2);
}

function removeFromCart(i) { cart.splice(i, 1); updateCartUI(); }

async function checkout() {
    if (cart.length === 0) return;
    // Replace with your actual Bot Token and Chat ID
    const botToken = "YOUR_BOT_TOKEN";
    const chatId = "YOUR_CHAT_ID";

    let msg = "🛍️ **New Order!**\n";
    cart.forEach(id => {
        const p = allApprovedProducts.find(i => i.id == id);
        msg += `- ${p.name}: $${p.price}\n`;
    });

    try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "Markdown" })
        });
        alert("Order sent to Telegram!");
        cart = []; updateCartUI();
    } catch (e) { alert("Checkout error."); }
}

// --- STARTUP ---
fetchProducts();
updateUserMenu();

