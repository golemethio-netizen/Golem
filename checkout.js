document.addEventListener('DOMContentLoaded', () => {
    renderSummary();
    prefillUserData();
});

// 1. Show the user what they are buying
function renderSummary() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const container = document.getElementById('orderSummary');
    let total = 0;

    if (cart.length === 0) {
        container.innerHTML = "<p>Your cart is empty!</p>";
        document.getElementById('confirmBtn').disabled = true;
        return;
    }

    container.innerHTML = cart.map(item => {
        total += parseFloat(item.price);
        return `<div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                    <span>${item.name}</span>
                    <span>$${item.price}</span>
                </div>`;
    }).join('');

    document.getElementById('totalPriceDisplay').innerText = `Total: $${total.toFixed(2)}`;
}

// 2. Pre-fill name/email if logged in
async function prefillUserData() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (user) {
        document.getElementById('custName').value = user.email.split('@')[0]; // Simple nickname from email
    }
}

// 3. Send the order to Telegram
document.getElementById('checkoutForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const name = document.getElementById('custName').value;
    const phone = document.getElementById('custPhone').value;
    const address = document.getElementById('custAddress').value;

    // Format the items for the Telegram message
    const itemDetails = cart.map(item => `- ${item.name} ($${item.price})`).join('\n');
    const total = cart.reduce((sum, item) => sum + parseFloat(item.price), 0);

    const message = `🛍️ **NEW ORDER RECEIVED**\n\n` +
                    `👤 **Customer:** ${name}\n` +
                    `📞 **Phone:** ${phone}\n` +
                    `📍 **Address:** ${address}\n\n` +
                    `📦 **Items:**\n${itemDetails}\n\n` +
                    `💰 **Total: $${total.toFixed(2)}**`;

    // TELEGRAM CONFIG (Use your verified details here)
    const token = 'YOUR_BOT_TOKEN'; 
    const chatId = 'YOUR_CHAT_ID';
    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown'
            })
        });

        if (response.ok) {
            alert("Order Sent Successfully! We will contact you soon.");
            localStorage.removeItem('cart'); // Clear cart
            window.location.href = 'index.html'; // Go home
        } else {
            alert("Failed to send order. Please try again.");
        }
    } catch (err) {
        console.error("Error:", err);
    }
});
