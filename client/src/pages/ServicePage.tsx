import SiteLayout from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { BUSINESS, SERVICES, LOCATIONS, SEED_GALLERY } from "@shared/data";
import { ServiceSchema } from "@/components/SchemaMarkup";
import { Phone, ArrowRight, CheckCircle, Star, Shield, Clock } from "lucide-react";
import { useCanonical } from "@/hooks/useCanonical";
import { usePageMeta } from "@/hooks/usePageMeta";
import { trackEvent } from "@/lib/analytics";

interface ServicePageProps {
  serviceId: string;
  locationId?: string;
}

const SERVICE_CONTENT: Record<string, {
  intro: string;
  benefits: string[];
  process: { title: string; desc: string }[];
  faq: { q: string; a: string }[];
  whyItMatters: string;
}> = {
  house_washing: {
    intro: "Tennessee's humidity is brutal on siding. Between the rain, shade, and warm temperatures, mold, mildew, and algae can take hold fast — especially on north-facing walls and under eaves. That green and black buildup isn't just ugly. Left alone, it eats into paint, degrades vinyl, and can even work its way behind siding where it causes moisture damage you won't see until it's expensive to fix. Our soft wash process kills that growth at the root and rinses it away without putting any stress on your siding. We use low pressure — about what comes out of a garden hose — combined with professional-grade cleaning solutions that do the heavy lifting. It's safe for vinyl, wood, brick, stucco, and painted surfaces.",
    benefits: [
      "Kills mold, mildew, and algae at the root — not just the surface",
      "Low-pressure soft wash that won't damage siding, paint, or trim",
      "Biodegradable cleaning solutions safe for your landscaping and pets",
      "Restores your home's original color and curb appeal",
      "Helps prevent long-term moisture damage behind siding",
    ],
    process: [
      { title: "Walk the property", desc: "We check every wall for problem areas, note your siding type, and cover anything that needs protection — plants, outdoor furniture, light fixtures." },
      { title: "Apply the soft wash solution", desc: "Our cleaning mix goes on at low pressure. It soaks into the mold and algae and starts breaking it down within minutes." },
      { title: "Let it dwell", desc: "The solution needs time to work. We let it sit long enough to kill the growth all the way to the root, not just bleach the surface." },
      { title: "Rinse clean", desc: "We rinse everything off with low pressure, working top to bottom. No high-pressure blasting, no risk to your siding." },
      { title: "Final walkthrough", desc: "We walk the property with you and make sure every wall looks right before we pack up." },
    ],
    faq: [
      { q: "Is soft washing safe for my siding?", a: "Yes. Soft washing uses pressure similar to a garden hose. The cleaning solution does the work, not the water pressure. It's safe for vinyl, wood, stucco, brick, and painted surfaces. Shingle manufacturers actually recommend this method for roof cleaning too." },
      { q: "How often should I have my house washed?", a: "Once a year is a good baseline for most homes in the Cookeville area. If your house sits in heavy shade or backs up to woods, you might benefit from going every 8-10 months. We'll let you know what makes sense for your situation." },
      { q: "How long does it take?", a: "A typical 2,000 square foot home takes about 1.5 to 2 hours. Larger homes or heavily stained surfaces can take up to 3 hours. We'll give you a time estimate when you book." },
      { q: "Will it kill my plants?", a: "We take precautions to protect your landscaping — wetting plants down before and after, and using biodegradable solutions. In thousands of jobs, we've never damaged a customer's plants." },
    ],
    whyItMatters: "A clean house isn't just about looks. Mold and algae hold moisture against your siding, which accelerates wear and can lead to rot on wood surfaces. Regular washing extends the life of your paint and siding, protects your investment, and keeps your home looking the way it should. Most homeowners are surprised at the difference — it's one of the highest-impact things you can do for your property's appearance.",
  },
  pressure_washing: {
    intro: "Concrete, brick, and stone are tough materials, but they're also porous. Over time, dirt, oil, tire marks, algae, and moss work their way into the surface and no amount of garden hose spraying will get them out. That's where professional pressure washing comes in. We use commercial-grade surface cleaners that spin at high RPM to deliver even, consistent results without the streaky lines you get from a regular pressure washer wand. The difference between a DIY job and what we do is night and day.",
    benefits: [
      "Removes embedded oil stains, tire marks, and ground-in dirt",
      "Eliminates slippery algae and moss that create fall hazards",
      "Even, streak-free results from commercial surface cleaning equipment",
      "Restores the original look of concrete, brick, and stone",
      "Post-treatment available to slow regrowth",
    ],
    process: [
      { title: "Assess the surface", desc: "We check your concrete for oil stains, heavy soiling, and any cracks or damage that need attention before we start." },
      { title: "Pre-treat problem areas", desc: "Oil stains and heavy buildup get a degreaser application before we wash. This breaks down the tough stuff so the pressure washer can do its job." },
      { title: "Surface clean", desc: "We use a commercial surface cleaner — a spinning disc that delivers even pressure across a wide area. No tiger stripes, no uneven patches." },
      { title: "Detail the edges", desc: "Edges along the garage, sidewalk cracks, and expansion joints get hand-wanded for a clean finish everywhere." },
      { title: "Post-treat if needed", desc: "For surfaces prone to algae regrowth, we can apply a post-treatment that slows down the return of green growth." },
    ],
    faq: [
      { q: "What surfaces can you pressure wash?", a: "Concrete driveways, sidewalks, patios, pool decks, brick, stone, and pavers. We adjust our pressure and technique for each surface type. We don't pressure wash siding or roofs — those get the soft wash treatment." },
      { q: "Will pressure washing damage my concrete?", a: "Not when it's done right. We use the correct PSI, proper nozzle tips, and surface cleaning equipment designed for even results. The damage you see from pressure washing usually comes from people using the wrong settings or holding the wand too close." },
      { q: "Can you get oil stains out?", a: "Most oil stains improve significantly with degreaser and hot water treatment. Deep, old stains may lighten rather than disappear completely, but the improvement is usually dramatic. We'll be honest about what to expect." },
    ],
    whyItMatters: "Your driveway is the first thing people see when they pull up to your house. A clean driveway and walkway make the whole property look maintained. Beyond appearance, algae and moss on concrete create genuine slip-and-fall hazards, especially when wet. Regular pressure washing keeps your outdoor surfaces safe, clean, and looking like they should.",
  },
  window_cleaning: {
    intro: "There's a reason professional window cleaning exists — it's one of those jobs that's harder than it looks. Squeegee technique, the right soap mix, getting screens and tracks clean, reaching second and third story windows safely — it all adds up. We handle interior and exterior windows, screen cleaning, and track detailing. The result is glass so clear you'll forget it's there.",
    benefits: [
      "Streak-free, crystal-clear glass inside and out",
      "Screen removal, cleaning, and reinstallation",
      "Window track and frame detailing",
      "Safe cleaning of second and third story windows",
      "Extends window life by removing corrosive mineral deposits",
    ],
    process: [
      { title: "Count and inspect", desc: "We count every window, check for damage or broken seals, and note any screens that need cleaning." },
      { title: "Remove screens", desc: "If you've added screen cleaning, we pull them out, wash them, and set them aside to dry while we work on the glass." },
      { title: "Clean tracks and frames", desc: "Dirt builds up in window tracks and along frames. We clean these out so your windows look good from every angle." },
      { title: "Wash the glass", desc: "Professional squeegee technique on every pane — no paper towels, no Windex, no streaks." },
      { title: "Reinstall and inspect", desc: "Screens go back in, we check every window for missed spots, and we're done." },
    ],
    faq: [
      { q: "Do you clean both interior and exterior?", a: "Yes. You can choose exterior only, interior only, or both. Our instant quote tool lets you pick exactly what you need and see the price for each option." },
      { q: "Do you clean screens?", a: "Screen cleaning is available as an add-on. We remove them, wash them, and put them back. It's worth doing — dirty screens make clean windows look dirty from inside." },
      { q: "How often should I get my windows cleaned?", a: "Two to four times a year is ideal depending on your preferences and how much pollen, dust, and rain your windows catch. A lot of our customers do it twice a year — spring and fall." },
    ],
    whyItMatters: "Clean windows change the way your home feels. More natural light gets in, rooms look bigger, and the whole place just feels brighter. From the outside, clean windows are one of those details that separate a well-maintained home from one that's been neglected. It's a small thing that makes a big difference.",
  },
  gutter_cleaning: {
    intro: "Clogged gutters cause more damage than most homeowners realize. When water can't flow through your gutters and downspouts, it backs up under your shingles, overflows down your fascia, pools around your foundation, and erodes your landscaping. In winter, clogged gutters lead to ice dams that can cause serious roof damage. We clean out all the debris by hand, flush your downspouts to make sure they're draining, and check for any damage while we're up there.",
    benefits: [
      "Prevents water damage to your roof, fascia, and foundation",
      "Removes leaves, sticks, shingle grit, and packed debris",
      "Downspout flushing to confirm proper drainage",
      "Visual inspection for damage, loose brackets, and leaks",
      "Prevents pest nesting — clogged gutters attract birds, wasps, and mosquitoes",
    ],
    process: [
      { title: "Inspect gutters and downspouts", desc: "We check the full length of your gutters, note any damage or areas of concern, and plan our approach." },
      { title: "Hand-clean all debris", desc: "We remove leaves, sticks, shingle grit, and packed buildup by hand. No blowers or high-pressure methods that can damage gutters." },
      { title: "Flush downspouts", desc: "We run water through every downspout to make sure they're draining freely and not clogged further down." },
      { title: "Check for damage", desc: "While we're up there, we look for loose brackets, sagging sections, leaks, or damage that might need attention." },
      { title: "Final walkthrough", desc: "We show you what we found and let you know if any repairs are recommended." },
    ],
    faq: [
      { q: "How often should gutters be cleaned?", a: "At least once a year, ideally in fall after leaves drop. If you have a lot of trees, twice a year (spring and fall) is better. In winter, ice dams form in clogged gutters, which can cause serious damage." },
      { q: "What if my gutters are damaged?", a: "We'll let you know what we find. Minor issues like loose brackets can often be tightened during cleaning. For major damage, we can recommend contractors or discuss options." },
      { q: "Do you clean gutters on all roof types?", a: "Yes. We're comfortable working on all roof types — shingle, metal, tile, etc. We adjust our technique based on your roof." },
    ],
    whyItMatters: "Gutters are one of those things homeowners don't think about until something goes wrong. But clogged gutters lead to water damage that's expensive to fix — rotted fascia, foundation issues, basement water intrusion, and roof damage. Regular gutter cleaning is cheap insurance against much bigger problems.",
  },
  roof_cleaning: {
    intro: "Roof stains, moss, and algae aren't just cosmetic. They hold moisture against your shingles, which accelerates deterioration and can lead to leaks. We use a soft wash approach — not high-pressure blasting, which can damage shingles and void warranties. Our method kills the growth at the root, rinses it away safely, and helps extend your roof's life.",
    benefits: [
      "Removes algae, moss, and lichen that damage shingles",
      "Soft wash method that won't void roof warranties",
      "Extends roof life by preventing moisture retention",
      "Improves curb appeal and home value",
      "Prevents premature shingle deterioration",
    ],
    process: [
      { title: "Inspect the roof", desc: "We check for damage, loose shingles, and areas of heavy growth before we start." },
      { title: "Apply soft wash solution", desc: "Our cleaning solution goes on at low pressure, soaking into the algae and moss to kill it at the root." },
      { title: "Let it work", desc: "The solution needs time to do its job. We let it dwell long enough to kill the growth effectively." },
      { title: "Rinse carefully", desc: "We rinse with low pressure, working from top to bottom. No shingle damage, no warranty issues." },
      { title: "Final inspection", desc: "We check the roof to make sure the job is complete and no damage occurred." },
    ],
    faq: [
      { q: "Is soft washing safe for my roof?", a: "Yes. Soft washing uses low pressure and professional cleaning solutions. It's safe for all shingle types and won't void your roof warranty. High-pressure washing, on the other hand, can damage shingles and is often not recommended by manufacturers." },
      { q: "How often should a roof be cleaned?", a: "It depends on your roof's condition and local climate. Most roofs benefit from cleaning every 2-3 years. If you see moss or algae growth, that's a sign it's time." },
      { q: "Will this prevent moss from coming back?", a: "Our cleaning removes existing growth and kills spores. However, moss can return over time, especially in shaded areas. Regular cleaning helps keep it under control." },
    ],
    whyItMatters: "A clean roof looks better and lasts longer. Algae and moss hold moisture against your shingles, which speeds up deterioration. If left unchecked, this can lead to leaks and expensive repairs. Regular roof cleaning is a preventive measure that protects your investment.",
  },
  deck_cleaning: {
    intro: "Decks take a beating from weather, foot traffic, and organic growth. Over time, dirt, algae, and mildew work into the wood grain, making the surface slippery and accelerating wood deterioration. We clean your deck thoroughly without damaging the wood, leaving it looking fresh and ready for sealing or staining if you choose.",
    benefits: [
      "Removes dirt, algae, mildew, and organic buildup",
      "Restores the natural color of your wood",
      "Makes the deck safer by removing slippery growth",
      "Prepares the surface for sealing or staining",
      "Extends deck life by removing moisture-trapping growth",
    ],
    process: [
      { title: "Inspect the deck", desc: "We check for loose boards, damage, and areas of heavy growth before we start." },
      { title: "Pre-treat problem areas", desc: "Heavy mildew or algae growth gets a pre-treatment to break it down." },
      { title: "Clean the surface", desc: "We use low-pressure washing with appropriate cleaning solutions to remove buildup without damaging the wood." },
      { title: "Clean between boards", desc: "We pay special attention to cracks and gaps where debris and growth accumulate." },
      { title: "Final rinse and inspection", desc: "We rinse thoroughly and check for any missed spots." },
    ],
    faq: [
      { q: "Will pressure washing damage my deck?", a: "Not when done correctly. We use low pressure and the right technique for wood decks. High-pressure washing can splinter wood and cause damage." },
      { q: "Should I seal my deck after cleaning?", a: "It's a good idea. Cleaning removes the protective layer, so sealing afterward helps protect the wood and extend the deck's life. We can recommend sealers or contractors if needed." },
      { q: "How often should a deck be cleaned?", a: "Once a year is typical. If your deck gets heavy shade or is surrounded by trees, twice a year might be better." },
    ],
    whyItMatters: "Your deck is where you spend time with family, grill out, and relax. A clean deck is more inviting, safer to walk on, and lasts longer. If you're planning to stain or seal, cleaning first is essential — stain won't adhere properly to a dirty surface. It's a straightforward job that makes a real difference in how you use and enjoy your outdoor space.",
  },
};

