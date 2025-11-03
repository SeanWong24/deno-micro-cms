import { HttpError, Router, Status } from "../dep/oak.ts";
import { authMiddleware } from "../middleware/auth.ts";
import { cacheMiddleware } from "../middleware/cache.ts";
import {
  createBlob,
  createCategory,
  deleteBlob,
  deleteCategory,
  getBlob,
  getBlobCategories,
  getBlobKeys,
  updateBlob,
  updateCategory,
} from "../service/blob.ts";

const blobRouter = new Router();

/**
 * @openapi
 * tags:
 *  name: Blob
 */

blobRouter
  /**
   * @openapi
   * /blob:
   *  get:
   *    tags:
   *      - Blob
   *    description: Get list of blob categories.
   *    responses:
   *      200:
   *        description: The list of blob categories.
   */
  .get("/", async (ctx) => {
    ctx.response.body = [...(await getBlobCategories())];
  })
  /**
   * @openapi
   * /blob/{category}:
   *  get:
   *    tags:
   *      - Blob
   *    description: Get list of blob keys in a category.
   *    parameters:
   *      - name: category
   *        in: path
   *        required: true
   *        schema:
   *          type: string
   *    responses:
   *      200:
   *        description: The list of blob keys in the category.
   *        content:
   *          application/json:
   *            schema:
   *              type: array
   *              items:
   *                type: string
   *      404:
   *        description: Category not found.
   */
  .get("/:category", async (ctx) => {
    const keys = await getBlobKeys(ctx.params.category);
    if (!keys) {
      ctx.throw(Status.NotFound, "Category not found.");
      return;
    }
    ctx.response.body = [...keys];
  })
  /**
   * @openapi
   * /blob/{category}:
   *  post:
   *    tags:
   *      - Blob
   *    security:
   *      - cookieAuth: []
   *    description: Create a new blob category with optional metadata.
   *    parameters:
   *      - name: category
   *        in: path
   *        required: true
   *        schema:
   *          type: string
   *    requestBody:
   *      required: true
   *      content:
   *        application/json:
   *          schema:
   *            type: object
   *    responses:
   *      200:
   *        description: Category created.
   *      409:
   *        description: Category already exists.
   */
  .post("/:category", authMiddleware, async (ctx) => {
    const meta = await ctx.request.body.json();
    try {
      await createCategory(ctx.params.category, meta);
      ctx.response.body = "Category created";
    } catch (err) {
      if (err instanceof HttpError) {
        ctx.throw(Status.Conflict, err.message);
      }
      throw err;
    }
  })
  /**
   * @openapi
   * /blob/{category}:
   *  put:
   *    tags:
   *      - Blob
   *    security:
   *      - cookieAuth: []
   *    description: Update metadata for an existing blob category.
   *    parameters:
   *      - name: category
   *        in: path
   *        required: true
   *        schema:
   *          type: string
   *    requestBody:
   *      required: true
   *      content:
   *        application/json:
   *          schema:
   *            type: object
   *    responses:
   *      200:
   *        description: Category updated.
   *      404:
   *        description: Category not found.
   */
  .put("/:category", authMiddleware, async (ctx) => {
    const meta = await ctx.request.body.json();
    try {
      await updateCategory(ctx.params.category, meta);
      ctx.response.body = "Category updated";
    } catch (err) {
      if (err instanceof HttpError) {
        ctx.throw(Status.NotFound, err.message);
      }
      throw err;
    }
  })
  /**
   * @openapi
   * /blob/{category}:
   *  delete:
   *    tags:
   *      - Blob
   *    security:
   *      - cookieAuth: []
   *    description: Delete a blob category and all blobs within it.
   *    parameters:
   *      - name: category
   *        in: path
   *        required: true
   *        schema:
   *          type: string
   *    responses:
   *      200:
   *        description: Category and all blobs deleted.
   *      404:
   *        description: Category not found.
   */
  .delete("/:category", authMiddleware, async (ctx) => {
    try {
      await deleteCategory(ctx.params.category);
      ctx.response.body = "Category deleted";
    } catch (err) {
      if (err instanceof HttpError) {
        ctx.throw(Status.NotFound, err.message);
      }
      throw err;
    }
  })
  /**
   * @openapi
   * /blob/{category}/{key}:
   *  get:
   *    tags:
   *      - Blob
   *    description: Get a blob by category and key.
   *    parameters:
   *      - name: category
   *        in: path
   *        required: true
   *        schema:
   *          type: string
   *      - name: key
   *        in: path
   *        required: true
   *        schema:
   *          type: string
   *    responses:
   *      200:
   *        description: The requested blob.
   *        content:
   *          application/octet-stream:
   *            schema:
   *              type: string
   *              format: binary
   *      404:
   *        description: Blob not found.
   */
  .get("/:category/:key", cacheMiddleware, async (ctx) => {
    const blob = await getBlob(ctx.params.category, ctx.params.key);
    if (!blob) {
      ctx.throw(Status.NotFound, "Blob not found.");
      return;
    }
    const { content, contentType } = blob;
    if (contentType) {
      ctx.response.headers.set("Content-Type", contentType);
    }
    ctx.response.body = content;
  })
  /**
   * @openapi
   * /blob/{category}/{key}:
   *  post:
   *    tags:
   *      - Blob
   *    security:
   *      - cookieAuth: []
   *    description: Create a blob within a category using a key.
   *    parameters:
   *      - name: category
   *        in: path
   *        required: true
   *        schema:
   *          type: string
   *      - name: key
   *        in: path
   *        required: true
   *        schema:
   *          type: string
   *    requestBody:
   *      required: true
   *      content:
   *        application/octet-stream:
   *          schema:
   *            type: string
   *            format: binary
   *    responses:
   *      200:
   *        description: Blob created.
   *      409:
   *        description: Blob already exists.
   *      500:
   *        description: Failed.
   */
  .post("/:category/:key", authMiddleware, cacheMiddleware, async (ctx) => {
    try {
      await createBlob(
        ctx.params.category,
        ctx.params.key,
        ctx.request.body.stream ?? new ReadableStream(),
        ctx.request.headers.get("Content-Type")
      );
      ctx.response.body = "Blob created";
    } catch (err) {
      if (err instanceof HttpError) {
        ctx.throw(Status.Conflict, err.message);
      }
      throw err;
    }
  })
  /**
   * @openapi
   * /blob/{category}/{key}:
   *  put:
   *    tags:
   *      - Blob
   *    security:
   *      - cookieAuth: []
   *    description: Update a blob within a category using a key.
   *    parameters:
   *      - name: category
   *        in: path
   *        required: true
   *        schema:
   *          type: string
   *      - name: key
   *        in: path
   *        required: true
   *        schema:
   *          type: string
   *    requestBody:
   *      required: true
   *      content:
   *        application/octet-stream:
   *          schema:
   *            type: string
   *            format: binary
   *    responses:
   *      200:
   *        description: Blob updated.
   *      404:
   *        description: Blob not found.
   *      500:
   *        description: Failed.
   */
  .put("/:category/:key", authMiddleware, cacheMiddleware, async (ctx) => {
    try {
      await updateBlob(
        ctx.params.category,
        ctx.params.key,
        ctx.request.body.stream ?? new ReadableStream(),
        ctx.request.headers.get("Content-Type")
      );
      ctx.response.body = "Blob updated";
    } catch (err) {
      if (err instanceof HttpError) {
        ctx.throw(Status.NotFound, err.message);
      }
      throw err;
    }
  })
  /**
   * @openapi
   * /blob/{category}/{key}:
   *  delete:
   *    tags:
   *      - Blob
   *    security:
   *      - cookieAuth: []
   *    description: Delete a blob within a category using a key.
   *    parameters:
   *      - name: category
   *        in: path
   *        required: true
   *        schema:
   *          type: string
   *      - name: key
   *        in: path
   *        required: true
   *        schema:
   *          type: string
   *    responses:
   *      200:
   *        description: Blob deleted.
   *      404:
   *        description: Blob not found.
   */
  .delete("/:category/:key", authMiddleware, cacheMiddleware, async (ctx) => {
    try {
      await deleteBlob(ctx.params.category, ctx.params.key);
      ctx.response.body = "Blob deleted";
    } catch (err) {
      if (err instanceof HttpError) {
        ctx.throw(Status.NotFound, err.message);
      }
      throw err;
    }
  });

export default blobRouter;
