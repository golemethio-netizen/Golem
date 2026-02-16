document.addEventListener('DOMContentLoaded', () => {
    displayCart();
});

function displayCart() {
    const cart = JSON.parse(localStorage.getItem('golem_cart')) || [];
    const container = document.getElementById('cartItems');
    const totalElement = document.getElementById('totalPrice');
    
    if (cart.length === 0) {
        container.innerHTML = "<p>Your cart is empty.</p>";
        totalElement.innerText = "0";
        return;
    }

    let total = 0;
    container.innerHTML = cart.map((item, index) => {
        total += parseFloat(item.price);
        return `
            <div class="checkout-item">
                <img src="${item.image}" width="50">
                <div class="item-info">
                    <h4>${item.name}</h4>
                    <p>$${item.price}</p>
                </div>
                <button onclick="removeItem(${index})">Remove</button>
            </div>
        `;
    }).join('');

    totalElement.innerText = total.toFixed(2);
}

function removeItem(index) {
    let cart = JSON.parse(localStorage.getItem('golem_cart')) || [];
    cart.splice(index, 1); // Remove 1 item at that position
    localStorage.setItem('golem_cart', JSON.stringify(cart));
    displayCart();
}

function clearCart() {
    localStorage.removeItem('golem_cart');
    displayCart();
}

function processOrder() {
    alert("Thank you for your order! Your items are being processed.");
    clearCart();
    window.location.href = 'index.html';
}
