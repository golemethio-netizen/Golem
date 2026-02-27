// 1. CONFIG & SECURITY
const ADMIN_EMAIL = "yohannes.surafel@gmail.com"; 

async function checkAdmin() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user || user.email !== ADMIN_EMAIL) {
        alert("Access Denied.");
        window.location.href = 'index.html';
    }
}

// 2. INITIALIZE
document.addEventListener('DOMContentLoaded', () => {
    checkAdmin();
    fetchPendingItems();
    fetchCategories();
});

// 3. PRODUCTS MANAGEMENT
async function fetchPendingItems() {
    const grid = document.getElementById('adminGrid');
    if (!grid) return;

    const { data: products, error } = await _supabase
        .from('products')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    if (error) {
        grid.innerHTML = `<p>Error: ${error.message}</p>`;
        return;
    }

    if (!products || products.length === 0) {
        grid.innerHTML = "<h3>🎉 No pending items to review!</h3>";
        return;
    }

    grid.innerHTML = products.map(p => `
        <div class="product-card" style="border: 1px solid #ddd; padding: 15px; border-radius: 10px; background: #fff;">
            <img src="${p.image}" style="width:100%; height:150px; object-fit:cover; border-radius:8px;">
            <div class="product-info">
                <h3>${p.name}</h3>
                <p class="price" style="color: #2563eb; font-weight: bold;">${p.price} ETB</p>
                <p style="font-size:0.8rem; color:#666;">Seller: ${p.phone_number || 'N/A'}</p>
                
                <div style="display: flex; gap: 10px; margin-top:10px;">
                    <button onclick="approveItem('${p.id}')" style="background:#2e7d32; color:white; border:none; padding:10px; border-radius:5px; flex:1; cursor:pointer;">✔️ Approve</button>
                    <button onclick="rejectItem('${p.id}')" style="background:#d32f2f; color:white; border:none; padding:10px; border-radius:5px; flex:1; cursor:pointer;">❌ Reject</button>
                </div>
                <button onclick="toggleSponsored('${p.id}', ${p.is_sponsored})" style="width:100%; margin-top:8px; padding:5px; border:1px solid #ffd700; background:#fffdf0; border-radius:5px; cursor:pointer;">
                    ${p.is_sponsored ? '⭐ Sponsored' : '☆ Make Sponsored'}
                </button>
            </div>
        </div>
    `).join('');
}

async function approveItem(id) {
    const { error } = await _supabase.from('products').update({ status: 'approved' }).eq('id', id);
    if (!error) {
        alert("Item Approved!");
        fetchPendingItems();
    }
}

async function rejectItem(id) {
    const reason = prompt("Why are you rejecting this item?");
    if (reason === null) return; 

    const { error } = await _supabase
        .from('products')
        .update({ status: 'rejected', rejection_reason: reason })
        .eq('id', id);

    if (!error) {
        alert("Item Rejected and seller notified.");
        fetchPendingItems();
    }
}

async function toggleSponsored(id, currentStatus) {
    const { error } = await _supabase
        .from('products')
        .update({ is_sponsored: !currentStatus })
        .eq('id', id);
    if (!error) fetchPendingItems();
}

// 4. CATEGORY MANAGEMENT
async function fetchCategories() {
    const list = document.getElementById('categoryList');
    if (!list) return;

    const { data: cats } = await _supabase.from('categories').select('*').order('name');
    
    list.innerHTML = cats.map(c => `
        <span class="category-tag" style="display:inline-block; background:#eee; padding:5px 12px; border-radius:15px; font-size:0.8rem; margin:3px;">
            ${c.name} <b onclick="deleteCategory('${c.id}')" style="cursor:pointer; color:red; margin-left:8px;">×</b>
        </span>
    `).join('');
}

async function addCategory() {
    const name = document.getElementById('newCatInput').value;
    if (!name) return;

    const { error } = await _supabase
        .from('categories')
        .insert([{ name: name }]);

    if (error) {
        // This will tell you if it's a 403 (Permission) or 409 (Duplicate)
        console.error("Supabase Admin Error:", error);
        alert(`Error: ${error.message}`); 
    } else {
        alert("Category added successfully!");
        location.reload();
    }
}

async function deleteCategory(id) {
    if (confirm("Delete this category?")) {
        await _supabase.from('categories').delete().eq('id', id);
        fetchCategories();
    }
}
