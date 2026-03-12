import { BUSINESS, SERVICES, LOCATIONS, type ServiceDef, type LocationDef } from "@shared/data";

// ─── Helper: inject JSON-LD into head ────────────────────────────────
function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// ─── LocalBusiness Schema (Homepage) ─────────────────────────────────
export function LocalBusinessSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${typeof window !== "undefined" ? window.location.origin : ""}/#business`,
    name: BUSINESS.name,
    description: `Professional power washing, soft washing, and window cleaning services serving ${BUSINESS.city}, TN and the Upper Cumberland region. Licensed, insured, and satisfaction guaranteed.`,
    url: typeof window !== "undefined" ? window.location.origin : "",
    telephone: BUSINESS.phone,
    email: BUSINESS.email,
    image: BUSINESS.logoLargeUrl,
    logo: BUSINESS.logoUrl,
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS.address,
      addressLocality: BUSINESS.city,
      addressRegion: BUSINESS.state,
      postalCode: BUSINESS.zip,
      addressCountry: "US",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: BUSINESS.baseLat,
      longitude: BUSINESS.baseLng,
    },
    areaServed: LOCATIONS.map((loc) => ({
      "@type": "City",
      name: loc.name,
      containedInPlace: {
        "@type": "State",
        name: "Tennessee",
      },
    })),
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "07:00",
        closes: "19:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Saturday",
        opens: "08:00",
        closes: "17:00",
      },
    ],
    priceRange: "$$",
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Exterior Cleaning Services",
      itemListElement: SERVICES.map((s) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: s.name,
          description: s.description,
        },
      })),
    },
    sameAs: [BUSINESS.googleMapsUrl, BUSINESS.facebook, BUSINESS.instagram],
  };

  return <JsonLd data={schema} />;
}

// ─── Service Schema (Service Pages) ──────────────────────────────────
export function ServiceSchema({
  service,
  location,
  faq,
}: {
  service: ServiceDef;
  location: LocationDef;
  faq: { q: string; a: string }[];
}) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const locationName = `${location.name}, ${location.state}`;

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${service.name} in ${locationName}`,
    description: service.description,
    provider: {
      "@type": "LocalBusiness",
      "@id": `${origin}/#business`,
      name: BUSINESS.name,
      telephone: BUSINESS.phone,
      address: {
        "@type": "PostalAddress",
        streetAddress: BUSINESS.address,
        addressLocality: BUSINESS.city,
        addressRegion: BUSINESS.state,
        postalCode: BUSINESS.zip,
        addressCountry: "US",
      },
    },
    areaServed: {
      "@type": "City",
      name: location.name,
      containedInPlace: {
        "@type": "State",
        name: "Tennessee",
      },
    },
    serviceType: service.name,
    url: `${origin}/services/${service.slug}`,
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: origin,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Services",
        item: `${origin}/services`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `${service.name} in ${locationName}`,
        item: `${origin}/services/${service.slug}`,
      },
    ],
  };

  const faqSchema = faq.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  } : null;

  return (
    <>
      <JsonLd data={serviceSchema} />
      <JsonLd data={breadcrumbSchema} />
      {faqSchema && <JsonLd data={faqSchema} />}
    </>
  );
}

// ─── Location Schema (City Pages) ────────────────────────────────────
export function LocationSchema({ location }: { location: LocationDef }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const locationName = `${location.name}, ${location.state}`;

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `Pressure Washing & Window Cleaning in ${locationName}`,
    description: `Professional power washing, soft washing, and window cleaning services in ${locationName}. Licensed & insured. Satisfaction guaranteed.`,
    provider: {
      "@type": "LocalBusiness",
      "@id": `${origin}/#business`,
      name: BUSINESS.name,
      telephone: BUSINESS.phone,
    },
    areaServed: {
      "@type": "City",
      name: location.name,
      containedInPlace: {
        "@type": "State",
        name: "Tennessee",
      },
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: `Exterior Cleaning Services in ${locationName}`,
      itemListElement: SERVICES.map((s) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: `${s.name} in ${locationName}`,
          description: s.description,
        },
      })),
    },
    url: `${origin}/locations/${location.slug}`,
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: origin,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Service Areas",
        item: `${origin}/locations`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: locationName,
        item: `${origin}/locations/${location.slug}`,
      },
    ],
  };

  return (
    <>
      <JsonLd data={serviceSchema} />
      <JsonLd data={breadcrumbSchema} />
    </>
  );
}

// ─── Breadcrumb Schema (Generic) ─────────────────────────────────────
export function BreadcrumbSchema({
  items,
}: {
  items: { name: string; url: string }[];
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return <JsonLd data={schema} />;
}

// ─── WebSite Schema (Homepage) ───────────────────────────────────────
export function WebSiteSchema() {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: BUSINESS.name,
    url: origin,
    description: `Professional power washing, soft washing, and window cleaning services in ${BUSINESS.city}, TN and the Upper Cumberland region.`,
    publisher: {
      "@type": "LocalBusiness",
      "@id": `${origin}/#business`,
      name: BUSINESS.name,
    },
  };

  return <JsonLd data={schema} />;
}
