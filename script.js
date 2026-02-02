// Mock data - In a real app, this could be a JSON file or API
const products = [
    {
        id: 1,
        name: "Golem Alpha",
        price: "$29.99",
        // NOTE: Use relative paths starting from the location of index.html
        image: "assets/images/product1.jpg" 
    },
    {
        id: 2,
        name: "Golem Beta",
        price: "$39.99",
        image: "assets/images/product2.jpg"
    }
];

const productContainer = document.getElementById('product-list');

function displayProducts() {
    productContainer.innerHTML = products.map(product => `
        <div class="product-card">
            <img src="${product.image}" alt="${product.name}">
            <h3>${product.name}</h3>
            <p>${product.price}</p>
            <button onclick="addToCart()">Add to Cart</button>
        </div>
    `).join('');
}

function addToCart() {
    alert("Item added to cart!");
}

displayProducts();
