import Router from "@koa/router";
import { basic, changePassword, setCollect, getCollectByUid } from "../../controller/user";
import { getUserPost } from "../../controller/content";
import { getMsgs, setMsg } from "../../controller/comment";

const router = new Router({ prefix: "/user" });

// 更新用户基信息
router.post("/basic", basic);

// 修改密码
router.post("/changePassword", changePassword);

router.get("/posts", getUserPost);

// 收藏/取消收藏
router.post("/setCollect", setCollect);

// 获取收藏列表
router.get("/collect", getCollectByUid);

router.get("/getMsgs", getMsgs);

router.post("/setMsg", setMsg);

export default router;
