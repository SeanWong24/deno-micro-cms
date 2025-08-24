import { HttpError } from "../dep/oak.ts";
import { useKv } from "./kv.ts";

const keyPrefix = ["info"];

export async function getInfoKeys() {
  const kv = useKv();
  if (!kv) {
    throw new HttpError("DB not initialized.");
  }
  const list = kv.list({ prefix: keyPrefix });
  const result: Set<Deno.KvKeyPart> = new Set();
  for await (const item of list) {
    const key = item.key.at(keyPrefix.length);
    if (key) {
      result.add(key);
    }
  }
  return result;
}

export async function getInfo(key: string) {
  const kv = useKv();
  if (!kv) {
    throw new HttpError("DB not initialized.");
  }
  const info = await kv.get(keyPrefix.concat(key));
  return info.value;
}

export async function createInfo(key: string, value: unknown) {
  if (await checkIfInfoExists(key)) {
    throw new HttpError("The key already exists.");
  }
  setInfo(key, value);
}

export async function updateInfo(key: string, value: unknown) {
  if (!(await checkIfInfoExists(key))) {
    throw new HttpError("The key does not exists.");
  }
  setInfo(key, value);
}

export async function deleteInfo(key: string) {
  const kv = useKv();
  if (!kv) {
    throw new HttpError("DB not initialized.");
  }
  await kv.delete(keyPrefix.concat(key));
}

async function checkIfInfoExists(key: string) {
  const kv = useKv();
  if (!kv) {
    throw new HttpError("DB not initialized.");
  }
  const info = await kv.get(keyPrefix.concat(key));
  return info.versionstamp != null;
}

async function setInfo(key: string, value: unknown) {
  const kv = useKv();
  if (!kv) {
    throw new HttpError("DB not initialized.");
  }
  return await kv.set(keyPrefix.concat(key), value);
}
