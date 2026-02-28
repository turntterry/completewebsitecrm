import SiteLayout from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { SEED_GALLERY, SERVICES } from "@shared/data";
import { BreadcrumbSchema } from "@/components/SchemaMarkup";
import { trpc } from "@/lib/trpc";
import { ArrowRight, X } from "lucide-react";
import { useState, useMemo } from "react";
import { useCanonical } from "@/hooks/useCanonical";
import { usePageMeta } from "@/hooks/usePageMeta";
import { trackEvent } from "@/lib/analytics";

export default function Gallery() {
  useCanonical("/gallery");
  usePageMeta({
    title: "Exterior Cleaning Gallery | Before & After | Exterior Experts",
    description: "Browse real pressure washing, house washing, roof, gutter, and window cleaning projects across Cookeville & Upper Cumberland.",
  });
  const { data: dbImages } = trpc.publicSite.gallery.list.useQuery();
  const [filter, setFilter] = useState("all");
  const [lightbox, setLightbox] = useState<string | null>(null);

  const allImages = useMemo(() => {
    const db = (dbImages || []).map(img => ({
      url: img.url,
      title: img.title || "Gallery Image",
      service: img.service || "general",
    }));
    // Combine DB images with seed gallery, avoiding duplicates
    const dbUrls = new Set(db.map(i => i.url));
    const seed = SEED_GALLERY.filter(s => !dbUrls.has(s.url));
    return [...db, ...seed];
  }, [dbImages]);

  const filtered = filter === "all" ? allImages : allImages.filter(i => i.service === filter);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <SiteLayout>
      <BreadcrumbSchema items={[
        { name: "Home", url: origin },
        { name: "Gallery", url: `${origin}/gallery` },
      ]} />
      <section className="bg-navy py-16 md:py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-navy-dark to-navy opacity-90" />
        <div className="container relative">
          <h1 className="font-heading font-black text-3xl md:text-5xl text-white mb-4">
            Our Work Gallery
          </h1>
          <p className="text-lg text-white/80">
            See the difference professional exterior cleaning makes.
          </p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="container">
          {/* Filter tabs */}
          <div className="flex flex-wrap gap-2 mb-8 justify-center">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setFilter("all");
                trackEvent("gallery_filter", { filter: "all" });
              }}
              className={filter === "all" ? "bg-primary text-white" : ""}
            >
              All
            </Button>
            {SERVICES.map(s => (
              <Button
                key={s.id}
                variant={filter === s.id ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setFilter(s.id);
                  trackEvent("gallery_filter", { filter: s.id });
                }}
                className={filter === s.id ? "bg-primary text-white" : ""}
              >
                {s.shortName}
              </Button>
            ))}
          </div>

          {/* Image grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((img, i) => (
              <div
                key={i}
                className="relative group overflow-hidden rounded-xl aspect-square cursor-pointer"
                onClick={() => {
                  setLightbox(img.url);
                  trackEvent("gallery_open", { service: img.service || "general" });
                }}
              >
                <img
                  src={img.url}
                  alt={img.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white font-semibold text-sm">{img.title}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No images found for this category.
            </div>
          )}
        </div>
      </section>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white" onClick={() => setLightbox(null)}>
            <X className="w-8 h-8" />
          </button>
          <img src={lightbox} alt="Gallery" className="max-w-full max-h-[90vh] object-contain rounded-lg" />
        </div>
      )}

      <section className="py-16 bg-navy text-center">
        <div className="container">
          <h2 className="font-heading font-bold text-3xl text-white mb-4">
            Want Results Like These?
          </h2>
          <p className="text-white/80 mb-8">Get an instant quote and see how affordable professional cleaning can be.</p>
          <Link href="/instant-quote">
            <Button
              size="lg"
              className="bg-sky hover:bg-sky-light text-white font-bold"
              onClick={() => trackEvent("cta_click", { location: "gallery_bottom", action: "instant_quote" })}
            >
              Get Instant Quote <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </SiteLayout>
  );
}
