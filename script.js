
// REPLACE THESE TWO LINES WITH YOUR REAL SUPABASE DATA
const SUPABASE_URL = 'https://ryeylhawdmykbbmnfrrh.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable__XhkM93G4uNhdKhDKa6osQ_PPpIPO6m'; 


const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ... keep your SUPABASE_URL and SUPABASE_KEY at the top ...

let products = []; // This stores the full list from the cloud

async function init() {
    try {
        const { data, error } = await _supabase.from('products').select('*');
        if (error) throw error;
        products = data; // Save the cloud data to our local list
        renderProducts(products); // Show all products initially
    } catch (err) {
        document.getElementById('productGrid').innerHTML = `<p>Error loading: ${err.message}</p>`;
    }
}

// THE FILTER FUNCTION
function filterByCategory(category) {
    // 1. Update button styling
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    // 2. Filter the data
    if (category === 'all') {
        renderProducts(products);
    } else {
        const filtered = products.filter(p => p.category === category);
        renderProducts(filtered);
    }
}

function renderProducts(list) {
    const grid = document.getElementById('productGrid');
    if (list.length === 0) {
        grid.innerHTML = "<p>No products found in this category.</p>";
        return;
    }
    grid.innerHTML = list.map(p => `
        <div class="product-card">
            <img src="${p.image}" onerror="this.src='https://via.placeholder.com/200?text=Image+Not+Found'">
            <h3>${p.name}</h3>
            <p>$${p.price}</p>
            <button class="add-btn" onclick="addToCart('${p.id}')">Add to Cart</button>
        </div>
    `).join('');
}

init();

//////////////////



if(document.getElementById('addProductForm')) {
    document.getElementById('addProductForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Collect all 4 pieces of data
        const newItem = {
            name: document.getElementById('pName').value,
            price: parseFloat(document.getElementById('pPrice').value),
            image: document.getElementById('pImage').value,
            category: document.getElementById('pCategory').value // This must match your column name!
        };

        // Send to Supabase
        const { error } = await _supabase.from('products').insert([newItem]);

        if (error) {
            alert("Error adding product: " + error.message);
        } else {
            alert("Product added successfully!");
            location.reload(); // Refresh to show the new item
        }
    });
}

////////////////////////////////////////
// --- ADMIN AUTH LOGIC ---
function checkAdminKey() {
    const enteredPass = document.getElementById('adminKeyInput').value;
    const correctPass = 'golem_admin_2026';

    if (enteredPass === correctPass) {
        sessionStorage.setItem('isAdmin', 'true');
        alert("Access Granted!");
        // Refresh to show the dashboard
        location.reload(); 
    } else {
        const errorMsg = document.getElementById('loginError');
        if (errorMsg) errorMsg.style.display = 'block';
        alert("Incorrect Password!");
    }
}

// --- INITIALIZE FUNCTION ---
async function init() {
    // 1. Check if the user is logged in
    const isAdmin = sessionStorage.getItem('isAdmin') === 'true';
    
    // 2. Control visibility if we are on the admin page
    const adminContent = document.getElementById('adminContent');
    const loginOverlay = document.getElementById('adminLogin');

    if (isAdmin) {
        if (adminContent) adminContent.style.display = 'block';
        if (loginOverlay) loginOverlay.style.display = 'none';
        
        // Load the special admin list if the element exists
        if (document.getElementById('adminProductList')) {
            renderAdminList();
        }
    }

    // 3. Load the products from Supabase for everyone
    try {
        const { data, error } = await _supabase.from('products').select('*');
        if (error) throw error;
        products = data;
        if (document.getElementById('productGrid')) renderProducts(products);
    } catch (err) {
        console.error("Supabase Error:", err.message);
    }
}

///////////////
let cart = JSON.parse(localStorage.getItem('golem_cart')) || [];

function addToCart(productId) {
    const item = products.find(p => p.id === productId);
    if (item) {
        cart.push(item);
        // Save to browser memory so it stays if they refresh
        localStorage.setItem('golem_cart', JSON.stringify(cart));
        updateCartUI();
        
        // Optional: Open the cart automatically to show it was added
        document.getElementById('cartDrawer').classList.add('active');
    }
}

