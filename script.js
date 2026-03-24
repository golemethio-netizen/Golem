// --- 1. INITIALIZATION & GLOBAL STATE ---
let currentProduct = null;

document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 Golem System Initializing...");
    
    // Auth & UI Setup
    await window.updateUIForUser();
    window.updateCartBadge();
    
    // Initial Data Fetch
    window.fetchProducts();
    window.loadSponsor();

    // Search Logic
    const searchInput = document.getElementById('headerSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => filterSearch(e.target.value.toLowerCase()));
    }
});

// --- 2. DATA FETCHING ---
window.fetchProducts = async (category = 'All') => {
    const grid = document.getElementById('productGrid');
    if (grid) grid.innerHTML = '<div class="loading-spinner"><i class="fas fa-circle-notch fa-spin"></i> Loading...</div>';

    // 1. Get the current sort preference from the dropdown
    const sortOrder = document.getElementById('sortSelect')?.value || 'newest';

    // 2. Start the base query
    let query = _supabase
        .from('products')
        .select('*')
        .eq('status', 'approved');

    // 3. Apply Category Filter
    if (category !== 'All') {
        query = query.eq('category', category);
    }

    // 4. THE MASTER SORTING LOGIC
    // Always keep Sponsored and Featured at the top first
    query = query
        .order('is_sponsored', { ascending: false })
        .order('is_featured', { ascending: false });

    // 5. Apply the User's specific sort as the "Tie-Breaker"
    if (sortOrder === 'price_low') {
        query = query.order('price', { ascending: true });
    } else if (sortOrder === 'price_high') {
        query = query.order('price', { ascending: false });
    } else {
        // Default: Newest first within their tiers
        query = query.order('created_at', { ascending: false });
    }

    // 6. Execute the single optimized query
    const { data, error } = await query;

    if (!error) {
        renderProducts(data);
    } else {
        console.error("Fetch error:", error.message);
    }
};

window.toggleWishlist = (id, btn) => {
    let saved = JSON.parse(localStorage.getItem('golem_saved') || '[]');
    const icon = btn.querySelector('i');

    if (saved.includes(id)) {
        // Remove from list
        saved = saved.filter(itemId => itemId !== id);
        btn.classList.remove('active');
        icon.classList.replace('fas', 'far');
    } else {
        // Add to list
        saved.push(id);
        btn.classList.add('active');
        icon.classList.replace('far', 'fas');
    }

    localStorage.setItem('golem_saved', JSON.stringify(saved));
    window.updateCartBadge(); // Refresh the badge in the header
};