export default function ServicePage({ serviceId, locationId }: ServicePageProps) {
  const service = SERVICES.find(s => s.id === serviceId)!;
  const location = (locationId ? LOCATIONS.find(l => l.id === locationId) : LOCATIONS.find(l => l.id === "cookeville"))!;
  
  // Determine the canonical path based on service and location
  const canonicalPath = locationId && locationId !== "cookeville" && location
    ? `/services/${service.slug}`
    : `/services/${service.slug}`;
  useCanonical(canonicalPath);

  const content = SERVICE_CONTENT[serviceId] || SERVICE_CONTENT.pressure_washing;
  const relatedImages = SEED_GALLERY.filter(g => g.service === serviceId).slice(0, 4);
  const locationName = `${location.name}, ${location.state}`;
  const pageTitle = `${service.name} in ${locationName}`;

  usePageMeta({
    title: `${service.name} in ${locationName} | Exterior Experts`,
    description: service.metaDescription,
    image: relatedImages[0]?.url,
  });

  return (
    <SiteLayout>
      <ServiceSchema service={service} location={location} faq={content.faq} />
      {/* Hero */}
      <section className="bg-navy py-16 md:py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-navy-dark to-navy opacity-90" />
        <div className="container relative">
          <div className="max-w-3xl">
            <p className="text-sky font-semibold mb-2">{BUSINESS.name}</p>
            <h1 className="font-heading font-black text-3xl md:text-5xl text-white mb-4">
              {pageTitle}
            </h1>
            <p className="text-lg text-white/80 mb-6 leading-relaxed">{service.description}</p>
            <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/instant-quote">
                <Button
                  size="lg"
                  className="bg-sky hover:bg-sky-light text-white font-bold"
                  onClick={() => trackEvent("cta_click", { location: "service_hero", service: service.id, action: "instant_quote" })}
                >
                  Get Instant Quote <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <a href={`tel:${BUSINESS.phoneRaw}`}>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10 font-bold"
                  onClick={() => trackEvent("cta_click", { location: "service_hero", service: service.id, action: "call" })}
                >
                  <Phone className="w-4 h-4 mr-2" /> {BUSINESS.phone}
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Intro + Images */}
      <section className="py-16 bg-white">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="font-heading font-bold text-2xl md:text-3xl mb-6">
                {service.name} in the Upper Cumberland
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">{content.intro}</p>
              <div className="space-y-3">
                {content.benefits.map((b, i) => (
                  <div key={i} className="flex gap-3">
                    <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-foreground text-sm">{b}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {relatedImages.map((img, i) => (
                <img key={i} src={img.url} alt={img.title} className="rounded-lg object-cover h-48 w-full" />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Our Process */}
      <section className="py-16 bg-navy/5">
        <div className="container">
          <h2 className="font-heading font-bold text-2xl md:text-3xl mb-12 text-center">Our Process</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
            {content.process.map((step, i) => (
              <div key={i} className="relative">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary text-white font-bold">
                      {i + 1}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-lg mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why It Matters */}
      <section className="py-16 bg-white">
        <div className="container max-w-3xl">
          <h2 className="font-heading font-bold text-2xl md:text-3xl mb-6">Why It Matters</h2>
          <p className="text-muted-foreground leading-relaxed text-lg">{content.whyItMatters}</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-navy/5">
        <div className="container max-w-3xl">
          <h2 className="font-heading font-bold text-2xl md:text-3xl mb-12 text-center">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {content.faq.map((item, i) => (
              <div key={i}>
                <h3 className="font-heading font-bold text-lg mb-3">{item.q}</h3>
                <p className="text-muted-foreground leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Related Services */}
      <section className="py-16 bg-white">
        <div className="container">
          <h2 className="font-heading font-bold text-2xl md:text-3xl mb-8">Related Services</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {SERVICES.filter(s => s.id !== serviceId).slice(0, 3).map(s => (
              <Link key={s.id} href={`/services/${s.slug}`}>
                <Card className="group hover:shadow-md transition-all cursor-pointer h-full">
                  <CardContent className="p-6">
                    <h3 className="font-heading font-bold text-lg mb-2 group-hover:text-primary transition-colors">{s.name}</h3>
                    <p className="text-sm text-muted-foreground">{s.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary text-white">
        <div className="container text-center">
          <h2 className="font-heading font-bold text-3xl md:text-4xl mb-6">Ready to Get Started?</h2>
          <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">Get your free estimate today. No obligation, no pressure — just honest pricing and professional service.</p>
          <Link href="/instant-quote">
            <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-bold">
              Get Instant Quote <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </SiteLayout>
  );
}
