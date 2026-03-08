import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import CrmLayout from "./components/CrmLayout";

// Public site pages
import Home from "./pages/Home";
import ServicePage from "./pages/ServicePage";
import Gallery from "./pages/Gallery";
import Contact from "./pages/Contact";
import ServiceAreas from "./pages/ServiceAreas";
import LocationPage from "./pages/LocationPage";
import CookevillePage from "./pages/CookevillePage";
import PublicQuoteTool from "./pages/PublicQuoteTool";
import { StickyCta } from "./components/StickyCta";

// CRM pages
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import Leads from "./pages/Leads";
import Requests from "./pages/Requests";
import Quotes from "./pages/Quotes";
import QuoteDetail from "./pages/QuoteDetail";
import Jobs from "./pages/Jobs";
import JobDetail from "./pages/JobDetail";
import Schedule from "./pages/Schedule";
import Invoices from "./pages/Invoices";
import InvoiceDetail from "./pages/InvoiceDetail";
import Marketing from "./pages/Marketing";
import Insights from "./pages/Insights";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import NewQuote from "./pages/NewQuote";
import NewJob from "./pages/NewJob";
import NewInvoice from "./pages/NewInvoice";
import ClientHub from "./pages/ClientHub";
import ProductCatalog from "./pages/ProductCatalog";
import QuoteTool from "./pages/QuoteTool";
import InstantQuoteSettings from "./pages/InstantQuoteSettings";
import ServiceConfigSettings from "./pages/ServiceConfigSettings";
import SmsInbox from "./pages/SmsInbox";
import Automations from "./pages/Automations";
import BookingControls from "./pages/BookingControls";
import StandaloneQuoteLink from "./pages/StandaloneQuoteLink";
import FieldTimer from "./pages/FieldTimer";
import AiReceptionist from "./pages/AiReceptionist";
import Messages from "./pages/Messages";
import Portal from "./pages/Portal";
import ExpertCam from "./pages/ExpertCam";
import ShareGallery from "./pages/ShareGallery";
import PublicQuote from "./pages/PublicQuote";
import LeadDetail from "./pages/LeadDetail";

function Router() {
  return (
    <Switch>
      {/* ── Public site routes ── */}
      <Route path="/" component={Home} />
      <Route path="/services/:slug">
        {(params) => <ServicePage serviceId={params.slug} />}
      </Route>
      <Route path="/gallery" component={Gallery} />
      <Route path="/contact" component={Contact} />
      <Route path="/service-areas" component={ServiceAreas} />
      <Route path="/locations/:slug">
        {(params) => <LocationPage locationId={params.slug} />}
      </Route>
      <Route path="/cookeville" component={CookevillePage} />
      <Route path="/instant-quote" component={PublicQuoteTool} />

      {/* ── Expert Cam public share ── */}
      <Route path="/share/:token" component={ShareGallery} />

      {/* ── Public quote client view ── */}
      <Route path="/quote/:token" component={PublicQuote} />

      {/* ── Shared / no-sidebar routes ── */}
      <Route path="/field" component={FieldTimer} />
      <Route path="/field/:visitId" component={FieldTimer} />
      <Route path="/client" component={ClientHub} />
      <Route path="/portal" component={Portal} />
      <Route path="/login" component={LoginPage} />

      {/* ── CRM admin routes (all under /admin) ── */}
      <Route path="/admin" component={() => <CrmLayout><Dashboard /></CrmLayout>} />
      <Route path="/admin/clients" component={() => <CrmLayout><Clients /></CrmLayout>} />
      <Route path="/admin/clients/:id" component={() => <CrmLayout><ClientDetail /></CrmLayout>} />
      <Route path="/admin/leads" component={() => <CrmLayout><Leads /></CrmLayout>} />
      <Route path="/admin/leads/:id" component={() => <CrmLayout><LeadDetail /></CrmLayout>} />
      <Route path="/admin/requests" component={() => <CrmLayout><Requests /></CrmLayout>} />
      <Route path="/admin/quotes" component={() => <CrmLayout><Quotes /></CrmLayout>} />
      <Route path="/admin/quotes/new" component={() => <CrmLayout><NewQuote /></CrmLayout>} />
      <Route path="/admin/quotes/:id" component={() => <CrmLayout><QuoteDetail /></CrmLayout>} />
      <Route path="/admin/jobs" component={() => <CrmLayout><Jobs /></CrmLayout>} />
      <Route path="/admin/jobs/new" component={() => <CrmLayout><NewJob /></CrmLayout>} />
      <Route path="/admin/jobs/:id" component={() => <CrmLayout><JobDetail /></CrmLayout>} />
      <Route path="/admin/schedule" component={() => <CrmLayout><Schedule /></CrmLayout>} />
      <Route path="/admin/invoices" component={() => <CrmLayout><Invoices /></CrmLayout>} />
      <Route path="/admin/invoices/new" component={() => <CrmLayout><NewInvoice /></CrmLayout>} />
      <Route path="/admin/invoices/:id" component={() => <CrmLayout><InvoiceDetail /></CrmLayout>} />
      <Route path="/admin/marketing" component={() => <CrmLayout><Marketing /></CrmLayout>} />
      <Route path="/admin/messages" component={() => <CrmLayout><Messages /></CrmLayout>} />
      <Route path="/admin/insights" component={() => <CrmLayout><Insights /></CrmLayout>} />
      <Route path="/admin/settings" component={() => <CrmLayout><Settings /></CrmLayout>} />
      <Route path="/admin/products" component={() => <CrmLayout><ProductCatalog /></CrmLayout>} />
      <Route path="/admin/quote-tool" component={() => <CrmLayout><QuoteTool /></CrmLayout>} />
      <Route path="/admin/quote-tool/global-settings" component={() => <CrmLayout><InstantQuoteSettings /></CrmLayout>} />
      <Route path="/admin/quote-tool/service-config" component={() => <CrmLayout><ServiceConfigSettings /></CrmLayout>} />
      <Route path="/admin/sms" component={() => <CrmLayout><SmsInbox /></CrmLayout>} />
      <Route path="/admin/automations" component={() => <CrmLayout><Automations /></CrmLayout>} />
      <Route path="/admin/booking-controls" component={() => <CrmLayout><BookingControls /></CrmLayout>} />
      <Route path="/admin/standalone-link" component={() => <CrmLayout><StandaloneQuoteLink /></CrmLayout>} />
      <Route path="/admin/ai-receptionist" component={() => <CrmLayout><AiReceptionist /></CrmLayout>} />
      {/* ExpertCam: stubbed — route disabled until feature is implemented */}
      {/* <Route path="/admin/expert-cam" component={() => <CrmLayout><ExpertCam /></CrmLayout>} /> */}

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
          <StickyCta />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
