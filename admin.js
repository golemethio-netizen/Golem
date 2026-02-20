// 1. THE GATEKEEPER - Runs immediately
async function checkAdmin() {
    // Get the current session status
    const { data: { session } } = await _supabase.auth.getSession();
    const adminEmail = 'jojo@gmail.com'.toLowerCase(); // CHANGE THIS

    if (!session) {
        // If not logged in at all
        alert("Access Denied. Please login.");
        window.location.href = 'login.html';
        return;
    }

    if (session.user.email.toLowerCase() !== Email) {
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

   // This is likely inside a function like 'renderAdminProducts'
grid.innerHTML = list.map(p => `
    <div class="admin-card">
        <img src="${p.image}" width="80">
        <div class="admin-info">
            <h4>${p.name}</h4>
            <p>Current Status: <strong>${p.status}</strong></p>
            
            <div class="admin-actions">
                ${p.status === 'pending' ? `<button class="approve-btn" onclick="approveProduct('${p.id}')">Approve</button>` : ''}
                
                <button class="sold-btn" onclick="markAsSold('${p.id}')">Mark Sold</button>
                
                <button class="delete-btn" onclick="deleteProduct('${p.id}')">Delete</button>
            </div>
        </div>
    </div>
`).join('');
    
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

// Function to delete a product
async function deleteProduct(id) {
    const confirmation = confirm("Are you sure you want to delete this product? This cannot be undone.");
    
    if (confirmation) {
        const { error } = await _supabase
            .from('products')
            .delete()
            .eq('id', id);

        if (error) {
            alert("Error deleting product: " + error.message);
        } else {
            alert("Product removed from store.");
            fetchAdminProducts(); // Refresh the list automatically
        }
    }
}

// Function to mark as Sold (Optional alternative to deleting)
async function markAsSold(id) {
    const confirmation = confirm("Mark this item as Sold? It will still show on the site but cannot be added to cart.");
    
    if (confirmation) {
        const { data, error } = await _supabase
            .from('products')
            .update({ status: 'sold' }) // Updates the 'status' column to 'sold'
            .eq('id', id);

        if (error) {
            alert("Error: " + error.message);
        } else {
            alert("Item marked as Sold!");
            // Refresh the admin list to see the change
            if (typeof fetchAdminProducts === "function") fetchAdminProducts();
            else location.reload(); 
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
