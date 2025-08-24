type AppConfigKeys =
  | "DB_PATH"
  | "CORS"
  | "BLOB_PATH"
  | "PASSCODE"
  | "FRONTENDS"
  | "OPENAPI_FILE_PATH";

export type AppConfig = Partial<Record<AppConfigKeys, string>>;

const config: AppConfig = {
  DB_PATH: Deno.env.get("DB_PATH"),
  CORS: Deno.env.get("CORS"),
  BLOB_PATH: Deno.env.get("BLOB_PATH"),
  PASSCODE: Deno.env.get("PASSCODE"),
  FRONTENDS: Deno.env.get("FRONTENDS"),
  OPENAPI_FILE_PATH: Deno.env.get("OPENAPI_FILE_PATH"),
};

export default config;
