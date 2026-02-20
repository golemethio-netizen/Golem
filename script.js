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
