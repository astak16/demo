import Router from "@koa/router";
import { addComment } from "../../controller/comment";

const router = new Router();

router.prefix("/comment");

router.post("/reply", addComment);

export default router;
