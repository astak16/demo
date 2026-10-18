import Router from "@koa/router";
import { getTags, addTag, deleteTag, editTag } from "../../controller/content";

const router = new Router();

router.prefix("/admin");

router.get("/getTags", getTags);

router.post("/addTag", addTag);

router.post("/deleteTag", deleteTag);

router.post("/editTag", editTag);

export default router;
