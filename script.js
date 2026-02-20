let allApprovedProducts = [];

async function fetchProducts() {
    const grid = document.getElementById('productGrid');
    const { data, error } = await _supabase
        .from('products')
        .select('*')
        .eq('status', 'approved');

    if (error) {
        grid.innerHTML = "<p>Error loading products.</p>";
        return;
    }

    allApprovedProducts = data;
    renderProducts(data);
}

function renderProducts(list) {
    const grid = document.getElementById('productGrid');
    if (list.length === 0) {
        grid.innerHTML = "<p>No items found.</p>";
        return;
    }

    grid.innerHTML = list.map(p => `
        <div class="product-card" onclick="openProductDetail('${p.id}')">
            <img src="${p.image}" alt="${p.name}">
            <div class="product-info">
                <h3>${p.name}</h3>
                <p class="price">$${p.price}</p>
                <button onclick="event.stopPropagation(); addToCart('${p.id}')">Add to Cart</button>
            </div>
        </div>
    `).join('');
}

function filterByCategory(category) {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => btn.classList.toggle('active', btn.innerText === category));

    const filtered = category === 'All' 
        ? allApprovedProducts 
        : allApprovedProducts.filter(p => p.category === category);
    renderProducts(filtered);
}

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

// Simple Cart Logic
let cart = [];
function addToCart(id) {
    cart.push(id);
    document.getElementById('cartCount').innerText = cart.length;
    alert("Added to cart!");
}

fetchProducts();
// 1. Updated Add to Cart Function
function addToCart(id) {
    cart.push(id);
    updateCartUI(); // Refresh the visual list
    
    // Optional: Open the sidebar automatically when an item is added
    const sidebar = document.getElementById('cartSidebar');
    if(sidebar) sidebar.classList.add('active'); 
}

// 2. The function that actually DISPLAYS the items
function updateCartUI() {
    const cartItemsContainer = document.getElementById('cartItems');
    const cartCount = document.getElementById('cartCount');
    const cartTotal = document.getElementById('cartTotal');

    // Update the counter bubble
    cartCount.innerText = cart.length;

    // If cart is empty
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = "<p style='padding:20px;'>Your cart is empty.</p>";
        cartTotal.innerText = "0";
        return;
    }

    let total = 0;
    // Map through the IDs in the cart and find the product info from our main list
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

// 3. Remove item function
function removeFromCart(index) {
    cart.splice(index, 1); // Remove 1 item at that position
    updateCartUI();
}

// 4. Toggle Sidebar Visibility
function toggleCart() {
    const sidebar = document.getElementById('cartSidebar');
    sidebar.classList.toggle('active');
}
async function checkout() {
    if (cart.length === 0) {
        alert("Your cart is empty!");
        return;
    }

    // --- CONFIGURATION ---
    const botToken = "YOUR_BOT_TOKEN_HERE"; // Put your token from BotFather
    const chatId = "YOUR_CHAT_ID_HERE";     // Put your ID from userinfobot
    // ---------------------

    let orderList = "🛍️ **New Order Received!**\n\n";
    let total = 0;

    cart.forEach((itemId, index) => {
        const product = allApprovedProducts.find(p => p.id == itemId);
        if (product) {
            orderList += `${index + 1}. ${product.name} — $${product.price}\n`;
            total += parseFloat(product.price);
        }
    });

    orderList += `\n💰 **Total: $${total.toFixed(2)}**`;
    orderList += `\n\nCheck the dashboard to process this order.`;

    try {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: orderList,
                parse_mode: "Markdown" // Makes the text look nice (bolding, etc.)
            })
        });

        if (response.ok) {
            alert("Order sent successfully! We will contact you soon.");
            cart = [];
            updateCartUI();
            toggleCart();
        } else {
            throw new Error("Failed to send to Telegram");
        }
    } catch (error) {
        console.error("Checkout Error:", error);
        alert("There was an error sending your order. Please try again.");
    }
}



