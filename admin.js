
// Add this to the very top of admin.js
async function checkAdmin() {
    const { data: { user } } = await _supabase.auth.getUser();
    
    // Replace with YOUR actual email address
    const adminEmail = "yohannes.surafel@gmail.com"; 

    if (!user || user.email !== adminEmail) {
        alert("Access Denied. Admins only.");
        window.location.href = 'index.html';
    }
}
checkAdmin();






document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user || user.email !== 'yohannes.surafel@gmail.com') { // CHANGE THIS
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


// Load categories on start
document.addEventListener('DOMContentLoaded', () => {
    fetchPendingItems();
    fetchCategories();
});

async function fetchCategories() {
    const list = document.getElementById('categoryList');
    const { data: cats } = await _supabase.from('categories').select('*').order('name');
    
    list.innerHTML = cats.map(c => `
        <span class="category-tag" style="background:#ddd; padding:5px 10px; border-radius:15px; font-size:0.8rem;">
            ${c.name} <b onclick="deleteCategory('${c.id}')" style="cursor:pointer; color:red; margin-left:5px;">×</b>
        </span>
    `).join('');
}

async function addCategory() {
    const name = document.getElementById('newCatName').value;
    if (!name) return;

    const { error } = await _supabase.from('categories').insert([{ name }]);
    if (error) alert("Error: Category might already exist.");
    else {
        document.getElementById('newCatName').value = '';
        fetchCategories();
    }
}

async function deleteCategory(id) {
    if (confirm("Delete this category? Items already in this category won't be deleted.")) {
        await _supabase.from('categories').delete().eq('id', id);
        fetchCategories();
    }
}
