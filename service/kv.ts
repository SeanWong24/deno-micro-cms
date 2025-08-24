import { path } from "../dep/std.ts";
import config from "./config.ts";

let kv: Deno.Kv | undefined;

export async function initializeKvService() {
  console.info(
    `Initializing KV service ${
      config.DB_PATH
        ? `with a configured path at %c${config.DB_PATH}`
        : "without a configured path%c"
    }.`,
    "font-style: italic"
  );
  if (config.DB_PATH) {
    const directoryPath = path.dirname(config.DB_PATH);
    await Deno.mkdir(directoryPath, { recursive: true });
  }
  kv = await Deno.openKv(config.DB_PATH);
  console.info("KV service initialized.");
}

export function useKv() {
  return kv;
}
