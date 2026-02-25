document.addEventListener('DOMContentLoaded', async () => {
    // 1. Security Check
    const { data: { user } } = await _supabase.auth.getUser();
    
    // Change this to YOUR email
    if (!user || user.email !== 'your-admin-email@gmail.com') {
        alert("Restricted Access: Admins Only");
        window.location.href = 'index.html';
        return;
    }

    loadDashboard();
});

async function loadDashboard() {
    const grid = document.getElementById('adminGrid');
    grid.innerHTML = "<p>Loading pending items...</p>";

    // 2. Fetch Stats
    const { count: pendingCount } = await _supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'pending');
    const { count: approvedCount } = await _supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'approved');
    
    document.getElementById('pendingCount').innerText = pendingCount || 0;
    document.getElementById('approvedCount').innerText = approvedCount || 0;

    // 3. Fetch Pending Items
    const { data: products, error } = await _supabase
        .from('products')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    if (error) {
        grid.innerHTML = "Error loading products.";
        return;
    }

    if (products.length === 0) {
        grid.innerHTML = "<div style='grid-column: 1/-1; text-align: center; padding: 50px;'><h3>🎉 No pending items to review!</h3></div>";
        return;
    }

    // 4. Render Items
    grid.innerHTML = products.map(p => `
        <div class="product-card" id="row-${p.id}">
            <img src="${p.image}" alt="${p.name}">
            <div class="product-info">
                <h3>${p.name}</h3>
                <p><strong>Price:</strong> ${p.price} ETB</p>
                <p><strong>Category:</strong> ${p.category}</p>
                <p style="font-size: 0.8rem; color: #666;">Seller: ${p.whatsapp_number || 'N/A'}</p>
                
                <div class="admin-actions" style="display:flex; flex-direction: column; gap: 8px; margin-top: 15px;">
                    <button onclick="updateStatus('${p.id}', 'approved')" style="background: #28a745; color: white; border: none; padding: 10px; border-radius: 5px; cursor: pointer; font-weight: bold;">✅ Approve</button>
                    <button onclick="updateStatus('${p.id}', 'rejected')" style="background: #ffc107; color: black; border: none; padding: 10px; border-radius: 5px; cursor: pointer; font-weight: bold;">❌ Reject</button>
                    <button onclick="deleteForever('${p.id}')" style="background: #dc3545; color: white; border: none; padding: 10px; border-radius: 5px; cursor: pointer; font-weight: bold;">🗑️ Delete Permanently</button>
                </div>
            </div>
        </div>
    `).join('');
}

async function updateStatus(id, newStatus) {
    const { error } = await _supabase
        .from('products')
        .update({ status: newStatus })
        .eq('id', id);

    if (error) {
        alert("Error: " + error.message);
    } else {
        alert("Item " + newStatus);
        loadDashboard(); // Refresh
    }
}

async function deleteForever(id) {
    if (confirm("Are you sure? This cannot be undone.")) {
        const { error } = await _supabase.from('products').delete().eq('id', id);
        if (error) alert(error.message);
        else loadDashboard();
    }
}

// Global Sign Out for Admin
async function handleSignOut() {
    await _supabase.auth.signOut();
    window.location.href = 'index.html';
}
