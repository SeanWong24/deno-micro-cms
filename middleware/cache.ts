import {
  Status,
  type Context,
  type Next,
  type Response as OakResponse,
} from "../dep/oak.ts";

const cache = await caches.open("blob");

export async function cacheMiddleware(ctx: Context, next: Next) {
  switch (ctx.request.method) {
    case "GET": {
      const cachedResponse = await getCachedResponse(ctx.request.url);
      if (applyCachedResponse(ctx.response, cachedResponse)) {
        return;
      }
      await next();
      console.info(`Cache miss for %c${ctx.request.url}`, "font-style: italic");
      if (ctx.response.status !== 200 || !ctx.response.body) {
        return;
      }
      const response = await buildWebResponse(ctx.response);
      await cache.put(ctx.request.url, response);
      return;
    }
    case "POST":
    case "PUT":
    case "DELETE": {
      try {
        await next();
      } finally {
        await cache.put(ctx.request.url, generateDirtyMarker());
      }
      return;
    }
    default: {
      await next();
      return;
    }
  }
}

async function getCachedResponse(request: RequestInfo | URL) {
  const response = await cache.match(request);
  if (isDirtyMarker(response)) {
    return void 0;
  }
  return response;
}

function applyCachedResponse(response: OakResponse, cachedResponse?: Response) {
  if (!cachedResponse) {
    return void 0;
  }
  response.status = cachedResponse.status;
  response.body = cachedResponse.body;
  cachedResponse.headers.forEach((value, key) => {
    response.headers.set(key, value);
  });
  return response;
}

async function buildWebResponse(oakResponse: OakResponse) {
  let bodyInit: BodyInit;
  const body = oakResponse.body;
  if (body == null) {
    return generateDirtyMarker();
  } else if (body instanceof ReadableStream) {
    const [body1, body2] = body.tee();
    oakResponse.body = body1;
    const blob = await new Response(body2).blob();
    bodyInit = blob;
  } else if (typeof body === "string" || body instanceof Uint8Array) {
    bodyInit = body as BodyInit;
  } else {
    return generateDirtyMarker();
  }
  return new Response(bodyInit, {
    status: oakResponse.status,
    headers: new Headers(oakResponse.headers),
  });
}

function generateDirtyMarker() {
  return new Response(null, {
    status: Status.Conflict,
    headers: {
      "Cache-Control": "max-age=0, no-cache, must-revalidate",
      "X-Cache-Dirty": "true",
    },
  });
}

function isDirtyMarker(response?: Response) {
  if (!response) {
    return true;
  }
  return response.headers.get("X-Cache-Dirty") === "true";
}
