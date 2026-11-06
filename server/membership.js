import crypto from "node:crypto";
import dotenv from "dotenv";
dotenv.config();
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(here, "..", ".data");
const dataFile = path.join(dataDir, "members.json");
const configuredSecret = process.env.NEXUS_SESSION_SECRET || "";
const secret = configuredSecret.length >= 32 && !configuredSecret.toLowerCase().includes("remplace") ? configuredSecret : crypto.randomBytes(32).toString("hex");
const authAttempts = new Map();
function authRateLimited(req) {
  const now = Date.now(); const key = req.ip || "unknown";
  const recent = (authAttempts.get(key) || []).filter(time => now - time < 15 * 60_000);
  if (recent.length >= 12) return true;
  recent.push(now); authAttempts.set(key, recent); return false;
}
const plans = {
  free: { name: "Gratuit", dailyAi: 25, ads: true }
};

function readStore() {
  try { const value = JSON.parse(fs.readFileSync(dataFile, "utf8")); return value && typeof value === "object" ? value : { users: [] }; }
  catch { return { users: [] }; }
}
function writeStore(store) {
  fs.mkdirSync(dataDir, { recursive: true });
  const temp = `${dataFile}.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(store, null, 2), { mode: 0o600 });
  fs.renameSync(temp, dataFile);
}
function publicUser(user) {
  return { id: user.id, email: user.email, plan: "free", planName: "Gratuit", subscriptionStatus: "gratuit", adsEnabled: true, dailyAiLimit: plans.free.dailyAi, usageToday: user.usageDay === new Date().toISOString().slice(0, 10) ? user.usageCount || 0 : 0 };
}
function tokenFor(user) {
  const payload = Buffer.from(JSON.stringify({ sub: user.id, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 })).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}
function userFromRequest(req, store = readStore()) {
  const header = String(req.headers.authorization || "");
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice(7);
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest();
  let actual;
  try { actual = Buffer.from(signature, "base64url"); } catch { return null; }
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!decoded.sub || decoded.exp < Date.now()) return null;
    return store.users.find(user => user.id === decoded.sub) || null;
  } catch { return null; }
}
function sendError(res, status, error) { return res.status(status).json({ error }); }
function passwordHash(password, salt = crypto.randomBytes(16).toString("hex")) {
  return { salt, hash: crypto.scryptSync(password, salt, 64).toString("hex") };
}

export function optionalUser(req) { return userFromRequest(req); }

export function consumeAiQuota(req) {
  const store = readStore();
  const user = userFromRequest(req, store);
  const day = new Date().toISOString().slice(0, 10);
  if (!user) {
    const ipKey = `guest:${req.ip || "unknown"}`;
    const guest = store.users.find(item => item.id === ipKey) || { id: ipKey, plan: "free", usageDay: day, usageCount: 0 };
    if (guest.usageDay !== day) { guest.usageDay = day; guest.usageCount = 0; }
    if (guest.usageCount >= 5) return { ok: false, error: "Limite d’utilisation raisonnable atteinte (5 messages IA par jour sans compte). Crée un compte gratuit pour obtenir 25 messages par jour." };
    guest.usageCount += 1;
    if (!store.users.some(item => item.id === ipKey)) store.users.push(guest);
    writeStore(store);
    return { ok: true, user: null, remaining: 5 - guest.usageCount };
  }
  if (user.usageDay !== day) { user.usageDay = day; user.usageCount = 0; }
  const limit = plans.free.dailyAi;
  if (user.usageCount >= limit) return { ok: false, error: `Limite d’utilisation raisonnable atteinte (${limit} messages IA aujourd’hui). Les fonctions restent gratuites : reviens demain.` };
  user.usageCount += 1;
  writeStore(store);
  return { ok: true, user: publicUser(user), remaining: limit - user.usageCount };
}

export function registerMembershipRoutes(app) {
  app.post("/api/auth/register", (req, res) => {
    if (authRateLimited(req)) return sendError(res, 429, "Trop de tentatives. Réessaie dans 15 minutes.");
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 190) return sendError(res, 400, "Adresse e-mail invalide.");
    if (password.length < 10 || password.length > 200) return sendError(res, 400, "Le mot de passe doit contenir au moins 10 caractères.");
    const store = readStore();
    if (store.users.some(user => user.email === email)) return sendError(res, 409, "Un compte existe déjà avec cette adresse e-mail.");
    const credentials = passwordHash(password);
    const user = { id: crypto.randomUUID(), email, ...credentials, plan: "free", subscriptionStatus: "inactive", createdAt: new Date().toISOString(), usageDay: new Date().toISOString().slice(0, 10), usageCount: 0 };
    store.users.push(user); writeStore(store);
    res.status(201).json({ token: tokenFor(user), user: publicUser(user) });
  });

  app.post("/api/auth/login", (req, res) => {
    if (authRateLimited(req)) return sendError(res, 429, "Trop de tentatives. Réessaie dans 15 minutes.");
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const store = readStore(); const user = store.users.find(item => item.email === email);
    if (!user || !crypto.timingSafeEqual(Buffer.from(passwordHash(password, user.salt).hash, "hex"), Buffer.from(user.hash, "hex"))) return sendError(res, 401, "E-mail ou mot de passe incorrect.");
    res.json({ token: tokenFor(user), user: publicUser(user) });
  });

  app.get("/api/auth/me", (req, res) => {
    const user = userFromRequest(req);
    if (!user) return sendError(res, 401, "Session expirée. Reconnecte-toi.");
    res.json({ user: publicUser(user) });
  });

  app.get("/api/monetization/config", (_req, res) => {
    const partnerUrl = String(process.env.NEXUS_PARTNER_URL || "").trim();
    let safePartnerUrl = "";
    try { const parsed = new URL(partnerUrl); if (parsed.protocol === "https:") safePartnerUrl = parsed.toString(); } catch {}
    res.json({
      model: "free-with-ads-and-affiliates",
      partnerName: String(process.env.NEXUS_PARTNER_NAME || "Partenaire NEXUS").slice(0, 80),
      partnerUrl: safePartnerUrl,
      adsEnabled: true
    });
  });

  app.post("/api/monetization/click", (req, res) => {
    const partner = String(req.body?.partner || "default").slice(0, 80);
    const store = readStore();
    store.monetizationEvents ||= [];
    store.monetizationEvents.push({ type: "affiliate_click", partner, at: new Date().toISOString() });
    if (store.monetizationEvents.length > 5000) store.monetizationEvents = store.monetizationEvents.slice(-5000);
    writeStore(store);
    res.json({ tracked: true });
  });

}
