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
// Inside your uploadForm.onsubmit in submit.js
const productData = {
    name: document.getElementById('pName').value,
    price: parseFloat(document.getElementById('pPrice').value),
    image: document.getElementById('pImg').value,
    category: document.getElementById('pCat').value,
    phone_number: document.getElementById('pPhone').value, // This is the only one we need
    user_id: user.id,
    status: 'pending'
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
