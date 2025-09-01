import { Context } from "../dep/oak.ts";

export async function cacheMiddleware(
  ctx: Context,
  next: () => Promise<unknown>
) {}
