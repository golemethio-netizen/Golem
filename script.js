let allApprovedProducts = [];
let cart = [];
let isSignUp = false;

// 1. DATA FETCHING
async function fetchProducts() {
    const grid = document.getElementById('productGrid');
    const { data, error } = await _supabase.from('products').select('*');

    if (error) return console.error(error);

    // Only show Approved or Sold items in the main shop
    allApprovedProducts = data.filter(p => p.status === 'approved' || p.status === 'sold');
    renderProducts(allApprovedProducts);
}

// 2. RENDERING
function renderProducts(list) {
    const grid = document.getElementById('productGrid');
    if (!grid) return;
    grid.innerHTML = list.map(p => {
        const isSold = p.status === 'sold';
        const pageUrl = window.location.href;
        const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent('Check this out: ' + p.name)}`;

        return `
        <div class="product-card">
            ${isSold ? '<div class="sold-badge">SOLD</div>' : ''}
            <div class="share-btn" onclick="event.stopPropagation(); window.open('${telegramShareUrl}', '_blank')">✈️</div>
            <img src="${p.image}" alt="${p.name}" onclick="openProductDetail('${p.id}')" style="${isSold ? 'filter: grayscale(100%); opacity: 0.6;' : ''}">
            <div class="product-info">
                <h3>${p.name}</h3>
                <p class="price">$${p.price}</p>
                ${isSold ? '<button disabled style="background:#888;">Sold Out</button>' : `<button onclick="event.stopPropagation(); addToCart('${p.id}')">Add to Cart</button>`}
            </div>
        </div>`;
    }).join('');
}

// 3. AUTH & USER MENU
async function checkAuthToSell() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (user) window.location.href = "submit.html";
    else document.getElementById('authModal').style.display = 'flex';
}

async function handleAuth() {
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    try {
        if (isSignUp) {
            await _supabase.auth.signUp({ email, password });
            alert("Check your email!");
        } else {
            const { error } = await _supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            location.reload();
        }
    } catch (e) { alert(e.message); }
}

async function updateUserMenu() {
    const menu = document.getElementById('userMenu');
    const { data: { user } } = await _supabase.auth.getUser();
    if (user && menu) {
        menu.innerHTML = `
            <a href="my-items.html" style="margin-right:15px; text-decoration:none; color:#007bff;">My Items</a>
            <button class="auth-link" onclick="_supabase.auth.signOut().then(()=>location.reload())">Logout</button>
        `;
    }
}

// 4. SEARCH
function searchProducts() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    const filtered = allApprovedProducts.filter(p => p.name.toLowerCase().includes(term));
    renderProducts(filtered);
}

// 5. MODAL CONTROL
function openAuthModal() { document.getElementById('authModal').style.display = 'flex'; }
function closeAuth() { document.getElementById('authModal').style.display = 'none'; }
function toggleAuthMode() {
    isSignUp = !isSignUp;
    document.getElementById('authTitle').innerText = isSignUp ? "Create Account" : "Login";
    document.getElementById('authBtn').innerText = isSignUp ? "Register" : "Sign In";
}
function filterByCategory(category) {
    // Remove 'active' class from all buttons
  const buttons = document.querySelectorAll('.category-filters button');
    buttons.forEach(btn => btn.classList.remove('active'));
    if (event) event.target.classList.add('active');
    });
    
    // Add 'active' class to the button that was just clicked
    event.target.classList.add('active');

    if (category === 'All') {
        renderProducts(allApprovedProducts);
    } else {
        const filtered = allApprovedProducts.filter(p => p.category === category);
        renderProducts(filtered);
    }
}


