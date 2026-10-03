// Edge-safe (used by middleware): token signing/verification only.
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "./rbac";

export interface Session {
  uid: number;
  name: string;
  role: Role;
  partnerId: number | null;
  employeeId: number | null;
}

export const COOKIE = "cw_session";
export const SESSION_HOURS = 10;

function key() {
  const secret = process.env.SESSION_SECRET || "";
  if (secret.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
  return new TextEncoder().encode(secret);
}

export async function signToken(s: Session): Promise<string> {
  return new SignJWT({ ...s })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(key());
}

export async function verifyToken(token?: string): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return {
      uid: Number(payload.uid),
      name: String(payload.name),
      role: payload.role as Role,
      partnerId: (payload.partnerId as number | null) ?? null,
      employeeId: (payload.employeeId as number | null) ?? null,
    };
  } catch {
    return null;
  }
}
