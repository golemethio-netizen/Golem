const products = [
    { id: 1, name: "Golem Core V1", price: 299, desc: "The ultimate processing unit.", image: "assets/images/p1.jpg" },
    { id: 2, name: "Neural Link", price: 150, desc: "Connect your mind to the web.", image: "assets/images/p2.jpg" },
    { id: 3, name: "Titan Shell", price: 500, desc: "Indestructible exterior casing.", image: "assets/images/p3.jpg" }
];

let cart = JSON.parse(localStorage.getItem('golem_cart')) || [];

function init() {
    renderProducts();
    updateCartUI();
}

// 1. Render Products
function renderProducts() {
    const list = document.getElementById('product-list');
    list.innerHTML = products.map(p => `
        <div class="product-card" onclick="openDetails(${p.id})">
            <img src="${p.image}" onerror="this.src='https://via.placeholder.com/300?text=Image+Missing'">
            <h3>${p.name}</h3>
            <p>$${p.price}</p>
            <button onclick="event.stopPropagation(); addToCart(${p.id})">Add to Cart</button>
        </div>
    `).join('');
}

// 2. Product Details (Step 3)
function openDetails(id) {
    const p = products.find(x => x.id === id);
    const modal = document.getElementById('product-modal');
    document.getElementById('modal-body').innerHTML = `
        <img src="${p.image}" style="width:100%; border-radius:10px;">
        <h2>${p.name}</h2>
        <p>${p.desc}</p>
        <h3>$${p.price}</h3>
        <button onclick="addToCart(${p.id})">Add to Cart</button>
    `;
    modal.style.display = "block";
}

function closeModal() {
    document.getElementById('product-modal').style.display = "none";
}

// 3. Shopping Cart Logic (Step 1)
function addToCart(id) {
    const p = products.find(x => x.id === id);
    cart.push(p);
    localStorage.setItem('golem_cart', JSON.stringify(cart));
    updateCartUI();
}

function updateCartUI() {
    document.getElementById('cart-count').innerText = cart.length;
    const cartItems = document.getElementById('cart-items');
    cartItems.innerHTML = cart.map((item, index) => `
        <div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #333;">
            <p>${item.name}</p>
            <p>$${item.price} <button onclick="removeItem(${index})">❌</button></p>
        </div>
    `).join('');
    
    const total = cart.reduce((sum, item) => sum + item.price, 0);
    document.getElementById('total-price').innerText = total;
}

function removeItem(index) {
    cart.splice(index, 1);
    localStorage.setItem('golem_cart', JSON.stringify(cart));
    updateCartUI();
}

function toggleCart() {
    const side = document.getElementById('cart-sidebar');
    side.style.display = (side.style.display === "block") ? "none" : "block";
}

init();