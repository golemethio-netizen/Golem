// netlify/edge-functions/product-meta.js
//
// Runs on requests to /product.html. Fetches the real product from Supabase
// and rewrites the <head> meta tags (title, description, og:*, canonical)
// before the HTML reaches the browser or a crawler. This matters because
// link-preview bots (Telegram, WhatsApp, Facebook) and most search engine
// crawlers do NOT execute your client-side JS — they only ever see the raw
// HTML response, so without this, every shared product link shows the same
// generic homepage title/image instead of that product's own.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://ryeylhawdmykbbmnfrrh.supabase.co";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SITE_URL = "https://wanagebya.com";

function escapeAttr(str) {
    if (str === null || str === undefined) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

export default async (request, context) => {
    const url = new URL(request.url);
    const productId = url.searchParams.get("id");

    // No id in the URL — nothing to personalize, serve the page as-is.
    if (!productId) {
        return context.next();
    }

    if (!SUPABASE_ANON_KEY) {
        console.error("product-meta: SUPABASE_ANON_KEY env var not set");
        return context.next();
    }

    let product = null;
    try {
        const res = await fetch(
            `${SUPABASE_URL}/rest/v1/products?id=eq.${encodeURIComponent(productId)}&status=eq.approved&select=name,price,location,image,description`,
            {
                headers: {
                    apikey: SUPABASE_ANON_KEY,
                    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                },
            }
        );
        if (res.ok) {
            const rows = await res.json();
            product = rows?.[0] || null;
        }
    } catch (err) {
        console.error("product-meta: fetch failed", err);
    }

    // Get the original static HTML response
    const response = await context.next();

    // No product found (bad id, pending, deleted) — serve original page untouched
    if (!product) {
        return response;
    }

    const title = `${product.name} — ${Number(product.price).toLocaleString()} ETB | WanaGebya`;
    const description = product.description
        ? String(product.description).split('\n')[0].slice(0, 160)
        : `${product.name} for sale on WanaGebya${product.location ? ' in ' + product.location : ''}.`;
    const image = product.image || `${SITE_URL}/logo.png`;
    const pageUrl = `${SITE_URL}/product.html?id=${encodeURIComponent(productId)}`;

    const escTitle = escapeAttr(title);
    const escDesc = escapeAttr(description);
    const escImage = escapeAttr(image);
    const escUrl = escapeAttr(pageUrl);

    class HeadRewriter {
        element(el) {
            // Replace <title>...</title> content
            if (el.tagName === "title") {
                el.setInnerContent(escTitle);
            }
        }
    }

    class MetaRewriter {
        constructor(attr, matchValue, newContent) {
            this.attr = attr;
            this.matchValue = matchValue;
            this.newContent = newContent;
        }
        element(el) {
            const val = el.getAttribute(this.attr);
            if (val === this.matchValue) {
                el.setAttribute("content", this.newContent);
            }
        }
    }

    class CanonicalRewriter {
        element(el) {
            el.setAttribute("href", escUrl);
        }
    }

    return new HTMLRewriter()
        .on("title", new HeadRewriter())
        .on('meta[property="og:title"]', new MetaRewriter("property", "og:title", escTitle))
        .on('meta[property="og:description"]', new MetaRewriter("property", "og:description", escDesc))
        .on('meta[property="og:image"]', new MetaRewriter("property", "og:image", escImage))
        .on('meta[property="og:url"]', new MetaRewriter("property", "og:url", escUrl))
        .on('meta[name="description"]', new MetaRewriter("name", "description", escDesc))
        .on('link[rel="canonical"]', new CanonicalRewriter())
        .transform(response);
};

export const config = {
    path: "/product.html",
};
