import {
  boolean,
  decimal,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── Users (extends base auth table) ─────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  crmRole: mysqlEnum("crmRole", ["owner", "dispatcher", "technician"]).default(
    "owner"
  ),
  phone: varchar("phone", { length: 32 }),
  companyId: int("companyId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Company ──────────────────────────────────────────────────────────────────
export const companies = mysqlTable("companies", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  logoUrl: text("logoUrl"),
  address: text("address"),
  phone: varchar("phone", { length: 32 }),
  email: varchar("email", { length: 320 }),
  website: text("website"),
  defaultTaxRate: decimal("defaultTaxRate", { precision: 5, scale: 2 }).default(
    "0.00"
  ),
  invoiceTerms: varchar("invoiceTerms", { length: 64 }).default(
    "due_on_receipt"
  ),
  invoiceMessage: text("invoiceMessage"),
  quoteMessage: text("quoteMessage"),
  quoteExpiryDays: int("quoteExpiryDays").default(30),
  businessHours: json("businessHours"),
  settings: json("settings"),
  googlePlaceId: varchar("googlePlaceId", { length: 255 }),
  googleReviewsEnabled: boolean("googleReviewsEnabled").default(false),
  // AI Receptionist
  aiReceptionistEnabled: boolean("aiReceptionistEnabled").default(false),
  aiPersonaName: varchar("aiPersonaName", { length: 80 }),
  aiSystemPrompt: text("aiSystemPrompt"),
  aiBusinessHours: json("aiBusinessHours"),
  aiAfterHoursMessage: text("aiAfterHoursMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Company = typeof companies.$inferSelect;

// ─── Customers ────────────────────────────────────────────────────────────────
export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  firstName: varchar("firstName", { length: 128 }).notNull(),
  lastName: varchar("lastName", { length: 128 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  phone2: varchar("phone2", { length: 32 }),
  notes: text("notes"),
  tags: json("tags").$type<string[]>().default([]),
  leadSource: varchar("leadSource", { length: 64 }),
  stripeCustomerId: varchar("stripeCustomerId", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

// ─── Properties ───────────────────────────────────────────────────────────────
export const properties = mysqlTable("properties", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(),
  companyId: int("companyId").notNull(),
  address: text("address").notNull(),
  city: varchar("city", { length: 128 }),
  state: varchar("state", { length: 64 }),
  zip: varchar("zip", { length: 16 }),
  country: varchar("country", { length: 64 }).default("US"),
  lat: decimal("lat", { precision: 10, scale: 7 }),
  lng: decimal("lng", { precision: 10, scale: 7 }),
  notes: text("notes"),
  isPrimary: boolean("isPrimary").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Property = typeof properties.$inferSelect;
export type InsertProperty = typeof properties.$inferInsert;

// ─── Leads ────────────────────────────────────────────────────────────────────
export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  customerId: int("customerId"),
  firstName: varchar("firstName", { length: 128 }),
  lastName: varchar("lastName", { length: 128 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  address: text("address"),
  city: varchar("city", { length: 128 }),
  state: varchar("state", { length: 64 }),
  zip: varchar("zip", { length: 16 }),
  services: json("services").$type<string[]>().default([]),
  notes: text("notes"),
  source: varchar("source", { length: 64 }).default("website"),
  status: mysqlEnum("status", [
    "new",
    "contacted",
    "follow_up",
    "quoted",
    "won",
    "lost",
  ])
    .default("new")
    .notNull(),
  lostReason: text("lostReason"),
  convertedToQuoteId: int("convertedToQuoteId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

// ─── Quotes ───────────────────────────────────────────────────────────────────
export const quotes = mysqlTable("quotes", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  customerId: int("customerId").notNull(),
  propertyId: int("propertyId"),
  leadId: int("leadId"),
  quoteNumber: int("quoteNumber").notNull(),
  title: varchar("title", { length: 255 }),
  status: mysqlEnum("status", [
    "draft",
    "sent",
    "accepted",
    "changes_requested",
    "expired",
    "archived",
  ])
    .default("draft")
    .notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).default("0.00"),
  taxRate: decimal("taxRate", { precision: 5, scale: 2 }).default("0.00"),
  taxAmount: decimal("taxAmount", { precision: 10, scale: 2 }).default("0.00"),
  depositAmount: decimal("depositAmount", { precision: 10, scale: 2 }).default(
    "0.00"
  ),
  total: decimal("total", { precision: 10, scale: 2 }).default("0.00"),
  message: text("message"),
  internalNotes: text("internalNotes"),
  expiresAt: timestamp("expiresAt"),
  sentAt: timestamp("sentAt"),
  acceptedAt: timestamp("acceptedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = typeof quotes.$inferInsert;

// ─── Quote Line Items ─────────────────────────────────────────────────────────
export const quoteLineItems = mysqlTable("quote_line_items", {
  id: int("id").autoincrement().primaryKey(),
  quoteId: int("quoteId").notNull(),
  sortOrder: int("sortOrder").default(0),
  description: varchar("description", { length: 255 }).notNull(),
  details: text("details"),
  featureList: json("featureList")
    .$type<{ label: string; included: boolean }[]>()
    .default([]),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).default("0.00"),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).default("1.000"),
  total: decimal("total", { precision: 10, scale: 2 }).default("0.00"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QuoteLineItem = typeof quoteLineItems.$inferSelect;
export type InsertQuoteLineItem = typeof quoteLineItems.$inferInsert;

// ─── Jobs ─────────────────────────────────────────────────────────────────────
export const jobs = mysqlTable("jobs", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  customerId: int("customerId").notNull(),
  propertyId: int("propertyId"),
  quoteId: int("quoteId"),
  jobNumber: int("jobNumber").notNull(),
  title: varchar("title", { length: 255 }),
  status: mysqlEnum("status", [
    "draft",
    "scheduled",
    "in_progress",
    "requires_invoicing",
    "completed",
    "archived",
  ])
    .default("draft")
    .notNull(),
  isRecurring: boolean("isRecurring").default(false),
  recurrenceRule: varchar("recurrenceRule", { length: 64 }),
  instructions: text("instructions"),
  internalNotes: text("internalNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Job = typeof jobs.$inferSelect;
export type InsertJob = typeof jobs.$inferInsert;

// ─── Visits ───────────────────────────────────────────────────────────────────
export const visits = mysqlTable("visits", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").notNull(),
  companyId: int("companyId").notNull(),
  status: mysqlEnum("status", [
    "unscheduled",
    "scheduled",
    "in_progress",
    "completed",
    "cancelled",
  ])
    .default("unscheduled")
    .notNull(),
  scheduledAt: timestamp("scheduledAt"),
  scheduledEndAt: timestamp("scheduledEndAt"),
  checkInAt: timestamp("checkInAt"),
  checkOutAt: timestamp("checkOutAt"),
  checkInLat: decimal("checkInLat", { precision: 10, scale: 7 }),
  checkInLng: decimal("checkInLng", { precision: 10, scale: 7 }),
  checkOutLat: decimal("checkOutLat", { precision: 10, scale: 7 }),
  checkOutLng: decimal("checkOutLng", { precision: 10, scale: 7 }),
  checkInAddress: varchar("checkInAddress", { length: 255 }),
  checkOutAddress: varchar("checkOutAddress", { length: 255 }),
  durationMinutes: int("durationMinutes"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Visit = typeof visits.$inferSelect;
export type InsertVisit = typeof visits.$inferInsert;

// ─── Visit Assignments ────────────────────────────────────────────────────────
export const visitAssignments = mysqlTable("visit_assignments", {
  id: int("id").autoincrement().primaryKey(),
  visitId: int("visitId").notNull(),
  userId: int("userId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Checklist Items ──────────────────────────────────────────────────────────
export const checklistItems = mysqlTable("checklist_items", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  completed: boolean("completed").default(false),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChecklistItem = typeof checklistItems.$inferSelect;

// ─── Attachments ──────────────────────────────────────────────────────────────
export const attachments = mysqlTable("attachments", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  s3Key: text("s3Key").notNull(),
  url: text("url").notNull(),
  label: varchar("label", { length: 64 }),
  mimeType: varchar("mimeType", { length: 128 }),
  filename: varchar("filename", { length: 255 }),
  fileSize: int("fileSize"),
  attachableType: varchar("attachableType", { length: 64 }).notNull(),
  attachableId: int("attachableId").notNull(),
  uploadedById: int("uploadedById"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Attachment = typeof attachments.$inferSelect;

// ─── Invoices ─────────────────────────────────────────────────────────────────
export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  customerId: int("customerId").notNull(),
  jobId: int("jobId"),
  invoiceNumber: int("invoiceNumber").notNull(),
  status: mysqlEnum("status", [
    "draft",
    "upcoming",
    "sent",
    "paid",
    "past_due",
    "archived",
  ])
    .default("draft")
    .notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).default("0.00"),
  taxRate: decimal("taxRate", { precision: 5, scale: 2 }).default("0.00"),
  taxAmount: decimal("taxAmount", { precision: 10, scale: 2 }).default("0.00"),
  tipAmount: decimal("tipAmount", { precision: 10, scale: 2 }).default("0.00"),
  total: decimal("total", { precision: 10, scale: 2 }).default("0.00"),
  amountPaid: decimal("amountPaid", { precision: 10, scale: 2 }).default(
    "0.00"
  ),
  balance: decimal("balance", { precision: 10, scale: 2 }).default("0.00"),
  message: text("message"),
  internalNotes: text("internalNotes"),
  dueDate: timestamp("dueDate"),
  sentAt: timestamp("sentAt"),
  paidAt: timestamp("paidAt"),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 128 }),
  reminderSentAt: json("reminderSentAt").$type<string[]>().default([]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

// ─── Invoice Line Items ───────────────────────────────────────────────────────
export const invoiceLineItems = mysqlTable("invoice_line_items", {
  id: int("id").autoincrement().primaryKey(),
  invoiceId: int("invoiceId").notNull(),
  sortOrder: int("sortOrder").default(0),
  description: varchar("description", { length: 255 }).notNull(),
  details: text("details"),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).default("0.00"),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).default("1.000"),
  total: decimal("total", { precision: 10, scale: 2 }).default("0.00"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InvoiceLineItem = typeof invoiceLineItems.$inferSelect;

// ─── Payments ─────────────────────────────────────────────────────────────────
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  invoiceId: int("invoiceId").notNull(),
  companyId: int("companyId").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  method: mysqlEnum("method", [
    "card",
    "ach",
    "check",
    "cash",
    "other",
  ]).notNull(),
  stripeChargeId: varchar("stripeChargeId", { length: 128 }),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 128 }),
  notes: text("notes"),
  paidAt: timestamp("paidAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

// ─── Activity Events ──────────────────────────────────────────────────────────
export const activityEvents = mysqlTable("activity_events", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  eventType: varchar("eventType", { length: 64 }).notNull(),
  description: text("description").notNull(),
  actorId: int("actorId"),
  actorName: varchar("actorName", { length: 255 }),
  subjectType: varchar("subjectType", { length: 64 }),
  subjectId: int("subjectId"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivityEvent = typeof activityEvents.$inferSelect;

// ─── Campaigns ────────────────────────────────────────────────────────────────
export const campaigns = mysqlTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["email", "sms"]).notNull(),
  campaignType: mysqlEnum("campaignType", ["automated", "one_off"]).default(
    "one_off"
  ),
  status: mysqlEnum("status", ["draft", "active", "sent", "inactive"]).default(
    "draft"
  ),
  subject: varchar("subject", { length: 255 }),
  body: text("body"),
  audience: json("audience"),
  sentCount: int("sentCount").default(0),
  openCount: int("openCount").default(0),
  clickCount: int("clickCount").default(0),
  scheduledAt: timestamp("scheduledAt"),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Campaign = typeof campaigns.$inferSelect;

// ─── Referrals ────────────────────────────────────────────────────────────────
export const referrals = mysqlTable("referrals", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  referrerId: int("referrerId").notNull(),
  referredCustomerId: int("referredCustomerId"),
  referredName: varchar("referredName", { length: 255 }),
  referredEmail: varchar("referredEmail", { length: 320 }),
  status: mysqlEnum("status", ["pending", "converted", "rewarded"]).default(
    "pending"
  ),
  creditAmount: decimal("creditAmount", { precision: 10, scale: 2 }).default(
    "50.00"
  ),
  jobId: int("jobId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Referral = typeof referrals.$inferSelect;

// ─── Review Requests ──────────────────────────────────────────────────────────
export const reviewRequests = mysqlTable("review_requests", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  customerId: int("customerId").notNull(),
  invoiceId: int("invoiceId"),
  platform: mysqlEnum("platform", ["google", "facebook"]).notNull(),
  method: mysqlEnum("method", ["email", "sms"]).notNull(),
  status: mysqlEnum("status", [
    "pending",
    "sent",
    "clicked",
    "reviewed",
  ]).default("pending"),
  sentAt: timestamp("sentAt"),
  scheduledAt: timestamp("scheduledAt"),
  reviewerName: varchar("reviewerName", { length: 120 }),
  rating: int("rating"),
  body: text("body"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ReviewRequest = typeof reviewRequests.$inferSelect;

// ─── Quote Templates ──────────────────────────────────────────────────────────
export const quoteTemplates = mysqlTable("quote_templates", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  lineItems: json("lineItems")
    .$type<
      {
        description: string;
        details?: string;
        featureList: { label: string; included: boolean }[];
        unitPrice: number;
        quantity: number;
      }[]
    >()
    .default([]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type QuoteTemplate = typeof quoteTemplates.$inferSelect;

// ─── Instant Quotes (public customer-facing quote tool) ───────────────────────
export const instantQuotes = mysqlTable("instant_quotes", {
  id: int("id").autoincrement().primaryKey(),
  // Customer info
  firstName: varchar("firstName", { length: 128 }).notNull(),
  lastName: varchar("lastName", { length: 128 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  // Property info
  address: text("address").notNull(),
  city: varchar("city", { length: 128 }),
  state: varchar("state", { length: 64 }),
  zip: varchar("zip", { length: 16 }),
  lat: decimal("lat", { precision: 10, scale: 7 }),
  lng: decimal("lng", { precision: 10, scale: 7 }),
  squareFootage: int("squareFootage"),
  stories: int("stories"),
  exteriorMaterial: varchar("exteriorMaterial", { length: 64 }),
  propertyType: varchar("propertyType", { length: 64 }),
  propertyIntel: json("propertyIntel").$type<Record<string, unknown>>(),
  // Quote details
  services: json("services")
    .$type<
      {
        serviceId: string;
        serviceName: string;
        sizeLabel: string;
        sizeValue: number;
        options: Record<string, string | number>;
        price: number;
      }[]
    >()
    .default([]),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).default("0.00"),
  discountPercent: decimal("discountPercent", {
    precision: 5,
    scale: 2,
  }).default("0.00"),
  discountAmount: decimal("discountAmount", {
    precision: 10,
    scale: 2,
  }).default("0.00"),
  total: decimal("total", { precision: 10, scale: 2 }).default("0.00"),
  // Status
  status: mysqlEnum("status", ["pending", "booked", "declined", "converted"])
    .default("pending")
    .notNull(),
  preferredSlot: varchar("preferredSlot", { length: 120 }),
  preferredSlotLabel: varchar("preferredSlotLabel", { length: 200 }),
  // Marketing consent
  emailConsent: boolean("emailConsent").default(false),
  smsConsent: boolean("smsConsent").default(false),
  // Tracking
  convertedToLeadId: int("convertedToLeadId"),
  convertedToQuoteId: int("convertedToQuoteId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InstantQuote = typeof instantQuotes.$inferSelect;
export type InsertInstantQuote = typeof instantQuotes.$inferInsert;

// ─── Quote Option Sets (Jobber-style upgrade/add-on options) ─────────────────
export const quoteOptionSets = mysqlTable("quote_option_sets", {
  id: int("id").autoincrement().primaryKey(),
  quoteId: int("quoteId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type QuoteOptionSet = typeof quoteOptionSets.$inferSelect;
export type InsertQuoteOptionSet = typeof quoteOptionSets.$inferInsert;

export const quoteOptionItems = mysqlTable("quote_option_items", {
  id: int("id").autoincrement().primaryKey(),
  optionSetId: int("optionSetId").notNull(),
  quoteId: int("quoteId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  featureList: json("featureList")
    .$type<{ label: string; included: boolean }[]>()
    .default([]),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).default("1.000"),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).default("0.00"),
  total: decimal("total", { precision: 10, scale: 2 }).default("0.00"),
  isSelected: boolean("isSelected").default(false),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type QuoteOptionItem = typeof quoteOptionItems.$inferSelect;
export type InsertQuoteOptionItem = typeof quoteOptionItems.$inferInsert;

// ─── Client Hub Tokens (magic links for customer self-serve portal) ───────────
export const clientHubTokens = mysqlTable("client_hub_tokens", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(),
  companyId: int("companyId").notNull(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  // Optional: link to a specific quote or invoice to land on
  quoteId: int("quoteId"),
  invoiceId: int("invoiceId"),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ClientHubToken = typeof clientHubTokens.$inferSelect;
export type InsertClientHubToken = typeof clientHubTokens.$inferInsert;

// ─── Product / Service Catalog ────────────────────────────────────────────────
export const productCatalog = mysqlTable("product_catalog", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 64 }).default("Service").notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).default("0.00"),
  taxable: boolean("taxable").default(false),
  active: boolean("active").default(true),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ProductCatalog = typeof productCatalog.$inferSelect;
export type InsertProductCatalog = typeof productCatalog.$inferInsert;

// ─── Quote Tool Settings ──────────────────────────────────────────────────────
export const quoteToolSettings = mysqlTable("quote_tool_settings", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull().unique(),
  isActive: boolean("isActive").default(false),
  standaloneToken: varchar("standaloneToken", { length: 64 }),
  headerTitle: varchar("headerTitle", { length: 300 }).default(
    "Get Your Instant Quote"
  ),
  headerSubtitle: text("headerSubtitle"),
  primaryColor: varchar("primaryColor", { length: 20 }).default("#2563eb"),
  logoUrl: text("logoUrl"),
  buttonText: varchar("buttonText", { length: 100 }).default("Get My Quote"),
  showPropertySqft: boolean("showPropertySqft").default(true),
  showStories: boolean("showStories").default(true),
  showCondition: boolean("showCondition").default(true),
  showPropertyType: boolean("showPropertyType").default(true),
  requireEmail: boolean("requireEmail").default(true),
  requirePhone: boolean("requirePhone").default(true),
  bundleDiscountEnabled: boolean("bundleDiscountEnabled").default(true),
  bundleDiscountTiers: json("bundleDiscountTiers").$type<
    { minServices: number; discountPercent: number }[]
  >(),
  jobMinimum: decimal("jobMinimum", { precision: 10, scale: 2 }).default(
    "0.00"
  ),
  defaultExpirationDays: int("defaultExpirationDays").default(7),
  packageDiscountsEnabled: boolean("packageDiscountsEnabled").default(false),
  discount2Services: decimal("discount2Services", {
    precision: 5,
    scale: 2,
  }).default("5.00"),
  discount3Services: decimal("discount3Services", {
    precision: 5,
    scale: 2,
  }).default("7.00"),
  discount4Services: decimal("discount4Services", {
    precision: 5,
    scale: 2,
  }).default("10.00"),
  discount5PlusServices: decimal("discount5PlusServices", {
    precision: 5,
    scale: 2,
  }).default("12.00"),
  onlineBookingEnabled: boolean("onlineBookingEnabled").default(true),
  requireAdvanceBooking: boolean("requireAdvanceBooking").default(false),
  advanceBookingDays: int("advanceBookingDays").default(1),
  commercialRoutingEnabled: boolean("commercialRoutingEnabled").default(false),
  maxServicesForInstantBooking: int("maxServicesForInstantBooking")
    .notNull()
    .default(2),
  instantBookingBlockedServices: json("instantBookingBlockedServices")
    .$type<string[]>()
    .notNull()
    .default([]),
  availabilityStartHour: int("availabilityStartHour").notNull().default(9),
  availabilityEndHour: int("availabilityEndHour").notNull().default(17),
  availabilityDaysAhead: int("availabilityDaysAhead").notNull().default(9),
  availabilityPreferExternal: boolean("availabilityPreferExternal").default(true),
  slotPaddingMinutes: int("slotPaddingMinutes").notNull().default(0),
  maxSqftAuto: decimal("maxSqftAuto", { precision: 10, scale: 2 })
    .notNull()
    .default("5000"),
  maxLinearFtAuto: decimal("maxLinearFtAuto", { precision: 10, scale: 2 })
    .notNull()
    .default("800"),
  maxStoriesAuto: int("maxStoriesAuto").notNull().default(3),
  maxWindowsAuto: int("maxWindowsAuto").notNull().default(120),
  customerTierLabels: json("customerTierLabels").$type<{
    good: string;
    better: string;
    best: string;
  }>(),
  premiumTheme: json("premiumTheme").$type<{
    style: "classic" | "glass" | "elevated";
    accentColor: string;
    cartStyle: "sidebar" | "footer_drawer";
  }>(),
  upsellCatalog: json("upsellCatalog").$type<
    {
      id: string;
      title: string;
      description: string;
      price: number;
      appliesTo: string[];
      badge?: string;
      active?: boolean;
      sortOrder?: number;
      rules?: Record<string, unknown>;
    }[]
  >(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type QuoteToolSettings = typeof quoteToolSettings.$inferSelect;
export type InsertQuoteToolSettings = typeof quoteToolSettings.$inferInsert;

// ─── Quote Tool Services ──────────────────────────────────────────────────────
export const quoteToolServices = mysqlTable("quote_tool_services", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  serviceKey: varchar("serviceKey", { length: 100 }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 64 }).default("Droplets"),
  iconColor: varchar("iconColor", { length: 32 }).default("#3b82f6"),
  color: varchar("color", { length: 100 }),
  isActive: boolean("isActive").default(true),
  enabled: boolean("enabled").default(true),
  sortOrder: int("sortOrder").default(0),
  pricingType: mysqlEnum("pricingType", [
    "fixed",
    "per_sqft",
    "per_linear_ft",
    "per_unit",
    "tiered",
  ]).default("per_sqft"),
  basePrice: decimal("basePrice", { precision: 10, scale: 2 }).default("0"),
  pricePerUnit: decimal("pricePerUnit", { precision: 10, scale: 4 }).default(
    "0"
  ),
  minimumCharge: decimal("minimumCharge", { precision: 10, scale: 2 }).default(
    "0"
  ),
  sizeTiers:
    json("sizeTiers").$type<
      { minSize: number; maxSize: number | null; ratePerUnit: number }[]
    >(),
  storyMultiplier: json("storyMultiplier").$type<{
    one_story: number;
    two_story: number;
    three_story: number;
  }>(),
  conditionMultiplier: json("conditionMultiplier").$type<{
    light: number;
    medium: number;
    heavy: number;
  }>(),
  addOns:
    json("addOns").$type<
      { name: string; price: number; description?: string }[]
    >(),
  pricingConfig: json("pricingConfig"),
  manualReviewRequired: boolean("manualReviewRequired").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type QuoteToolService = typeof quoteToolServices.$inferSelect;
export type InsertQuoteToolService = typeof quoteToolServices.$inferInsert;

// ─── Quote Sessions & Analytics Events (Instant Quote v2 foundation) ────────
export const quoteSessions = mysqlTable("quote_sessions", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull().default(1),
  sessionToken: varchar("sessionToken", { length: 64 }).notNull().unique(),
  source: varchar("source", { length: 120 }),
  referrer: varchar("referrer", { length: 500 }),
  utmSource: varchar("utmSource", { length: 120 }),
  utmMedium: varchar("utmMedium", { length: 120 }),
  utmCampaign: varchar("utmCampaign", { length: 120 }),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  submittedAt: timestamp("submittedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type QuoteSession = typeof quoteSessions.$inferSelect;

export const quoteSessionEvents = mysqlTable("quote_session_events", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  eventName: varchar("eventName", { length: 80 }).notNull(),
  payload: json("payload")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type QuoteSessionEvent = typeof quoteSessionEvents.$inferSelect;

// ─── Quote Config Versions (draft/publish + rollback foundation) ─────────────
export const quoteConfigVersions = mysqlTable("quote_config_versions", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  versionLabel: varchar("versionLabel", { length: 120 }).notNull(),
  status: mysqlEnum("status", ["draft", "published", "archived"])
    .notNull()
    .default("draft"),
  config: json("config").$type<Record<string, unknown>>().notNull(),
  publishedAt: timestamp("publishedAt"),
  createdByUserId: int("createdByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type QuoteConfigVersion = typeof quoteConfigVersions.$inferSelect;

// ─── Quote Global Settings (Phase 2) ─────────────────────────────────────────
export const quoteGlobalSettings = mysqlTable("quote_global_settings", {
  id: int("id").autoincrement().primaryKey(),
  jobMinimum: decimal("jobMinimum", { precision: 10, scale: 2 })
    .notNull()
    .default("149.00"),
  quoteExpirationDays: int("quoteExpirationDays").notNull().default(30),
  baseAddress: varchar("baseAddress", { length: 255 }).default(""),
  baseLat: decimal("baseLat", { precision: 10, scale: 7 }),
  baseLng: decimal("baseLng", { precision: 10, scale: 7 }),
  freeMiles: decimal("freeMiles", { precision: 6, scale: 2 })
    .notNull()
    .default("0.00"),
  pricePerMile: decimal("pricePerMile", { precision: 6, scale: 2 })
    .notNull()
    .default("0.00"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type QuoteGlobalSettings = typeof quoteGlobalSettings.$inferSelect;
// ─── Package Discount Tiers (Phase 2) ────────────────────────────────────────
export const packageDiscountTiers = mysqlTable("package_discount_tiers", {
  id: int("id").autoincrement().primaryKey(),
  serviceCount: int("serviceCount").notNull(),
  discountPercent: decimal("discountPercent", { precision: 5, scale: 2 })
    .notNull()
    .default("0.00"),
  label: varchar("label", { length: 50 }).default(""),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PackageDiscountTier = typeof packageDiscountTiers.$inferSelect;
// ─── Service Configs (Phase 2) ────────────────────────────────────────────────
export const serviceConfigs = mysqlTable("service_configs", {
  id: int("id").autoincrement().primaryKey(),
  serviceKey: varchar("serviceKey", { length: 100 }).notNull().unique(),
  displayName: varchar("displayName", { length: 150 }).notNull(),
  pricingMode: varchar("pricingMode", { length: 30 })
    .notNull()
    .default("smartscale"),
  pricingConfig: json("pricingConfig").notNull(),
  multipliers: json("multipliers").notNull(),
  taxable: boolean("taxable").notNull().default(true),
  taxCode: varchar("taxCode", { length: 50 }).default(""),
  iconUrl: varchar("iconUrl", { length: 500 }).default(""),
  photoUrl: varchar("photoUrl", { length: 500 }).default(""),
  highlights: json("highlights")
    .$type<{ text: string; visible: boolean }[]>()
    .notNull()
    .default([]),
  sortOrder: int("sortOrder").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ServiceConfig = typeof serviceConfigs.$inferSelect;

// ─── Job Costs (Phase 2B) ─────────────────────────────────────────────────────
export const jobCosts = mysqlTable("job_costs", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").notNull(),
  companyId: int("companyId").notNull(),
  category: mysqlEnum("category", [
    "labor",
    "materials",
    "subcontractor",
    "equipment",
    "other",
  ])
    .notNull()
    .default("other"),
  description: varchar("description", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 })
    .notNull()
    .default("0.00"),
  notes: text("notes"),
  costDate: timestamp("costDate").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type JobCost = typeof jobCosts.$inferSelect;
export type InsertJobCost = typeof jobCosts.$inferInsert;

// ─── Two-Way SMS (Phase 2B) ───────────────────────────────────────────────────
export const smsConversations = mysqlTable("sms_conversations", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  customerId: int("customerId"),
  customerPhone: varchar("customerPhone", { length: 32 }).notNull(),
  customerName: varchar("customerName", { length: 120 }),
  lastMessageAt: timestamp("lastMessageAt").defaultNow().notNull(),
  lastMessageBody: varchar("lastMessageBody", { length: 255 }),
  unreadCount: int("unreadCount").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const smsMessages = mysqlTable("sms_messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  companyId: int("companyId").notNull(),
  direction: mysqlEnum("direction", ["inbound", "outbound"]).notNull(),
  body: text("body").notNull(),
  twilioSid: varchar("twilioSid", { length: 64 }),
  status: mysqlEnum("status", [
    "queued",
    "sent",
    "delivered",
    "failed",
    "received",
  ])
    .notNull()
    .default("queued"),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SmsConversation = typeof smsConversations.$inferSelect;
export type InsertSmsConversation = typeof smsConversations.$inferInsert;
export type SmsMessage = typeof smsMessages.$inferSelect;
export type InsertSmsMessage = typeof smsMessages.$inferInsert;

// ─── Custom Automation Builder (Phase 2B) ─────────────────────────────────────
export const automationRules = mysqlTable("automation_rules", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  enabled: boolean("enabled").notNull().default(true),
  trigger: mysqlEnum("trigger", [
    "job_created",
    "job_status_changed",
    "job_completed",
    "quote_sent",
    "quote_accepted",
    "invoice_created",
    "invoice_overdue",
    "lead_created",
    "visit_completed",
    "payment_received",
  ]).notNull(),
  triggerConfig: json("triggerConfig"), // e.g. { status: "completed" } for job_status_changed
  conditions: json("conditions"), // array of { field, operator, value }
  actions: json("actions").notNull(), // array of { type, config }
  lastRunAt: timestamp("lastRunAt"),
  runCount: int("runCount").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const automationLogs = mysqlTable("automation_logs", {
  id: int("id").autoincrement().primaryKey(),
  ruleId: int("ruleId").notNull(),
  companyId: int("companyId").notNull(),
  triggerEvent: varchar("triggerEvent", { length: 64 }).notNull(),
  entityType: varchar("entityType", { length: 32 }), // "job", "quote", etc.
  entityId: int("entityId"),
  status: mysqlEnum("status", ["success", "failed", "skipped"])
    .notNull()
    .default("success"),
  actionsRun: json("actionsRun"), // summary of what ran
  error: text("error"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AutomationRule = typeof automationRules.$inferSelect;
export type InsertAutomationRule = typeof automationRules.$inferInsert;
export type AutomationLog = typeof automationLogs.$inferSelect;
