import { path } from "../dep/std.ts";
import { HttpError } from "../dep/oak.ts";
import { blob as kvBlob } from "../dep/kv-toolbox.ts";
import config from "./config.ts";
import { useKv } from "./kv.ts";

export async function initializeBlobService() {
  console.info(
    `Initializing BLOB service ${
      config.BLOB_PATH
        ? `with a configured path at %c${config.BLOB_PATH}`
        : "without a configured path%c"
    }.`,
    "font-style: italic"
  );
  console.time("Initializing BLOB service");
  if (config.BLOB_PATH) {
    await Deno.mkdir(config.BLOB_PATH, { recursive: true });
  }
  console.timeEnd("Initializing BLOB service");
}

const KEY_PREFIX = ["blob"];

export async function getBlobKeys() {
  const kv = useKv();
  if (!kv) {
    throw new HttpError("DB not initialized.");
  }
  const list = kv.list({ prefix: KEY_PREFIX });
  const result: Set<Deno.KvKeyPart> = new Set();
  for await (const item of list) {
    const key = item.key.at(KEY_PREFIX.length);
    if (key) {
      result.add(key);
    }
  }
  return result;
}

export async function getBlob(key: string) {
  const kv = useKv();
  if (!kv) {
    throw new HttpError("DB not initialized.");
  }
  if (!(await checkIfBlobExists(key))) {
    return;
  }
  const contentType = (
    await kv.get(KEY_PREFIX.concat(key).concat("content-type"))
  ).value as string | null | undefined;
  let stream: ReadableStream<Uint8Array> | undefined = void 0;
  if (config.BLOB_PATH) {
    // TODO it seems to be automatically closed, but need to make sure
    const file = await Deno.open(path.join(config.BLOB_PATH, key), {
      read: true,
    });
    stream = file.readable;
  } else {
    stream = kvBlob.getAsStream(kv, KEY_PREFIX.concat(key));
  }
  return {
    content: stream,
    contentType,
  };
}

async function setblob(
  key: string,
  value: ReadableStream<Uint8Array>,
  contentType?: string
) {
  const kv = useKv();
  if (!kv) {
    throw new HttpError("DB not initialized.");
  }
  await kv.set(KEY_PREFIX.concat(key).concat("content-type"), contentType);
  if (config.BLOB_PATH) {
    await Deno.writeFile(path.join(config.BLOB_PATH, key), value);
    return;
  }
  // TODO this is a workaround for not able to pass stream directly (breaks data)
  const blob = await new Response(value).blob();
  await kvBlob.set(kv, KEY_PREFIX.concat(key), blob);
}

export async function createBlob(
  key: string,
  value: ReadableStream<Uint8Array>,
  contentType?: string | null
) {
  if (await checkIfBlobExists(key)) {
    throw new HttpError("The blob already exists.");
  }
  await setblob(key, value, contentType ?? void 0);
}

export async function updateBlob(
  key: string,
  value: ReadableStream<Uint8Array>,
  contentType?: string | null
) {
  if (!(await checkIfBlobExists(key))) {
    throw new HttpError("The blob does not exist.");
  }
  await setblob(key, value, contentType ?? void 0);
}

export async function deleteBlob(key: string) {
  const kv = useKv();
  if (!kv) {
    throw new HttpError("DB not initialized.");
  }
  await kv.delete(KEY_PREFIX.concat(key).concat("content-type"));
  if (config.BLOB_PATH) {
    return await Deno.remove(path.join(config.BLOB_PATH, key));
  }
  await kvBlob.remove(kv, KEY_PREFIX.concat(key));
}

async function checkIfBlobExists(key: string) {
  const kv = useKv();
  if (!kv) {
    throw new HttpError("DB not initialized.");
  }
  return (
    (await kv.get(KEY_PREFIX.concat(key).concat("content-type")))
      .versionstamp != null
  );
}
