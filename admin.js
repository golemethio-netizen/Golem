// 1. Fetch only pending products
async function fetchPendingProducts() {
    const { data, error } = await _supabase
        .from('products')
        .select('*')
        .eq('status', 'pending');

    if (error) {
        console.error("Error fetching pending items:", error);
        return;
    }

    renderPendingItems(data);
}

// 2. Display them with Approve/Reject buttons
function renderPendingItems(list) {
    const container = document.getElementById('pendingGrid');
    if (list.length === 0) {
        container.innerHTML = "<p>No new submissions to review.</p>";
        return;
    }

    container.innerHTML = list.map(p => `
        <div class="admin-card" style="border: 1px solid #ffa500; padding: 10px; margin: 10px;">
            <img src="${p.image}" width="100">
            <h4>${p.name}</h4>
            <p>Price: $${p.price} | Cat: ${p.category}</p>
            <p><small>Submitted by: ${p.submitted_by || 'Unknown'}</small></p>
            <button onclick="updateStatus(${p.id}, 'approved')" style="background:green; color:white;">Approve</button>
            <button onclick="deleteProduct(${p.id})" style="background:red; color:white;">Reject/Delete</button>
        </div>
    `).join('');
}

// 3. The Approval Function
async function updateStatus(id, newStatus) {
    const { error } = await _supabase
        .from('products')
        .update({ status: newStatus })
        .eq('id', id);

    if (error) {
        alert("Action failed: " + error.message);
    } else {
        alert("Product is now LIVE on the shop!");
        fetchPendingProducts(); // Refresh the list
    }
}

// Call this when the admin page loads
fetchPendingProducts();
