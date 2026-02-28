import { Button } from "@/components/ui/button";
import { Phone, Sparkles } from "lucide-react";
import { BUSINESS } from "@shared/data";
import { Link, useLocation } from "wouter";
import { trackEvent } from "@/lib/analytics";

export function StickyCta() {
  const [path] = useLocation();
  const suppressed =
    path?.startsWith("/admin") ||
    path?.startsWith("/login") ||
    path?.startsWith("/client") ||
    path?.startsWith("/portal") ||
    path?.startsWith("/field");
  if (suppressed) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-white/95 backdrop-blur shadow-2xl border-t border-primary/10 md:hidden">
      <div className="container flex items-center gap-3 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Sparkles className="w-4 h-4 text-primary" />
          Get a quote in under 2 minutes
        </div>
        <div className="flex gap-2 ml-auto">
          <Link href="/instant-quote">
            <Button
              size="sm"
              className="bg-primary text-white"
              onClick={() => trackEvent("cta_click", { location: "sticky_mobile", action: "instant_quote" })}
            >
              Instant Quote
            </Button>
          </Link>
          <a href={`tel:${BUSINESS.phoneRaw}`}>
            <Button
              size="sm"
              variant="outline"
              className="border-primary text-primary"
              onClick={() => trackEvent("cta_click", { location: "sticky_mobile", action: "call" })}
            >
              <Phone className="w-4 h-4 mr-1" /> Call
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
