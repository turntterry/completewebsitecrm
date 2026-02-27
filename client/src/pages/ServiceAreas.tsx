import SiteLayout from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { BUSINESS, LOCATIONS } from "@shared/data";
import { BreadcrumbSchema } from "@/components/SchemaMarkup";
import { MapPin, ArrowRight, Phone } from "lucide-react";
import { MapView } from "@/components/Map";
import { useRef } from "react";
import { useCanonical } from "@/hooks/useCanonical";
import { usePageMeta } from "@/hooks/usePageMeta";
import { trackEvent } from "@/lib/analytics";

export default function ServiceAreas() {
  useCanonical("/service-areas");
  usePageMeta({
    title: "Service Areas | Exterior Experts | Cookeville & Upper Cumberland",
    description: "We serve Cookeville, Baxter, Algood, Sparta, Livingston and the broader Upper Cumberland with pressure washing, house washing, windows, gutters, and roof cleaning.",
  });
  const mapRef = useRef<google.maps.Map | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <SiteLayout>
      <BreadcrumbSchema items={[
        { name: "Home", url: origin },
        { name: "Service Areas", url: `${origin}/service-areas` },
      ]} />
      <section className="bg-navy py-16 md:py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-navy-dark to-navy opacity-90" />
        <div className="container relative">
          <h1 className="font-heading font-black text-3xl md:text-5xl text-white mb-4">
            Our Service Areas
          </h1>
          <p className="text-lg text-white/80 max-w-2xl">
            Exterior Experts proudly serves Cookeville and the entire Upper Cumberland region within a 40-mile radius.
          </p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <h2 className="font-heading font-bold text-2xl md:text-3xl mb-6">
                Serving the Upper Cumberland
              </h2>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Based in Cookeville, Tennessee, we provide professional pressure washing, house washing, window cleaning, and more to homeowners throughout the Upper Cumberland region. Our service area extends approximately 40 miles from our base location.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {LOCATIONS.map(loc => (
                  <Link key={loc.id} href={`/locations/${loc.slug}`}>
                    <Card
                      className="group hover:shadow-md transition-all cursor-pointer hover:border-primary/30 h-full"
                      onClick={() => trackEvent("city_click", { location: "service_areas_grid", city: loc.id })}
                    >
                      <CardContent className="p-4 flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-primary shrink-0" />
                        <div>
                          <h3 className="font-heading font-bold text-sm">{loc.name}, {loc.state}</h3>
                          <span className="text-xs text-primary flex items-center gap-1 mt-1">
                            View Details <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
            <div className="rounded-xl overflow-hidden shadow-lg">
              <MapView
                className="h-[400px] lg:h-full min-h-[400px]"
                initialCenter={{ lat: BUSINESS.baseLat, lng: BUSINESS.baseLng }}
                initialZoom={9}
                onMapReady={(map) => {
                  mapRef.current = map;
                  // Add markers for each location
                  LOCATIONS.forEach(loc => {
                    new google.maps.marker.AdvancedMarkerElement({
                      map,
                      position: { lat: loc.lat, lng: loc.lng },
                      title: `${loc.name}, ${loc.state}`,
                    });
                  });
                  // Add circle for service radius
                  new google.maps.Circle({
                    map,
                    center: { lat: BUSINESS.baseLat, lng: BUSINESS.baseLng },
                    radius: 40 * 1609.34, // 40 miles in meters
                    fillColor: "#1e3a5f",
                    fillOpacity: 0.1,
                    strokeColor: "#1e3a5f",
                    strokeOpacity: 0.3,
                    strokeWeight: 2,
                  });
                }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-navy text-center">
        <div className="container">
          <h2 className="font-heading font-bold text-3xl text-white mb-4">
            Not Sure If We Serve Your Area?
          </h2>
          <p className="text-white/80 mb-8">Enter your address in our instant quote tool and we'll let you know!</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/instant-quote">
              <Button
                size="lg"
                className="bg-sky hover:bg-sky-light text-white font-bold"
                onClick={() => trackEvent("cta_click", { location: "service_areas_bottom", action: "instant_quote" })}
              >
                Check Your Address <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <a href={`tel:${BUSINESS.phoneRaw}`}>
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 font-bold"
                onClick={() => trackEvent("cta_click", { location: "service_areas_bottom", action: "call" })}
              >
                <Phone className="w-4 h-4 mr-2" /> {BUSINESS.phone}
              </Button>
            </a>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
