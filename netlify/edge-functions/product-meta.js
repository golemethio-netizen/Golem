// netlify/edge-functions/product-meta.js
//
// WhatsApp, Telegram, and Facebook link-preview crawlers never execute
// JavaScript, so a client-rendered product.html always shows the same
// generic title/image no matter which product was shared. This Edge
// Function runs on Netlify's servers (Deno), fetches the real product from
// Supabase, and rewrites the <head> meta tags before the HTML is sent —
// so every shared product link gets its own real photo, name, and price.
//
// Wire-up (in netlify.toml, project root):
//   [[edge_functions]]
//     path = "/product.html"
//     function = "product-meta"

const SUPABASE_URL = 'https://ryeylhawdmykbbmnfrrh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5ZXlsaGF3ZG15a2JibW5mcnJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MzU4NjcsImV4cCI6MjA4NjIxMTg2N30.6FpidGEaunpf8AwBIpjKwcC3a53iWmvaRxctj2ZYrSY'; // same public anon key from config.js

export default async (request, context) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const response = await context.next(); // the original static product.html

    if (!id) return response; // no product id in the URL, nothing to inject

    let product = null;
    try {
        const res = await fetch(
            `${SUPABASE_URL}/rest/v1/products?id=eq.${encodeURIComponent(id)}&select=name,description,image,price&limit=1`,
            { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
        );
        if (res.ok) {
            const rows = await res.json();
            product = rows[0] || null;
        }
    } catch (err) {
        console.error('product-meta edge function: fetch failed', err);
    }

    if (!product) return response; // product not found / fetch failed — serve the page unchanged

    const escAttr = (s) => String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

    const title = `${product.name} - ${product.price ? product.price.toLocaleString() + ' ETB' : 'Contact for price'} | WanaGebya`;
    const description = escAttr((product.description || '').slice(0, 160));
    const image = product.image || 'https://wanagebya.com/default-og.png';
    const pageUrl = url.toString();

    let html = await response.text();

    // Replace the existing <title>, add/replace OG + Twitter tags, add canonical.
    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escAttr(title)}</title>`);

    const metaBlock = `
  <meta property="og:title" content="${escAttr(title)}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${escAttr(image)}">
  <meta property="og:type" content="product">
  <meta property="og:url" content="${escAttr(pageUrl)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="description" content="${description}">
  <link rel="canonical" href="${escAttr(pageUrl)}">
</head>`;

    html = html.replace('</head>', metaBlock);

    return new Response(html, {
        status: response.status,
        headers: response.headers
    });
};
