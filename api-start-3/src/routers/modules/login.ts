import Router from "@koa/router";
import { reg, login, forget, reset } from "../../controller/login";

const router = new Router();

router.prefix("/login");

// 注册
router.post("/reg", reg);

// 登录
router.post("/login", login);

// 忘记密码 -> 发邮件
router.post("/forget", forget);

// 密码重置
router.post("/reset", reset);

export default router;
