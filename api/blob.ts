import { Router } from "../dep/oak.ts";
import authMiddleware from "../middleware/auth.ts";
import {
  createBlob,
  deleteBlob,
  getBlob,
  getBlobKeys,
  updateBlob,
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
   *    description: Get list of blob keys.
   *    responses:
   *      200:
   *        description: The list of blob keys.
   */
  .get("/", async (ctx) => {
    ctx.response.body = [...(await getBlobKeys())];
  })
  /**
   * @openapi
   * /blob/{key}:
   *  get:
   *    tags:
   *      - Blob
   *    description: Get a blob with a key.
   *    parameters:
   *      - name: key
   *        in: path
   *        required: true
   *        schema:
   *          type: string
   *    responses:
   *      200:
   *        description: The requested blob.
   */
  .get("/:key", async (ctx) => {
    const { content, contentType } = (await getBlob(ctx.params.key)) ?? {};
    contentType && ctx.response.headers.set("Content-Type", contentType);
    ctx.response.body = content;
  })
  /**
   * @openapi
   * /blob/{key}:
   *  post:
   *    tags:
   *      - Blob
   *    security:
   *      - cookieAuth: []
   *    description: Create a blob with a key.
   *    parameters:
   *      - name: key
   *        in: path
   *        required: true
   *        schema:
   *          type: string
   *    requestBody:
   *      required: true
   *    responses:
   *      200:
   *        description: Done.
   *      500:
   *        description: Failed.
   */
  .post("/:key", authMiddleware, async (ctx) => {
    await createBlob(
      ctx.params.key,
      ctx.request.body.stream ?? new ReadableStream(),
      ctx.request.headers.get("Content-Type")
    );
    ctx.response.body = "Done";
  })
  /**
   * @openapi
   * /blob/{key}:
   *  put:
   *    tags:
   *      - Blob
   *    security:
   *      - cookieAuth: []
   *    description: Update a blob with a key.
   *    parameters:
   *      - name: key
   *        in: path
   *        required: true
   *        schema:
   *          type: string
   *    requestBody:
   *      required: true
   *    responses:
   *      200:
   *        description: Done.
   *      500:
   *        description: Failed.
   */
  .put("/:key", authMiddleware, async (ctx) => {
    await updateBlob(
      ctx.params.key,
      ctx.request.body.stream ?? new ReadableStream(),
      ctx.request.headers.get("Content-Type")
    );
    ctx.response.body = "Done";
  })
  /**
   * @openapi
   * /blob/{key}:
   *  delete:
   *    tags:
   *      - Blob
   *    security:
   *      - cookieAuth: []
   *    description: Delete a blob with a key.
   *    parameters:
   *      - name: key
   *        in: path
   *        required: true
   *        schema:
   *          type: string
   *    responses:
   *      200:
   *        description: Done.
   */
  .delete("/:key", authMiddleware, async (ctx) => {
    await deleteBlob(ctx.params.key);
    ctx.response.body = "Done";
  });

export default blobRouter;
