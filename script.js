const products = [
    { id: 1, name: "Golem Core V1", price: 299, desc: "The ultimate processing unit.", image: "assets/images/product1.jpg" },
    { id: 2, name: "Neural Link", price: 150, desc: "Connect your mind to the web.", image: "assets/images/p2.jpg" },
    { id: 3, name: "Titan Shell", price: 500, desc: "Indestructible exterior casing.", image: "assets/images/p3.jpg" }
];

// Load cart from storage OR start empty
let cart = JSON.parse(localStorage.getItem('golem_cart')) || [];

function init() {
    renderProducts();
    updateCartUI(); // This ensures the count shows correctly on refresh
}

function renderProducts() {
    const list = document.getElementById('product-list');
    if(!list) return;
    
    list.innerHTML = products.map(p => `
        <div class="product-card" onclick="openDetails(${p.id})">
            <img src="${p.image}" onerror="this.src='https://via.placeholder.com/300?text=Golem+Tech'">
            <h3>${p.name}</h3>
            <p>$${p.price}</p>
            <button class="add-btn" onclick="addToCart(event, ${p.id})">Add to Cart</button>
        </div>
    `).join('');
}

function addToCart(event, id) {
    event.stopPropagation(); // STOPS the detail modal from opening when clicking the button
    const p = products.find(x => x.id === id);
    cart.push(p);
    
    // Save to browser memory
    localStorage.setItem('golem_cart', JSON.stringify(cart));
    
    // Refresh the UI
    updateCartUI();
    
    // Optional: Visual feedback
    console.log("Item Added! Total items:", cart.length);
}

function updateCartUI() {
    const countSpan = document.getElementById('cart-count');
    const cartItems = document.getElementById('cart-items');
    const totalSpan = document.getElementById('total-price');

    if(countSpan) countSpan.innerText = cart.length;

    if(cartItems) {
        cartItems.innerHTML = cart.map((item, index) => `
            <div class="cart-item">
                <span>${item.name}</span>
                <span>$${item.price} <button onclick="removeItem(${index})">❌</button></span>
            </div>
        `).join('');
    }

    if(totalSpan) {
        const total = cart.reduce((sum, item) => sum + item.price, 0);
        totalSpan.innerText = total;
    }
}

function removeItem(index) {
    cart.splice(index, 1);
    localStorage.setItem('golem_cart', JSON.stringify(cart));
    updateCartUI();
}

function openDetails(id) {
    const p = products.find(x => x.id === id);
    const modal = document.getElementById('product-modal');
    const body = document.getElementById('modal-body');
    
    if(modal && body) {
        body.innerHTML = `
            <img src="${p.image}" style="width:100%; border-radius:10px;" onerror="this.src='https://via.placeholder.com/300'">
            <h2>${p.name}</h2>
            <p>${p.desc}</p>
            <h3>$${p.price}</h3>
            <button class="add-btn" onclick="addToCart(event, ${p.id})">Add to Cart</button>
        `;
        modal.style.display = "block";
    }
}

function closeModal() {
    document.getElementById('product-modal').style.display = "none";
}

function toggleCart() {
    const side = document.getElementById('cart-sidebar');
    if(side) {
        side.classList.toggle('active'); // Use classes for smoother transitions
        side.style.display = (side.style.display === "block") ? "none" : "block";
    }
}

// Start everything
init();

