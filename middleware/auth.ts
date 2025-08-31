import { type Context, type Next, Status } from "../dep/oak.ts";
import { isAuthenticated, renewAuthenticationToken } from "../service/auth.ts";

export default async (ctx: Context, next: Next) => {
  const authenticated = await ctx.cookies.get("authenticated");
  if (!(await isAuthenticated(authenticated))) {
    ctx.throw(Status.Forbidden);
  }
  await renewAuthenticationToken(authenticated);
  await next();
};
