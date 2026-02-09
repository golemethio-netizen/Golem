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

// Inside the 'submit' listener in admin.html:
const newProduct = {
    id: Date.now(),
    name: document.getElementById('name').value,
    price: parseFloat(document.getElementById('price').value),
    image: document.getElementById('image').value,
    category: document.getElementById('category').value // Added this line
};

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

// 1. Initialize Products from LocalStorage or use defaults if empty
let defaultProducts = [
    { id: 1, name: "Premium Furniture", price: 599.99, image: "furniture.jpg" },
    { id: 2, name: "iPhone 3 Classic", price: 199.99, image: "iphone3.jpg" }
];

let products = JSON.parse(localStorage.getItem('golem_products')) || defaultProducts;
let cart = JSON.parse(localStorage.getItem('golem_cart')) || [];

// Save Products globally
function saveProducts() {
    localStorage.setItem('golem_products', JSON.stringify(products));
}

// 2. Initialize UI
function init() {
    const productGrid = document.getElementById('productGrid');
    if (productGrid) renderProducts(products); // Only run on index.html
    updateCartUI();
}

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

// 3. Search Logic
const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = products.filter(p => p.name.toLowerCase().includes(term));
        renderProducts(filtered);
    });
}

// 4. Cart Logic
function addToCart(id) {
    const item = products.find(p => p.id === id);
    cart.push(item);
    localStorage.setItem('golem_cart', JSON.stringify(cart));
    updateCartUI();
}

function updateCartUI() {
    const cartCount = document.getElementById('cartCount');
    const cartItems = document.getElementById('cartItems');
    if (cartCount) cartCount.innerText = cart.length;
    
    if (cartItems) {
        const total = cart.reduce((sum, item) => sum + item.price, 0);
        document.getElementById('cartTotal').innerText = total.toFixed(2);
        cartItems.innerHTML = cart.map((item, index) => `
            <div class="cart-item">
                <span>${item.name}</span>
                <button onclick="removeFromCart(${index})">x</button>
            </div>
        `).join('');
    }
}

function removeFromCart(index) {
    cart.splice(index, 1);
    localStorage.setItem('golem_cart', JSON.stringify(cart));
    updateCartUI();
}

function toggleCart() {
    document.getElementById('cartDrawer').classList.toggle('active');
}

init();