// --- 3. RENDERING ENGINE ---
function renderProducts(products) {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    if (products.length === 0) {
        grid.innerHTML = `<div style="text-align:center; grid-column:1/-1; padding:60px; color:#888;">No items found.</div>`;
        return;
    }

    // Get current saved items from localStorage to highlight the heart icons
    const savedItems = JSON.parse(localStorage.getItem('golem_saved') || '[]');
    const now = new Date();

    grid.innerHTML = products.map(p => {
        const safeData = encodeURIComponent(JSON.stringify(p));
        const isSold = p.status === 'sold';
        const isSaved = savedItems.includes(p.id);
        
        // Tier Status
        const isSponsored = p.is_sponsored && p.sponsored_until && new Date(p.sponsored_until) > now;
        const isFeatured = p.is_featured;

        // Unified Status Badge
        let statusBadge = '';
        if (isSponsored) {
            statusBadge = `<div class="badge sponsor-badge"><i class="fas fa-ad"></i> Sponsored</div>`;
        } else if (isFeatured) {
            statusBadge = `<div class="badge feature-badge"><i class="fas fa-star"></i> Featured</div>`;
        }

        // Phone Formatting
        const rawPhone = (p.seller_phone || "").replace(/\D/g, '');
        const cleanPhone = rawPhone.startsWith('0') ? '251' + rawPhone.substring(1) : rawPhone;
        const tgUser = (p.telegram_username || "").replace('@', '');

        return `
            <div class="product-card ${isSold ? 'is-sold' : ''} ${isSponsored ? 'is-sponsored' : ''} ${isFeatured && !isSponsored ? 'is-featured' : ''}">
                <div class="card-img-container">
                    ${isSold ? '<div class="sold-watermark">SOLD</div>' : ''}
                    ${statusBadge}
                    
                    <button class="wishlist-btn ${isSaved ? 'active' : ''}" 
                            onclick="window.toggleWishlist('${p.id}', this)" 
                            title="Save for Later">
                        <i class="${isSaved ? 'fas' : 'far'} fa-heart"></i>
                    </button>

// Inside your renderProducts function map:
`<button class="wishlist-btn ${isSaved ? 'active' : ''}" 
         onclick="window.toggleWishlist('${p.id}', this)">
    <i class="${isSaved ? 'fas' : 'far'} fa-heart"></i>
</button>`


                    <img src="${p.image}" alt="${p.name}" loading="lazy">
                    <div class="image-overlay">
                        <button class="view-btn" onclick="window.openProductDetailsSafe('${safeData}')">Quick View</button>
                    </div>
                </div>
                <div class="product-info">
                    <span class="category-badge">${p.category || 'General'}</span>
                    <h3 class="product-title">${p.name}</h3>
                    <div class="product-price">${p.price?.toLocaleString()} ETB</div>
                    
                    <div class="quick-contact-bar">
                        <a href="tel:+${cleanPhone}" class="contact-icon call"><i class="fas fa-phone-alt"></i></a>
                        <a href="https://t.me/${tgUser || '+'+cleanPhone}" target="_blank" class="contact-icon telegram"><i class="fab fa-telegram-plane"></i></a>
                        <a href="https://wa.me/${cleanPhone}?text=I'm interested in ${p.name}" target="_blank" class="contact-icon whatsapp"><i class="fab fa-whatsapp"></i></a>
                    </div>

                    <div class="product-actions">
                        <button class="buy-btn" onclick="window.openProductDetailsSafe('${safeData}')" style="width: 100%;">
                            <i class="fas fa-info-circle"></i> Full Details
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}
// --- 4. SPONSORSHIP SYSTEM ---
window.loadSponsor = async () => {
    try {
        const now = new Date().toISOString();
        const { data: product } = await _supabase
            .from('products')
            .select('*')
            .eq('is_sponsored', true)
            .gt('sponsored_until', now)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        const sponsorSection = document.getElementById('mainSponsor');
        if (product && sponsorSection) {
            document.getElementById('sponsorImg').src = product.image;
            document.getElementById('sponsorTitle').innerText = product.name;
            document.getElementById('sponsorDesc').innerText = product.description?.substring(0, 100) + "...";
            document.getElementById('sponsorLink').href = `checkout.html?id=${product.id}`;
            sponsorSection.style.display = 'block';
        }
    } catch (err) { console.error("Sponsor load error", err); }
};

window.filterSponsored = async () => {
    const now = new Date().toISOString();
    const { data } = await _supabase
        .from('products')
        .select('*')
        .eq('is_sponsored', true)
        .gt('sponsored_until', now);
    
    if (data) renderProducts(data);
};

window.filterCategory = (category, button) => {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    window.fetchProducts(category);
};

// --- 5. MODAL LOGIC ---
window.openProductDetailsSafe = (encodedData) => {
    try {
        const product = JSON.parse(decodeURIComponent(encodedData));
        window.openProductModal(product);
    } catch (e) { console.error("Error parsing product", e); }
};

window.openProductModal = (product) => {
    currentProduct = product;
    const modal = document.getElementById('productModal');
    if (!modal) return;

    document.getElementById('modalProductImg').src = product.image;
    document.getElementById('modalProductTitle').innerText = product.name;
    document.getElementById('modalProductPrice').innerText = product.price.toLocaleString() + " ETB";
    document.getElementById('modalProductDesc').innerText = product.description || "No description.";

    const cleanPhone = (product.seller_phone || "").replace(/\D/g, '');
    let intPhone = cleanPhone.startsWith('0') ? '251' + cleanPhone.substring(1) : cleanPhone;

    document.getElementById('callContact').href = `tel:+${intPhone}`;
    const tgUser = (product.telegram_username || "").replace('@', '');
    document.getElementById('telegramOrder').href = tgUser ? `https://t.me/${tgUser}` : `https://t.me/+${intPhone}`;
    document.getElementById('whatsappOrder').href = `https://wa.me/${intPhone}?text=I'm interested in ${product.name}`;

    modal.style.display = 'flex';
    document.body.style.overflow = "hidden";
};

window.closeProductModal = () => {
    document.getElementById('productModal').style.display = 'none';
    document.body.style.overflow = "auto";
};

// --- 6. AUTH & ACCOUNT ---
window.toggleModal = () => {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.style.display = (modal.style.display === 'flex') ? 'none' : 'flex';
        document.body.style.overflow = (modal.style.display === 'flex') ? 'hidden' : 'auto';
    }
};

window.updateUIForUser = async () => {
    const { data: { user } } = await _supabase.auth.getUser();
    const adminLink = document.getElementById('adminNavLink');
    if (user && adminLink && user.email === 'yohannes.surafel@gmail.com') {
        adminLink.style.display = 'flex';
        document.body.classList.add('is-admin');
    }
};

window.handleAuth = async (e) => {
    e.preventDefault();
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const { error } = await _supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else window.location.reload();
};

window.checkAuthToSell = async () => {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) {
        alert("Please Sign In first!");
        window.toggleModal();
    } else {
        window.location.href = 'sell.html';
    }
};

