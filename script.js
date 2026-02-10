
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

