import Router from "@koa/router";
import { addComment, updateComment } from "../../controller/comment";

const router = new Router();

router.prefix("/comment");

router.post("/reply", addComment);

router.post("/update", updateComment);

export default router;
