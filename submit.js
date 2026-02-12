const form = document.getElementById('userSubmitForm');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('msg');

    // 1. Gather Data
    const productData = {
        name: document.getElementById('pName').value,
        price: document.getElementById('pPrice').value,
        image: document.getElementById('pImage').value,
        category: document.getElementById('pCategory').value,
        status: 'pending', // <--- Crucial: Hidden from shop
        submitted_by: document.getElementById('userName').value // Optional: track who sent it
    };

    // 2. Insert to Supabase
    const { data, error } = await _supabase
        .from('products')
        .insert([productData]);

    if (error) {
        msg.innerHTML = `<p style="color:red">Error: ${error.message}</p>`;
    } else {
        msg.innerHTML = `<p style="color:green">Success! Your product is under review.</p>`;
        form.reset();
        // ... inside the successful Supabase insert ...
if (!error) {
    msg.innerHTML = `<p style="color:green">Success! Your product is under review.</p>`;
    
    // 🔥 TRIGGER THE NOTIFICATION HERE
    notifyAdminOfSubmission(productData.name, productData.submitted_by);
    
    form.reset();
}
        // 3. Optional: Notify Admin via Telegram
        notifyAdminOfNewSubmission(productData.name);
    }
});


async function notifyAdminOfSubmission(productName, userName) {
    const token = 'YOUR_BOT_TOKEN'; // Use the token from BotFather
    const chatId = 'YOUR_CHAT_ID';   // Use your ID from userinfobot
    
    const message = `🔔 <b>New Submission!</b>\n\n` +
                    `<b>Product:</b> ${productName}\n` +
                    `<b>User:</b> ${userName}\n` +
                    `<i>Check the Admin Panel to approve it.</i>`;

    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML'
            })
        });
    } catch (err) {
        console.error("Telegram notification failed:", err);
    }
}
