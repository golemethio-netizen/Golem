// --- 1. INITIALIZATION ---
let allApprovedProducts = [];
let cart = [];
let isSignUp = false;

// --- 2. DATA FETCHING ---
async function fetchProducts() {
    const grid = document.getElementById('productGrid');
    try {
        const { data, error } = await _supabase
            .from('products')
            .select('*');

        if (error) throw error;

        // Store and filter for items that are live or sold
        allApprovedProducts = data.filter(p => p.status === 'approved' || p.status === 'sold');
        renderProducts(allApprovedProducts);
    } catch (err) {
        console.error("Fetch Error:", err.message);
        if(grid) grid.innerHTML = `<p style="color:red; text-align:center;">Error loading shop.</p>`;
    }
}

// --- 3. RENDER PRODUCTS ---
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
            <div class="share-btn" title="Share" onclick="event.stopPropagation(); window.open('${telegramShareUrl}', '_blank')">✈️</div>
            
            

<img src="${p.image}" alt="${p.name}" onclick="window.open('${p.image}', '_blank')" ...>
            
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

// --- 4. SEARCH & FILTERS ---
function searchProducts() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    const filtered = allApprovedProducts.filter(p => 
        p.name.toLowerCase().includes(term) || 
        (p.description && p.description.toLowerCase().includes(term))
    );
    renderProducts(filtered);
}

function filterByCategory(category) {
    // UI Update: Active Button
    document.querySelectorAll('.category-filters button').forEach(btn => btn.classList.remove('active'));
    if (event) event.target.classList.add('active');

    if (category === 'All') {
        renderProducts(allApprovedProducts);
    } else {
        const filtered = allApprovedProducts.filter(p => p.category === category);
        renderProducts(filtered);
    }
}

// --- 5. AUTHENTICATION ---
async function checkAuthToSell() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (user) {
        window.location.href = "submit.html";
    } else {
        openAuthModal();
    }
}

function openAuthModal() {
    const modal = document.getElementById('authModal');
    if(modal) modal.style.display = 'flex';
}

function closeAuth() {
    const modal = document.getElementById('authModal');
    if(modal) modal.style.display = 'none';
}

function toggleAuthMode() {
    isSignUp = !isSignUp;
    document.getElementById('authTitle').innerText = isSignUp ? "Create Account" : "Login to Golem";
    document.getElementById('authBtn').innerText = isSignUp ? "Register" : "Sign In";
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
    } catch (e) { 
        alert(e.message); 
    } finally { 
        btn.innerText = isSignUp ? "Register" : "Sign In"; 
    }
}

async function handleSignOut() {
    await _supabase.auth.signOut();
    location.reload();
}

async function updateUserMenu() {
    const menu = document.getElementById('userMenu');
    if (!menu) return;

    const { data: { user } } = await _supabase.auth.getUser();
    if (user) {
        menu.innerHTML = `
            <a href="my-items.html" style="margin-right:15px; text-decoration:none; color:var(--primary); font-size:0.9rem;">My Items</a>
            <button class="auth-link" onclick="handleSignOut()">Logout</button>
        `;
    } else {
        menu.innerHTML = `<button class="auth-link" onclick="openAuthModal()">Login</button>`;
    }
}

// --- 6. CART LOGIC ---
function addToCart(id) {
    cart.push(id);
    updateCartUI();
    const sidebar = document.getElementById('cartSidebar');
    if(sidebar) sidebar.classList.add('active');
}

function updateCartUI() {
    const container = document.getElementById('cartItems');
    const countLabel = document.getElementById('cartCount');
    if(countLabel) countLabel.innerText = cart.length;
    
    let total = 0;
    if(container) {
        container.innerHTML = cart.map((id, index) => {
            const p = allApprovedProducts.find(item => item.id == id);
            if (p) {
                total += parseFloat(p.price);
                return `<div class="cart-item"><span>${p.name}</span><b>$${p.price}</b><button onclick="removeFromCart(${index})">&times;</button></div>`;
            }
        }).join('');
    }
    const totalLabel = document.getElementById('cartTotal');
    if(totalLabel) totalLabel.innerText = total.toFixed(2);
}

function removeFromCart(i) {
    cart.splice(i, 1);
    updateCartUI();
}

function toggleCart() {
    const sidebar = document.getElementById('cartSidebar');
    if(sidebar) sidebar.classList.toggle('active');
}

// --- 7. RUN ON LOAD ---
fetchProducts();
updateUserMenu();


// --- UPDATED CHECKOUT LOGIC ---
async function checkout() {
    const nameInput = document.getElementById('buyerName');
    const phoneInput = document.getElementById('buyerPhone');

    // 1. Validation
    if (!nameInput || !phoneInput || !nameInput.value || !phoneInput.value) {
        alert("Please enter your name and phone number to continue.");
        return;
    }

    if (cart.length === 0) {
        alert("Your cart is empty!");
        return;
    }

    const name = nameInput.value;
    const phone = phoneInput.value;

    // 2. Get Seller Info
    const firstItemId = cart[0];
    const product = allApprovedProducts.find(p => p.id == firstItemId);
    
    if (!product) {
        alert("Product details not found.");
        return;
    }

    // 3. Show WhatsApp Button
    const contactBox = document.getElementById('sellerContactInfo');
    const sellerDetail = document.getElementById('sellerDetail');
    
    if (contactBox && sellerDetail) {
        // Prepare WhatsApp Link
        const cleanPhone = product.seller_contact ? product.seller_contact.replace(/\D/g, '') : "251900000000";
        const waMessage = encodeURIComponent(`Hello! My name is ${name}. I want to buy your "${product.name}" for $${product.price} seen on Golem.`);
        const waLink = `https://wa.me/${cleanPhone}?text=${waMessage}`;

        sellerDetail.innerHTML = `
            <p style="margin-bottom:10px; color:#333;">Order prepared for <b>${product.name}</b></p>
            <a href="${waLink}" target="_blank" class="whatsapp-btn">
                💬 Chat with Seller on WhatsApp
            </a>
        `;
        contactBox.style.display = 'block';
    }

    // 4. Send Notification to Admin (Telegram)
    sendOrderToTelegram(name, phone, cart);
}
// --- HELPER: TELEGRAM NOTIFICATION ---
async function sendOrderToTelegram(buyerName, buyerPhone, items) {
    // Replace with your actual Bot Token and Chat ID
    const botToken = "8557174379:AAHjA_5WAIxIR8uq4mjZOhd1EfdKvgI2s7o"; 
    const chatId = "6792892909";

    let message = `🛍️ **NEW ORDER**\n\n`;
    message += `👤 **Buyer:** ${buyerName}\n`;
    message += `📞 **Phone:** ${buyerPhone}\n\n`;
    message += `📦 **Items:**\n`;
    
    items.forEach(id => {
        const p = allApprovedProducts.find(item => item.id == id);
        if(p) message += `- ${p.name} ($${p.price})\n`;
    });

    try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: "Markdown"
            })
        });
        console.log("Admin notified via Telegram");
    } catch (e) {
        console.error("Telegram Error:", e);
    }
}

