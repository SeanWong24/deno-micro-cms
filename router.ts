import { Router } from "./dep/oak.ts";

export const router = new Router();

router.get("/", (ctx) => {
  ctx.response.body = "Hello world";
});
