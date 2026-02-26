import { useState } from "react";
import { Link, useLocation } from "wouter";
import { BUSINESS, SERVICES, LOCATIONS } from "@shared/data";
import { Phone, Mail, MapPin, Menu, X, ChevronDown, Settings, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  {
    label: "Services",
    href: "#",
    children: SERVICES.map(s => ({
      label: s.name,
      href: `/services/${s.slug}`,
    })),
  },
  {
    label: "Service Areas",
    href: "/service-areas",
    children: LOCATIONS.map(l => ({
      label: `${l.name}, ${l.state}`,
      href: `/locations/${l.slug}`,
    })),
  },
  { label: "Gallery", href: "/gallery" },
  { label: "Contact", href: "/contact" },
];

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

function TopBar() {
  return (
    <div className="bg-navy text-white text-sm py-2 hidden md:block">
      <div className="container flex justify-between items-center">
        <div className="flex items-center gap-6">
          <a href={`tel:${BUSINESS.phoneRaw}`} className="flex items-center gap-1.5 hover:text-sky-light transition-colors">
            <Phone className="w-3.5 h-3.5" />
            {BUSINESS.phone}
          </a>
          <a href={`mailto:${BUSINESS.email}`} className="flex items-center gap-1.5 hover:text-sky-light transition-colors">
            <Mail className="w-3.5 h-3.5" />
            {BUSINESS.email}
          </a>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" />
          Serving Cookeville, Baxter, Algood, Sparta & Livingston, TN
        </div>
      </div>
    </div>
  );
}

function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [location] = useLocation();

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="container flex items-center justify-between h-16 md:h-20">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <img
            src={BUSINESS.logoUrl}
            alt={BUSINESS.name}
            className="h-12 md:h-16 w-auto"
          />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map(link => (
            <div
              key={link.label}
              className="relative group"
              onMouseEnter={() => link.children && setOpenDropdown(link.label)}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              {link.children ? (
                <button className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors">
                  {link.label}
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              ) : (
                <Link
                  href={link.href}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    location === link.href ? "text-primary" : "text-foreground hover:text-primary"
                  }`}
                >
                  {link.label}
                </Link>
              )}
              {link.children && openDropdown === link.label && (
                <div className="absolute top-full left-0 bg-white shadow-lg rounded-lg border py-2 min-w-[220px] z-50">
                  {link.children.map(child => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className="block px-4 py-2 text-sm text-foreground hover:bg-secondary hover:text-primary transition-colors"
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* CTA + Mobile Toggle */}
        <div className="flex items-center gap-3">
          <Link href="/instant-quote">
            <Button className="bg-primary hover:bg-navy-light text-white font-semibold text-sm px-4 py-2 hidden sm:inline-flex">
              Get Instant Quote
            </Button>
          </Link>
          <a href={`tel:${BUSINESS.phoneRaw}`} className="lg:hidden">
            <Button variant="outline" size="icon" className="border-primary text-primary">
              <Phone className="w-4 h-4" />
            </Button>
          </a>
          <button
            className="lg:hidden p-2 text-foreground"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border-t shadow-lg">
          <nav className="container py-4 space-y-1">
            {NAV_LINKS.map(link => (
              <div key={link.label}>
                {link.children ? (
                  <div>
                    <button
                      className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-foreground"
                      onClick={() => setOpenDropdown(openDropdown === link.label ? null : link.label)}
                    >
                      {link.label}
                      <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === link.label ? "rotate-180" : ""}`} />
                    </button>
                    {openDropdown === link.label && (
                      <div className="pl-4 space-y-1">
                        {link.children.map(child => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className="block px-3 py-2 text-sm text-muted-foreground hover:text-primary"
                            onClick={() => setMobileOpen(false)}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    href={link.href}
                    className="block px-3 py-2.5 text-sm font-medium text-foreground hover:text-primary"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                )}
              </div>
            ))}
            <div className="pt-3 px-3">
              <Link href="/instant-quote" onClick={() => setMobileOpen(false)}>
                <Button className="w-full bg-primary hover:bg-navy-light text-white font-semibold">
                  Get Instant Quote
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

function DiscreetManageLink() {
  const { user, loading } = useAuth();
  if (loading || !user || user.role !== "admin") return null;
  return (
    <Link href="/admin" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
      Manage Site
    </Link>
  );
}

function Footer() {
  return (
    <footer className="bg-navy text-white">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <img src={BUSINESS.logoUrl} alt={BUSINESS.name} className="h-14 w-auto mb-4 brightness-0 invert" />
            <p className="text-sm text-gray-300 leading-relaxed">
              Professional power washing & window cleaning serving the Upper Cumberland region. Licensed, insured, and satisfaction guaranteed.
            </p>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-heading font-bold text-lg mb-4">Our Services</h3>
            <ul className="space-y-2">
              {SERVICES.map(s => (
                <li key={s.id}>
                  <Link href={`/services/${s.slug}`} className="text-sm text-gray-300 hover:text-white transition-colors">
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Service Areas */}
          <div>
            <h3 className="font-heading font-bold text-lg mb-4">Service Areas</h3>
            <ul className="space-y-2">
              {LOCATIONS.map(l => (
                <li key={l.id}>
                  <Link href={`/locations/${l.slug}`} className="text-sm text-gray-300 hover:text-white transition-colors">
                    {l.name}, {l.state}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-heading font-bold text-lg mb-4">Contact Us</h3>
            <div className="space-y-3">
              <a href={`tel:${BUSINESS.phoneRaw}`} className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors">
                <Phone className="w-4 h-4 shrink-0" />
                {BUSINESS.phone}
              </a>
              <a href={`mailto:${BUSINESS.email}`} className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors">
                <Mail className="w-4 h-4 shrink-0" />
                {BUSINESS.email}
              </a>
              <div className="flex items-start gap-2 text-sm text-gray-300">
                <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{BUSINESS.fullAddress}</span>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <a href={BUSINESS.facebook} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-sky transition-colors" aria-label="Facebook">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
              <a href={BUSINESS.instagram} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-sky transition-colors" aria-label="Instagram">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
              <a href={BUSINESS.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-sky transition-colors" aria-label="Google">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              </a>
            </div>
            <div className="mt-4">
              <Link href="/instant-quote">
                <Button className="bg-sky hover:bg-sky-light text-white font-semibold w-full">
                  Get Your Free Quote
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-white/20 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} {BUSINESS.name}. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link href="/instant-quote" className="text-xs text-gray-400 hover:text-white transition-colors">
              Instant Quote
            </Link>
            <Link href="/gallery" className="text-xs text-gray-400 hover:text-white transition-colors">
              Gallery
            </Link>
            <Link href="/contact" className="text-xs text-gray-400 hover:text-white transition-colors">
              Contact
            </Link>
            <DiscreetManageLink />
          </div>
        </div>
      </div>
    </footer>
  );
}
