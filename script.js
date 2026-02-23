let allApprovedProducts = [];
let cart = [];

// 1. Fetch & Render
async function fetchProducts() {
    const { data, error } = await _supabase.from('products').select('*');
    if (error) return console.error(error);
    
    allApprovedProducts = data.filter(p => p.status === 'approved' || p.status === 'sold');
    renderProducts(allApprovedProducts);
}

function renderProducts(list) {
    const grid = document.getElementById('productGrid');
    if (!grid) return;
    grid.innerHTML = list.map(p => {
        const isSold = p.status === 'sold';
        return `
        <div class="product-card">
            ${isSold ? '<div class="sold-badge">SOLD</div>' : ''}
            <img src="${p.image}" onclick="window.open('${p.image}', '_blank')" style="${isSold ? 'filter:grayscale(1);' : ''}">
            <div class="product-info">
                <h3>${p.name}</h3>
                <p class="price">$${p.price}</p>
                ${isSold ? '<button disabled style="background:#888">Sold</button>' : `<button onclick="addToCart('${p.id}')">Add to Cart</button>`}
            </div>
        </div>`;
    }).join('');
}

// 2. Search & Filter
function searchProducts() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    const filtered = allApprovedProducts.filter(p => p.name.toLowerCase().includes(term));
    renderProducts(filtered);
}

function filterByCategory(cat) {
    document.querySelectorAll('.category-filters button').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    const filtered = cat === 'All' ? allApprovedProducts : allApprovedProducts.filter(p => p.category === cat);
    renderProducts(filtered);
}

// 3. Cart & Checkout
function addToCart(id) {
    cart.push(id);
    updateCartUI();
    document.getElementById('cartSidebar').classList.add('active');
}

function updateCartUI() {
    const container = document.getElementById('cartItems');
    let total = 0;
    container.innerHTML = cart.map((id, index) => {
        const p = allApprovedProducts.find(item => item.id == id);
        total += parseFloat(p.price);
        return `<div style="display:flex; justify-content:space-between; margin-bottom:10px;">
            <span>${p.name}</span><b>$${p.price}</b>
            <button onclick="removeFromCart(${index})" style="width:auto; background:none; color:red; border:none; cursor:pointer;">&times;</button>
        </div>`;
    }).join('');
    document.getElementById('cartTotal').innerText = total.toFixed(2);
}

async function checkout() {
    const name = document.getElementById('buyerName').value;
    const phone = document.getElementById('buyerPhone').value;
    if(!name || !phone) return alert("Enter your details!");

    const product = allApprovedProducts.find(p => p.id == cart[0]);
    const cleanPhone = product.seller_contact.replace(/\D/g, '');
    const waMsg = encodeURIComponent(`Hi! I'm ${name}. I want to buy your ${product.name} on Golem.`);
    const waLink = `https://wa.me/${cleanPhone}?text=${waMsg}`;

    document.getElementById('sellerDetail').innerHTML = `
        <a href="${waLink}" target="_blank" class="whatsapp-btn">💬 Chat with Seller</a>
    `;
    document.getElementById('sellerContactInfo').style.display = 'block';

    // CORS Safe Telegram Call
    const botToken = "8557174379:AAHjA_5WAIxIR8uq4mjZOhd1EfdKvgI2s7o";
    const chatId = "6792892909";
    const msg = `🛍️ Order: ${product.name}\n👤 Buyer: ${name}\n📞 Phone: ${phone}`;
    fetch(`https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(msg)}`);
}

function toggleCart() { document.getElementById('cartSidebar').classList.toggle('active'); }
function removeFromCart(i) { cart.splice(i, 1); updateCartUI(); }

fetchProducts();


// Function to open the modal
function openAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.style.display = 'flex';
}

// Function to close the modal
function closeAuth() {
    const modal = document.getElementById('authModal');
    if (modal) modal.style.display = 'none';
}

// Function to check if user can sell
async function checkAuthToSell() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (user) {
        window.location.href = "submit.html";
    } else {
        alert("Please login first to sell items!");
        openAuthModal();
    }
}


let isSignUp = false;

function toggleAuthMode() {
    isSignUp = !isSignUp;
    document.getElementById('authTitle').innerText = isSignUp ? "Create Account" : "Login to Golem";
    document.getElementById('authBtn').innerText = isSignUp ? "Register" : "Sign In";
    document.getElementById('registerFields').style.display = isSignUp ? "block" : "none";
    document.getElementById('toggleText').innerText = isSignUp ? "Already have an account? Login" : "Don't have an account? Register";
}

async function handleAuth() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value.trim();
    const btn = document.getElementById('authBtn');

    if (!email || !password) return alert("Please enter email and password!");

    btn.disabled = true;
    btn.innerText = "Connecting...";

    try {
        if (isSignUp) {
            const fullName = document.getElementById('regName').value.trim();
            const phone = document.getElementById('regPhone').value.trim();

            if (!fullName || !phone) return alert("Name and Phone are required!");

            // Use .auth.signUp
            const { error } = await _supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: fullName, phone: phone }
                }
            });
            if (error) throw error;
            alert("Registration successful! Check your email for a link.");
        } else {
            // Use .auth.signInWithPassword
            const { error } = await _supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });
            if (error) throw error;
            location.reload(); // Success!
        }
    } catch (e) {
        alert("Error: " + e.message);
    } finally {
        btn.disabled = false;
        btn.innerText = isSignUp ? "Register" : "Sign In";
    }
}




async function updateUIForUser() {
    const userMenu = document.getElementById('userMenu');
    if (!userMenu) return; // Stop if the ID doesn't exist

    try {
        const { data: { user }, error } = await _supabase.auth.getUser();

        if (user && !error) {
            // User is logged in: Show Name and Sign Out
            const userName = user.user_metadata?.full_name || user.email.split('@')[0];
            userMenu.innerHTML = `
                <div class="user-profile">
                    <span class="user-name">👤 ${userName}</span>
                    <button onclick="handleSignOut()" class="signout-btn">Sign Out</button>
                </div>
            `;
        } else {
            // No user: Ensure the Sign In button is visible
            userMenu.innerHTML = `<button onclick="openAuthModal()" id="loginNavBtn" class="login-btn">Sign In</button>`;
        }
    } catch (err) {
        // Fallback: If Supabase fails, show the Sign In button anyway
        userMenu.innerHTML = `<button onclick="openAuthModal()" id="loginNavBtn" class="login-btn">Sign In</button>`;
    }
}

// This ensures the script waits for the HTML to be ready
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts(); // Load your items
    updateUIForUser(); // Load your login/logout button
});