function updateCartUI() {
    const countElement = document.getElementById('cartCount');
    const itemsContainer = document.getElementById('cartItems');
    const totalElement = document.getElementById('cartTotal');

    if (countElement) countElement.innerText = cart.length;

    if (itemsContainer) {
        if (cart.length === 0) {
            itemsContainer.innerHTML = "<p style='text-align:center; padding:20px;'>Your cart is empty.</p>";
        } else {
            itemsContainer.innerHTML = cart.map((item, index) => {
                // Clean the price in case it has a '$'
                const price = typeof item.price === 'string' ? item.price.replace('$', '') : item.price;
                return `
                    <div class="cart-item" style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #eee; padding-bottom:5px;">
                        <span>${item.name}</span>
                        <span>$${parseFloat(price).toFixed(2)}</span>
                        <button onclick="removeFromCart(${index})" style="color:red; border:none; background:none; cursor:pointer;">&times;</button>
                    </div>
                `;
            }).join('');
        }
    }

    if (totalElement) {
        const total = cart.reduce((sum, item) => {
            const price = typeof item.price === 'string' ? item.price.replace('$', '') : item.price;
            return sum + parseFloat(price || 0);
        }, 0);
        totalElement.innerText = total.toFixed(2);
    }
}



/////
async function sendToTelegram(message) {
    const botToken = 'YOUR_BOT_TOKEN'; // Make sure this is your real token
    const chatId = 'YOUR_CHAT_ID';     // Make sure this is your real ID
    
    // We build the URL with the message inside it
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    const params = new URLSearchParams({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
    });

    try {
        // We use a simple GET or a standard POST without 'application/json'
        const response = await fetch(`${url}?${params.toString()}`);
        
        if (!response.ok) {
            throw new Error(`Telegram API Error: ${response.statusText}`);
        }
        
        console.log("Telegram message sent successfully!");
    } catch (err) {
        console.error("Failed to send to Telegram:", err);
        // Fallback: still show the success modal to the user even if notification fails
    }
}







// THE CHECKOUT FUNCTION
async function processCheckout() {


    function sendEmail(orderDetails) {
    emailjs.init("YOUR_PUBLIC_KEY");
    emailjs.send("SERVICE_ID", "TEMPLATE_ID", {
        order_data: orderDetails,
        to_name: "Admin",
    });
}
    if (cart.length === 0) return alert("Cart empty!");

    const total = cart.reduce((sum, item) => sum + parseFloat(item.price), 0);
    
    // Create the message for Telegram/Email
    let orderDetails = `<b>New Order from GOLEM Store!</b>\n\n`;
    cart.forEach((item, i) => {
        orderDetails += `${i+1}. ${item.name} - $${item.price}\n`;
    });
    orderDetails += `\n<b>Total: $${total.toFixed(2)}</b>`;

    // Send the notification
    await sendToTelegram(orderDetails);

    // Show success UI
    document.getElementById('orderSummary').innerText = `Order sent to staff! Total: $${total.toFixed(2)}`;
    document.getElementById('checkoutModal').style.display = 'flex';

    // Clear cart
    cart = [];
    localStorage.removeItem('golem_cart');
    updateCartUI();
    toggleCart();
}


let orderText = `<b>🛍️ New Order - GOLEM Store</b>\n`;
orderText += `----------------------------\n`;
cart.forEach((item, i) => {
    orderText += `${i + 1}. 📦 <b>${item.name}</b> - $${item.price}\n`;
});
orderText += `----------------------------\n`;
orderText += `<b>💰 Total: $${total.toFixed(2)}</b>`;

// return to site after checkout
function closeCheckout() {
    const modal = document.getElementById('checkoutModal');
    if (modal) {
        modal.style.display = 'none';
        // Optional: Scroll to the top of the page so they see the products again
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        console.error("Could not find the checkoutModal element.");
    }
}

function removeFromCart(index) {
    cart.splice(index, 1);
    localStorage.setItem('golem_cart', JSON.stringify(cart));
    updateCartUI();
}
document.getElementById('searchInput')?.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm)
    );
    renderProducts(filteredProducts);
});






