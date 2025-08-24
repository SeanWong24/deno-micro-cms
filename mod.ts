import { Application } from "./dep/oak.ts";
import { router } from "./router.ts";
import { initializeBlobService } from "./service/blob.ts";
import config, { type AppConfig } from "./service/config.ts";
import { initializeKvService } from "./service/kv.ts";

const app = new Application();

export async function setupApp(appConfig: AppConfig = {}) {
  Object.assign(config, appConfig);
  await initializeKvService();
  await initializeBlobService();
  app.use(router.routes());
  app.use(router.allowedMethods());
  return app;
}

if (import.meta.main) {
  await setupApp();
}

export default { fetch: app.fetch };
