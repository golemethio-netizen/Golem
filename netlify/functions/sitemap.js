
// netlify/functions/sitemap.js
//
// Generates sitemap.xml on the fly from live Supabase product data, so new
// listings show up automatically without editing a static file.
//
// Wire-up (in netlify.toml, project root):
//   [[redirects]]
//     from = "/sitemap.xml"
//     to = "/.netlify/functions/sitemap"
//     status = 200

const SUPABASE_URL = 'https://ryeylhawdmykbbmnfrrh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5ZXlsaGF3ZG15a2JibW5mcnJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MzU4NjcsImV4cCI6MjA4NjIxMTg2N30.6FpidGEaunpf8AwBIpjKwcC3a53iWmvaRxctj2ZYrSY'; // same public anon key from config.js — safe to include, RLS protects the data

exports.handler = async function () {
    // Static pages worth indexing. Left out on purpose: my-items.html, saved.html,
    // profile.html (logged-in/personal pages), admin.html (private), submit.html (unused).
    const staticPages = [
        { loc: 'https://wanagebya.com/', changefreq: 'daily', priority: '1.0' },
        { loc: 'https://wanagebya.com/sell.html', changefreq: 'monthly', priority: '0.8' },
    ];

    let products = [];
    try {
        const res = await fetch(
            `${SUPABASE_URL}/rest/v1/products?status=eq.approved&select=id,name,created_at&order=created_at.desc`,
            { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
        );
        if (res.ok) products = await res.json();
    } catch (err) {
        console.error('sitemap: failed to fetch products', err);
        // fall through and still return the static pages rather than a broken sitemap
    }

    const staticXml = staticPages.map(p => `
  <url>
    <loc>${p.loc}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('');

    const productXml = products.map(p => {
        const lastmod = (p.created_at || new Date().toISOString()).slice(0, 10);
        return `
  <url>
    <loc>https://wanagebya.com/product.html?id=${p.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
    }).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${staticXml}${productXml}
</urlset>`;

    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/xml; charset=utf-8' },
        body: xml
    };
};
