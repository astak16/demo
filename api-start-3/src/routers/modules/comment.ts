import Router from "@koa/router";
import { addComment, updateComment, setBest, setHands, getComments } from "../../controller/comment";

const router = new Router();

router.prefix("/comment");

router.post("/reply", addComment);

router.post("/update", updateComment);

router.post("/accept", setBest);

router.post("/hands", setHands);

export default router;
