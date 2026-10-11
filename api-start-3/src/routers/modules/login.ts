import Router from "@koa/router";
import { reg, login } from "../../controller/login";

const router = new Router();

router.prefix("/login");

// 注册
router.post("/reg", reg);

// 登录
router.post("/login", login);

export default router;
