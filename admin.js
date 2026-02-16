// THE GATEKEEPER
async function checkAdmin() {
    // 1. Get the current session
    const { data: { session }, error } = await _supabase.auth.getSession();

    // 2. Wait a split second if the session is still null (loading state)
    if (!session) {
        // If truly no session after checking, kick them out
        console.log("No session found, checking again...");
        const { data: { user } } = await _supabase.auth.getUser();
        
        if (!user) {
            alert("Access Denied. Please login first.");
            window.location.href = 'login.html';
            return;
        }
    }

    // 3. Precise Email Check (Convert both to lowercase to avoid typos)
    const adminEmail = 'YOUR_EMAIL@GMAIL.COM'.toLowerCase().trim();
    const loggedInEmail = session.user.email.toLowerCase().trim();

    if (loggedInEmail !== adminEmail) {
        alert("Access Denied. You are logged in as " + loggedInEmail + ", which is not an admin.");
        window.location.href = 'index.html';
    } else {
        console.log("Welcome, Admin!");
        fetchPendingProducts(); // Only load data if they are the admin
    }
}

// Start the check
checkAdmin();
// 3. Precise Email Check (Convert both to lowercase to avoid typos)
    const adminEmail = 'YOUR_EMAIL@GMAIL.COM'.toLowerCase().trim();
    const loggedInEmail = session.user.email.toLowerCase().trim();

    if (loggedInEmail !== adminEmail) {
        alert("Access Denied. You are logged in as " + loggedInEmail + ", which is not an admin.");
        window.location.href = 'index.html';
    } else {
        console.log("Welcome, Admin!");
        fetchPendingProducts(); // Only load data if they are the admin
    }
}
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
