document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user || user.email !== 'your-admin@email.com') { // CHANGE THIS
        window.location.href = 'index.html';
        return;
    }
    loadPending();
});

async function loadPending() {
    const { data } = await _supabase.from('products').select('*').eq('status', 'pending');
    const grid = document.getElementById('adminGrid');
    grid.innerHTML = data.map(p => `
        <div class="product-card">
            <img src="${p.image}">
            <h3>${p.name}</h3>
            <button onclick="updateStatus('${p.id}', 'approved')">Approve</button>
            <button onclick="deleteItem('${p.id}')">Delete</button>
        </div>
    `).join('');
}

async function updateStatus(id, status) {
    await _supabase.from('products').update({ status }).eq('id', id);
    location.reload();
}
