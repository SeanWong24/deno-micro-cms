import { Router, Status } from "oak";
import config from "../service/config.ts";
import authMiddleware from "../middleware/auth.ts";
import { getOriginalHostWithoutPort } from "../service/utils.ts";

const router = new Router();

/**
 * @openapi
 * tags:
 *  name: Auth
 */

/**
 * @openapi
 * components:
 *  securitySchemes:
 *    cookieAuth:
 *      type: apiKey
 *      in: cookie
 *      name: authenticated
 */

router
  /**
   * @openapi
   * /auth:
   *  get:
   *    tags:
   *      - Auth
   *    security:
   *      - cookieAuth: []
   *    description: Determine if the current session is authenticated by checking the authentication cookie.
   *    responses:
   *      200:
   *        description: The current session is authenticated.
   *      403:
   *        description: The current session is not authenticated.
   */
  .get("/", authMiddleware, (ctx) => {
    ctx.response.body = true;
  })
  /**
   * @openapi
   * /auth/sign-in:
   *  post:
   *    tags:
   *      - Auth
   *    description: Sign in using a passcode. If succeed, an authentication cookie would be set.
   *    parameters:
   *      - name: passcode
   *        in: query
   *        required: true
   *        schema:
   *          type: string
   *    responses:
   *      200:
   *        description: Succeed to sign in.
   *        headers:
   *          Set-Cookie:
   *            schema:
   *              type: string
   *      403:
   *        description: Fail to sign in.
   */
  .post("/sign-in", (ctx) => {
    const isCORS = config.CORS &&
      (ctx.request.headers.get("Sec-Fetch-Site") !== "same-origin");
    const passcode = ctx.request.url.searchParams.get("passcode");
    if (passcode != config.PASSCODE) {
      ctx.throw(Status.Forbidden);
    }
    ctx.cookies.set("authenticated", "1", {
      domain: isCORS ? getOriginalHostWithoutPort(ctx.request) : undefined,
      path: "/",
      httpOnly: true,
      sameSite: isCORS ? "none" : "lax",
      secure: isCORS ? true : undefined,
    });
    ctx.response.body = "Signed in.";
  })
  /**
   * @openapi
   * /auth/sign-out:
   *  post:
   *    tags:
   *      - Auth
   *    description: Sign out. The authentication cookie would be removed.
   *    responses:
   *      200:
   *        description: Signed out.
   *        headers:
   *          Set-Cookie:
   *            schema:
   *              type: string
   */
  .post("/sign-out", (ctx) => {
    const isCORS = config.CORS &&
      (ctx.request.headers.get("Sec-Fetch-Site") !== "same-origin");
    ctx.cookies.delete("authenticated", {
      domain: isCORS ? getOriginalHostWithoutPort(ctx.request) : undefined,
      path: "/",
      httpOnly: true,
      sameSite: isCORS ? "none" : "lax",
      secure: isCORS ? true : undefined,
    });
    ctx.response.body = "Signed out.";
  });

export default router;
