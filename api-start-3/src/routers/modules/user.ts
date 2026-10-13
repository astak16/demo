import Router from "@koa/router";
import { basic } from "../../controller/user";

const router = new Router({ prefix: "/user" });

// 更新用户基信息
router.post("/basic", basic);

export default router;
