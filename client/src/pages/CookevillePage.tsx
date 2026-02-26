import SiteLayout from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import { BUSINESS, LOCATIONS } from "@shared/data";
import { LocationSchema } from "@/components/SchemaMarkup";
import {
  Phone, ArrowRight, MapPin, CheckCircle, Droplets, Home as HomeIcon,
  SquareStack, Filter, LayoutGrid, Triangle, Fence,
} from "lucide-react";
import { useEffect } from "react";
import { useCanonical } from "@/hooks/useCanonical";

// ─── FAQ Data for Schema + Rendering ────────────────────────────────
const COOKEVILLE_FAQ = [
  {
    q: "What towns do you serve around Cookeville?",
    a: "We serve Cookeville and many surrounding Upper Cumberland communities including Algood, Baxter, Sparta, and Livingston. If you live nearby, contact us and we'll confirm service availability for your location.",
  },
  {
    q: "How far do you travel from Cookeville?",
    a: "Most of our work is within Cookeville and the Upper Cumberland region. Travel availability depends on scheduling and distance. We're happy to confirm coverage and travel policies when you request a quote.",
  },
  {
    q: "How often should a home in Cookeville be washed?",
    a: "Most Cookeville homes benefit from exterior cleaning once per year, while shaded or wooded properties may benefit from twice per year. Pollen-heavy seasons and humidity can increase buildup quickly.",
  },
  {
    q: "Is pressure washing safe for my home?",
    a: "Yes — when performed correctly and with the right approach. Professional exterior cleaning is not \"blast everything with pressure.\" We use the correct method for each surface to avoid damage and deliver long-lasting results.",
  },
  {
    q: "Do you offer free estimates for Cookeville homeowners?",
    a: "Yes. We provide free estimates for homeowners in Cookeville and surrounding service areas. Use our quote form, call us, or request an estimate online.",
  },
  {
    q: "Can I bundle services for a better result?",
    a: "Yes. Many homeowners bundle window cleaning with house washing or concrete cleaning for a full curb-appeal transformation. Bundling also helps maintain a consistent clean appearance across the entire property.",
  },
];

// ─── Service Section Data ───────────────────────────────────────────
const SERVICE_SECTIONS = [
  {
    title: "Pressure Washing in Cookeville, TN",
    icon: Droplets,
    href: "/services/pressure_washing",
    linkText: "Pressure Washing Cookeville",
    intro: "Pressure washing is ideal for hard surfaces that collect heavy buildup. Many local homes have driveways, sidewalks, and patios that stain quickly from weather, traffic, and organic growth. Our services help restore these surfaces to a clean, bright finish.",
    items: [
      "Driveways and parking areas",
      "Sidewalks and walkways",
      "Patios and porches",
      "Pool decks and outdoor living spaces",
      "Brick, stone, and pavers (when appropriate)",
    ],
  },
  {
    title: "House Washing in Cookeville (Soft Washing)",
    icon: HomeIcon,
    href: "/services/house_washing",
    linkText: "House Washing Cookeville",
    intro: "Many local homes have vinyl siding, painted surfaces, brick exteriors, or trim that require a safe cleaning method. House washing is not \"blast it with pressure.\" We use a safer, professional approach to remove algae and grime without damaging your home.",
    items: [
      "Vinyl siding and trim",
      "Painted surfaces",
      "Brick exteriors with organic buildup",
      "Soffits, fascia, and gutters with visible staining",
    ],
  },
  {
    title: "Window Cleaning in Cookeville, TN",
    icon: SquareStack,
    href: "/services/window_cleaning",
    linkText: "Window Cleaning Cookeville",
    intro: "Clean windows dramatically change how a home looks and feels. Seasonal pollen and rain residue build up quickly on exterior glass. We provide professional cleaning designed to leave glass clear and streak-free.",
    items: [
      "Exterior window cleaning",
      "Interior window cleaning (available on request)",
      "Screen cleaning (available)",
      "Frame and sill detailing (service level dependent)",
    ],
  },
  {
    title: "Concrete Cleaning & Driveway Restoration",
    icon: LayoutGrid,
    href: "/services/driveway_cleaning",
    linkText: "Concrete Cleaning Cookeville",
    intro: "Concrete surfaces can stain from oil drips, algae growth, red clay residue, and seasonal debris. Professional cleaning restores brightness and improves curb appeal — especially before listing a home, hosting guests, or completing exterior improvements.",
    items: [
      "Driveways and sidewalks",
      "Patios and porches",
      "Garage approaches",
      "Outdoor steps and walkways",
    ],
  },
  {
    title: "Gutter Cleaning in Cookeville",
    icon: Filter,
    href: "/services/gutter_cleaning",
    linkText: "Gutter Cleaning Cookeville",
    intro: "Gutter cleaning is one of the most overlooked services in the Upper Cumberland — and one of the most important. When gutters overflow, water can damage fascia, stain siding, and increase the risk of foundation issues over time.",
    items: [
      "Restore proper water flow",
      "Reduce overflow during storms",
      "Protect rooflines and landscaping",
      "Prevent staining and water damage",
    ],
  },
  {
    title: "Roof Cleaning in Cookeville, TN (Soft Wash Roof Cleaning)",
    icon: Triangle,
    href: "/services/roof_cleaning",
    linkText: "Roof Cleaning Cookeville",
    intro: "Humidity and shaded areas often lead to black streaks on shingles. Those streaks are typically algae and organic buildup. Roof cleaning helps restore your roof's appearance and can improve the overall look of your home.",
    items: [
      "Remove dark streaking and organic buildup",
      "Improve curb appeal",
      "Reduce long-term grime accumulation",
      "Maintain a clean, well-cared-for property appearance",
    ],
  },
  {
    title: "Deck Cleaning in Cookeville",
    icon: Fence,
    href: "/services/deck_cleaning",
    linkText: "Deck Cleaning Cookeville",
    intro: "Decks and outdoor wood surfaces often collect grime, algae, and staining quickly. A professional deck cleaning helps restore the look of outdoor living areas and can prepare wood for sealing or staining.",
    items: [
      "Wood decks",
      "Composite decking",
      "Railings and stairs",
      "Patios with outdoor buildup",
    ],
  },
];

