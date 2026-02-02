// Product Data with Live Unsplash Links
const products = [
    { id: 1, name: "Golem Core V1", price: 299, desc: "High-speed processing unit.", image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600" },
    { id: 2, name: "Neural Link", price: 150, desc: "Direct brain-to-web interface.", image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600" },
    { id: 3, name: "Titan Shell", price: 500, desc: "Carbon-fiber protective casing.", image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600" },
    { id: 4, name: "Cyber Optic", price: 125, desc: "Real-time HUD visual overlays.", image: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=600" }
];

let cart = JSON.parse(localStorage.getItem('golem_cart')) || [];

// Initialize Application
function init() {
    renderProducts(products);
    updateCartUI();
    const savedTheme = localStorage.getItem('golem_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

// Render Product Cards
function renderProducts(items) {
    const list = document.getElementById('product-list');
    if(!list) return;
    
    list.innerHTML = items.map(p => `
        <div class="product-card" onclick="openDetails(${p.id})">
            <img src="${p.image}" onerror="this.src='https://via.placeholder.com/300?text=Golem+Tech'">
            <h3>${p.name}</h3>
            <p>$${p.price}</p>
            <button class="add-btn" onclick="addToCart(event, ${p.id})">Add to Cart</button>
        </div>
    `).join('');
}

// Search Logic
function filterProducts() {
    const query = document.getElementById('search-bar').value.toLowerCase();
    const filtered = products.filter(p => p.name.toLowerCase().includes(query));
    renderProducts(filtered);
}

// Cart Logic
function addToCart(event, id) {
    event.stopPropagation();
    const p = products.find(x => x.id === id);
    cart.push(p);
    localStorage.setItem('golem_cart', JSON.stringify(cart));
    updateCartUI();
}

function updateCartUI() {
    document.getElementById('cart-count').innerText = cart.length;
    const cartItems = document.getElementById('cart-items');
    const totalSpan = document.getElementById('total-price');

    cartItems.innerHTML = cart.map((item, index) => `
        <div style="display:flex; justify-content:space-between; padding: 10px 0; border-bottom:1px solid var(--accent);">
            <span>${item.name}</span>
            <span>$${item.price} <button onclick="removeItem(${index})">❌</button></span>
        </div>
    `).join('');

    const total = cart.reduce((sum, item) => sum + item.price, 0);
    totalSpan.innerText = total;
}

function removeItem(index) {
    cart.splice(index, 1);
    localStorage.setItem('golem_cart', JSON.stringify(cart));
    updateCartUI();
}

// Modals & UI Toggles
function openDetails(id) {
    const p = products.find(x => x.id === id);
    const modal = document.getElementById('product-modal');
    document.getElementById('modal-body').innerHTML = `
        <img src="${p.image}" style="width:100%; border-radius:10px;">
        <h2>${p.name}</h2>
        <p>${p.desc}</p>
        <h3>Price: $${p.price}</h3>
        <button class="add-btn" onclick="addToCart(event, ${p.id})">Add to Cart</button>
    `;
    modal.style.display = "block";
}

function closeModal() { document.getElementById('product-modal').style.display = "none"; }

function toggleCart() {
    const side = document.getElementById('cart-sidebar');
    side.style.display = (side.style.display === "block") ? "none" : "block";
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const target = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', target);
    localStorage.setItem('golem_theme', target);
}

function toggleChat() { document.getElementById('chat-widget').classList.toggle('chat-closed'); }

function processCheckout() {
    if(cart.length === 0) return alert("Cart is empty");
    alert("Order Successful! Golem units are being prepared.");
    cart = [];
    localStorage.setItem('golem_cart', JSON.stringify(cart));
    updateCartUI();
    toggleCart();
}

init();
