import { Application } from "./dep/oak.ts";
import { router } from "./router.ts";
import config, { type AppConfig } from "./service/config.ts";

const app = new Application();

export async function setupApp(appConfig: AppConfig = {}) {
  Object.assign(config, appConfig);
  await Promise.resolve(); // TODO service initializationplaceholder
  app.use(router.routes());
  app.use(router.allowedMethods());
  return app;
}

if (import.meta.main) {
  await setupApp();
}

export default { fetch: app.fetch };
