import SiteLayout from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { BUSINESS, SERVICES } from "@shared/data";
import { BreadcrumbSchema } from "@/components/SchemaMarkup";
import { trpc } from "@/lib/trpc";
import { Phone, Mail, MapPin, Clock, CheckCircle } from "lucide-react";
import { useState } from "react";
import { useCanonical } from "@/hooks/useCanonical";
import { usePageMeta } from "@/hooks/usePageMeta";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";

export default function Contact() {
  useCanonical("/contact");
  usePageMeta({
    title: "Contact Exterior Experts | Free Pressure Washing & Window Cleaning Quote",
    description: "Call or message Exterior Experts for pressure washing, house washing, window and roof cleaning across Cookeville & Upper Cumberland. Licensed, insured, guaranteed.",
  });
  const [form, setForm] = useState({ name: "", email: "", phone: "", service: "", message: "", address: "" });
  const [submitted, setSubmitted] = useState(false);
  const submitMutation = trpc.publicSite.contact.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Message sent! We'll get back to you soon.");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to send. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      toast.error("Please fill in your name and email.");
      return;
    }
    trackEvent("form_submit", { form: "contact", service: form.service || "unspecified" });
    submitMutation.mutate(form);
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <SiteLayout>
      <BreadcrumbSchema items={[
        { name: "Home", url: origin },
        { name: "Contact", url: `${origin}/contact` },
      ]} />
      <section className="bg-navy py-16 md:py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-navy-dark to-navy opacity-90" />
        <div className="container relative">
          <h1 className="font-heading font-black text-3xl md:text-5xl text-white mb-4">
            Contact Us
          </h1>
          <p className="text-lg text-white/80">
            Get in touch for a free estimate or to ask any questions.
          </p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              <h2 className="font-heading font-bold text-2xl mb-6">Send Us a Message</h2>
              {submitted ? (
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-8 text-center">
                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                    <h3 className="font-heading font-bold text-xl mb-2">Message Sent!</h3>
                    <p className="text-muted-foreground">
                      We'll get back to you as soon as possible. For immediate assistance, call us at{" "}
                      <a
                        href={`tel:${BUSINESS.phoneRaw}`}
                        className="text-primary hover:underline"
                        onClick={() => trackEvent("cta_click", { location: "contact_success", action: "call" })}
                      >
                        {BUSINESS.phone}
                      </a>.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Name *</Label>
                      <Input id="name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your name" required />
                    </div>
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input id="email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="your@email.com" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 123-4567" />
                    </div>
                    <div>
                      <Label htmlFor="service">Service Interested In</Label>
                      <Select value={form.service} onValueChange={v => setForm(f => ({ ...f, service: v }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a service" />
                        </SelectTrigger>
                        <SelectContent>
                          {SERVICES.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="address">Property Address</Label>
                    <Input id="address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="123 Main St, Cookeville, TN" />
                  </div>
                  <div>
                    <Label htmlFor="message">Message</Label>
                    <Textarea id="message" value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Tell us about your project..." rows={4} />
                  </div>
                  <Button type="submit" className="w-full bg-primary hover:bg-navy-light text-white font-bold py-6" disabled={submitMutation.isPending}>
                    {submitMutation.isPending ? "Sending..." : "Send Message"}
                  </Button>
                </form>
              )}
            </div>

            {/* Contact Info */}
            <div>
              <h2 className="font-heading font-bold text-2xl mb-6">Get In Touch</h2>
              <div className="space-y-6">
                <Card>
                  <CardContent className="p-6 flex items-start gap-4">
                    <Phone className="w-6 h-6 text-primary shrink-0 mt-1" />
                    <div>
                      <h3 className="font-bold mb-1">Phone</h3>
                      <a
                        href={`tel:${BUSINESS.phoneRaw}`}
                        className="text-primary hover:underline"
                        onClick={() => trackEvent("cta_click", { location: "contact_info", action: "call" })}
                      >
                        {BUSINESS.phone}
                      </a>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 flex items-start gap-4">
                    <Mail className="w-6 h-6 text-primary shrink-0 mt-1" />
                    <div>
                      <h3 className="font-bold mb-1">Email</h3>
                      <a
                        href={`mailto:${BUSINESS.email}`}
                        className="text-primary hover:underline"
                        onClick={() => trackEvent("cta_click", { location: "contact_info", action: "email" })}
                      >
                        {BUSINESS.email}
                      </a>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 flex items-start gap-4">
                    <MapPin className="w-6 h-6 text-primary shrink-0 mt-1" />
                    <div>
                      <h3 className="font-bold mb-1">Location</h3>
                      <p className="text-muted-foreground">{BUSINESS.fullAddress}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 flex items-start gap-4">
                    <Clock className="w-6 h-6 text-primary shrink-0 mt-1" />
                    <div>
                      <h3 className="font-bold mb-1">Hours</h3>
                      <p className="text-muted-foreground">Monday - Saturday: 7:00 AM - 6:00 PM</p>
                      <p className="text-muted-foreground">Sunday: Closed</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-8 p-6 bg-secondary rounded-xl">
                <h3 className="font-heading font-bold text-lg mb-2">Prefer an Instant Quote?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Skip the wait and get pricing instantly with our online quote tool.
                </p>
                <a href="/instant-quote">
                  <Button
                    className="bg-primary hover:bg-navy-light text-white font-semibold w-full"
                    onClick={() => trackEvent("cta_click", { location: "contact_instant_quote", action: "instant_quote" })}
                  >
                    Get Instant Quote
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
