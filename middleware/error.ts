import { type Context, isHttpError } from "../dep/oak.ts";

export async function errorHandler(ctx: Context, next: () => Promise<unknown>) {
  try {
    await next();
  } catch (err) {
    if (!isHttpError(err)) {
      ctx.response.status = 500;
      ctx.response.body = {
        success: false,
        message: "Internal Server Error",
      };
      return;
    }
    ctx.response.status = err.status || 500;
    ctx.response.body = {
      success: false,
      message: err.message || "Internal Server Error",
    };
  }
}
