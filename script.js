let allApprovedProducts = [];

// 1. FETCH DATA FROM DATABASE
async function fetchProducts() {
    console.log("Fetching started...");
    const grid = document.getElementById('productGrid');
    
    try {
        const { data, error } = await _supabase
            .from('products')
            .select('*'); 

        if (error) throw error;

        console.log("Data received:", data);

        // Filter for approved or sold items
        allApprovedProducts = data.filter(p => p.status === 'approved' || p.status === 'sold');
        
        renderProducts(allApprovedProducts);

    } catch (err) {
        console.error("Fetch Error:", err.message);
        if(grid) grid.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
    }
}

// 2. RENDER PRODUCTS TO THE SCREEN
function renderProducts(list) {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    // Clear loading text
    grid.innerHTML = "";

    if (list.length === 0) {
        grid.innerHTML = "<p>No products found in the database.</p>";
        return;
    }

    grid.innerHTML = list.map(p => {
        const isSold = p.status === 'sold';
        return `
        <div class="product-card" onclick="openProductDetail('${p.id}')">
            ${isSold ? '<div class="sold-badge">SOLD</div>' : ''}
            <img src="${p.image}" alt="${p.name}" style="${isSold ? 'filter: grayscale(100%); opacity: 0.6;' : ''}">
            <div class="product-info">
                <h3>${p.name}</h3>
                <p class="price">$${p.price}</p>
                ${isSold 
                    ? '<button disabled style="background: #888; cursor: not-allowed;">Sold Out</button>' 
                    : `<button onclick="event.stopPropagation(); addToCart('${p.id}')">Add to Cart</button>`
                }
            </div>
        </div>`;
    }).join('');
}

// 3. SEARCH AND FILTER FUNCTIONS
function searchProducts() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    
    // Filter the global array we created earlier
    const filtered = allApprovedProducts.filter(p => 
        p.name.toLowerCase().includes(term) || 
        (p.description && p.description.toLowerCase().includes(term))
    );
    
    renderProducts(filtered); // Re-draw the grid with only matched items
}

function filterByCategory(category) {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => btn.classList.toggle('active', btn.innerText === category));

    const filtered = category === 'All' 
        ? allApprovedProducts 
        : allApprovedProducts.filter(p => p.category === category);
    renderProducts(filtered);
}

// 4. PRODUCT DETAIL MODAL
function openProductDetail(id) {
    const p = allApprovedProducts.find(item => item.id == id);
    if (!p) return;

    document.getElementById('modalImg').src = p.image;
    document.getElementById('modalName').innerText = p.name;
    document.getElementById('modalPrice').innerText = `$${p.price}`;
    document.getElementById('modalDesc').innerText = p.description || "No description provided.";
    document.getElementById('productModal').style.display = "flex";
}

function closeModal() {
    document.getElementById('productModal').style.display = "none";
}

// 5. CART LOGIC
let cart = [];

function addToCart(id) {
    cart.push(id);
    updateCartUI();
    document.getElementById('cartSidebar').classList.add('active');
}

function updateCartUI() {
    const cartItemsContainer = document.getElementById('cartItems');
    const cartCount = document.getElementById('cartCount');
    const cartTotal = document.getElementById('cartTotal');

    cartCount.innerText = cart.length;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = "<p style='padding:20px;'>Your cart is empty.</p>";
        cartTotal.innerText = "0";
        return;
    }

    let total = 0;
    cartItemsContainer.innerHTML = cart.map((itemId, index) => {
        const product = allApprovedProducts.find(p => p.id == itemId);
        if (product) {
            total += parseFloat(product.price);
            return `
                <div class="cart-item">
                    <img src="${product.image}" alt="${product.name}">
                    <div class="cart-item-info">
                        <h4>${product.name}</h4>
                        <p>$${product.price}</p>
                    </div>
                    <button class="remove-btn" onclick="removeFromCart(${index})">&times;</button>
                </div>
            `;
        }
    }).join('');

    cartTotal.innerText = total.toFixed(2);
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
}

function toggleCart() {
    document.getElementById('cartSidebar').classList.toggle('active');
}

// 6. TELEGRAM CHECKOUT
async function checkout() {
    if (cart.length === 0) return;

    const botToken = "8557174379:AAHjA_5WAIxIR8uq4mjZOhd1EfdKvgI2s7o"; 
    const chatId = "6792892909";

    let orderList = "🛍️ **New Order!**\n\n";
    let total = 0;

    cart.forEach((itemId, index) => {
        const product = allApprovedProducts.find(p => p.id == itemId);
        if (product) {
            orderList += `${index + 1}. ${product.name} — $${product.price}\n`;
            total += parseFloat(product.price);
        }
    });

    orderList += `\n💰 **Total: $${total.toFixed(2)}**`;

    try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: orderList, parse_mode: "Markdown" })
        });
        alert("Order sent!");
        cart = [];
        updateCartUI();
        toggleCart();
    } catch (e) {
        alert("Error sending order.");
    }
}

// START THE APP
fetchProducts();


