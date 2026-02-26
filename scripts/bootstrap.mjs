#!/usr/bin/env node
/**
 * bootstrap.mjs — One-time local dev setup
 *
 * What this does:
 *  1. Connects to your MySQL database
 *  2. Runs all migrations (creates all tables)
 *  3. Creates an owner user + company
 *  4. Mints a JWT session cookie you can paste into your browser
 *     → No OAuth server needed for local dev
 *
 * Usage:
 *   node scripts/bootstrap.mjs
 *
 * Requirements:
 *   • .env file exists with DATABASE_URL and JWT_SECRET set
 *   • MySQL server is running and the database exists
 *     CREATE DATABASE exterior_experts_crm;
 */

import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createConnection } from "mysql2/promise";
import { SignJWT } from "jose";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Load .env
config({ path: join(ROOT, ".env") });

const {
  DATABASE_URL,
  JWT_SECRET,
  VITE_APP_ID = "exterior-experts-local",
  OWNER_OPEN_ID = "local-owner-001",
} = process.env;

if (!DATABASE_URL) {
  console.error("\n❌  DATABASE_URL is not set in your .env file.\n");
  process.exit(1);
}
if (!JWT_SECRET) {
  console.error("\n❌  JWT_SECRET is not set in your .env file.\n");
  process.exit(1);
}

// ─── Parse MySQL URL ──────────────────────────────────────────────────────────
function parseMysqlUrl(url) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: parseInt(u.port || "3306"),
    user: u.username,
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ""),
    ssl: u.searchParams.has("ssl") ? { rejectUnauthorized: false } : undefined,
  };
}

// ─── Mint JWT session cookie ──────────────────────────────────────────────────
async function mintSessionCookie(openId, name) {
  const secret = new TextEncoder().encode(JWT_SECRET);
  const ONE_YEAR = 365 * 24 * 60 * 60;
  return new SignJWT({ openId, appId: VITE_APP_ID, name })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(Math.floor(Date.now() / 1000) + ONE_YEAR)
    .sign(secret);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n🚀  Exterior Experts CRM — Local Bootstrap\n");

  const connConfig = parseMysqlUrl(DATABASE_URL);
  console.log(`📡  Connecting to MySQL at ${connConfig.host}:${connConfig.port}/${connConfig.database}...`);

  let conn;
  try {
    conn = await createConnection({ ...connConfig, multipleStatements: true });
    console.log("✅  Connected!\n");
  } catch (err) {
    console.error(`❌  Could not connect to MySQL: ${err.message}\n`);
    console.error("   Make sure MySQL is running and the database exists:");
    console.error(`   CREATE DATABASE ${connConfig.database};\n`);
    process.exit(1);
  }

  // ── Run migrations ───────────────────────────────────────────────────────────
  const migrationsDir = join(ROOT, "drizzle");
  const sqlFiles = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log(`📦  Running ${sqlFiles.length} migrations...\n`);

  for (const file of sqlFiles) {
    const sql = readFileSync(join(migrationsDir, file), "utf-8");
    // Strip Drizzle Kit statement-breakpoint markers before parsing
    const cleaned = sql.replace(/--> statement-breakpoint/g, "");
    const statements = cleaned
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    let applied = 0;
    for (const stmt of statements) {
      try {
        await conn.execute(stmt);
        applied++;
      } catch (err) {
        // Ignore "column already exists" / "table already exists" errors — safe to re-run
        if (
          err.code === "ER_DUP_FIELDNAME" ||
          err.code === "ER_TABLE_EXISTS_ERROR" ||
          err.code === "ER_DUP_KEYNAME" ||
          err.errno === 1060 || // duplicate column
          err.errno === 1050 || // table already exists
          err.errno === 1061    // duplicate key name
        ) {
          // Already applied — skip silently
        } else {
          console.warn(`   ⚠  ${file}: ${err.message}`);
        }
      }
    }
    console.log(`   ✓  ${file} (${applied} statements)`);
  }

  // ── Create owner user ────────────────────────────────────────────────────────
  console.log("\n👤  Setting up owner account...");

  const ownerName = "Owner";
  const ownerEmail = "owner@exteriorexperts.local";

  // Insert user
  try {
    await conn.execute(
      `INSERT INTO users (openId, name, email, role, loginMethod, lastSignedIn)
       VALUES (?, ?, ?, 'admin', 'local', NOW())
       ON DUPLICATE KEY UPDATE name = VALUES(name), role = 'admin'`,
      [OWNER_OPEN_ID, ownerName, ownerEmail]
    );
    console.log(`   ✓  User created (openId: ${OWNER_OPEN_ID})`);
  } catch (err) {
    console.warn(`   ⚠  Could not create user: ${err.message}`);
  }

  // Create a company for this user if none exists
  let companyId;
  try {
    const [rows] = await conn.execute(
      `SELECT id FROM companies LIMIT 1`
    );
    if (rows.length > 0) {
      companyId = rows[0].id;
      console.log(`   ✓  Using existing company (id: ${companyId})`);
    } else {
      const [result] = await conn.execute(
        `INSERT INTO companies (name, phone, email, defaultTaxRate)
         VALUES ('Exterior Experts', '(931) 555-0100', 'info@exteriorexperts.com', 9.75)`
      );
      companyId = result.insertId;
      console.log(`   ✓  Company created (id: ${companyId})`);
    }
  } catch (err) {
    console.warn(`   ⚠  Could not create company: ${err.message}`);
  }

  // Link user to company
  if (companyId) {
    try {
      await conn.execute(
        `UPDATE users SET companyId = ? WHERE openId = ?`,
        [companyId, OWNER_OPEN_ID]
      );
      console.log(`   ✓  User linked to company`);
    } catch (err) {
      console.warn(`   ⚠  Could not link user to company: ${err.message}`);
    }
  }

  await conn.end();

  // ── Mint session cookie ──────────────────────────────────────────────────────
  console.log("\n🔑  Generating session cookie...\n");
  const cookie = await mintSessionCookie(OWNER_OPEN_ID, ownerName);

  console.log("═".repeat(70));
  console.log("\n✅  Bootstrap complete! Here's how to log in:\n");
  console.log("1. Start the app:    npm run dev");
  console.log("2. Open:             http://localhost:3000");
  console.log("3. Open DevTools → Application → Cookies → http://localhost:3000");
  console.log(`4. Add a cookie named:   crm_session`);
  console.log(`   With this value:\n`);
  console.log(`   ${cookie}\n`);
  console.log("5. Refresh the page — you'll be logged in as Owner\n");
  console.log("═".repeat(70));
  console.log("\n💡  Tip: Alternatively, paste this into your browser console:");
  console.log(`\n   document.cookie = "crm_session=${cookie}; path=/; max-age=31536000";\n`);
  console.log("   Then refresh the page.\n");
}

main().catch((err) => {
  console.error("\n❌  Bootstrap failed:", err.message);
  process.exit(1);
});
