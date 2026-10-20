import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { randomUUID } from "node:crypto";
import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { db } from "./db.server";

// Ported from Juj: local admin accounts (bcrypt + signed JWT session cookie), independent of buyer auth.
type AdminDoc = { _id: string; email: string; password_hash: string; name: string; role: "admin"; created_at: Date };
export type AdminUser = { id: string; email: string; name: string };

const COOKIE = "juj_admin_session";
const TTL = 7 * 24 * 3600;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 5;
const key = () => new TextEncoder().encode(process.env["JWT_SECRET"]);
const cookieOpts = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" };
const admins = async () => (await db()).collection<AdminDoc>("admin_users");
const attempts = async () => (await db()).collection<{ identifier: string; created_at: Date }>("admin_login_attempts");
const loginSchema = z.object({ email: z.string().trim().toLowerCase().email().max(200), password: z.string().min(1).max(200) });

let seeded: Promise<void> | undefined;
export function ensureAdmin() {
  seeded ??= (async () => {
    const email = process.env["ADMIN_EMAIL"]!.toLowerCase();
    const password = process.env["ADMIN_PASSWORD"]!;
    const col = await admins();
    await col.createIndex({ email: 1 }, { unique: true });
    const existing = await col.findOne({ email });
    if (!existing) {
      await col.insertOne({ _id: randomUUID(), email, password_hash: await bcrypt.hash(password, 10), name: "Admin", role: "admin", created_at: new Date() });
    } else if (!(await bcrypt.compare(password, existing.password_hash))) {
      await col.updateOne({ _id: existing._id }, { $set: { password_hash: await bcrypt.hash(password, 10) } });
    }
  })().catch((e) => {
    seeded = undefined;
    throw e;
  });
  return seeded;
}

export async function loginAdmin(raw: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const p = loginSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Enter a valid email and password." };
  await ensureAdmin();
  const identifier = p.data.email;
  const att = await attempts();
  const fails = await att.countDocuments({ identifier, created_at: { $gte: new Date(Date.now() - WINDOW_MS) } });
  if (fails >= MAX_FAILS) return { ok: false, error: "Too many attempts. Try again in 15 minutes." };
  const a = await (await admins()).findOne({ email: p.data.email });
  if (!a || !(await bcrypt.compare(p.data.password, a.password_hash))) {
    await att.insertOne({ identifier, created_at: new Date() });
    return { ok: false, error: "Wrong email or password." };
  }
  await att.deleteMany({ identifier });
  const token = await new SignJWT({ type: "admin" }).setProtectedHeader({ alg: "HS256" }).setSubject(a._id)
    .setIssuedAt().setExpirationTime(Math.floor(Date.now() / 1000) + TTL).sign(key());
  setCookie(COOKIE, token, { ...cookieOpts, maxAge: TTL });
  return { ok: true };
}

export function logoutAdmin() {
  deleteCookie(COOKIE, cookieOpts);
}

export async function currentAdmin(): Promise<AdminUser | null> {
  const token = getCookie(COOKIE);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    if (payload["type"] !== "admin" || !payload.sub) return null;
    const a = await (await admins()).findOne({ _id: payload.sub });
    return a ? { id: a._id, email: a.email, name: a.name } : null;
  } catch {
    return null;
  }
}

export async function requireAdmin() {
  const a = await currentAdmin();
  if (!a) throw new Error("Unauthorized");
  return a;
}
