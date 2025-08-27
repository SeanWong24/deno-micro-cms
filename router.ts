import { httpErrors, Router } from "./dep/oak.ts";
import config from "./service/config.ts";

export function initializeRouter() {
  const apiRouter = new Router({
    prefix: config.API_ROUTE,
  });
  apiRouter.get("/", async (ctx) => {
    ctx.response.body = "Hello, API!";
  }); // TODO more to come

  const staticRouter = new Router();
  if (config.STATIC_ROUTES) {
    const frontends = config.STATIC_ROUTES.split(":");
    for (const frontend of frontends) {
      const [routerPath, filePath, indexPath, fallbackPath] =
        frontend.split(",");
      staticRouter.get(`${routerPath}(/.*)?`, async (ctx) => {
        if (
          ctx.request.url.pathname === routerPath &&
          !routerPath.endsWith("/")
        ) {
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
    }
  }

  const router = new Router();

  router
    .use(apiRouter.routes(), apiRouter.allowedMethods())
    .use(staticRouter.routes(), staticRouter.allowedMethods());

  return router;
}
