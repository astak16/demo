import Router from "@koa/router";
import { getCaptcha } from "../../controller/public";

const router = new Router();

router.prefix("/public");

// 获取图形验证码
router.get("/getCaptcha", getCaptcha);

export default router;
