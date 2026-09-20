import Router from "koa-router";
import ContentController from "@/api/ContentController";

const router = new Router();

// 登录
router.prefix("/content");

// 用户签到
router.post("/upload", ContentController.uploadImg);

// 发表新帖
router.post("/add", ContentController.addPost);

// 小程序发表新帖
router.post("/wxAdd", ContentController.wxAdd);

// 更新帖子
router.post("/update", ContentController.updatePost);

router.post("/updateId", ContentController.updatePostByTid);

router.post("/updatePostSettings", ContentController.updatePostBatch);

// 删除帖子
router.post("/delete", ContentController.deletePost);

export default router;
