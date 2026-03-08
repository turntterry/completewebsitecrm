import { and, asc, desc, eq, gte, like, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertCustomer,
  InsertJob,
  InsertAutomationRule,
  InsertJobCost,
  InsertLead,
  InsertSmsConversation,
  InsertSmsMessage,
  InsertPayment,
  InsertProperty,
  InsertQuote,
  InsertQuoteLineItem,
  InsertUser,
  activityEvents,
  attachments,
  automationRules,
  automationLogs,
  campaigns,
  checklistItems,
  companies,
  customers,
  invoiceLineItems,
  instantQuotes,
  invoices,
  jobCosts,
  jobs,
  leads,
  packageDiscountTiers,
  payments,
  properties,
  quoteGlobalSettings,
  quoteLineItems,
  quoteTemplates,
  quoteToolServices,
  quoteToolSettings,
  quotes,
  referrals,
  reviewRequests,
  serviceConfigs,
  smsConversations,
  smsMessages,
  users,
  visitAssignments,
  visits,
  mediaTags,
  photoTagAssignments,
  shareLinks,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const openId = user.openId;
  const name = user.name ?? null;
  const email = user.email ?? null;
  const loginMethod = user.loginMethod ?? null;
  const role = user.role ?? (openId === ENV.ownerOpenId ? "admin" : "user");
  const lastSignedIn = user.lastSignedIn ?? new Date();

  // Use raw SQL for MySQL INSERT ... ON DUPLICATE KEY UPDATE
  await db.execute(sql`
    INSERT INTO users (openId, name, email, loginMethod, role, lastSignedIn)
    VALUES (${openId}, ${name}, ${email}, ${loginMethod}, ${role}, ${lastSignedIn})
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      email = VALUES(email),
      loginMethod = VALUES(loginMethod),
      lastSignedIn = VALUES(lastSignedIn)
  `);
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

// ─── Company ──────────────────────────────────────────────────────────────────
export async function getOrCreateCompany(userId: number, ownerName: string) {
  const db = await getDb();
  if (!db) return null;

  // Check if user already has a company
  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (user[0]?.companyId) {
    const company = await db.select().from(companies).where(eq(companies.id, user[0].companyId)).limit(1);
    return company[0] ?? null;
  }

  // Create default company
  const [result] = await db.insert(companies).values({
    name: ownerName || "My Company",
    invoiceTerms: "due_on_receipt",
    quoteExpiryDays: 30,
  });
  const companyId = (result as any).insertId as number;
  await db.update(users).set({ companyId }).where(eq(users.id, userId));
  const company = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  return company[0] ?? null;
}

export async function updateCompany(companyId: number, data: Partial<typeof companies.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(companies).set(data).where(eq(companies.id, companyId));
}

export async function getCompany(companyId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  return result[0] ?? null;
}

// ─── Customers ────────────────────────────────────────────────────────────────
export async function listCustomers(companyId: number, search?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(customers.companyId, companyId)];
  if (search) {
    conditions.push(
      or(
        like(customers.firstName, `%${search}%`),
        like(customers.lastName, `%${search}%`),
        like(customers.email, `%${search}%`),
        like(customers.phone, `%${search}%`)
      )!
    );
  }
  return db.select().from(customers).where(and(...conditions)).orderBy(desc(customers.createdAt));
}

export async function getCustomer(id: number, companyId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(customers).where(and(eq(customers.id, id), eq(customers.companyId, companyId))).limit(1);
  return result[0] ?? null;
}

export async function createCustomer(data: InsertCustomer) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(customers).values(data);
  return (result as any).insertId as number;
}

export async function updateCustomer(id: number, companyId: number, data: Partial<InsertCustomer>) {
  const db = await getDb();
  if (!db) return;
  await db.update(customers).set(data).where(and(eq(customers.id, id), eq(customers.companyId, companyId)));
}

export async function deleteCustomer(id: number, companyId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(customers).where(and(eq(customers.id, id), eq(customers.companyId, companyId)));
}

// ─── Properties ───────────────────────────────────────────────────────────────
export async function listProperties(customerId: number, companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(properties).where(and(eq(properties.customerId, customerId), eq(properties.companyId, companyId)));
}

export async function createProperty(data: InsertProperty) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(properties).values(data);
  return (result as any).insertId as number;
}

export async function updateProperty(id: number, companyId: number, data: Partial<InsertProperty>) {
  const db = await getDb();
  if (!db) return;
  await db.update(properties).set(data).where(and(eq(properties.id, id), eq(properties.companyId, companyId)));
}

export async function deleteProperty(id: number, companyId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(properties).where(and(eq(properties.id, id), eq(properties.companyId, companyId)));
}

// ─── Leads ────────────────────────────────────────────────────────────────────
export async function listLeads(companyId: number, status?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(leads.companyId, companyId)];
  if (status) conditions.push(eq(leads.status, status as any));
  return db.select().from(leads).where(and(...conditions)).orderBy(desc(leads.createdAt));
}

export async function getLead(id: number, companyId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(leads).where(and(eq(leads.id, id), eq(leads.companyId, companyId))).limit(1);
  return result[0] ?? null;
}

