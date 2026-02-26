
// Add this to the very top of admin.js
// 1. SECURITY CHECK (Change this to your actual email)
const ADMIN_EMAIL = "yohannes.surafel@gmail.com"; 

async function checkAdmin() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user || user.email !== ADMIN_EMAIL) {
        alert("Access Denied.");
        window.location.href = 'index.html';
    }
}
checkAdmin();


document.addEventListener('DOMContentLoaded', () => {
    fetchPendingItems();
	fetchCategories();
	
});

// 2. FETCH PENDING ITEMS
async function fetchPendingItems() {
    const grid = document.getElementById('adminGrid');
    
    const { data: products, error } = await _supabase
        .from('products')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

    if (error) {
        grid.innerHTML = `<p>Error: ${error.message}</p>`;
        return;
    }

    if (products.length === 0) {
        grid.innerHTML = `<div style="text-align:center; grid-column:1/-1; padding:50px;">
            <h3>🎉 No pending items!</h3>
        </div>`;
        return;
    }



// 3. RENDER CARDS WITH BOTH BUTTONS
    grid.innerHTML = products.map(p => `
        <div class="product-card">
            <img src="${p.image}" style="width:100%; height:150px; object-fit:cover; border-radius:8px;">
            <div class="product-info">
                <h3>${p.name}</h3>
                <p class="price">${p.price} ETB</p>
                <p style="font-size:0.8rem; color:#666;">Seller: ${p.phone_number}</p>
                
                <div class="manage-btns" style="display: flex; gap: 10px; margin-top:10px;">
                    <button class="sold-btn" onclick="approveItem('${p.id}')" style="background:#2e7d32; flex:1;">✔️ Approve</button>
                    <button class="reject-btn" onclick="rejectItem('${p.id}')" style="background:#d32f2f; color:white; border:none; padding:10px; border-radius:5px; flex:1; cursor:pointer;">❌ Reject</button>
                </div>
            </div>
        </div>
    `).join('');
}


// 4. APPROVE FUNCTION
async function approveItem(id) {
    const { error } = await _supabase
        .from('products')
        .update({ status: 'approved' })
        .eq('id', id);

    if (!error) {
        alert("Item Approved!");
        fetchPendingItems();
    }
}

// 5. REJECT FUNCTION (With Reason)
async function rejectItem(id) {
    const reason = prompt("Enter the reason for rejection (e.g., Price too high, blurry photo):");
    
    if (reason === null) return; // If they click cancel

    const { error } = await _supabase
        .from('products')
        .update({ 
            status: 'rejected', 
            rejection_reason: reason 
        })
        .eq('id', id);

    if (!error) {
        alert("Item Rejected.");
        fetchPendingItems();
    } else {
        alert("Error rejecting item: " + error.message);
    }





async function loadPending() {
    const { data } = await _supabase.from('products').select('*').eq('status', 'pending');
    const grid = document.getElementById('adminGrid');
    grid.innerHTML = data.map(p => `
        <div class="product-card">
            <img src="${p.image}">
            <h3>${p.name}</h3>
            <button onclick="updateStatus('${p.id}', 'approved')">Approve</button>
            <button onclick="deleteItem('${p.id}')">Delete</button>
        </div>
    `).join('');
}

async function updateStatus(id, status) {
    await _supabase.from('products').update({ status }).eq('id', id);
    location.reload();
}




async function fetchCategories() {
    const list = document.getElementById('categoryList');
    const { data: cats } = await _supabase.from('categories').select('*').order('name');
    
    list.innerHTML = cats.map(c => `
        <span class="category-tag" style="background:#ddd; padding:5px 10px; border-radius:15px; font-size:0.8rem;">
            ${c.name} <b onclick="deleteCategory('${c.id}')" style="cursor:pointer; color:red; margin-left:5px;">×</b>
        </span>
    `).join('');
}

async function addCategory() {
    const name = document.getElementById('newCatName').value;
    if (!name) return;

    const { error } = await _supabase.from('categories').insert([{ name }]);
    if (error) alert("Error: Category might already exist.");
    else {
        document.getElementById('newCatName').value = '';
        fetchCategories();
    }
}

async function deleteCategory(id) {
    if (confirm("Delete this category? Items already in this category won't be deleted.")) {
        await _supabase.from('categories').delete().eq('id', id);
        fetchCategories();
    }
}



async function rejectItem(id, imageUrl) {
    const reason = prompt("Why are you rejecting this item? (e.g., Low quality image, duplicate, etc.)");
    
    // If they click cancel, stop the function
    if (reason === null) return; 

    if (confirm("Confirm rejection? This will notify the seller on their dashboard.")) {
        // Instead of deleting, we change status to 'rejected' and save the reason
        const { error } = await _supabase
            .from('products')
            .update({ 
                status: 'rejected',
                rejection_reason: reason 
            })
            .eq('id', id);

        if (!error) {
            alert("Item rejected and seller notified.");
            fetchPendingItems();
        } else {
            alert("Error: " + error.message);
        }
    }
}


async function toggleSponsored(id, currentStatus) {
    const { error } = await _supabase
        .from('products')
        .update({ is_sponsored: !currentStatus })
        .eq('id', id);

    if (!error) fetchPendingItems(); // or wherever you are viewing the list
}


async function rejectItem(id, imageUrl) {
    const reason = prompt("Why are you rejecting this item?");
    
    if (reason === null) return; // User clicked Cancel

    const { error } = await _supabase
        .from('products')
        .update({ 
            status: 'rejected',
            rejection_reason: reason 
        })
        .eq('id', id);

    if (!error) {
        alert("Item rejected.");
        fetchPendingItems(); // Refresh the list
    } else {
        alert("Error: " + error.message);
    }
}