// --- 7. CART / SAVED ITEMS ---
window.updateCartBadge = () => {
    const saved = JSON.parse(localStorage.getItem('golem_saved') || '[]');
    const badge = document.getElementById('cartBadge');
    if (badge) {
        badge.innerText = saved.length;
        badge.style.display = saved.length > 0 ? 'flex' : 'none';
    }
};

// Call this every time the page loads
document.addEventListener('DOMContentLoaded', window.updateCartBadge);

window.addToCartFromModal = () => {
    if (!currentProduct) return;
    let saved = JSON.parse(localStorage.getItem('golem_saved') || '[]');
    if (!saved.includes(currentProduct.id)) {
        saved.push(currentProduct.id);
        localStorage.setItem('golem_saved', JSON.stringify(saved));
        window.updateCartBadge();
        alert("❤️ Saved!");
    }
};

function updateCartBadge() {
    const saved = JSON.parse(localStorage.getItem('golem_saved')) || [];
    const badge = document.getElementById('cartBadge');
    if (badge) {
        badge.innerText = saved.length;
        badge.style.display = saved.length > 0 ? 'block' : 'none';
    }
}




// --- 8. HELPERS ---
function filterSearch(term) {
    const cards = document.querySelectorAll('.product-card');
    cards.forEach(card => {
        const title = card.querySelector('.product-title').innerText.toLowerCase();
        card.style.display = title.includes(term) ? 'block' : 'none';
    });
}

window.shareToTelegram = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://t.me/share/url?url=${url}&text=Check out Golem Furniture!`, '_blank');
};

window.shareToWhatsApp = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://wa.me/?text=Check out Golem! ${url}`, '_blank');
};

window.toggleSupportModal = () => {
    const modal = document.getElementById('supportModal');
    if (modal) modal.style.display = (modal.style.display === 'flex') ? 'none' : 'flex';
};



window.handleSupportSubmit = async function(e) {
    e.preventDefault();
    const email = document.getElementById('supportEmail').value;
    const subject = document.getElementById('supportSubject').value;
    const msg = document.getElementById('supportMessage').value;

    const { error } = await _supabase.from('support_tickets').insert([{ user_email: email, subject: subject, message: msg }]);

    if (error) alert("Error: " + error.message);
    else {
        alert("Message sent! We'll get back to you soon.");
        e.target.reset();
        window.toggleSupportModal();
    }
};


