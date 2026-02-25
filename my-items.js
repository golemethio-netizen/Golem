document.addEventListener('DOMContentLoaded', fetchMyItems);

async function fetchMyItems() {
    const grid = document.getElementById('myItemsGrid');
    const { data: { user } } = await _supabase.auth.getUser();

    if (!user) {
        grid.innerHTML = `<p>Please <a href="login.html">Login</a> to see your items.</p>`;
        return;
    }

    const { data: products, error } = await _supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    // Inside the mapping in my-items.js
grid.innerHTML = products.map(p => `
    <div class="product-card">
        <div class="status-badge ${p.status}">${p.status.toUpperCase()}</div>
        <img src="${p.image}">
        <div class="product-info">
            <h3>${p.name}</h3>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <p class="price">${p.price} ETB</p>
                <span style="font-size:0.8rem; color:#666;">👁️ ${p.views || 0} views</span>
            </div>
            
            <div class="manage-btns">
                <button class="edit-btn" onclick="editItem('${p.id}')">✏️ Edit</button>
                <button class="delete-btn" onclick="deleteItem('${p.id}')">🗑️ Delete</button>
                <button class="share-btn" onclick="shareItem('${p.id}')">🔗 Share</button>
            </div>
        </div>
    </div>
`).join('');

// DELETE FUNCTION
async function deleteItem(id, imageUrl) {
    if (confirm("Are you sure you want to delete this item?")) {
        // 1. Delete from Database
        const { error: dbError } = await _supabase.from('products').delete().eq('id', id);
        
        // 2. Delete Image from Storage (Optional but good for space)
        if (imageUrl.includes('product-images')) {
            const path = imageUrl.split('product-images/')[1];
            await _supabase.storage.from('product-images').remove([path]);
        }

        if (!dbError) location.reload();
    }
}

// SHARE FUNCTION
function shareItem(id, name) {
    const url = `${window.location.origin}/checkout.html?id=${id}`;
    if (navigator.share) {
        navigator.share({ title: name, url: url });
    } else {
        prompt("Copy this link to share:", url);
    }
}

// EDIT FUNCTION (Simple version: redirects to a form)
function editItem(id) {
    window.location.href = `submit.html?edit=${id}`;
}
