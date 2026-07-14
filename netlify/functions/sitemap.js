// netlify/functions/sitemap.js
//
// Generates sitemap.xml dynamically on every request, including one <url>
// entry per approved product — not just the static pages. This matters a
// lot for a marketplace: individual listings are your real SEO content,
// and a static sitemap can never keep up with new/removed products.
//
// Exposed by default at /.netlify/functions/sitemap — mapped to /sitemap.xml
// via the redirect in netlify.toml (see below).

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ryeylhawdmykbbmnfrrh.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5ZXlsaGF3ZG15a2JibW5mcnJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MzU4NjcsImV4cCI6MjA4NjIxMTg2N30.6FpidGEaunpf8AwBIpjKwcC3a53iWmvaRxctj2ZYrSY';
const SITE_URL = "https://wanagebya.com";

function escapeXml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

exports.handler = async function () {
    const staticUrls = [
        { loc: `${SITE_URL}/`, changefreq: "daily", priority: "1.0" },
        { loc: `${SITE_URL}/sell.html`, changefreq: "monthly", priority: "0.8" },
    ];

    let products = [];
    if (SUPABASE_ANON_KEY) {
        try {
            const res = await fetch(
                `${SUPABASE_URL}/rest/v1/products?status=eq.approved&select=id,updated_at&order=updated_at.desc&limit=5000`,
                {
                    headers: {
                        apikey: SUPABASE_ANON_KEY,
                        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                    },
                }
            );
            if (res.ok) {
                products = await res.json();
            } else {
                console.error("sitemap: Supabase responded", res.status);
            }
        } catch (err) {
            console.error("sitemap: fetch failed", err);
        }
    } else {
        console.error("sitemap: SUPABASE_ANON_KEY env var not set");
    }

    const today = new Date().toISOString().split("T")[0];

    const staticXml = staticUrls
        .map(
            (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
        )
        .join("\n");

    const productXml = products
        .map((p) => {
            const lastmod = p.updated_at ? p.updated_at.split("T")[0] : today;
            return `  <url>
    <loc>${escapeXml(`${SITE_URL}/product.html?id=${p.id}`)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`;
        })
        .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticXml}
${productXml}
</urlset>`;

    return {
        statusCode: 200,
        headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600", // cache 1hr so we're not hitting Supabase on every crawl
        },
        body: xml,
    };
};
