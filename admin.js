// THE GATEKEEPER
async function checkAdmin() {
    const { data: { user } } = await _supabase.auth.getUser();

    // If no one is logged in, or the email doesn't match yours
    if (!user || user.email !== 'golemethio@gmail.com') {
        alert("Access Denied. Admins only!");
        window.location.href = 'login.html'; // Kick them out to login
    }
}

// Run the check immediately
checkAdmin();

// Your existing fetchPendingProducts() and other code goes BELOW this...

document.addEventListener('DOMContentLoaded', () => {
    fetchPendingProducts();
});

async function fetchPendingProducts() {
    const tableBody = document.getElementById('pendingTable');
    
    // Correct way:
const { error } = await _supabase
    .from('products')
    .update({ status: 'approved' })
    .eq('id', id);

    if (error) {
        console.error("Error fetching pending:", error.message);
        return;
    }

    if (data.length === 0) {
        tableBody.innerHTML = "<tr><td colspan='5'>No pending products to approve.</td></tr>";
        return;
    }

    tableBody.innerHTML = data.map(p => `
        <tr>
            <td><img src="${p.image}" width="50" style="border-radius:5px"></td>
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

async function approveItem(id) {
    const { error } = await _supabase
        .from('products')
        .update({ status: 'approved' })
        .eq('id', id);

    if (!error) {
        alert("Product Approved!");
        fetchPendingProducts(); // Refresh list
    }
}

async function deleteItem(id) {
    if (confirm("Are you sure you want to delete this submission?")) {
        const { error } = await _supabase
            .from('products')
            .delete()
            .eq('id', id);
        
        if (!error) fetchPendingProducts();
    }
}
async function logout() {
    const { error } = await _supabase.auth.signOut();
    if (!error) {
        window.location.href = 'login.html';
    }
}
