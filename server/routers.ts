import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { companyRouter } from "./routers/company";
import { customersRouter } from "./routers/customers";
import { leadsRouter } from "./routers/leads";
import { quotesRouter } from "./routers/quotes";
import { jobsRouter } from "./routers/jobs";
import { invoicesRouter } from "./routers/invoices";
import { dashboardRouter } from "./routers/dashboard";
import { attachmentsRouter } from "./routers/attachments";
import { instantQuotesRouter } from "./routers/instantQuotes";
import { clientHubRouter } from "./routers/clientHub";
import { productCatalogRouter } from "./routers/productCatalog";
import { quoteToolSettingsRouter } from "./routers/quoteToolSettings";
import { instantQuoteConfigRouter } from "./routers/instantQuoteConfig";
import { serviceConfigRouter } from "./routers/serviceConfig";
import { automationsRouter } from "./routers/automations";
import { marketingRouter } from "./routers/marketing";
import { smsRouter } from "./routers/sms";
import { aiReceptionistRouter } from "./routers/aiReceptionist";
import { publicSiteRouter } from "./routers/publicSite";
import { quoteAnalyticsRouter } from "./routers/quoteAnalytics";
import { portalRouter } from "./routers/portal";

export const appRouter = router({
  publicSite: publicSiteRouter,
  quoteAnalytics: quoteAnalyticsRouter,
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  company: companyRouter,
  customers: customersRouter,
  leads: leadsRouter,
  quotes: quotesRouter,
  jobs: jobsRouter,
  invoices: invoicesRouter,
  dashboard: dashboardRouter,
  attachments: attachmentsRouter,
  instantQuotes: instantQuotesRouter,
  clientHub: clientHubRouter,
  productCatalog: productCatalogRouter,
  quoteToolSettings: quoteToolSettingsRouter,
  instantQuoteConfig: instantQuoteConfigRouter,
  serviceConfig: serviceConfigRouter,
  automations: automationsRouter,
  marketing: marketingRouter,
  sms: smsRouter,
  aiReceptionist: aiReceptionistRouter,
  portal: portalRouter,
});

export type AppRouter = typeof appRouter;
