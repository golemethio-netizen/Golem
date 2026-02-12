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
        
        // 3. Optional: Notify Admin via Telegram
        notifyAdminOfNewSubmission(productData.name);
    }
});
