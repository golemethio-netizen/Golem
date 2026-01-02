// 1. Data
const products = [
    { id: 1, name: "Modern Headphones", price: 199, category: "Electronics", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400" },
    { id: 2, name: "Smart Watch", price: 299, category: "Tech", image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400" },
    { id: 3, name: "Leather Wallet", price: 50, category: "Accessories", image: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=400" },
    { id: 4, name: "Wireless Mouse", price: 25, category: "Tech", image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400" },
    { id: 5, name: "Camera Lens", price: 450, category: "Electronics", image: "https://images.unsplash.com/photo-1516724562728-afc824a36e84?w=400" },
    { id: 6, name: "Cotton T-Shirt", price: 20, category: "Accessories", image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400" }
];

// 2. State
let cart = JSON.parse(localStorage.getItem('myCart')) || [];

// 3. Selectors
const productGrid = document.getElementById('product-grid');
const cartDisplay = document.getElementById('cart-count');
const searchInput = document.getElementById('search-input');

// 4. Initialization
function init() {
    displayProducts(products);
    updateCartUI();
}

function displayProducts(arr) {
    productGrid.innerHTML = arr.map(p => `
        <div class="product-card">
            <img src="${p.image}" alt="${p.name}">
            <div class="product-info">
                <span class="category">${p.category}</span>
                <h3>${p.name}</h3>
                <p class="price">$${p.price}</p>
                <button class="buy-btn" onclick="addToCart(${p.id})">Add to Cart</button>
            </div>
        </div>
    `).join('');
}

// 5. Cart Logic
window.toggleCart = () => {
    document.getElementById('cart-sidebar').classList.toggle('active');
    document.getElementById('overlay').classList.toggle('active');
    renderCartItems();
};

window.addToCart = (id) => {
    const product = products.find(p => p.id === id);
    cart.push(product);
    saveAndUpdate();
};

window.removeItem = (index) => {
    cart.splice(index, 1);
    saveAndUpdate();
    renderCartItems();
};

function saveAndUpdate() {
    localStorage.setItem('myCart', JSON.stringify(cart));
    updateCartUI();
}

function updateCartUI() {
    cartDisplay.innerText = cart.length;
}

function renderCartItems() {
    const container = document.getElementById('cart-items-container');
    const totalDisplay = document.getElementById('total-amount');
    
    container.innerHTML = cart.map((item, index) => `
        <div class="cart-item">
            <div>
                <p><strong>${item.name}</strong></p>
                <p>$${item.price}</p>
            </div>
            <button class="remove-btn" onclick="removeItem(${index})">Remove</button>
        </div>
    `).join('') || '<p>Cart is empty</p>';
    
    totalDisplay.innerText = cart.reduce((sum, item) => sum + item.price, 0);
}

// 6. Filter & Search
searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = products.filter(p => p.name.toLowerCase().includes(term));
    displayProducts(filtered);
});

window.filterCategory = (cat) => {
    const filtered = cat === 'all' ? products : products.filter(p => p.category === cat);
    displayProducts(filtered);
};

window.processCheckout = () => {
    if(cart.length === 0) return alert("Cart is empty!");
    alert("Proceeding to Stripe Payment Gateway...");
};

init();