export async function createLead(data: InsertLead) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(leads).values(data);
  return (result as any).insertId as number;
}

export async function updateLead(id: number, companyId: number, data: Partial<InsertLead>) {
  const db = await getDb();
  if (!db) return;
  await db.update(leads).set(data).where(and(eq(leads.id, id), eq(leads.companyId, companyId)));
}

// ─── Quotes ───────────────────────────────────────────────────────────────────
export async function listQuotes(companyId: number, status?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(quotes.companyId, companyId)];
  if (status) conditions.push(eq(quotes.status, status as any));
  const quotesList = await db.select().from(quotes).where(and(...conditions)).orderBy(desc(quotes.createdAt));

  // Fetch customer data for each quote
  const withCustomers = await Promise.all(
    quotesList.map(async (q) => {
      const customer = await getCustomer(q.customerId, companyId);
      return { ...q, customer };
    })
  );

  return withCustomers;
}

export async function getQuote(id: number, companyId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(quotes).where(and(eq(quotes.id, id), eq(quotes.companyId, companyId))).limit(1);
  return result[0] ?? null;
}

export async function getQuoteWithLineItems(id: number, companyId: number) {
  const db = await getDb();
  if (!db) return null;
  const quote = await getQuote(id, companyId);
  if (!quote) return null;
  const lineItems = await db.select().from(quoteLineItems).where(eq(quoteLineItems.quoteId, id)).orderBy(quoteLineItems.sortOrder);
  // Fetch customer and property for the CLIENT panel
  const [customer] = await db.select().from(customers).where(eq(customers.id, quote.customerId));
  const property = quote.propertyId
    ? (await db.select().from(properties).where(eq(properties.id, quote.propertyId)))[0] ?? null
    : null;
  const [iqRow] = await db
    .select()
    .from(instantQuotes)
    .where(eq(instantQuotes.convertedToQuoteId, id));

  return {
    ...quote,
    lineItems,
    customer: customer ?? null,
    property,
    preferredSlot: iqRow?.preferredSlot ?? null,
    preferredSlotLabel: iqRow?.preferredSlotLabel ?? null,
    propertyIntel: iqRow?.propertyIntel ?? {
      squareFootage: iqRow?.squareFootage,
      stories: iqRow?.stories,
    },
  };
}

export async function getNextQuoteNumber(companyId: number) {
  const db = await getDb();
  if (!db) return 1;
  const result = await db.select({ max: sql<number>`MAX(quoteNumber)` }).from(quotes).where(eq(quotes.companyId, companyId));
  return (result[0]?.max ?? 0) + 1;
}

export async function getQuoteByToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(quotes).where(eq(quotes.publicToken, token)).limit(1);
  const quote = result[0];
  if (!quote) return null;
  const lineItems = await db.select().from(quoteLineItems).where(eq(quoteLineItems.quoteId, quote.id)).orderBy(quoteLineItems.sortOrder);
  const [customer] = await db.select().from(customers).where(eq(customers.id, quote.customerId));
  const [company] = await db.select().from(companies).where(eq(companies.id, quote.companyId));
  return { ...quote, lineItems, customer: customer ?? null, company: company ?? null };
}

