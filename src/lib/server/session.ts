import { cookies } from "next/headers";
import { COOKIE, SESSION_HOURS, signToken, verifyToken, type Session } from "../session-core";

export type { Session };

export async function readSession(): Promise<Session | null> {
  const jar = await cookies();
  return verifyToken(jar.get(COOKIE)?.value);
}

export async function startSession(s: Session) {
  const jar = await cookies();
  jar.set(COOKIE, await signToken(s), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false", // set COOKIE_SECURE=false only for plain-http LAN/testing
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}
