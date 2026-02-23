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
    
    if(!name || !phone) {
        alert("Please enter your name and phone number!");
        return;
    }

    // Ensure there is something in the cart
    if (cart.length === 0) return alert("Cart is empty!");

    const productId = cart[0];
    const product = allApprovedProducts.find(p => p.id == productId);

    // --- THE SAFETY FIX ---
    if (!product || !product.seller_contact) {
        console.error("Product or Seller Contact missing:", product);
        alert("Error: This item doesn't have a valid seller phone number associated with it.");
        return; 
    }

    // Now it's safe to use .replace()
    const cleanPhone = product.seller_contact.replace(/\D/g, '');
    const waMsg = encodeURIComponent(`Hi! I'm ${name}. I want to buy your ${product.name} on Golem.`);
    const waLink = `https://wa.me/${cleanPhone}?text=${waMsg}`;

    // Show the WhatsApp button
    const sellerDetail = document.getElementById('sellerDetail');
    sellerDetail.innerHTML = `
        <p style="color: #333; margin-bottom: 10px;">Order prepared for <b>${product.name}</b></p>
        <a href="${waLink}" target="_blank" class="whatsapp-btn">
            💬 Chat with Seller on WhatsApp
        </a>
    `;
    document.getElementById('sellerContactInfo').style.display = 'block';

    // Send Telegram Notification (CORS-safe)
    const botToken = "8557174379:AAHjA_5WAIxIR8uq4mjZOhd1EfdKvgI2s7o";
    const chatId = "6792892909";
    const msg = `🛍️ NEW ORDER\n📦 Item: ${product.name}\n👤 Buyer: ${name}\n📞 Phone: ${phone}`;
    
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




// --- USER AUTH UI UPDATE ---
async function updateUIForUser() {
    const userMenu = document.getElementById('userMenu');
    // We also want to update the mobile nav "My Items" visibility
    const mobileMyItems = document.querySelector('.nav-item[onclick*="my-items.html"]');

    try {
        const { data: { user }, error } = await _supabase.auth.getUser();

        if (user && !error) {
            const userName = user.user_metadata?.full_name || user.email.split('@')[0];
            
            // 1. Update Desktop Nav
            if (userMenu) {
                userMenu.innerHTML = `
                    <div class="user-profile" style="display:flex; align-items:center; gap:10px;">
                        <a href="my-items.html" style="text-decoration:none; color:var(--primary); font-weight:bold;">👤 ${userName}</a>
                        <button onclick="handleSignOut()" class="signout-btn" style="padding:5px 10px; font-size:12px;">Sign Out</button>
                    </div>
                `;
            }
            
            // 2. Ensure Mobile "My Items" is visible
            if (mobileMyItems) mobileMyItems.style.display = "flex";

        } else {
            // No User logged in
            if (userMenu) {
                userMenu.innerHTML = `<button onclick="openAuthModal()" id="loginNavBtn">Sign In</button>`;
            }
            // Hide My Items from mobile nav if not logged in (optional)
            if (mobileMyItems) mobileMyItems.style.display = "none";
        }
    } catch (err) {
        console.error("UI Update Error:", err);
    }
}



// --- SIGN OUT LOGIC ---
async function handleSignOut() {
    const { error } = await _supabase.auth.signOut();
    if (error) alert(error.message);
    window.location.href = "index.html"; // Redirect to home
}


// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Run these when the page loads
    if (typeof fetchProducts === "function") fetchProducts();
    updateUIForUser();
});








