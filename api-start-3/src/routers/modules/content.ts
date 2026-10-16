import Router from "@koa/router";
import { addPost, updatePost } from "../../controller/content";

const router = new Router();

router.prefix("/content");

router.post("/add", addPost);

router.post("/update", updatePost);

export default router;
