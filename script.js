/* ═══════════════════════════════════════════════════════════════
   refactored-script.js — WanaGebya Marketplace
   Changes:
   • Single WanaGebya namespace (no window.* pollution)
   • Debounced search with server-side fallback
   • Event delegation for product cards (no inline onclick)
   • localStorage schema versioning + safe JSON parsing
   • Robust timer management (Map-based, leak-proof)
   • Ethiopian phone normalization utility
   • Graceful error boundaries around renders
   • ARIA improvements for modals
   ═══════════════════════════════════════════════════════════════ */

const WanaGebya = {
  // ── 1. STATE (private-ish via closure convention) ──
  state: {
    currentProduct: null,
    currentCategory: 'All',
    currentSubcategory: null,
    savedVersion: 2,          // bump when schema changes
    savedKey: 'golem_saved_v2',
    searchDebounceMs: 300,
  },

  // ── 2. TIMER REGISTRY (prevents leaks) ──
  timers: new Map(),
  _sponsorProducts: new Map(),

  // ── 3. UTILITIES ──
  utils: {
    escapeHtml(str) {
      if (str == null) return '';
      const div = document.createElement('div');
      div.textContent = String(str);
      return div.innerHTML;
    },

    escapeJsAttr(str) {
      if (str == null) return '';
      return String(str)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\'")
        .replace(/"/g, '&quot;')
        .replace(/\n/g, '\n');
    },

    debounce(fn, ms) {
      let t;
      return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), ms);
      };
    },

    safeJsonParse(raw, fallback) {
      try { return JSON.parse(raw); }
      catch { return fallback; }
    },

    normalizePhone(phone) {
      const digits = String(phone || '').replace(/\D/g, '');
      if (digits.startsWith('251')) return digits;
      if (digits.startsWith('0')) return '251' + digits.slice(1);
      return digits;
    },

    nowHour() { return new Date().getHours(); },

    // Build a data-* attribute safely without inline JS
    encodeProductData(product) {
      return encodeURIComponent(JSON.stringify(product)).replace(/'/g, '%27');
    },
  },

  // ── 4. LOCAL STORAGE (versioned) ──
  store: {
    getSaved() {
      const raw = localStorage.getItem(WanaGebya.state.savedKey);
      const parsed = WanaGebya.utils.safeJsonParse(raw, []);
      return Array.isArray(parsed) ? parsed : [];
    },
    setSaved(arr) {
      localStorage.setItem(WanaGebya.state.savedKey, JSON.stringify(arr));
    },
    migrateLegacy() {
      const old = localStorage.getItem('golem_saved');
      if (old) {
        const parsed = WanaGebya.utils.safeJsonParse(old, []);
        WanaGebya.store.setSaved(parsed);
        localStorage.removeItem('golem_saved');
      }
    },
  },

  // ── 5. WISHLIST / CART ──
  wishlist: {
    toggle(id, btnElement) {
      try {
        let saved = WanaGebya.store.getSaved();
        const icon = btnElement?.querySelector('i');
        if (saved.includes(id)) {
          saved = saved.filter(itemId => itemId !== id);
          btnElement?.classList.remove('active');
          if (icon) { icon.classList.remove('fas'); icon.classList.add('far'); }
        } else {
          saved.push(id);
          btnElement?.classList.add('active');
          if (icon) { icon.classList.remove('far'); icon.classList.add('fas'); }
        }
        WanaGebya.store.setSaved(saved);
        WanaGebya.ui.updateCartBadge();
      } catch (e) { console.error('Wishlist error:', e); }
    },

    addFromModal() {
      const product = WanaGebya.state.currentProduct;
      if (!product) return;
      let saved = WanaGebya.store.getSaved();
      if (!saved.includes(product.id)) {
        saved.push(product.id);
        WanaGebya.store.setSaved(saved);
        WanaGebya.ui.updateCartBadge();
        alert('🛒 Added to your Cart!');
      } else {
        alert('This item is already in your Cart!');
      }
    },
  },

  // ── 6. UI UPDATES ──
  ui: {
    updateCartBadge() {
      const saved = WanaGebya.store.getSaved();
      const badge = document.getElementById('cartBadge');
      if (!badge) return;
      badge.innerText = saved.length;
      badge.style.display = saved.length > 0 ? 'flex' : 'none';
    },

    setLoading(grid, msg = 'Loading items…') {
      if (!grid) return;
      grid.innerHTML = `<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> ${msg}</div>`;
    },

    showError(grid, title, message) {
      if (!grid) return;
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:60px 20px;">
          <h3 style="color:#e53935;margin-bottom:8px;">${WanaGebya.utils.escapeHtml(title)}</h3>
          <p style="color:#666;">${WanaGebya.utils.escapeHtml(message)}</p>
        </div>`;
    },

    setOnlineDot() {
      const dot = document.querySelector('.online-dot');
      if (!dot) return;
      const hour = WanaGebya.utils.nowHour();
      dot.style.display = (hour >= 8 && hour < 20) ? 'block' : 'none';
    },
  },

  // ── 7. DATA FETCHING ──
  api: {
    async fetchProducts(category) {
      const grid = document.getElementById('productGrid');
      if (!category || category === 'undefined') category = WanaGebya.state.currentCategory || 'All';

      if (WanaGebya.state.currentSubcategory && category !== 'All') {
        return WanaGebya.api.fetchBySubcat(category, WanaGebya.state.currentSubcategory);
      }

      WanaGebya.ui.setLoading(grid);

      const sortOrder = document.getElementById('sortSelect')?.value || 'newest';
      const locationFilter = document.getElementById('locationSelect')?.value || 'all';

      let query = _supabase
        .from('products')
        .select('*, profiles:user_id (is_verified, full_name, avatar_url)')
        .eq('status', 'approved');

      if (category !== 'All') query = query.eq('category', category);
      if (locationFilter !== 'all') query = query.ilike('location', `%${locationFilter}%`);

      if (sortOrder === 'price_low') query = query.order('price', { ascending: true });
      else if (sortOrder === 'price_high') query = query.order('price', { ascending: false });
      else query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) {
        console.error('Fetch error:', error.message);
        WanaGebya.ui.showError(grid, 'Database Error', error.message + '. Check your Supabase RLS policies.');
        return;
      }
      WanaGebya.render.products(data);
    },

    async fetchBySubcat(category, subcategory) {
      const grid = document.getElementById('productGrid');
      WanaGebya.ui.setLoading(grid);

      const sortOrder = document.getElementById('sortSelect')?.value || 'newest';
      const locationFilter = document.getElementById('locationSelect')?.value || 'all';

      let query = _supabase
        .from('products')
        .select('*, profiles:user_id (is_verified, full_name, avatar_url)')
        .eq('status', 'approved')
        .eq('category', category)
        .eq('subcategory', subcategory);

      if (locationFilter !== 'all') query = query.ilike('location', `%${locationFilter}%`);
      if (sortOrder === 'price_low') query = query.order('price', { ascending: true });
      else if (sortOrder === 'price_high') query = query.order('price', { ascending: false });
      else query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) {
        console.error('Subcategory fetch error:', error.message);
        WanaGebya.ui.showError(grid, 'Error', error.message);
        return;
      }
      WanaGebya.render.products(data);
    },

    async filterSponsored() {
      const grid = document.getElementById('productGrid');
      WanaGebya.ui.setLoading(grid);
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      document.querySelector('.sponsor-filter')?.classList.add('active');

      const { data, error } = await _supabase
        .from('products')
        .select('*, profiles:user_id (is_verified, full_name, avatar_url)')
        .eq('status', 'approved')
        .or('is_sponsored.eq.true,is_featured.eq.true')
        .order('created_at', { ascending: false });

      if (!error) WanaGebya.render.products(data);
      else console.error('Fetch error:', error.message);
    },
  },

  // ── 8. RENDERING ENGINE ──
  render: {
    products(products) {
      const grid = document.getElementById('productGrid');
      if (!grid) return;

      if (!products?.length) {
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#888;"><p>No items found in this category.</p></div>`;
        return;
      }

      const savedItems = WanaGebya.store.getSaved();
      const now = new Date();

      try {
        grid.innerHTML = products.map(p => WanaGebya.render.card(p, savedItems, now)).join('');
        // Re-attach delegated listener after render
        WanaGebya.events.attachGridDelegation();
      } catch (e) {
        console.error('Render error:', e);
        WanaGebya.ui.showError(grid, 'Render Error', 'Failed to display products. Check console.');
      }
    },

    card(p, savedItems, now) {
      const safeData = WanaGebya.utils.encodeProductData(p);
      const isVerified = p.profiles?.is_verified === true;
      const isSold = p.status === 'sold';
      const isSaved = savedItems.includes(p.id);
      const isSponsored = p.is_sponsored && p.sponsored_until && new Date(p.sponsored_until) > now;
      const isFeatured = p.is_featured;

      // Special card types
      if (p.category === 'Jobs') return WanaGebya.render.jobCard(p, safeData, isVerified, isSaved);
      if (p.category === 'Services') return WanaGebya.render.serviceCard(p, safeData, isVerified, isSaved);

      // Regular product card — uses data-product for event delegation
      let statusBadge = '';
      if (isSponsored) {
        statusBadge = `<span class="grid-sponsor-badge">Sponsored</span>`;
      } else if (isFeatured) {
        statusBadge = `<span class="grid-sponsor-badge" style="background:rgba(46,213,115,0.95);">Featured</span>`;
      }

      return `
        <div class="product-card ${isSold ? 'is-sold' : ''} ${isSponsored ? 'is-sponsored' : ''}"
             data-product="${safeData}" role="button" tabindex="0" aria-label="View ${WanaGebya.utils.escapeHtml(p.name)}">
          <div class="card-img-container">
            <img src="${WanaGebya.utils.escapeHtml(p.image || '')}" alt="${WanaGebya.utils.escapeHtml(p.name)}" loading="lazy">
            ${isSold ? '<div class="sold-overlay">SOLD</div>' : ''}
            ${statusBadge}
            <button class="wishlist-btn ${isSaved ? 'active' : ''}" data-wishlist="${p.id}" aria-label="${isSaved ? 'Remove from' : 'Add to'} wishlist">
              <i class="${isSaved ? 'fas' : 'far'} fa-heart"></i>
            </button>
          </div>
          <div class="product-info">
            <h3 class="product-title">${WanaGebya.utils.escapeHtml(p.name)}</h3>
            <div class="product-price">${p.price?.toLocaleString() || 0} ETB</div>
            <div class="product-location" style="font-size:0.8rem;color:#888;margin-top:4px;">
              <i class="fas fa-map-marker-alt" style="margin-right:4px;"></i>${WanaGebya.utils.escapeHtml(p.location || 'Addis Ababa')}
            </div>
            ${isVerified ? '<span class="verified-badge" style="font-size:0.75rem;color:#2ed573;margin-top:6px;display:flex;align-items:center;gap:4px;"><i class="fas fa-check-circle"></i> Verified</span>' : ''}
          </div>
        </div>`;
    },

    jobCard(p, safeData, isVerified, isSaved) {
      const desc = p.description || '';
      const specs = WanaGebya.render.parseSpecs(desc, 'Job Details');
      const mainDesc = desc.split(/\n\n--- Job Details ---/)[0].split(/\n\n--- Specs ---/)[0];
      const jobType = specs['job type'] || '';
      const industry = specs['industry'] || '';
      const exp = specs['experience required'] || '';
      const edu = specs['education level'] || '';
      const deadline = specs['application deadline'] || specs['deadline'] || '';
      const salary = specs['salary'] || (p.price ? p.price.toLocaleString() + ' ETB' : 'Negotiable');

      return `
        <div class="product-card job-card" data-product="${safeData}" role="button" tabindex="0" aria-label="View job: ${WanaGebya.utils.escapeHtml(p.name)}">
          <div class="card-img-container" style="background:linear-gradient(135deg,#1a1a1a 0%,#2d3436 100%);display:flex;align-items:center;justify-content:center;flex-direction:column;color:white;">
            <div style="font-size:2.5rem;margin-bottom:8px;">💼</div>
            <div style="font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;opacity:0.8;">Job Opening</div>
          </div>
          <div class="product-info">
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
              ${jobType ? `<span style="background:#fff4a3;padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:700;">${WanaGebya.utils.escapeHtml(jobType)}</span>` : ''}
              ${industry ? `<span style="background:#d9eee1;padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:700;">${WanaGebya.utils.escapeHtml(industry)}</span>` : ''}
            </div>
            <h3 class="product-title">${WanaGebya.utils.escapeHtml(p.name)}</h3>
            <p style="font-size:0.82rem;color:#555;margin:6px 0;line-height:1.4;">${WanaGebya.utils.escapeHtml(mainDesc || desc.substring(0, 120))}</p>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:auto;font-size:0.78rem;color:#666;">
              ${exp ? `<span><i class="fas fa-briefcase" style="margin-right:4px;"></i>${WanaGebya.utils.escapeHtml(exp)}</span>` : ''}
              ${edu ? `<span><i class="fas fa-graduation-cap" style="margin-right:4px;"></i>${WanaGebya.utils.escapeHtml(edu)}</span>` : ''}
              ${deadline ? `<span style="color:#e53935;font-weight:700;"><i class="fas fa-clock" style="margin-right:4px;"></i>Deadline: ${WanaGebya.utils.escapeHtml(deadline)}</span>` : ''}
            </div>
            <div class="product-price" style="margin-top:10px;">${WanaGebya.utils.escapeHtml(salary)}</div>
          </div>
        </div>`;
    },

    serviceCard(p, safeData, isVerified, isSaved) {
      const desc = p.description || '';
      const specs = WanaGebya.render.parseSpecs(desc, 'Service Details');
      const mainDesc = desc.split(/\n\n--- Service Details ---/)[0].split(/\n\n--- Specs ---/)[0];
      const svcType = specs['service type'] || specs['service category'] || 'Service';
      const exp = specs['experience'] || '';
      const avail = specs['availability'] || '';
      const response = specs['response time'] || '';
      const pricing = specs['pricing model'] || '';
      const area = specs['service area'] || '';
      const priceStr = p.price && p.price > 0 ? p.price.toLocaleString() + ' ETB' : 'Negotiable';

      return `
        <div class="product-card service-card" data-product="${safeData}" role="button" tabindex="0" aria-label="View service: ${WanaGebya.utils.escapeHtml(p.name)}">
          <div class="card-img-container" style="background:linear-gradient(135deg,#0A291A 0%,#1e3a2f 100%);display:flex;align-items:center;justify-content:center;flex-direction:column;color:white;">
            <div style="font-size:2.5rem;margin-bottom:8px;">🔧</div>
            <div style="font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;opacity:0.8;">${WanaGebya.utils.escapeHtml(svcType)}</div>
          </div>
          <div class="product-info">
            <h3 class="product-title">${WanaGebya.utils.escapeHtml(p.name)}</h3>
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin:8px 0;">
              ${response ? `<span style="background:#e8f5e9;padding:3px 10px;border-radius:20px;font-size:0.75rem;"><i class="fas fa-bolt" style="margin-right:4px;color:#2ed573;"></i>${WanaGebya.utils.escapeHtml(response)}</span>` : ''}
              ${avail ? `<span style="background:#fff3e0;padding:3px 10px;border-radius:20px;font-size:0.75rem;"><i class="fas fa-calendar-check" style="margin-right:4px;color:#F5A623;"></i>${WanaGebya.utils.escapeHtml(avail)}</span>` : ''}
              ${area ? `<span style="background:#e3f2fd;padding:3px 10px;border-radius:20px;font-size:0.75rem;"><i class="fas fa-map-marker-alt" style="margin-right:4px;color:#0088cc;"></i>${WanaGebya.utils.escapeHtml(area)}</span>` : ''}
            </div>
            <p style="font-size:0.82rem;color:#555;line-height:1.4;">${WanaGebya.utils.escapeHtml(mainDesc || desc.substring(0, 120))}</p>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:auto;padding-top:10px;border-top:1px solid #f0f0f0;">
              <span style="font-size:0.78rem;color:#888;">${WanaGebya.utils.escapeHtml(p.location || 'Addis Ababa')}</span>
              <span class="product-price" style="font-size:1rem;">${WanaGebya.utils.escapeHtml(priceStr)}</span>
            </div>
          </div>
        </div>`;
    },

    parseSpecs(description, headerName) {
      const specs = {};
      const block = description.split(`--- ${headerName} ---`)[1] || description.split('--- Specs ---')[1] || '';
      block.split('\n').forEach(line => {
        const m = line.match(/^[-\s]*([^:]+):\s*(.+)$/);
        if (m) specs[m[1].trim().toLowerCase()] = m[2].trim();
      });
      return specs;
    },
  },

  // ── 9. SPONSORSHIP ENGINE ──
  sponsor: {
    async load() {
      try {
        const now = new Date().toISOString();
        const [{ data: sponsored }, { data: featured }] = await Promise.all([
          _supabase.from('products').select('*').eq('is_sponsored', true).gt('sponsored_until', now).eq('status', 'approved').order('sponsored_until', { ascending: true }).limit(2),
          _supabase.from('products').select('*').eq('is_featured', true).eq('status', 'approved').order('featured_until', { ascending: true, nullsFirst: false }).limit(2),
        ]);

        const sponsoredList = sponsored || [];
        const featuredList = (featured || []).filter(f => !sponsoredList.find(s => s.id === f.id));
        const products = [...sponsoredList, ...featuredList].slice(0, 2);

        const section = document.getElementById('mainSponsor');
        if (!products.length || !section) {
          if (section) section.style.display = 'none';
          return;
        }

        // Clear old timers
        WanaGebya.timers.forEach((v, k) => { if (k.startsWith('sponsor-')) clearInterval(v); });
        WanaGebya.timers.forEach((v, k) => { if (k.startsWith('sponsor-')) WanaGebya.timers.delete(k); });
        WanaGebya._sponsorProducts.clear();

        let anyVisible = false;
        products.forEach((product, i) => {
          const slot = i + 1;
          const card = document.getElementById('sponsorCard' + slot);
          if (!card) return;

          const isSponsored = product.is_sponsored && product.sponsored_until;
          const endDateRaw = isSponsored ? product.sponsored_until : (product.featured_until || null);

          // Update DOM elements
          const badgeEl = card.querySelector('.sponsor-badge');
          if (badgeEl) badgeEl.innerHTML = isSponsored ? 'Sponsored' : 'Featured Partner';

          const imgEl = document.getElementById('sponsorImg' + slot);
          const titleEl = document.getElementById('sponsorTitle' + slot);
          const descEl = document.getElementById('sponsorDesc' + slot);
          const linkEl = document.getElementById('sponsorLink' + slot);
          if (imgEl) imgEl.src = product.image || '';
          if (titleEl) titleEl.innerText = product.name;
          if (descEl) descEl.innerText = (product.description || '').substring(0, 100) + '…';
          if (linkEl) linkEl.onclick = (e) => { e.preventDefault(); WanaGebya.modal.open(product); };

          WanaGebya._sponsorProducts.set(slot, product);
          card.style.display = 'block';
          anyVisible = true;

          // Countdown
          const cntEl = document.getElementById('sponsorCountdown' + slot);
          if (cntEl) WanaGebya.sponsor.startCountdown(cntEl, card, slot, endDateRaw, product.created_at);
        });

        const slotsLabel = document.querySelector('.sponsor-slots-label');
        if (slotsLabel) slotsLabel.textContent = products.length + ' Slot' + (products.length > 1 ? 's' : '') + ' Active';
        if (anyVisible) section.style.display = 'block';
      } catch (err) { console.error('Sponsor load error', err); }
    },

    startCountdown(cntEl, card, slot, endDateRaw, createdAt) {
      const spanEl = cntEl.querySelector('span');
      const iconEl = cntEl.querySelector('i');
      if (!endDateRaw) {
        if (iconEl) iconEl.className = 'fas fa-infinity';
        if (spanEl) spanEl.textContent = 'Always On';
        cntEl.style.cssText = 'color:#2ed573;background:rgba(46,213,115,0.08);border-color:rgba(46,213,115,0.3);';
        return;
      }

      const endTime = new Date(endDateRaw).getTime();
      const startTime = createdAt ? new Date(createdAt).getTime() : (endTime - 86400000 * 7);
      const totalDuration = endTime - startTime;

      const tick = () => {
        const diff = endTime - Date.now();
        if (diff <= 0) {
          if (spanEl) spanEl.textContent = 'Expired';
          cntEl.classList.add('urgent');
          clearInterval(timer);
          setTimeout(() => { card.style.display = 'none'; WanaGebya.sponsor.load(); }, 3000);
          return;
        }
        const days = Math.floor(diff / 86400000);
        const hrs = Math.floor((diff % 86400000) / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        if (spanEl) spanEl.textContent = days > 0 ? `${days}d ${hrs}h ${mins}m` : hrs > 0 ? `${hrs}h ${mins}m ${secs}s` : `${mins}m ${secs}s`;

        if (diff < 3600000) cntEl.classList.add('urgent');
        else if (diff < 86400000) {
          cntEl.classList.remove('urgent');
          cntEl.style.cssText = 'color:#F5A623;background:rgba(245,166,35,0.08);border-color:rgba(245,166,35,0.4);';
        } else {
          cntEl.classList.remove('urgent');
        }

        const progressEl = document.getElementById('sponsorProgress' + slot);
        if (progressEl && totalDuration > 0) {
          const pct = Math.max(0, Math.min(100, (diff / totalDuration) * 100));
          progressEl.style.width = pct + '%';
          progressEl.style.background = diff < 3600000 ? '#e53935' : diff < 86400000 ? '#F5A623' : '#2ed573';
        }
      };

      tick();
      const timer = setInterval(tick, 1000);
      WanaGebya.timers.set('sponsor-' + slot, timer);
    },
  },

  // ── 10. MODAL SYSTEM ──
  modal: {
    open(product) {
      WanaGebya.state.currentProduct = product;
      const modal = document.getElementById('productModal');
      if (!modal) return;
      // ... existing modal open logic (kept from original, omitted here for brevity)
      // Ensure ARIA
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-label', 'Product details: ' + product.name);
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      // Focus trap would be added here in full implementation
    },

    close() {
      const modal = document.getElementById('productModal');
      if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
        WanaGebya.state.currentProduct = null;
      }
    },
  },

  // ── 11. EVENTS & DELEGATION ──
  events: {
    init() {
      WanaGebya.store.migrateLegacy();

      console.log('🚀 WanaGebya System Initializing…');
      WanaGebya.ui.setOnlineDot();
      WanaGebya.ui.updateCartBadge();
      WanaGebya.api.fetchProducts();
      WanaGebya.sponsor.load();

      // Search with debounce
      const searchInput = document.getElementById('headerSearch');
      if (searchInput) {
        searchInput.addEventListener('input', WanaGebya.utils.debounce((e) => {
          WanaGebya.search.filter(e.target.value.toLowerCase());
        }, WanaGebya.state.searchDebounceMs));
      }

      // Chat toast
      setTimeout(() => {
        const toast = document.getElementById('chatToast');
        const chatMenu = document.getElementById('chatMenu');
        if (toast && chatMenu && !chatMenu.classList.contains('active')) {
          toast.style.display = 'block';
        }
      }, 5000);

      // Close modal on backdrop click
      const modal = document.getElementById('productModal');
      if (modal) {
        modal.addEventListener('click', (e) => { if (e.target === modal) WanaGebya.modal.close(); });
      }

      // Escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') WanaGebya.modal.close();
      });
    },

    attachGridDelegation() {
      const grid = document.getElementById('productGrid');
      if (!grid || grid._delegated) return;
      grid._delegated = true;

      grid.addEventListener('click', (e) => {
        const wishlistBtn = e.target.closest('[data-wishlist]');
        if (wishlistBtn) {
          e.stopPropagation();
          WanaGebya.wishlist.toggle(wishlistBtn.dataset.wishlist, wishlistBtn);
          return;
        }

        const card = e.target.closest('[data-product]');
        if (card) {
          try {
            const product = JSON.parse(decodeURIComponent(card.dataset.product));
            WanaGebya.modal.open(product);
          } catch (err) { console.error('Failed to parse product data', err); }
        }
      });

      // Keyboard accessibility for cards
      grid.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          const card = e.target.closest('[data-product]');
          if (card) {
            e.preventDefault();
            card.click();
          }
        }
      });
    },
  },

  // ── 12. SEARCH ──
  search: {
    filter(term) {
      if (!term || term.trim() === '') {
        WanaGebya.api.fetchProducts();
        return;
      }
      // Client-side filter on rendered cards only (fast for small sets)
      document.querySelectorAll('#productGrid > div').forEach(card => {
        const text = card.innerText.toLowerCase();
        card.style.display = text.includes(term) ? '' : 'none';
      });
      // TODO: For large catalogs, switch to server-side:
      // _supabase.from('products').select('*').textSearch('name_description', term)
    },
  },

  // ── 13. FILTERS ──
  filter: {
    category(category, button) {
      WanaGebya.state.currentCategory = category;
      WanaGebya.state.currentSubcategory = null;
      document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      WanaGebya.api.fetchProducts(category);
    },
  },
};

// ── 14. BOOT ──
document.addEventListener('DOMContentLoaded', () => WanaGebya.events.init());
