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

export async function getBlobCategories() {
  const kv = useKv();
  if (!kv) {
    throw new HttpError("DB not initialized.");
  }
  const list = kv.list({ prefix: KEY_PREFIX });
  const result: Set<Deno.KvKeyPart> = new Set();
  for await (const item of list) {
    if (item.key.length !== KEY_PREFIX.length + 1) {
      continue;
    }
    const key = item.key.at(KEY_PREFIX.length);
    if (key) {
      result.add(key);
    }
  }
  return result;
}

export async function getCategory(category: string) {
  const kv = useKv();
  if (!kv) {
    throw new HttpError("DB not initialized.");
  }
  return await kv.get(KEY_PREFIX.concat(category));
}

async function setCategory(category: string, meta: unknown) {
  const kv = useKv();
  if (!kv) {
    throw new HttpError("DB not initialized.");
  }
  return await kv.set(KEY_PREFIX.concat(category), meta);
}

export async function createCategory(category: string, meta: unknown) {
  if (await checkIfCategoryExists(category)) {
    throw new HttpError("The category already exists.");
  }
  await setCategory(category, meta);
}

export async function updateCategory(category: string, meta: unknown) {
  if (!(await checkIfCategoryExists(category))) {
    throw new HttpError("The category does not exist.");
  }
  await setCategory(category, meta);
}

async function deleteInnerBlobs(category: string) {
  const blobs = await getBlobKeys(category);
  if (!blobs) return;
  await Promise.all([...blobs].map((blob) => deleteBlob(category, blob)));
  if (config.BLOB_PATH) {
    try {
      await Deno.remove(path.join(config.BLOB_PATH, category), {
        recursive: true,
      });
    } catch {
      // ignore
    }
  }
}

export async function deleteCategory(category: string) {
  const kv = useKv();
  if (!kv) {
    throw new HttpError("DB not initialized.");
  }
  const categoryKey = KEY_PREFIX.concat(category);
  if (!(await checkIfCategoryExists(category))) {
    throw new HttpError("The category does not exist.");
  }
  await deleteInnerBlobs(category);
  await kv.delete(categoryKey);
}

export async function getBlobKeys(category: string) {
  const kv = useKv();
  if (!kv) {
    throw new HttpError("DB not initialized.");
  }
  const KEY_PREFIX_CATEGORY = KEY_PREFIX.concat(category);
  if (!(await checkIfCategoryExists(category))) {
    return;
  }
  const list = kv.list({ prefix: KEY_PREFIX_CATEGORY });
  const result: Set<string> = new Set();
  for await (const item of list) {
    const key = item.key.at(KEY_PREFIX_CATEGORY.length);
    if (key) {
      result.add(key as string);
    }
  }
  return result;
}

export async function getBlob(category: string, key: string) {
  const kv = useKv();
  if (!kv) {
    throw new HttpError("DB not initialized.");
  }
  if (!(await checkIfBlobExists(category, key))) {
    return;
  }
  const KEY_PREFIX_CATEGORY = KEY_PREFIX.concat(category);
  const contentType = (
    await kv.get(KEY_PREFIX_CATEGORY.concat(key).concat("content-type"))
  ).value as string | null | undefined;
  let stream: ReadableStream<Uint8Array> | undefined = void 0;
  if (config.BLOB_PATH) {
    // TODO it seems to be automatically closed, but need to make sure
    const file = await Deno.open(path.join(config.BLOB_PATH, category, key), {
      read: true,
    });
    stream = file.readable;
  } else {
    stream = kvBlob.getAsStream(kv, KEY_PREFIX_CATEGORY.concat(key));
  }
  return {
    content: stream,
    contentType,
  };
}

async function setblob(
  category: string,
  key: string,
  value: ReadableStream<Uint8Array>,
  contentType?: string
) {
  const kv = useKv();
  if (!kv) {
    throw new HttpError("DB not initialized.");
  }
  const KEY_PREFIX_CATEGORY = KEY_PREFIX.concat(category);
  await kv.set(
    KEY_PREFIX_CATEGORY.concat(key).concat("content-type"),
    contentType
  );
  if (config.BLOB_PATH) {
    await Deno.mkdir(path.join(config.BLOB_PATH, category), {
      recursive: true,
    });
    await Deno.writeFile(path.join(config.BLOB_PATH, category, key), value);
    return;
  }
  // TODO this is a workaround for not able to pass stream directly (breaks data)
  const blob = await new Response(value).blob();
  await kvBlob.set(kv, KEY_PREFIX_CATEGORY.concat(key), blob);
}

export async function createBlob(
  category: string,
  key: string,
  value: ReadableStream<Uint8Array>,
  contentType?: string | null
) {
  if (await checkIfBlobExists(category, key)) {
    throw new HttpError("The blob already exists.");
  }
  await setblob(category, key, value, contentType ?? void 0);
}

export async function updateBlob(
  category: string,
  key: string,
  value: ReadableStream<Uint8Array>,
  contentType?: string | null
) {
  if (!(await checkIfBlobExists(category, key))) {
    throw new HttpError("The blob does not exist.");
  }
  await setblob(category, key, value, contentType ?? void 0);
}

export async function deleteBlob(category: string, key: string) {
  const kv = useKv();
  if (!kv) {
    throw new HttpError("DB not initialized.");
  }
  const KEY_PREFIX_CATEGORY = KEY_PREFIX.concat(category);
  await kv.delete(KEY_PREFIX_CATEGORY.concat(key).concat("content-type"));
  if (config.BLOB_PATH) {
    return await Deno.remove(path.join(config.BLOB_PATH, category, key));
  }
  await kvBlob.remove(kv, KEY_PREFIX_CATEGORY.concat(key));
}

async function checkIfCategoryExists(key: string) {
  const kv = useKv();
  if (!kv) {
    throw new HttpError("DB not initialized.");
  }
  return (await kv.get(KEY_PREFIX.concat(key))).versionstamp != null;
}

async function checkIfBlobExists(category: string, key: string) {
  const kv = useKv();
  if (!kv) {
    throw new HttpError("DB not initialized.");
  }
  const KEY_PREFIX_CATEGORY = KEY_PREFIX.concat(category);
  if (!(await checkIfCategoryExists(category))) {
    return false;
  }
  return (
    (await kv.get(KEY_PREFIX_CATEGORY.concat(key).concat("content-type")))
      .versionstamp != null
  );
}
