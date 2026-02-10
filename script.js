
// REPLACE THESE TWO LINES WITH YOUR REAL SUPABASE DATA
const SUPABASE_URL = 'https://ryeylhawdmykbbmnfrrh.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable__XhkM93G4uNhdKhDKa6osQ_PPpIPO6m'; 

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let products = [];
let cart = JSON.parse(localStorage.getItem('golem_cart')) || [];

// --- LOGIN LOGIC ---
function checkAdminKey() {
    const key = document.getElementById('adminKeyInput').value;
    if(key === 'golem_admin_2026') {
        sessionStorage.setItem('isAdmin', 'true');
        location.reload();
    } else {
        document.getElementById('loginError').style.display = 'block';
    }
}

function adminLogout() {
    sessionStorage.removeItem('isAdmin');
    location.href = 'index.html';
}

// --- STARTUP ---
async function init() {
    await loadProducts();
    updateCartUI();

    // Check Admin View
    const isAdmin = sessionStorage.getItem('isAdmin') === 'true';
    if(isAdmin && document.getElementById('adminContent')) {
        document.getElementById('adminLogin').style.display = 'none';
        document.getElementById('adminContent').style.display = 'block';
        renderAdminList();
    }
}

async function loadProducts() {
    console.log("Attempting to load products...");
    const { data, error } = await _supabase
        .from('products')
        .select('*');

    if (error) {
        console.error("Supabase Error:", error.message);
        alert("Database Error: " + error.message); // This will pop up on your site to tell you the error
        return;
    }

    if (data) {
        console.log("Data received:", data);
        products = data;
        const grid = document.getElementById('productGrid');
        if (grid) {
            renderProducts(products);
        } else {
            console.error("Could not find productGrid element in HTML");
        }
    }
}
// --- UI RENDERING ---
function renderProducts(list) {
    const grid = document.getElementById('productGrid');
    grid.innerHTML = list.map(p => `
        <div class="product-card">
            <img src="${p.image}">
            <h3>${p.name}</h3>
            <p>$${p.price}</p>
            <button class="add-btn" onclick="addToCart(${p.id})">Add to Cart</button>
        </div>
    `).join('');
}

async function renderAdminList() {
    const { data } = await _supabase.from('products').select('*');
    const listDiv = document.getElementById('adminProductList');
    listDiv.innerHTML = data.map(p => `
        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
            <span>${p.name}</span>
            <button onclick="deleteProduct(${p.id})" style="color:red; background:none; border:none; cursor:pointer;">Delete</button>
        </div>
    `).join('');
}

// --- ACTIONS ---
async function deleteProduct(id) {
    await _supabase.from('products').delete().eq('id', id);
    location.reload();
}

if(document.getElementById('addProductForm')) {
    document.getElementById('addProductForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newItem = {
            name: document.getElementById('pName').value,
            price: document.getElementById('pPrice').value,
            image: document.getElementById('pImage').value,
            category: document.getElementById('pCategory').value
        };
        await _supabase.from('products').insert([newItem]);
        location.reload();
    });
}

function filterByCategory(cat) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    const filtered = cat === 'all' ? products : products.filter(p => p.category === cat);
    renderProducts(filtered);
}

function addToCart(id) {
    const item = products.find(p => p.id === id);
    cart.push(item);
    localStorage.setItem('golem_cart', JSON.stringify(cart));
    updateCartUI();
}

function updateCartUI() {
    const count = document.getElementById('cartCount');
    if(count) count.innerText = cart.length;
    const itemsDiv = document.getElementById('cartItems');
    if(itemsDiv) {
        itemsDiv.innerHTML = cart.map((it, i) => `<div>${it.name} <button onclick="removeFromCart(${i})">x</button></div>`).join('');
        const total = cart.reduce((s, it) => s + parseFloat(it.price), 0);
        document.getElementById('cartTotal').innerText = total.toFixed(2);
    }
}

function removeFromCart(i) {
    cart.splice(i, 1);
    localStorage.setItem('golem_cart', JSON.stringify(cart));
    updateCartUI();
}

function toggleCart() {
    document.getElementById('cartDrawer').classList.toggle('active');
}

init();







