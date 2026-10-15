import Router from "@koa/router";
import { addPost } from "../../controller/content";

const router = new Router();

router.prefix("/content");

router.post("/add", addPost);

export default router;
