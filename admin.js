// 1. THE GATEKEEPER - Runs immediately
async function checkAdmin() {
    // Get the current session status
    const { data: { session } } = await _supabase.auth.getSession();
    const adminEmail = 'golemethio@gmail.com'.toLowerCase(); // CHANGE THIS

    if (!session) {
        // If not logged in at all
        alert("Access Denied. Please login.");
        window.location.href = 'login.html';
        return;
    }

    if (session.user.email.toLowerCase() !== adminEmail) {
        // If logged in as a normal user
        alert("Access Denied. Admins only.");
        window.location.href = 'index.html';
        return;
    }

    // If we passed both checks, load the data
    console.log("Admin verified. Loading products...");
    fetchPendingProducts();
}

// 2. FETCH PENDING PRODUCTS
async function fetchPendingProducts() {
    const tableBody = document.getElementById('pendingTable');
    
    const { data, error } = await _supabase
        .from('products')
        .select('*')
        .eq('status', 'pending');

    if (error) {
        console.error("Fetch error:", error.message);
        return;
    }

    if (!data || data.length === 0) {
        tableBody.innerHTML = "<tr><td colspan='5'>No pending items found.</td></tr>";
        return;
    }

    tableBody.innerHTML = data.map(p => `
        <tr>
            <td><img src="${p.image || 'https://via.placeholder.com/50'}" width="50" style="border-radius:4px"></td>
            <td>${p.name}</td>
            <td>$${p.price}</td>
            <td>${p.category}</td>
            <td>
                <button class="approve-btn" onclick="approveItem('${p.id}')">Approve</button>
                <button class="reject-btn" onclick="deleteItem('${p.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

// 3. APPROVE ITEM
async function approveItem(id) {
    const { error } = await _supabase
        .from('products')
        .update({ status: 'approved' })
        .eq('id', id);

    if (error) {
        alert("Update failed: " + error.message);
    } else {
        alert("Product Approved!");
        fetchPendingProducts(); // Refresh list
    }
}

// 4. DELETE/REJECT ITEM
async function deleteItem(id) {
    if (confirm("Delete this submission?")) {
        const { error } = await _supabase
            .from('products')
            .delete()
            .eq('id', id);
        
        if (error) {
            alert("Delete failed: " + error.message);
        } else {
            fetchPendingProducts();
        }
    }
}

// 5. LOGOUT
async function logout() {
    await _supabase.auth.signOut();
    window.location.href = 'login.html';
}

// INITIALIZE
checkAdmin();