// ─── FAQ Schema Component ───────────────────────────────────────────
function CookevilleFAQSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: COOKEVILLE_FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function CookevillePage() {
  const location = LOCATIONS.find(l => l.id === "cookeville")!;
  useCanonical("/cookeville");

  useEffect(() => {
    document.title = "Exterior Cleaning in Cookeville, TN | Exterior Experts";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", "Professional pressure washing & exterior cleaning in Cookeville, TN. Licensed, insured, satisfaction guaranteed. Free quotes available.");
    }
  }, [location]);

  return (
    <SiteLayout>
      <LocationSchema location={location} />
      <CookevilleFAQSchema />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="bg-navy py-16 md:py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-navy-dark to-navy opacity-90" />
        <div className="container relative">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-sky" />
              <span className="text-sky font-semibold">Cookeville, TN — Home Base</span>
            </div>
            <h1 className="font-heading font-black text-3xl md:text-5xl text-white mb-6">
              Exterior Cleaning Services in Cookeville, TN
            </h1>
            <p className="text-lg text-white/80 mb-4 leading-relaxed">
              Homeowners in Cookeville take pride in keeping their properties clean and well-maintained — but Tennessee weather makes exterior buildup inevitable. Between humidity, seasonal pollen, and frequent rain, it's common to see algae on siding, dark roof streaks, stained concrete, and clogged gutters.
            </p>
            <p className="text-lg text-white/80 mb-4 leading-relaxed">
              Exterior Experts provides professional exterior cleaning across Cookeville and the Upper Cumberland region. From restoring stained driveways to brightening home exteriors, our goal is simple: deliver premium results, protect your property, and make your home look its best.
            </p>
            <p className="text-base text-white/70 mb-8 leading-relaxed">
              We also serve Algood, Baxter, Sparta, and Livingston — and we're known for meticulous work, reliable scheduling, and a detail-first approach.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/instant-quote">
                <Button size="lg" className="bg-sky hover:bg-sky-light text-white font-bold">
                  Get Your Free Quote <ArrowRight className="w-4 h-4 ml-2" />
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

      {/* ── Why Cookeville Homes Need Regular Exterior Cleaning ── */}
      <section className="py-16 bg-white">
        <div className="container max-w-4xl">
          <h2 className="font-heading font-bold text-2xl md:text-3xl mb-6">
            Why Cookeville Homes Need Regular Exterior Cleaning
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            The Upper Cumberland climate causes exterior surfaces to collect grime faster than most homeowners expect. If your home is near trees, shaded areas, or high-traffic roads, buildup happens even faster. Here are the most common issues we see:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {[
              "Green algae and mildew on siding, soffits, and shaded walls",
              "Pollen, dust, and residue on windows and trim during spring and summer",
              "Oil stains, tire marks, and organic staining on driveways and concrete",
              "Dark roof streaks caused by algae buildup on shingles",
              "Overflowing gutters from leaves, debris, and seasonal storms",
              "Slippery surfaces on patios, walkways, and pool areas after wet seasons",
            ].map((issue, i) => (
              <div key={i} className="flex gap-3 items-start">
                <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-foreground text-sm">{issue}</p>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Routine exterior cleaning doesn't just improve curb appeal — it helps protect surfaces long-term and reduces the risk of permanent staining or deterioration.
          </p>
        </div>
      </section>

      {/* ── What We Do for Cookeville Homeowners ─────────────── */}
      <section className="py-16 bg-secondary">
        <div className="container max-w-4xl">
          <h2 className="font-heading font-bold text-2xl md:text-3xl mb-4">
            What We Do for Cookeville Homeowners
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-10">
            We offer a full range of services designed for local homeowners. Below is a breakdown of what we do and how each service helps.
          </p>

          <div className="space-y-8">
            {SERVICE_SECTIONS.map((svc) => {
              const Icon = svc.icon;
              return (
                <Card key={svc.href} className="border-2 overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex items-center gap-3 px-6 py-4 bg-white border-b">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="font-heading font-bold text-lg">{svc.title}</h3>
                    </div>
                    <div className="p-6">
                      <p className="text-muted-foreground leading-relaxed mb-4">{svc.intro}</p>
                      <ul className="space-y-2 mb-4">
                        {svc.items.map((item, i) => (
                          <li key={i} className="flex gap-2 items-start text-sm">
                            <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                      <Link href={svc.href}>
                        <span className="text-sm font-semibold text-primary flex items-center gap-1 hover:underline cursor-pointer">
                          Visit our {svc.linkText} page for full details <ArrowRight className="w-4 h-4" />
                        </span>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Why Local Matters ────────────────────────────────── */}
      <section className="py-16 bg-white">
        <div className="container max-w-4xl">
          <h2 className="font-heading font-bold text-2xl md:text-3xl mb-6">
            Why Local Matters in Cookeville & Upper Cumberland
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Choosing a local company isn't just about convenience — it affects the quality of service you get. We're based right here in the Upper Cumberland, which means:
          </p>
          <div className="space-y-3 mb-6">
            {[
              "Faster scheduling and local availability",
              "Better understanding of regional buildup patterns",
              "Familiarity with Upper Cumberland weather cycles",
              "Trusted local reputation and repeat service relationships",
            ].map((item, i) => (
              <div key={i} className="flex gap-3 items-start">
                <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-foreground">{item}</p>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground leading-relaxed">
            We're not a national chain cycling through contractors. We're a local team that wants to be your go-to provider for exterior cleaning year after year.
          </p>
        </div>
      </section>

      {/* ── Areas We Serve Near Cookeville ────────────────────── */}
      <section className="py-16 bg-secondary">
        <div className="container max-w-4xl">
          <h2 className="font-heading font-bold text-2xl md:text-3xl mb-6">
            Areas We Serve Near Cookeville
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            We provide services across the Upper Cumberland, including:
          </p>
          <div className="flex flex-wrap gap-3 mb-6">
            {LOCATIONS.map((loc) => (
              <Link key={loc.id} href={`/locations/${loc.slug}`}>
                <Button
                  variant={loc.id === "cookeville" ? "default" : "outline"}
                  size="sm"
                  className={loc.id === "cookeville"
                    ? "bg-primary text-white font-bold"
                    : "border-primary/30 text-primary hover:bg-primary hover:text-white font-medium"
                  }
                >
                  <MapPin className="w-3.5 h-3.5 mr-1.5" />
                  {loc.name}, {loc.state}
                </Button>
              </Link>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            And nearby rural and residential areas across the region. If you're outside Cookeville, reach out — we'll confirm availability and travel details.
          </p>
        </div>
      </section>

      {/* ── Cookeville Exterior Cleaning FAQs ─────────────────── */}
      <section className="py-16 bg-white">
        <div className="container max-w-4xl">
          <h2 className="font-heading font-bold text-2xl md:text-3xl mb-8">
            Cookeville Exterior Cleaning FAQs
          </h2>
          <div className="space-y-0">
            {COOKEVILLE_FAQ.map((faq, i) => (
              <div key={i}>
                <div className="py-5">
                  <h3 className="font-heading font-bold text-base mb-2">{faq.q}</h3>
                  <p className="text-muted-foreground leading-relaxed">{faq.a}</p>
                </div>
                {i < COOKEVILLE_FAQ.length - 1 && <Separator />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="py-16 bg-navy text-center">
        <div className="container">
          <h2 className="font-heading font-bold text-3xl text-white mb-4">
            Get a Free Quote in Cookeville, TN
          </h2>
          <p className="text-white/80 mb-4 max-w-2xl mx-auto">
            Whether you need your home washed, driveway restored, windows cleaned, or gutters cleared, we'll provide a clear quote and professional service from start to finish.
          </p>
          <p className="text-white/70 mb-8">Call now or request your free estimate online.</p>
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

      {/* ── Other Areas ──────────────────────────────────────── */}
      <section className="py-12 bg-secondary">
        <div className="container">
          <h3 className="font-heading font-bold text-xl mb-6 text-center">Other Areas We Serve</h3>
          <div className="flex flex-wrap justify-center gap-3">
            {LOCATIONS.filter((l) => l.id !== "cookeville").map((l) => (
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
