import { Application } from "./dep/oak.ts";
import { initializeRouter } from "./router.ts";
import { initializeBlobService } from "./service/blob.ts";
import config, { type AppConfig } from "./service/config.ts";
import { initializeKvService } from "./service/kv.ts";

const app = new Application();

export async function setupApp(appConfig: AppConfig = {}) {
  console.group("Initializing app...");
  console.time("Initializing app");
  Object.assign(config, appConfig);
  const router = initializeRouter();
  await initializeServices();
  app.use(router.routes());
  app.use(router.allowedMethods());
  console.groupEnd();
  console.timeEnd("Initializing app");
  return app;
}

async function initializeServices() {
  console.group("Initializing services...");
  console.time("Initializing services");
  await initializeKvService();
  await initializeBlobService();
  console.groupEnd();
  console.timeEnd("Initializing services");
}

if (import.meta.main) {
  await setupApp();
}

export default { fetch: app.fetch };
