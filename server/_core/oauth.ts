import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { OAuth2Client } from "google-auth-library";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { ENV } from "./env";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { generateRandomString } from "@shared/_core/errors";

// In-memory store for OAuth state (for local dev/testing)
// In production, use Redis or similar for distributed systems
const stateStore = new Map<string, { verifier: string; createdAt: number }>();
const STATE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

function generateState(): string {
  return generateRandomString(32);
}

function storeState(state: string, verifier: string): void {
  stateStore.set(state, { verifier, createdAt: Date.now() });
  // Cleanup old entries every 100 stores
  if (stateStore.size % 100 === 0) {
    const now = Date.now();
    for (const [s, data] of stateStore.entries()) {
      if (now - data.createdAt > STATE_EXPIRY_MS) {
        stateStore.delete(s);
      }
    }
  }
}

function retrieveAndClearState(state: string): string | null {
  const data = stateStore.get(state);
  if (!data) return null;
  if (Date.now() - data.createdAt > STATE_EXPIRY_MS) {
    stateStore.delete(state);
    return null;
  }
  stateStore.delete(state);
  return data.verifier;
}

function getGoogleClient(): OAuth2Client {
  if (!ENV.googleClientId || !ENV.googleClientSecret || !ENV.googleRedirectUri) {
    console.warn(
      "[Auth] Google OAuth not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI"
    );
  }

  return new OAuth2Client({
    clientId: ENV.googleClientId,
    clientSecret: ENV.googleClientSecret,
    redirectUri: ENV.googleRedirectUri,
  });
}

export function registerOAuthRoutes(app: Express) {
  /**
   * GET /auth/login
   * Initiates Google OAuth flow by redirecting to Google consent screen.
   * Generates state for CSRF protection and stores it.
   */
  app.get("/auth/login", (req: Request, res: Response) => {
    try {
      if (!ENV.googleClientId || !ENV.googleClientSecret) {
        return res.status(503).json({
          error: "Auth not configured",
          message: "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable login",
        });
      }

      const client = getGoogleClient();
      const state = generateState();
      const verifier = generateRandomString(43);

      // Store state and verifier for later validation
      storeState(state, verifier);

      // Generate Google OAuth URL
      const url = client.generateAuthUrl({
        access_type: "offline",
        scope: ["openid", "email", "profile"],
        state,
      });

      res.redirect(url);
    } catch (error) {
      console.error("[Auth] Login initiation failed", error);
      res.status(500).json({ error: "Login initiation failed" });
    }
  });

  /**
   * GET /auth/callback
   * Google OAuth callback endpoint.
   * Exchanges authorization code for ID token, verifies it, creates session.
   */
  app.get("/auth/callback", async (req: Request, res: Response) => {
    try {
      const code = req.query.code as string;
      const state = req.query.state as string;

      if (!code || !state) {
        return res.status(400).json({
          error: "Missing code or state",
          message: "OAuth callback requires code and state parameters",
        });
      }

      // Validate state (CSRF protection)
      const verifier = retrieveAndClearState(state);
      if (!verifier) {
        return res.status(400).json({
          error: "Invalid state",
          message: "State expired or not found. Start login again.",
        });
      }

      const client = getGoogleClient();

      // Exchange code for tokens
      const { tokens } = await client.getToken(code);

      if (!tokens.id_token) {
        return res.status(400).json({
          error: "No ID token received",
          message: "Google OAuth response did not include ID token",
        });
      }

      // Verify and decode ID token
      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: ENV.googleClientId,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        return res.status(400).json({
          error: "Invalid token payload",
        });
      }

      const { sub: googleSub, email, name } = payload;

      if (!googleSub) {
        return res.status(400).json({
          error: "Missing sub claim in token",
          message: "Cannot identify user",
        });
      }

      // Use Google's unique subject (sub) as openId
      // This ensures the same Google account always maps to same user
      const openId = `google:${googleSub}`;

      // Upsert user to database
      await db.upsertUser({
        openId,
        name: name || null,
        email: email ?? null,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });

      // Create session token
      const sessionToken = await sdk.createSessionToken(openId, {
        name: name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      // Set session cookie
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      // Redirect to CRM dashboard
      res.redirect("/admin");
    } catch (error) {
      console.error("[Auth] Callback failed", error);
      res.status(500).json({
        error: "OAuth callback failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}
