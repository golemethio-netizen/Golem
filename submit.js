document.getElementById('uploadForm').onsubmit = async (e) => {
    e.preventDefault();
    const { data: { user } } = await _supabase.auth.getUser();
    const product = {
        name: document.getElementById('pName').value,
        price: document.getElementById('pPrice').value,
        image: document.getElementById('pImg').value,
        category: document.getElementById('pCat').value,
        user_id: user.id,
        status: 'pending'
    };
    await _supabase.from('products').insert([product]);
    alert("Sent for approval!");
    window.location.href = 'index.html';
};
