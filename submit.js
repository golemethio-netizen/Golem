document.getElementById('uploadForm').onsubmit = async (e) => {
    e.preventDefault();

    // 1. Get current logged in user
    const { data: { user } } = await _supabase.auth.getUser();

    if (!user) {
        alert("Please login first!");
        window.location.href = 'login.html';
        return;
    }

    // 2. Prepare product data
    const productData = {
        name: document.getElementById('pName').value,
        price: parseFloat(document.getElementById('pPrice').value),
        image: document.getElementById('pImg').value,
        category: document.getElementById('pCat').value,
        whatsapp_number: document.getElementById('pWhatsApp').value,
        telegram_username: document.getElementById('pTelegram').value,
        user_id: user.id,
        status: 'pending' // Admin must approve this
    };

    // 3. Insert into Supabase
    const { error } = await _supabase
        .from('products')
        .insert([productData]);

    if (error) {
        alert("Error: " + error.message);
    } else {
        alert("Success! Your item is sent to the Admin for approval.");
        window.location.href = 'my-items.html';
    }
};
