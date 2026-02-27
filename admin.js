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
    const input = document.getElementById('newCatInput');
    
    // Safety check: if input doesn't exist, stop here
    if (!input) {
        console.error("Error: Could not find the input field 'newCatInput'");
        return;
    }

    const name = input.value.trim(); // .trim() removes accidental spaces
    if (!name) {
        alert("Please enter a category name.");
        return;
    }

    const { error } = await _supabase
        .from('categories')
        .insert([{ name: name }]);

    if (error) {
        alert("Error adding category: " + error.message);
    } else {
        alert("Category '" + name + "' added successfully!");
        input.value = ''; // Clear the input
        location.reload(); // Refresh to show new category
    }
}

async function deleteCategory(id) {
    if (confirm("Delete this category?")) {
        await _supabase.from('categories').delete().eq('id', id);
        fetchCategories();
    }
}

// 1. Load Categories into the Admin List
async function loadAdminCategories() {
    const listContainer = document.getElementById('adminCategoryList');
    if (!listContainer) return;

    const { data: cats, error } = await _supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

    if (error) {
        listContainer.innerHTML = `<p style="color:red;">Error: ${error.message}</p>`;
        return;
    }

    if (cats.length === 0) {
        listContainer.innerHTML = `<p>No categories found.</p>`;
        return;
    }

    listContainer.innerHTML = cats.map(c => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f9f9f9; border-radius: 8px; border: 1px solid #eee;">
            <span style="font-weight: bold;">${c.name}</span>
            <button onclick="deleteCategory('${c.id}', '${c.name}')" 
                    style="background: #ff4d4f; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">
                Delete
            </button>
        </div>
    `).join('');
}

// 2. Delete Category Function
window.deleteCategory = async function(id, name) {
    if (confirm(`Are you sure you want to delete the "${name}" category? This might affect items currently assigned to it.`)) {
        const { error } = await _supabase
            .from('categories')
            .delete()
            .eq('id', id);

        if (error) {
            alert("Error: " + error.message);
        } else {
            alert("Category deleted!");
            loadAdminCategories(); // Refresh list
        }
    }
};

// 3. Make sure it loads when the page opens
document.addEventListener('DOMContentLoaded', () => {
    // ... your existing admin check code ...
    loadAdminCategories();
});
