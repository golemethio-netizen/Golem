// 1. Fetch ALL products (regardless of status)
async function fetchAdminProducts() {
    const listContainer = document.getElementById('adminProductList');
    
    const { data, error } = await _supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        listContainer.innerHTML = "Error loading products.";
        return;
    }

    if (data.length === 0) {
        listContainer.innerHTML = "No products found.";
        return;
    }

    renderAdminList(data);
}

// 2. Draw the list with buttons
function renderAdminList(products) {
    const listContainer = document.getElementById('adminProductList');
    
    listContainer.innerHTML = products.map(p => `
        <div class="admin-card">
            <img src="${p.image}" alt="">
            <div class="admin-info">
                <h4>${p.name}</h4>
                <p>$${p.price} | Category: ${p.category}</p>
                <span class="status-badge status-${p.status}">${p.status}</span>
            </div>
            <div class="admin-actions">
                ${p.status === 'pending' ? 
                    `<button class="approve-btn" onclick="updateStatus('${p.id}', 'approved')">Approve</button>` : ''}
                
                ${p.status === 'approved' ? 
                    `<button class="sold-btn" onclick="updateStatus('${p.id}', 'sold')">Mark Sold</button>` : ''}
                
                <button class="delete-btn" onclick="deleteProduct('${p.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

// 3. UNIVERSAL UPDATE FUNCTION (For Approve and Sold)
async function updateStatus(id, newStatus) {
    const { error } = await _supabase
        .from('products')
        .update({ status: newStatus })
        .eq('id', id);

    if (error) {
        alert("Update failed: " + error.message);
    } else {
        fetchAdminProducts(); // Refresh list
    }
}

// 4. DELETE FUNCTION
async function deleteProduct(id) {
    if (!confirm("Are you sure you want to delete this?")) return;

    const { error } = await _supabase
        .from('products')
        .delete()
        .eq('id', id);

    if (error) {
        alert("Delete failed.");
    } else {
        fetchAdminProducts(); // Refresh list
    }
}

// Run on load
fetchAdminProducts();
