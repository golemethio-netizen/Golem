const ADMIN_PASSWORD = "Johnny2018";
const exchangeRate = 150;
const telegramUsername = "https://t.me/JohnYoEt";

let cart = [];
let currentCategory = 'all';
let searchQuery = "";

const products = [
    { id: 1, usdPrice: 400, i18nKey: "p1", category: "phones", img: "phone.jpg", featured: true },
    { id: 2, usdPrice: 900, i18nKey: "p2", category: "laptops", img: "laptop.jpg", featured: false },
    { id: 3, usdPrice: 200, i18nKey: "p3", category: "phones", img: "iphone3.jpg", featured: false }
];

const translations = {
    en: { title: "Modern Electronics", cart: "Cart", addToCart: "Add to Cart", searchPlaceholder: "Search...", catAll: "All", catPhones: "Phones", catLaptops: "Laptops", orderTitle: "Place Order", namePlaceholder: "Name", locPlaceholder: "Location", sendOrderTelegram: "Send via Telegram", p1: "Smartphone X", p2: "Laptop Pro", p3: "iPhone 3 GS", orderMsg: "Order from [NAME]:\n[ITEMS]\nTo: [LOC]" },
    am: { title: "ዘመናዊ ኤሌክትሮኒክስ", cart: "ጋሪ", addToCart: "ወደ ጋሪ አስገባ", searchPlaceholder: "ፈልግ...", catAll: "ሁሉም", catPhones: "ስልኮች", catLaptops: "ላፕቶፖች", orderTitle: "ትዕዛዝ ይላኩ", namePlaceholder: "ስም", locPlaceholder: "አድራሻ", sendOrderTelegram: "በቴሌግራም ይላኩ", p1: "ስማርት ስልክ X", p2: "ላፕቶፕ ፕሮ", p3: "አይፎን 3", orderMsg: "ትዕዛዝ ከ [NAME]:\n[ITEMS]\nአድራሻ: [LOC]" }
};

function changeLanguage(lang) {
    localStorage.setItem('lang', lang);
    document.body.className = lang === 'am' ? 'lang-am' : '';
    document.querySelectorAll('[data-i18n]').forEach(el => el.textContent = translations[lang][el.dataset.i18n]);
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => el.placeholder = translations[lang][el.dataset.i18nPlaceholder]);
    renderProducts();
    updateShopStatus();
}

function filterProducts(cat) { currentCategory = cat; renderProducts(); }
function handleSearch() { searchQuery = document.getElementById('product-search').value.toLowerCase(); renderProducts(); }

function renderProducts() {
    const lang = localStorage.getItem('lang') || 'en';
    const grid = document.getElementById('product-grid');
    grid.innerHTML = '<div class="skeleton"></div>'.repeat(3);
    
    setTimeout(() => {
        grid.innerHTML = '';
        let filtered = products.filter(p => (currentCategory === 'all' || p.category === currentCategory) && translations.en[p.i18nKey].toLowerCase().includes(searchQuery));
        filtered.forEach(p => {
            const price = lang === 'am' ? `${(p.usdPrice * exchangeRate).toLocaleString()} ብር` : `$${p.usdPrice}`;
            grid.innerHTML += `
                <div class="product-card">
                    <img src="images/${p.img}" onerror="this.src='https://via.placeholder.com/150'" style="width:100%; height:150px; object-fit:cover;">
                    <h3>${translations[lang][p.i18nKey]}</h3>
                    <p>${price}</p>
                    <button onclick="addToCart(${p.id})" class="filter-btn active" style="width:100%">${translations[lang].addToCart}</button>
                </div>`;
        });
    }, 300);
}


translations.en.paymentTitle = "Accepted Payments";
translations.am.paymentTitle = "የክፍያ አማራጮች";







function updateShopStatus() {
    const etTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Africa/Addis_Ababa"}));
    const isOpen = (etTime.getDay() !== 0) && (etTime.getHours() >= 9 && etTime.getHours() < 19);
    const lang = localStorage.getItem('lang') || 'en';
    document.getElementById('shop-status-dot').className = isOpen ? 'status-open' : 'status-closed';
    document.getElementById('shop-status-text').textContent = isOpen ? (lang === 'am' ? 'ክፍት ነው' : 'Open Now') : (lang === 'am' ? 'ዝግ ነው' : 'Closed');
}

