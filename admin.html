<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <link rel="icon" href="https://cdn-icons-png.flaticon.com/512/9422/9422566.png">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Golem Admin | Control Center</title>
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        .admin-actions button { margin-top: 5px; width: 100%; cursor: pointer; border-radius: 5px; border: none; padding: 10px; font-weight: 600; }
        .btn-approve { background: #2ed573; color: white; }
        .btn-reject { background: #ff4757; color: white; }
        .btn-feature { background: #f1c40f; color: #000; }
        .sponsor-controls { background: #fff9e6; border: 1px solid #f1c40f; padding: 12px; border-radius: 8px; margin-top: 10px; }
        .tab-btn { padding: 10px 20px; border: none; background: #eee; cursor: pointer; border-radius: 5px; font-weight: 600; }
        .tab-btn.active { background: #333; color: white; }
        .stat-card { background: white; padding: 20px; border-radius: 12px; display: flex; align-items: center; gap: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .stat-card i { font-size: 2rem; color: #333; opacity: 0.2; }
    </style>
</head>
<body style="background: #f4f7f6;">

    <header class="golem-header">
        <div class="logo">GOLEM ADMIN</div>
        <div style="display: flex; gap: 10px;">
            <button class="signin-btn" onclick="location.href='index.html'" style="background:#666;">View Site</button>
            <button class="signin-btn" onclick="_supabase.auth.signOut().then(() => location.reload())">Sign Out</button>
        </div>
    </header>

    <div class="container" style="padding: 20px;">
        <div class="admin-tabs" style="display: flex; gap: 10px; margin-bottom: 25px;">
            <button onclick="switchTab('pending', this)" class="tab-btn active">Pending Approval</button>
            <button onclick="switchTab('approved', this)" class="tab-btn">Live Items</button>
            <button onclick="switchTab('rejected', this)" class="tab-btn">Rejected</button>
        </div>

        <div class="admin-search-bar" style="margin-bottom: 25px;">
            <input type="text" id="adminSearchInput" placeholder="Search by name, phone, or category..." 
                   style="width: 100%; padding: 15px; border-radius: 10px; border: 1px solid #ddd; outline: none; font-size: 1rem;">
        </div>
         
        <div class="stats-container" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px;">
            <div class="stat-card"><i class="fas fa-boxes"></i><div><h4 id="totalItems">0</h4><p>Total Items</p></div></div>
            <div class="stat-card"><i class="fas fa-star" style="color:#f1c40f; opacity:1;"></i><div><h4 id="activeSponsors">0</h4><p>Active Sponsors</p></div></div>
            <div class="stat-card"><i class="fas fa-wallet"></i><div><h4 id="totalValue">0 ETB</h4><p>Market Value</p></div></div>
            <div class="stat-card" style="border-left: 5px solid #ff4757;">
                <i class="fas fa-headset" style="opacity: 0.5; color: #ff4757;"></i>
                <div><h4 id="pendingTickets">0</h4><p>Help Requests</p></div>
            </div>
        </div>

        <main>
            <h2 id="viewTitle" style="margin-bottom: 20px;">Pending Approval</h2>
            <div id="adminGrid" class="masonry-wrapper"></div>
        </main>

        <section id="ticketsSection" style="margin-top: 60px; padding-top: 30px; border-top: 2px dashed #ccc;">
            <h2 style="margin-bottom: 20px;"><i class="fas fa-envelope-open-text"></i> Support Tickets</h2>
            <div id="ticketList" style="display: grid; gap: 15px;"></div>
        </section>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script src="config.js"></script>
    <script>
        let currentView = 'pending';

        // 1. SECURITY CHECK
        async function checkAdmin() {
            const { data: { user } } = await _supabase.auth.getUser();
            if (!user || user.email !== 'yohannes.surafel@gmail.com') {
                alert("Restricted Access: Admin Only.");
                window.location.href = 'index.html';
            }
        }

        // 2. TAB SWITCHING
        async function switchTab(status, btn) {
            currentView = status;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('viewTitle').innerText = status.toUpperCase() + " ITEMS";
            loadItems(status);
        }

        // 3. LOAD DATA
        async function loadItems(status = 'pending') {
            const grid = document.getElementById('adminGrid');
            grid.innerHTML = "<p>Loading products...</p>";
            
            const { data: items, error } = await _supabase
                .from('products')
                .select('*')
                .eq('status', status)
                .order('created_at', { ascending: false });

            if (error || !items || items.length === 0) {
                grid.innerHTML = `<div style="padding:40px; text-align:center; color:#888;">No items found in ${status}.</div>`;
                return;
            }

            const now = new Date();

            grid.innerHTML = items.map(item => {
                const isSponsorActive = item.is_sponsored && new Date(item.sponsored_until) > now;

                return `
                <div class="product-card" id="card-${item.id}" style="background:white; border-radius:12px; overflow:hidden;">
                    <img src="${item.image}" style="width:100%; height:200px; object-fit:cover;">
                    <div class="product-info" style="padding:15px;">
                        <h3 style="margin-bottom:5px;">${item.name}</h3>
                        <p style="color:#2ed573; font-weight:bold; font-size:1.1rem;">${item.price?.toLocaleString()} ETB</p>
                        <p style="font-size:0.85rem; color:#666; margin-top:5px;">Seller: ${item.seller_phone}</p>
                        
                        <div class="admin-actions" style="margin-top:15px; border-top: 1px solid #eee; pt:10px;">
                            ${status === 'pending' ? `
                                <button onclick="updateStatus('${item.id}', 'approved')" class="btn-approve">Approve & Go Live</button>
                                <button onclick="updateStatus('${item.id}', 'rejected')" class="btn-reject">Reject Item</button>
                            ` : ''}

                            ${status === 'approved' ? `
                                <div class="sponsor-controls">
                                    <label style="font-size: 0.7rem; font-weight: 800; color: #b8860b;">💎 SPONSORSHIP DURATION</label>
                                    <div style="display: flex; gap: 5px; margin-top: 5px;">
                                        <select id="days-${item.id}" style="flex: 1; padding: 8px; border-radius: 5px;">
                                            <option value="3">3 Days</option>
                                            <option value="7">7 Days</option>
                                            <option value="30">30 Days</option>
                                        </select>
                                        <button onclick="activateSponsor('${item.id}')" style="width:auto; padding:0 15px; background:#f1c40f; color:black;">Set</button>
                                    </div>
                                    ${isSponsorActive ? `
                                        <p style="font-size: 0.75rem; color: #27ae60; margin-top: 8px; font-weight:600;">
                                            ✅ Sponsored until ${new Date(item.sponsored_until).toLocaleDateString()}
                                            <br><a href="javascript:void(0)" onclick="cancelSponsor('${item.id}')" style="color: #ff4757;">Stop Ad</a>
                                        </p>
                                    ` : ''}
                                </div>
                                <button onclick="updateStatus('${item.id}', 'rejected')" class="btn-reject" style="margin-top:10px;">Delete/Remove</button>
                            ` : ''}

                            ${status === 'rejected' ? `
                                <button onclick="updateStatus('${item.id}', 'approved')" class="btn-approve">Restore Item</button>
                                <button onclick="permanentlyDelete('${item.id}')" style="background:black; color:white;">Erase Forever</button>
                            ` : ''}
                        </div>
                    </div>
                </div>`;
            }).join('');
        }

        // 4. SPONSORSHIP LOGIC
        window.activateSponsor = async (id) => {
            const days = parseInt(document.getElementById(`days-${id}`).value);
            const expiry = new Date();
            expiry.setDate(expiry.getDate() + days);

            const { error } = await _supabase
                .from('products')
                .update({ 
                    is_sponsored: true, 
                    sponsored_until: expiry.toISOString() 
                })
                .eq('id', id);

            if (!error) {
                alert("Featured status activated!");
                loadItems('approved');
                loadStats();
            }
        };

        window.cancelSponsor = async (id) => {
            const { error } = await _supabase
                .from('products')
                .update({ is_sponsored: false, sponsored_until: null })
                .eq('id', id);
            if (!error) loadItems('approved');
        };

        // 5. STATUS UPDATES
        window.updateStatus = async (id, newStatus) => {
            const { error } = await _supabase.from('products').update({ status: newStatus }).eq('id', id);
            if (!error) {
                document.getElementById(`card-${id}`)?.remove();
                loadStats();
            }
        };

        window.permanentlyDelete = async (id) => {
            if (confirm("This cannot be undone. Delete from Database?")) {
                const { error } = await _supabase.from('products').delete().eq('id', id);
                if (!error) document.getElementById(`card-${id}`)?.remove();
            }
        };

        // 6. DASHBOARD STATS
        async function loadStats() {
            const { count: totalItems } = await _supabase.from('products').select('*', { count: 'exact', head: true });
            const { count: sponsoredCount } = await _supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_sponsored', true).gt('sponsored_until', new Date().toISOString());
            const { data: priceData } = await _supabase.from('products').select('price');
            const { count: ticketCount } = await _supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('is_resolved', false);

            const marketValue = priceData?.reduce((sum, item) => sum + (item.price || 0), 0) || 0;

            document.getElementById('totalItems').innerText = totalItems || 0;
            document.getElementById('activeSponsors').innerText = sponsoredCount || 0;
            document.getElementById('totalValue').innerText = marketValue.toLocaleString() + " ETB";
            document.getElementById('pendingTickets').innerText = ticketCount || 0;
        }

        // 7. TICKETS
        async function loadTickets() {
            const list = document.getElementById('ticketList');
            const { data: tickets } = await _supabase.from('support_tickets').select('*').eq('is_resolved', false).order('created_at', { ascending: false });

            if (!tickets || tickets.length === 0) {
                list.innerHTML = "<p style='color:#888;'>No new messages.</p>";
                return;
            }

            list.innerHTML = tickets.map(t => `
                <div style="background:white; padding:20px; border-radius:10px; border-left:5px solid #ff4757;">
                    <h4 style="color:#333;">${t.subject}</h4>
                    <p style="margin:10px 0; font-size:0.9rem;">${t.message}</p>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:0.8rem; color:#007bff;">${t.user_email}</span>
                        <button onclick="resolveTicket('${t.id}')" style="background:#2ed573; color:white; border:none; padding:5px 15px; border-radius:5px; cursor:pointer;">Resolved</button>
                    </div>
                </div>
            `).join('');
        }

        window.resolveTicket = async (id) => {
            const { error } = await _supabase.from('support_tickets').update({ is_resolved: true }).eq('id', id);
            if (!error) { loadTickets(); loadStats(); }
        };

        // INITIALIZE
        window.onload = async () => {
            await checkAdmin();
            loadStats();
            loadItems('pending');
            loadTickets();
        };

        // SEARCH
        document.getElementById('adminSearchInput').addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('.product-card').forEach(card => {
                card.style.display = card.innerText.toLowerCase().includes(term) ? 'block' : 'none';
            });
        });
    </script>
</body>
</html>
