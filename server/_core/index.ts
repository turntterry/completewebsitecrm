import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import path from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerSmsWebhook } from "../webhooks/twilioWebhook";
import { registerPaymentWebhook } from "../webhooks/paymentWebhook";
import { mockAvailabilityProvider } from "@shared/availability";
import { trpcOnError } from "./observability";
import { registerSeoRoutes } from "./seoRoutes";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Trust proxy headers from Render/reverse proxy (needed for secure cookies + HTTPS detection)
  app.set("trust proxy", 1);

  // Production: redirect HTTP → HTTPS and add security headers
  if (process.env.NODE_ENV === "production") {
    app.use((req, res, next) => {
      if (req.protocol !== "https") {
        return res.redirect(301, `https://${req.get("host")}${req.originalUrl}`);
      }
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("X-Frame-Options", "DENY");
      next();
    });
  }

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Google OAuth 2.0 routes (/auth/login, /auth/callback)
  registerOAuthRoutes(app);
  // Twilio inbound SMS webhook
  registerSmsWebhook(app);
  // Payment provider webhook
  registerPaymentWebhook(app);
  // robots.txt + sitemap.xml for marketing pages
  registerSeoRoutes(app);
  // Local-only mock scheduler endpoint (dev only — not exposed in production)
  if (process.env.NODE_ENV !== "production") app.post("/api/mock/scheduler", (req, res) => {
    try {
      const {
        durationMinutes = 90,
        daysAhead = 7,
        startHour,
        endHour,
        paddingMinutes = 0,
      } = req.body ?? {};

      const slots = mockAvailabilityProvider.getSlots({
        durationMinutes: Number(durationMinutes) || 90,
        daysAhead: Number(daysAhead) || 7,
        startHour: startHour !== undefined ? Number(startHour) : undefined,
        endHour: endHour !== undefined ? Number(endHour) : undefined,
        paddingMinutes: Number(paddingMinutes) || 0,
      });

      res.json({ slots });
    } catch (err) {
      res.status(400).json({ error: "Failed to generate mock slots", detail: String(err) });
    }
  });
  // Serve locally uploaded files (fallback when Forge storage is not configured)
  app.use("/uploads", express.static(path.resolve(process.cwd(), "public/uploads")));
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError: trpcOnError,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
