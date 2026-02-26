import SiteLayout from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { BUSINESS, SERVICES, LOCATIONS } from "@shared/data";
import { LocationSchema } from "@/components/SchemaMarkup";
import { Phone, ArrowRight, MapPin, CheckCircle } from "lucide-react";
import { useEffect } from "react";
import { useCanonical } from "@/hooks/useCanonical";

interface LocationPageProps {
  locationId: string;
}

const LOCATION_CONTENT: Record<string, { intro: string; localNote: string }> = {
  cookeville: {
    intro: "Cookeville is home base for Exterior Experts. We live here, work here, and clean homes throughout the city — from the established neighborhoods near Tennessee Tech to the newer developments off Interstate Drive and South Willow. Cookeville's mix of mature trees and Tennessee humidity means mold, mildew, and algae are a constant battle for homeowners. We see it on siding, roofs, driveways, and decks all year round.",
    localNote: "Because we're based right here on Webb Ave, Cookeville customers benefit from the shortest response times and no travel surcharges. Most Cookeville jobs can be scheduled within a few days of your quote.",
  },
  baxter: {
    intro: "Baxter is just a short drive from our home base in Cookeville, and we clean homes there regularly. The rural properties and wooded lots around Baxter tend to see heavier mold and algae growth due to shade coverage, which makes regular exterior cleaning even more important for protecting your siding and roof.",
    localNote: "Baxter falls well within our standard service radius, so there's no travel surcharge. We're usually able to schedule Baxter jobs within the same week as your quote.",
  },
  algood: {
    intro: "Algood sits right next to Cookeville, and we serve homeowners there just as frequently as we do in town. Whether you're in one of the established neighborhoods or a newer subdivision, the same Tennessee humidity and shade conditions that affect Cookeville homes affect yours too — and we treat them the same way.",
    localNote: "Algood is practically next door to our base of operations. No travel fees, fast scheduling, and the same quality work we deliver everywhere we go.",
  },
  sparta: {
    intro: "Sparta and the White County area are well within our service range. We make regular trips to Sparta for house washing, pressure washing, window cleaning, and gutter work. The homes around Sparta deal with the same mold, algae, and weathering issues as the rest of the Upper Cumberland, and our soft wash and pressure washing methods handle them effectively.",
    localNote: "Sparta is about 30 minutes from our Cookeville base. We schedule Sparta jobs in clusters when possible to keep things efficient, which means we can usually get to you within a week of your quote.",
  },
  livingston: {
    intro: "We serve homeowners in Livingston and the surrounding Overton County area. Livingston's location in the Upper Cumberland means the same humidity-driven mold and algae problems that affect homes across the region. Our crew makes regular trips to Livingston for all of our exterior cleaning services.",
    localNote: "Livingston is within our 40-mile service radius. We group Livingston jobs together for efficiency and can typically schedule your service within a week.",
  },
};

export default function LocationPage({ locationId }: LocationPageProps) {
  const location = LOCATIONS.find(l => l.id === locationId);
  if (!location) return null;

  const locationName = `${location.name}, ${location.state}`;
  useCanonical(`/locations/${location.slug}`);

  useEffect(() => {
    document.title = `Exterior Cleaning ${location.name}, TN | Exterior Experts`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", `Professional pressure washing & exterior cleaning in ${locationName}. Licensed, insured, satisfaction guaranteed. Free quotes.`);
    }
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      metaKeywords.setAttribute("content", `pressure washing ${location.name} TN, exterior cleaning ${location.name}, house washing ${location.name} TN`);
    }
  }, [location]);
  const content = LOCATION_CONTENT[locationId] || {
    intro: `We proudly serve homeowners in ${location.name} and the surrounding area with professional exterior cleaning services.`,
    localNote: `${location.name} is within our service area. Use our instant quote tool to check pricing for your address.`,
  };

  return (
    <SiteLayout>
      <LocationSchema location={location} />
      {/* Hero */}
      <section className="bg-navy py-16 md:py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-navy-dark to-navy opacity-90" />
        <div className="container relative">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-sky" />
              <span className="text-sky font-semibold">Service Area</span>
            </div>
            <h1 className="font-heading font-black text-3xl md:text-5xl text-white mb-4">
              Pressure Washing & Exterior Cleaning in {locationName}
            </h1>
            <p className="text-lg text-white/80 mb-6 leading-relaxed">{location.description}</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/instant-quote">
                <Button size="lg" className="bg-sky hover:bg-sky-light text-white font-bold">
                  Get Instant Quote <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <a href={`tel:${BUSINESS.phoneRaw}`}>
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 font-bold">
                  <Phone className="w-4 h-4 mr-2" /> {BUSINESS.phone}
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* About this area */}
      <section className="py-16 bg-white">
        <div className="container max-w-4xl">
          <h2 className="font-heading font-bold text-2xl md:text-3xl mb-6">
            Exterior Cleaning in {location.name}
          </h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>{content.intro}</p>
            <p>{content.localNote}</p>
          </div>
        </div>
      </section>

      {/* Services available */}
      <section className="py-16 bg-secondary">
        <div className="container">
          <h2 className="font-heading font-bold text-2xl md:text-3xl text-center mb-4">
            Services We Offer in {location.name}
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Every service we offer in Cookeville is available in {location.name}. Same crew, same equipment, same results.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map(service => (
              <Link key={service.id} href={`/services/${service.slug}`}>
                <Card className="group h-full hover:shadow-lg transition-all cursor-pointer hover:border-primary/30">
                  <CardContent className="p-6">
                    <h3 className="font-heading font-bold text-lg mb-2 group-hover:text-primary transition-colors">
                      {service.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">{service.description}</p>
                    <span className="text-sm font-semibold text-primary flex items-center gap-1">
                      Learn More <ArrowRight className="w-4 h-4" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="py-16 bg-white">
        <div className="container max-w-3xl">
          <h2 className="font-heading font-bold text-2xl md:text-3xl text-center mb-8">
            Why {location.name} Homeowners Choose Us
          </h2>
          <div className="space-y-4">
            {[
              `Based in Cookeville — ${location.name} is in our regular service area`,
              "Fully insured with a satisfaction guarantee on every job",
              "Instant online quotes so you know the price before we show up",
              "Professional equipment and solutions that get results without damage",
              "Flexible scheduling — book online whenever it works for you",
              "5-star Google reviews from your neighbors across the Upper Cumberland",
            ].map((item, i) => (
              <div key={i} className="flex gap-3 items-start">
                <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-foreground">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-navy text-center">
        <div className="container">
          <h2 className="font-heading font-bold text-3xl text-white mb-4">
            Get a Free Quote for Your {location.name} Home
          </h2>
          <p className="text-white/80 mb-8">Instant pricing. No obligation. No hidden fees.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/instant-quote">
              <Button size="lg" className="bg-sky hover:bg-sky-light text-white font-bold">
                Get Instant Quote <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <a href={`tel:${BUSINESS.phoneRaw}`}>
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 font-bold">
                <Phone className="w-4 h-4 mr-2" /> {BUSINESS.phone}
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Other areas */}
      <section className="py-12 bg-secondary">
        <div className="container">
          <h3 className="font-heading font-bold text-xl mb-6 text-center">Other Areas We Serve</h3>
          <div className="flex flex-wrap justify-center gap-3">
            {LOCATIONS.filter(l => l.id !== locationId).map(l => (
              <Link key={l.id} href={`/locations/${l.slug}`}>
                <Button variant="outline" size="sm" className="border-primary/30 text-primary hover:bg-primary hover:text-white">
                  {l.name}, {l.state}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
