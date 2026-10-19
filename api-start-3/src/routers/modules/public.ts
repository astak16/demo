import Router from "@koa/router";
import { getCaptcha } from "../../controller/public";
import { resetEmail } from "../../controller/user";
import { getPosts, getTips, getLinks } from "../../controller/content";

const router = new Router();

router.prefix("/public");

// 获取图形验证码
router.get("/getCaptcha", getCaptcha);

// 确认修改邮件
router.post("/resetEmail", resetEmail);

router.get("/list", getPosts);

router.get("/tips", getTips);

router.get("/links", getLinks);

export default router;
