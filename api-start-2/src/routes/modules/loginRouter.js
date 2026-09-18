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

// 刷新
router.post("/refresh", loginController.refresh);

// 微信登录
router.post("/wxLogin", loginController.wxLogin);

// 手机登录
router.post("/loginByPhone", loginController.loginByPhone);

// 获取用户手机号
router.post("/getMobile", loginController.getMobile);

// 扫码登录
router.post("/wxOauth", loginController.wxOauth);

export default router;
