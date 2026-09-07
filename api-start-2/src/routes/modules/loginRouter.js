import Router from "koa-router";
import loginController from "@/api/LoginController";

const router = new Router();

// 登录
router.prefix("/login");

// 忘记密码
router.post("/forget", loginController.forget);

// 登录接口
router.post("/login", loginController.login);

// 注册用户
router.post("/reg", loginController.reg);

export default router;
