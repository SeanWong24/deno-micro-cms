export type AppConfig = Partial<typeof config>;

const config = {
  DB_PATH: Deno.env.get("DB_PATH"),
  CORS: Deno.env.get("CORS"),
  BLOB_PATH: Deno.env.get("BLOB_PATH"),
  PASSCODE: Deno.env.get("PASSCODE"),
  OPENAPI_FILE_PATH: Deno.env.get("OPENAPI_FILE_PATH"),
  API_ROUTE: Deno.env.get("API_ROUTE") ?? "/api",
  STATIC_ROUTES: Deno.env.get("STATIC_ROUTES"),
};

export default config;
