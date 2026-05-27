import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "clockin_staff_session";
const ALG = "HS256";

const ttlSec = () => Number(process.env.STAFF_SESSION_TTL_MIN ?? 720) * 60;

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error("SESSION_SECRET must be set and at least 32 characters.");
  }
  return new TextEncoder().encode(s);
}

export type StaffSessionPayload = {
  staff_id: string;
  tenant_id: string;
};

export async function issueStaffSession(payload: StaffSessionPayload): Promise<void> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(`${ttlSec()}s`)
    .sign(secret());

  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ttlSec(),
  });
}

export async function readStaffSession(): Promise<StaffSessionPayload | null> {
  const c = (await cookies()).get(COOKIE_NAME)?.value;
  if (!c) return null;
  try {
    const { payload } = await jwtVerify(c, secret());
    if (typeof payload.staff_id !== "string" || typeof payload.tenant_id !== "string") {
      return null;
    }
    return { staff_id: payload.staff_id, tenant_id: payload.tenant_id };
  } catch {
    return null;
  }
}

export async function clearStaffSession(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}

export async function readStaffSessionFromCookie(value: string | undefined): Promise<StaffSessionPayload | null> {
  if (!value) return null;
  try {
    const { payload } = await jwtVerify(value, secret());
    if (typeof payload.staff_id !== "string" || typeof payload.tenant_id !== "string") {
      return null;
    }
    return { staff_id: payload.staff_id, tenant_id: payload.tenant_id };
  } catch {
    return null;
  }
}

export const STAFF_SESSION_COOKIE = COOKIE_NAME;