window.updateCartBadge = function() {
    const saved = JSON.parse(localStorage.getItem('golem_saved') || '[]');
    const badge = document.getElementById('cartBadge');
    if (badge) {
        badge.innerText = saved.length;
        badge.style.display = saved.length > 0 ? 'flex' : 'none';
    }
};

// --- 4. HELPERS ---
function getConditionClass(condition) {
    if (!condition) return 'cond-default';
    const c = condition.toLowerCase();
    if (c.includes('new') && !c.includes('used')) return 'cond-new';
    if (c.includes('like new')) return 'cond-used-like-new';
    if (c.includes('fair') || c.includes('used')) return 'cond-used-fair';
    if (c.includes('refurbished')) return 'cond-refurbished';
    return 'cond-default';
}


// --- 5. AUTH & ACCOUNT LOGIC ---
window.updateUIForUser = async function() {
    const { data: { user } } = await _supabase.auth.getUser();
    const signinBtn = document.querySelector('.signin-btn');
    const adminLink = document.getElementById('adminNavLink');

    if (user) {
        if (signinBtn) {
            signinBtn.innerHTML = `<i class="fas fa-sign-out-alt"></i> <p>Sign Out</p>`;
            signinBtn.onclick = async () => { 
                await _supabase.auth.signOut(); 
                window.location.reload(); 
            };
        }
        if (adminLink && user.email === 'yohannes.surafel@gmail.com') {
            adminLink.style.display = 'flex';
        }
    } else {
        if (adminLink) adminLink.style.display = 'none';
    }
};



let isSignUpMode = false;
window.toggleAuthMode = function() {
    isSignUpMode = !isSignUpMode;
    const title = document.getElementById('modalTitle');
    const submitBtn = document.getElementById('authSubmitBtn');
    const regFields = document.getElementById('registerFields');
    const toggleLink = document.getElementById('toggleText');

    if (isSignUpMode) {
        title.innerText = "Create Account";
        submitBtn.innerText = "Sign Up";
        regFields.style.display = "block";
        toggleLink.innerHTML = 'Already have an account? <a href="#" onclick="window.toggleAuthMode()">Sign In</a>';
    } else {
        title.innerText = "Welcome Back";
        submitBtn.innerText = "Sign In";
        regFields.style.display = "none";
        toggleLink.innerHTML = 'Don\'t have an account? <a href="#" onclick="window.toggleAuthMode()">Sign Up</a>';
    }
};



window.handleAuth = async function(e) {
    e.preventDefault();
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const btn = document.getElementById('authSubmitBtn');

    btn.disabled = true;
    btn.innerText = "Processing...";

    if (isSignUpMode) {
        const fullName = document.getElementById('regName').value;
        const phone = document.getElementById('regPhone').value;
        const { error } = await _supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName, phone_number: phone } }
        });
        if (error) alert("Error: " + error.message);
        else { alert("Check your email for confirmation!"); window.toggleModal(); }
    } else {
        const { error } = await _supabase.auth.signInWithPassword({ email, password });
        if (error) alert("Login failed: " + error.message);
        else window.location.reload(); 
    }
    btn.disabled = false;
};

window.checkAuthToSell = () => {
    const user = supabase.auth.user();
    if (!user) {
        alert("Please Sign In to sell items!");
        window.toggleModal(); // Opens the login modal
    } else {
        window.location.href = 'sell.html'; // Or wherever your sell page is
    }
};

// Function to toggle Full Image Mode on Computer
function toggleFullScreenImage() {
    const imgWrapper = document.querySelector('.modal-img-wrapper');
    if (imgWrapper) {
        imgWrapper.style.height = imgWrapper.style.height === '80vh' ? '300px' : '80vh';
        imgWrapper.style.cursor = imgWrapper.style.height === '80vh' ? 'zoom-out' : 'zoom-in';
    }
}

