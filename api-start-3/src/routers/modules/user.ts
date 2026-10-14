import Router from "@koa/router";
import { basic, changePassword } from "../../controller/user";

const router = new Router({ prefix: "/user" });

// 更新用户基信息
router.post("/basic", basic);

// 修改密码
router.post("/changePassword", changePassword);

export default router;
