document.addEventListener('DOMContentLoaded', fetchMyItems);

async function fetchMyItems() {
    const grid = document.getElementById('myItemsGrid');
    const statsContainer = document.getElementById('statsSummary');
    
    // 1. Check Authentication
    const { data: { user } } = await _supabase.auth.getUser();

    if (!user) {
        grid.innerHTML = `<div style="text-align:center; padding:50px;">
            <p>Please log in to manage your items.</p>
            <button onclick="location.href='login.html'" class="main-btn">Go to Login</button>
        </div>`;
        return;
    }

    // 2. Fetch User's Items
    const { data: products, error } = await _supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        grid.innerHTML = `<p>Error loading items: ${error.message}</p>`;
        return;
    }

    // 3. Calculate and Render Stats
    const totalViews = products.reduce((sum, p) => sum + (p.views || 0), 0);
    statsContainer.innerHTML = `
        <div>
            <p style="margin:0; font-size:0.8rem; color:#666;">Total Items</p>
            <strong style="font-size:1.2rem;">${products.length}</strong>
        </div>
        <div style="border-left: 1px solid #ddd; border-right: 1px solid #ddd; padding: 0 20px;">
            <p style="margin:0; font-size:0.8rem; color:#666;">Total Views</p>
            <strong style="font-size:1.2rem;">👁️ ${totalViews}</strong>
        </div>
        <div>
            <p style="margin:0; font-size:0.8rem; color:#666;">Status</p>
            <strong style="font-size:1.2rem; color:#2e7d32;">Active</strong>
        </div>
    `;

    if (products.length === 0) {
        grid.innerHTML = `<p style="text-align:center; grid-column: 1/-1; padding: 40px;">You haven't posted any items yet.</p>`;
        return;
    }

    // 4. Render Product Cards
    grid.innerHTML = products.map(p => {
        const isSold = p.status === 'sold';
        return `
            <div class="product-card ${isSold ? 'is-sold' : ''}">
                <div class="status-badge ${p.status}">${p.status}</div>
                <img src="${p.image}" alt="${p.name}">
                <div class="product-info">
                    <h3>${p.name}</h3>
                    <p class="price">${p.price} ETB</p>
                    <p style="font-size:0.8rem; color:#666; margin-bottom:10px;">👁️ ${p.views || 0} views</p>
                    
                    <div class="manage-btns">
                        ${!isSold ? `<button class="sold-btn" onclick="markAsSold('${p.id}')">✅ Mark Sold</button>` : ''}
                        <button class="edit-btn" onclick="editItem('${p.id}')">✏️ Edit</button>
                        <button class="delete-btn" onclick="deleteItem('${p.id}', '${p.image}')">🗑️ Delete Forever</button>
                    </div>
                </div>
            </div>
        `;

 <div class="product-card ${isRejected ? 'rejected-border' : ''}">
        <div class="status-badge ${p.status}">${p.status.toUpperCase()}</div>
        <img src="${p.image}">
        <div class="product-info">
            <h3>${p.name}</h3>
            
            ${isRejected ? `
                <div style="background:#fff1f0; padding:10px; border-radius:5px; margin:10px 0; border:1px solid #ffa39e;">
                    <p style="color:#cf1322; font-size:0.8rem; margin:0;">
                        <strong>Rejected:</strong> ${p.rejection_reason || 'No reason provided.'}
                    </p>
                    <p style="font-size:0.75rem; color:#666; margin-top:5px;">Click 'Edit' to fix and resubmit.</p>
                </div>
            ` : ''}

            <p class="price">${p.price} ETB</p>
            </div>
    </div>



        
    }).join('');
}

// --- ACTION FUNCTIONS ---

// 1. MARK AS SOLD
async function markAsSold(id) {
    if (confirm("Once marked as SOLD, this item will be hidden from the shop. Continue?")) {
        const { error } = await _supabase
            .from('products')
            .update({ status: 'sold' })
            .eq('id', id);

        if (error) alert(error.message);
        else fetchMyItems(); // Refresh the list
    }
}

// 2. DELETE ITEM
async function deleteItem(id, imageUrl) {
    if (confirm("This will permanently remove the item and its image. Are you sure?")) {
        // A. Delete from Database
        const { error: dbError } = await _supabase.from('products').delete().eq('id', id);

        // B. Delete from Storage (if image exists in our bucket)
        if (imageUrl.includes('product-images')) {
            const fileName = imageUrl.split('/').pop();
            await _supabase.storage.from('product-images').remove([`uploads/${fileName}`]);
        }

        if (dbError) alert(dbError.message);
        else fetchMyItems(); // Refresh the list
    }
}

// 3. EDIT REDIRECT
function editItem(id) {
    window.location.href = `submit.html?edit=${id}`;
}


// Inside the mapping in my-items.js
const isRejected = p.status === 'rejected';






// Inside the mapping in my-items.js
const isRejected = p.status === 'rejected';


