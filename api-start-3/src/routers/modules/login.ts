import Router from "@koa/router";
import { reg } from "../../controller/login";

const router = new Router();

router.prefix("/login");

// 注册
router.post("/reg", reg);

export default router;
