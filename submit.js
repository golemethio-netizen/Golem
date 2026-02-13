const form = document.getElementById('productForm');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { data: { user } } = await _supabase.auth.getUser();

    if (!user) {
        alert("Please login first!");
        window.location.href = 'login.html';
        return;
    }

    const newProduct = {
        name: document.getElementById('pName').value,
        price: document.getElementById('pPrice').value,
        image: document.getElementById('pImage').value,
        category: document.getElementById('pCategory').value,
        status: 'pending',
        submitted_by: user.email
    };

    const { error } = await _supabase.from('products').insert([newProduct]);

    if (!error) {
        document.getElementById('statusMsg').innerText = "Sent! Waiting for admin approval.";
        form.reset();
        // Here you would call your Telegram notify function
    } else {
        alert(error.message);
    }
});
