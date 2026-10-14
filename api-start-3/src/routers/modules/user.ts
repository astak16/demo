import Router from "@koa/router";
import { basic, changePassword, setCollect } from "../../controller/user";

const router = new Router({ prefix: "/user" });

// 更新用户基信息
router.post("/basic", basic);

// 修改密码
router.post("/changePassword", changePassword);

// 收藏/取消收藏
router.post("/setCollect", setCollect);

export default router;