export async function createQuote(data: InsertQuote, lineItems: InsertQuoteLineItem[]) {
  const db = await getDb();
  if (!db) return null;
  const token = `qt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  const [result] = await db.insert(quotes).values({ ...data, publicToken: token });
  const quoteId = (result as any).insertId as number;
  if (lineItems.length > 0) {
    await db.insert(quoteLineItems).values(lineItems.map((li, i) => ({ ...li, quoteId, sortOrder: i })));
  }
  return quoteId;
}

export async function updateQuote(id: number, companyId: number, data: Partial<InsertQuote>, lineItems?: InsertQuoteLineItem[]) {
  const db = await getDb();
  if (!db) return;
  await db.update(quotes).set(data).where(and(eq(quotes.id, id), eq(quotes.companyId, companyId)));
  if (lineItems !== undefined) {
    await db.delete(quoteLineItems).where(eq(quoteLineItems.quoteId, id));
    if (lineItems.length > 0) {
      await db.insert(quoteLineItems).values(lineItems.map((li, i) => ({ ...li, quoteId: id, sortOrder: i })));
    }
  }
}

// ─── Quote Templates ──────────────────────────────────────────────────────────
export async function listQuoteTemplates(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quoteTemplates).where(eq(quoteTemplates.companyId, companyId));
}

export async function createQuoteTemplate(data: typeof quoteTemplates.$inferInsert) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(quoteTemplates).values(data);
  return (result as any).insertId as number;
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────
export async function listJobs(companyId: number, status?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(jobs.companyId, companyId)];
  if (status) conditions.push(eq(jobs.status, status as any));
  const jobsList = await db.select().from(jobs).where(and(...conditions)).orderBy(desc(jobs.createdAt));

  // Fetch customer data for each job
  const withCustomers = await Promise.all(
    jobsList.map(async (j) => {
      const customer = await getCustomer(j.customerId, companyId);
      return { ...j, customer };
    })
  );

  return withCustomers;
}

export async function getJob(id: number, companyId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(jobs).where(and(eq(jobs.id, id), eq(jobs.companyId, companyId))).limit(1);
  return result[0] ?? null;
}

export async function getNextJobNumber(companyId: number) {
  const db = await getDb();
  if (!db) return 1;
  const result = await db.select({ max: sql<number>`MAX(jobNumber)` }).from(jobs).where(eq(jobs.companyId, companyId));
  return (result[0]?.max ?? 0) + 1;
}

export async function createJob(data: InsertJob) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(jobs).values(data);
  return (result as any).insertId as number;
}

export async function updateJob(id: number, companyId: number, data: Partial<InsertJob>) {
  const db = await getDb();
  if (!db) return;
  await db.update(jobs).set(data).where(and(eq(jobs.id, id), eq(jobs.companyId, companyId)));
}

// ─── Visits ───────────────────────────────────────────────────────────────────
export async function listVisits(companyId: number, from?: Date, to?: Date) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(visits.companyId, companyId)];
  if (from) conditions.push(gte(visits.scheduledAt, from));
  if (to) conditions.push(lte(visits.scheduledAt, to));
  return db.select().from(visits).where(and(...conditions)).orderBy(visits.scheduledAt);
}

export async function listVisitsWithJob(companyId: number, from?: Date, to?: Date) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(visits.companyId, companyId)];
  if (from) conditions.push(gte(visits.scheduledAt, from));
  if (to) conditions.push(lte(visits.scheduledAt, to));
  const rows = await db
    .select({
      id: visits.id,
      jobId: visits.jobId,
      status: visits.status,
      scheduledAt: visits.scheduledAt,
      scheduledEndAt: visits.scheduledEndAt,
      checkInAt: visits.checkInAt,
      checkOutAt: visits.checkOutAt,
      checkInLat: visits.checkInLat,
      checkInLng: visits.checkInLng,
      checkInAddress: visits.checkInAddress,
      durationMinutes: visits.durationMinutes,
      notes: visits.notes,
      jobNumber: jobs.jobNumber,
      jobTitle: jobs.title,
      customerFirstName: customers.firstName,
      customerLastName: customers.lastName,
      propertyAddress: properties.address,
    })
    .from(visits)
    .leftJoin(jobs, eq(jobs.id, visits.jobId))
    .leftJoin(customers, eq(customers.id, jobs.customerId))
    .leftJoin(properties, eq(properties.id, jobs.propertyId))
    .where(and(...conditions))
    .orderBy(visits.scheduledAt);
  return rows.map((r) => ({
    ...r,
    customerName: r.customerFirstName && r.customerLastName
      ? `${r.customerFirstName} ${r.customerLastName}`.trim()
      : undefined,
    address: r.propertyAddress,
  }));
}

export async function getVisitsByJob(jobId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(visits).where(eq(visits.jobId, jobId)).orderBy(visits.scheduledAt);
}

export async function createVisit(data: typeof visits.$inferInsert) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(visits).values(data);
  return (result as any).insertId as number;
}

export async function updateVisit(id: number, companyId: number, data: Partial<typeof visits.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(visits).set(data).where(and(eq(visits.id, id), eq(visits.companyId, companyId)));
}

// ─── Checklist Items ──────────────────────────────────────────────────────────
export async function getChecklistItems(jobId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(checklistItems).where(eq(checklistItems.jobId, jobId)).orderBy(checklistItems.sortOrder);
}

export async function upsertChecklistItems(jobId: number, items: { description: string; completed: boolean }[]) {
  const db = await getDb();
  if (!db) return;
  await db.delete(checklistItems).where(eq(checklistItems.jobId, jobId));
  if (items.length > 0) {
    await db.insert(checklistItems).values(items.map((item, i) => ({ ...item, jobId, sortOrder: i })));
  }
}

// ─── Invoices ─────────────────────────────────────────────────────────────────
export async function listInvoices(companyId: number, status?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(invoices.companyId, companyId)];
  if (status) conditions.push(eq(invoices.status, status as any));
  const invoicesList = await db.select().from(invoices).where(and(...conditions)).orderBy(desc(invoices.createdAt));

  // Fetch customer data for each invoice
  const withCustomers = await Promise.all(
    invoicesList.map(async (inv) => {
      const customer = await getCustomer(inv.customerId, companyId);
      return { ...inv, customer };
    })
  );

  return withCustomers;
}

export async function getInvoice(id: number, companyId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(invoices).where(and(eq(invoices.id, id), eq(invoices.companyId, companyId))).limit(1);
  return result[0] ?? null;
}

export async function getInvoiceWithLineItems(id: number, companyId: number) {
  const db = await getDb();
  if (!db) return null;
  const invoice = await getInvoice(id, companyId);
  if (!invoice) return null;
  const lineItems = await db.select().from(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, id)).orderBy(invoiceLineItems.sortOrder);
  const customer = await getCustomer(invoice.customerId, companyId);
  return { ...invoice, lineItems, customer };
}

export async function getNextInvoiceNumber(companyId: number) {
  const db = await getDb();
  if (!db) return 1;
  const result = await db.select({ max: sql<number>`MAX(invoiceNumber)` }).from(invoices).where(eq(invoices.companyId, companyId));
  return (result[0]?.max ?? 0) + 1;
}

export async function createInvoice(data: typeof invoices.$inferInsert, lineItemsData: typeof invoiceLineItems.$inferInsert[]) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(invoices).values(data);
  const invoiceId = (result as any).insertId as number;
  if (lineItemsData.length > 0) {
    await db.insert(invoiceLineItems).values(lineItemsData.map((li, i) => ({ ...li, invoiceId, sortOrder: i })));
  }
  return invoiceId;
}

export async function updateInvoice(id: number, companyId: number, data: Partial<typeof invoices.$inferInsert>, lineItemsData?: typeof invoiceLineItems.$inferInsert[]) {
  const db = await getDb();
  if (!db) return;
  await db.update(invoices).set(data).where(and(eq(invoices.id, id), eq(invoices.companyId, companyId)));
  if (lineItemsData !== undefined) {
    await db.delete(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, id));
    if (lineItemsData.length > 0) {
      await db.insert(invoiceLineItems).values(lineItemsData.map((li, i) => ({ ...li, invoiceId: id, sortOrder: i })));
    }
  }
}

// ─── Payments ─────────────────────────────────────────────────────────────────
export async function createPayment(data: InsertPayment) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(payments).values(data);
  const paymentId = (result as any).insertId as number;
  // Update invoice balance
  const invoice = await getInvoice(data.invoiceId, data.companyId);
  if (invoice) {
    const newAmountPaid = parseFloat(String(invoice.amountPaid)) + parseFloat(String(data.amount));
    const newBalance = parseFloat(String(invoice.total)) - newAmountPaid;
    const newStatus = newBalance <= 0 ? "paid" : "sent";
    await db.update(invoices).set({
      amountPaid: String(newAmountPaid.toFixed(2)) as any,
      balance: String(newBalance.toFixed(2)) as any,
      status: newStatus,
      paidAt: newBalance <= 0 ? new Date() : undefined,
    }).where(eq(invoices.id, data.invoiceId));
  }
  return paymentId;
}

export async function listPayments(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(payments).where(eq(payments.companyId, companyId)).orderBy(desc(payments.paidAt));
}

// ─── Attachments ──────────────────────────────────────────────────────────────
export async function listAttachments(attachableType: string, attachableId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(attachments).where(and(eq(attachments.attachableType, attachableType), eq(attachments.attachableId, attachableId)));
}

export async function createAttachment(data: typeof attachments.$inferInsert) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(attachments).values(data);
  return (result as any).insertId as number;
}

export async function deleteAttachment(id: number, companyId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(attachments).where(and(eq(attachments.id, id), eq(attachments.companyId, companyId)));
}

// ─── Activity Events ──────────────────────────────────────────────────────────
export async function logActivity(data: typeof activityEvents.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  await db.insert(activityEvents).values(data);
}

export async function listActivity(companyId: number, subjectType?: string, subjectId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(activityEvents.companyId, companyId)];
  if (subjectType) conditions.push(eq(activityEvents.subjectType, subjectType));
  if (subjectId) conditions.push(eq(activityEvents.subjectId, subjectId));
  return db.select().from(activityEvents).where(and(...conditions)).orderBy(desc(activityEvents.createdAt)).limit(50);
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
export async function getDashboardStats(companyId: number) {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [
    totalCustomers,
    activeJobs,
    pendingQuotes,
    unpaidInvoices,
    overdueInvoices,
    monthRevenue,
    newLeads,
    upcomingVisits,
  ] = await Promise.all([
    db.select({ count: sql<number>`COUNT(*)` }).from(customers).where(eq(customers.companyId, companyId)),
    db.select({ count: sql<number>`COUNT(*)` }).from(jobs).where(and(eq(jobs.companyId, companyId), or(eq(jobs.status, "scheduled"), eq(jobs.status, "in_progress"))!)),
    db.select({ count: sql<number>`COUNT(*)`, total: sql<number>`COALESCE(SUM(total), 0)` }).from(quotes).where(and(eq(quotes.companyId, companyId), or(eq(quotes.status, "draft"), eq(quotes.status, "sent"))!)),
    db.select({ count: sql<number>`COUNT(*)`, total: sql<number>`COALESCE(SUM(balance), 0)` }).from(invoices).where(and(eq(invoices.companyId, companyId), or(eq(invoices.status, "sent"), eq(invoices.status, "upcoming"))!)),
    db.select({ count: sql<number>`COUNT(*)`, total: sql<number>`COALESCE(SUM(balance), 0)` }).from(invoices).where(and(eq(invoices.companyId, companyId), eq(invoices.status, "past_due"))),
    db.select({ total: sql<number>`COALESCE(SUM(amount), 0)` }).from(payments).where(and(eq(payments.companyId, companyId), gte(payments.paidAt, startOfMonth), lte(payments.paidAt, endOfMonth))),
    db.select({ count: sql<number>`COUNT(*)` }).from(leads).where(and(eq(leads.companyId, companyId), eq(leads.status, "new"))),
    db.select({ count: sql<number>`COUNT(*)` }).from(visits).where(and(eq(visits.companyId, companyId), eq(visits.status, "scheduled"), gte(visits.scheduledAt, now))),
  ]);

  return {
    totalCustomers: totalCustomers[0]?.count ?? 0,
    activeJobs: activeJobs[0]?.count ?? 0,
    pendingQuotes: pendingQuotes[0]?.count ?? 0,
    pendingQuotesValue: pendingQuotes[0]?.total ?? 0,
    unpaidInvoices: unpaidInvoices[0]?.count ?? 0,
    unpaidInvoicesValue: unpaidInvoices[0]?.total ?? 0,
    overdueInvoices: overdueInvoices[0]?.count ?? 0,
    overdueInvoicesValue: overdueInvoices[0]?.total ?? 0,
    monthRevenue: monthRevenue[0]?.total ?? 0,
    newLeads: newLeads[0]?.count ?? 0,
    upcomingVisits: upcomingVisits[0]?.count ?? 0,
  };
}

// ─── Insights ─────────────────────────────────────────────────────────────────
export async function getRevenueByMonth(companyId: number, year: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    month: sql<number>`MONTH(paidAt)`,
    total: sql<number>`COALESCE(SUM(amount), 0)`,
  }).from(payments)
    .where(and(eq(payments.companyId, companyId), sql`YEAR(paidAt) = ${year}`))
    .groupBy(sql`MONTH(paidAt)`)
    .orderBy(sql`MONTH(paidAt)`);
}

export async function getProjectedIncome(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(invoices)
    .where(and(eq(invoices.companyId, companyId), or(eq(invoices.status, "sent"), eq(invoices.status, "past_due"))!))
    .orderBy(invoices.dueDate);
}

// ─── Campaigns ────────────────────────────────────────────────────────────────
export async function listCampaigns(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(campaigns).where(eq(campaigns.companyId, companyId)).orderBy(desc(campaigns.createdAt));
}

export async function createCampaign(data: typeof campaigns.$inferInsert) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(campaigns).values(data);
  return (result as any).insertId as number;
}

export async function updateCampaign(id: number, companyId: number, data: Partial<typeof campaigns.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(campaigns).set(data).where(and(eq(campaigns.id, id), eq(campaigns.companyId, companyId)));
}

// ─── Referrals ────────────────────────────────────────────────────────────────
export async function listReferrals(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(referrals).where(eq(referrals.companyId, companyId)).orderBy(desc(referrals.createdAt));
}

export async function createReferral(data: typeof referrals.$inferInsert) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(referrals).values(data);
  return (result as any).insertId as number;
}

// ─── Review Requests ──────────────────────────────────────────────────────────
export async function listReviewRequests(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reviewRequests).where(eq(reviewRequests.companyId, companyId)).orderBy(desc(reviewRequests.createdAt));
}

export async function createReviewRequest(data: typeof reviewRequests.$inferInsert) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(reviewRequests).values(data);
  return (result as any).insertId as number;
}

// ─── Quote Tool Settings (Phase 2) ───────────────────────────────────────────
export async function getQuoteToolSettings(companyId: number) {
  const db = await getDb();
  if (!db) return null;
  const r = await db.select().from(quoteToolSettings).where(eq(quoteToolSettings.companyId, companyId)).limit(1);
  return r[0] ?? null;
}

export async function upsertQuoteToolSettings(companyId: number, data: any) {
  const db = await getDb();
  if (!db) return null;
  const existing = await db.select().from(quoteToolSettings).where(eq(quoteToolSettings.companyId, companyId)).limit(1);
  if (existing.length === 0) {
    await db.insert(quoteToolSettings).values({ companyId, ...data });
  } else {
    await db.update(quoteToolSettings).set(data).where(eq(quoteToolSettings.companyId, companyId));
  }
  return getQuoteToolSettings(companyId);
}

export async function getQuoteToolServices(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quoteToolServices).where(eq(quoteToolServices.companyId, companyId)).orderBy(asc(quoteToolServices.sortOrder));
}

export async function createQuoteToolService(data: any) {
  const db = await getDb();
  if (!db) return null;
  const r = await db.insert(quoteToolServices).values(data);
  return { id: (r[0] as any).insertId };
}

export async function updateQuoteToolService(id: number, data: any) {
  const db = await getDb();
  if (!db) return;
  await db.update(quoteToolServices).set(data).where(eq(quoteToolServices.id, id));
}

export async function deleteQuoteToolService(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(quoteToolServices).where(eq(quoteToolServices.id, id));
}

// ─── Instant Quotes (Phase 2) ─────────────────────────────────────────────────
export async function listInstantQuotes() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(instantQuotes).orderBy(desc(instantQuotes.createdAt));
}

export async function createInstantQuote(data: any) {
  const db = await getDb();
  if (!db) return null;
  const r = await db.insert(instantQuotes).values(data);
  return { id: (r[0] as any).insertId };
}

export async function updateInstantQuote(id: number, data: any) {
  const db = await getDb();
  if (!db) return;
  await db.update(instantQuotes).set(data).where(eq(instantQuotes.id, id));
}

// ─── Quote Global Settings (Phase 2) ─────────────────────────────────────────
export async function getQuoteGlobalSettings() {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const rows = await db.select().from(quoteGlobalSettings).where(eq(quoteGlobalSettings.id, 1)).limit(1);
  if (rows.length > 0) return rows[0];
  // Auto-create default row
  await db.insert(quoteGlobalSettings).values({
    id: 1, jobMinimum: "149.00", quoteExpirationDays: 30,
    baseAddress: "", freeMiles: "0.00", pricePerMile: "0.00",
  });
  const created = await db.select().from(quoteGlobalSettings).where(eq(quoteGlobalSettings.id, 1)).limit(1);
  return created[0];
}

export async function updateQuoteGlobalSettings(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(quoteGlobalSettings).set({ ...data, updatedAt: new Date() }).where(eq(quoteGlobalSettings.id, 1));
  return getQuoteGlobalSettings();
}

// ─── Package Discount Tiers (Phase 2) ────────────────────────────────────────
export async function getDiscountTiers() {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.select().from(packageDiscountTiers).orderBy(asc(packageDiscountTiers.serviceCount));
}

export async function replaceDiscountTiers(tiers: { serviceCount: number; discountPercent: string; label: string }[]) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(packageDiscountTiers);
  if (tiers.length > 0) await db.insert(packageDiscountTiers).values(tiers as any);
  return getDiscountTiers();
}

// ─── Service Configs (Phase 2) ────────────────────────────────────────────────
export async function listServiceConfigs() {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.select().from(serviceConfigs).orderBy(asc(serviceConfigs.sortOrder));
}

export async function getServiceConfigByKey(serviceKey: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const rows = await db.select().from(serviceConfigs).where(eq(serviceConfigs.serviceKey, serviceKey)).limit(1);
  return rows[0] ?? null;
}

export async function upsertServiceConfig(serviceKey: string, data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const existing = await getServiceConfigByKey(serviceKey);
  if (existing) {
    await db.update(serviceConfigs).set({ ...data, updatedAt: new Date() }).where(eq(serviceConfigs.serviceKey, serviceKey));
  } else {
    await db.insert(serviceConfigs).values({ serviceKey, ...data });
  }
  return getServiceConfigByKey(serviceKey);
}

// ─── Job Costs (Phase 2B) ─────────────────────────────────────────────────────
export async function listJobCosts(jobId: number, companyId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db
    .select()
    .from(jobCosts)
    .where(and(eq(jobCosts.jobId, jobId), eq(jobCosts.companyId, companyId)))
    .orderBy(desc(jobCosts.costDate));
}

export async function createJobCost(data: InsertJobCost) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(jobCosts).values(data);
  return (result as any).insertId as number;
}

export async function updateJobCost(id: number, companyId: number, data: Partial<InsertJobCost>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db
    .update(jobCosts)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(jobCosts.id, id), eq(jobCosts.companyId, companyId)));
}

export async function deleteJobCost(id: number, companyId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(jobCosts).where(and(eq(jobCosts.id, id), eq(jobCosts.companyId, companyId)));
}

export async function getJobProfitability(jobId: number, companyId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const jobRows = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.id, jobId), eq(jobs.companyId, companyId)))
    .limit(1);
  const job = jobRows[0];
  if (!job) return null;

  // Revenue = linked quote total (best available without paid invoice)
  let revenue = 0;
  if (job.quoteId) {
    const quoteRows = await db
      .select({ total: quotes.total })
      .from(quotes)
      .where(eq(quotes.id, job.quoteId))
      .limit(1);
    revenue = parseFloat(String(quoteRows[0]?.total ?? "0"));
  }

  const costs = await listJobCosts(jobId, companyId);
  const totalCosts = costs.reduce((sum, c) => sum + parseFloat(String(c.amount)), 0);

  const byCategory: Record<string, number> = {};
  for (const c of costs) {
    byCategory[c.category] = (byCategory[c.category] ?? 0) + parseFloat(String(c.amount));
  }

  const profit = revenue - totalCosts;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  return { revenue, totalCosts, profit, margin, byCategory, costs };
}

// ─── Two-Way SMS (Phase 2B) ───────────────────────────────────────────────────
export async function listSmsConversations(companyId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db
    .select()
    .from(smsConversations)
    .where(eq(smsConversations.companyId, companyId))
    .orderBy(desc(smsConversations.lastMessageAt));
}

export async function getSmsConversation(id: number, companyId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const rows = await db
    .select()
    .from(smsConversations)
    .where(and(eq(smsConversations.id, id), eq(smsConversations.companyId, companyId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function findOrCreateConversation(
  companyId: number,
  phone: string,
  customerId?: number,
  customerName?: string
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const existing = await db
    .select()
    .from(smsConversations)
    .where(and(eq(smsConversations.companyId, companyId), eq(smsConversations.customerPhone, phone)))
    .limit(1);
  if (existing[0]) return existing[0];
  const [result] = await db.insert(smsConversations).values({
    companyId,
    customerPhone: phone,
    customerId: customerId ?? null,
    customerName: customerName ?? null,
  });
  const rows = await db
    .select()
    .from(smsConversations)
    .where(eq(smsConversations.id, (result as any).insertId))
    .limit(1);
  return rows[0];
}

export async function getSmsMessages(conversationId: number, companyId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db
    .select()
    .from(smsMessages)
    .where(and(eq(smsMessages.conversationId, conversationId), eq(smsMessages.companyId, companyId)))
    .orderBy(asc(smsMessages.sentAt));
}

export async function insertSmsMessage(data: {
  conversationId: number;
  companyId: number;
  direction: "inbound" | "outbound";
  body: string;
  twilioSid?: string;
  status: "queued" | "sent" | "delivered" | "failed" | "received";
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(smsMessages).values({ ...data, sentAt: new Date() });
  // Update conversation last message
  await db
    .update(smsConversations)
    .set({
      lastMessageAt: new Date(),
      lastMessageBody: data.body.slice(0, 255),
      unreadCount:
        data.direction === "inbound"
          ? sql`unreadCount + 1`
          : sql`unreadCount`,
    })
    .where(eq(smsConversations.id, data.conversationId));
}

export async function markConversationRead(id: number, companyId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db
    .update(smsConversations)
    .set({ unreadCount: 0 })
    .where(and(eq(smsConversations.id, id), eq(smsConversations.companyId, companyId)));
}

export async function getTotalUnreadSms(companyId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ total: sql<number>`COALESCE(SUM(unreadCount), 0)` })
    .from(smsConversations)
    .where(eq(smsConversations.companyId, companyId));
  return result[0]?.total ?? 0;
}

// ─── Automation Rules (Phase 2B) ──────────────────────────────────────────────
export async function listAutomationRules(companyId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db
    .select()
    .from(automationRules)
    .where(eq(automationRules.companyId, companyId))
    .orderBy(desc(automationRules.createdAt));
}

export async function getAutomationRule(id: number, companyId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const rows = await db
    .select()
    .from(automationRules)
    .where(and(eq(automationRules.id, id), eq(automationRules.companyId, companyId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createAutomationRule(data: InsertAutomationRule) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(automationRules).values(data);
  const insertId = (result as any).insertId;
  const rows = await db.select().from(automationRules).where(eq(automationRules.id, insertId)).limit(1);
  return rows[0];
}

export async function updateAutomationRule(id: number, companyId: number, data: Partial<InsertAutomationRule>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db
    .update(automationRules)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(automationRules.id, id), eq(automationRules.companyId, companyId)));
  return getAutomationRule(id, companyId);
}

export async function deleteAutomationRule(id: number, companyId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(automationLogs).where(eq(automationLogs.ruleId, id));
  await db.delete(automationRules).where(and(eq(automationRules.id, id), eq(automationRules.companyId, companyId)));
}

export async function logAutomationRun(data: {
  ruleId: number;
  companyId: number;
  triggerEvent: string;
  entityType?: string;
  entityId?: number;
  status: "success" | "failed" | "skipped";
  actionsRun?: any;
  error?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(automationLogs).values(data);
  if (data.status === "success") {
    await db
      .update(automationRules)
      .set({ lastRunAt: new Date(), runCount: sql`runCount + 1` })
      .where(eq(automationRules.id, data.ruleId));
  }
}

export async function getAutomationLogs(companyId: number, ruleId?: number, limit = 50) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const conditions = [eq(automationLogs.companyId, companyId)];
  if (ruleId) conditions.push(eq(automationLogs.ruleId, ruleId));
  return db
    .select()
    .from(automationLogs)
    .where(and(...conditions))
    .orderBy(desc(automationLogs.createdAt))
    .limit(limit);
}

export async function getEnabledAutomationsByTrigger(companyId: number, trigger: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(automationRules)
    .where(
      and(
        eq(automationRules.companyId, companyId),
        eq(automationRules.enabled, true),
        eq(automationRules.trigger, trigger as any)
      )
    );
}

// ─── Marketing Suite (Phase 2B) ───────────────────────────────────────────────
export async function updateReviewRequestStatus(
  id: number,
  companyId: number,
  status: "pending" | "sent" | "clicked" | "reviewed",
  extra?: { sentAt?: Date; rating?: number; reviewerName?: string; body?: string }
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db
    .update(reviewRequests)
    .set({ status, ...extra })
    .where(and(eq(reviewRequests.id, id), eq(reviewRequests.companyId, companyId)));
}

export async function sendCampaignToAllCustomers(campaignId: number, companyId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const customerList = await db
    .select({ id: customers.id, phone: customers.phone, email: customers.email, firstName: customers.firstName, lastName: customers.lastName })
    .from(customers)
    .where(and(eq(customers.companyId, companyId)));
  return customerList;
}

export async function markCampaignSent(id: number, companyId: number, sentCount: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db
    .update(campaigns)
    .set({ status: "sent", sentAt: new Date(), sentCount, updatedAt: new Date() })
    .where(and(eq(campaigns.id, id), eq(campaigns.companyId, companyId)));
}

export async function updateReferralStatus(
  id: number,
  companyId: number,
  status: "pending" | "converted" | "rewarded",
  creditAmount?: string
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db
    .update(referrals)
    .set({ status, ...(creditAmount ? { creditAmount: creditAmount as any } : {}), updatedAt: new Date() })
    .where(and(eq(referrals.id, id), eq(referrals.companyId, companyId)));
}

// ─── Field Timer helpers (Phase 2B) ───────────────────────────────────────────
export async function getVisit(visitId: number, companyId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(visits)
    .where(and(eq(visits.id, visitId), eq(visits.companyId, companyId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getActiveVisitsForCompany(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(visits)
    .where(and(eq(visits.companyId, companyId), eq(visits.status, "in_progress")))
    .orderBy(desc(visits.checkInAt));
}

// ─── Expert Cam: Attachments extensions ───────────────────────────────────────
export async function listAllAttachments(companyId: number, filters?: { attachableType?: string; label?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: ReturnType<typeof eq>[] = [eq(attachments.companyId, companyId)];
  if (filters?.attachableType) conditions.push(eq(attachments.attachableType, filters.attachableType));
  if (filters?.label) conditions.push(eq(attachments.label, filters.label));
  return db.select().from(attachments).where(and(...conditions)).orderBy(desc(attachments.createdAt));
}

export async function listAllAttachmentsWithJob(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: attachments.id,
      url: attachments.url,
      label: attachments.label,
      caption: attachments.caption,
      mimeType: attachments.mimeType,
      filename: attachments.filename,
      attachableType: attachments.attachableType,
      attachableId: attachments.attachableId,
      createdAt: attachments.createdAt,
      jobNumber: jobs.jobNumber,
      jobTitle: jobs.title,
      customerFirstName: customers.firstName,
      customerLastName: customers.lastName,
    })
    .from(attachments)
    .leftJoin(jobs, and(eq(attachments.attachableType, "job"), eq(attachments.attachableId, jobs.id)))
    .leftJoin(customers, eq(jobs.customerId, customers.id))
    .where(and(eq(attachments.companyId, companyId), eq(attachments.attachableType, "job")))
    .orderBy(desc(attachments.createdAt));
  return rows;
}

export async function updateAttachment(id: number, companyId: number, data: { caption?: string; label?: string }) {
  const db = await getDb();
  if (!db) return;
  const updates: Record<string, unknown> = {};
  if (data.caption !== undefined) updates.caption = data.caption;
  if (data.label !== undefined) updates.label = data.label;
  if (Object.keys(updates).length === 0) return;
  await db.update(attachments).set(updates).where(and(eq(attachments.id, id), eq(attachments.companyId, companyId)));
}

// ─── Expert Cam: Media Tags ───────────────────────────────────────────────────
export async function listMediaTags(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(mediaTags).where(eq(mediaTags.companyId, companyId)).orderBy(asc(mediaTags.name));
}

export async function createMediaTag(companyId: number, name: string, color?: string) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(mediaTags).values({ companyId, name, color: color ?? "blue" });
  return (result as any).insertId as number;
}

export async function deleteMediaTag(id: number, companyId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(photoTagAssignments).where(eq(photoTagAssignments.tagId, id));
  await db.delete(mediaTags).where(and(eq(mediaTags.id, id), eq(mediaTags.companyId, companyId)));
}

export async function assignPhotoTag(attachmentId: number, tagId: number) {
  const db = await getDb();
  if (!db) return;
  // Ignore if already assigned
  await db.insert(photoTagAssignments).values({ attachmentId, tagId }).onDuplicateKeyUpdate({ set: { tagId } });
}

export async function removePhotoTag(attachmentId: number, tagId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(photoTagAssignments).where(and(eq(photoTagAssignments.attachmentId, attachmentId), eq(photoTagAssignments.tagId, tagId)));
}

export async function getTagsForPhoto(attachmentId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ tag: mediaTags })
    .from(photoTagAssignments)
    .innerJoin(mediaTags, eq(photoTagAssignments.tagId, mediaTags.id))
    .where(eq(photoTagAssignments.attachmentId, attachmentId));
  return rows.map(r => r.tag);
}

// ─── Expert Cam: Share Links ──────────────────────────────────────────────────
export async function createShareLink(data: typeof shareLinks.$inferInsert) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(shareLinks).values(data);
  return (result as any).insertId as number;
}

export async function getShareLink(token: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(shareLinks).where(eq(shareLinks.token, token)).limit(1);
  return result[0] ?? null;
}

export async function listShareLinksForJob(jobId: number, companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(shareLinks).where(and(eq(shareLinks.jobId, jobId), eq(shareLinks.companyId, companyId))).orderBy(desc(shareLinks.createdAt));
}

export async function deleteShareLink(id: number, companyId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(shareLinks).where(and(eq(shareLinks.id, id), eq(shareLinks.companyId, companyId)));
}

export async function incrementShareLinkViews(token: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(shareLinks).set({ viewCount: sql`viewCount + 1` }).where(eq(shareLinks.token, token));
}