function addToCart(id) {
    const p = products.find(x => x.id === id);
    cart.push(p);
    document.getElementById('cart-count').textContent = cart.length;
    updateOrderSummary();
}

function updateOrderSummary() {
    const lang = localStorage.getItem('lang') || 'en';
    let txt = "";
    document.getElementById('order-summary').innerHTML = cart.map(i => {
        txt += `- ${translations[lang][i.i18nKey]}\n`;
        return `<div>• ${translations[lang][i.i18nKey]}</div>`;
    }).join('');
    document.getElementById('hidden-items-input').value = txt;
}

function handleFormSubmit(e) {
    const name = document.getElementById('customer-name').value;
    const loc = document.getElementById('customer-location').value;
    const items = document.getElementById('hidden-items-input').value;
    const lang = localStorage.getItem('lang') || 'en';
    const msg = translations[lang].orderMsg.replace("[NAME]", name).replace("[ITEMS]", items).replace("[LOC]", loc);
    window.open(`https://t.me/${JohnYoEt}?text=${encodeURIComponent(msg)}`, '_blank');
}

window.onload = () => changeLanguage(localStorage.getItem('lang') || 'en');

// Add translations
translations.en.offerTitle = "Special Gift!";
translations.en.offerBody = "Order within the next 30 minutes and get 10% off your first delivery!";
translations.am.offerTitle = "ልዩ ስጦታ!";
translations.am.offerBody = "በሚቀጥሉት 30 ደቂቃዎች ውስጥ ትዕዛዝዎን ይላኩ እና የ10% ቅናሽ ያግኙ!";

function initOfferPopup() {
    // Check if the user has already seen the offer in this session
    if (!sessionStorage.getItem('offerShown')) {
        setTimeout(() => {
            document.getElementById('offer-modal').style.display = 'flex';
            sessionStorage.setItem('offerShown', 'true');
        }, 10000); // 10 seconds
    }
}

// Update your window.onload to include the popup trigger
window.onload = () => {
    const savedLang = localStorage.getItem('lang') || 'en';
    changeLanguage(savedLang);
    updateShopStatus();
    initOfferPopup(); // Start the 10-second timer
};

// 1. Initialize products from localStorage or use default list
let customProducts = JSON.parse(localStorage.getItem('myStoreProducts')) || [];
const allProducts = [...products, ...customProducts]; // Combine defaults with your new ones

function handleNewProduct(event) {
    event.preventDefault();
    
    // Generate a unique ID
    const newId = Date.now();
    const nameEn = document.getElementById('new-p-name-en').value;
    const nameAm = document.getElementById('new-p-name-am').value;
    const pKey = "custom_" + newId;

    // Save translation keys dynamically
    translations.en[pKey] = nameEn;
    translations.am[pKey] = nameAm;

    const newEntry = {
        id: newId,
        usdPrice: parseFloat(document.getElementById('new-p-price').value),
        i18nKey: pKey,
        category: document.getElementById('new-p-category').value,
        img: document.getElementById('new-p-img').value || "placeholder.jpg"
    };

    // Update localStorage
    customProducts.push(newEntry);
    localStorage.setItem('myStoreProducts', JSON.stringify(customProducts));
    
    alert("Product Added! / እቃው ተጨምሯል!");
    location.reload(); // Refresh to show the new item
}

// 2. Updated Render Function
function renderProducts() {
    const lang = localStorage.getItem('lang') || 'en';
    const grid = document.getElementById('product-grid');
    grid.innerHTML = '';

    // Merge static and local products
    const displayList = [...products, ...customProducts];
    
    let filtered = displayList.filter(p => 
        (currentCategory === 'all' || p.category === currentCategory) && 
        (translations[lang][p.i18nKey] || "").toLowerCase().includes(searchQuery)
    );

    filtered.forEach(p => {
        const price = lang === 'am' ? 
            `${(p.usdPrice * exchangeRate).toLocaleString()} ብር` : 
            `$${p.usdPrice}`;
            
        grid.innerHTML += `
            <div class="product-card">
                <img src="images/${p.img}" onerror="this.src='https://via.placeholder.com/150'">
                <h3>${translations[lang][p.i18nKey] || "Product"}</h3>
                <p>${price}</p>
                <button onclick="addToCart(${p.id})">${translations[lang].addToCart}</button>
            </div>`;
    });
}