// --- Updated Saved Item Card Template ---
function createSavedItemCard(item) {
    return `
    <div class="product-card" data-id="${item.id}">
        <button class="remove-btn" onclick="removeItem(${item.id})" title="Remove from saved">
            <i class="fas fa-times"></i>
        </button>
        
        <div class="card-img-container" onclick="openProductModal(${item.id})">
            <img src="${item.image}" alt="${item.name}">
        </div>
        
        <div class="product-info">
            <h3 class="product-title">${item.name}</h3>
            <p class="product-price">${item.price} ETB</p>
        </div>
    </div>
    `;
}

function openProductModal(productId) {
    const item = products.find(p => p.id === productId);
    if (!item) return;

    // Set the image
    const modalImg = document.getElementById('modalProductImg');
    modalImg.src = item.image;
    
    // Reset zoom and view
    modalImg.style.transform = 'scale(1)';
    document.querySelector('.modal-body').scrollTop = 0;

    // Show modal
    document.getElementById('productModal').style.display = 'flex';
}


document.getElementById('downloadImgBtn').addEventListener('click', function() {
    const imgSrc = document.getElementById('modalProductImg').src;
    const productName = document.getElementById('modalTitle').innerText;
    
    // Create a temporary link to trigger the download
    const link = document.createElement('a');
    link.href = imgSrc;
    link.download = `${productName}-Golem-Furniture.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});


// Function to update the Total Price and Item Count
function updateSavedSummary() {
    const savedItems = JSON.parse(localStorage.getItem('savedItems')) || [];
    let total = 0;
    
    savedItems.forEach(item => {
        // Convert price string "25,000" to number 25000
        const priceNum = parseInt(item.price.replace(/,/g, ''));
        total += priceNum;
    });

    document.getElementById('totalItems').innerText = savedItems.length;
    document.getElementById('totalPrice').innerText = total.toLocaleString();

    // Hide summary if list is empty
    const summaryBox = document.getElementById('savedSummary');
    summaryBox.style.display = savedItems.length > 0 ? 'block' : 'none';
}

// Function to Send the Order
function sendOrder(platform) {
    const savedItems = JSON.parse(localStorage.getItem('savedItems')) || [];
    const total = document.getElementById('totalPrice').innerText;
    
    // Format the product list text
    let itemDetails = savedItems.map((item, index) => `${index + 1}. ${item.name} (${item.price} ETB)`).join('%0A');
    
    const message = `Hello Golem Furniture! I want to order these items:%0A%0A${itemDetails}%0A%0A*Total Price: ${total} ETB*`;
    
    if (platform === 'telegram') {
        // Replace 'YourTelegramUsername' with your actual username
        window.open(`https://t.me/YourTelegramUsername?text=${message}`, '_blank');
    } else {
        // Replace '251912345678' with your actual phone number
        window.open(`https://wa.me/251912345678?text=${message}`, '_blank');
    }
}

window.shareWhitelist = () => {
    const items = Array.from(document.querySelectorAll('.product-title')).map(el => el.innerText);
    const total = document.getElementById('totalPrice').innerText;
    
    if (items.length === 0) return alert("Your wishlist is empty!");

    // Create the text message
    let shareText = `🛒 Check out my furniture wishlist from Golem!%0A%0A`;
    items.forEach((name, i) => shareText += `${i + 1}. ${name}%0A`);
    shareText += `%0A💰 Total Value: ${total} ETB%0A`;
    shareText += `%0AView these on Golem: ${window.location.origin}`;

    // 1. Try Native Sharing (Works best on Mobile/Telegram/WhatsApp)
    if (navigator.share) {
        navigator.share({
            title: 'My Golem Wishlist',
            text: decodeURIComponent(shareText),
            url: window.location.origin
        }).catch(err => console.log('Error sharing', err));
    } else {
        // 2. Fallback: Copy to Clipboard
        const textArea = document.createElement("textarea");
        textArea.value = decodeURIComponent(shareText);
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert("Wishlist copied to clipboard! You can now paste it into Telegram.");
    }
};
