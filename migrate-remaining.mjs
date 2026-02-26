import mysql2 from 'mysql2/promise';

const conn = await mysql2.createConnection(process.env.DATABASE_URL);

const statements = [
  `CREATE TABLE IF NOT EXISTS \`customers\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`companyId\` int NOT NULL,
    \`firstName\` varchar(128) NOT NULL,
    \`lastName\` varchar(128),
    \`email\` varchar(320),
    \`phone\` varchar(32),
    \`phone2\` varchar(32),
    \`notes\` text,
    \`tags\` json,
    \`leadSource\` varchar(64),
    \`stripeCustomerId\` varchar(64),
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`customers_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`properties\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`customerId\` int NOT NULL,
    \`companyId\` int NOT NULL,
    \`address\` text NOT NULL,
    \`city\` varchar(128),
    \`state\` varchar(64),
    \`zip\` varchar(16),
    \`country\` varchar(64) DEFAULT 'US',
    \`lat\` decimal(10,7),
    \`lng\` decimal(10,7),
    \`notes\` text,
    \`isPrimary\` boolean DEFAULT false,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`properties_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`leads\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`companyId\` int NOT NULL,
    \`customerId\` int,
    \`firstName\` varchar(128),
    \`lastName\` varchar(128),
    \`email\` varchar(320),
    \`phone\` varchar(32),
    \`address\` text,
    \`city\` varchar(128),
    \`state\` varchar(64),
    \`zip\` varchar(16),
    \`services\` json,
    \`notes\` text,
    \`source\` varchar(64) DEFAULT 'website',
    \`status\` enum('new','contacted','follow_up','quoted','won','lost') NOT NULL DEFAULT 'new',
    \`lostReason\` text,
    \`convertedToQuoteId\` int,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`leads_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`quotes\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`companyId\` int NOT NULL,
    \`customerId\` int NOT NULL,
    \`propertyId\` int,
    \`leadId\` int,
    \`quoteNumber\` int NOT NULL,
    \`title\` varchar(255),
    \`status\` enum('draft','sent','accepted','changes_requested','expired','archived') NOT NULL DEFAULT 'draft',
    \`subtotal\` decimal(10,2) DEFAULT '0.00',
    \`taxRate\` decimal(5,2) DEFAULT '0.00',
    \`taxAmount\` decimal(10,2) DEFAULT '0.00',
    \`depositAmount\` decimal(10,2) DEFAULT '0.00',
    \`total\` decimal(10,2) DEFAULT '0.00',
    \`message\` text,
    \`internalNotes\` text,
    \`expiresAt\` timestamp NULL,
    \`sentAt\` timestamp NULL,
    \`acceptedAt\` timestamp NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`quotes_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`quote_line_items\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`quoteId\` int NOT NULL,
    \`sortOrder\` int DEFAULT 0,
    \`description\` varchar(255) NOT NULL,
    \`details\` text,
    \`featureList\` json,
    \`unitPrice\` decimal(10,2) DEFAULT '0.00',
    \`quantity\` decimal(10,3) DEFAULT '1.000',
    \`total\` decimal(10,2) DEFAULT '0.00',
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`quote_line_items_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`quote_templates\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`companyId\` int NOT NULL,
    \`name\` varchar(255) NOT NULL,
    \`description\` text,
    \`lineItems\` json,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`quote_templates_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`jobs\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`companyId\` int NOT NULL,
    \`customerId\` int NOT NULL,
    \`propertyId\` int,
    \`quoteId\` int,
    \`jobNumber\` int NOT NULL,
    \`title\` varchar(255),
    \`status\` enum('draft','scheduled','in_progress','requires_invoicing','completed','archived') NOT NULL DEFAULT 'draft',
    \`isRecurring\` boolean DEFAULT false,
    \`recurrenceRule\` varchar(64),
    \`instructions\` text,
    \`internalNotes\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`jobs_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`visits\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`jobId\` int NOT NULL,
    \`companyId\` int NOT NULL,
    \`status\` enum('unscheduled','scheduled','in_progress','completed','cancelled') NOT NULL DEFAULT 'unscheduled',
    \`scheduledAt\` timestamp NULL,
    \`scheduledEndAt\` timestamp NULL,
    \`checkInAt\` timestamp NULL,
    \`checkOutAt\` timestamp NULL,
    \`notes\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`visits_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`visit_assignments\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`visitId\` int NOT NULL,
    \`userId\` int NOT NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`visit_assignments_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`invoices\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`companyId\` int NOT NULL,
    \`customerId\` int NOT NULL,
    \`jobId\` int,
    \`invoiceNumber\` int NOT NULL,
    \`status\` enum('draft','upcoming','sent','paid','past_due','archived') NOT NULL DEFAULT 'draft',
    \`subtotal\` decimal(10,2) DEFAULT '0.00',
    \`taxRate\` decimal(5,2) DEFAULT '0.00',
    \`taxAmount\` decimal(10,2) DEFAULT '0.00',
    \`tipAmount\` decimal(10,2) DEFAULT '0.00',
    \`total\` decimal(10,2) DEFAULT '0.00',
    \`amountPaid\` decimal(10,2) DEFAULT '0.00',
    \`balance\` decimal(10,2) DEFAULT '0.00',
    \`message\` text,
    \`internalNotes\` text,
    \`dueDate\` timestamp NULL,
    \`sentAt\` timestamp NULL,
    \`paidAt\` timestamp NULL,
    \`stripePaymentIntentId\` varchar(128),
    \`reminderSentAt\` json,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`invoices_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`invoice_line_items\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`invoiceId\` int NOT NULL,
    \`sortOrder\` int DEFAULT 0,
    \`description\` varchar(255) NOT NULL,
    \`details\` text,
    \`unitPrice\` decimal(10,2) DEFAULT '0.00',
    \`quantity\` decimal(10,3) DEFAULT '1.000',
    \`total\` decimal(10,2) DEFAULT '0.00',
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`invoice_line_items_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`payments\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`invoiceId\` int NOT NULL,
    \`companyId\` int NOT NULL,
    \`amount\` decimal(10,2) NOT NULL,
    \`method\` enum('card','ach','check','cash','other') NOT NULL,
    \`stripeChargeId\` varchar(128),
    \`stripePaymentIntentId\` varchar(128),
    \`notes\` text,
    \`paidAt\` timestamp NOT NULL DEFAULT (now()),
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`payments_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`referrals\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`companyId\` int NOT NULL,
    \`referrerId\` int NOT NULL,
    \`referredCustomerId\` int,
    \`referredName\` varchar(255),
    \`referredEmail\` varchar(320),
    \`status\` enum('pending','converted','rewarded') DEFAULT 'pending',
    \`creditAmount\` decimal(10,2) DEFAULT '50.00',
    \`jobId\` int,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`referrals_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`review_requests\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`companyId\` int NOT NULL,
    \`customerId\` int NOT NULL,
    \`invoiceId\` int,
    \`platform\` enum('google','facebook') NOT NULL,
    \`method\` enum('email','sms') NOT NULL,
    \`status\` enum('pending','sent','clicked','reviewed') DEFAULT 'pending',
    \`sentAt\` timestamp NULL,
    \`scheduledAt\` timestamp NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`review_requests_id\` PRIMARY KEY(\`id\`)
  )`,
];

for (const sql of statements) {
  try {
    await conn.execute(sql);
    const match = sql.match(/CREATE TABLE IF NOT EXISTS `([^`]+)`/);
    console.log(`✓ ${match?.[1] ?? 'table'}`);
  } catch (e) {
    console.error(`✗ Error: ${e.message}`);
  }
}

const alterStatements = [
  `ALTER TABLE users ADD COLUMN crmRole enum('owner','dispatcher','technician') DEFAULT 'owner'`,
  `ALTER TABLE users ADD COLUMN phone varchar(32)`,
  `ALTER TABLE users ADD COLUMN companyId int`,
];
for (const sql of alterStatements) {
  try {
    await conn.execute(sql);
    console.log(`✓ users column added`);
  } catch (e) {
    console.log(`  (column already exists)`);
  }
}

await conn.end();
console.log('\nAll done!');
