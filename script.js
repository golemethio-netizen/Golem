/* ==========================================
   1. INITIALIZATION & CORE LISTENERS
   ========================================== */
document.addEventListener('DOMContentLoaded', async () => {
    // Initial data fetch
    fetchProducts();
    updateUIForUser();

    // Search Listener
    const searchInput = document.getElementById('headerSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterSearch(e.target.value.toLowerCase());
        });
    }

    // Auth Form Listener (Login & Sign Up)
    const authForm = document.getElementById('authForm');
    if (authForm) {
        authForm.addEventListener('submit', handleAuthSubmit);
    }
});

/* ==========================================
   2. PRODUCT FETCHING & FILTERING
   ========================================== */
async function fetchProducts(category = 'All') {
    let query = _supabase
        .from('products')
        .select('*')
        .eq('status', 'approved')
        // 1. Sort by Featured first (true comes before false)
        .order('is_featured', { ascending: false }) 
        // 2. Then sort by Newest
        .order('created_at', { ascending: false });

    if (category !== 'All') {
        query = query.eq('category', category);
    }

    const { data: products, error } = await query;
    renderProducts(products);
}

function renderProducts(products) {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    const favs = JSON.parse(localStorage.getItem('golem_favs') || '[]');

    if (products.length === 0) {
        grid.innerHTML = '<p style="text-align:center; width:100%; padding:50px;">No items available yet.</p>';
        return;
    }

    grid.innerHTML = products.map(p => {
        const isFav = favs.includes(p.id);
        return `
            <div class="product-card" data-id="${p.id}">
                <div class="img-wrapper" style="position: relative;">
                    <button class="fav-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite(event, '${p.id}')">
                        <i class="${isFav ? 'fas' : 'far'} fa-heart"></i>
                    </button>
                    <img src="${p.image}" alt="${p.name}" loading="lazy">
                </div>
                <div class="product-info">
                    <h3>${p.name}</h3>
                    <p class="price">${p.price} ETB</p>
                    <div class="action-buttons">
                        <button class="main-btn" onclick="handleViewAndBuy('${p.id}')">🛒 Buy Now</button>
                        <div style="display: flex; gap: 5px; width: 100%;">
                            <a href="tel:${p.seller_phone}" class="tg-btn" style="flex: 2; text-decoration:none; text-align:center;">
                                <i class="fas fa-phone"></i> Call Seller
                            </a>
                            <button class="share-btn" onclick="shareItem('${p.name}', '${p.price}', '${p.id}')" style="flex: 1;">
                                <i class="fas fa-share-alt"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/* ==========================================
   3. AUTHENTICATION LOGIC (Login/Sign-up)
   ========================================= */
let isSignUp = false;

window.toggleModal = function() {
    const m = document.getElementById('authModal');
    m.style.display = (m.style.display === 'flex') ? 'none' : 'flex';
};

window.toggleAuthMode = function() {
    isSignUp = !isSignUp;
    const title = document.getElementById('modalTitle');
    const submitBtn = document.querySelector('.auth-submit');
    const footer = document.querySelector('.modal-footer p');

    if (isSignUp) {
        title.innerText = "Create Account";
        submitBtn.innerText = "Create Account";
        footer.innerHTML = `Already have an account? <a href="#" onclick="toggleAuthMode()">Sign In</a>`;
    } else {
        title.innerText = "Welcome Back";
        submitBtn.innerText = "Sign In";
        footer.innerHTML = `Don't have an account? <a href="#" onclick="toggleAuthMode()">Sign Up</a>`;
    }
};

async function handleAuthSubmit(e) {
    e.preventDefault();
    const email = e.target.querySelector('input[type="email"]').value;
    const password = e.target.querySelector('input[type="password"]').value;
    const btn = e.target.querySelector('.auth-submit');

    btn.innerText = "Processing...";
    btn.disabled = true;

    const { data, error } = isSignUp 
        ? await _supabase.auth.signUp({ email, password })
        : await _supabase.auth.signInWithPassword({ email, password });

    if (error) {
        alert(error.message);
        btn.innerText = isSignUp ? "Create Account" : "Sign In";
        btn.disabled = false;
    } else {
        if (isSignUp) alert("Check your email for confirmation!");
        window.location.reload();
    }
}

window.handleForgotPassword = async function(e) {
    e.preventDefault();
    const email = document.querySelector('#authForm input[type="email"]').value;
    if (!email) return alert("Enter your email first.");

    const { error } = await _supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password.html'
    });
    alert(error ? error.message : "Reset link sent to your email!");
};

/* ==========================================
   4. FAVORITES & UI HELPERS
   ========================================== */
window.toggleFavorite = function(e, id) {
    e.stopPropagation();
    let favs = JSON.parse(localStorage.getItem('golem_favs') || '[]');
    const btn = e.currentTarget;
    const icon = btn.querySelector('i');

    if (favs.includes(id)) {
        favs = favs.filter(item => item !== id);
        btn.classList.remove('active');
        icon.classList.replace('fas', 'far');
    } else {
        favs.push(id);
        btn.classList.add('active');
        icon.classList.replace('far', 'fas');
    }
    localStorage.setItem('golem_favs', JSON.stringify(favs));
};

window.filterFavorites = function(btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const favs = JSON.parse(localStorage.getItem('golem_favs') || '[]');
    document.querySelectorAll('.product-card').forEach(card => {
        const id = card.getAttribute('data-id');
        card.style.display = favs.includes(id) ? 'inline-block' : 'none';
    });
};

window.filterCategory = function(cat, btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    fetchProducts(cat);
};

window.checkAuthToSell = async function() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (user) window.location.href = 'sell.html';
    else {
        alert("Please Sign In to sell an item.");
        toggleModal();
    }
};

async function updateUIForUser() {
    const { data: { user } } = await _supabase.auth.getUser();
    const authBtn = document.querySelector('.signin-btn');
    if (user && authBtn) {
        authBtn.innerText = "Sign Out";
        authBtn.onclick = async () => {
            await _supabase.auth.signOut();
            window.location.reload();
        };
    }
}

function filterSearch(term) {
    document.querySelectorAll('.product-card').forEach(card => {
        const title = card.querySelector('h3').innerText.toLowerCase();
        card.style.display = title.includes(term) ? 'inline-block' : 'none';
    });
}

function handleViewAndBuy(id) {
    window.location.href = `checkout.html?id=${id}`;
}

function shareItem(name, price, id) {
    const url = `${window.location.origin}/checkout.html?id=${id}`;
    if (navigator.share) {
        navigator.share({ title: name, text: `Check this out for ${price} ETB`, url });
    } else {
        navigator.clipboard.writeText(url);
        alert("Link copied to clipboard!");
    }
}


window.openSupportModal = function() {
    document.getElementById('supportModal').style.display = 'flex';
};

window.closeSupportModal = function() {
    document.getElementById('supportModal').style.display = 'none';
};

document.getElementById('supportForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('supportMsg').value;
    const { data: { user } } = await _supabase.auth.getUser();

    // Option: Save to a 'support_tickets' table in Supabase
    const { error } = await _supabase.from('support_tickets').insert([
        { 
            user_id: user ? user.id : null, 
            email: user ? user.email : 'Guest', 
            message: msg 
        }
    ]);

    if (!error) {
        alert("Message sent! Admin will contact you soon.");
        closeSupportModal();
        document.getElementById('supportForm').reset();
    }
});

