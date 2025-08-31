import { HttpError } from "../dep/oak.ts";
import { useKv } from "./kv.ts";

const KEY_PREFIX = ["auth"];
const TOKEN_KEY_PREFIX = KEY_PREFIX.concat("token");
const INITIAL_TTL = 30 * 60 * 1000;
const RENEWED_TTL = 30 * 60 * 1000;

export async function isAuthenticated(token?: string) {
  if (!token) {
    return false;
  }
  const kv = useKv();
  if (!kv) {
    throw new HttpError("DB not initialized.");
  }
  const timestamp: Deno.KvEntryMaybe<number> = await kv.get(
    TOKEN_KEY_PREFIX.concat(token)
  );
  return timestamp.versionstamp != null && timestamp.value > Date.now();
}

export async function createAuthenticationToken() {
  const token = crypto.randomUUID();
  await renewAuthenticationToken(token, INITIAL_TTL);
  return token;
}

export async function renewAuthenticationToken(
  token?: string,
  ttl: number = RENEWED_TTL
) {
  if (!token) {
    return;
  }
  const kv = useKv();
  if (!kv) {
    throw new HttpError("DB not initialized.");
  }
  return await kv.set(
    TOKEN_KEY_PREFIX.concat(token),
    calculateExpirationTimestamp(ttl),
    {
      expireIn: ttl,
    }
  );
}

function calculateExpirationTimestamp(ttl: number) {
  return Date.now() + ttl;
}
