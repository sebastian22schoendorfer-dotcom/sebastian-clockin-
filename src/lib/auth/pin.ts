import argon2 from "argon2";

export const PIN_REGEX = /^\d{6}$/;

export async function hashPin(pin: string): Promise<string> {
  if (!PIN_REGEX.test(pin)) throw new Error("PIN must be exactly 6 digits.");
  return argon2.hash(pin, { type: argon2.argon2id });
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  if (!PIN_REGEX.test(pin)) return false;
  try {
    return await argon2.verify(hash, pin);
  } catch {
    return false;
  }
}
