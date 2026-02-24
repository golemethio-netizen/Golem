let cart = [];
let allApprovedProducts = [];
let isSignUp = false;

// Initialize UI
document.addEventListener('DOMContentLoaded', async () => {
    fetchProducts();
    updateUIForUser();
});

async function fetchProducts() {
    const { data, error } = await _supabase
        .from('products')
        .select('*')
        .eq('status', 'approved');
    
    if (error) return console.error(error);
    allApprovedProducts = data;
    renderProducts(data);
}

function renderProducts(products) {
    const grid = document.getElementById('productGrid');
    grid.innerHTML = products.map(p => `
        <div class="product-card">
            <img src="${p.image}" alt="${p.name}">
            <div class="product-info">
                <h3>${p.name}</h3>
                <p>${p.price} ETB</p>
                <button onclick="addToCart('${p.id}')">Add to Cart</button>
            </div>
        </div>
    `).join('');
}

// CART LOGIC
function addToCart(id) {
    cart.push(id);
    document.getElementById('cartCount').innerText = cart.length;
    alert("Added to cart!");
}

function toggleCart() {
    const modal = document.getElementById('cartModal');
    modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
}

async function checkout(provider) {
    const nameInput = document.getElementById('buyerName');
    const phoneInput = document.getElementById('buyerPhone');
    
    if (!nameInput.value || !phoneInput.value) return alert("Fill in your details!");
    if (cart.length === 0) return alert("Cart is empty!");

    const product = allApprovedProducts.find(p => p.id === cart[0]);
    const message = `New Order: ${product.name}\nBuyer: ${nameInput.value}\nPhone: ${phoneInput.value}`;

    try {
        // Save lead to Supabase
        await _supabase.from('orders').insert([{
            product_id: product.id,
            seller_id: product.user_id,
            buyer_name: nameInput.value,
            buyer_phone: phoneInput.value,
            product_name: product.name
        }]);

        if (provider === 'whatsapp') {
            const waUrl = `https://wa.me/${product.whatsapp_number}?text=${encodeURIComponent(message)}`;
            window.open(waUrl, '_blank');
        } else {
            // Telegram Bot Method
            const botToken = "YOUR_BOT_TOKEN"; 
            const chatId = "YOUR_CHAT_ID";
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ chat_id: chatId, text: message })
            });
            alert("Sent to Telegram!");
        }
        cart = [];
        toggleCart();
    } catch (e) { alert(e.message); }
}

// AUTH LOGIC
async function handleAuth() {
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    
    try {
        if (isSignUp) {
            await _supabase.auth.signUp({ email, password });
            alert("Check email for verification!");
        } else {
            const { error } = await _supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            location.reload();
        }
    } catch (e) { alert(e.message); }
}

async function updateUIForUser() {
    const userMenu = document.getElementById('userMenu');
    const { data: { user } } = await _supabase.auth.getUser();
    if (user) {
        const { data: profile } = await _supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
        userMenu.innerHTML = `
            ${profile?.is_admin ? '<button onclick="location.href=\'admin.html\'">Admin</button>' : ''}
            <button onclick="location.href='my-items.html'">My Items</button>
            <button onclick="_supabase.auth.signOut().then(()=>location.reload())">Sign Out</button>
        `;
    }
}

function openAuthModal() { document.getElementById('authModal').style.display = 'flex'; }
function toggleAuthMode() { 
    isSignUp = !isSignUp;
    document.getElementById('authTitle').innerText = isSignUp ? "Sign Up" : "Login";
}
