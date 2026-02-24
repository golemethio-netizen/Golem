document.addEventListener('DOMContentLoaded', async () => {
    // Safety check: Ensure only logged in users are here
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) {
        alert("Access Denied");
        window.location.href = 'index.html';
        return;
    }
    loadPendingItems();
});

async function loadPendingItems() {
    const grid = document.getElementById('adminGrid');
    grid.innerHTML = "<p>Loading pending items...</p>";

    const { data, error } = await _supabase
        .from('products')
        .select('*')
        .eq('status', 'pending');

    if (error) {
        console.error(error);
        grid.innerHTML = "Error loading data.";
        return;
    }

    if (data.length === 0) {
        grid.innerHTML = "<h3>✅ All caught up! No pending items.</h3>";
        return;
    }

    grid.innerHTML = data.map(p => `
        <div class="product-card" id="card-${p.id}">
            <img src="${p.image}" alt="${p.name}">
            <div class="product-info">
                <h3>${p.name}</h3>
                <p>${p.price} ETB</p>
                <div style="display:flex; gap:10px;">
                    <button onclick="updateStatus('${p.id}', 'approved')" 
                            style="background: #28a745; color:white; border:none; padding:10px; flex:1; border-radius:5px; cursor:pointer;">
                        Approve
                    </button>
                    <button onclick="updateStatus('${p.id}', 'rejected')" 
                            style="background: #dc3545; color:white; border:none; padding:10px; flex:1; border-radius:5px; cursor:pointer;">
                        Reject
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}









async function updateStatus(productId, newStatus) {
    const { error } = await _supabase
        .from('products')
        .update({ status: newStatus })
        .eq('id', productId);

    if (error) {
        alert("Update failed: " + error.message);
    } else {
        alert("Product " + newStatus);
        // Remove the card from view
        document.getElementById(`card-${productId}`).remove();
        
        // Refresh list if empty
        const grid = document.getElementById('adminGrid');
        if (grid.children.length === 0) {
            grid.innerHTML = "<h3>✅ All caught up!</h3>";
        }
    }
}



// Inside your data.map loop in admin.js
<div class="product-info">
    <h3>${p.name}</h3>
    <p>${p.price} ETB</p>
    <div style="display:flex; flex-direction:column; gap:8px;">
        <div style="display:flex; gap:5px;">
            <button onclick="updateStatus('${p.id}', 'approved')" style="background:#28a745; color:white; border:none; padding:8px; flex:1; border-radius:4px; cursor:pointer;">Approve</button>
            <button onclick="updateStatus('${p.id}', 'rejected')" style="background:#ffc107; color:black; border:none; padding:8px; flex:1; border-radius:4px; cursor:pointer;">Reject</button>
        </div>
        <button onclick="deleteProduct('${p.id}')" style="background:#dc3545; color:white; border:none; padding:8px; border-radius:4px; cursor:pointer; font-weight:bold;">
            🗑️ Delete Permanently
        </button>
    </div>
</div>







// --- ADMIN DELETE LOGIC ---

async function deleteProduct(productId) {
    // 1. Ask for confirmation
    const confirmDelete = confirm("Are you sure you want to PERMANENTLY delete this item?");
    
    if (confirmDelete) {
        try {
            const { error } = await _supabase
                .from('products')
                .delete()
                .eq('id', productId);

            if (error) throw error;

            alert("Item deleted successfully.");
            
            // 2. Remove the card from the UI immediately
            const card = document.getElementById(`card-${productId}`);
            if (card) card.remove();

        } catch (err) {
            console.error("Delete Error:", err.message);
            alert("Could not delete item: " + err.message);
        }
    }
}

