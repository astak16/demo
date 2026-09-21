import Router from "@koa/router";
import CommentController from "../../api/CommentController.ts";

const router = new Router();

router.prefix("/comments");

// 添加评论
router.post("/reply", CommentController.addComment);

// 更新评论
router.post("/update", CommentController.updateComment);

// 设置最佳答案
router.get("/accept", CommentController.setBest);

// 设置最佳答案
router.get("/hands", CommentController.setHands);

export default router;
