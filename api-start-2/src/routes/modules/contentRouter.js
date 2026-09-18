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

// 发表新帖
router.post("/update", ContentController.updatePost);

export default router;
