document.addEventListener('DOMContentLoaded', () => {
    loadAdminProducts();
});

async function loadAdminProducts() {
    const { data, error } = await _supabase.from('products').select('*');
    if (error) return console.error(error);

    const pending = data.filter(p => p.status === 'pending');
    const approved = data.filter(p => p.status === 'approved');

    renderAdminGrid('pendingGrid', pending, true);
    renderAdminGrid('activeGrid', approved, false);
}

function renderAdminGrid(elementId, list, isPending) {
    const container = document.getElementById(elementId);
    container.innerHTML = list.map(p => `
        <div class="card">
            <img src="${p.image}" width="100">
            <h4>${p.name}</h4>
            <p>By: ${p.submitted_by || 'Admin'}</p>
            ${isPending ? 
                `<button onclick="updateStatus(${p.id}, 'approved')" style="background:green;color:white">Approve</button>` : 
                `<button onclick="updateStatus(${p.id}, 'pending')" style="background:orange">Hide</button>`
            }
            <button onclick="deleteItem(${p.id})" style="background:red;color:white">Delete</button>
        </div>
    `).join('');
}

async function updateStatus(id, newStatus) {
    await _supabase.from('products').update({ status: newStatus }).eq('id', id);
    loadAdminProducts();
}

async function deleteItem(id) {
    if(confirm("Permanently delete?")) {
        await _supabase.from('products').delete().eq('id', id);
        loadAdminProducts();
    }
}
