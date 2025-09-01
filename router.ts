import authRouter from "./api/auth.ts";
import blobRouter from "./api/blob.ts";
import { httpErrors, Router } from "./dep/oak.ts";
import { path } from "./dep/std.ts";
import { openapiSpecification } from "./openapi.ts";
import config from "./service/config.ts";

export function initializeRouter() {
  console.group("Initializing router...");
  console.time("Initializing router");
  const apiRouter = setupAPIRoutes();
  const staticRouter = setupStaticRoutes();

  const router = new Router();
  router
    .use(apiRouter.routes(), apiRouter.allowedMethods())
    .use(staticRouter.routes(), staticRouter.allowedMethods());

  console.groupEnd();
  console.timeEnd("Initializing router");
  return router;
}

function setupAPIRoutes() {
  console.group("Registering API routes...");
  console.time("Registering API routes");
  const apiRouter = new Router({
    prefix: config.API_ROUTE,
  });
  // TODO more to come
  apiRouter
    .use("/auth", authRouter.routes(), authRouter.allowedMethods())
    .use("/blob", blobRouter.routes(), blobRouter.allowedMethods())
    .get("/", async (ctx) => {
      ctx.response.headers.set("Content-type", "application/json");
      if (config.OPENAPI_FILE_PATH) {
        await ctx.send({
          root: path.dirname(config.OPENAPI_FILE_PATH),
          path: config.OPENAPI_FILE_PATH,
        });
        return;
      }
      ctx.response.body = openapiSpecification;
    });
  console.groupEnd();
  console.timeEnd("Registering API routes");
  return apiRouter;
}

function setupStaticRoutes() {
  console.group("Registering static routes...");
  console.time("Registering static routes");
  const staticRouter = new Router();
  if (config.STATIC_ROUTES) {
    const frontends = config.STATIC_ROUTES.split(":");
    for (const frontend of frontends) {
      setupStaticRoute(frontend, staticRouter);
    }
  }
  console.groupEnd();
  console.timeEnd("Registering static routes");
  return staticRouter;
}

function setupStaticRoute(
  frontend: string,
  staticRouter: Router<Record<string, unknown>>
) {
  const [routerPath, filePath, indexPath, fallbackPath] = frontend.split(",");
  console.info(
    `Registering static route at %c${routerPath}%c for local path %c${filePath}%c with index %c${indexPath}%c and fallback to %c${fallbackPath}%c.`,
    "font-style: italic",
    "",
    "font-style: italic",
    "",
    "font-style: italic",
    "",
    "font-style: italic",
    ""
  );
  console.time(`Registering static route at ${routerPath}`);
  staticRouter.get(`${routerPath}(/.*)?`, async (ctx) => {
    if (ctx.request.url.pathname === routerPath && !routerPath.endsWith("/")) {
      ctx.response.redirect(`${routerPath}/`);
      return;
    }
    try {
      await ctx.send({
        root: filePath,
        index: indexPath || void 0,
        path: ctx.request.url.pathname.substring(routerPath.length) || "/",
      });
    } catch (e) {
      if (e instanceof httpErrors.NotFound) {
        await ctx.send({
          root: filePath,
          path: fallbackPath || void 0,
        });
      }
    }
  });
  console.timeEnd(`Registering static route at ${routerPath}`);
}
