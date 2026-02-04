// 1. REPLACE WITH YOUR ACTUAL CONFIG
const firebaseConfig = {
    apiKey: "AIzaSy...", 
    authDomain: "golem-project.firebaseapp.com",
    projectId: "golem-project",
    storageBucket: "golem-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const productsCol = db.collection('products');

let allProducts = []; // Local copy for searching

// 2. LIVE SYNC WITH FIREBASE
function init() {
    // onSnapshot updates the UI automatically when the database changes!
    productsCol.orderBy('createdAt', 'desc').onSnapshot((snapshot) => {
        allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderProducts(allProducts);
        renderAdminList(allProducts);
    });
}

function renderProducts(items) {
    const list = document.getElementById('product-list');
    list.innerHTML = items.map(p => `
        <div class="product-card">
            <img src="${p.image}" onerror="this.src='https://via.placeholder.com/300'">
            <h3>${p.name}</h3>
            <p>$${p.price}</p>
            <button class="add-btn" onclick="addToCart('${p.id}')">Add to Cart</button>
        </div>
    `).join('');
}

// 3. CLOUD ADMIN FUNCTIONS
async function addNewProduct() {
    const name = document.getElementById('admin-name').value;
    const price = document.getElementById('admin-price').value;
    const img = document.getElementById('admin-img').value;

    if(!name || !price) return alert("Fill in details!");

    await productsCol.add({
        name: name,
        price: Number(price),
        image: img || "https://via.placeholder.com/300",
        createdAt: Date.now()
    });
    document.getElementById('product-form').reset();
}

async function deleteProduct(id) {
    if(confirm("Remove this item from the cloud?")) {
        await productsCol.doc(id).delete();
    }
}

// 4. ADMIN UI
function renderAdminList(items) {
    const div = document.getElementById('admin-list');
    div.innerHTML = items.map(p => `
        <div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #444;">
            <span>${p.name} ($${p.price})</span>
            <button onclick="deleteProduct('${p.id}')" style="background:none; color:red;">Delete</button>
        </div>
    `).join('');
}

function openAdmin() {
    console.log("Admin panel opening..."); // This helps you see if the button is working in the console
    const modal = document.getElementById('admin-modal');
    if (modal) {
        modal.style.display = 'block';
        renderAdminList(); // Refresh the list when opening
    } else {
        console.error("Admin modal element not found!");
    }
}
function closeAdmin() { document.getElementById('admin-modal').style.display = 'none'; }

// 5. SEARCH LOGIC
function filterProducts() {
    const val = document.getElementById('search-bar').value.toLowerCase();
    const filtered = allProducts.filter(p => p.name.toLowerCase().includes(val));
    renderProducts(filtered);
}

// THEME & CART (Logic from previous steps remains the same)
init();

