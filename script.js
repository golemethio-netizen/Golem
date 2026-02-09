const products = [
    { id: 1, name: "Premium Furniture", price: 599.99, image: "furniture.jpg", category: "home" },
    { id: 2, name: "iPhone 3 Classic", price: 199.99, image: "iphone3.jpg", category: "tech" },
    // Add more items here based on your images
];

let cart = JSON.parse(localStorage.getItem('golem_cart')) || [];

// Initialize Page
function init() {
    renderProducts(products);
    updateCartUI();
}

// Render Products to Grid
function renderProducts(items) {
    const grid = document.getElementById('productGrid');
    grid.innerHTML = items.map(product => `
        <div class="product-card">
            <img src="${product.image}" alt="${product.name}">
            <h3>${product.name}</h3>
            <p>$${product.price}</p>
            <button class="btn-add" onclick="addToCart(${product.id})">Add to Cart</button>
        </div>
    `).join('');
}

// Search Logic
document.getElementById('searchInput').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = products.filter(p => p.name.toLowerCase().includes(term));
    renderProducts(filtered);
});

// Cart Management
function addToCart(id) {
    const item = products.find(p => p.id === id);
    cart.push(item);
    saveCart();
}

function toggleCart() {
    document.getElementById('cartDrawer').classList.toggle('active');
}

function saveCart() {
    localStorage.setItem('golem_cart', JSON.stringify(cart));
    updateCartUI();
}

function updateCartUI() {
    const cartItems = document.getElementById('cartItems');
    const total = cart.reduce((sum, item) => sum + item.price, 0);
    
    document.getElementById('cartCount').innerText = cart.length;
    document.getElementById('cartTotal').innerText = total.toFixed(2);
    
    cartItems.innerHTML = cart.map((item, index) => `
        <div class="cart-item">
            <span>${item.name}</span>
            <span>$${item.price}</span>
            <button onclick="removeFromCart(${index})">x</button>
        </div>
    `).join('');
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
}

init();
