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

