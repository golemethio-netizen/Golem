document.addEventListener('DOMContentLoaded', fetchMyItems);

async function fetchMyItems() {
    const grid = document.getElementById('myItemsGrid');
    const statsContainer = document.getElementById('statsSummary');
    
    // 1. Check Authentication
    const { data: { user } } = await _supabase.auth.getUser();

    if (!user) {
        if (grid) {
            grid.innerHTML = `<div style="text-align:center; padding:50px;">
                <p>Please log in to manage your items.</p>
                <button onclick="location.href='login.html'" class="main-btn">Go to Login</button>
            </div>`;
        }
        return;
    }

    // 2. Fetch User's Items
    const { data: products, error } = await _supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        if (grid) grid.innerHTML = `<p>Error loading items: ${error.message}</p>`;
        return;
    }

    // 3. Calculate and Render Stats
    if (statsContainer) {
        // Calculate total views across all items
        const totalViews = products.reduce((sum, item) => sum + (item.views || 0), 0);
        
        statsContainer.innerHTML = `
            <div style="text-align:center; flex:1;">
                <p style="margin:0; font-size:0.8rem; color:#666;">Total Items</p>
                <strong style="font-size:1.2rem;">${products.length}</strong>
            </div>
            <div style="border-left: 1px solid #ddd; border-right: 1px solid #ddd; padding: 0 20px; text-align:center; flex:1;">
                <p style="margin:0; font-size:0.8rem; color:#666;">Total Views</p>
                <strong style="font-size:1.2rem;">👁️ ${totalViews}</strong>
            </div>
            <div style="text-align:center; flex:1;">
                <p style="margin:0; font-size:0.8rem; color:#666;">Account</p>
                <strong style="font-size:1.2rem; color:#2e7d32;">Active</strong>
            </div>
        `;
    }

    if (products.length === 0) {
        if (grid) grid.innerHTML = `<p style="text-align:center; grid-column: 1/-1; padding: 40px;">You haven't posted any items yet.</p>`;
        return;
    }

    // 4. Render Product Cards
    if (grid) {
        grid.innerHTML = products.map(p => {
            const isSold = p.status === 'sold';
            const isRejected = p.status === 'rejected';
            
            return `
                <div class="product-card ${isSold ? 'is-sold' : ''} ${isRejected ? 'rejected-border' : ''}">
                    <div class="status-badge ${p.status}">${p.status.toUpperCase()}</div>
                    <img src="${p.image}" alt="${p.name}" style="width:100%; height:180px; object-fit:cover;">
                    <div class="product-info">
                        <h3>${p.name}</h3>
                        
                        ${isRejected ? `
                            <div style="background:#fff1f0; padding:10px; border-radius:5px; margin:10px 0; border:1px solid #ffa39e;">
                                <p style="color:#cf1322; font-size:0.8rem; margin:0;">
                                    <strong>Reason:</strong> ${p.rejection_reason || 'Please check item details.'}
                                </p>
                            </div>
                        ` : ''}

                        <p class="price">${p.price} ETB</p>
                        <p style="font-size:0.8rem; color:#666; margin-bottom:10px;">👁️ ${p.views || 0} views</p>
                        
                        <div class="manage-btns" style="display:flex; flex-direction:column; gap:8px;">
                            ${(!isSold && !isRejected) ? `<button class="sold-btn" onclick="markAsSold('${p.id}')" style="background:#28a745; color:white; border:none; padding:8px; border-radius:5px; cursor:pointer;">✅ Mark Sold</button>` : ''}
                            <div style="display:flex; gap:5px;">
                                <button onclick="editItem('${p.id}')" style="flex:1; padding:8px; border:1px solid #ddd; background:white; border-radius:5px; cursor:pointer;">✏️ Edit</button>
                                <button onclick="deleteItem('${p.id}', '${p.image}')" style="flex:1; padding:8px; background:#ff4d4f; color:white; border:none; border-radius:5px; cursor:pointer;">🗑️ Delete</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
}

// --- ACTION FUNCTIONS ---

async function markAsSold(id) {
    if (confirm("Mark as SOLD? It will show a SOLD badge on the shop.")) {
        const { error } = await _supabase.from('products').update({ status: 'sold' }).eq('id', id);
        if (error) alert(error.message);
        else fetchMyItems();
    }
}

async function deleteItem(id, imageUrl) {
    if (confirm("Permanently delete this item? This cannot be undone.")) {
        const { error: dbError } = await _supabase.from('products').delete().eq('id', id);
        
        if (imageUrl && imageUrl.includes('supabase.co')) {
            try {
                const fileName = imageUrl.split('/').pop();
                await _supabase.storage.from('product-images').remove([`uploads/${fileName}`]);
            } catch (e) {
                console.log("Image removal skipped or failed");
            }
        }

        if (dbError) alert(dbError.message);
        else fetchMyItems();
    }
}

function editItem(id) {
    window.location.href = `submit.html?edit=${id}`;
}
