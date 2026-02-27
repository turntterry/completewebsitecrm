import type { Express, Request, Response } from "express";
import { SERVICES, LOCATIONS } from "../../shared/data";

function getBaseUrl(req: Request) {
  const host = req.get("host");
  const protocol = req.protocol || "https";
  return `${protocol}://${host}`;
}

function buildUrl(base: string, path: string) {
  if (path.startsWith("http")) return path;
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}

function renderSitemapXml(baseUrl: string) {
  const staticPaths = ["/", "/gallery", "/contact", "/service-areas", "/instant-quote", "/cookeville"];
  const servicePaths = SERVICES.map(s => `/services/${s.slug}`);
  const locationPaths = LOCATIONS.map(l => `/locations/${l.slug}`);
  const allPaths = [...staticPaths, ...servicePaths, ...locationPaths];
  const lastmod = new Date().toISOString();

  const urlSet = allPaths
    .map(path => `  <url>\n    <loc>${buildUrl(baseUrl, path)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${path === "/" ? "1.0" : "0.7"}</priority>\n  </url>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlSet}\n</urlset>`;
}

export function registerSeoRoutes(app: Express) {
  // robots.txt for the marketing site. CRM/admin paths are disallowed; public pages remain crawlable.
  app.get("/robots.txt", (req: Request, res: Response) => {
    const sitemapUrl = buildUrl(getBaseUrl(req), "/sitemap.xml");
    const body = [
      "User-agent: *",
      "Disallow: /admin",
      "Disallow: /client",
      "Disallow: /portal",
      "Disallow: /field",
      "Disallow: /login",
      `Sitemap: ${sitemapUrl}`,
      "",
    ].join("\n");

    res.type("text/plain").send(body);
  });

  app.get("/sitemap.xml", (req: Request, res: Response) => {
    const xml = renderSitemapXml(getBaseUrl(req));
    res.type("application/xml").send(xml);
  });
}
