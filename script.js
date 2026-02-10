
// REPLACE THESE TWO LINES WITH YOUR REAL SUPABASE DATA
const SUPABASE_URL = 'https://ryeylhawdmykbbmnfrrh.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable__XhkM93G4uNhdKhDKa6osQ_PPpIPO6m'; 


const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let products = [];
let cart = JSON.parse(localStorage.getItem('golem_cart')) || [];

// ADMIN AUTH
function checkAdminKey() {
    if(document.getElementById('adminKeyInput').value === 'golem_admin_2026') {
        sessionStorage.setItem('isAdmin', 'true');
        location.reload();
    }
}

// INITIALIZE
async function init() {
    const isAdmin = sessionStorage.getItem('isAdmin') === 'true';
    if(isAdmin && document.getElementById('adminContent')) {
        document.getElementById('adminLogin').style.display = 'none';
        document.getElementById('adminContent').style.display = 'block';
        renderAdminList();
    }

    try {
        const { data, error } = await _supabase.from('products').select('*');
        if (error) throw error;
        products = data;
        if(document.getElementById('productGrid')) renderProducts(products);
    } catch (err) {
        console.error("Fetch Error:", err);
        const grid = document.getElementById('productGrid');
        if(grid) grid.innerHTML = `<p style="color:red">Error: ${err.message}. Check your Supabase URL/Key.</p>`;
    }
    updateCartUI();
}

function renderProducts(list) {
    const grid = document.getElementById('productGrid');
    if(!grid) return;
    if(list.length === 0) {
        grid.innerHTML = "<p>No products found in database.</p>";
        return;
    }
    grid.innerHTML = list.map(p => `
        <div class="product-card">
            <img src="${p.image}" onerror="this.src='https://via.placeholder.com/200?text=No+Image'">
            <h3>${p.name}</h3>
            <p>$${p.price}</p>
            <button class="add-btn" onclick="addToCart('${p.id}')">Add to Cart</button>
        </div>
    `).join('');
}

async function renderAdminList() {
    const { data } = await _supabase.from('products').select('*');
    const listDiv = document.getElementById('adminProductList');
    if(!listDiv) return;
    listDiv.innerHTML = data.map(p => `
        <div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #eee;">
            <span>${p.name}</span>
            <button onclick="deleteProduct('${p.id}')" style="color:red; cursor:pointer; background:none; border:none;">Delete</button>
        </div>
    `).join('');
}

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
            image: document.getElementById('pImage').value
        };
        await _supabase.from('products').insert([newItem]);
        location.reload();
    });
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
}

function toggleCart() {
    document.getElementById('cartDrawer').classList.toggle('active');
}

init();
