import Router from "@koa/router";
import { getCaptcha } from "../../controller/public";
import { resetEmail } from "../../controller/user";

const router = new Router();

router.prefix("/public");

// 获取图形验证码
router.get("/getCaptcha", getCaptcha);

// 确认修改邮件
router.post("/resetEmail", resetEmail);

export default router;
